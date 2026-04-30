# opengithub Build Spec

Status: architecture complete.

## Stack Contract

- Backend: Rust 2021, Axum, Tokio, SQLx, Tower/Tower-HTTP, Tracing.
- Frontend: Next.js + TypeScript in `web/`; the frontend is a thin client over the Rust API.
- Database: AWS RDS Postgres with SQLx migrations under `crates/api/migrations/`; search begins with Postgres `pg_trgm` and full-text indexes.
- Auth: native Rust Google OAuth with `oauth2`, `tower-sessions`, and `axum-login`; no Better Auth, NextAuth, password auth, GitHub OAuth, Apple OAuth, passkeys, or captcha in MVP.
- Cloud: AWS ECS Fargate, RDS, S3, SES, CloudFront, ECR; DNS through Cloudflare for `opengithub.namuh.co`.
- Dev ports: Next.js on `:3015`, Rust API on `:3016`.
- Verification targets: use `make check`, `make test`, and `make test-e2e` per `BUILD_GUIDE.md`.

## Evidence Summary

`prd.json` contains 100 discovered features: 1 P0 platform data item, 2 P1 auth items, 25 P2 foundation items, 13 P3 items, 5 P4 items, 24 P5 items, 19 P6 items, 9 P7 items, 1 P8 item, and 1 P10 marketing item. The category distribution is auth 3, CRUD 44, data 6, developer-experience 10, interaction 2, layout 3, nav 2, onboarding 2, search 10, and settings 18.

The core product shape is repository collaboration: repositories, Git refs/commits/trees/blobs, issues, pull requests, labels, milestones, organizations, teams, Actions runs, packages, webhooks, notifications, search indexes, personal access tokens, and settings. Representative visual evidence in `ralph/screenshots/inspect/` shows dense GitHub-style repository workspaces, issue/PR lists and timelines, Actions run lists/logs, auth screens, settings surfaces, search, projects, packages, notifications, and organization/profile pages.

The scraped GitHub OpenAPI document identifies REST resource families for repos, git, issues, pulls, actions, activity/notifications, orgs, teams, packages, users, search, and projects. `target-docs/content/webhooks/about-webhooks.md` and `target-docs/content/webhooks/using-webhooks/handling-webhook-deliveries.md` establish event-driven webhook delivery and bounded response expectations. `target-docs/content/actions/concepts/workflows-and-actions/workflows.md` and `workflow-artifacts.md` establish workflow runs, jobs, steps, logs, and artifact storage as first-class surfaces.

## Architecture Decisions

The concrete decisions are recorded in `ralph/architecture-decisions.json`. This section is the build-facing synthesis.

### Process Topology

Run three deployable surfaces from one repository:

1. Rust Axum API on ECS Fargate for HTTP JSON, auth, Git smart HTTP, raw/archive streaming, webhook management, package registry endpoints, and server-side permission checks.
2. Next.js frontend on `web/` for the app shell, repository workspace UI, forms, lists, search pages, settings pages, and public pages.
3. Rust worker process, built from the same workspace, for background jobs: repository import, webhook delivery, email, notification fanout, search indexing, archive generation, Pages publishing, package cleanup, Actions workflow execution orchestration, log/artifact retention, and scheduled maintenance.

Do not introduce a dedicated WebSocket server in the MVP. Use HTTP polling for Actions runs/logs, notifications, import status, and search indexing progress. Add SSE later only if polling becomes a measured product issue.

Use Postgres-backed job tables with leases for MVP background work. This keeps the stack simple and inside the existing RDS contract. Introduce SQS only after the job volume or retry isolation proves Postgres leasing insufficient.

### Data Model Shape

Use a relational Postgres model as the source of truth for metadata, permissions, relationships, search documents, and workflow state. The core relationship graph is:

- `users -> oauth_accounts -> sessions`
- `users/organizations -> repositories`
- `organizations -> teams -> team_memberships -> repository_permissions`
- `repositories -> repository_git_refs -> commits -> git_trees/git_objects`
- `repositories -> issues/pull_requests -> comments/timeline_events/reactions/labels/milestones`
- `repositories -> actions_workflows -> workflow_runs -> workflow_jobs -> workflow_steps/logs/artifacts`
- `repositories -> releases/packages/webhooks/notifications/search_documents`
- `projects -> project_views/project_items/project_fields/project_item_field_values`

Store large binary content and generated assets in S3, referenced by Postgres metadata: Git pack/object bytes where needed, raw blobs that exceed DB-safe limits, release assets, package blobs, Actions logs/artifacts/caches, Pages output, avatars, attachments, and generated archives. Use Postgres for indexes and authorization checks before issuing streams or short-lived signed URLs.

### Infrastructure Needs

- Required now: RDS Postgres, S3, SES, CloudFront, ECS Fargate, ECR, Cloudflare DNS.
- Required app features: Postgres extensions/indexes for `pg_trgm`, full-text search, queue leases, audit tables, and retention jobs.
- Required storage buckets/prefixes: git objects/archives, release assets, package blobs, Actions logs/artifacts/caches, Pages artifacts, avatars, issue/comment attachments.
- Required scheduled jobs: notification retention, webhook retry/redelivery cleanup, Actions log/artifact retention, stale import timeout cleanup, search index backfills, archive/package garbage collection, and expired session/token cleanup.
- Not required initially: Redis, a separate search engine, a dedicated WebSocket service, billing infrastructure, SSH Git transport, or standalone SDK infrastructure.

### Authentication Flow

Auth is native Rust session auth:

1. Next.js `/login` renders a compact opengithub sign-in page with one `Continue with Google` action.
2. The button calls `GET /api/auth/google/start` on Rust.
3. Google redirects to `GET /api/auth/google/callback`.
4. Rust exchanges the code, upserts `users` and `oauth_accounts`, writes a Postgres-backed session, sets a signed `__Host-session` cookie, then redirects to `next` or `/dashboard`.
5. Rust protects API and Git/package endpoints with `axum-login` extractors plus permission checks.
6. Next.js middleware may call `GET /api/auth/me` to route protected pages, but Rust remains authoritative.

Personal access tokens are separate credentials for Git over HTTPS, REST API calls, packages, and automation. Store only token hashes/prefixes and show plaintext once on creation.

### API Shape

Build opengithub-owned REST endpoints under the Rust API, shaped after the GitHub REST resource families but scoped to the PRD. JSON list responses should use a consistent envelope:

```json
{ "items": [], "total": 0, "page": 1, "pageSize": 30 }
```

Errors should use:

```json
{ "error": { "code": "validation_failed", "message": "Human readable message" }, "status": 422 }
```

Initial route groups:

- `/api/auth/*`
- `/api/user`, `/api/users/{username}`, `/api/orgs/{org}`
- `/api/repos`, `/api/repos/{owner}/{repo}`, repository settings, access, refs, contents, branches, commits, archives
- `/api/repos/{owner}/{repo}/issues/*`
- `/api/repos/{owner}/{repo}/pulls/*`
- `/api/repos/{owner}/{repo}/actions/*`
- `/api/search/*`
- `/api/notifications/*`
- `/api/packages/*`
- `/api/repos/{owner}/{repo}/hooks/*`
- `/api/settings/tokens/*`

Do not call GitHub APIs for product behavior. Scraped docs and OpenAPI are references only.

### Component Structure

Keep a single repo with a Rust workspace and one Next.js app:

- `crates/api/`: Axum API, auth, route modules, Git smart HTTP, registry endpoints, job handlers, SQLx migrations.
- `crates/api/src/routes/`: route groups by resource.
- `crates/api/src/jobs/`: background job handlers and scheduler leases.
- `crates/api/src/domain/`: permission checks, repository/Git abstractions, issue/PR workflows, Actions orchestration, package logic.
- `web/`: Next.js App Router frontend.
- `web/src/app/`: pages and route segments.
- `web/src/components/`: Primer-like controls and reusable app/repository/settings shells.
- `web/src/lib/api.ts`: typed fetch client for the Rust API.

Do not create a standalone SDK package in the first pass because `ralph-config.json` has `sdk.enabled: false`. Developer experience is REST docs, personal access tokens, Git clone/push docs, and webhook delivery logs.

## Recommended Build Order

1. **Repo scaffolding and contracts**: ensure Rust workspace, `crates/api`, Makefile targets, `.env` contract, and `web/` scaffolding match `BUILD_GUIDE.md`.
2. **Core schema**: SQLx migrations for users, oauth accounts, sessions, organizations, teams, repositories, permissions, refs, commits, trees/objects metadata, audit events, and job leases.
3. **Rust-native auth**: Google OAuth, signed Postgres sessions, `/api/auth/me`, logout, protected-route middleware, Next.js login page and route gating.
4. **App shell and dashboard**: signed-in header, navigation, dashboard empty state, repository sidebar, first-run onboarding hint persistence.
5. **Repository create and overview**: `/new`, repository creation API, default labels/settings, README/bootstrap commit, `/{owner}/{repo}` Code tab.
6. **Git and file browsing**: smart HTTP clone/fetch/push with PAT auth, branch/tag selector, tree/blob/raw/archive endpoints, large/binary file handling, commit metadata indexing.
7. **Issues and pull requests**: list/filter/search, create, detail timelines, comments, reactions, labels, milestones, PR compare/create/detail/files/mergeability.
8. **Search foundation**: permission-aware repository file finder, code search, issue/PR search, query parser bounds, saved searches.
9. **Async worker foundation**: Postgres job leases, email, notification fanout, webhook delivery queue, archive generation, import jobs, retention scheduler.
10. **Actions MVP**: workflow discovery from `.github/workflows`, run list/detail, job logs, artifacts in S3, manual dispatch, rerun/cancel/delete-log actions, check-run integration.
11. **Settings and security controls**: repository access, branch rules, webhooks, secrets, Pages, PATs, sessions, security log, audit events.
12. **Organizations, profiles, notifications, releases, packages**: build read surfaces first, then mutation paths and permission-sensitive settings.
13. **Projects, Discussions, Wiki, code security, advanced insights**: ship after repository, issue/PR, search, and async foundations are stable.
14. **Public marketing pages**: defer until the signed-in product and public repository/profile browsing are usable.
15. **Production hardening**: AWS preflight/provisioning, migrations, CloudFront/S3 policies, SES verification, Cloudflare DNS, rate limits, audit exports, backups, retention, E2E coverage.

## Non-Goals For MVP

- Billing, paywalls, subscriptions, payment processing.
- GitHub OAuth, Apple OAuth, password login, signup passwords, password reset, passkeys, captcha.
- Redis, Elasticsearch/OpenSearch, dedicated WebSocket service.
- SSH Git transport.
- Standalone SDK package or CLI.
- Self-hosted Actions runners, larger runners, ARC, OIDC federation, artifact attestations.
- Full package ecosystem parity beyond the first supported registry protocol.

<promise>ARCHITECTURE_COMPLETE</promise>
