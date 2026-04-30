# Structure Outline: dashboard-001 Signed-In Dashboard Layout

**Ticket**: `dashboard-001`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, `ralph/screenshots/inspect/dashboard-redirect.jpg`
**Date**: 2026-04-30

## Phase 1: Top Repository Contract - dashboard API returns ranked sidebar-ready repository rows

**Done**: [x]

**Scope**: Extend the protected dashboard summary from generic repository records to the exact top-repository sidebar contract the UI needs, while preserving the existing onboarding empty state.

**Key changes**:
- `crates/api/migrations/202604300007_dashboard_repository_metadata.*.sql`: add lightweight dashboard metadata needed before full Git browsing ships, such as `repository_languages` and `recent_repository_visits`, with per-repository/user uniqueness and lookup indexes.
- `crates/api/src/domain/dashboard.rs`: add `DashboardTopRepository` with `ownerLogin`, `name`, `visibility`, `primaryLanguage`, `primaryLanguageColor`, `updatedAt`, `lastVisitedAt`, and `href`; rank by recent visit first, then repository activity/update time.
- `crates/api/src/routes/dashboard.rs`: keep `GET /api/dashboard` protected, return the enriched top repository list in the existing summary, and clamp pagination/filter input.
- `web/src/lib/api.ts`: add the typed top-repository DTO without removing the existing repository list fields that onboarding tests rely on.
- `crates/api/tests/dashboard_summary.rs` and `web/tests/dashboard-onboarding.test.tsx`: cover ranking, language metadata, empty state compatibility, and JSON casing.

**Verification**: `make check && make test`; targeted Postgres-backed tests seed repositories, languages, and visits to prove the sidebar contract is permission-aware and deterministic.

---

## Phase 2: Sidebar Interaction - repository filter and row navigation work like the signed-in GitHub dashboard

**Done**: [x]

**Scope**: Replace the current static top-repositories panel with the PRD sidebar: 296px desktop column, green `New` action, client-side repository filter, language dots, visibility badges, updated time, and clickable rows.

**Key changes**:
- `web/src/components/DashboardTopRepositories.tsx`: extract the sidebar into a focused client component with stable dimensions, accessible search label, case-insensitive filtering, empty-filter feedback, and no layout shift.
- `web/src/components/DashboardOnboarding.tsx`: compose `DashboardTopRepositories` above both empty and non-empty dashboard states instead of keeping sidebar markup inline.
- `web/src/app/[owner]/[repo]/page.tsx`: keep a real repository destination for clicked rows and avoid placeholder links.
- `web/tests/dashboard-onboarding.test.tsx`: assert filtering behavior, repository row hrefs, `New` href, language dot rendering, visibility badge rendering, and empty-sidebar CTAs.
- `web/tests/e2e/dashboard-dashboard.spec.ts`: add authenticated browser coverage for filtering, row click navigation, and `/new` navigation.

**Verification**: `make check && make test && make test-e2e`; Ever smoke verifies `/dashboard`, repository filtering, `/new`, and row navigation with a screenshot in `ralph/screenshots/build/`.

---

## Phase 3: Main Feed Layout - non-empty dashboard renders the fluid activity column

**Done**: [x]

**Scope**: Bring the main dashboard column up to the PRD shape: max 720px activity feed, stacked cards, non-empty repository activity placeholders, and optional right rail only on wide screens.

**Key changes**:
- `web/src/components/DashboardRepositoryFeed.tsx`: render stacked activity cards from `summary.recentActivity`, then assigned issues and review requests sections with GitHub-like borders, spacing, and compact typography.
- `crates/api/src/domain/dashboard.rs`: populate recent activity from repositories, latest commits, issue/PR updates when present, and fallback rows when those later domains are still empty.
- `web/src/app/dashboard/page.tsx`: use a responsive dashboard frame that stacks on mobile and constrains the feed column to `max-w-[720px]` on desktop.
- `web/tests/dashboard-onboarding.test.tsx`: cover non-empty feed rendering, no first-run welcome copy, repository activity link targets, and mobile-safe content strings.
- `crates/api/tests/dashboard_summary.rs`: cover recent activity ordering and absence of private repository leakage.

**Verification**: `make check && make test && make test-e2e`; browser smoke confirms the non-empty dashboard state with seeded repositories and activity.

---

## Phase 4: Responsive Polish and Regression Guardrails - lock dashboard interactions before PRD completion

**Done**: [ ]

**Scope**: Finish dashboard-001 by tightening visual parity, accessibility, dead-action checks, QA handoff notes, and PRD/build bookkeeping.

**Key changes**:
- `web/tests/e2e/dashboard-dashboard.spec.ts`: add dead-link/dead-button checks for the dashboard surface and viewport checks for desktop and mobile stacking.
- `ralph/screenshots/build/`: save signed-in empty sidebar, filtered sidebar, non-empty feed, and mobile dashboard screenshots.
- `qa-hints.json`: append honest QA notes for Google-authenticated dashboard access, ranking edge cases, repository language display, and responsive behavior.
- `build-progress.txt`: record the implemented phase, tests, browser smoke evidence, decisions, and files changed.
- `prd.json`: set `dashboard-001.build_pass=true` only after all phases pass; leave `qa_pass=false`.

**Verification**: `make check && make test && make test-e2e`; Ever browser smoke confirms every dashboard button, row, filter, empty state CTA, and mobile layout works without horizontal scroll.
