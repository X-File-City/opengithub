# Structure Outline: Core Postgres Schema and Rust Data Access Layer

**Ticket**: `infra-001`
**Design**: `build-spec.md`
**Date**: 2026-04-30

## Phase 1: Identity Foundation - users, OAuth accounts, sessions, and schema health become testable

Done: [x]

**Scope**: Build the first database-backed vertical slice for identity metadata without implementing the Google OAuth flow itself.
**Key changes**:
- `crates/api/migrations/*_identity_foundation.up.sql`: enable `pg_trgm`; add `users`, `oauth_accounts`, `sessions`, `audit_events`, and timestamp helpers with down migration.
- `crates/api/src/db.rs`: add Postgres pool construction from `DATABASE_URL` plus test-safe pool configuration.
- `crates/api/src/domain/identity.rs`: add `User`, `OAuthAccount`, `SessionRecord`, create/upsert/read functions, and stable JSON DTOs for `/api/auth/me` consumers.
- `crates/api/src/routes/health.rs`: keep `/health` HTTP 200 even when DB is unavailable, returning degraded JSON when applicable.
- `crates/api/src/lib.rs`: expose modules so integration tests can exercise DB and route construction.
**Verification**: `make check`, `make test`; SQLx migration applies against configured Postgres; tests cover user upsert, OAuth account uniqueness, session expiry storage, and degraded health response.

---

## Phase 2: Ownership and Repositories - org, team, repository, permission, and ref metadata become testable

Done: [x]

**Scope**: Add the data path needed by dashboard, profile, organization, and repository overview pages.
**Key changes**:
- `crates/api/migrations/*_repositories.up.sql`: add `organizations`, `organization_memberships`, `teams`, `team_memberships`, `repositories`, `repository_permissions`, `repository_git_refs`, `commits`, and minimal git object metadata tables.
- `crates/api/src/domain/repositories.rs`: add repository create/list/read functions with owner resolution and permission checks.
- `crates/api/src/routes/repositories.rs`: add JSON endpoints for repository list/create/read using the standard `{ items, total, page, pageSize }` envelope for lists.
- `crates/api/src/domain/permissions.rs`: centralize owner/admin/write/read permission decisions for later features.
**Verification**: `make check`, `make test`; tests cover repo creation for user/org owners, duplicate name handling per owner, permission grants, pagination envelope, and ref/commit metadata inserts.

---

## Phase 3: Collaboration Core - issues, pull requests, labels, milestones, comments, and reactions become testable

Done: [ ]

**Scope**: Add the issue/PR collaboration data model and enough Rust accessors for list, detail, and create workflows.
**Key changes**:
- `crates/api/migrations/*_collaboration.up.sql`: add `labels`, `milestones`, `issues`, `pull_requests`, `comments`, `timeline_events`, `reactions`, and assignment/cross-reference tables.
- `crates/api/src/domain/issues.rs`: add issue list/create/update/comment functions with repository permission checks.
- `crates/api/src/domain/pulls.rs`: add pull request list/create/update functions linked to branches and issue-style timelines.
- `crates/api/src/routes/issues.rs` and `crates/api/src/routes/pulls.rs`: expose initial list/create/detail JSON endpoints.
**Verification**: `make check`, `make test`; tests cover label defaults, issue and PR creation, timeline ordering, comments, reactions, status filters, and unauthorized repository access.

---

## Phase 4: Automation and Delivery Surfaces - Actions, packages, webhooks, notifications, and jobs become testable

Done: [ ]

**Scope**: Add durable metadata for background-driven product surfaces while keeping actual workers for later features.
**Key changes**:
- `crates/api/migrations/*_automation_delivery.up.sql`: add `actions_workflows`, `workflow_runs`, `workflow_jobs`, `workflow_steps`, `packages`, `package_versions`, `webhooks`, `webhook_deliveries`, `notifications`, and `job_leases`.
- `crates/api/src/domain/actions.rs`: add workflow/run/job read and state-transition helpers.
- `crates/api/src/domain/webhooks.rs`: add webhook registration and delivery-log accessors.
- `crates/api/src/domain/notifications.rs`: add notification create/list/mark-read helpers.
- `crates/api/src/jobs/mod.rs`: define job lease acquire/complete/fail signatures for future workers.
**Verification**: `make check`, `make test`; tests cover workflow run lifecycle transitions, package version uniqueness, webhook delivery retry metadata, notification unread counts, and job lease exclusivity.

---

## Phase 5: Search, API Contracts, and Hardening - query indexes, common envelopes, and migration safety are locked

Done: [ ]

**Scope**: Complete the foundation feature by adding search documents, request logging, shared API response types, and full migration regression coverage.
**Key changes**:
- `crates/api/migrations/*_search_and_observability.up.sql`: add `search_documents`, trigram/full-text indexes, `api_request_logs`, token hash storage for later PAT support, retention timestamps, and missing supporting indexes.
- `crates/api/src/api_types.rs`: add shared list envelope and error response DTOs used by all foundational routes.
- `crates/api/src/domain/search.rs`: add permission-aware search document write/query helpers with bounded query parameters.
- `crates/api/src/middleware/request_log.rs`: add request logging structure without storing secrets.
- `crates/api/tests/schema_contract.rs`: verify migrations, foreign keys, key uniqueness, pagination shapes, and representative query plans.
**Verification**: `make check`, `make test`, `make db-migrate` when `DATABASE_URL` is available; tests cover search ranking basics, tenant permission filters, request log redaction, and all down migrations in a disposable database.
