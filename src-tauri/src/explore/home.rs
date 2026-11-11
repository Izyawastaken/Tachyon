use super::{Backend, ExploreState, source::JsonSource};
use chrono::{Duration as Days, SecondsFormat, Utc};
use engram::{CacheKey, ResolveOptions, ResolveStatus, ValidationPolicy};
use reqwest::Url;
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
    time::Duration,
};
use tauri::{Emitter, State};

const FRESH: u64 = 240;
// ModDex permits five-minute HTTP caching without running its deletion sync feeds.
// Never retain review/project records beyond that window, including offline.
const RETAIN: u64 = 300;

#[derive(Clone, Serialize, Deserialize)]
pub struct Rating {
    average: Option<f64>,
    bayesian: Option<f64>,
    count: u64,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Project {
    id: u64,
    name: String,
    slug: String,
    #[serde(rename = "type")]
    kind: String,
    logo_url: Option<String>,
    available: bool,
    rating: Rating,
    #[serde(default)]
    summary: Option<String>,
    #[serde(default)]
    downloads_count: Option<u64>,
}
#[derive(Clone, Serialize, Deserialize)]
struct Author {
    id: u64,
}
#[derive(Clone, Serialize, Deserialize)]
struct Review {
    id: u64,
    author: Author,
    project: Project,
    created_at: String,
}
#[derive(Clone, Serialize, Deserialize)]
struct Meta {
    total: u64,
}
#[derive(Clone, Serialize, Deserialize)]
struct Page<T> {
    data: Vec<T>,
    meta: Meta,
}
#[derive(Clone, Serialize)]
pub struct Entry {
    project: Project,
    recent_ratings: usize,
}
#[derive(Clone, Serialize)]
pub struct Feed {
    entries: Vec<Entry>,
    sampled: usize,
    total: u64,
    stale: bool,
    refresh_after_ms: u64,
}
#[derive(Clone, Serialize)]
struct Refresh {
    section: String,
    result: Feed,
}

fn url(section: &str) -> Result<Url, String> {
    let mut url = Url::parse("https://moddex.gg/api/v2/projects").unwrap();
    match section {
        "trending" => {
            url.set_path("/api/v2/reviews");
            // Round to the hour so repeated requests share validators and upstream caches.
            let now = Utc::now().timestamp();
            let since = chrono::DateTime::from_timestamp(now - now.rem_euclid(3600), 0).unwrap()
                - Days::days(7);
            url.query_pairs_mut()
                .append_pair("type", "mod")
                .append_pair("written_only", "0")
                .append_pair("sort", "newest")
                .append_pair("per_page", "50")
                .append_pair("since", &since.to_rfc3339_opts(SecondsFormat::Secs, true));
        }
        "gems" => {
            url.query_pairs_mut()
                .append_pair("type", "mod")
                .append_pair("sort", "bayesian_rating")
                .append_pair("direction", "desc")
                .append_pair("max_downloads", "100000")
                .append_pair("min_rating", "4")
                .append_pair("min_reviews", "3")
                .append_pair("per_page", "8");
        }
        _ => return Err("Unknown home feed.".into()),
    }
    Ok(url)
}

fn trending(page: Page<Review>) -> Feed {
    let sampled = page.data.len();
    let mut projects: HashMap<u64, (Project, HashSet<u64>, String)> = HashMap::new();
    let mut reviews = HashSet::new();
    for review in page.data {
        if !review.project.available || review.project.kind != "mod" || !reviews.insert(review.id) {
            continue;
        }
        let entry = projects
            .entry(review.project.id)
            .or_insert_with(|| (review.project, HashSet::new(), review.created_at.clone()));
        entry.1.insert(review.author.id);
        if review.created_at > entry.2 {
            entry.2 = review.created_at;
        }
    }
    let mut ranked: Vec<_> = projects.into_values().collect();
    // Recent distinct raters, then latest activity. Lifetime downloads never enter ranking.
    ranked.sort_by(|a, b| {
        b.1.len()
            .cmp(&a.1.len())
            .then_with(|| b.2.cmp(&a.2))
            .then_with(|| a.0.id.cmp(&b.0.id))
    });
    Feed {
        entries: ranked
            .into_iter()
            .take(8)
            .map(|(project, raters, _)| Entry {
                project,
                recent_ratings: raters.len(),
            })
            .collect(),
        sampled,
        total: page.meta.total,
        stale: false,
        refresh_after_ms: FRESH * 1000,
    }
}
fn gems(page: Page<Project>) -> Feed {
    let sampled = page.data.len();
    Feed {
        entries: page
            .data
            .into_iter()
            .filter(|p| p.available && p.kind == "mod")
            .map(|project| Entry {
                project,
                recent_ratings: 0,
            })
            .collect(),
        sampled,
        total: page.meta.total,
        stale: false,
        refresh_after_ms: FRESH * 1000,
    }
}
fn options() -> ResolveOptions {
    ResolveOptions {
        ttl: Some(Duration::from_secs(RETAIN)),
        validation: ValidationPolicy::After(Duration::from_secs(FRESH)),
        retrieve_on_unverifiable: true,
        serve_stale_on_unavailable: true,
        force_retrieve: false,
    }
}
async fn refresh_delay<T>(cache: &engram::Engram, key: &CacheKey<T>) -> u64 {
    cache
        .metadata(key.key())
        .await
        .ok()
        .flatten()
        .and_then(|m| m.remaining_ttl())
        .map(|ttl| (ttl.as_millis() as u64).clamp(1000, FRESH * 1000))
        .unwrap_or(1000)
}
async fn visible<T>(
    backend: &Arc<Backend>,
    section: &str,
    app: tauri::AppHandle,
    map: fn(Page<T>) -> Feed,
) -> Result<Feed, String>
where
    T: Clone + Serialize + DeserializeOwned + Send + Sync + 'static,
{
    let url = url(section)?;
    let key: CacheKey<Page<T>> = Backend::key(&url, "moddex-home@1");
    let source = Arc::new(JsonSource::new(backend.moddex.clone(), url));
    if let Some(page) = backend
        .cache
        .get_key(&key)
        .await
        .map_err(|e| e.to_string())?
    {
        let stale = backend
            .cache
            .metadata(key.key())
            .await
            .map_err(|e| e.to_string())?
            .and_then(|m| m.validated_at)
            .and_then(|t| t.elapsed().ok())
            .is_none_or(|age| age >= Duration::from_secs(FRESH));
        if stale {
            let refresh = backend
                .cache
                .resolve_in_background(key.clone(), options(), source);
            let cache = backend.cache.clone();
            let refresh_key = key.clone();
            let section = section.to_owned();
            tauri::async_runtime::spawn(async move {
                if let Ok(Ok(resolved)) = refresh.await {
                    let mut result = map(resolved.value);
                    result.stale = matches!(
                        resolved.status,
                        ResolveStatus::StaleUnavailable | ResolveStatus::StaleUnverifiable
                    );
                    result.refresh_after_ms = refresh_delay(&cache, &refresh_key).await;
                    let _ = app.emit("home:refreshed", Refresh { section, result });
                }
            });
        }
        let mut result = map(page);
        result.stale = stale;
        result.refresh_after_ms = refresh_delay(&backend.cache, &key).await;
        return Ok(result);
    }
    let resolved = backend
        .cache
        .resolve(&key, options(), source.as_ref())
        .await
        .map_err(|e| e.to_string())?;
    let mut result = map(resolved.value);
    result.stale = matches!(
        resolved.status,
        ResolveStatus::StaleUnavailable | ResolveStatus::StaleUnverifiable
    );
    result.refresh_after_ms = refresh_delay(&backend.cache, &key).await;
    Ok(result)
}

#[tauri::command]
pub async fn home_feed(
    state: State<'_, ExploreState>,
    app: tauri::AppHandle,
    section: String,
) -> Result<Feed, String> {
    // Validate before opening the cache.
    url(&section)?;
    let backend = state.backend().await?;
    match section.as_str() {
        "trending" => visible(backend, &section, app, trending).await,
        "gems" => visible(backend, &section, app, gems).await,
        _ => unreachable!(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn review(id: u64, project: u64, author: u64, downloads: u64) -> Review {
        Review {
            id,
            author: Author { id: author },
            created_at: "2026-11-10T12:00:00Z".into(),
            project: Project {
                id: project,
                name: "Mod".into(),
                slug: "mod".into(),
                kind: "mod".into(),
                logo_url: None,
                available: true,
                rating: Rating {
                    average: None,
                    bayesian: None,
                    count: 0,
                },
                summary: None,
                downloads_count: Some(downloads),
            },
        }
    }
    #[test]
    fn ranks_recent_people_not_downloads_and_deduplicates() {
        let result = trending(Page {
            data: vec![
                review(1, 1, 1, 99999999),
                review(2, 2, 2, 50),
                review(3, 2, 3, 50),
                review(3, 2, 3, 50),
                review(4, 1, 1, 99999999),
            ],
            meta: Meta { total: 5 },
        });
        assert_eq!(result.entries[0].project.id, 2);
        assert_eq!(result.entries[0].recent_ratings, 2);
        assert_eq!(result.entries[1].recent_ratings, 1);
    }
    #[test]
    fn excludes_unavailable_and_non_mod_projects() {
        let mut removed = review(1, 1, 1, 0);
        removed.project.available = false;
        let mut pack = review(2, 2, 2, 0);
        pack.project.kind = "modpack".into();
        assert!(
            trending(Page {
                data: vec![removed, pack],
                meta: Meta { total: 2 }
            })
            .entries
            .is_empty()
        );
    }
    #[test]
    fn queries_use_supported_signals_and_bound_requests() {
        let trend = url("trending").unwrap();
        assert_eq!(trend.path(), "/api/v2/reviews");
        assert!(trend.query().unwrap().contains("per_page=50"));
        let gems = url("gems").unwrap();
        assert!(gems.query().unwrap().contains("sort=bayesian_rating"));
        assert!(gems.query().unwrap().contains("max_downloads=100000"));
        assert!(url("downloads").is_err());
        assert_eq!(options().ttl, Some(Duration::from_secs(300)));
    }
    #[tokio::test]
    #[ignore = "Contacts the public Moddex API and measures Engram warm reads"]
    async fn live_moddex_home_cache() {
        let root = tempfile::tempdir().unwrap();
        let state = ExploreState::new(root.path().to_owned());
        let backend = state.backend().await.unwrap();
        let reviews_url = url("trending").unwrap();
        let key = Backend::key::<Page<Review>>(&reviews_url, "moddex-home@1");
        let source = JsonSource::new(backend.moddex.clone(), reviews_url);
        let result = backend
            .cache
            .resolve(&key, options(), &source)
            .await
            .unwrap();
        let feed = trending(result.value);
        assert!(feed.entries.len() <= 8);
        let started = std::time::Instant::now();
        let cached = backend
            .cache
            .resolve(&key, options(), &source)
            .await
            .unwrap();
        assert_eq!(cached.status, ResolveStatus::CacheHit);
        println!(
            "Warm Engram read: {:?}; {} sampled ratings",
            started.elapsed(),
            feed.sampled
        );
        let gems_url = url("gems").unwrap();
        let gems_key = Backend::key::<Page<Project>>(&gems_url, "moddex-home@1");
        let source = JsonSource::new(backend.moddex.clone(), gems_url);
        let result = backend
            .cache
            .resolve(&gems_key, options(), &source)
            .await
            .unwrap();
        for entry in gems(result.value).entries {
            assert!(entry.project.downloads_count.unwrap() < 100000);
            assert!(entry.project.rating.average.unwrap() >= 4.0);
            assert!(entry.project.rating.count >= 3);
        }
    }
}
