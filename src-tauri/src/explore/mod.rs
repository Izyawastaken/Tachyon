mod media;
mod models;
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
    sync::atomic::{AtomicUsize, Ordering},
    time::Duration,
};
use tauri::State;
use tokio::sync::OnceCell;

const API: &str = "https://api.modrinth.com/v2/";
pub struct ExploreState {
    root: PathBuf,
    backend: OnceCell<Backend>,
}
struct Backend {
    cache: Engram,
    transport: Transport,
    media: PathBuf,
    media_requests: AtomicUsize,
}

impl ExploreState {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            backend: OnceCell::new(),
        }
    }
    async fn backend(&self) -> Result<&Backend, String> {
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
                Ok(Backend {
                    cache,
                    transport: Transport::new().map_err(|e| e.to_string())?,
                    media,
                    media_requests: AtomicUsize::new(0),
                })
            })
            .await
    }
}

impl Backend {
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
        let key = CacheKey::<T>::new(
            format!(
                "explore/{schema}/{}",
                media::digest(url.as_str().as_bytes())
            ),
            schema,
        );
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
        let mut url = Url::parse(&format!("{API}search")).map_err(|e| e.to_string())?;
        url.query_pairs_mut()
            .append_pair("query", &input.query)
            .append_pair(
                "facets",
                &serde_json::to_string(&input.facets()).map_err(|e| e.to_string())?,
            )
            .append_pair("index", &input.sort)
            .append_pair("offset", &input.offset.to_string())
            .append_pair("limit", "24");
        self.json(url, "modrinth-search@1", 120, 86400).await
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
                "modrinth-project@1",
                900,
                7 * 86400,
            )
            .await?;
        let key = CacheKey::<String>::new(
            format!(
                "explore/markdown/{}",
                media::digest(result.data.body.as_bytes())
            ),
            "safe-project-html@1",
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

fn render_markdown(markdown: &str) -> String {
    let options =
        pulldown_cmark::Options::ENABLE_TABLES | pulldown_cmark::Options::ENABLE_STRIKETHROUGH;
    let mut html = String::new();
    pulldown_cmark::html::push_html(
        &mut html,
        pulldown_cmark::Parser::new_ext(markdown, options),
    );
    // Gallery images use the Rust media pipeline. Inline remote images, scripts,
    // styles and embedded documents must never start WebView network requests.
    ammonia::Builder::default()
        .rm_tags(&["img"])
        .url_schemes(["https"].into_iter().collect())
        .url_relative(ammonia::UrlRelative::Deny)
        .clean(&html)
        .to_string()
}

#[tauri::command]
pub async fn explore_search(
    state: State<'_, ExploreState>,
    input: SearchInput,
) -> Result<CatalogResult<SearchPage>, String> {
    state.backend().await?.search(input).await
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
