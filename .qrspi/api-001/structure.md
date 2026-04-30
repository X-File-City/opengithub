# Structure Outline: api-001 GitHub-style REST API Contract

**Ticket**: `api-001`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, existing Rust route/domain modules, `target-docs/openapi.json`, and current Next.js docs surfaces.
**Date**: 2026-04-30

## Phase 1: User and API Contract Foundation - expose the authenticated user contract

**Done**: [x]

**Scope**: Establish the public REST contract conventions for `api-001` and expose the first GitHub-style authenticated user endpoint. This phase should make envelopes, pagination, error mapping, auth, and response headers consistent enough for later resource groups to reuse without changing existing product-page behavior.

**Key changes**:
- `crates/api/src/api_types.rs`: add shared pagination parsing/clamping helpers, success metadata helpers if needed, and documented error codes for validation, auth, forbidden, not found, conflict, and service-unavailable cases.
- `crates/api/src/routes/users.rs` or equivalent: add `GET /api/user` for the signed-in account using the Rust session/PAT actor path, returning stable fields such as `id`, `login`, `name`, `email`, `avatarUrl`, `htmlUrl`, and timestamps without leaking OAuth/session internals.
- `crates/api/src/lib.rs` and `crates/api/src/routes/mod.rs`: wire the new route group under `/api/user` while preserving existing `/api/auth/me` semantics for browser session checks.
- Tests: add Rust API contract coverage for anonymous 401 envelopes, valid signed-session user responses, database-unavailable envelopes, JSON content types, and no stack/secret leakage.
- Documentation prep: update route inventory fixtures or helper data used by the later `/docs/api` page so this first endpoint appears in generated/manual docs.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`; scenario test hits the live Axum API with and without a real signed session and verifies status codes, content type, and response bodies.

---

## Phase 2: Repository and Search REST Surface - normalize existing resource endpoints

**Done**: [x]

**Scope**: Bring repository create/detail/list, code browsing helpers, and search endpoints fully under the `api-001` contract. Existing routes should keep their UI-facing behavior, but their public JSON shapes, pagination, and error responses must become predictable and GitHub-style enough for external API consumers.

**Key changes**:
- `crates/api/src/routes/repositories.rs`: normalize `GET /api/repos`, `POST /api/repos`, `GET /api/repos/{owner}/{repo}`, refs, contents, blobs, commits, file finder, star/watch/fork routes, and name/creation-option helper routes to use shared envelopes and error helpers consistently.
- `crates/api/src/routes/search.rs`: ensure `GET /api/search` supports bounded `page`/`pageSize`, permission-aware result filtering, clear validation errors for bad queries, and standard list envelopes.
- `crates/api/src/domain/repositories.rs` and `search.rs`: align DTO field casing, hrefs, total counts, empty states, and conflict/not-found/forbidden mapping without changing database ownership rules.
- Rust tests: cover page/pageSize defaults and clamps, repository create conflict `409`, private repository `403`/`404` boundaries as designed, malformed query `422`, search visibility, and consistent response headers.
- Scenario coverage: real Postgres signed-session flow creates a repository, reads it through public API routes, lists repositories with pagination, and searches indexed data without mocks.

**Verification**: `make check && make test`; scenario proof runs against local Postgres and the live Axum server, asserting repository and search response envelopes from outside the process.

---

## Phase 3: Collaboration and Automation REST Surface - cover issues, pulls, Actions, and packages

**Done**: [x]

**Scope**: Expose the collaboration and automation resource families named by the PRD: repository issues, pull requests, Actions runs, and packages. Existing domain tables already exist for most of this data, so this phase should focus on route completeness, permission checks, and contract tests instead of broad new product UI.

**Key changes**:
- `crates/api/src/routes/issues.rs`: verify or add REST-shaped list/create/read/comment/reaction/status routes under `/api/repos/{owner}/{repo}/issues` with list envelopes, validation errors, and permission enforcement.
- `crates/api/src/routes/pulls.rs`: verify or add list/create/read/merge routes under `/api/repos/{owner}/{repo}/pulls` with shared issue numbering behavior and deterministic error envelopes.
- `crates/api/src/routes/actions.rs` and `packages.rs` or equivalent: add initial read/create/list endpoints for workflow runs and package metadata using the existing `actions` domain and package tables from `infra-001`; defer runner execution and package blob upload depth to later feature-specific PRDs.
- `crates/api/src/lib.rs` and `routes/mod.rs`: wire any missing route groups and ensure request logging redacts credentials across these APIs.
- Rust tests: cover anonymous 401, private-resource denial, list pagination, create validation, status transition errors, package version uniqueness, and no stack trace leakage.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`; scenario proof creates/list/reads issue, pull request, workflow run, and package metadata through HTTP with a real session.

---

## Phase 4: API Docs Page and Consumer Smoke - make the REST surface discoverable

**Done**: [ ]

**Scope**: Add the visible developer-experience surface for `api-001`: a `/docs/api` page with endpoint cards, method badges, paths, request and response examples, auth notes, and pagination/error examples. The page must document only implemented opengithub-owned APIs and every visible control/link must work.

**Key changes**:
- `web/src/app/docs/api/page.tsx`: render the API docs page using existing app styles, method badges, endpoint cards, schema/request/response examples, auth requirements, pagination examples, and error envelope examples.
- `web/src/lib/api-docs.ts` or component-local data: maintain an implemented-endpoint catalog covering user, repositories, issues, pulls, Actions, packages, and search with accurate request/response samples.
- Add a reachable link from an existing docs/developer surface if appropriate, without turning this into a marketing page.
- `web/tests/api-docs.test.tsx` and `web/tests/e2e/api-docs.spec.ts`: verify endpoint cards, method badges, examples, links, no `href="#"`, keyboard/tab behavior for any expandable examples, and mobile no-overflow.
- `qa-hints.json`: append `api-001` notes about REST parity limits, package blob/upload depth, Actions execution depth, pagination boundaries, and auth/PAT follow-up risk.

**Verification**: `make check && make test && make test-e2e`; browser smoke opens `/docs/api`, verifies every documented endpoint card and interaction, checks mobile layout, and saves `ralph/screenshots/build/api-001-docs.jpg`.

---

## Phase 5: Final API Contract Hardening - finish api-001 and hand off to QA

**Done**: [ ]

**Scope**: Lock down `api-001` as a coherent external REST surface. This phase should run cross-route contract tests, security probes, request-log checks, and final bookkeeping before setting `build_pass=true`.

**Key changes**:
- Add or extend a cross-route Rust contract test suite that probes representative endpoints for content type, envelope shape, auth failures, malformed JSON, validation failures, not-found behavior, conflict behavior, and redacted logs.
- Add a scenario script in `.scratch/` that runs against the live API with real Postgres and a real signed session, exercising user, repository, issue, pull, Actions, package, and search routes from outside the process.
- Verify request logging stores method/path/status/duration while redacting cookies, authorization headers, OAuth state, submitted credentials, and package/token secrets.
- Save final docs/API screenshots under `ralph/screenshots/build/` and append honest QA hints for unimplemented GitHub REST parity areas.
- Update `build-progress.txt` and `prd.json`; set `api-001.build_pass=true` only after all phases pass verification, leaving `qa_pass=false`.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; live scenario proves every implemented REST family returns standard envelopes and no placeholder/dead docs controls remain.
