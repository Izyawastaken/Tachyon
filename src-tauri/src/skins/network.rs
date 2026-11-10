use super::{image, models::Model};
use base64::{Engine, engine::general_purpose::STANDARD};
use engram::{
    CacheKey, Compression, Engram, ResolveOptions, ResolveStatus, RetrievalOutcome,
    RetrievalRequest, Retrieved, Source, SourceFuture, SqliteSynchronous, ValidationOutcome,
    ValidationPolicy, ValidationRequest,
};
use reqwest::{Client, StatusCode, Url};
use serde::{Deserialize, Serialize};
use std::{
    io,
    path::PathBuf,
    sync::{
        Arc,
        atomic::{AtomicU64, Ordering},
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tokio::sync::{Mutex, Semaphore};

fn error(message: impl Into<String>) -> io::Error {
    io::Error::other(message.into())
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Lookup {
    Player(String),
    Texture(String),
}
pub fn parse(input: &str) -> Result<Lookup, String> {
    let value = input.trim();
    if value.starts_with("http:") || value.starts_with("https:") {
        return texture_url(value).map(Lookup::Texture);
    }
    let uuid: String = value.chars().filter(|&c| c != '-').collect();
    if uuid.len() == 32
        && uuid.bytes().all(|c| c.is_ascii_hexdigit())
        && (value.len() == 32
            || (value.len() == 36 && [8, 13, 18, 23].iter().all(|&i| value.as_bytes()[i] == b'-')))
    {
        return Ok(Lookup::Player(uuid.to_ascii_lowercase()));
    }
    if (3..=16).contains(&value.len())
        && value
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'_')
    {
        return Ok(Lookup::Player(value.to_ascii_lowercase()));
    }
    Err("Enter a Java username (3–16 characters), player UUID, or textures.minecraft.net skin link.".into())
}
pub fn texture_url(input: &str) -> Result<String, String> {
    let mut url = Url::parse(input).map_err(|_| "Enter a valid Minecraft texture link.")?;
    let hash = url.path().strip_prefix("/texture/").unwrap_or_default();
    if !matches!(url.scheme(), "http" | "https")
        || url.host_str() != Some("textures.minecraft.net")
        || url.port().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
        || !(32..=64).contains(&hash.len())
        || !hash.bytes().all(|c| c.is_ascii_hexdigit())
    {
        return Err("Use an official textures.minecraft.net/texture/… link.".into());
    }
    url.set_scheme("https")
        .map_err(|_| "Invalid texture link.")?;
    Ok(url.to_string())
}

#[derive(Clone, Serialize, Deserialize)]
pub struct RemoteSkin {
    pub name: String,
    pub player: Option<String>,
    pub model: Model,
    pub url: String,
    pub png: Vec<u8>,
}
#[derive(Clone)]
struct Identity {
    name: String,
    player: Option<String>,
    model: Model,
    url: String,
}
pub struct Network {
    cache: Engram,
    transport: Arc<Transport>,
}
struct Transport {
    client: Client,
    slots: Semaphore,
    retry_at: AtomicU64,
}
impl Network {
    pub async fn new(root: PathBuf) -> Result<Self, String> {
        tokio::fs::create_dir_all(&root)
            .await
            .map_err(|e| e.to_string())?;
        let cache = Engram::builder()
            .storage(root.join("profiles.db"))
            .memory_capacity(8 * 1024 * 1024)
            .compression(Compression::Zstd { level: 1 })
            .compression_threshold(1024)
            .compress_only_if_smaller(true)
            .sqlite_connections(2)
            .sqlite_synchronous(SqliteSynchronous::Normal)
            .cleanup_interval(Duration::from_secs(1800))
            .build()
            .await
            .map_err(|e| e.to_string())?;
        let client = Client::builder()
            .https_only(true)
            .redirect(reqwest::redirect::Policy::none())
            .connect_timeout(Duration::from_secs(5))
            .timeout(Duration::from_secs(15))
            .pool_idle_timeout(Duration::from_secs(60))
            .user_agent(concat!(
                "Tachyon/",
                env!("CARGO_PKG_VERSION"),
                " (https://github.com/Izyawastaken/Tachyon)"
            ))
            .build()
            .map_err(|e| e.to_string())?;
        Ok(Self {
            cache,
            transport: Arc::new(Transport {
                client,
                slots: Semaphore::new(2),
                retry_at: AtomicU64::new(0),
            }),
        })
    }
    pub async fn resolve(&self, input: &str) -> Result<(RemoteSkin, bool), String> {
        let lookup = parse(input)?;
        let key = CacheKey::<RemoteSkin>::new(format!("skins/{lookup:?}"), "minecraft-skin@1");
        let immutable = matches!(lookup, Lookup::Texture(_));
        let source = SkinSource {
            transport: self.transport.clone(),
            lookup,
            pending: Mutex::new(None),
        };
        let result = self
            .cache
            .resolve(
                &key,
                ResolveOptions {
                    ttl: Some(Duration::from_secs(if immutable {
                        30 * 86400
                    } else {
                        86400
                    })),
                    validation: ValidationPolicy::After(Duration::from_secs(if immutable {
                        30 * 86400
                    } else {
                        300
                    })),
                    retrieve_on_unverifiable: true,
                    serve_stale_on_unavailable: true,
                    force_retrieve: false,
                },
                &source,
            )
            .await
            .map_err(|e| match e {
                engram::ResolveError::NotFound => {
                    "That player has no custom skin. Choose one of the default characters instead."
                        .into()
                }
                _ => format!("Could not import that skin: {e}"),
            })?;
        Ok((
            result.value,
            matches!(
                result.status,
                ResolveStatus::StaleUnavailable | ResolveStatus::StaleUnverifiable
            ),
        ))
    }
}
fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
impl Transport {
    async fn get(&self, url: &str, limit: usize) -> Result<Option<Vec<u8>>, io::Error> {
        let _slot = self
            .slots
            .acquire()
            .await
            .map_err(|_| error("Skin lookup is closing."))?;
        if now() < self.retry_at.load(Ordering::Relaxed) {
            return Err(error("Minecraft is limiting lookups. Try again shortly."));
        }
        let mut response =
            self.client.get(url).send().await.map_err(|_| {
                error("Could not reach Minecraft. Check your connection and retry.")
            })?;
        if response.status() == StatusCode::TOO_MANY_REQUESTS {
            let delay = response
                .headers()
                .get("retry-after")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u64>().ok())
                .unwrap_or(60)
                .clamp(1, 300);
            self.retry_at.store(now() + delay, Ordering::Relaxed);
            return Err(error("Minecraft is limiting lookups. Try again shortly."));
        }
        if matches!(
            response.status(),
            StatusCode::NOT_FOUND | StatusCode::NO_CONTENT
        ) {
            return Ok(None);
        }
        if !response.status().is_success() {
            return Err(error(format!(
                "Minecraft returned {}. Try again later.",
                response.status().as_u16()
            )));
        }
        if response.content_length().is_some_and(|n| n > limit as u64) {
            return Err(error("Minecraft returned an oversized skin response."));
        }
        let mut bytes = Vec::new();
        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|_| error("The skin download was interrupted."))?
        {
            if bytes.len().saturating_add(chunk.len()) > limit {
                return Err(error("Minecraft returned an oversized skin response."));
            }
            bytes.extend_from_slice(&chunk);
        }
        Ok(Some(bytes))
    }
    async fn identity(&self, lookup: &Lookup) -> Result<Option<Identity>, io::Error> {
        if let Lookup::Texture(url) = lookup {
            return Ok(Some(Identity {
                name: "Imported skin".into(),
                player: None,
                model: Model::Classic,
                url: url.clone(),
            }));
        }
        let Lookup::Player(value) = lookup else {
            unreachable!()
        };
        #[derive(Deserialize)]
        struct Player {
            id: String,
            name: String,
        }
        let id = if value.len() == 32 {
            value.clone()
        } else {
            let Some(bytes) = self
                .get(
                    &format!("https://api.mojang.com/users/profiles/minecraft/{value}"),
                    16384,
                )
                .await?
            else {
                return Err(error("No Java player was found with that username."));
            };
            let player: Player = serde_json::from_slice(&bytes)
                .map_err(|_| error("Minecraft returned an invalid player profile."))?;
            if !player.name.eq_ignore_ascii_case(value) {
                return Err(error("Minecraft returned a mismatched player name."));
            }
            player.id
        };
        if id.len() != 32 || !id.bytes().all(|c| c.is_ascii_hexdigit()) {
            return Err(error("Minecraft returned an invalid player UUID."));
        }
        #[derive(Deserialize)]
        struct Property {
            name: String,
            value: String,
        }
        #[derive(Deserialize)]
        struct Profile {
            id: String,
            name: String,
            #[serde(default)]
            properties: Vec<Property>,
        }
        let Some(bytes) = self
            .get(
                &format!("https://sessionserver.mojang.com/session/minecraft/profile/{id}"),
                32768,
            )
            .await?
        else {
            return Err(error("That Java player profile could not be found."));
        };
        let profile: Profile = serde_json::from_slice(&bytes)
            .map_err(|_| error("Minecraft returned an unreadable skin profile."))?;
        if !profile.id.eq_ignore_ascii_case(&id)
            || super::models::clean_name(&profile.name).is_err()
        {
            return Err(error("Minecraft returned a mismatched player profile."));
        }
        let Some(property) = profile.properties.iter().find(|p| p.name == "textures") else {
            return Ok(None);
        };
        let decoded = STANDARD
            .decode(&property.value)
            .map_err(|_| error("Minecraft returned invalid skin data."))?;
        #[derive(Deserialize)]
        struct Payload {
            #[serde(rename = "profileId")]
            profile_id: String,
            textures: Textures,
        }
        #[derive(Deserialize)]
        struct Textures {
            #[serde(rename = "SKIN")]
            skin: Option<SkinTexture>,
        }
        #[derive(Deserialize)]
        struct SkinTexture {
            url: String,
            metadata: Option<Metadata>,
        }
        #[derive(Deserialize)]
        struct Metadata {
            model: Option<String>,
        }
        let payload: Payload = serde_json::from_slice(&decoded)
            .map_err(|_| error("Minecraft returned invalid texture metadata."))?;
        if !payload.profile_id.eq_ignore_ascii_case(&id) {
            return Err(error("Minecraft returned a mismatched skin profile."));
        }
        let Some(skin) = payload.textures.skin else {
            return Ok(None);
        };
        Ok(Some(Identity {
            name: profile.name,
            player: Some(id),
            model: if skin.metadata.and_then(|m| m.model).as_deref() == Some("slim") {
                Model::Slim
            } else {
                Model::Classic
            },
            url: texture_url(&skin.url).map_err(error)?,
        }))
    }
}
struct SkinSource {
    transport: Arc<Transport>,
    lookup: Lookup,
    pending: Mutex<Option<Option<Identity>>>,
}
impl Source<RemoteSkin> for SkinSource {
    type Error = io::Error;
    fn validate<'a>(
        &'a self,
        request: ValidationRequest<'a, RemoteSkin>,
    ) -> SourceFuture<'a, Result<ValidationOutcome, io::Error>> {
        Box::pin(async move {
            if matches!(self.lookup, Lookup::Texture(_)) {
                return Ok(ValidationOutcome::Fresh { validation: None });
            }
            match self.transport.identity(&self.lookup).await {
                Ok(Some(identity))
                    if request.value.url == identity.url
                        && request.value.name == identity.name
                        && request.value.model == identity.model
                        && request.value.player == identity.player =>
                {
                    Ok(ValidationOutcome::Fresh { validation: None })
                }
                Ok(identity) => {
                    *self.pending.lock().await = Some(identity);
                    Ok(ValidationOutcome::Changed)
                }
                Err(_) => Ok(ValidationOutcome::Unavailable),
            }
        })
    }
    fn retrieve<'a>(
        &'a self,
        _request: RetrievalRequest<'a>,
    ) -> SourceFuture<'a, Result<RetrievalOutcome<RemoteSkin>, io::Error>> {
        Box::pin(async move {
            let identity = match self.pending.lock().await.take() {
                Some(value) => value,
                None => self.transport.identity(&self.lookup).await?,
            };
            let Some(identity) = identity else {
                return Ok(RetrievalOutcome::NotFound);
            };
            let png = self
                .transport
                .get(&identity.url, image::MAX_BYTES)
                .await?
                .ok_or_else(|| error("That skin texture is no longer available."))?;
            // Decode/normalize off the async executor. Cached values are always validated PNGs.
            let texture = tokio::task::spawn_blocking(move || image::normalize(&png))
                .await
                .map_err(|e| error(e.to_string()))?
                .map_err(error)?;
            let model = if matches!(self.lookup, Lookup::Texture(_)) && texture.slim {
                Model::Slim
            } else {
                identity.model
            };
            Ok(RetrievalOutcome::Retrieved(Retrieved {
                value: RemoteSkin {
                    name: identity.name,
                    player: identity.player,
                    model,
                    url: identity.url,
                    png: texture.png,
                },
                validation: None,
            }))
        })
    }
}
