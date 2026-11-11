use chrono::{Local, NaiveDateTime, TimeZone};
use serde::Serialize;
use std::{
    collections::HashSet,
    fs,
    io::Read,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

pub struct ScreenshotsState {
    root: PathBuf,
    gate: tokio::sync::Mutex<()>,
}
impl ScreenshotsState {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            gate: tokio::sync::Mutex::new(()),
        }
    }
}

#[derive(Serialize)]
pub struct Screenshot {
    id: String,
    path: String,
    filename: String,
    instance: String,
    instance_id: String,
    version: Option<String>,
    loader: Option<String>,
    taken_at: u64,
    width: u32,
    height: u32,
}
#[derive(Serialize)]
pub struct Source {
    path: String,
    name: String,
    count: usize,
}
#[derive(Serialize)]
pub struct Library {
    screenshots: Vec<Screenshot>,
    sources: Vec<Source>,
    warnings: Vec<String>,
}

fn read_sources(root: &Path) -> Result<Vec<PathBuf>, String> {
    let path = root.join("sources.json");
    match fs::read(&path) {
        Ok(bytes) => serde_json::from_slice(&bytes)
            .map_err(|_| "Linked screenshot folders could not be read.".into()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(Vec::new()),
        Err(error) => Err(format!(
            "Linked screenshot folders could not be read: {error}"
        )),
    }
}

fn game_folder(path: &Path) -> PathBuf {
    if path.file_name().is_some_and(|name| name == "screenshots") {
        return path.parent().unwrap_or(path).to_path_buf();
    }
    for name in [".minecraft", "minecraft"] {
        if path.join(name).is_dir() {
            return path.join(name);
        }
    }
    path.to_path_buf()
}

fn json(path: &Path) -> Option<serde_json::Value> {
    // Instance metadata is small. Don't read arbitrary large files into memory.
    let file = fs::File::open(path).ok()?;
    if file.metadata().ok()?.len() > 1_048_576 {
        return None;
    }
    serde_json::from_reader(file).ok()
}

fn instance_metadata(game: &Path) -> (String, Option<String>, Option<String>) {
    let parent = game.parent().unwrap_or(game);
    let mut name = if game
        .file_name()
        .is_some_and(|name| name == ".minecraft" || name == "minecraft")
    {
        let default = default_game().and_then(|path| fs::canonicalize(path).ok());
        if default.is_some() && fs::canonicalize(game).ok() == default {
            "Minecraft".to_string()
        } else {
            parent
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .into_owned()
        }
    } else {
        game.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned()
    };
    let config = [game.join("instance.cfg"), parent.join("instance.cfg")]
        .into_iter()
        .find_map(|path| fs::read_to_string(path).ok());
    if let Some(config) = config {
        if let Some(value) = config
            .lines()
            .find_map(|line| line.trim().strip_prefix("name="))
        {
            if !value.trim().is_empty() {
                name = value.trim().to_string();
            }
        }
    } else if game
        .file_name()
        .is_some_and(|n| n == ".minecraft" || n == "minecraft")
        && parent.join("mmc-pack.json").is_file()
    {
        name = parent
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned();
    }
    // Prism/MultiMC specify the actual game and loader components separately.
    // A vanilla shared screenshot folder has no reliable per-capture version.
    let pack = json(&game.join("mmc-pack.json")).or_else(|| json(&parent.join("mmc-pack.json")));
    let components = pack.as_ref().and_then(|p| p["components"].as_array());
    let version = components
        .and_then(|items| items.iter().find(|item| item["uid"] == "net.minecraft"))
        .and_then(|item| item["version"].as_str())
        .map(str::to_string);
    let loader = components.map(|items| {
        items
            .iter()
            .find_map(|item| match item["uid"].as_str()? {
                "net.fabricmc.fabric-loader" => Some("Fabric"),
                "org.quiltmc.quilt-loader" => Some("Quilt"),
                "net.minecraftforge" => Some("Forge"),
                "net.neoforged" => Some("NeoForge"),
                _ => None,
            })
            .unwrap_or("Vanilla")
            .to_string()
    });
    (name, version, loader)
}

fn dimensions(path: &Path) -> Option<(u32, u32)> {
    let mut header = [0u8; 24];
    fs::File::open(path).ok()?.read_exact(&mut header).ok()?;
    if &header[..8] != b"\x89PNG\r\n\x1a\n" || &header[12..16] != b"IHDR" {
        return None;
    }
    let width = u32::from_be_bytes(header[16..20].try_into().ok()?);
    let height = u32::from_be_bytes(header[20..24].try_into().ok()?);
    (width > 0 && height > 0 && width <= 65536 && height <= 65536).then_some((width, height))
}

fn captured_at(filename: &str, metadata: &fs::Metadata) -> u64 {
    // Minecraft names screenshots in the player's local time, including duplicates with a suffix.
    filename
        .get(..19)
        .and_then(|name| NaiveDateTime::parse_from_str(name, "%Y-%m-%d_%H.%M.%S").ok())
        .and_then(|time| Local.from_local_datetime(&time).single())
        .and_then(|time| u64::try_from(time.timestamp_millis()).ok())
        .unwrap_or_else(|| {
            metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .map(|duration| duration.as_millis() as u64)
                .unwrap_or(0)
        })
}

fn default_game() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    let path = std::env::var_os("APPDATA").map(|root| PathBuf::from(root).join(".minecraft"));
    #[cfg(target_os = "macos")]
    let path = std::env::var_os("HOME")
        .map(|root| PathBuf::from(root).join("Library/Application Support/minecraft"));
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let path = std::env::var_os("HOME").map(|root| PathBuf::from(root).join(".minecraft"));
    path.filter(|path| path.join("screenshots").is_dir())
}

fn scan(roots: Vec<PathBuf>) -> Library {
    let mut library = Library {
        screenshots: Vec::new(),
        sources: Vec::new(),
        warnings: Vec::new(),
    };
    let mut visited = HashSet::new();
    for root in roots {
        let game = game_folder(&root);
        let directory = game.join("screenshots");
        let canonical = match fs::canonicalize(&directory) {
            Ok(path) => path,
            Err(_) => {
                library.warnings.push(format!(
                    "{} is unavailable. Reconnect the folder and refresh.",
                    root.display()
                ));
                continue;
            }
        };
        if !visited.insert(canonical.clone()) {
            continue;
        }
        let (name, version, loader) = instance_metadata(&game);
        let entries = match fs::read_dir(&canonical) {
            Ok(entries) => entries,
            Err(_) => {
                library
                    .warnings
                    .push(format!("Screenshots in {name} could not be read."));
                continue;
            }
        };
        let before = library.screenshots.len();
        let mut skipped = 0;
        for entry in entries {
            let Ok(entry) = entry else {
                skipped += 1;
                continue;
            };
            let path = entry.path();
            if !entry.file_type().is_ok_and(|kind| kind.is_file())
                || !path
                    .extension()
                    .is_some_and(|extension| extension.eq_ignore_ascii_case("png"))
            {
                continue;
            }
            let Some((width, height)) = dimensions(&path) else {
                skipped += 1;
                continue;
            };
            let Ok(metadata) = entry.metadata() else {
                skipped += 1;
                continue;
            };
            let filename = entry.file_name().to_string_lossy().into_owned();
            let path = path.to_string_lossy().into_owned();
            library.screenshots.push(Screenshot {
                id: path.clone(),
                path,
                taken_at: captured_at(&filename, &metadata),
                filename,
                instance: name.clone(),
                instance_id: canonical.to_string_lossy().into_owned(),
                version: version.clone(),
                loader: loader.clone(),
                width,
                height,
            });
        }
        if skipped > 0 {
            library.warnings.push(format!("Skipped {skipped} unreadable screenshots in {name}. Refresh after Minecraft finishes saving."));
        }
        library.sources.push(Source {
            path: root.to_string_lossy().into_owned(),
            name,
            count: library.screenshots.len() - before,
        });
    }
    library
        .screenshots
        .sort_by(|a, b| b.taken_at.cmp(&a.taken_at).then(a.id.cmp(&b.id)));
    library
}

async fn snapshot(app: tauri::AppHandle, root: PathBuf) -> Result<Library, String> {
    let library = tauri::async_runtime::spawn_blocking(move || {
        let mut roots = read_sources(&root)?;
        if let Some(default) = default_game() {
            roots.push(default);
        }
        Ok::<_, String>(scan(roots))
    })
    .await
    .map_err(|error| error.to_string())??;
    // Authorize only discovered PNGs; never open the whole instance directory to the webview.
    let scope = app.asset_protocol_scope();
    for screenshot in &library.screenshots {
        scope
            .allow_file(&screenshot.path)
            .map_err(|error| error.to_string())?;
    }
    Ok(library)
}

#[tauri::command]
pub async fn screenshots_library(
    app: tauri::AppHandle,
    state: State<'_, ScreenshotsState>,
) -> Result<Library, String> {
    let _guard = state.gate.lock().await;
    snapshot(app, state.root.clone()).await
}

#[tauri::command]
pub async fn screenshots_link_instance(
    app: tauri::AppHandle,
    state: State<'_, ScreenshotsState>,
) -> Result<Option<Library>, String> {
    let (send, receive) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_title("Choose an instance or screenshots folder")
        .pick_folder(move |folder| {
            let _ = send.send(folder);
        });
    let Some(folder) = receive
        .await
        .map_err(|_| "The folder picker closed unexpectedly.")?
    else {
        return Ok(None);
    };
    let path = folder
        .into_path()
        .map_err(|_| "Choose a local instance folder.")?;
    let _guard = state.gate.lock().await;
    let root = state.root.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let game = game_folder(&path);
        if !game.join("screenshots").is_dir() {
            return Err("This folder has no screenshots folder. Take a screenshot with F2, then link the instance again.".to_string());
        }
        let game = fs::canonicalize(game).map_err(|error| error.to_string())?;
        let mut roots = read_sources(&root)?;
        if !roots.contains(&game) { roots.push(game); }
        fs::create_dir_all(&root).map_err(|error| error.to_string())?;
        let mut file = tempfile::NamedTempFile::new_in(&root).map_err(|error| error.to_string())?;
        serde_json::to_writer_pretty(file.as_file_mut(), &roots).map_err(|error| error.to_string())?;
        file.persist(root.join("sources.json")).map_err(|error| error.to_string())?;
        Ok(())
    }).await.map_err(|error| error.to_string())??;
    snapshot(app, state.root.clone()).await.map(Some)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scans_instances_deduplicates_folders_and_ignores_non_images() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        let game = root.join(".minecraft");
        fs::create_dir_all(game.join("screenshots")).unwrap();
        fs::write(
            root.join("instance.cfg"),
            "[General]\nname=Creative Fabric\n",
        )
        .unwrap();
        fs::write(root.join("mmc-pack.json"), r#"{"components":[{"uid":"net.minecraft","version":"1.21.1"},{"uid":"net.fabricmc.fabric-loader","version":"0.16"}]}"#).unwrap();
        // The scanner only reads the PNG header; rendering remains the webview's job.
        let mut header = b"\x89PNG\r\n\x1a\n\0\0\0\rIHDR".to_vec();
        header.extend_from_slice(&1920u32.to_be_bytes());
        header.extend_from_slice(&1080u32.to_be_bytes());
        fs::write(game.join("screenshots/2026-11-09_18.20.30.png"), header).unwrap();
        fs::write(game.join("screenshots/broken.png"), b"bad data").unwrap();
        fs::write(game.join("screenshots/notes.txt"), b"not a screenshot").unwrap();
        let library = scan(vec![
            root.to_path_buf(),
            game.clone(),
            game.join("screenshots"),
        ]);
        assert_eq!(library.sources.len(), 1);
        assert_eq!(library.screenshots.len(), 1);
        let item = &library.screenshots[0];
        assert_eq!(item.instance, "Creative Fabric");
        assert_eq!(item.version.as_deref(), Some("1.21.1"));
        assert_eq!(item.loader.as_deref(), Some("Fabric"));
        assert_eq!((item.width, item.height), (1920, 1080));
        assert!(item.taken_at > 0);
        assert_eq!(library.warnings.len(), 1);
    }

    #[test]
    fn missing_instances_warn_and_shared_folders_do_not_guess_versions() {
        let temp = tempfile::tempdir().unwrap();
        let game = temp.path().join(".minecraft");
        fs::create_dir_all(game.join("screenshots")).unwrap();
        let (_, version, loader) = instance_metadata(&game);
        assert!(version.is_none() && loader.is_none());
        let library = scan(vec![game, temp.path().join("missing")]);
        assert_eq!(library.sources.len(), 1);
        assert_eq!(library.warnings.len(), 1);
    }
}
