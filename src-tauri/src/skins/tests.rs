use super::{defaults::DEFAULTS, image, models::*, network, storage::Store};
use std::fs;

#[test]
fn every_official_default_decodes_in_both_models() {
    assert_eq!(DEFAULTS.len(), 9);
    for (name, wide, slim) in DEFAULTS {
        for png in [wide, slim] {
            let skin = image::normalize(png).unwrap_or_else(|e| panic!("{name}: {e}"));
            assert_eq!((skin.width, skin.height), (64, 64));
            assert!(!skin.head.is_empty());
            assert_eq!(image::normalize(&skin.png).unwrap().hash, skin.hash);
        }
    }
}

#[test]
fn hd_legacy_palette_and_invalid_dimensions() {
    for (w, h) in [(64, 32), (128, 64), (128, 128), (1024, 1024)] {
        let rgba = vec![128; (w * h * 4) as usize];
        let png = image::encode(&rgba, w, h).unwrap();
        let normalized = image::normalize(&png).unwrap();
        assert_eq!((normalized.width, normalized.height), (w, h));
    }
    for (w, h) in [(32, 32), (65, 65), (64, 48), (2048, 2048)] {
        let png = image::encode(&vec![0; (w * h * 4) as usize], w, h).unwrap();
        assert!(image::normalize(&png).is_err());
    }
    let mut palette = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut palette, 64, 64);
        encoder.set_color(png::ColorType::Indexed);
        encoder.set_palette(vec![20, 40, 80]);
        encoder.set_trns(vec![255]);
        encoder
            .write_header()
            .unwrap()
            .write_image_data(&vec![0; 64 * 64])
            .unwrap();
    }
    assert!(image::normalize(&palette).is_ok());
}

#[test]
fn damaged_oversized_and_animated_images_are_rejected() {
    assert!(image::normalize(b"not a png").is_err());
    assert!(image::normalize(&vec![0; image::MAX_BYTES + 1]).is_err());
    let original = DEFAULTS[0].1;
    assert!(image::normalize(&original[..original.len() / 2]).is_err());
    let mut animated = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut animated, 64, 64);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_animated(1, 0).unwrap();
        encoder
            .write_header()
            .unwrap()
            .write_image_data(&vec![255; 64 * 64 * 4])
            .unwrap();
    }
    assert!(
        image::normalize(&animated)
            .err()
            .unwrap()
            .contains("Animated")
    );
}

#[test]
fn slim_detection_respects_legacy_and_transparent_arm_columns() {
    let mut pixels = vec![255; 64 * 64 * 4];
    for y in 20..32 {
        for x in 54..56 {
            pixels[(y * 64 + x) * 4 + 3] = 0;
        }
    }
    assert!(
        image::normalize(&image::encode(&pixels, 64, 64).unwrap())
            .unwrap()
            .slim
    );
    assert!(
        !image::normalize(&image::encode(&pixels[..64 * 32 * 4], 64, 32).unwrap())
            .unwrap()
            .slim
    );
}

#[test]
fn offline_first_launch_defaults_and_selection_survive_reopening() {
    let temp = tempfile::tempdir().unwrap();
    let mut store = Store::open(temp.path().into()).unwrap();
    assert_eq!(store.library.active_id, "builtin-steve");
    assert_eq!(store.library.skins.len(), 9);
    store
        .edit("builtin-alex", "select", None, Some(Model::Slim))
        .unwrap();
    drop(store);
    let reopened = Store::open(temp.path().into()).unwrap();
    assert_eq!(reopened.library.active_id, "builtin-alex");
    for skin in reopened.snapshot().skins {
        assert!(std::path::Path::new(&skin.texture).exists());
    }
}

#[test]
fn custom_import_deduplicates_normalized_pixels_and_persists_edits() {
    let temp = tempfile::tempdir().unwrap();
    let mut store = Store::open(temp.path().into()).unwrap();
    let id = store
        .import(DEFAULTS[0].1, "My Steve", "upload", None, None)
        .unwrap();
    let normalized = image::normalize(DEFAULTS[0].1).unwrap();
    assert_eq!(
        store
            .import(&normalized.png, "Duplicate", "upload", None, None)
            .unwrap(),
        id
    );
    assert_eq!(store.library.skins.len(), 10);
    store
        .edit(&id, "rename", Some("  New name  ".into()), None)
        .unwrap();
    store.edit(&id, "favorite", None, None).unwrap();
    store.edit(&id, "select", None, Some(Model::Slim)).unwrap();
    let reopened = Store::open(temp.path().into()).unwrap();
    let skin = reopened.library.skins.iter().find(|s| s.id == id).unwrap();
    assert_eq!(skin.name, "New name");
    assert!(skin.favorite);
    assert_eq!(skin.model, Model::Slim);
    assert_eq!(reopened.library.active_id, id);
}

#[test]
fn duplicate_import_repairs_missing_custom_assets() {
    let temp = tempfile::tempdir().unwrap();
    let mut store = Store::open(temp.path().into()).unwrap();
    let id = store
        .import(DEFAULTS[0].1, "Custom", "upload", None, None)
        .unwrap();
    let skin = store
        .library
        .skins
        .iter()
        .find(|s| s.id == id)
        .unwrap()
        .clone();
    fs::remove_file(store.path(&skin.texture)).unwrap();
    fs::write(store.path(&skin.thumbnail), b"broken").unwrap();
    assert_eq!(
        store
            .import(
                DEFAULTS[0].1,
                "Ignored duplicate name",
                "upload",
                None,
                None
            )
            .unwrap(),
        id
    );
    assert!(image::normalize(&fs::read(store.path(&skin.texture)).unwrap()).is_ok());
    assert_ne!(fs::read(store.path(&skin.thumbnail)).unwrap(), b"broken");
    assert_eq!(
        store
            .library
            .skins
            .iter()
            .find(|s| s.id == id)
            .unwrap()
            .name,
        "Custom"
    );
}

#[test]
fn removing_active_skin_returns_to_steve_and_can_be_undone() {
    let temp = tempfile::tempdir().unwrap();
    let mut store = Store::open(temp.path().into()).unwrap();
    let id = store
        .import(DEFAULTS[0].1, "Custom", "upload", None, None)
        .unwrap();
    store.edit(&id, "select", None, None).unwrap();
    store.edit(&id, "remove", None, None).unwrap();
    assert_eq!(store.library.active_id, "builtin-steve");
    assert!(store.snapshot().can_undo);
    store.edit("", "undo", None, None).unwrap();
    assert!(store.library.skins.iter().any(|s| s.id == id));
    assert!(!store.snapshot().can_undo);
    assert!(store.edit("builtin-steve", "remove", None, None).is_err());
}

#[test]
fn interrupted_or_corrupt_manifest_recovers_last_good_save() {
    let temp = tempfile::tempdir().unwrap();
    let mut store = Store::open(temp.path().into()).unwrap();
    store.edit("builtin-alex", "select", None, None).unwrap();
    store.edit("builtin-steve", "favorite", None, None).unwrap();
    fs::write(temp.path().join("library.json"), b"{broken").unwrap();
    drop(store);
    let recovered = Store::open(temp.path().into()).unwrap();
    assert_eq!(recovered.library.active_id, "builtin-alex");
    assert!(recovered.snapshot().notice.is_some());
    // Backup and primary both damaged: fail without deleting the user's data.
    fs::write(temp.path().join("library.json"), b"broken").unwrap();
    fs::write(temp.path().join("library.json.bak"), b"broken").unwrap();
    assert!(Store::open(temp.path().into()).is_err());
    assert!(temp.path().join("assets/steve-classic.png").exists());
}

#[test]
fn manifest_paths_cannot_escape_owned_asset_folder_and_defaults_repair() {
    let temp = tempfile::tempdir().unwrap();
    let store = Store::open(temp.path().into()).unwrap();
    let mut invalid = store.library.clone();
    invalid.skins[0].texture = "../other.png".into();
    fs::write(
        temp.path().join("library.json"),
        serde_json::to_vec(&invalid).unwrap(),
    )
    .unwrap();
    assert!(Store::open(temp.path().into()).is_err());
    fs::write(
        temp.path().join("library.json"),
        serde_json::to_vec(&store.library).unwrap(),
    )
    .unwrap();
    fs::remove_file(temp.path().join("assets/steve-classic.png")).unwrap();
    assert!(Store::open(temp.path().into()).is_ok());
    assert!(temp.path().join("assets/steve-classic.png").exists());
}

#[test]
fn input_validation_handles_usernames_uuids_and_official_links_only() {
    assert_eq!(
        network::parse(" Notch ").unwrap(),
        network::Lookup::Player("notch".into())
    );
    assert_eq!(
        network::parse("069a79f4-44e9-4726-a5be-fca90e38aaf5").unwrap(),
        network::Lookup::Player("069a79f444e94726a5befca90e38aaf5".into())
    );
    let hash = "a".repeat(64);
    assert_eq!(
        network::texture_url(&format!("http://textures.minecraft.net/texture/{hash}")).unwrap(),
        format!("https://textures.minecraft.net/texture/{hash}")
    );
    for invalid in [
        "ab",
        "player/name",
        "../steve",
        "a name",
        "https://127.0.0.1/texture/a",
        "https://textures.minecraft.net.evil.com/texture/a",
        "https://textures.minecraft.net@evil.com/texture/a",
        "https://textures.minecraft.net:444/texture/a",
        "file:///skin.png",
        "069a79f444e94726a5befca90e38aaf5----",
    ] {
        assert!(network::parse(invalid).is_err(), "{invalid}");
    }
    assert!(clean_name("\n").is_err());
    assert!(clean_name(&"a".repeat(49)).is_err());
}

#[tokio::test]
#[ignore = "Uses live Minecraft services; also writes a browser verification fixture"]
async fn live_player_import_cache_reopen_and_preview_fixture() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("network");
    let network = network::Network::new(root.clone()).await.unwrap();
    let (remote, stale) = network.resolve("Notch").await.unwrap();
    assert!(!stale);
    assert_eq!(remote.name, "Notch");
    assert_eq!(
        remote.player.as_deref(),
        Some("069a79f444e94726a5befca90e38aaf5")
    );
    assert!(image::normalize(&remote.png).is_ok());
    let reopened = network::Network::new(root).await.unwrap();
    assert_eq!(reopened.resolve("notch").await.unwrap().0.png, remote.png);
    let mut store = Store::open(temp.path().join("library")).unwrap();
    store
        .import(
            &remote.png,
            &remote.name,
            "player",
            remote.player,
            Some(remote.model),
        )
        .unwrap();
    write_preview_fixture(&store);
}

fn write_preview_fixture(store: &Store) {
    let output = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../tests/generated/skins");
    fs::create_dir_all(&output).unwrap();
    let mut snapshot = store.snapshot();
    for skin in &mut snapshot.skins {
        for file in [
            &mut skin.texture,
            &mut skin.slim_texture,
            &mut skin.thumbnail,
        ] {
            let path = std::path::Path::new(file);
            let name = path.file_name().unwrap().to_string_lossy().into_owned();
            fs::copy(path, output.join(&name)).unwrap();
            *file = format!("/tests/generated/skins/{name}");
        }
    }
    fs::write(
        output.join("library.json"),
        serde_json::to_vec_pretty(&snapshot).unwrap(),
    )
    .unwrap();
}

#[test]
#[ignore = "Generates offline fixtures for the isolated browser regression suite"]
fn capture_offline_skins_preview_fixture() {
    let temp = tempfile::tempdir().unwrap();
    let mut store = Store::open(temp.path().join("library")).unwrap();
    store
        .import(DEFAULTS[0].1, "Sample skin", "upload", None, None)
        .unwrap();
    write_preview_fixture(&store);
}
