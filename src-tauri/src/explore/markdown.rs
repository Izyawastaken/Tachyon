use lol_html::{RewriteStrSettings, element, rewrite_str};

pub(super) fn render_markdown(markdown: &str) -> String {
    let options = pulldown_cmark::Options::ENABLE_TABLES
        | pulldown_cmark::Options::ENABLE_STRIKETHROUGH
        | pulldown_cmark::Options::ENABLE_TASKLISTS;
    let mut html = String::new();
    pulldown_cmark::html::push_html(
        &mut html,
        pulldown_cmark::Parser::new_ext(markdown, options),
    );
    let clean = ammonia::Builder::default()
        .add_tags(&["details", "summary", "input"])
        .add_tag_attributes("input", &["type", "checked", "disabled"])
        .add_tag_attributes("p", &["align"])
        .add_tag_attributes("div", &["align"])
        .attribute_filter(|tag, attribute, value| {
            if tag == "input" && attribute == "type" && value != "checkbox" {
                return Some("checkbox".into());
            }
            Some(value.into())
        })
        .url_schemes(["https"].into_iter().collect())
        .url_relative(ammonia::UrlRelative::Deny)
        .clean(&html)
        .to_string();
    // No remote src reaches the WebView. Images are resolved lazily through
    // Rust/Engram and attached only as local asset URLs by the presentation layer.
    rewrite_str(
        &clean,
        RewriteStrSettings::new()
            .append_element_content_handler(element!("img", |image| {
                if let Some(url) = image.get_attribute("src")
                    && super::media::media_url(&url).is_ok()
                {
                    image.set_attribute("data-image-url", &url)?;
                }
                image.remove_attribute("src");
                image.remove_attribute("srcset");
                Ok(())
            }))
            .append_element_content_handler(element!("input", |input| {
                input.set_attribute("type", "checkbox")?;
                input.set_attribute("disabled", "")?;
                Ok(())
            })),
    )
    .unwrap_or_default()
}
