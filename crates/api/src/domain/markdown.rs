use ammonia::Builder;
use pulldown_cmark::{html, Options, Parser};
use regex::{Captures, Regex};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Row};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RenderMarkdownInput {
    pub markdown: String,
    pub repository_id: Option<Uuid>,
    pub owner: Option<String>,
    pub repo: Option<String>,
    #[serde(rename = "ref")]
    pub ref_name: Option<String>,
    pub enable_task_toggles: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RenderedMarkdown {
    pub content_sha: String,
    pub html: String,
    pub cached: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ToggleTaskInput {
    pub markdown: String,
    pub task_index: usize,
    pub checked: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ToggleTaskOutput {
    pub markdown: String,
    pub rendered: RenderedMarkdown,
}

#[derive(Debug, thiserror::Error)]
pub enum MarkdownError {
    #[error("markdown content is too large")]
    TooLarge,
    #[error("task item was not found")]
    TaskNotFound,
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
}

const MAX_MARKDOWN_BYTES: usize = 256 * 1024;

pub async fn render_markdown(
    pool: Option<&PgPool>,
    input: RenderMarkdownInput,
) -> Result<RenderedMarkdown, MarkdownError> {
    if input.markdown.len() > MAX_MARKDOWN_BYTES {
        return Err(MarkdownError::TooLarge);
    }

    let content_sha = content_sha(&input.markdown);
    if let Some(pool) = pool {
        if let Some(html) = cached_html(
            pool,
            &content_sha,
            input.repository_id,
            input.ref_name.as_deref(),
        )
        .await?
        {
            return Ok(RenderedMarkdown {
                content_sha,
                html,
                cached: true,
            });
        }
    }

    let html = render_html(&input);
    if let Some(pool) = pool {
        store_cached_html(
            pool,
            &content_sha,
            input.repository_id,
            input.ref_name.as_deref(),
            &html,
        )
        .await?;
    }

    Ok(RenderedMarkdown {
        content_sha,
        html,
        cached: false,
    })
}

pub async fn toggle_task(
    pool: Option<&PgPool>,
    input: ToggleTaskInput,
) -> Result<ToggleTaskOutput, MarkdownError> {
    let markdown = toggle_task_line(&input.markdown, input.task_index, input.checked)?;
    let rendered = render_markdown(
        pool,
        RenderMarkdownInput {
            markdown: markdown.clone(),
            repository_id: None,
            owner: None,
            repo: None,
            ref_name: None,
            enable_task_toggles: Some(true),
        },
    )
    .await?;

    Ok(ToggleTaskOutput { markdown, rendered })
}

fn content_sha(markdown: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(markdown.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn render_html(input: &RenderMarkdownInput) -> String {
    let markdown = rewrite_references(
        &input.markdown,
        input.owner.as_deref(),
        input.repo.as_deref(),
    );
    let parser = Parser::new_ext(&markdown, Options::all());
    let mut raw_html = String::new();
    html::push_html(&mut raw_html, parser);

    let sanitized = sanitize_html(&raw_html);
    let linked = rewrite_relative_paths(
        &sanitized,
        input.owner.as_deref(),
        input.repo.as_deref(),
        input.ref_name.as_deref().unwrap_or("main"),
    );
    let with_heading_anchors = add_heading_anchors(&linked);
    let decorated = decorate_code_blocks(
        &with_heading_anchors,
        input.enable_task_toggles.unwrap_or(false),
    );
    format!(r#"<div class="markdown-body">{decorated}</div>"#)
}

fn sanitize_html(html: &str) -> String {
    let mut builder = Builder::default();
    builder
        .add_tags([
            "article", "section", "details", "summary", "input", "svg", "path",
        ])
        .add_generic_attributes(["class", "id", "aria-label"])
        .add_tag_attributes("a", ["href", "title", "target"])
        .add_tag_attributes("input", ["type", "checked", "disabled"])
        .add_tag_attributes("code", ["class"])
        .add_tag_attributes("th", ["align"])
        .add_tag_attributes("td", ["align"])
        .add_tag_attributes("svg", ["viewBox", "xmlns", "role"])
        .add_tag_attributes("path", ["d", "fill"])
        .link_rel(Some("noopener noreferrer"));

    builder.clean(html).to_string()
}

fn rewrite_references(markdown: &str, owner: Option<&str>, repo: Option<&str>) -> String {
    let mention = Regex::new(r"(^|[^\w`])@([A-Za-z0-9][A-Za-z0-9-]{0,38})").expect("mention regex");
    let with_mentions = mention.replace_all(markdown, "$1[@$2](/$2)");

    let issue_href = match (owner, repo) {
        (Some(owner), Some(repo)) => format!("/{owner}/{repo}/issues/"),
        _ => "/issues/".to_owned(),
    };
    let issue = Regex::new(r"(^|[^\w`])#([0-9]+)").expect("issue regex");
    issue
        .replace_all(&with_mentions, |captures: &Captures<'_>| {
            format!(
                "{}[#{}]({}{})",
                &captures[1], &captures[2], issue_href, &captures[2]
            )
        })
        .to_string()
}

fn rewrite_relative_paths(
    html: &str,
    owner: Option<&str>,
    repo: Option<&str>,
    ref_name: &str,
) -> String {
    let (Some(owner), Some(repo)) = (owner, repo) else {
        return html.to_owned();
    };

    let attr = Regex::new(r#"(href|src)="([^"]+)""#).expect("attribute regex");
    attr.replace_all(html, |captures: &Captures<'_>| {
        let name = &captures[1];
        let value = &captures[2];
        if value.starts_with("http://")
            || value.starts_with("https://")
            || value.starts_with('/')
            || value.starts_with('#')
            || value.starts_with("mailto:")
        {
            return captures[0].to_owned();
        }

        let base = if name == "src" { "raw" } else { "blob" };
        format!(r#"{name}="/{owner}/{repo}/{base}/{ref_name}/{value}""#)
    })
    .to_string()
}

fn add_heading_anchors(html: &str) -> String {
    let heading = Regex::new(r"<h([1-6])>(.*?)</h[1-6]>").expect("heading regex");
    heading
        .replace_all(html, |captures: &Captures<'_>| {
            let level = &captures[1];
            let text = strip_tags(&captures[2]);
            let id = slugify(&text);
            format!(
                r##"<h{level} id="{id}"><a class="anchor" href="#{id}" aria-label="Permalink: {text}">#</a>{}</h{level}>"##,
                &captures[2]
            )
        })
        .to_string()
}

fn decorate_code_blocks(html: &str, enable_task_toggles: bool) -> String {
    let code = Regex::new(r#"<pre><code class="language-([^"]+)">"#).expect("code regex");
    let decorated = code.replace_all(html, |captures: &Captures<'_>| {
        let language = &captures[1];
        format!(
            r#"<div class="code-block"><div class="code-block-header"><span>{language}</span><button type="button" class="copy-code-button" data-copy-code="true">Copy</button></div><pre><code class="language-{language}">"#
        )
    });
    let closed = decorated.replace("</code></pre>", "</code></pre></div>");

    if enable_task_toggles {
        Regex::new(r#"<input disabled="" type="checkbox"( checked="")?>"#)
            .expect("task input regex")
            .replace_all(&closed, |captures: &Captures<'_>| {
                let checked = captures.get(1).map(|match_| match_.as_str()).unwrap_or("");
                format!(r#"<input type="checkbox" data-task-toggle="true"{checked}>"#)
            })
            .to_string()
    } else {
        closed
    }
}

fn strip_tags(value: &str) -> String {
    Regex::new(r"<[^>]+>")
        .expect("tag regex")
        .replace_all(value, "")
        .to_string()
}

fn slugify(value: &str) -> String {
    let mut slug = String::new();
    let mut previous_dash = false;
    for character in value.chars().flat_map(char::to_lowercase) {
        if character.is_ascii_alphanumeric() {
            slug.push(character);
            previous_dash = false;
        } else if !previous_dash && !slug.is_empty() {
            slug.push('-');
            previous_dash = true;
        }
    }
    slug.trim_end_matches('-').to_owned()
}

fn toggle_task_line(
    markdown: &str,
    task_index: usize,
    checked: bool,
) -> Result<String, MarkdownError> {
    let task = Regex::new(r"^(\s*[-*]\s+\[)( |x|X)(\]\s+.*)$").expect("task regex");
    let mut seen = 0usize;
    let mut changed = false;
    let replacement = if checked { "x" } else { " " };
    let lines = markdown
        .lines()
        .map(|line| {
            if !changed && task.is_match(line) {
                if seen == task_index {
                    changed = true;
                    return task
                        .replace(line, |captures: &Captures<'_>| {
                            format!("{}{}{}", &captures[1], replacement, &captures[3])
                        })
                        .to_string();
                }
                seen += 1;
            }
            line.to_owned()
        })
        .collect::<Vec<_>>();

    if !changed {
        return Err(MarkdownError::TaskNotFound);
    }

    Ok(lines.join("\n"))
}

async fn cached_html(
    pool: &PgPool,
    content_sha: &str,
    repository_id: Option<Uuid>,
    ref_name: Option<&str>,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query(
        r#"
        SELECT html
        FROM rendered_markdown_cache
        WHERE content_sha = $1
          AND COALESCE(repository_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = COALESCE($2, '00000000-0000-0000-0000-000000000000'::uuid)
          AND COALESCE(ref, '') = COALESCE($3, '')
        "#,
    )
    .bind(content_sha)
    .bind(repository_id)
    .bind(ref_name)
    .fetch_optional(pool)
    .await
    .map(|row| row.map(|row| row.get("html")))
}

async fn store_cached_html(
    pool: &PgPool,
    content_sha: &str,
    repository_id: Option<Uuid>,
    ref_name: Option<&str>,
    html: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO rendered_markdown_cache (content_sha, repository_id, ref, html)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (
            content_sha,
            COALESCE(repository_id, '00000000-0000-0000-0000-000000000000'::uuid),
            COALESCE(ref, '')
        )
        DO UPDATE SET html = EXCLUDED.html, rendered_at = now()
        "#,
    )
    .bind(content_sha)
    .bind(repository_id)
    .bind(ref_name)
    .bind(html)
    .execute(pool)
    .await?;

    Ok(())
}
