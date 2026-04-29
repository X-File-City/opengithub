# opengithub Build Spec

Status: partial, iteration 1 docs/auth/onboarding discovery.

## Product Overview

opengithub is a production-grade GitHub clone for code hosting and collaboration. It should support repositories, Git operations, file browsing, commits, branches, pull requests, issues, Actions, Pages, Packages, code search, organizations, teams, profiles, notifications, settings, and public/private access controls.

## Stack

- Backend: Rust 2021, Axum, Tokio, SQLx, Postgres.
- Frontend: Next.js + TypeScript in `web/`.
- Database: AWS RDS Postgres with `pg_trgm`.
- Auth: Better Auth in Next.js, Google OAuth only.
- Cloud: AWS ECS Fargate, RDS, S3, SES, CloudFront, ECR; DNS through Cloudflare for `opengithub.namuh.co`.

## Design System Notes

From the public home/auth pages:

- GitHub Primer-like visual language: neutral backgrounds, compact forms, Octocat mark, high-contrast dark text, blue primary buttons, gray secondary surfaces.
- Auth forms use a centered narrow card, GitHub mark above heading, label-over-input fields, full-width primary action, and small secondary links.
- Public home uses global top navigation with dropdown megamenus, search/jump control, sign-in/sign-up links, large hero, email signup field, and product demo media.

Detailed repository/app UI design remains to be inspected in later iterations.

## Site Map

Partial from docs and public home only:

- `/`: public marketing home with global navigation, search/jump, sign in, sign up.
- `/login`: sign-in page.
- `/signup`: signup page.
- `/password_reset`: password reset page on target; documented as out of scope for opengithub Google-only auth.
- `/dashboard`: signed-in personal dashboard; docs say this is the first page after sign-in.
- `/{owner}/{repo}`: repository overview and file browser.
- `/{owner}/{repo}/issues`: repository issues.
- `/{owner}/{repo}/pulls`: repository pull requests.
- `/{owner}/{repo}/actions`: repository Actions workflows and runs.
- `/{owner}/{repo}/packages`: packages.
- `/{owner}/{repo}/settings`: repository settings.
- `/{user}`: user profile and contribution graph.
- `/orgs/{org}` or `/{org}`: organization profile/dashboard.
- `/search`: global search.

Full sitemap is still pending a dedicated iteration.

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

## API Architecture

The Rust API should expose opengithub-owned REST endpoints modeled after the GitHub REST API style. Initial endpoints:

```http
GET /api/user
Response: { "id": "uuid", "username": "mona", "name": "Mona Lisa", "avatarUrl": "https://..." }
Error: { "error": { "code": "unauthorized", "message": "Authentication required" } }
```

```http
POST /api/user/repos
Request: { "name": "hello-world", "description": "My first repository", "private": false, "autoInit": true, "hasIssues": true, "hasDiscussions": false }
Response: { "id": "uuid", "name": "hello-world", "fullName": "mona/hello-world", "private": false, "defaultBranch": "main" }
Error: { "error": { "code": "validation_failed", "message": "Repository name is required" } }
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

## Build Order

1. Rust/Next.js scaffolding and shared environment contract.
2. Database schema and migrations for users, sessions, repositories, Git refs, issues, pull requests.
3. Better Auth Google login and Rust session verification.
4. App shell and dashboard empty state.
5. Repository create/import and repository overview.
6. Git plumbing: clone/fetch/push, refs, commits, file browser.
7. Issues and pull requests.
8. Search, Actions, Packages, Pages, organizations, teams, profiles, settings, notifications.
9. Deployment and production hardening.

## Keyboard Shortcuts

Pending. GitHub has a keyboard shortcut model, but the complete inventory should be captured during page-level inspection.

