use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, Default)]
#[serde(default)]
pub struct SearchInput {
    pub query: String,
    pub kind: String,
    pub versions: Vec<String>,
    pub loaders: Vec<String>,
    pub categories: Vec<String>,
    pub environment: String,
    pub sort: String,
    pub offset: u32,
}

impl SearchInput {
    pub fn canonicalize(mut self) -> Result<Self, String> {
        self.query = self.query.trim().to_owned();
        if self.query.len() > 160 || self.offset > 10_000 {
            return Err("Search is too long or exceeds the catalog page limit.".into());
        }
        if !["mod", "modpack", "shader", "resourcepack", "datapack"].contains(&self.kind.as_str()) {
            return Err("Choose a supported content type.".into());
        }
        if self.sort.is_empty() {
            self.sort = "relevance".into();
        }
        if !["relevance", "downloads", "follows", "newest", "updated"].contains(&self.sort.as_str())
        {
            return Err("Choose a supported sort order.".into());
        }
        if !["", "client", "server"].contains(&self.environment.as_str()) {
            return Err("Choose a supported environment.".into());
        }
        for group in [&mut self.versions, &mut self.loaders, &mut self.categories] {
            if group.len() > 16
                || group.iter().any(|s| {
                    s.is_empty()
                        || s.len() > 80
                        || s.chars()
                            .any(|c| !c.is_ascii_alphanumeric() && !"-._".contains(c))
                })
            {
                return Err("A filter contains an unsupported value.".into());
            }
            group.sort_unstable();
            group.dedup();
        }
        Ok(self)
    }

    pub fn facets(&self) -> Vec<Vec<String>> {
        // all_project_types includes data packs; project_type historically does not.
        let mut facets = vec![vec![format!("all_project_types:{}", self.kind)]];
        for (prefix, values) in [
            ("versions", &self.versions),
            ("categories", &self.loaders),
            ("categories", &self.categories),
        ] {
            if !values.is_empty() {
                facets.push(values.iter().map(|v| format!("{prefix}:{v}")).collect());
            }
        }
        if !self.environment.is_empty() {
            facets.push(vec![
                format!("{}_side:required", self.environment),
                format!("{}_side:optional", self.environment),
            ]);
        }
        facets
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct SearchPage {
    pub hits: Vec<ProjectHit>,
    pub offset: u32,
    pub limit: u32,
    pub total_hits: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ProjectHit {
    pub project_id: String,
    pub slug: Option<String>,
    pub title: String,
    pub description: String,
    pub author: String,
    pub project_type: String,
    pub downloads: u64,
    pub follows: u64,
    pub icon_url: Option<String>,
    #[serde(default)]
    pub categories: Vec<String>,
    #[serde(default)]
    pub display_categories: Vec<String>,
    #[serde(default)]
    pub versions: Vec<String>,
    pub date_modified: String,
    pub featured_gallery: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Project {
    pub id: String,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub body: String,
    pub project_type: String,
    pub icon_url: Option<String>,
    pub downloads: u64,
    pub followers: u64,
    #[serde(default)]
    pub categories: Vec<String>,
    #[serde(default)]
    pub game_versions: Vec<String>,
    #[serde(default)]
    pub loaders: Vec<String>,
    pub license: License,
    pub source_url: Option<String>,
    pub issues_url: Option<String>,
    pub wiki_url: Option<String>,
    #[serde(default)]
    pub gallery: Vec<GalleryImage>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct License {
    pub id: String,
    pub name: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct GalleryImage {
    pub url: String,
    pub featured: bool,
    pub title: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct VersionTag {
    pub version: String,
    pub version_type: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct CategoryTag {
    pub name: String,
    pub project_type: String,
    pub header: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct LoaderTag {
    pub name: String,
    pub supported_project_types: Vec<String>,
}

#[derive(Serialize)]
pub struct Filters {
    pub versions: Vec<VersionTag>,
    pub loaders: Vec<LoaderTag>,
    pub categories: Vec<CategoryTag>,
}

#[derive(Serialize)]
pub struct CatalogResult<T> {
    pub data: T,
    pub stale: bool,
}

#[derive(Serialize)]
pub struct ProjectDetail {
    pub project: Project,
    pub body_html: String,
}
