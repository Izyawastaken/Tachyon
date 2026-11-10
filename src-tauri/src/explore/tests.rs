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
    assert_eq!(super::prefetch::next_pages(0, 200), vec![12, 24]);
    assert_eq!(super::prefetch::next_pages(12, 30), vec![24]);
    assert!(super::prefetch::next_pages(24, 30).is_empty());
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
        "https://user@cdn.modrinth.com/data/a.png",
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
    for forbidden in ["<script", "<iframe", " src=", "onerror", "style="] {
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
                None => {
                    "HTTP/1.1 304 Not Modified\r\nConnection: close\r\nContent-Length: 0\r\n\r\n"
                        .to_string()
                }
                Some(value) => {
                    let data = format!("{{\"value\":\"{value}\"}}");
                    format!(
                        "HTTP/1.1 200 OK\r\nConnection: close\r\nContent-Type: application/json\r\nETag: \"{value}\"\r\nContent-Length: {}\r\n\r\n{data}",
                        data.len()
                    )
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
        assert_eq!(page.data.limit, PAGE_SIZE);
        assert!(page.data.hits.len() <= PAGE_SIZE as usize);
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
    let visual_project = backend
        .project(&pages["shader"].data.hits[0].project_id)
        .await
        .unwrap();
    let mut image_urls: Vec<String> = pages
        .values()
        .flat_map(|page| page.data.hits.iter().filter_map(|hit| hit.icon_url.clone()))
        .collect();
    for detail in [&project, &visual_project] {
        lol_html::rewrite_str(
            &detail.data.body_html,
            lol_html::RewriteStrSettings::new().append_element_content_handler(lol_html::element!(
                "img[data-image-url]",
                |image| {
                    if let Some(url) = image.get_attribute("data-image-url") {
                        image_urls.push(url);
                    }
                    Ok(())
                }
            )),
        )
        .unwrap();
        image_urls.extend(
            detail
                .data
                .project
                .gallery
                .iter()
                .take(3)
                .map(|image| image.raw_url.clone().unwrap_or_else(|| image.url.clone())),
        );
    }
    image_urls.sort();
    image_urls.dedup();
    let mut image_data = std::collections::BTreeMap::new();
    for url in &image_urls {
        if media::media_url(url).is_ok()
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
    if let Some(path) = std::env::var_os("TACHYON_EXPLORE_SNAPSHOT") {
        let snapshot = serde_json::json!({ "pages": pages, "project": project, "visual_project": visual_project, "filters": { "data": { "versions": versions.data, "loaders": loaders.data, "categories": categories.data }, "stale": false }, "images": image_data });
        tokio::fs::write(path, serde_json::to_vec(&snapshot).unwrap())
            .await
            .unwrap();
    }
}

#[test]
fn raster_format_uses_bytes_not_cdn_suffixes_or_headers() {
    assert_eq!(media::raster_extension(b"RIFF1234WEBPdata"), Some("webp"));
    assert_eq!(
        media::raster_extension(b"\x89PNG\r\n\x1a\ndata"),
        Some("png")
    );
    assert_eq!(
        media::raster_extension(b"<svg onload='alert(1)'></svg>"),
        None
    );
    assert_eq!(media::raster_extension(b"0000ftypisom"), None);
}

#[test]
fn markdown_preserves_images_and_rich_content_without_remote_sources() {
    let html = render_markdown(
        "# Title\n\n![Banner](https://cdn.modrinth.com/data/cached_images/banner.png)\n\n~~old~~\n\n- [x] Done\n\n| A | B |\n|---|---|\n| One | Two |\n\n<details><summary>More</summary><p align=\"center\"><img src=\"https://raw.githubusercontent.com/owner/repo/main/banner.png\" width=\"640\" onerror=\"alert(1)\"></p></details>",
    );
    assert!(
        html.contains("data-image-url=\"https://cdn.modrinth.com/data/cached_images/banner.png\""),
        "{html}"
    );
    assert!(html.contains(
        "data-image-url=\"https://raw.githubusercontent.com/owner/repo/main/banner.png\""
    ));
    for expected in [
        "<table>",
        "<del>old</del>",
        "<details>",
        "<summary>",
        "type=\"checkbox\"",
        "disabled",
        "align=\"center\"",
    ] {
        assert!(html.contains(expected), "{expected}: {html}");
    }
    assert!(!html.contains(" src="));
    assert!(!html.contains("onerror"));
}

#[test]
fn media_accepts_originals_and_self_contained_svg_badges() {
    assert!(media::media_url("https://cdn-raw.modrinth.com/data/A/gallery/original.png").is_ok());
    assert!(
        media::media_url("https://img.shields.io/badge/fabric-supported-green?style=flat").is_ok()
    );
    assert!(media::svg_image(br##"<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(#gradient)" d="M0 0"/></svg>"##));
    for svg in [
        "<svg><script>alert(1)</script></svg>",
        "<svg onload='alert(1)'/>",
        "<svg><image href='https://example.com/a.png'/></svg>",
        "<svg><path fill='url(https://example.com)'/></svg>",
        "<!DOCTYPE svg [<!ENTITY x 'boom'>]><svg>&x;</svg>",
    ] {
        assert!(!media::svg_image(svg.as_bytes()), "{svg}");
    }
}

#[test]
fn creator_images_cannot_connect_to_private_or_reserved_addresses() {
    for ip in [
        "127.0.0.1",
        "10.0.0.1",
        "169.254.169.254",
        "100.64.0.1",
        "192.168.1.1",
        "172.16.0.1",
        "0.0.0.0",
        "224.0.0.1",
        "::1",
        "fc00::1",
        "fe80::1",
        "::ffff:127.0.0.1",
        "2001:db8::1",
        "2002:7f00:1::1",
    ] {
        assert!(!media::public_address(ip.parse().unwrap()), "{ip}");
    }
    for ip in ["1.1.1.1", "104.18.8.171", "2606:4700:4700::1111"] {
        assert!(media::public_address(ip.parse().unwrap()), "{ip}");
    }
    assert!(media::media_url("https://www.complementary.dev/assets/banner.png").is_ok());
}
