use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Model {
    #[default]
    Classic,
    Slim,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Skin {
    pub id: String,
    pub name: String,
    pub model: Model,
    pub origin: String,
    pub favorite: bool,
    pub width: u32,
    pub height: u32,
    pub texture: String,
    pub slim_texture: String,
    pub thumbnail: String,
    pub player: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Library {
    pub schema: u32,
    pub active_id: String,
    pub skins: Vec<Skin>,
    pub trash: Vec<Skin>,
}

#[derive(Serialize)]
pub struct Snapshot {
    pub active_id: String,
    pub skins: Vec<Skin>,
    pub can_undo: bool,
    pub notice: Option<String>,
}

#[derive(Serialize)]
pub struct ImportResult {
    pub library: Snapshot,
    pub selected_id: Option<String>,
    pub errors: Vec<String>,
}

pub fn clean_name(name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 48 || name.chars().any(char::is_control) {
        return Err("Use a name between 1 and 48 characters.".into());
    }
    Ok(name.to_owned())
}
