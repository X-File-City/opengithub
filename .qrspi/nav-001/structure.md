# Structure Outline: nav-001 Global Site Map Routes and Navigation Skeleton

**Ticket**: `nav-001`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, `sitemap.md`, `web/AGENTS.md`, `design/project/Prototype.html`, `design/project/og-shell.jsx`, `design/project/og-screens-1.jsx`, `design/project/og-screens-2.jsx`, `design/project/og-screens-3.jsx`, and the current `AppShell` / repository route implementation.
**Date**: 2026-05-01

## Phase 1: Route Registry and Protected Placeholder Contract - known sitemap entries never 404

**Done**: [ ]

**Scope**: Create a typed navigation registry for the signed-in sitemap and add the highest-traffic global destinations that still lack route files. This phase should make dashboard, global issues, pulls, notifications, search, repository creation/import, developer docs, and account settings route through one shared contract with protected-session handling and explicit not-yet-built states.

**Key changes**:
- `web/src/lib/navigation.ts`: add route metadata for global app destinations, settings sections, repository tabs, profile/org tabs, and helper functions for active-state matching.
- `web/src/components/PlaceholderPage.tsx` or equivalent: add a reusable Editorial empty state with concrete CTAs, no inert links, and copy that distinguishes "not built yet" from missing resources.
- `web/src/app/codespaces/page.tsx`, `web/src/app/settings/account/page.tsx`, `web/src/app/settings/emails/page.tsx`, `web/src/app/settings/notifications/page.tsx`, `web/src/app/settings/appearance/page.tsx`, `web/src/app/settings/security/page.tsx`, `web/src/app/settings/keys/page.tsx`, and other sitemap-backed global/settings routes as needed: render protected placeholders or thin current-data pages through `AppShell`.
- `web/src/lib/protected-routes.ts` and `web/src/proxy.ts`: keep all new signed-in routes auth-walled with `next` redirect preservation.
- `web/tests/navigation-routes.test.tsx` and/or route-registry tests: assert every registry entry has a real route target, no `href="#"`, active matching is deterministic, and protected destinations are covered.

**Verification**: `make check && make test`; targeted route tests prove the registry destinations exist and protected route matching includes every new signed-in route. Browser smoke is optional for this registry-heavy slice.

---

## Phase 2: Repository Workspace Navigation Skeleton - owner/repo tabs preserve context

**Done**: [ ]

**Scope**: Upgrade repository pages so the owner/repo header, visibility badge, action area, and horizontal tab set are reusable across Code, Issues, Pull requests, Actions, Projects, Wiki, Security, Insights, and Settings. Tabs must preserve owner/repo context and render real pages or explicit Editorial empty states instead of 404s.

**Key changes**:
- `web/src/components/RepositoryShell.tsx`: extract repository breadcrumb/header, visibility chip, permission-aware action area, and tab navigation from `RepositoryCodeOverview`.
- `web/src/lib/navigation.ts`: expose repository tab definitions with active matching for nested paths such as `issues/{number}`, `pull/{number}/files`, `actions/runs/{id}`, and `settings/*`.
- `web/src/app/[owner]/[repo]/**/page.tsx`: add route files for missing tab roots and common nested skeletons from `sitemap.md`, using `getRepository` for permission and visibility decisions.
- `web/src/components/RepositoryPlaceholderPage.tsx`: align with `RepositoryShell` so placeholders keep breadcrumbs, tabs, and "Back to Code" fallback without duplicating layout.
- Tests: cover public/private repository route access, Settings tab visibility based on `viewerPermission`, active tab selection, nested route matching, and context-preserving tab hrefs.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`; Playwright smoke opens a seeded repository, clicks every tab, verifies no 404s/dead controls, and saves `ralph/screenshots/build/nav-001-phase2-repository-tabs.jpg`.

---

## Phase 3: Settings Shell and Section Navigation - account and repository settings share stable sidebars

**Done**: [ ]

**Scope**: Add reusable settings layouts for personal settings and repository settings. Sidebar links should highlight the active section, preserve each section's local form state only within that section, and render right-column form/card content or explicit empty states.

**Key changes**:
- `web/src/components/SettingsShell.tsx`: add personal settings sidebar with Profile, Account, Emails, Notifications, Appearance, Security, Sessions, Keys, and Tokens sections.
- `web/src/components/RepositorySettingsShell.tsx`: add permission-gated repository settings sidebar with General, Access, Branches, Actions, Hooks, Pages, Secrets, Tags, and Security analysis sections.
- `web/src/app/settings/*/page.tsx` and `web/src/app/[owner]/[repo]/settings/**/page.tsx`: route through the relevant shell, using real data where already available and Editorial placeholders elsewhere.
- `web/tests/settings-navigation.test.tsx`: assert active item highlighting, sidebar destinations, protected routing, no cross-section uncontrolled form leakage, and no inert settings controls.
- `web/tests/e2e/navigation-settings.spec.ts`: authenticated smoke through personal and repository settings sidebars with desktop/mobile screenshots.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke verifies sidebar active states and saves `ralph/screenshots/build/nav-001-phase3-settings-shell.jpg`.

---

## Phase 4: Profiles, Organizations, and Search Entry Routes - people/org destinations resolve cleanly

**Done**: [ ]

**Scope**: Add skeletons for user profiles, organization profiles, organization creation, teams, and search type routes so global navigation, repository owner links, and app shell links land on concrete pages. This phase should read route params (`owner`, `org`, `team_slug`, `q`, `type`) and render permission-aware empty states where deeper feature data is not implemented yet.

**Key changes**:
- `web/src/app/[owner]/page.tsx`: render a profile/org resolver shell with tabs for Overview, Repositories, Projects, Packages, Stars, People, and Teams as applicable.
- `web/src/app/orgs/[org]/projects/**`, `web/src/app/orgs/[org]/settings/**`, `web/src/app/[org]/[team_slug]/page.tsx`, and `web/src/app/organizations/new/page.tsx`: add route skeletons for organization/team destinations from `sitemap.md`.
- `web/src/app/search/page.tsx`: extend current placeholder with type-aware tabs for repositories, code, issues, pull requests, commits, users, and organizations while preserving the existing query form.
- `web/src/lib/navigation.ts`: add profile/org/search tab helpers with deterministic active matching and URL query preservation.
- Tests: cover owner/org/team route param decoding, search query/type preservation, profile/org tab links, and no collision with repository `/{owner}/{repo}` routes.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke follows owner links, org links, team links, and search type tabs without 404s.

---

## Phase 5: Cross-Route Navigation Guardrails and QA Handoff - finish nav-001

**Done**: [ ]

**Scope**: Lock down the navigation skeleton across desktop, mobile, auth redirects, repository workspaces, profiles, organizations, search, notifications, and settings. Mark `nav-001` complete only after route coverage, visual screenshots, dead-control scans, and bookkeeping are done.

**Key changes**:
- `web/tests/e2e/navigation-sitemap.spec.ts`: sweep all `web/src/lib/navigation.ts` destinations with a real signed session, verify status/no 404 text, active nav state, no horizontal overflow, and no placeholder `href="#"` or empty buttons.
- `web/tests/e2e/app-shell.spec.ts` and existing route tests: extend coverage for new menu/sidebar/tab destinations and mobile drawer links.
- `ralph/screenshots/build/`: save final screenshots for global route placeholder, repository tabs, personal settings shell, repository settings shell, profile/org skeleton, search type tabs, and mobile navigation.
- Mandatory Editorial banned-value scan before commit: `rg -nE '#(0969da|1f883d|1a7f37|cf222e|82071e|f6f8fa|1f2328|d0d7de|59636e|f1aeb5|fff1f3)\b|@primer/|Octicon' web/src/ --glob '!**/og*.css'`.
- `qa-hints.json`: append `nav-001` notes covering route-priority gaps, permission-gated Settings visibility, ambiguous profile-vs-repository slugs, mobile drawer coverage, and unimplemented deeper page behaviors.
- `build-progress.txt` and `prd.json`: record verification evidence and set `nav-001.build_pass=true` only after every phase is complete; leave `qa_pass=false`.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke proves all sitemap skeleton destinations render real pages or explicit Editorial empty states, every navigation control opens/navigates/submits, and no known route falls through to a 404.
