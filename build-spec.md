# opengithub Build Spec

Status: partial, iteration 4 repository creation/import inspection.

## Product Overview

opengithub is a production-grade GitHub clone for code hosting and collaboration. It should support repositories, Git operations, file browsing, commits, branches, pull requests, issues, Actions, Pages, Packages, code search, organizations, teams, profiles, notifications, settings, and public/private access controls.

## Stack

- Backend: Rust 2021, Axum, Tokio, SQLx, Postgres.
- Frontend: Next.js + TypeScript in `web/`.
- Database: AWS RDS Postgres with `pg_trgm`.
- Auth: Better Auth in Next.js, Google OAuth only.
- Cloud: AWS ECS Fargate, RDS, S3, SES, CloudFront, ECR; DNS through Cloudflare for `opengithub.namuh.co`.

## Design System Notes

From the public home/auth pages and iteration 2 home-page sitemap screenshot:

- GitHub Primer-like visual language: neutral backgrounds, compact forms, Octocat mark, high-contrast dark text, blue primary buttons, gray secondary surfaces.
- Auth forms use a centered narrow card, GitHub mark above heading, label-over-input fields, full-width primary action, and small secondary links.
- Public home uses global top navigation with dropdown megamenus, search/jump control, sign-in/sign-up links, large hero, email signup field, product demo media, repeated product-section CTAs, customer story cards, and dense multi-column footer.
- Signed-in app pages should use compact Primer-style controls: 32px-ish header height, subtle gray borders, rounded 6px inputs/buttons, blue primary actions, muted secondary buttons, small badges, horizontal repository tabs, and left settings sidebars.

Detailed repository/app UI design remains to be inspected in later iterations.

## Site Map

Full working sitemap lives in `sitemap.md`. Summary:

- Public unauthenticated: `/`, `/login`, `/signup`, `/features`, `/features/actions`, `/features/issues`, `/features/code-review`, `/features/discussions`, `/pricing`, `/enterprise`, `/team`, `/solutions`, `/resources`, `/marketplace`, `/sponsors`, `/topics`, `/trending`, `/collections`.
- Signed-in app shell: `/dashboard`, `/notifications`, `/pulls`, `/issues`, `/settings/*`, `/new`, `/new/import`, `/organizations/new`.
- Repository core: `/{owner}/{repo}`, `/tree/{branch}/{path}`, `/blob/{branch}/{path}`, `/commits/{branch}`, `/commit/{sha}`, `/branches`, `/releases`, `/tags`.
- Repository collaboration: `/issues`, `/issues/new`, `/issues/{number}`, `/labels`, `/milestones`, `/pulls`, `/compare/{base}...{head}`, `/pull/{number}`, `/pull/{number}/files`, `/pull/{number}/commits`.
- Repository automation and admin: `/actions`, `/actions/workflows/{workflow_file}`, `/actions/runs/{run_id}`, `/projects`, `/wiki`, `/security`, `/pulse`, `/graphs/contributors`, `/settings`, `/settings/access`, `/settings/branches`, `/settings/actions`, `/settings/hooks`, `/settings/pages`, `/settings/secrets/actions`.
- Profiles/orgs: `/{user}`, `/{user}?tab=repositories`, `/{user}?tab=stars`, `/{org}`, `/{org}?tab=repositories`, `/{org}?tab=people`, `/{org}?tab=teams`, `/{org}/{team_slug}`, `/orgs/{org}/settings/*`.
- Search: `/search?q={query}&type=repositories|code|issues|pullrequests|commits|users|discussions`.
- Packages/Pages: `/{owner}/{repo}/packages`, `/{owner}?tab=packages`, `/{org}?tab=packages`, `/{owner}/{package_type}/{package_name}`, `/{owner}/{repo}/settings/pages`, plus CloudFront/S3-backed published Pages domains.

Deep page-level screenshots and interaction details remain pending except auth/public home and the docs-backed personal dashboard slice.

## Repository Creation And Import

Status: inspected in iteration 4. Ever was usable and authenticated for `/new`. Screenshots:

- `ralph/screenshots/inspect/repo-new-form.jpg`
- `ralph/screenshots/inspect/repo-new-gitignore-menu.jpg`

The import route `/new/import` loaded in the Ever tab, but Ever snapshot/screenshot/extract failed with `Cannot access a chrome-extension:// URL of different extension`. Import behavior is therefore docs-backed from `target-docs/content/migrations/importing-source-code/using-github-importer/importing-a-repository-with-github-importer.md` and `about-github-importer.md`.

Repository create form:

- Page title is "Create a new repository" with helper text "Repositories contain a project's files and version history."
- A top inline link says "Have a project elsewhere? Import a repository" and routes to `/new/import`.
- Required fields are marked with an asterisk. The General section starts with "Repository owner and name".
- Owner is a dropdown button defaulting to the signed-in user. It should include personal account and organizations where the user can create repositories.
- Repository name is a required input. GitHub shows a generated suggestion such as `silver-train`; clicking the suggestion fills the input.
- Typing a name with spaces shows a normalized destination line ("Your new repository will be created as OpenGitHub-Invalid-Name-With-Spaces") and an inline validation warning that names can contain ASCII letters, digits, and limited punctuation. The clone should normalize spaces to hyphens for preview, but still require server-side validation.
- Description is optional with a 350-character counter.
- Visibility is a dropdown defaulting to Public. Menu options are Public ("Anyone on the internet can see this repository. You choose who can commit.") and Private ("You choose who can see and commit to this repository.").
- Start with a template is a searchable dropdown defaulting to "No template".
- Add README is a two-state toggle with visible On/Off labels. Toggling it changes the button pressed state immediately.
- Add `.gitignore` opens a dialog/popup titled "Choose a .gitignore template" with a search combobox and listbox. Initial options include "No .gitignore", "AL", "Actionscript", "Ada", "Android", "Angular", and many language/framework templates.
- Add license is a dropdown defaulting to "No license".
- Primary submit button says "Create repository". This inspection did not click it because that would create a real GitHub repository.

Repository import behavior:

- Import is reached from the create form or the global plus/create menu.
- The import page title in docs is "Import your project to GitHub".
- Step 1 collects the source remote repository URL.
- If the source repository is private, the form asks for credentials that will be used only to perform a `git clone` against the source.
- The user chooses destination owner, destination repository name, and visibility.
- Clicking "Begin import" creates a new repository and redirects to a "Preparing your new repository" status page.
- Import tracks source-code and commit history only. It does not import issues, pull requests, hosting-service metadata, Git LFS objects, or repositories hosted on private networks. Non-Git sources are unsupported.

Implementation mapping:

- Next.js owns `/new`, `/new/import`, inline validation, dropdown/popup interactions, async import status page, and redirect to `/{owner}/{repo}`.
- Rust API owns repository creation, owner permission checks, name availability checks, default branch/bootstrap commit creation, template materialization, `.gitignore`/license lookup, and import jobs.
- Postgres stores repository metadata, feature flags, visibility, template selections, import job state, and audit/activity events.
- Git object storage should start on the API service filesystem or S3-backed object storage per the repository storage design; large import artifacts/logs belong in S3.
- Async imports should run in an ECS Fargate worker path with job state in Postgres. If queueing is introduced, use SQS.
- SES sends the completion/failure email for import jobs after the domain is verified.

## Personal Dashboard

Status: partially inspected in iteration 3. Ever was attempted first but the reusable session was expired, and the prompt forbids `ever start`. The authenticated dashboard could not be visually inspected live. Evidence came from scraped GitHub docs plus a fallback Chrome check of `https://github.com/dashboard`, which confirmed unauthenticated users are redirected to the sign-in page. Fallback screenshot: `ralph/screenshots/inspect/dashboard-redirect.jpg`.

Core dashboard behavior to clone:

- The personal dashboard is the first signed-in page and is reachable by clicking the GitHub mark in the top-left global header.
- The signed-in dashboard uses the global app shell plus a dashboard-specific layout: a left repository/navigation sidebar and a central feed/activity column.
- New users with no repositories should see first-run onboarding with Create repository, Import repository, and setup-guide CTAs.
- The left sidebar exposes top repositories and teams through the global navigation menu, plus recently visited repositories/teams/projects through the global search/jump field.
- Top repositories are generated automatically from repositories the user has interacted with, including commits, opened issues, issue comments, opened pull requests, and pull request comments. Users cannot manually edit this ranking; inactive repos should age out after one year.
- Recent activity previews up to four issue/pull-request updates from the last two weeks that involve the user.
- Feed activity supports a Following feed and a For you/recommendations feed. The feed can be filtered by event type.

Dashboard implementation mapping:

- Next.js owns `/dashboard`, responsive layout, empty states, feed cards, filter dropdowns, and client-side repository filtering.
- Rust API owns dashboard aggregation endpoints and permission-aware repository/activity queries.
- Postgres stores dashboard source data in normal product tables plus optional `activity_events`, `feed_events`, `recent_visits`, `follows`, `repository_watches`, `stars`, and `dashboard_hint_dismissals` tables.
- No GitHub Copilot dashboard/prompt features should be built for opengithub; they are target-specific preview features outside the clone's current scope.

## Data Models

Initial model set inferred from docs/OpenAPI:

- `users`: id, username, display_name, email, avatar_url, bio, company, location, website_url, created_at, updated_at.
- `auth_accounts`: id, user_id, provider, provider_account_id, access_token_hash, refresh_token_hash, expires_at.
- `sessions`: id, user_id, token_hash, expires_at, ip_address, user_agent, created_at.
- `repositories`: id, owner_type, owner_id, name, full_name, description, visibility, default_branch, has_issues, has_projects, has_wiki, has_discussions, is_template, archived, created_at, updated_at.
- `repository_git_refs`: id, repository_id, ref_type, name, target_sha, created_at, updated_at.
- `commits`: id, repository_id, sha, tree_sha, parent_shas, author_name, author_email, committer_name, committer_email, message, committed_at.
- `issues`: id, repository_id, number, title, body, state, author_id, assignee_id, milestone_id, closed_at, created_at, updated_at.
- `pull_requests`: id, repository_id, number, title, body, state, author_id, head_repo_id, head_ref, base_repo_id, base_ref, merge_commit_sha, merged_at, closed_at, created_at, updated_at.
- `labels`: id, repository_id, name, color, description.
- `organizations`: id, slug, display_name, description, avatar_url, created_at, updated_at.
- `teams`: id, organization_id, slug, name, description, privacy.
- `actions_workflows`: id, repository_id, path, name, state, created_at, updated_at.
- `workflow_runs`: id, repository_id, workflow_id, run_number, status, conclusion, event, head_sha, actor_id, started_at, completed_at.
- `packages`: id, owner_type, owner_id, repository_id, package_type, name, visibility, created_at, updated_at.
- `webhooks`: id, owner_type, owner_id, url, secret_hash, events, active, created_at, updated_at.
- `notifications`: id, user_id, subject_type, subject_id, reason, unread, updated_at.
- `activity_events`: id, actor_id, repository_id, subject_type, subject_id, event_type, title, summary, created_at.
- `feed_events`: id, actor_id, repository_id, organization_id, event_type, payload_json, visibility, created_at.
- `recent_visits`: id, user_id, subject_type, subject_id, last_visited_at.
- `follows`: id, follower_id, subject_type, subject_id, created_at.
- `repository_watches`: id, user_id, repository_id, watching_level, created_at, updated_at.
- `stars`: id, user_id, repository_id, created_at.
- `dashboard_hint_dismissals`: id, user_id, hint_key, dismissed_at.
- `repository_creation_templates`: id, name, source_repository_id, description, owner_id, visibility, created_at.
- `repository_template_files`: id, template_id, path, mode, content_sha, created_at.
- `gitignore_templates`: id, name, body, source, updated_at.
- `license_templates`: id, spdx_id, name, body, description, permissions, conditions, limitations, updated_at.
- `repository_imports`: id, repository_id, owner_id, source_url, source_host, status, progress_message, error_code, error_message, started_at, completed_at, created_at, updated_at.
- `repository_import_credentials`: id, import_id, username, secret_ref, created_at, expires_at. Store credentials encrypted or as a short-lived AWS Secrets Manager/S3 envelope reference; never persist plaintext.
- `repository_activity_events`: id, repository_id, actor_id, event_type, payload_json, created_at.

## API Architecture

The Rust API should expose opengithub-owned REST endpoints modeled after the GitHub REST API style. Initial endpoints:

```http
GET /api/user
Response: { "id": "uuid", "username": "mona", "name": "Mona Lisa", "avatarUrl": "https://..." }
Error: { "error": { "code": "unauthorized", "message": "Authentication required" } }
```

```http
GET /api/dashboard
Response: {
  "topRepositories": [
    { "owner": "mona", "name": "hello-world", "visibility": "public", "language": "TypeScript", "languageColor": "#3178c6", "updatedAt": "2026-04-30T00:00:00Z" }
  ],
  "recentActivity": [
    { "type": "issue", "repository": "mona/hello-world", "number": 12, "title": "Fix flaky test", "state": "open", "updatedAt": "2026-04-30T00:00:00Z", "actor": { "username": "mona", "avatarUrl": "https://..." } }
  ],
  "feed": [],
  "dismissedHints": ["import-repository"]
}
Error: { "error": { "code": "unauthorized", "message": "Authentication required" } }
```

```http
GET /api/dashboard/feed?mode=following&eventType=release&page=1&pageSize=30
Response: {
  "items": [
    { "id": "uuid", "eventType": "release", "actor": { "username": "octo" }, "repository": "octo/app", "title": "v1.2.0", "createdAt": "2026-04-30T00:00:00Z" }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 30
}
Error: { "error": { "code": "validation_failed", "message": "Unsupported feed mode" } }
```

```http
POST /api/dashboard/dismiss-hint
Request: { "hintKey": "create-repository" }
Response: { "hintKey": "create-repository", "dismissed": true }
Error: { "error": { "code": "validation_failed", "message": "hintKey is required" } }
```

```http
POST /api/user/repos
Request: { "name": "hello-world", "description": "My first repository", "private": false, "autoInit": true, "hasIssues": true, "hasDiscussions": false }
Response: { "id": "uuid", "name": "hello-world", "fullName": "mona/hello-world", "private": false, "defaultBranch": "main" }
Error: { "error": { "code": "validation_failed", "message": "Repository name is required" } }
```

```http
GET /api/repositories/name-check?owner=mona&name=hello-world
Response: { "owner": "mona", "name": "hello-world", "normalizedName": "hello-world", "available": true, "message": "hello-world is available." }
Error: { "error": { "code": "validation_failed", "message": "Repository names can only contain ASCII letters, digits, hyphens, underscores, and periods." } }
```

```http
GET /api/repository-options
Response: {
  "owners": [{ "type": "user", "login": "mona", "displayName": "Mona Lisa", "avatarUrl": "https://..." }],
  "gitignoreTemplates": [{ "name": "No .gitignore" }, { "name": "Rust" }, { "name": "Node" }],
  "licenseTemplates": [{ "spdxId": "mit", "name": "MIT License" }],
  "repositoryTemplates": [{ "id": "uuid", "fullName": "mona/template" }]
}
Error: { "error": { "code": "unauthorized", "message": "Authentication required" } }
```

```http
POST /api/repositories/imports
Request: { "sourceUrl": "https://example.com/acme/app.git", "owner": "mona", "name": "app", "visibility": "private", "credentials": { "username": "mona", "password": "secret" } }
Response: { "id": "uuid", "repository": { "fullName": "mona/app" }, "status": "queued", "statusUrl": "/api/repositories/imports/uuid" }
Error: { "error": { "code": "source_unreachable", "message": "The source repository could not be cloned." } }
```

```http
GET /api/repositories/imports/{id}
Response: { "id": "uuid", "repository": { "fullName": "mona/app" }, "status": "importing", "progressMessage": "Cloning source repository", "startedAt": "2026-04-30T00:00:00Z", "completedAt": null }
Error: { "error": { "code": "not_found", "message": "Import job not found" } }
```

```http
GET /api/repos/{owner}/{repo}
Response: { "id": "uuid", "owner": "mona", "name": "hello-world", "description": "My first repository", "defaultBranch": "main", "visibility": "public" }
Error: { "error": { "code": "not_found", "message": "Repository not found" } }
```

```http
GET /api/repos/{owner}/{repo}/issues?state=open&page=1&pageSize=30
Response: { "items": [{ "id": "uuid", "number": 1, "title": "Bug", "state": "open" }], "total": 1, "page": 1, "pageSize": 30 }
```

```http
GET /api/search/code?q=Button+repo:mona/hello-world&page=1&pageSize=30
Response: { "items": [{ "repository": "mona/hello-world", "path": "src/Button.tsx", "line": 12, "fragment": "export function Button" }], "total": 1, "page": 1, "pageSize": 30 }
```

More endpoint examples must be completed after feature-page inspection.

## Backend Architecture

- Axum routes: auth verification middleware, REST JSON routes, Git smart HTTP endpoints, webhook receivers.
- Postgres/RDS: primary relational store, search indexes with `pg_trgm`.
- S3: repository large files if needed, Actions artifacts/log archives, package blobs, Pages static outputs.
- SES: transactional email for notifications and organization invites. Password reset is not needed while auth remains Google-only.
- ECS Fargate: Rust API and background workers.
- ECR: container images.
- CloudFront: Next.js/static asset delivery and Pages CDN.
- SQS optional: repository import queue and later Actions job queue when import concurrency exceeds a single worker loop.

## SDK / DX

`ralph-config.json` disables SDK generation, so do not build a standalone SDK package in the first pass. Build developer experience through:

- REST API documentation.
- Personal access tokens.
- Git clone/push setup instructions.
- Webhook configuration and delivery logs.
- Later optional CLI docs modeled after `gh`.

## Known Constraints

- Better Auth is configured for Google OAuth only; do not add GitHub OAuth even though this is a GitHub clone.
- No password auth means no password reset flow in opengithub unless the auth mode changes.
- Google OAuth requires authorized JavaScript origins and redirect URIs in Google Cloud Console.
- `DATABASE_URL` is pending until AWS RDS is provisioned by `scripts/preflight.sh`.
- SES requires verified sender/domain before production email.
- Cloudflare env vars are required for DNS automation.
- The clone must not call GitHub APIs for product functionality; GitHub docs/OpenAPI are reference material only.
- Repository creation must validate owner permissions in both Next.js and Rust; Rust is authoritative.
- Repository imports require source repositories reachable from the public internet; private network sources are unsupported in MVP.
- Repository imports must not claim to migrate issues, pull requests, webhooks, or LFS objects unless those migrations are explicitly implemented later.

## Build Order

1. Rust/Next.js scaffolding and shared environment contract.
2. Database schema and migrations for users, sessions, repositories, Git refs, issues, pull requests.
3. Better Auth Google login and Rust session verification.
4. App shell, global navigation, search/jump bar, and dashboard empty state.
5. Repository create/import and repository overview.
6. Git plumbing: clone/fetch/push, refs, commits, file browser.
7. Issues and pull requests.
8. Search, Actions, Packages, Pages, organizations, teams, profiles, settings, notifications.
9. Public marketing/home surfaces only after the core app is usable.
10. Deployment and production hardening.

## Keyboard Shortcuts

Partial inventory from GitHub command palette docs:

| Shortcut | Scope | Behavior |
| --- | --- | --- |
| `Cmd+K` / `Ctrl+K` | Global | Open command palette in search/navigation mode. |
| `Cmd+Option+K` / `Ctrl+Alt+K` | Global, Markdown-safe | Open command palette when normal shortcut conflicts with text editing. |
| `Cmd+Shift+K` / `Ctrl+Shift+K` | Global | Open command palette in command mode. |
| `>` | Command palette | Switch from search/navigation mode to command mode. |
| `#` | Command palette | Search issues, pull requests, discussions, and projects. |
| `@` | Command palette | Search users, organizations, and repositories. |
| `/` | Command palette | Search files inside a repository scope or repositories inside an organization scope. |
| `!` | Command palette | Search projects only. |
| `Enter` | Command palette | Open highlighted result or run highlighted command. |
| `Cmd+Enter` / `Ctrl+Enter` | Command palette | Open highlighted search/navigation result in a new tab. |
| `Esc` | Command palette | Close command palette. |
| `?` | Command palette | Show command palette help. |
