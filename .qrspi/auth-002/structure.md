# Structure Outline: auth-002 Shared Session Protection

**Ticket**: `auth-002`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`
**Date**: 2026-04-30

## Phase 1: Rust Session Guard - protected API routes reject anonymous requests consistently

**Done**: [ ]

**Scope**: Turn the existing signed cookie/session helpers into reusable Axum request guards for protected JSON APIs. This phase should protect one narrow representative route before broader permission rewiring.

**Key changes**:
- `crates/api/src/auth/session.rs`: expose a typed current-user/session verification helper that distinguishes missing cookie, malformed cookie, expired/revoked session, and missing database without leaking internals.
- `crates/api/src/auth/extractor.rs` or `crates/api/src/auth/mod.rs`: add an `AuthenticatedUser` extractor or equivalent middleware-compatible helper that returns the standard JSON error envelope.
- `crates/api/src/api_types.rs`: add stable `unauthorized` and `forbidden` helpers if missing; preserve the existing error shape `{ error, status }`.
- `crates/api/src/routes/auth.rs`: keep `/api/auth/me` anonymous-friendly, but reuse the same verification primitive internally.
- `crates/api/tests/auth_route_guard.rs`: cover missing cookie -> 401 JSON, tampered cookie -> 401 JSON, revoked/expired session -> 401 JSON, valid session -> route success, and DB-unavailable behavior.

**Verification**: `make check && make test`; targeted Rust tests prove protected-route auth decisions are cookie/session based and do not rely on caller-supplied user IDs.

---

## Phase 2: Repository API Authorization - repo routes use the session identity and permission graph

**Done**: [ ]

**Scope**: Apply the guard to repository list/create/read routes and enforce read/write/admin permissions using the existing repository, organization, team, and permission tables.

**Key changes**:
- `crates/api/src/routes/repositories.rs`: remove client-controlled `user_id` and `created_by_user_id` from protected route contracts; derive actor identity from `AuthenticatedUser`.
- `crates/api/src/domain/permissions.rs`: add or tighten helpers for repository read/write/admin checks, including public repository reads and private repository denial.
- `crates/api/src/domain/repositories.rs`: ensure list/create/read operations accept actor IDs and return `RepositoryError::PermissionDenied` variants that map cleanly to 403.
- `crates/api/src/routes/issues.rs`, `crates/api/src/routes/pulls.rs`, and `crates/api/src/routes/search.rs`: either protect the existing mutation/search surfaces with the same guard or add explicit TODO-free route boundaries for public-vs-protected behavior in later feature phases.
- `crates/api/tests/repository_authz.rs`: cover anonymous list/create -> 401, authenticated owner create/list/read success, authenticated non-member private read -> 403 or 404 per chosen concealment policy, public read success, and team/member permission success.

**Verification**: `make check && make test`; Postgres-backed tests prove 401 vs 403 behavior and ensure protected APIs no longer trust request-body actor IDs.

---

## Phase 3: Next.js Middleware and Protected App Shell - UI routes share one session gate

**Done**: [ ]

**Scope**: Move protected-page gating out of individual pages into Next.js middleware and add a reusable signed-in app shell with avatar/menu and unauthenticated sign-in CTA behavior.

**Key changes**:
- `web/src/middleware.ts`: gate protected paths such as `/dashboard`, repository creation/settings pages, and future authenticated app routes by calling `GET /api/auth/me` with forwarded cookies; redirect anonymous users to `/login?next=<path>`.
- `web/src/lib/api.ts`: add middleware-safe session fetch support that does not depend on `next/headers` in client-incompatible contexts.
- `web/src/components/AppShell.tsx` or equivalent: add the GitHub-like header with logged-in avatar/menu/sign-out affordance and unauthenticated sign-in CTA for public pages.
- `web/src/app/dashboard/page.tsx`: simplify to render inside the shared shell and rely on middleware for anonymous redirects, while still handling degraded session responses defensively.
- `web/tests/auth-login.test.tsx`: add unit coverage for protected-path matching, next-path preservation, and header/menu rendering.

**Verification**: `make check && make test`; browser smoke with the dev server verifies `/dashboard` redirects when anonymous and renders the signed-in shell when a valid test session is present.

---

## Phase 4: End-to-End Auth Wall and Error UX - shared protection is regression-tested across UI and API

**Done**: [ ]

**Scope**: Lock the shared auth wall with Playwright coverage and QA hints so future feature work can safely build authenticated repository flows.

**Key changes**:
- `web/tests/e2e/auth.spec.ts`: extend existing E2E tests for middleware redirects, preserved `next` values, sign-in CTA behavior on public pages, and logout clearing protected access.
- `web/tests/e2e/auth.setup.ts`: create or document a deterministic local authenticated session fixture when a test database is available; keep real Google OAuth callback as a QA/deployment check, not a brittle local default.
- `crates/api/tests/auth_security.rs`: add API-level assertions for malformed auth headers/cookies, JSON 401/403 envelopes, no stack traces, and no cross-origin redirect regressions.
- `qa-hints.json`: record which protected routes, API status codes, and shell interactions were smoke-tested, plus the remaining real Google-account QA path.
- `prd.json`, `build-progress.txt`: after all phases pass, set `auth-002.build_pass=true`, leave `qa_pass=false`, and record verification evidence.

**Verification**: `make check && make test && make test-e2e`; browser smoke screenshot saved under `ralph/screenshots/build/`; API probes confirm protected `/api/*` routes return 401 JSON for anonymous callers and 403 JSON for authenticated-but-unauthorized callers.
