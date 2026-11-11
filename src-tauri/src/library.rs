use neutrino_obscura::Code;
use serde::Deserialize;
use std::time::Duration;

#[derive(Deserialize)]
struct Repository {
    html_url: String,
}

// Resolve metadata only. Never download repository content or follow its links.
#[tauri::command]
pub async fn library_resolve_code(code: String) -> Result<String, String> {
    let code: Code = code.parse().map_err(|error| format!("Invalid share code: {error}"))?;
    let client = reqwest::Client::builder()
        .user_agent(concat!("Tachyon/", env!("CARGO_PKG_VERSION")))
        .timeout(Duration::from_secs(15))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "Repository lookup could not start. Please try again.".to_string())?;
    let response = client
        .get(format!("https://api.github.com/repositories/{}", code.repository_id()))
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|_| "GitHub could not be reached. Check your connection and try again.".to_string())?;
    match response.status().as_u16() {
        200 => {}
        404 => return Err("This repository is private or no longer available.".into()),
        403 | 429 => return Err("GitHub's lookup limit was reached. Try again later.".into()),
        _ => return Err("GitHub could not resolve this code. Please try again.".into()),
    }
    let repository: Repository = response.json().await
        .map_err(|_| "GitHub returned an unreadable repository response.".to_string())?;
    let url = reqwest::Url::parse(&repository.html_url)
        .map_err(|_| "GitHub returned an invalid repository link.".to_string())?;
    if url.scheme() != "https" || url.host_str() != Some("github.com")
        || !url.username().is_empty() || url.password().is_some() || url.port().is_some()
    {
        return Err("GitHub returned an unsupported repository link.".into());
    }
    Ok(repository.html_url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn malformed_codes_are_rejected_before_lookup() {
        for code in ["", "not a code", "1B6F-8TG0"] {
            assert!(library_resolve_code(code.into()).await.unwrap_err().starts_with("Invalid share code:"));
        }
    }

    #[tokio::test]
    #[ignore = "Requires access to the public GitHub API"]
    async fn resolves_public_repository_metadata_only() {
        assert_eq!(library_resolve_code("1B6F-8TGK".into()).await.unwrap(), "https://github.com/Izyawastaken/Tachyon");
    }
}
