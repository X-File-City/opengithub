# Structure Outline: onboarding-001 First-Run Dashboard Onboarding

**Ticket**: `onboarding-001`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`
**Date**: 2026-04-30

## Phase 1: Dashboard Hint Persistence - dismissed onboarding hints are user-scoped API state

**Done**: [x]

**Scope**: Add the durable data model and protected API endpoints for per-user dashboard hint dismissal without changing the dashboard UI yet.

**Key changes**:
- `crates/api/migrations/202604300006_dashboard_onboarding.*.sql`: create `dashboard_hint_dismissals` with `user_id`, `hint_key`, `dismissed_at`, a per-user unique key, and an index for dashboard lookups.
- `crates/api/src/domain/onboarding.rs`: add helpers to list, dismiss, and restore dashboard hints using the authenticated user ID.
- `crates/api/src/routes/onboarding.rs`: expose protected routes such as `GET /api/dashboard/onboarding`, `POST /api/dashboard/onboarding/hints/:hint_key/dismiss`, and `DELETE /api/dashboard/onboarding/hints/:hint_key`.
- `crates/api/src/routes/mod.rs` and `crates/api/src/lib.rs`: wire the dashboard onboarding routes under the existing auth/session guard.
- `crates/api/tests/dashboard_onboarding.rs`: cover anonymous 401 envelopes, user-scoped hint persistence, idempotent dismiss, restore, and no cross-user leakage.

**Verification**: `make check && make test`; targeted Postgres-backed Rust tests prove hint dismissal uses real tables and signed-session auth.

---

## Phase 2: Dashboard Data Contract - the API returns repositories, activity placeholders, and onboarding state

**Done**: [x]

**Scope**: Add a single protected dashboard summary API that reads the current user, repository list, and dismissed hints, giving the frontend one stable contract for empty and non-empty dashboard states.

**Key changes**:
- `crates/api/src/domain/dashboard.rs`: compose current user repository data from `list_repositories_for_user`, onboarding hint keys, and empty placeholders for recent activity, assigned issues, and review requests until those feature domains ship richer feeds.
- `crates/api/src/routes/dashboard.rs`: expose `GET /api/dashboard` with `{ user, repositories, recentActivity, assignedIssues, reviewRequests, dismissedHints }`.
- `crates/api/src/api_types.rs`: reuse the shared error envelope and list envelope shape where useful; keep JSON field names camelCase for Next.js.
- `crates/api/tests/dashboard_summary.rs`: cover zero repositories, one repository switching `hasRepositories` true, dismissed hint inclusion, pagination bounds for top repositories, and database-unavailable behavior.
- `web/src/lib/api.ts`: add typed `DashboardSummary`, repository DTOs, and a cookie-forwarding server fetch helper for `/api/dashboard`.

**Verification**: `make check && make test`; real Postgres scenario in `.scratch/` exercises session cookie -> dashboard API -> repository state transition.

---

## Phase 3: First-Run Dashboard UI - signed-in zero-repository users see the GitHub-style onboarding empty state

**Done**: [x]

**Scope**: Replace the placeholder `/dashboard` content with the PRD empty state inside the existing `AppShell`, plus local docs/import placeholder routes required by the CTAs.

**Key changes**:
- `web/src/app/dashboard/page.tsx`: fetch the dashboard summary server-side, render the two-column layout, empty `Top repositories` panel, repository search input, green `New` button, and bordered welcome panel when `repositories.total === 0`.
- `web/src/components/DashboardOnboarding.tsx`: add the Primer-style empty state with CTAs for `/new`, `/new/import`, and `/docs/get-started`, compact 14px body text, 6px borders, and no dead buttons.
- `web/src/app/new/import/page.tsx`: add an authenticated placeholder page that explains import is coming and links back to create a repository.
- `web/src/app/docs/get-started/page.tsx`: add a local setup guide page reachable from the onboarding CTA.
- `web/tests/dashboard-onboarding.test.tsx`: cover empty-state rendering, CTA hrefs, absence of dead placeholder actions, and the switch away from welcome copy when repositories exist.

**Verification**: `make check && make test && make test-e2e`; browser smoke with Ever verifies `/dashboard` empty state, each CTA navigation, and a screenshot is saved under `ralph/screenshots/build/`.

---

## Phase 4: Dismissible Hints and Non-Empty Dashboard State - UI writes hint state and changes after repository creation

**Done**: [x]

**Scope**: Connect dismiss buttons to the Rust API and render the non-empty repository/activity dashboard once at least one repository exists.

**Key changes**:
- `web/src/components/DashboardOnboarding.tsx`: turn each dismiss affordance into a real client action that calls the hint dismissal API, shows success/error feedback, and removes only that hint from the page.
- `web/src/components/DashboardRepositoryFeed.tsx`: render the non-empty dashboard state with top repositories, recent activity placeholder rows, assigned issues, and review requests without showing first-run welcome copy.
- `web/src/app/dashboard/actions.ts` or route handlers: implement server actions/proxy helpers for dismiss/restore that forward the signed session cookie to the Rust API.
- `web/tests/dashboard-onboarding.test.tsx`: add coverage for dismiss success/error states and non-empty repository feed behavior.
- `web/tests/e2e/dashboard-onboarding.spec.ts`: add authenticated browser coverage for empty state, dismiss persistence across reload, and seeded repository state switching to the non-empty feed.

**Verification**: `make check && make test && make test-e2e`; `.scratch/` scenario seeds a real user/session, dismisses a hint over HTTP, creates a repository through `/api/repos`, and observes the dashboard summary change.

---

## Phase 5: QA Handoff and Visual Polish - lock the dashboard against interaction regressions

**Done**: [ ]

**Scope**: Final hardening for the onboarding feature: visual comparison against GitHub-like dashboard references, accessibility checks for the form/CTA controls, QA hints, and PRD completion.

**Key changes**:
- `web/tests/e2e/dashboard-onboarding.spec.ts`: ensure every CTA/button has a working target or API call, no `href="#"`, and no inert `onClick` paths.
- `ralph/screenshots/build/`: save final anonymous redirect, empty dashboard, dismissed-hint dashboard, and non-empty dashboard screenshots.
- `qa-hints.json`: append honest QA notes for real Google login, repository creation integration, dismiss persistence, and visual/a11y areas to re-check.
- `build-progress.txt`: record files changed, tests run, browser smoke evidence, and decisions.
- `prd.json`: set `onboarding-001.build_pass=true` only after all phases pass; leave `qa_pass=false`.

**Verification**: `make check && make test && make test-e2e`; Ever browser smoke confirms primary dashboard flow end-to-end and Playwright keeps it repeatable.
