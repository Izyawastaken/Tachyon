mod defaults;
mod image;
mod models;
mod network;
mod storage;
#[cfg(test)]
mod tests;

use models::*;
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::State;
use tauri_plugin_dialog::DialogExt;
use tokio::sync::OnceCell;

pub struct SkinsState {
    root: PathBuf,
    cache_root: PathBuf,
    store: OnceCell<Arc<Mutex<storage::Store>>>,
    network: OnceCell<network::Network>,
    imports: tokio::sync::Semaphore,
}
impl SkinsState {
    pub fn new(root: PathBuf, cache_root: PathBuf) -> Self {
        Self {
            root,
            cache_root,
            store: OnceCell::new(),
            network: OnceCell::new(),
            imports: tokio::sync::Semaphore::new(2),
        }
    }
    async fn store(&self) -> Result<Arc<Mutex<storage::Store>>, String> {
        self.store
            .get_or_try_init(|| async {
                let root = self.root.clone();
                tokio::task::spawn_blocking(move || {
                    storage::Store::open(root).map(|s| Arc::new(Mutex::new(s)))
                })
                .await
                .map_err(|e| e.to_string())?
            })
            .await
            .cloned()
    }
    async fn with_store<T: Send + 'static>(
        &self,
        action: impl FnOnce(&mut storage::Store) -> Result<T, String> + Send + 'static,
    ) -> Result<T, String> {
        let store = self.store().await?;
        tokio::task::spawn_blocking(move || {
            let mut store = store
                .lock()
                .map_err(|_| "The skin library is unavailable. Restart Tachyon to try again.")?;
            action(&mut store)
        })
        .await
        .map_err(|e| e.to_string())?
    }
}

#[tauri::command]
pub async fn skins_library(state: State<'_, SkinsState>) -> Result<Snapshot, String> {
    state.with_store(|s| Ok(s.snapshot())).await
}

#[tauri::command]
pub async fn skins_import_files(
    app: tauri::AppHandle,
    state: State<'_, SkinsState>,
    paths: Option<Vec<String>>,
) -> Result<ImportResult, String> {
    // Bound work before opening dialogs or enqueueing expensive PNG decodes.
    let _slot = state
        .imports
        .try_acquire()
        .map_err(|_| "Two skin imports are already running. Wait for one to finish.")?;
    let paths = match paths {
        Some(paths) => paths.into_iter().map(PathBuf::from).collect::<Vec<_>>(),
        None => {
            let (sender, receiver) = tokio::sync::oneshot::channel();
            app.dialog()
                .file()
                .set_title("Import Minecraft skins")
                .add_filter("Minecraft skin", &["png"])
                .pick_files(move |paths| {
                    let _ = sender.send(paths);
                });
            receiver
                .await
                .map_err(|_| "The file picker closed unexpectedly.")?
                .unwrap_or_default()
                .into_iter()
                .map(|p| p.into_path().map_err(|_| "Choose a local PNG file."))
                .collect::<Result<Vec<_>, _>>()?
        }
    };
    if paths.len() > 32 {
        return Err("Import up to 32 skins at a time.".into());
    }
    state
        .with_store(move |store| {
            let mut selected_id = None;
            let mut errors = Vec::new();
            for path in paths {
                let name = path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Imported skin")
                    .chars()
                    .take(48)
                    .collect::<String>();
                match storage::bounded_read(&path)
                    .and_then(|bytes| store.import(&bytes, &name, "upload", None, None))
                {
                    Ok(id) => selected_id = Some(id),
                    Err(error) => errors.push(format!("{name}: {error}")),
                }
            }
            Ok(ImportResult {
                library: store.snapshot(),
                selected_id,
                errors,
            })
        })
        .await
}

#[tauri::command]
pub async fn skins_import_player(
    state: State<'_, SkinsState>,
    input: String,
) -> Result<ImportResult, String> {
    let _slot = state
        .imports
        .try_acquire()
        .map_err(|_| "Two skin imports are already running. Wait for one to finish.")?;
    network::parse(&input)?;
    let network = state
        .network
        .get_or_try_init(|| network::Network::new(state.cache_root.clone()))
        .await?;
    let (remote, stale) = network.resolve(&input).await?;
    state
        .with_store(move |store| {
            let origin = if remote.player.is_some() {
                "player"
            } else {
                "texture"
            };
            let id = store.import(
                &remote.png,
                &remote.name,
                origin,
                remote.player,
                Some(remote.model),
            )?;
            let mut library = store.snapshot();
            if stale {
                library.notice = Some(
                    "Minecraft is unavailable. Imported the last saved skin for this player."
                        .into(),
                );
            }
            Ok(ImportResult {
                library,
                selected_id: Some(id),
                errors: Vec::new(),
            })
        })
        .await
}

#[tauri::command]
pub async fn skins_edit(
    state: State<'_, SkinsState>,
    id: String,
    action: String,
    name: Option<String>,
    model: Option<Model>,
) -> Result<Snapshot, String> {
    state
        .with_store(move |store| {
            store.edit(&id, &action, name, model)?;
            Ok(store.snapshot())
        })
        .await
}

#[tauri::command]
pub async fn skins_export(
    app: tauri::AppHandle,
    state: State<'_, SkinsState>,
    id: String,
    model: Model,
) -> Result<Option<String>, String> {
    let (bytes, name) = state
        .with_store(move |store| {
            let skin = store
                .library
                .skins
                .iter()
                .find(|s| s.id == id)
                .ok_or("That skin is no longer available.")?;
            let file = if model == Model::Slim {
                &skin.slim_texture
            } else {
                &skin.texture
            };
            let name = skin
                .name
                .chars()
                .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
                .collect::<String>();
            Ok((
                storage::bounded_read(&store.path(file))?,
                format!(
                    "skin-{}.png",
                    if name.is_empty() { "custom" } else { &name }
                ),
            ))
        })
        .await?;
    let (sender, receiver) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_title("Export skin PNG")
        .set_file_name(name)
        .add_filter("Minecraft skin", &["png"])
        .save_file(move |path| {
            let _ = sender.send(path);
        });
    let Some(path) = receiver
        .await
        .map_err(|_| "The Save dialog closed unexpectedly.")?
    else {
        return Ok(None);
    };
    let path = path
        .into_path()
        .map_err(|_| "Choose a local destination.")?;
    tokio::task::spawn_blocking(move || {
        use std::io::Write;
        let mut file =
            tempfile::NamedTempFile::new_in(path.parent().ok_or("Choose a destination folder.")?)
                .map_err(|e| e.to_string())?;
        file.write_all(&bytes)
            .and_then(|_| file.as_file().sync_all())
            .map_err(|e| e.to_string())?;
        file.persist(&path)
            .map_err(|e| format!("Could not export the skin: {e}"))?;
        Ok(Some(path.to_string_lossy().into_owned()))
    })
    .await
    .map_err(|e| e.to_string())?
}
