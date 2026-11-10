use super::{downloads::*, models::*, versions::*, *};
use sha2::{Digest, Sha512};
use std::{
    io::{Read, Write},
    net::TcpListener,
};
use tokio::sync::watch;

fn file(bytes: &[u8]) -> VersionFile {
    VersionFile {
        filename: "example.jar".into(),
        url: "https://cdn.modrinth.com/data/A/versions/B/example.jar".into(),
        size: bytes.len() as u64,
        primary: true,
        hashes: FileHashes {
            sha512: format!("{:x}", Sha512::digest(bytes)),
        },
    }
}
fn release(index: usize) -> ProjectVersion {
    ProjectVersion {
        id: format!("v{index:03}"),
        project_id: "project".into(),
        name: format!("Release {index}"),
        version_number: format!("{index}"),
        version_type: if index.is_multiple_of(2) {
            "release"
        } else {
            "beta"
        }
        .into(),
        date_published: format!("2026-11-{:02}T00:00:00Z", index % 28 + 1),
        downloads: 20,
        featured: false,
        game_versions: vec!["1.21.1".into()],
        loaders: vec!["fabric".into()],
        changelog: None,
        files: vec![file(b"jar")],
        dependencies: vec![],
    }
}

#[test]
fn releases_filter_and_page_without_duplicates() {
    let versions: Vec<_> = (0..55).map(release).collect();
    let mut input = VersionInput {
        project_id: "project".into(),
        channel: "release".into(),
        game_version: "1.21.1".into(),
        loader: "fabric".into(),
        ..Default::default()
    };
    input.validate().unwrap();
    let first = page(versions.clone(), &input);
    assert_eq!(first.total, 28);
    assert_eq!(first.versions.len(), VERSION_PAGE_SIZE);
    input.offset = VERSION_PAGE_SIZE;
    let second = page(versions.clone(), &input);
    assert_eq!(second.versions.len(), 8);
    assert!(
        !second
            .versions
            .iter()
            .any(|version| first.versions.iter().any(|first| version.id == first.id))
    );
    input.loader = "forge".into();
    assert_eq!(page(versions, &input).total, 0);
    input.project_id = "../other".into();
    assert!(input.validate().is_err());
}

#[test]
fn download_metadata_and_hash_are_validated() {
    let original = file(b"verified");
    validate_file(&original).unwrap();
    verify_file(&original, original.size, &Sha512::digest(b"verified")).unwrap();
    assert!(verify_file(&original, original.size, &Sha512::digest(b"modified")).is_err());
    assert!(verify_file(&original, 1, &Sha512::digest(b"verified")).is_err());
    for name in [
        "../a.jar",
        "C:\\a.jar",
        "CON.jar",
        "NUL",
        "a.jar:",
        "a.jar.",
    ] {
        let mut invalid = original.clone();
        invalid.filename = name.into();
        assert!(validate_file(&invalid).is_err(), "{name}");
    }
    for address in [
        "http://cdn.modrinth.com/data/A/versions/B/a.jar",
        "https://evil.test/data/A/versions/B/a.jar",
        "https://cdn.modrinth.com/data/icon.png",
    ] {
        let mut invalid = original.clone();
        invalid.url = address.into();
        assert!(validate_file(&invalid).is_err());
    }
}

async fn response(body: &[u8]) -> reqwest::Response {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let body = body.to_vec();
    std::thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        stream
            .set_read_timeout(Some(std::time::Duration::from_secs(3)))
            .unwrap();
        let mut request = [0; 8192];
        let read = stream.read(&mut request).unwrap();
        assert!(read > 0);
        let header = format!(
            "HTTP/1.1 200 OK\r\nConnection: close\r\nContent-Length: {}\r\n\r\n",
            body.len()
        );
        let _ = stream.write_all(header.as_bytes());
        let _ = stream.write_all(&body);
    });
    reqwest::Client::new()
        .get(format!("http://{address}/release.jar"))
        .send()
        .await
        .unwrap()
}

#[tokio::test]
async fn verified_transfer_commits_and_cleans_temporary_files() {
    let root = tempfile::tempdir().unwrap();
    let target = root.path().join("example.jar");
    std::fs::write(&target, b"previous release").unwrap();
    let bytes = b"correct release bytes";
    let (_sender, receiver) = watch::channel(false);
    let result = save_response(
        response(bytes).await,
        &file(bytes),
        &target,
        receiver,
        |_| {},
    )
    .await
    .unwrap()
    .unwrap();
    assert_eq!(result.size, bytes.len() as u64);
    assert_eq!(std::fs::read(&target).unwrap(), bytes);
    assert_eq!(std::fs::read_dir(root.path()).unwrap().count(), 1);
}

#[tokio::test]
async fn corrupt_transfer_preserves_existing_destination() {
    let root = tempfile::tempdir().unwrap();
    let target = root.path().join("example.jar");
    std::fs::write(&target, b"existing file").unwrap();
    let (_sender, receiver) = watch::channel(false);
    let result = save_response(
        response(b"tampered").await,
        &file(b"expected"),
        &target,
        receiver,
        |_| {},
    )
    .await;
    assert!(result.is_err());
    assert_eq!(std::fs::read(&target).unwrap(), b"existing file");
    assert_eq!(std::fs::read_dir(root.path()).unwrap().count(), 1);
}

#[tokio::test]
async fn cancelled_transfer_preserves_destination_and_removes_partial_file() {
    let root = tempfile::tempdir().unwrap();
    let target = root.path().join("example.jar");
    std::fs::write(&target, b"existing file").unwrap();
    let (sender, receiver) = watch::channel(false);
    let bytes = vec![42; 256 * 1024];
    let result = save_response(
        response(&bytes).await,
        &file(&bytes),
        &target,
        receiver,
        |event| {
            if event.stage == "downloading" {
                sender.send(true).unwrap();
            }
        },
    )
    .await
    .unwrap();
    assert!(result.is_none());
    assert_eq!(std::fs::read(&target).unwrap(), b"existing file");
    assert_eq!(std::fs::read_dir(root.path()).unwrap().count(), 1);
}

#[tokio::test]
#[ignore = "Retrieves real release data and verifies a Modrinth file using the Rust streaming pipeline"]
async fn live_releases_and_download_smoke_test() {
    let root = tempfile::tempdir().unwrap();
    let state = ExploreState::new(root.path().join("cache"));
    let backend = state.backend().await.unwrap();
    let mut input = VersionInput {
        project_id: "fabric-api".into(),
        game_version: "1.21.1".into(),
        loader: "fabric".into(),
        channel: "release".into(),
        ..Default::default()
    };
    let list = backend.versions(input.clone()).await.unwrap();
    assert!(list.data.total > 0);
    assert!(
        list.data
            .versions
            .iter()
            .all(|version| version.changelog.is_none()
                && version.loaders.contains(&input.loader)
                && version.game_versions.contains(&input.game_version))
    );
    let version = backend.version(&list.data.versions[0].id).await.unwrap();
    let html = backend
        .render_body(version.data.changelog.clone().unwrap_or_default())
        .await
        .unwrap();
    let file = version.data.files.iter().find(|file| file.primary).unwrap();
    let target = root.path().join(&file.filename);
    let (_sender, receiver) = watch::channel(false);
    let saved = transfer(&backend.transport, file, &target, receiver, |_| {})
        .await
        .unwrap()
        .unwrap();
    assert_eq!(saved.size, file.size);
    if let Some(destination) = std::env::var_os("TACHYON_RELEASE_SNAPSHOT") {
        let detail = serde_json::json!({"data": {"version": version.data, "changelog_html": html, "dependencies": []}, "stale": version.stale});
        // Also capture unfiltered lists for browser-side filter/pagination checks.
        input.game_version.clear();
        input.loader.clear();
        input.channel.clear();
        let all = backend.versions(input.clone()).await.unwrap();
        input.offset = VERSION_PAGE_SIZE;
        let second = backend.versions(input).await.unwrap();
        let mut details = std::collections::BTreeMap::new();
        details.insert(version.data.id.clone(), detail.clone());
        for summary in all.data.versions.iter().take(2) {
            let value = backend.version(&summary.id).await.unwrap();
            let body = backend
                .render_body(value.data.changelog.clone().unwrap_or_default())
                .await
                .unwrap();
            details.insert(summary.id.clone(), serde_json::json!({"data": {"version": value.data, "changelog_html": body, "dependencies": []}, "stale": value.stale}));
        }
        std::fs::write(
            destination,
            serde_json::to_vec(
                &serde_json::json!({"versions": all, "second": second, "filtered": list, "detail": detail, "details": details}),
            )
            .unwrap(),
        )
        .unwrap();
    }
}
