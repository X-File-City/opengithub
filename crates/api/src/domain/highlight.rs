use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Row};
use uuid::Uuid;

const MAX_SOURCE_BYTES: usize = 512 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HighlightCodeInput {
    pub source: String,
    pub path: Option<String>,
    pub sha: Option<String>,
    pub repository_id: Option<Uuid>,
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HighlightedFile {
    pub sha: String,
    pub path: String,
    pub language: String,
    pub cached: bool,
    pub lines: Vec<HighlightedLine>,
    pub symbols: Vec<CodeSymbol>,
    pub supported_languages: Vec<LanguageOption>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HighlightedLine {
    pub number: usize,
    pub text: String,
    pub tokens: Vec<HighlightToken>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HighlightToken {
    pub text: String,
    pub class_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CodeSymbol {
    pub name: String,
    pub kind: String,
    pub line: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LanguageOption {
    pub id: String,
    pub label: String,
}

#[derive(Debug, thiserror::Error)]
pub enum HighlightError {
    #[error("source file is too large")]
    TooLarge,
    #[error("source file is empty")]
    EmptySource,
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
}

pub async fn highlight_code(
    pool: Option<&PgPool>,
    input: HighlightCodeInput,
) -> Result<HighlightedFile, HighlightError> {
    if input.source.len() > MAX_SOURCE_BYTES {
        return Err(HighlightError::TooLarge);
    }
    if input.source.trim().is_empty() {
        return Err(HighlightError::EmptySource);
    }

    let path = input.path.unwrap_or_else(|| "snippet.txt".to_owned());
    let sha = input.sha.unwrap_or_else(|| content_sha(&input.source));
    let language = input
        .language
        .as_deref()
        .and_then(normalize_language)
        .or_else(|| detect_language(&path, &input.source))
        .unwrap_or("text")
        .to_owned();

    if let Some(pool) = pool {
        if let Some(mut cached) =
            cached_tokens(pool, input.repository_id, &sha, &path, &language).await?
        {
            cached.cached = true;
            return Ok(cached);
        }
    }

    let lines = highlight_lines(&input.source, &language);
    let symbols = extract_symbols(&input.source, &language);
    let highlighted = HighlightedFile {
        sha: sha.clone(),
        path: path.clone(),
        language: language.clone(),
        cached: false,
        lines,
        symbols,
        supported_languages: supported_languages(),
    };

    if let Some(pool) = pool {
        store_tokens(pool, input.repository_id, &highlighted).await?;
    }

    Ok(highlighted)
}

fn content_sha(source: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(source.as_bytes());
    format!("{:x}", hasher.finalize())
}

async fn cached_tokens(
    pool: &PgPool,
    repository_id: Option<Uuid>,
    sha: &str,
    path: &str,
    language: &str,
) -> Result<Option<HighlightedFile>, HighlightError> {
    let row = sqlx::query(
        r#"
        SELECT token_ranges
        FROM file_tokens
        WHERE COALESCE(repository_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = COALESCE($1, '00000000-0000-0000-0000-000000000000'::uuid)
          AND sha = $2
          AND path = $3
          AND language = $4
        "#,
    )
    .bind(repository_id)
    .bind(sha)
    .bind(path)
    .bind(language)
    .fetch_optional(pool)
    .await?;

    let Some(row) = row else {
        return Ok(None);
    };
    let bytes: Vec<u8> = row.get("token_ranges");
    let mut highlighted: HighlightedFile = serde_json::from_slice(&bytes)?;
    highlighted.cached = true;
    highlighted.supported_languages = supported_languages();
    Ok(Some(highlighted))
}

async fn store_tokens(
    pool: &PgPool,
    repository_id: Option<Uuid>,
    highlighted: &HighlightedFile,
) -> Result<(), HighlightError> {
    let bytes = serde_json::to_vec(highlighted)?;
    sqlx::query(
        r#"
        INSERT INTO file_tokens (repository_id, sha, path, language, token_ranges)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (
            COALESCE(repository_id, '00000000-0000-0000-0000-000000000000'::uuid),
            sha,
            path,
            language
        )
        DO UPDATE SET token_ranges = EXCLUDED.token_ranges, generated_at = now()
        "#,
    )
    .bind(repository_id)
    .bind(&highlighted.sha)
    .bind(&highlighted.path)
    .bind(&highlighted.language)
    .bind(bytes)
    .execute(pool)
    .await?;
    Ok(())
}

fn highlight_lines(source: &str, language: &str) -> Vec<HighlightedLine> {
    source
        .lines()
        .enumerate()
        .map(|(index, line)| HighlightedLine {
            number: index + 1,
            text: line.to_owned(),
            tokens: tokenize_line(line, language),
        })
        .collect()
}

fn tokenize_line(line: &str, language: &str) -> Vec<HighlightToken> {
    if line.trim().is_empty() {
        return vec![HighlightToken {
            text: line.to_owned(),
            class_name: "tok-plain".to_owned(),
        }];
    }

    let comment_markers = comment_markers(language);
    if comment_markers
        .iter()
        .any(|marker| line.trim_start().starts_with(marker))
    {
        return vec![HighlightToken {
            text: line.to_owned(),
            class_name: "tok-comment".to_owned(),
        }];
    }

    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut current_class = String::new();
    let mut chars = line.chars().peekable();
    while let Some(character) = chars.next() {
        let class_name = if character == '"' || character == '\'' || character == '`' {
            let mut literal = String::new();
            literal.push(character);
            for next in chars.by_ref() {
                literal.push(next);
                if next == character {
                    break;
                }
            }
            push_token(&mut tokens, &mut current, &mut current_class, "tok-string");
            tokens.push(HighlightToken {
                text: literal,
                class_name: "tok-string".to_owned(),
            });
            continue;
        } else if character.is_ascii_digit() {
            "tok-number"
        } else if "{}[]().,:;+-*/%=!<>|&".contains(character) {
            "tok-punctuation"
        } else if character.is_ascii_whitespace() {
            "tok-plain"
        } else {
            "tok-identifier"
        };

        if !current.is_empty() && current_class != class_name {
            tokens.push(HighlightToken {
                text: std::mem::take(&mut current),
                class_name: std::mem::take(&mut current_class),
            });
        }
        current.push(character);
        current_class = class_name.to_owned();
    }
    push_token(&mut tokens, &mut current, &mut current_class, "");

    tokens
        .into_iter()
        .map(|mut token| {
            if token.class_name == "tok-identifier" {
                let trimmed = token.text.trim();
                token.class_name = classify_identifier(trimmed, language).to_owned();
            }
            token
        })
        .collect()
}

fn push_token(
    tokens: &mut Vec<HighlightToken>,
    current: &mut String,
    current_class: &mut String,
    next_class: &str,
) {
    if !current.is_empty() {
        tokens.push(HighlightToken {
            text: std::mem::take(current),
            class_name: std::mem::take(current_class),
        });
    }
    *current_class = next_class.to_owned();
}

fn classify_identifier(identifier: &str, language: &str) -> &'static str {
    if identifier.is_empty() {
        return "tok-plain";
    }
    if keywords(language).contains(&identifier) {
        return "tok-keyword";
    }
    if constants().contains(&identifier) {
        return "tok-constant";
    }
    if identifier
        .chars()
        .next()
        .is_some_and(|character| character.is_ascii_uppercase())
    {
        return "tok-type";
    }
    "tok-identifier"
}

fn extract_symbols(source: &str, language: &str) -> Vec<CodeSymbol> {
    source
        .lines()
        .enumerate()
        .filter_map(|(index, line)| {
            let trimmed = line.trim_start();
            let patterns = symbol_patterns(language);
            patterns.iter().find_map(|(prefix, kind)| {
                trimmed.strip_prefix(prefix).and_then(|rest| {
                    let name = rest
                        .trim_start()
                        .split(|character: char| {
                            character == '('
                                || character == '<'
                                || character == ':'
                                || character == '{'
                                || character.is_whitespace()
                        })
                        .next()
                        .filter(|value| !value.is_empty())?;
                    Some(CodeSymbol {
                        name: name.trim_matches('#').to_owned(),
                        kind: (*kind).to_owned(),
                        line: index + 1,
                    })
                })
            })
        })
        .take(80)
        .collect()
}

fn detect_language(path: &str, source: &str) -> Option<&'static str> {
    let lower = path.to_ascii_lowercase();
    let extension = lower.rsplit('.').next().unwrap_or("");
    let by_extension = match extension {
        "rs" => "rust",
        "ts" | "tsx" => "typescript",
        "js" | "jsx" | "mjs" | "cjs" => "javascript",
        "py" => "python",
        "rb" => "ruby",
        "go" => "go",
        "java" => "java",
        "kt" | "kts" => "kotlin",
        "swift" => "swift",
        "c" | "h" => "c",
        "cc" | "cpp" | "cxx" | "hpp" => "cpp",
        "cs" => "csharp",
        "php" => "php",
        "scala" => "scala",
        "sh" | "bash" | "zsh" => "shell",
        "sql" => "sql",
        "html" | "htm" => "html",
        "css" => "css",
        "json" => "json",
        "yml" | "yaml" => "yaml",
        "toml" => "toml",
        "md" | "markdown" => "markdown",
        "dockerfile" => "dockerfile",
        "ex" | "exs" => "elixir",
        "erl" | "hrl" => "erlang",
        "fs" | "fsx" => "fsharp",
        "dart" => "dart",
        "lua" => "lua",
        "r" => "r",
        "jl" => "julia",
        "zig" => "zig",
        "sol" => "solidity",
        "vue" => "vue",
        "svelte" => "svelte",
        _ => "",
    };
    if !by_extension.is_empty() {
        return Some(by_extension);
    }
    if lower.ends_with("dockerfile") {
        return Some("dockerfile");
    }
    if source.starts_with("#!/") {
        return Some("shell");
    }
    None
}

fn normalize_language(value: &str) -> Option<&'static str> {
    let normalized = value.trim().to_ascii_lowercase();
    supported_languages()
        .into_iter()
        .find(|language| {
            language.id == normalized || language.label.to_ascii_lowercase() == normalized
        })
        .map(|language| match language.id.as_str() {
            "rust" => "rust",
            "typescript" => "typescript",
            "javascript" => "javascript",
            "python" => "python",
            "ruby" => "ruby",
            "go" => "go",
            "java" => "java",
            "kotlin" => "kotlin",
            "swift" => "swift",
            "c" => "c",
            "cpp" => "cpp",
            "csharp" => "csharp",
            "php" => "php",
            "scala" => "scala",
            "shell" => "shell",
            "sql" => "sql",
            "html" => "html",
            "css" => "css",
            "json" => "json",
            "yaml" => "yaml",
            "toml" => "toml",
            "markdown" => "markdown",
            "dockerfile" => "dockerfile",
            "elixir" => "elixir",
            "erlang" => "erlang",
            "fsharp" => "fsharp",
            "dart" => "dart",
            "lua" => "lua",
            "r" => "r",
            "julia" => "julia",
            "zig" => "zig",
            "solidity" => "solidity",
            "vue" => "vue",
            "svelte" => "svelte",
            "clojure" => "clojure",
            "haskell" => "haskell",
            "ocaml" => "ocaml",
            "perl" => "perl",
            "powershell" => "powershell",
            "xml" => "xml",
            "graphql" => "graphql",
            "proto" => "proto",
            "makefile" => "makefile",
            "ini" => "ini",
            "diff" => "diff",
            "cmake" => "cmake",
            "nix" => "nix",
            "hcl" => "hcl",
            "terraform" => "terraform",
            "objective-c" => "objective-c",
            "matlab" => "matlab",
            "vbnet" => "vbnet",
            "groovy" => "groovy",
            "fortran" => "fortran",
            "visual-basic" => "visual-basic",
            "text" => "text",
            _ => "text",
        })
}

fn supported_languages() -> Vec<LanguageOption> {
    [
        ("rust", "Rust"),
        ("typescript", "TypeScript"),
        ("javascript", "JavaScript"),
        ("python", "Python"),
        ("ruby", "Ruby"),
        ("go", "Go"),
        ("java", "Java"),
        ("kotlin", "Kotlin"),
        ("swift", "Swift"),
        ("c", "C"),
        ("cpp", "C++"),
        ("csharp", "C#"),
        ("php", "PHP"),
        ("scala", "Scala"),
        ("shell", "Shell"),
        ("sql", "SQL"),
        ("html", "HTML"),
        ("css", "CSS"),
        ("json", "JSON"),
        ("yaml", "YAML"),
        ("toml", "TOML"),
        ("markdown", "Markdown"),
        ("dockerfile", "Dockerfile"),
        ("elixir", "Elixir"),
        ("erlang", "Erlang"),
        ("fsharp", "F#"),
        ("dart", "Dart"),
        ("lua", "Lua"),
        ("r", "R"),
        ("julia", "Julia"),
        ("zig", "Zig"),
        ("solidity", "Solidity"),
        ("vue", "Vue"),
        ("svelte", "Svelte"),
        ("clojure", "Clojure"),
        ("haskell", "Haskell"),
        ("ocaml", "OCaml"),
        ("perl", "Perl"),
        ("powershell", "PowerShell"),
        ("xml", "XML"),
        ("graphql", "GraphQL"),
        ("proto", "Protocol Buffers"),
        ("makefile", "Makefile"),
        ("ini", "INI"),
        ("diff", "Diff"),
        ("cmake", "CMake"),
        ("nix", "Nix"),
        ("hcl", "HCL"),
        ("terraform", "Terraform"),
        ("objective-c", "Objective-C"),
        ("matlab", "MATLAB"),
        ("vbnet", "VB.NET"),
        ("groovy", "Groovy"),
        ("fortran", "Fortran"),
        ("visual-basic", "Visual Basic"),
        ("text", "Plain text"),
    ]
    .into_iter()
    .map(|(id, label)| LanguageOption {
        id: id.to_owned(),
        label: label.to_owned(),
    })
    .collect()
}

fn keywords(language: &str) -> &'static [&'static str] {
    match language {
        "rust" => &[
            "async", "await", "enum", "fn", "impl", "let", "match", "mod", "pub", "struct",
            "trait", "use",
        ],
        "typescript" | "javascript" => &[
            "async",
            "await",
            "class",
            "const",
            "export",
            "function",
            "import",
            "interface",
            "let",
            "return",
            "type",
        ],
        "python" => &[
            "async", "await", "class", "def", "from", "import", "lambda", "return", "self", "with",
        ],
        "go" => &[
            "chan",
            "defer",
            "func",
            "go",
            "import",
            "interface",
            "package",
            "return",
            "select",
            "struct",
            "type",
            "var",
        ],
        "java" | "kotlin" | "csharp" | "cpp" | "c" => &[
            "class",
            "const",
            "enum",
            "interface",
            "private",
            "protected",
            "public",
            "return",
            "static",
            "struct",
            "void",
        ],
        "ruby" => &[
            "class", "def", "do", "end", "module", "private", "require", "return", "self",
        ],
        "sql" => &[
            "ALTER", "CREATE", "DELETE", "FROM", "INSERT", "JOIN", "SELECT", "TABLE", "UPDATE",
            "WHERE",
        ],
        _ => &["class", "def", "fn", "function", "import", "return"],
    }
}

fn constants() -> &'static [&'static str] {
    &[
        "false", "nil", "null", "None", "none", "true", "True", "TRUE", "FALSE",
    ]
}

fn comment_markers(language: &str) -> &'static [&'static str] {
    match language {
        "python" | "ruby" | "shell" | "r" | "yaml" | "toml" => &["#"],
        "sql" => &["--"],
        "html" | "markdown" => &["<!--"],
        _ => &["//", "/*", "*"],
    }
}

fn symbol_patterns(language: &str) -> &'static [(&'static str, &'static str)] {
    match language {
        "rust" => &[
            ("pub fn ", "function"),
            ("fn ", "function"),
            ("struct ", "class"),
            ("enum ", "class"),
            ("trait ", "class"),
        ],
        "typescript" | "javascript" => &[
            ("export function ", "function"),
            ("function ", "function"),
            ("export class ", "class"),
            ("class ", "class"),
            ("const ", "constant"),
        ],
        "python" => &[("def ", "function"), ("class ", "class")],
        "go" => &[("func ", "function"), ("type ", "class")],
        "ruby" => &[
            ("def ", "function"),
            ("class ", "class"),
            ("module ", "module"),
        ],
        _ => &[
            ("function ", "function"),
            ("class ", "class"),
            ("fn ", "function"),
            ("def ", "function"),
        ],
    }
}
