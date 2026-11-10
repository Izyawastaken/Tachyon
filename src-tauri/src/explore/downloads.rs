use super::{ExploreState, models::VersionFile, source::Transport, versions::identifier};
use reqwest::Url;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha512};
use std::{
    collections::HashMap,
    path::Path,
    sync::Mutex,
    time::{Duration, Instant},
};
use tauri::{State, ipc::Channel};
use tauri_plugin_dialog::DialogExt;
use tokio::{
    io::AsyncWriteExt,
    sync::{Semaphore, watch},
};

pub(super) struct Transfers {
    jobs: Mutex<HashMap<String, watch::Sender<bool>>>,
    slots: Semaphore,
}
impl Default for Transfers {
    fn default() -> Self {
        Self {
            jobs: Mutex::new(HashMap::new()),
            slots: Semaphore::new(2),
        }
    }
}
struct Job<'a> {
    transfers: &'a Transfers,
    id: String,
}
impl Drop for Job<'_> {
    fn drop(&mut self) {
        if let Ok(mut jobs) = self.transfers.jobs.lock() {
            jobs.remove(&self.id);
        }
    }
}

#[derive(Deserialize)]
pub struct DownloadInput {
    pub request_id: String,
    pub project_id: String,
    pub version_id: String,
    pub filename: String,
}
#[derive(Clone, Serialize)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub stage: &'static str,
}
#[derive(Serialize)]
pub struct DownloadReceipt {
    pub path: String,
    pub filename: String,
    pub size: u64,
}

pub(super) fn validate_file(file: &VersionFile) -> Result<Url, String> {
    let name = &file.filename;
    if name.is_empty()
        || name.len() > 240
        || name == "."
        || name == ".."
        || name.ends_with(['.', ' '])
        || name
            .chars()
            .any(|c| c.is_control() || "<>:\"/\\|?*".contains(c))
        || file.size == 0
        || file.size > 8 * 1024 * 1024 * 1024
        || file.hashes.sha512.len() != 128
        || !file.hashes.sha512.bytes().all(|c| c.is_ascii_hexdigit())
    {
        return Err("This release has invalid file metadata.".into());
    }
    let stem = name
        .split('.')
        .next()
        .unwrap_or_default()
        .to_ascii_uppercase();
    if [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
        "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ]
    .contains(&stem.as_str())
    {
        return Err("This release uses an unsupported filename.".into());
    }
    let url = Url::parse(&file.url).map_err(|_| "Invalid release file address.")?;
    if url.scheme() != "https"
        || url.host_str() != Some("cdn.modrinth.com")
        || !url.path().starts_with("/data/")
        || !url.path().contains("/versions/")
        || url.port().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err("Release files must come from Modrinth's download CDN.".into());
    }
    Ok(url)
}

pub(super) fn verify_file(file: &VersionFile, size: u64, hash: &[u8]) -> Result<(), String> {
    if size != file.size || hex_hash(hash) != file.hashes.sha512.to_ascii_lowercase() {
        return Err(
            "The download failed its integrity check. Retry to download a fresh copy.".into(),
        );
    }
    Ok(())
}
fn hex_hash(hash: &[u8]) -> String {
    hash.iter().map(|byte| format!("{byte:02x}")).collect()
}

pub(super) async fn transfer(
    transport: &Transport,
    file: &VersionFile,
    destination: &Path,
    mut cancel: watch::Receiver<bool>,
    progress: impl Fn(DownloadProgress),
) -> Result<Option<DownloadReceipt>, String> {
    let url = validate_file(file)?;
    if *cancel.borrow() {
        return Ok(None);
    }
    let (response, _permit) = tokio::select! {
        _ = cancel.changed() => return Ok(None),
        response = transport.download_response(url) => response.map_err(|e| e.to_string())?,
    };
    save_response(response, file, destination, cancel, progress).await
}

pub(super) async fn save_response(
    mut response: reqwest::Response,
    file: &VersionFile,
    destination: &Path,
    mut cancel: watch::Receiver<bool>,
    progress: impl Fn(DownloadProgress),
) -> Result<Option<DownloadReceipt>, String> {
    if *cancel.borrow() {
        return Ok(None);
    }
    if response
        .content_length()
        .is_some_and(|size| size != file.size)
    {
        return Err("The release file size does not match Modrinth's metadata.".into());
    }
    let parent = destination.parent().ok_or("Choose a destination folder.")?;
    let temporary = tempfile::Builder::new()
        .prefix(".tachyon-download-")
        .tempfile_in(parent)
        .map_err(|e| e.to_string())?;
    let mut output = tokio::fs::File::from_std(temporary.reopen().map_err(|e| e.to_string())?);
    let mut hasher = Sha512::new();
    let mut downloaded = 0u64;
    let mut emitted = Instant::now();
    progress(DownloadProgress {
        downloaded,
        total: file.size,
        stage: "downloading",
    });
    loop {
        let chunk = tokio::select! {
            _ = cancel.changed() => return Ok(None),
            chunk = response.chunk() => chunk.map_err(|_| "Download interrupted. Check your connection and retry.")?,
        };
        let Some(chunk) = chunk else {
            break;
        };
        downloaded = downloaded
            .checked_add(chunk.len() as u64)
            .ok_or("Download size overflow.")?;
        if downloaded > file.size {
            return Err("The release file is larger than expected.".into());
        }
        output.write_all(&chunk).await.map_err(|e| e.to_string())?;
        hasher.update(&chunk);
        if emitted.elapsed() >= Duration::from_millis(100) {
            progress(DownloadProgress {
                downloaded,
                total: file.size,
                stage: "downloading",
            });
            emitted = Instant::now();
        }
    }
    progress(DownloadProgress {
        downloaded,
        total: file.size,
        stage: "verifying",
    });
    verify_file(file, downloaded, &hasher.finalize())?;
    output.flush().await.map_err(|e| e.to_string())?;
    output.sync_all().await.map_err(|e| e.to_string())?;
    drop(output);
    if *cancel.borrow() {
        return Ok(None);
    }
    let target = destination.to_owned();
    tauri::async_runtime::spawn_blocking(move || {
        temporary
            .persist(target)
            .map(|_| ())
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())??;
    progress(DownloadProgress {
        downloaded,
        total: file.size,
        stage: "complete",
    });
    Ok(Some(DownloadReceipt {
        path: destination.to_string_lossy().into_owned(),
        filename: file.filename.clone(),
        size: downloaded,
    }))
}

#[tauri::command]
pub async fn explore_download(
    app: tauri::AppHandle,
    state: State<'_, ExploreState>,
    input: DownloadInput,
    on_progress: Channel<DownloadProgress>,
) -> Result<Option<DownloadReceipt>, String> {
    identifier(&input.request_id)?;
    identifier(&input.project_id)?;
    let backend = state.backend().await?;
    let _slot = backend
        .downloads
        .slots
        .try_acquire()
        .map_err(|_| "Two downloads are already active. Wait for one to finish.")?;
    let (cancel, receiver) = watch::channel(false);
    {
        let mut jobs = backend
            .downloads
            .jobs
            .lock()
            .map_err(|_| "Download queue unavailable.")?;
        if jobs.contains_key(&input.request_id) {
            return Err("This download is already active.".into());
        }
        jobs.insert(input.request_id.clone(), cancel);
    }
    let _job = Job {
        transfers: &backend.downloads,
        id: input.request_id,
    };
    let version = backend.version(&input.version_id).await?.data;
    if version.project_id != input.project_id {
        return Err("This release belongs to a different project.".into());
    }
    let file = version
        .files
        .iter()
        .find(|file| file.filename == input.filename)
        .ok_or("This file is no longer listed for the release.")?;
    validate_file(file)?;
    if *receiver.borrow() {
        return Ok(None);
    }
    let (sender, selected) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_title("Save project file")
        .set_file_name(&file.filename)
        .save_file(move |path| {
            let _ = sender.send(path);
        });
    let Some(path) = selected
        .await
        .map_err(|_| "The Save dialog closed unexpectedly.")?
    else {
        return Ok(None);
    };
    let path = path
        .into_path()
        .map_err(|_| "Choose a local destination folder.")?;
    transfer(&backend.transport, file, &path, receiver, |event| {
        let _ = on_progress.send(event);
    })
    .await
}

#[tauri::command]
pub async fn explore_cancel_download(
    state: State<'_, ExploreState>,
    request_id: String,
) -> Result<(), String> {
    let backend = state.backend().await?;
    let jobs = backend
        .downloads
        .jobs
        .lock()
        .map_err(|_| "Download queue unavailable.")?;
    if let Some(sender) = jobs.get(&request_id) {
        let _ = sender.send(true);
    }
    Ok(())
}
