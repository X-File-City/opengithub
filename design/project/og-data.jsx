// og-data.jsx — fixture data for the prototype

const OG_USER = { handle: 'ashley.k', name: 'Ashley K.', avatar: 'AK', email: 'ashley@opengithub.dev' };

const OG_REPOS = [
  { owner: 'ashley', name: 'opengithub', desc: 'A calmer place for code to live.', stars: 4218, lang: 'Rust', langColor: 'oklch(0.62 0.16 32)', updated: '2 hours ago', private: false },
  { owner: 'namuh-eng', name: 'flux-router', desc: 'Predictable, type-safe routing for distributed systems.', stars: 1249, lang: 'TypeScript', langColor: 'oklch(0.55 0.10 250)', updated: 'yesterday', private: false },
  { owner: 'ashley', name: 'lux', desc: 'Tiny color-grading library for the terminal.', stars: 312, lang: 'Go', langColor: 'oklch(0.65 0.12 200)', updated: '3 days ago', private: true },
  { owner: 'cartograph', name: 'paper-press', desc: 'Markdown to print, one ream at a time.', stars: 88, lang: 'TypeScript', langColor: 'oklch(0.55 0.10 250)', updated: 'last week', private: false },
];

const OG_FILE_TREE = [
  { type: 'dir', name: 'crates', children: [
    { type: 'dir', name: 'opengithub-core', children: [
      { type: 'file', name: 'Cargo.toml', size: '1.2 KB' },
      { type: 'dir', name: 'src', children: [
        { type: 'file', name: 'lib.rs', size: '3.4 KB' },
        { type: 'file', name: 'router.rs', size: '12.8 KB' },
        { type: 'file', name: 'context.rs', size: '4.1 KB' },
      ]},
    ]},
    { type: 'dir', name: 'opengithub-web', children: [
      { type: 'file', name: 'Cargo.toml', size: '0.9 KB' },
      { type: 'dir', name: 'src', children: [
        { type: 'file', name: 'main.rs', size: '2.1 KB', highlight: true },
        { type: 'file', name: 'routes.rs', size: '8.7 KB' },
      ]},
    ]},
  ]},
  { type: 'dir', name: 'web', children: [
    { type: 'file', name: 'package.json', size: '1.4 KB' },
    { type: 'file', name: 'tsconfig.json', size: '0.6 KB' },
  ]},
  { type: 'dir', name: 'docs', children: [
    { type: 'file', name: 'architecture.md', size: '4.8 KB' },
    { type: 'file', name: 'contributing.md', size: '2.1 KB' },
  ]},
  { type: 'dir', name: '.github', children: [
    { type: 'dir', name: 'workflows', children: [
      { type: 'file', name: 'ci.yml', size: '1.8 KB' },
      { type: 'file', name: 'release.yml', size: '2.4 KB' },
    ]},
  ]},
  { type: 'file', name: '.gitignore', size: '184 B' },
  { type: 'file', name: 'Cargo.toml', size: '672 B' },
  { type: 'file', name: 'Cargo.lock', size: '241 KB' },
  { type: 'file', name: 'LICENSE', size: '1.1 KB' },
  { type: 'file', name: 'README.md', size: '6.4 KB' },
];

const OG_README_LINES = [
  { tag: 'h1', text: 'opengithub' },
  { tag: 'lede', text: 'A calmer place for code to live. Self-hosted, fast, and considered.' },
  { tag: 'p', text: 'opengithub is an open-source forge built around the unfashionable idea that reading code should feel as good as writing it.' },
  { tag: 'h2', text: 'Why' },
  { tag: 'p', text: 'Most code hosts grew sideways. Inboxes that don\'t triage. Reviews that demand context they refuse to surface. Settings buried under settings.' },
  { tag: 'p', text: 'opengithub starts from the file and works outward — the unit of a codebase is a thought, and a thought deserves a frame.' },
  { tag: 'h2', text: 'Install' },
  { tag: 'code', text: 'cargo install opengithub' },
  { tag: 'h2', text: 'Status' },
  { tag: 'p', text: 'v0.6 — public preview. The API is mostly steady; the UI is not.' },
];

const OG_FILE_CONTENT = [
  { n: 1, t: 'use opengithub_core::{router::Router, context::Context};', author: 'ashley', age: '3 mo' },
  { n: 2, t: 'use std::sync::Arc;', author: 'ashley', age: '3 mo' },
  { n: 3, t: '', author: '', age: '' },
  { n: 4, t: '#[tokio::main]', author: 'ashley', age: '3 mo' },
  { n: 5, t: 'async fn main() -> anyhow::Result<()> {', author: 'ashley', age: '3 mo' },
  { n: 6, t: '    let cx = Arc::new(Context::from_env()?);', author: 'jaeyun', age: '6 d' },
  { n: 7, t: '    tracing_subscriber::fmt::init();', author: 'jaeyun', age: '6 d' },
  { n: 8, t: '', author: '', age: '' },
  { n: 9, t: '    let router = Router::new()', author: 'ashley', age: '3 mo' },
  { n: 10, t: '        .route("/", routes::landing)', author: 'ashley', age: '3 mo' },
  { n: 11, t: '        .route("/login", routes::login)', author: 'ashley', age: '3 mo' },
  { n: 12, t: '        .route("/:owner/:repo", routes::repo)', author: 'ashley', age: '3 mo' },
  { n: 13, t: '        .route("/:owner/:repo/blob/*path", routes::blob)', author: 'mira', age: '12 d' },
  { n: 14, t: '        .route("/:owner/:repo/pulls/:n", routes::pull)', author: 'mira', age: '12 d' },
  { n: 15, t: '        .layer(opengithub_core::middleware::auth(cx.clone()))', author: 'ashley', age: '3 mo' },
  { n: 16, t: '        .with_state(cx.clone());', author: 'ashley', age: '3 mo' },
  { n: 17, t: '', author: '', age: '' },
  { n: 18, t: '    let addr = cx.bind_addr();', author: 'kit', age: '2 d' },
  { n: 19, t: '    tracing::info!(%addr, "starting opengithub");', author: 'kit', age: '2 d' },
  { n: 20, t: '    axum::Server::bind(&addr)', author: 'ashley', age: '3 mo' },
  { n: 21, t: '        .serve(router.into_make_service())', author: 'ashley', age: '3 mo' },
  { n: 22, t: '        .await?;', author: 'ashley', age: '3 mo' },
  { n: 23, t: '', author: '', age: '' },
  { n: 24, t: '    Ok(())', author: 'ashley', age: '3 mo' },
  { n: 25, t: '}', author: 'ashley', age: '3 mo' },
];

const OG_PRS = [
  { n: 421, title: 'Split route modules into per-resource files', state: 'open', draft: false, author: 'mira', branch: 'mira/split-routes', base: 'main', updated: '12 min ago', commits: 8, additions: 412, deletions: 89, comments: 4, checks: 'pass', reviewers: ['ashley', 'jaeyun'], approved: 1, requested: 1, mergeable: true, labels: ['refactor', 'good first review'] },
  { n: 420, title: 'Stream Actions logs to the client over SSE', state: 'open', draft: false, author: 'jaeyun', branch: 'jaeyun/sse-logs', base: 'main', updated: '2 hr ago', commits: 14, additions: 689, deletions: 124, comments: 11, checks: 'running', reviewers: ['ashley', 'mira'], approved: 0, requested: 2, mergeable: false, labels: ['feat', 'actions'] },
  { n: 419, title: 'Allow protected branches to require linear history', state: 'open', draft: true, author: 'kit', branch: 'kit/linear-history', base: 'main', updated: 'yesterday', commits: 3, additions: 84, deletions: 12, comments: 0, checks: 'pending', reviewers: [], approved: 0, requested: 0, mergeable: true, labels: ['settings'] },
  { n: 418, title: 'Bump axum to 0.7.5; thread state through extractors', state: 'open', draft: false, author: 'ashley', branch: 'ashley/axum-0.7', base: 'main', updated: '2 days ago', commits: 5, additions: 142, deletions: 138, comments: 2, checks: 'fail', reviewers: ['mira'], approved: 0, requested: 1, mergeable: false, labels: ['deps'] },
  { n: 417, title: 'Docs: write the contributing guide', state: 'merged', draft: false, author: 'kit', branch: 'kit/contributing', base: 'main', updated: '3 days ago', commits: 2, additions: 84, deletions: 0, comments: 1, checks: 'pass', reviewers: ['ashley'], approved: 1, requested: 0, mergeable: true, labels: ['docs'] },
  { n: 416, title: 'Use crossterm for color in the CLI', state: 'closed', draft: false, author: 'jaeyun', branch: 'jaeyun/crossterm', base: 'main', updated: '5 days ago', commits: 4, additions: 56, deletions: 91, comments: 3, checks: 'pass', reviewers: ['ashley'], approved: 0, requested: 0, mergeable: true, labels: ['cli'] },
];

const OG_ISSUES = [
  { n: 312, title: 'Repo home should preview the first heading of the README', state: 'open', author: 'mira', updated: '32 min ago', comments: 4, labels: ['ux', 'good first issue'], assignee: 'kit', milestone: 'v0.7' },
  { n: 311, title: 'File tree expand state isn\'t preserved on back navigation', state: 'open', author: 'jaeyun', updated: '4 hr ago', comments: 7, labels: ['bug'], assignee: 'mira', milestone: 'v0.7' },
  { n: 310, title: 'Add ⌘K command palette across all primary surfaces', state: 'open', author: 'ashley', updated: 'yesterday', comments: 12, labels: ['feat', 'p1'], assignee: 'ashley', milestone: 'v0.7' },
  { n: 309, title: 'Notifications: support per-repo digest mode', state: 'open', author: 'kit', updated: 'yesterday', comments: 2, labels: ['feat'], assignee: null, milestone: 'v0.8' },
  { n: 308, title: 'Diff line comments lose anchor when the file is rebased', state: 'open', author: 'mira', updated: '2 days ago', comments: 6, labels: ['bug', 'p1'], assignee: 'jaeyun', milestone: 'v0.7' },
  { n: 307, title: 'Land Pages preview pipeline', state: 'closed', author: 'ashley', updated: '4 days ago', comments: 3, labels: ['feat', 'pages'], assignee: 'ashley', milestone: 'v0.6' },
  { n: 306, title: 'Document the auth middleware', state: 'closed', author: 'kit', updated: '5 days ago', comments: 1, labels: ['docs'], assignee: 'kit', milestone: 'v0.6' },
];

const OG_NOTIFS = [
  { id: 'n1', repo: 'ashley/opengithub', kind: 'review-request', title: 'Split route modules into per-resource files', n: 421, who: 'mira', when: '12 min ago', unread: true, urgent: true },
  { id: 'n2', repo: 'ashley/opengithub', kind: 'mention', title: 'Stream Actions logs to the client over SSE', n: 420, who: 'jaeyun', when: '2 hr ago', unread: true },
  { id: 'n3', repo: 'ashley/opengithub', kind: 'comment', title: 'File tree expand state isn\'t preserved on back navigation', n: 311, who: 'jaeyun', when: '4 hr ago', unread: true },
  { id: 'n4', repo: 'ashley/opengithub', kind: 'check-fail', title: 'Bump axum to 0.7.5', n: 418, who: 'ci-bot', when: 'yesterday', unread: false },
  { id: 'n5', repo: 'namuh-eng/flux-router', kind: 'review-request', title: 'Cancel pending requests on route change', n: 88, who: 'tau', when: 'yesterday', unread: true },
  { id: 'n6', repo: 'namuh-eng/flux-router', kind: 'mention', title: 'Docs: state machine diagram is out of date', n: 84, who: 'tau', when: '2 days ago', unread: false },
  { id: 'n7', repo: 'cartograph/paper-press', kind: 'comment', title: 'Render footnotes inline at print width', n: 12, who: 'cartograph', when: '3 days ago', unread: false },
];

// PR diff hunks for #421
const OG_DIFF = [
  {
    file: 'crates/opengithub-web/src/main.rs',
    additions: 4, deletions: 18, status: 'modified',
    hunks: [
      {
        header: '@@ -8,22 +8,8 @@ async fn main()',
        lines: [
          { type: 'ctx', old: 8, new: 8, t: '    let cx = Arc::new(Context::from_env()?);' },
          { type: 'ctx', old: 9, new: 9, t: '    tracing_subscriber::fmt::init();' },
          { type: 'ctx', old: 10, new: 10, t: '' },
          { type: 'del', old: 11, new: null, t: '    let router = Router::new()' },
          { type: 'del', old: 12, new: null, t: '        .route("/", routes::landing)' },
          { type: 'del', old: 13, new: null, t: '        .route("/login", routes::login)' },
          { type: 'del', old: 14, new: null, t: '        .route("/:owner/:repo", routes::repo)' },
          { type: 'del', old: 15, new: null, t: '        .route("/:owner/:repo/blob/*path", routes::blob)' },
          { type: 'del', old: 16, new: null, t: '        .route("/:owner/:repo/pulls/:n", routes::pull)' },
          { type: 'add', old: null, new: 11, t: '    let router = routes::all()' },
          { type: 'ctx', old: 17, new: 12, t: '        .layer(opengithub_core::middleware::auth(cx.clone()))' },
          { type: 'ctx', old: 18, new: 13, t: '        .with_state(cx.clone());' },
        ]
      }
    ]
  },
  {
    file: 'crates/opengithub-web/src/routes.rs',
    additions: 12, deletions: 0, status: 'modified',
    hunks: [
      {
        header: '@@ -0,0 +1,12 @@ pub mod routes',
        lines: [
          { type: 'add', old: null, new: 1, t: 'use axum::Router;' },
          { type: 'add', old: null, new: 2, t: '' },
          { type: 'add', old: null, new: 3, t: 'pub mod landing;' },
          { type: 'add', old: null, new: 4, t: 'pub mod login;' },
          { type: 'add', old: null, new: 5, t: 'pub mod repo;' },
          { type: 'add', old: null, new: 6, t: 'pub mod blob;' },
          { type: 'add', old: null, new: 7, t: 'pub mod pull;' },
          { type: 'add', old: null, new: 8, t: '' },
          { type: 'add', old: null, new: 9, t: 'pub fn all() -> Router<crate::AppState> {' },
          { type: 'add', old: null, new: 10, t: '    Router::new()' },
          { type: 'add', old: null, new: 11, t: '        .merge(landing::router())' },
          { type: 'add', old: null, new: 12, t: '        .merge(login::router())' },
        ]
      }
    ]
  },
  { file: 'crates/opengithub-web/src/routes/landing.rs', additions: 24, deletions: 0, status: 'added' },
  { file: 'crates/opengithub-web/src/routes/login.rs', additions: 38, deletions: 0, status: 'added' },
  { file: 'crates/opengithub-web/src/routes/repo.rs', additions: 91, deletions: 0, status: 'added' },
  { file: 'crates/opengithub-web/src/routes/blob.rs', additions: 67, deletions: 0, status: 'added' },
];

const OG_ACTIONS_RUN = {
  n: 1184, name: 'CI', branch: 'mira/split-routes', commit: '8a4f2c1',
  trigger: 'push by mira', started: '2 min ago', duration: '1m 47s',
  status: 'running',
  jobs: [
    { name: 'lint', status: 'pass', duration: '24s' },
    { name: 'unit · core', status: 'pass', duration: '52s' },
    { name: 'unit · web', status: 'running', duration: '1m 12s' },
    { name: 'integration', status: 'queued', duration: null },
    { name: 'docs', status: 'pass', duration: '18s' },
  ]
};

const OG_LOG_LINES = [
  { t: '14:02:01', lvl: 'info', m: '⏵ run started · ci.yml @ 8a4f2c1' },
  { t: '14:02:01', lvl: 'info', m: '   set up: ubuntu-22.04 · cargo 1.78.0' },
  { t: '14:02:03', lvl: 'cmd',  m: '$ cargo fetch' },
  { t: '14:02:09', lvl: 'out',  m: '   resolved 142 packages · cached' },
  { t: '14:02:10', lvl: 'cmd',  m: '$ cargo build --workspace --tests' },
  { t: '14:02:14', lvl: 'out',  m: '   Compiling opengithub-core v0.6.0' },
  { t: '14:02:31', lvl: 'out',  m: '   Compiling opengithub-web v0.6.0' },
  { t: '14:02:48', lvl: 'cmd',  m: '$ cargo test --package opengithub-core' },
  { t: '14:02:54', lvl: 'out',  m: 'running 124 tests' },
  { t: '14:03:01', lvl: 'out',  m: 'test router::splits_per_resource ... ok' },
  { t: '14:03:02', lvl: 'out',  m: 'test router::merges_layers       ... ok' },
  { t: '14:03:04', lvl: 'out',  m: 'test context::reads_env          ... ok' },
  { t: '14:03:06', lvl: 'ok',   m: 'test result: ok. 124 passed; 0 failed; finished in 12.4s' },
  { t: '14:03:08', lvl: 'cmd',  m: '$ cargo test --package opengithub-web' },
  { t: '14:03:13', lvl: 'out',  m: 'running 88 tests' },
  { t: '14:03:18', lvl: 'out',  m: 'test routes::landing_renders      ... ok' },
  { t: '14:03:19', lvl: 'out',  m: 'test routes::login_post_redirects ... ok' },
];

Object.assign(window, { OG_USER, OG_REPOS, OG_FILE_TREE, OG_README_LINES, OG_FILE_CONTENT, OG_PRS, OG_ISSUES, OG_NOTIFS, OG_DIFF, OG_ACTIONS_RUN, OG_LOG_LINES });
