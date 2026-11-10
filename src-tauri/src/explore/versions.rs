use super::{API, Backend, ExploreState, models::*};
use reqwest::Url;
use tauri::State;

pub(super) const VERSION_PAGE_SIZE: usize = 20;

pub(super) fn identifier(id: &str) -> Result<(), String> {
    if id.is_empty()
        || id.len() > 64
        || !id
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || b"-_".contains(&c))
    {
        return Err("Invalid project or release identifier.".into());
    }
    Ok(())
}

impl VersionInput {
    pub(super) fn validate(&self) -> Result<(), String> {
        identifier(&self.project_id)?;
        if self.offset > 100_000
            || !["", "release", "beta", "alpha"].contains(&self.channel.as_str())
            || [&self.game_version, &self.loader].iter().any(|value| {
                value.len() > 80
                    || !value
                        .bytes()
                        .all(|c| c.is_ascii_alphanumeric() || b"-._".contains(&c))
            })
        {
            return Err("Choose supported release filters.".into());
        }
        Ok(())
    }
}

pub(super) fn page(mut versions: Vec<ProjectVersion>, input: &VersionInput) -> VersionPage {
    versions.retain(|version| {
        (input.channel.is_empty() || version.version_type == input.channel)
            && (input.game_version.is_empty()
                || version.game_versions.contains(&input.game_version))
            && (input.loader.is_empty() || version.loaders.contains(&input.loader))
    });
    versions.sort_unstable_by(|a, b| {
        b.date_published
            .cmp(&a.date_published)
            .then_with(|| a.id.cmp(&b.id))
    });
    let total = versions.len();
    VersionPage {
        versions: versions
            .into_iter()
            .skip(input.offset)
            .take(VERSION_PAGE_SIZE)
            .collect(),
        total,
        offset: input.offset,
        limit: VERSION_PAGE_SIZE,
    }
}

impl Backend {
    pub(super) async fn versions(
        &self,
        input: VersionInput,
    ) -> Result<CatalogResult<VersionPage>, String> {
        input.validate()?;
        let mut url = Url::parse(&format!("{API}project/{}/version", input.project_id))
            .map_err(|e| e.to_string())?;
        url.query_pairs_mut()
            .append_pair("include_changelog", "false");
        if !input.game_version.is_empty() {
            url.query_pairs_mut().append_pair(
                "game_versions",
                &serde_json::to_string(&[&input.game_version]).map_err(|e| e.to_string())?,
            );
        }
        if !input.loader.is_empty() {
            url.query_pairs_mut().append_pair(
                "loaders",
                &serde_json::to_string(&[&input.loader]).map_err(|e| e.to_string())?,
            );
        }
        // Page/channel changes reuse this compressed Engram entry. Never transfer
        // every historical changelog to the WebView just to draw a release list.
        let result: CatalogResult<Vec<ProjectVersion>> = self
            .json(url, "modrinth-version-list@1", 300, 86400)
            .await?;
        Ok(CatalogResult {
            stale: result.stale,
            data: page(result.data, &input),
        })
    }

    pub(super) async fn version(&self, id: &str) -> Result<CatalogResult<ProjectVersion>, String> {
        identifier(id)?;
        self.json(
            Url::parse(&format!("{API}version/{id}")).map_err(|e| e.to_string())?,
            "modrinth-version@1",
            300,
            7 * 86400,
        )
        .await
    }
}

#[tauri::command]
pub async fn explore_versions(
    state: State<'_, ExploreState>,
    input: VersionInput,
) -> Result<CatalogResult<VersionPage>, String> {
    state.backend().await?.versions(input).await
}

#[tauri::command]
pub async fn explore_version(
    state: State<'_, ExploreState>,
    id: String,
) -> Result<CatalogResult<VersionDetail>, String> {
    let backend = state.backend().await?;
    let result = backend.version(&id).await?;
    let body = result.data.changelog.clone().unwrap_or_default();
    let changelog_html = backend.render_body(body).await?;
    let ids: std::collections::BTreeSet<_> = result
        .data
        .dependencies
        .iter()
        .filter_map(|dependency| dependency.project_id.as_ref())
        .filter(|id| identifier(id).is_ok())
        .take(100)
        .collect();
    let projects = if ids.is_empty() {
        Vec::new()
    } else {
        let mut url = Url::parse(&format!("{API}projects")).map_err(|e| e.to_string())?;
        url.query_pairs_mut().append_pair(
            "ids",
            &serde_json::to_string(&ids).map_err(|e| e.to_string())?,
        );
        backend
            .json::<Vec<DependencyProject>>(url, "modrinth-dependency-projects@1", 900, 7 * 86400)
            .await
            .map(|result| result.data)
            .unwrap_or_default()
    };
    let dependencies = result
        .data
        .dependencies
        .iter()
        .map(|dependency| {
            let project = projects
                .iter()
                .find(|project| Some(&project.id) == dependency.project_id.as_ref());
            ResolvedDependency {
                name: project
                    .map(|project| project.title.clone())
                    .or_else(|| dependency.file_name.clone())
                    .or_else(|| dependency.project_id.clone())
                    .or_else(|| dependency.version_id.clone())
                    .unwrap_or_else(|| "External dependency".into()),
                dependency_type: dependency.dependency_type.clone(),
                url: project.map(|project| {
                    format!(
                        "https://modrinth.com/{}/{}",
                        project.project_type, project.slug
                    )
                }),
            }
        })
        .collect();
    Ok(CatalogResult {
        stale: result.stale,
        data: VersionDetail {
            version: result.data,
            changelog_html,
            dependencies,
        },
    })
}
