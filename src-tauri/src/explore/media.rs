use super::source::{OriginError, Transport, origin_error};
use engram::{
    CacheKey, Engram, ResolveOptions, RetrievalOutcome, RetrievalRequest, Retrieved, Source,
    SourceFuture, ValidationOutcome, ValidationRequest,
};
use reqwest::{StatusCode, Url};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    path::{Path, PathBuf},
    time::Duration,
};

const MEDIA_BUDGET: u64 = 256 * 1024 * 1024;

#[derive(Clone, Deserialize, Serialize)]
pub struct MediaRecord {
    pub path: String,
}

pub fn media_url(value: &str) -> Result<Url, String> {
    if value.len() > 4096 {
        return Err("Image address is too long.".into());
    }
    let url = Url::parse(value).map_err(|_| "Invalid image address.")?;
    if url.scheme() != "https"
        || url.host_str() != Some("cdn.modrinth.com")
        || url.port().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
        || !url.path().starts_with("/data/")
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err("Only Modrinth catalog images are supported.".into());
    }
    Ok(url)
}

pub fn digest(value: &[u8]) -> String {
    format!("{:x}", Sha256::digest(value))
}

pub async fn image(
    cache: &Engram,
    transport: &Transport,
    root: &Path,
    url: &str,
) -> Result<String, String> {
    let url = media_url(url)?;
    let id = digest(url.as_str().as_bytes());
    let key = CacheKey::<MediaRecord>::new(format!("explore/media/{id}"), "modrinth-media@1");
    // Evicted files must not leave an otherwise valid L1/L2 record pointing at nothing.
    if let Some(record) = cache.get_key(&key).await.map_err(|e| e.to_string())? {
        if tokio::fs::try_exists(&record.path).await.unwrap_or(false) {
            return Ok(record.path);
        }
        cache.remove(key.key()).await.map_err(|e| e.to_string())?;
    }
    let source = MediaSource {
        transport: transport.clone(),
        url,
        root: root.to_owned(),
        id,
    };
    let resolved = cache
        .resolve(
            &key,
            ResolveOptions {
                ttl: Some(Duration::from_secs(7 * 86400)),
                ..Default::default()
            },
            &source,
        )
        .await
        .map_err(|e| e.to_string())?;
    Ok(resolved.value.path)
}

struct MediaSource {
    transport: Transport,
    url: Url,
    root: PathBuf,
    id: String,
}

impl Source<MediaRecord> for MediaSource {
    type Error = OriginError;
    fn validate<'a>(
        &'a self,
        _: ValidationRequest<'a, MediaRecord>,
    ) -> SourceFuture<'a, Result<ValidationOutcome, OriginError>> {
        // CDN paths are content-addressed; immutable images need no origin validation.
        Box::pin(async { Ok(ValidationOutcome::Fresh { validation: None }) })
    }
    fn retrieve<'a>(
        &'a self,
        _: RetrievalRequest<'a>,
    ) -> SourceFuture<'a, Result<RetrievalOutcome<MediaRecord>, OriginError>> {
        Box::pin(async move {
            // Images and lookahead cannot occupy all six origin slots, leaving
            // capacity for interactive searches and project-detail requests.
            let _image_permit = self.transport.image_permit().await?;
            let wire = self
                .transport
                .get(self.url.clone(), None, 12 * 1024 * 1024)
                .await?;
            if wire.status == StatusCode::NOT_FOUND {
                return Ok(RetrievalOutcome::NotFound);
            }
            // Validate the representation itself: CDN MIME labels and suffixes
            // are not always consistent with the delivered raster format.
            let ext = raster_extension(&wire.bytes)
                .ok_or_else(|| origin_error("This image format cannot be displayed safely."))?;
            let path = self.root.join(format!("{}.{}", self.id, ext));
            let temporary = path.with_extension("part");
            tokio::fs::write(&temporary, wire.bytes).await?;
            tokio::fs::rename(&temporary, &path).await?;
            Ok(RetrievalOutcome::Retrieved(Retrieved {
                value: MediaRecord {
                    path: path.to_string_lossy().into_owned(),
                },
                validation: Some(wire.metadata),
            }))
        })
    }
}

pub async fn prune(root: &Path) -> std::io::Result<()> {
    let mut entries = tokio::fs::read_dir(root).await?;
    let mut files = Vec::new();
    let mut total = 0;
    while let Some(entry) = entries.next_entry().await? {
        let metadata = entry.metadata().await?;
        if metadata.is_file() && entry.path().extension().is_some_and(|e| e != "part") {
            total += metadata.len();
            files.push((metadata.modified()?, metadata.len(), entry.path()));
        }
    }
    files.sort_unstable_by_key(|file| file.0);
    for (_, size, path) in files {
        if total <= MEDIA_BUDGET {
            break;
        }
        if tokio::fs::remove_file(path).await.is_ok() {
            total = total.saturating_sub(size);
        }
    }
    Ok(())
}

pub(super) fn raster_extension(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        Some("png")
    } else if bytes.starts_with(b"\xff\xd8\xff") {
        Some("jpg")
    } else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        Some("gif")
    } else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") {
        Some("webp")
    } else if bytes.get(4..8) == Some(b"ftyp")
        && matches!(bytes.get(8..12), Some(b"avif" | b"avis"))
    {
        Some("avif")
    } else {
        None
    }
}
