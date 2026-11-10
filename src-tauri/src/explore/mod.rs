mod markdown;
mod media;
mod models;
mod prefetch;
mod source;
#[cfg(test)]
mod tests;

use engram::{
    CacheKey, Compression, Engram, ResolveOptions, ResolveStatus, SqliteSynchronous,
    ValidationPolicy,
};
use models::*;
use reqwest::Url;
use serde::{Serialize, de::DeserializeOwned};
use source::{JsonSource, Transport};
use std::{
    path::PathBuf,
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    time::Duration,
};
use tauri::{Emitter, Manager, State};
use tokio::sync::{OnceCell, Semaphore};

const PAGE_SIZE: u32 = 12;
const API: &str = "https://api.modrinth.com/v2/";
#[derive(Clone, Serialize)]
struct CatalogRefresh {
    input: SearchInput,
    result: CatalogResult<SearchPage>,
}
pub struct ExploreState {
    root: PathBuf,
    backend: OnceCell<Arc<Backend>>,
    prefetch: prefetch::Window,
}
struct Backend {
    cache: Engram,
    transport: Transport,
    media: PathBuf,
    media_requests: AtomicUsize,
    background_slots: Semaphore,
}

impl ExploreState {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            backend: OnceCell::new(),
            prefetch: prefetch::Window::default(),
        }
    }
    async fn backend(&self) -> Result<&Arc<Backend>, String> {
        self.backend
            .get_or_try_init(|| async {
                let media = self.root.join("media");
                tokio::fs::create_dir_all(&media)
                    .await
                    .map_err(|e| e.to_string())?;
                let cache = Engram::builder()
                    .storage(self.root.join("catalog.db"))
                    .memory_capacity(48 * 1024 * 1024)
                    .compression(Compression::Zstd { level: 1 })
                    .compression_threshold(1024)
                    .compress_only_if_smaller(true)
                    .sqlite_connections(3)
                    // Catalog data is reproducible, so losing recent cache writes is harmless.
                    .sqlite_synchronous(SqliteSynchronous::Normal)
                    .cleanup_interval(Duration::from_secs(1800))
                    .build()
                    .await
                    .map_err(|e| e.to_string())?;
                let prune_root = media.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = media::prune(&prune_root).await;
                });
                Ok(Arc::new(Backend {
                    cache,
                    transport: Transport::new().map_err(|e| e.to_string())?,
                    media,
                    media_requests: AtomicUsize::new(0),
                    background_slots: Semaphore::new(2),
                }))
            })
            .await
    }
}

impl Backend {
    fn search_url(input: &SearchInput) -> Result<Url, String> {
        let mut url = Url::parse(&format!("{API}search")).map_err(|e| e.to_string())?;
        url.query_pairs_mut()
            .append_pair("query", &input.query)
            .append_pair(
                "facets",
                &serde_json::to_string(&input.facets()).map_err(|e| e.to_string())?,
            )
            .append_pair("index", &input.sort)
            .append_pair("offset", &input.offset.to_string())
            .append_pair("limit", &PAGE_SIZE.to_string());
        Ok(url)
    }

    fn key<T>(url: &Url, schema: &str) -> CacheKey<T> {
        CacheKey::new(
            format!(
                "explore/{schema}/{}",
                media::digest(url.as_str().as_bytes())
            ),
            schema,
        )
    }

    async fn visible_search(
        self: &Arc<Self>,
        input: SearchInput,
        app: tauri::AppHandle,
    ) -> Result<CatalogResult<SearchPage>, String> {
        let key = Self::key::<SearchPage>(&Self::search_url(&input)?, "modrinth-search@1");
        if let Some(page) = self
            .cache
            .get_arc_key(&key)
            .await
            .map_err(|e| e.to_string())?
        {
            let metadata = self
                .cache
                .metadata(key.key())
                .await
                .map_err(|e| e.to_string())?;
            let stale = metadata
                .and_then(|meta| meta.validated_at)
                .and_then(|time| time.elapsed().ok())
                .is_none_or(|age| age >= Duration::from_secs(120));
            if stale {
                let refresh = self.cache.resolve_in_background(
                    key.clone(),
                    ResolveOptions {
                        ttl: Some(Duration::from_secs(86400)),
                        validation: ValidationPolicy::After(Duration::from_secs(120)),
                        retrieve_on_unverifiable: true,
                        ..Default::default()
                    },
                    Arc::new(JsonSource::new(
                        self.transport.clone(),
                        Self::search_url(&input)?,
                    )),
                );
                tauri::async_runtime::spawn(async move {
                    if let Ok(Ok(resolved)) = refresh.await {
                        let result = CatalogResult {
                            data: resolved.value,
                            stale: matches!(
                                resolved.status,
                                ResolveStatus::StaleUnavailable | ResolveStatus::StaleUnverifiable
                            ),
                        };
                        let _ = app.emit(
                            "explore:catalog-refreshed",
                            CatalogRefresh { input, result },
                        );
                    }
                });
            }
            return Ok(CatalogResult {
                data: (*page).clone(),
                stale,
            });
        }
        self.search(input).await
    }
    async fn json<T>(
        &self,
        url: Url,
        schema: &str,
        freshness: u64,
        lifetime: u64,
    ) -> Result<CatalogResult<T>, String>
    where
        T: Serialize + DeserializeOwned + Clone + Send + Sync + 'static,
    {
        let key = Self::key::<T>(&url, schema);
        let source = JsonSource::new(self.transport.clone(), url);
        let resolved = self
            .cache
            .resolve(
                &key,
                ResolveOptions {
                    ttl: Some(Duration::from_secs(lifetime)),
                    validation: ValidationPolicy::After(Duration::from_secs(freshness)),
                    retrieve_on_unverifiable: true,
                    serve_stale_on_unavailable: true,
                    force_retrieve: false,
                },
                &source,
            )
            .await
            .map_err(|e| e.to_string())?;
        Ok(CatalogResult {
            data: resolved.value,
            stale: matches!(
                resolved.status,
                ResolveStatus::StaleUnavailable | ResolveStatus::StaleUnverifiable
            ),
        })
    }

    async fn search(&self, input: SearchInput) -> Result<CatalogResult<SearchPage>, String> {
        let input = input.canonicalize()?;
        self.json(Self::search_url(&input)?, "modrinth-search@1", 120, 86400)
            .await
    }

    async fn project(&self, id: &str) -> Result<CatalogResult<ProjectDetail>, String> {
        if id.is_empty()
            || id.len() > 64
            || !id
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
        {
            return Err("Invalid project identifier.".into());
        }
        let result: CatalogResult<Project> = self
            .json(
                Url::parse(&format!("{API}project/{id}")).map_err(|e| e.to_string())?,
                "modrinth-project@2",
                900,
                7 * 86400,
            )
            .await?;
        let key = CacheKey::<String>::new(
            format!(
                "explore/markdown/v2/{}",
                media::digest(result.data.body.as_bytes())
            ),
            "safe-project-html@2",
        );
        let body_html =
            if let Some(html) = self.cache.get_key(&key).await.map_err(|e| e.to_string())? {
                html
            } else {
                let body = result.data.body.clone();
                let html = tauri::async_runtime::spawn_blocking(move || render_markdown(&body))
                    .await
                    .map_err(|e| e.to_string())?;
                self.cache
                    .set_key(&key, &html, Some(Duration::from_secs(7 * 86400)))
                    .await
                    .map_err(|e| e.to_string())?;
                html
            };
        Ok(CatalogResult {
            data: ProjectDetail {
                project: result.data,
                body_html,
            },
            stale: result.stale,
        })
    }
}

use markdown::render_markdown;

#[tauri::command]
pub async fn explore_search(
    state: State<'_, ExploreState>,
    app: tauri::AppHandle,
    input: SearchInput,
) -> Result<CatalogResult<SearchPage>, String> {
    let input = input.canonicalize()?;
    let generation = state.prefetch.begin(&input).await;
    let backend = state.backend().await?;
    let result = backend.visible_search(input.clone(), app).await?;
    state
        .prefetch
        .schedule(backend.clone(), input, result.data.total_hits, generation)
        .await;
    Ok(result)
}

pub fn warm_at_launch(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let state = app.state::<ExploreState>();
        let Ok(backend) = state.backend().await else {
            return;
        };
        let input = SearchInput {
            kind: "mod".into(),
            sort: "relevance".into(),
            ..Default::default()
        };
        // A cache snapshot promotes a persisted L2 page before any validation I/O.
        // Concurrent Explore requests join the same Engram flight.
        if let Ok(page) = backend.search(input).await {
            for hit in page.data.hits.iter().take(8) {
                if let Some(url) = &hit.icon_url {
                    let _ =
                        media::image(&backend.cache, &backend.transport, &backend.media, url).await;
                }
            }
        }
    });
}

#[tauri::command]
pub async fn explore_project(
    state: State<'_, ExploreState>,
    id: String,
) -> Result<CatalogResult<ProjectDetail>, String> {
    state.backend().await?.project(&id).await
}

#[tauri::command]
pub async fn explore_filters(
    state: State<'_, ExploreState>,
) -> Result<CatalogResult<Filters>, String> {
    let backend = state.backend().await?;
    let (versions, loaders, categories) = tokio::try_join!(
        backend.json::<Vec<VersionTag>>(
            Url::parse(&format!("{API}tag/game_version")).unwrap(),
            "modrinth-versions@1",
            21600,
            7 * 86400
        ),
        backend.json::<Vec<LoaderTag>>(
            Url::parse(&format!("{API}tag/loader")).unwrap(),
            "modrinth-loaders@1",
            21600,
            7 * 86400
        ),
        backend.json::<Vec<CategoryTag>>(
            Url::parse(&format!("{API}tag/category")).unwrap(),
            "modrinth-categories@1",
            21600,
            7 * 86400
        ),
    )?;
    Ok(CatalogResult {
        stale: versions.stale || loaders.stale || categories.stale,
        data: Filters {
            versions: versions.data,
            loaders: loaders.data,
            categories: categories.data,
        },
    })
}

#[tauri::command]
pub async fn explore_image(state: State<'_, ExploreState>, url: String) -> Result<String, String> {
    let backend = state.backend().await?;
    let path = media::image(&backend.cache, &backend.transport, &backend.media, &url).await?;
    if backend.media_requests.fetch_add(1, Ordering::Relaxed) % 64 == 63 {
        let root = backend.media.clone();
        tauri::async_runtime::spawn(async move {
            let _ = media::prune(&root).await;
        });
    }
    Ok(path)
}
