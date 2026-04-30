# Structure Outline: auth-001 Google OAuth Login

**Ticket**: `auth-001`
**Design**: `build-spec.md`, `target-docs/auth-flow.md`, `prd.json`
**Date**: 2026-04-30

## Phase 1: OAuth Configuration and Start Route — Google redirect can be initiated

**Done**: [x]

**Scope**: Add the Rust auth module, environment contract, OAuth client construction, state/next-url handling, and `GET /api/auth/google/start`. This phase is testable without a live Google callback by asserting generated redirects and validation behavior.

**Key changes**:
- `Cargo.toml`, `crates/api/Cargo.toml`: Add required auth/runtime dependencies only after installing/registering them in the manifests: `oauth2`, `tower-sessions`, `base64`/HMAC or equivalent cookie-signing support if not already covered by the chosen session stack.
- `crates/api/src/config.rs`: Add `AppConfig`/`AuthConfig` loaded from env: `APP_URL`, `API_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SESSION_SECRET`, session cookie name, and secure-cookie mode.
- `crates/api/src/auth/mod.rs`: Add OAuth client construction, CSRF state encoding, `next` URL sanitization, and constants for Google auth/token/userinfo URLs.
- `crates/api/src/routes/auth.rs`: Add `GET /api/auth/google/start` returning a 302 to Google with scopes for profile/email, state, and callback URL.
- `.env.example`, `BUILD_GUIDE.md`: Document required auth env vars and local/prod redirect URIs.
- `crates/api/tests/auth_oauth_start.rs`: Assert missing config fails safely, malicious `next` is rejected or normalized, and valid start requests redirect to Google with state.

**Verification**: `make check && make test`; direct request to `/api/auth/google/start?next=/dashboard` returns 302 with Google authorization URL when config is present.

---

## Phase 2: Callback, Session Cookie, and Auth API — login state is persisted

**Done**: [x]

**Scope**: Complete the Rust-owned auth loop after Google redirects back: exchange code, fetch userinfo, upsert identity rows, persist a signed Postgres-backed session, expose `GET /api/auth/me`, and support logout.

**Key changes**:
- `crates/api/src/auth/session.rs`: Add session ID generation, signed cookie issue/verify helpers, expiry policy, and database persistence using existing `sessions` helpers.
- `crates/api/src/auth/google.rs`: Add token exchange and userinfo fetch abstraction with testable trait/client boundary.
- `crates/api/src/routes/auth.rs`: Add `GET /api/auth/google/callback`, `GET /api/auth/me`, and `POST /api/auth/logout`; failures redirect to `/login?error=oauth_failed` or return the standard JSON error envelope for API calls.
- `crates/api/src/domain/identity.rs`: Add any missing lookup helpers needed by session extraction, such as `get_user_by_session_id`.
- `crates/api/src/lib.rs`: Wire auth routes and state config; keep `/health` HTTP 200 even if auth config or DB is absent.
- `crates/api/tests/auth_callback_session.rs`: Use a local fake Google client to assert user/account upsert, signed `__Host-session` cookie, `/api/auth/me` authenticated/anonymous shapes, expired/revoked session rejection, and logout revocation.

**Verification**: `make check && make test`; Postgres-backed test with `TEST_DATABASE_URL` proves callback -> session -> `/api/auth/me` -> logout.

---

## Phase 3: Next.js Login and Protected Shell — users can enter and leave auth-walled pages

**Done**: [x]

**Scope**: Scaffold `web/` if still absent, add the compact opengithub login page, API client primitives, protected dashboard route, and redirect behavior for unauthenticated users. The UI remains a thin client over the Rust API.

**Key changes**:
- `web/`: If absent, scaffold with the prescribed Next.js command, then install/register Biome, Vitest, and Playwright scripts per `BUILD_GUIDE.md`.
- `web/src/lib/api.ts`: Add typed `getSession()`/`logout()` helpers against the Rust API with credentials included.
- `web/src/app/login/page.tsx`: Add the centered GitHub-style auth card matching `ralph/screenshots/inspect/auth-login.jpg` but with one `Continue with Google` button and no password/email fields.
- `web/src/app/dashboard/page.tsx`: Add a minimal protected dashboard shell that renders authenticated user identity or redirects to `/login?next=/dashboard`.
- `web/src/app/logout/route.ts` or equivalent server action: Call Rust logout and redirect to `/`.
- `web/src/app/globals.css`, shared components: Add restrained GitHub-like tokens for neutral background, compact card, focus states, and full-width primary button.
- `web/tests/auth-login.test.tsx`: Assert login page URL construction, inline error rendering, and no password/signup/passkey fields.

**Verification**: `make check && make test`; browser smoke with the dev server verifies `/login` renders, the Google button navigates to `/api/auth/google/start`, and `/dashboard` redirects to `/login?next=/dashboard` when anonymous.

---

## Phase 4: E2E Auth Foundation and Hardening — future auth-walled tests have a reliable base

**Done**: [x]

**Scope**: Add the Playwright/Ever-compatible auth testing foundation, cookie/security hardening, and user-facing failure states needed before other protected features rely on auth.

**Key changes**:
- `web/playwright.config.ts`, `web/tests/e2e/auth.setup.ts`: Add setup project and stored auth-state path ignored by `.gitignore`; use Google OAuth test account only when credentials are available, otherwise keep deterministic anonymous/login smoke tests.
- `web/tests/e2e/auth.spec.ts`: Cover anonymous redirect, login page rendering, OAuth start redirect, callback error rendering, and logout redirect.
- `crates/api/src/routes/auth.rs`, `crates/api/src/auth/session.rs`: Harden cookie attributes (`HttpOnly`, `Secure` outside local dev, `SameSite=Lax`, `Path=/`), CSRF/state expiry, and open-redirect rejection.
- `crates/api/tests/auth_security.rs`: Assert no stack traces or secrets in auth errors, unsafe `next` values do not redirect off-site, revoked/expired cookies fail, and logout is idempotent.
- `qa-hints.json`: Record what was covered and where QA should use the real Google test account for end-to-end callback verification.

**Verification**: `make check && make test && make test-e2e`; browser smoke screenshot saved under `ralph/screenshots/build/`; then set `auth-001.build_pass=true` in `prd.json`.
