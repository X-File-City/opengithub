# Structure Outline: dashboard-003 Personalized Dashboard Feed Filters

**Ticket**: `dashboard-003`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, existing dashboard surfaces, and `ralph/screenshots/inspect/dashboard-redirect.jpg`
**Date**: 2026-04-30

## Phase 1: Feed Event Contract - persist and read permission-aware dashboard feed events

**Done**: [x]

**Scope**: Add the minimal durable feed-event layer needed for Following/For you tabs and event-type filters without replacing the existing issue/PR recent activity contract yet.

**Key changes**:
- `crates/api/migrations/202604300010_dashboard_feed_events.*.sql`: add `user_follows`, `organization_follows`, `repository_watches`, `repository_stars`, `repository_forks`, `releases`, and `feed_events` tables if equivalent tables do not already exist; include uniqueness constraints, actor/repository indexes, event-type indexes, and timestamps.
- `crates/api/src/domain/dashboard.rs`: add feed DTOs for `DashboardFeedEvent`, `DashboardFeedTab`, and supported event-type values; read visible events only through repository permissions, followed users/orgs, watched repositories, starred repositories, and the signed-in user's contributed repositories.
- `crates/api/src/routes/dashboard.rs`: extend `GET /api/dashboard` query parsing with `feedTab` and repeated or comma-separated `eventType` filters while preserving existing `repositoryFilter`, pagination clamping, and anonymous 401 behavior.
- `crates/api/examples/dashboard_e2e_seed.rs`: seed realistic following, watch, star, fork, release, push, issue, and pull-request feed events for browser and Playwright coverage.
- `crates/api/tests/dashboard_summary.rs`: cover visibility boundaries, Following vs For you source selection, event-type filtering, ordering, and empty filtered results against real Postgres.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`; targeted dashboard summary tests prove private events do not leak and filters are deterministic.

---

## Phase 2: Feed API Preferences - optional filter persistence and clearable defaults

**Done**: [x]

**Scope**: Let the dashboard remember a user's preferred feed tab and event filters while keeping query parameters authoritative for shareable/testable states.

**Key changes**:
- `crates/api/migrations/202604300011_dashboard_feed_preferences.*.sql`: add `dashboard_feed_preferences` keyed by `user_id`, storing default tab and event type list with updated timestamps.
- `crates/api/src/domain/dashboard.rs`: add `DashboardFeedPreferences` to `DashboardSummary`; validate supported event types server-side and normalize duplicates.
- `crates/api/src/routes/dashboard.rs`: add protected `PUT /api/dashboard/feed-preferences` and `DELETE /api/dashboard/feed-preferences`; return standard error envelopes for invalid tabs/types.
- `web/src/lib/api.ts`: add typed dashboard feed event, preference, tab, and event-type DTOs plus same-origin proxy helpers for preference writes.
- `crates/api/tests/dashboard_feed_preferences.rs` and `web/tests/dashboard-onboarding.test.tsx`: cover persistence, reset behavior, invalid input errors, and query-overrides-preference behavior.

**Verification**: `make check && make test`; targeted Rust tests use real Postgres and frontend unit tests verify request bodies and preference fallbacks.

---

## Phase 3: Dashboard Feed Controls - Following/For you tabs and event filter dropdown work in the UI

**Done**: [ ]

**Scope**: Replace the static "Recent activity" section with the PRD feed surface: segmented Following/For you tabs, right-aligned Filter dropdown, checkbox event types, clear filters action, and feed cards with actor/repository metadata.

**Key changes**:
- `web/src/components/DashboardRepositoryFeed.tsx`: split the issue/PR activity rendering into a focused dashboard feed component with tab buttons, accessible dropdown state, checkbox filters, clear action, and stable desktop/mobile dimensions.
- `web/src/app/dashboard/page.tsx`: read `feedTab` and `eventType` search params, pass them into `getDashboardSummary`, and preserve selected filters in generated links without full client-side routing hacks.
- `web/src/lib/api.ts` and `web/src/lib/server-session.ts`: forward feed query params to Rust and type `summary.feedEvents`, `summary.feedPreferences`, and `summary.supportedFeedEventTypes`.
- `web/tests/dashboard-onboarding.test.tsx`: assert Following/For you rendering, dropdown open/close behavior, checked states, clear filters CTA, event cards, star/follow action affordances, and no inert buttons or `href="#"`.
- `web/tests/e2e/dashboard-dashboard.spec.ts`: add signed-in browser coverage for switching tabs, applying event filters, clearing filters, and clicking feed card repository/item links.

**Verification**: `make check && make test && make test-e2e`; browser smoke uses a real signed session to verify all tab/filter controls and saves a screenshot under `ralph/screenshots/build/`.

---

## Phase 4: Feed Visual Polish and Regression Guardrails - finish dashboard-003 and hand off to QA

**Done**: [ ]

**Scope**: Lock the filtered feed behavior across empty, dense, desktop, and mobile states; update bookkeeping only after all verification passes.

**Key changes**:
- `web/tests/e2e/dashboard-dashboard.spec.ts`: add dead-link/dead-button checks for feed controls, keyboard interaction for the filter dropdown, desktop alignment of the right-side filter, mobile stacking, and no horizontal overflow.
- `ralph/screenshots/build/`: save Following feed, For you feed, filtered empty state, filter dropdown, and mobile feed screenshots from local smoke testing.
- `qa-hints.json`: append dashboard-003 notes for permission boundaries, recommendation-source ranking, filter persistence, dense feed truncation, and mobile/dropdown accessibility.
- `build-progress.txt`: record implemented phase, tests, browser smoke evidence, decisions, and files changed.
- `prd.json`: set `dashboard-003.build_pass=true` only after all phases are done and verified; leave `qa_pass=false`.

**Verification**: `make check && make test && make test-e2e`; Ever or Playwright smoke confirms every dashboard feed tab, filter checkbox, clear action, feed link, and optional star/follow action works end-to-end.
