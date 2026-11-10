use super::{defaults::DEFAULTS, image, models::*};
use std::{
    collections::HashSet,
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
};

pub struct Store {
    root: PathBuf,
    pub library: Library,
    pub notice: Option<String>,
}

fn atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let mut file = tempfile::NamedTempFile::new_in(path.parent().ok_or("Invalid skin folder.")?)
        .map_err(|e| e.to_string())?;
    file.write_all(bytes)
        .and_then(|_| file.as_file().sync_all())
        .map_err(|e| e.to_string())?;
    file.persist(path)
        .map_err(|e| format!("Could not save the skin library: {e}"))?;
    Ok(())
}

pub fn bounded_read(path: &Path) -> Result<Vec<u8>, String> {
    let file = fs::File::open(path).map_err(|_| "Could not open that skin file.")?;
    if !file.metadata().map_err(|e| e.to_string())?.is_file() {
        return Err("Choose a PNG file.".into());
    }
    let mut bytes = Vec::new();
    file.take(image::MAX_BYTES as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > image::MAX_BYTES {
        return Err("Choose a PNG skin smaller than 8 MB.".into());
    }
    Ok(bytes)
}

fn valid_asset(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 100
        && name.ends_with(".png")
        && name
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'.')
        && !name.contains("..")
}

fn read_library(path: &Path) -> Result<Library, String> {
    let bytes = bounded_read(path)?;
    let value: Library =
        serde_json::from_slice(&bytes).map_err(|_| "The saved skin library is damaged.")?;
    let mut ids = HashSet::new();
    if value.schema != 1
        || value.skins.len() > 209
        || value.trash.len() > 20
        || !value.skins.iter().any(|s| s.id == value.active_id)
        || value.skins.iter().chain(&value.trash).any(|s| {
            !ids.insert(&s.id)
                || clean_name(&s.name).is_err()
                || !valid_asset(&s.texture)
                || !valid_asset(&s.slim_texture)
                || !valid_asset(&s.thumbnail)
        })
    {
        return Err("The saved skin library is invalid. Your files have been preserved.".into());
    }
    Ok(value)
}

impl Store {
    pub fn open(root: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(root.join("assets")).map_err(|e| e.to_string())?;
        let manifest = root.join("library.json");
        let backup = root.join("library.json.bak");
        let (library, notice) = if manifest.exists() || backup.exists() {
            match read_library(&manifest) {
                Ok(value) => (value, None),
                Err(_) => (read_library(&backup).map_err(|_| "The skin library could not be recovered. Its files have been preserved; restore library.json from a backup.")?, Some("Recovered your skin library from its last saved backup.".into())),
            }
        } else {
            (
                Library {
                    schema: 1,
                    active_id: "builtin-steve".into(),
                    skins: Vec::new(),
                    trash: Vec::new(),
                },
                None,
            )
        };
        let mut store = Self {
            root,
            library,
            notice,
        };
        let mut library = store.library.clone();
        for &(name, wide, slim) in DEFAULTS {
            let a = image::normalize(wide)?;
            let b = image::normalize(slim)?;
            let texture = format!("{name}-classic.png");
            let slim_texture = format!("{name}-slim.png");
            let thumbnail = format!("{name}-head.png");
            // Bundled defaults repair themselves independently of custom imports.
            for (file, data) in [
                (&texture, &a.png),
                (&slim_texture, &b.png),
                (&thumbnail, &a.head),
            ] {
                let path = store.root.join("assets").join(file);
                if fs::read(&path).ok().as_deref() != Some(data.as_slice()) {
                    atomic(&path, data)?;
                }
            }
            if !library
                .skins
                .iter()
                .any(|s| s.id == format!("builtin-{name}"))
            {
                library.skins.push(Skin {
                    id: format!("builtin-{name}"),
                    name: format!("{}{}", name[..1].to_uppercase(), &name[1..]),
                    model: if name == "alex" {
                        Model::Slim
                    } else {
                        Model::Classic
                    },
                    origin: "builtin".into(),
                    favorite: false,
                    width: 64,
                    height: 64,
                    texture,
                    slim_texture,
                    thumbnail,
                    player: None,
                });
            }
        }
        store.commit(library)?;
        Ok(store)
    }

    pub fn snapshot(&self) -> Snapshot {
        let skins = self
            .library
            .skins
            .iter()
            .cloned()
            .map(|mut s| {
                s.texture = self.path(&s.texture).to_string_lossy().into_owned();
                s.slim_texture = self.path(&s.slim_texture).to_string_lossy().into_owned();
                s.thumbnail = self.path(&s.thumbnail).to_string_lossy().into_owned();
                s
            })
            .collect();
        Snapshot {
            active_id: self.library.active_id.clone(),
            skins,
            can_undo: !self.library.trash.is_empty(),
            notice: self.notice.clone(),
        }
    }
    pub fn path(&self, name: &str) -> PathBuf {
        self.root.join("assets").join(name)
    }
    pub fn commit(&mut self, library: Library) -> Result<(), String> {
        let bytes = serde_json::to_vec(&library).map_err(|e| e.to_string())?;
        // Only back up known-good in-memory data, never a corrupt manifest recovered above.
        if !self.library.skins.is_empty() {
            atomic(
                &self.root.join("library.json.bak"),
                &serde_json::to_vec(&self.library).map_err(|e| e.to_string())?,
            )?;
        }
        atomic(&self.root.join("library.json"), &bytes)?;
        self.library = library;
        Ok(())
    }
    pub fn import(
        &mut self,
        bytes: &[u8],
        name: &str,
        origin: &str,
        player: Option<String>,
        model: Option<Model>,
    ) -> Result<String, String> {
        let name = clean_name(name)?;
        let texture = image::normalize(bytes)?;
        let id = format!("skin-{}", texture.hash);
        if self.library.skins.iter().any(|s| s.id == id) {
            // A repeated import also repairs missing/corrupt owned files, while
            // preserving the user's name, favorites, and chosen model.
            for (file, bytes) in [
                (format!("{}.png", texture.hash), &texture.png),
                (format!("{}-head.png", texture.hash), &texture.head),
            ] {
                let path = self.path(&file);
                if fs::read(&path).ok().as_deref() != Some(bytes.as_slice()) {
                    atomic(&path, bytes)?;
                }
            }
            return Ok(id);
        }
        if self
            .library
            .skins
            .iter()
            .filter(|s| s.origin != "builtin")
            .count()
            >= 200
        {
            return Err(
                "Your library has 200 custom skins. Remove one before importing another.".into(),
            );
        }
        let used: u64 = fs::read_dir(self.root.join("assets"))
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .filter_map(|e| e.metadata().ok())
            .map(|m| m.len())
            .sum();
        if used + texture.png.len() as u64 > 256 * 1024 * 1024 {
            return Err(
                "The skin library has reached its 256 MB limit. Remove unused skins first.".into(),
            );
        }
        let file = format!("{}.png", texture.hash);
        let head = format!("{}-head.png", texture.hash);
        atomic(&self.path(&file), &texture.png)?;
        atomic(&self.path(&head), &texture.head)?;
        let mut next = self.library.clone();
        next.trash.retain(|s| s.id != id);
        next.skins.push(Skin {
            id: id.clone(),
            name,
            model: model.unwrap_or(if texture.slim {
                Model::Slim
            } else {
                Model::Classic
            }),
            origin: origin.into(),
            favorite: false,
            width: texture.width,
            height: texture.height,
            texture: file.clone(),
            slim_texture: file,
            thumbnail: head,
            player,
        });
        self.commit(next)?;
        self.collect();
        Ok(id)
    }
    pub fn edit(
        &mut self,
        id: &str,
        action: &str,
        name: Option<String>,
        model: Option<Model>,
    ) -> Result<(), String> {
        let mut next = self.library.clone();
        if action == "undo" {
            if next.skins.iter().filter(|s| s.origin != "builtin").count() >= 200 {
                return Err("Remove a custom skin before restoring another.".into());
            }
            let skin = next.trash.pop().ok_or("There is no skin to restore.")?;
            next.skins.push(skin);
        } else {
            let skin = next
                .skins
                .iter_mut()
                .find(|s| s.id == id)
                .ok_or("That skin is no longer in your library.")?;
            match action {
                "select" => {
                    let file = if model.unwrap_or(skin.model) == Model::Slim {
                        &skin.slim_texture
                    } else {
                        &skin.texture
                    };
                    if !self.path(file).is_file() {
                        return Err(
                            "This skin texture is missing. Import the PNG again to repair it."
                                .into(),
                        );
                    }
                    skin.model = model.unwrap_or(skin.model);
                    next.active_id = id.into();
                }
                "favorite" => skin.favorite = !skin.favorite,
                "rename" => skin.name = clean_name(&name.unwrap_or_default())?,
                "remove" if skin.origin != "builtin" => {
                    let index = next
                        .skins
                        .iter()
                        .position(|s| s.id == id)
                        .ok_or("Skin not found.")?;
                    next.trash.push(next.skins.remove(index));
                    if next.trash.len() > 20 {
                        next.trash.remove(0);
                    }
                    if next.active_id == id {
                        next.active_id = "builtin-steve".into();
                    }
                }
                _ => return Err("That skin action is unavailable.".into()),
            }
        }
        self.commit(next)?;
        self.collect();
        Ok(())
    }
    fn collect(&self) {
        // Keep the backup's references too, so recovery never points at collected files.
        let backup = read_library(&self.root.join("library.json.bak")).ok();
        let mut keep = HashSet::new();
        for skin in self
            .library
            .skins
            .iter()
            .chain(&self.library.trash)
            .chain(backup.iter().flat_map(|l| l.skins.iter().chain(&l.trash)))
        {
            keep.extend([
                skin.texture.as_str(),
                skin.slim_texture.as_str(),
                skin.thumbnail.as_str(),
            ]);
        }
        if let Ok(files) = fs::read_dir(self.root.join("assets")) {
            for file in files.flatten() {
                if let Some(name) = file.file_name().to_str()
                    && valid_asset(name)
                    && !keep.contains(name)
                {
                    let _ = fs::remove_file(file.path());
                }
            }
        }
    }
}
