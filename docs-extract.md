# Docs Extract: GitHub / opengithub

Inspection date: 2026-04-30

## Source Coverage

- `target-docs/coverage.json` passed with 3,613 documentation pages from the GitHub docs source tree.
- `target-docs/openapi.json` is present and authoritative for the REST API: OpenAPI 3.0.3, "GitHub v3 REST API", version 1.1.4.
- OpenAPI surface: 758 paths and 923 schemas.
- Largest REST categories by operation tag: repos, actions, orgs, issues, codespaces, users, apps, activity, teams, pulls, copilot, packages, projects, dependabot, code scanning, code security, gists, reactions, git, checks, search.

## Product Shape

GitHub is a developer collaboration platform centered on repositories. The platform combines Git hosting, file browsing, commits, branches, pull requests, issues, discussions, Actions CI/CD, packages, Pages hosting, organizations, teams, code search, notifications, profiles, security scanning, and developer APIs.

For opengithub, the clone should use the configured Rust + Next.js split:

- Rust Axum API owns Git plumbing, repository data, search indexing, Actions workflow execution, package registry endpoints, webhooks, and public REST API routes.
- Next.js owns UI, Better Auth Google sign-in, route protection, repository browsing, pull request diff views, issue forms, settings, profiles, and dashboard surfaces.
- Postgres on RDS stores relational product data; `pg_trgm` powers search. S3 stores blobs/artifacts/packages/pages assets where the database should not.

## API Shape

The target REST API is broad and resource-oriented. It uses path nouns, owner/repo scoping, JSON bodies, bearer/session authentication, pagination via `page` and `per_page`, and standard HTTP status codes.

Representative endpoints from `target-docs/openapi.json`:

- `GET /user`: authenticated user profile.
- `POST /user/repos`: create a repository. Required body field: `name`; optional fields include `description`, `homepage`, `private`, feature booleans (`has_issues`, `has_projects`, `has_wiki`, `has_discussions`), `auto_init`, templates, and merge policy defaults.
- `GET /repos/{owner}/{repo}`: repository detail.
- `GET /repos/{owner}/{repo}/contents/{path}?ref=...`: file or directory contents.
- `GET /repos/{owner}/{repo}/issues`: repository issues with filters for `milestone`, `state`, `assignee`, `type`, `creator`, `mentioned`, `sort`, pagination.
- `GET /repos/{owner}/{repo}/pulls`: pull requests filtered by `state`, `head`, `base`, `sort`, `direction`, pagination.
- `GET /repos/{owner}/{repo}/actions/runs`: workflow run list.
- `GET /orgs/{org}/packages?package_type=...`: package list for an organization.
- `GET /search/code?q=...`: code search.

Clone API guidance:

- Build an opengithub-native REST API under the Rust service; do not call GitHub APIs.
- Preserve GitHub-like endpoint semantics where practical, but return opengithub-owned resource IDs and data.
- Use a consistent JSON error envelope: `{ "error": { "code": "not_found", "message": "Repository not found" } }`.
- Use list pagination: `{ "items": [...], "total": 42, "page": 1, "pageSize": 30 }`.

## Developer Experience

GitHub exposes three primary developer interfaces:

- REST API for users, repos, issues, pulls, orgs, teams, Actions, packages, search, apps, webhooks, and security resources.
- GraphQL API, referenced in docs for advanced/migration workflows, but this first opengithub build should prioritize REST because the scraped OpenAPI contract is REST.
- GitHub CLI (`gh`) with workflows for status, repository view/clone/create, issue list/create/search, pull request list/create, codespaces, configuration, aliases, extensions, and multi-account switching.

opengithub should not create a full SDK in the first build because `ralph-config.json` has `"sdk.enabled": false`. It should still include a developer-experience surface:

- API docs pages generated from Rust route definitions.
- Personal access token UI and token-authenticated REST API.
- Git remote instructions for HTTPS clone/push.
- Minimal `ogh` CLI-compatible documentation as a later feature, not a package dependency.

## Onboarding Summary

Docs identify onboarding as a multi-part path:

1. Create account.
2. Choose plan/product.
3. Verify email.
4. Configure two-factor authentication and optional passkey.
5. View profile and contribution graph.
6. Set up Git and choose CLI/web/desktop workflow.
7. Create/import a repository.
8. Configure collaborators, repository settings, issues/projects, notifications, Pages, Discussions, Actions, Packages, and security.

For opengithub, billing/plan selection is out of scope. First-run onboarding should focus on Google sign-in, profile setup, creating/importing the first repository, and showing empty dashboard states until repositories/issues/PRs exist.

## Auth Summary

Live auth pages were inspected through Playwright screenshots because Ever could navigate but failed screenshots/extracts with a `chrome-extension://` context error.

Target GitHub auth observations:

- `/login`: username/email field, password field, "Forgot password?", sign-in submit, "Create an account", passkey prompt support.
- `/signup`: social signup buttons for Google and Apple, email, password, username, email preferences, terms, octocaptcha account verification.
- `/password_reset`: verified email address input, captcha, and reset email submit.

opengithub constraint: Better Auth with Google OAuth only. Do not implement GitHub OAuth, Apple OAuth, passkeys, or password-based auth unless the project config changes.

