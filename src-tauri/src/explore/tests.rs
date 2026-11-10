use super::*;
use engram::{
    RetrievalOutcome, RetrievalRequest, Retrieved, Source, SourceFuture, ValidationOutcome,
    ValidationRequest,
};
use serde::{Deserialize, Serialize};
use std::{
    io::{Read, Write},
    net::TcpListener,
    sync::{Arc, atomic::AtomicUsize},
};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
struct Record {
    value: String,
}

#[test]
fn lookahead_is_two_pages_and_never_runs_past_the_catalog() {
    assert_eq!(super::prefetch::next_pages(0, 200), vec![24, 48]);
    assert_eq!(super::prefetch::next_pages(24, 60), vec![48]);
    assert!(super::prefetch::next_pages(48, 60).is_empty());
    assert!(super::prefetch::next_pages(10_000, 20_000).is_empty());
}

async fn test_cache(path: &std::path::Path) -> Engram {
    Engram::builder()
        .storage(path)
        .memory_capacity(1024 * 1024)
        .build()
        .await
        .unwrap()
}

#[test]
fn facets_are_canonical_and_separate_and_or_groups() {
    let input = SearchInput {
        kind: "datapack".into(),
        versions: vec!["1.21.1".into(), "1.20.1".into(), "1.21.1".into()],
        loaders: vec!["datapack".into()],
        ..Default::default()
    }
    .canonicalize()
    .unwrap();
    assert_eq!(
        input.facets(),
        vec![
            vec!["all_project_types:datapack"],
            vec!["versions:1.20.1", "versions:1.21.1"],
            vec!["categories:datapack"]
        ]
    );
    assert!(
        SearchInput {
            kind: "mod".into(),
            categories: vec!["x\"],[\"project_type:plugin".into()],
            ..Default::default()
        }
        .canonicalize()
        .is_err()
    );
    assert!(
        SearchInput {
            kind: "unknown".into(),
            ..Default::default()
        }
        .canonicalize()
        .is_err()
    );
}

#[test]
fn media_rejects_non_catalog_addresses() {
    assert!(media::media_url("https://cdn.modrinth.com/data/A/icon.png").is_ok());
    for url in [
        "http://cdn.modrinth.com/data/a.png",
        "https://cdn.modrinth.com.evil.test/data/a.png",
        "https://user@cdn.modrinth.com/data/a.png",
        "https://cdn.modrinth.com/other/a.png",
        "file:///etc/passwd",
        "https://127.0.0.1/data/a.png",
    ] {
        assert!(media::media_url(url).is_err(), "{url}");
    }
}

#[test]
fn markdown_cannot_start_webview_network_requests_or_scripts() {
    let html = render_markdown(
        "# Hello\n\n**Readable** [Link](https://modrinth.com) ![remote](https://evil.test/a.png)\n\n<script>alert(1)</script><iframe src='https://evil.test'></iframe><img src='https://evil.test/a.png' onerror='alert(1)'><p style='background:url(https://evil.test)'>Text</p>",
    );
    assert!(html.contains("<h1>Hello</h1>"));
    assert!(html.contains("<strong>Readable</strong>"));
    for forbidden in [
        "<script",
        "<iframe",
        "<img",
        "onerror",
        "style=",
        "evil.test",
    ] {
        assert!(!html.contains(forbidden), "{html}");
    }
}

#[tokio::test]
async fn persistent_schema_survives_reopening_l2() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("cache.db");
    let key = CacheKey::<Record>::new("project/a", "project-record@1");
    let original = Record {
        value: "persisted".into(),
    };
    {
        let cache = test_cache(&path).await;
        cache
            .set_key(&key, &original, Some(Duration::from_secs(60)))
            .await
            .unwrap();
    }
    let cache = test_cache(&path).await;
    assert_eq!(cache.get_key(&key).await.unwrap(), Some(original));
    assert!(
        cache
            .get_key(&CacheKey::<Record>::new("project/a", "project-record@2"))
            .await
            .is_err()
    );
}

#[tokio::test]
async fn conditional_validation_reuses_changed_body_and_serves_stale_on_outage() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let count = Arc::new(AtomicUsize::new(0));
    let observed = count.clone();
    let server = std::thread::spawn(move || {
        for (index, body) in [Some("one"), None, Some("two")].into_iter().enumerate() {
            let (mut stream, _) = listener.accept().unwrap();
            stream
                .set_read_timeout(Some(Duration::from_secs(3)))
                .unwrap();
            let mut input = [0; 8192];
            let size = stream.read(&mut input).unwrap();
            let request = String::from_utf8_lossy(&input[..size]).to_lowercase();
            if index > 0 {
                assert!(request.contains("if-none-match: \"one\""), "{request}");
            }
            observed.fetch_add(1, Ordering::Relaxed);
            let response = match body {
                None => "HTTP/1.1 304 Not Modified\r\nConnection: close\r\nETag: \"one\"\r\nContent-Length: 0\r\n\r\n".to_string(),
                Some(value) => {
                    let data = format!("{{\"value\":\"{value}\"}}");
                    format!("HTTP/1.1 200 OK\r\nConnection: close\r\nContent-Type: application/json\r\nETag: \"{value}\"\r\nContent-Length: {}\r\n\r\n{data}", data.len())
                }
            };
            stream.write_all(response.as_bytes()).unwrap();
        }
    });
    let temp = tempfile::tempdir().unwrap();
    let cache = test_cache(&temp.path().join("cache.db")).await;
    let key = CacheKey::<Record>::new("test", "http-record@1");
    let source = JsonSource::new(
        Transport::new().unwrap(),
        Url::parse(&format!("http://{address}/project")).unwrap(),
    );
    let options = ResolveOptions {
        validation: ValidationPolicy::Always,
        ..Default::default()
    };
    let first = cache.resolve(&key, options.clone(), &source).await.unwrap();
    assert_eq!(first.value.value, "one");
    let second = cache.resolve(&key, options.clone(), &source).await.unwrap();
    assert_eq!(second.status, ResolveStatus::ValidatedFresh);
    let third = cache.resolve(&key, options.clone(), &source).await.unwrap();
    assert_eq!(third.value.value, "two");
    server.join().unwrap();
    assert_eq!(
        count.load(Ordering::Relaxed),
        3,
        "Changed response must not cause a second retrieval GET"
    );
    let offline = cache.resolve(&key, options, &source).await.unwrap();
    assert_eq!(offline.status, ResolveStatus::StaleUnavailable);
    assert_eq!(offline.value.value, "two");
}

struct CountingSource(AtomicUsize);
impl Source<Record> for CountingSource {
    type Error = std::io::Error;
    fn validate<'a>(
        &'a self,
        _: ValidationRequest<'a, Record>,
    ) -> SourceFuture<'a, Result<ValidationOutcome, Self::Error>> {
        Box::pin(async { Ok(ValidationOutcome::Fresh { validation: None }) })
    }
    fn retrieve<'a>(
        &'a self,
        _: RetrievalRequest<'a>,
    ) -> SourceFuture<'a, Result<RetrievalOutcome<Record>, Self::Error>> {
        Box::pin(async move {
            self.0.fetch_add(1, Ordering::Relaxed);
            tokio::time::sleep(Duration::from_millis(30)).await;
            Ok(RetrievalOutcome::Retrieved(Retrieved {
                value: Record {
                    value: "single".into(),
                },
                validation: None,
            }))
        })
    }
}

#[tokio::test]
async fn concurrent_catalog_requests_share_one_origin_retrieval() {
    let temp = tempfile::tempdir().unwrap();
    let cache = test_cache(&temp.path().join("cache.db")).await;
    let source = Arc::new(CountingSource(AtomicUsize::new(0)));
    let mut tasks = Vec::new();
    for _ in 0..24 {
        let cache = cache.clone();
        let source = source.clone();
        tasks.push(tokio::spawn(async move {
            cache
                .resolve(
                    &CacheKey::new("same", "record@1"),
                    ResolveOptions::default(),
                    source.as_ref(),
                )
                .await
                .unwrap()
        }));
    }
    for task in tasks {
        assert_eq!(task.await.unwrap().value.value, "single");
    }
    assert_eq!(source.0.load(Ordering::Relaxed), 1);
}

#[tokio::test]
#[ignore = "Contacts Modrinth and optionally captures a Rust-sourced UI test snapshot"]
async fn live_catalog_smoke_test() {
    let temp = tempfile::tempdir().unwrap();
    let state = ExploreState::new(temp.path().to_owned());
    let backend = state.backend().await.unwrap();
    let mut pages = std::collections::BTreeMap::new();
    for kind in ["mod", "modpack", "shader", "resourcepack", "datapack"] {
        let page = backend
            .search(SearchInput {
                kind: kind.into(),
                sort: "downloads".into(),
                ..Default::default()
            })
            .await
            .unwrap();
        assert!(!page.data.hits.is_empty(), "{kind}");
        pages.insert(kind, page);
    }
    let hit = &pages["mod"].data.hits[0];
    let project = backend.project(&hit.project_id).await.unwrap();
    assert!(!project.data.body_html.is_empty());
    let versions = backend
        .json::<Vec<VersionTag>>(
            Url::parse(&format!("{API}tag/game_version")).unwrap(),
            "modrinth-versions@1",
            21600,
            604800,
        )
        .await
        .unwrap();
    let loaders = backend
        .json::<Vec<LoaderTag>>(
            Url::parse(&format!("{API}tag/loader")).unwrap(),
            "modrinth-loaders@1",
            21600,
            604800,
        )
        .await
        .unwrap();
    let categories = backend
        .json::<Vec<CategoryTag>>(
            Url::parse(&format!("{API}tag/category")).unwrap(),
            "modrinth-categories@1",
            21600,
            604800,
        )
        .await
        .unwrap();
    let mut image_data = std::collections::BTreeMap::new();
    for page in pages.values() {
        for hit in &page.data.hits {
            if let Some(url) = &hit.icon_url
                && let Ok(path) =
                    media::image(&backend.cache, &backend.transport, &backend.media, url).await
                && let Some(destination) = std::env::var_os("TACHYON_EXPLORE_SNAPSHOT")
            {
                let destination = PathBuf::from(destination).parent().unwrap().join("media");
                tokio::fs::create_dir_all(&destination).await.unwrap();
                let name = std::path::Path::new(&path).file_name().unwrap();
                tokio::fs::copy(&path, destination.join(name))
                    .await
                    .unwrap();
                image_data.insert(url.clone(), format!("./media/{}", name.to_string_lossy()));
            }
        }
    }
    if let Some(path) = std::env::var_os("TACHYON_EXPLORE_SNAPSHOT") {
        let snapshot = serde_json::json!({ "pages": pages, "project": project, "filters": { "data": { "versions": versions.data, "loaders": loaders.data, "categories": categories.data }, "stale": false }, "images": image_data });
        tokio::fs::write(path, serde_json::to_vec(&snapshot).unwrap())
            .await
            .unwrap();
    }
}
