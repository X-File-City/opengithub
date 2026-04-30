# Structure Outline: layout-001 Signed-In App Shell

**Ticket**: `layout-001`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, existing auth/dashboard/repository code, and `ralph/screenshots/inspect/dashboard-redirect.jpg`, `repo-code-overview.jpg`, `notifications-inbox.jpg`, `profile-user-overview.jpg`
**Date**: 2026-05-01

## Phase 1: Shell Context Contract - signed-in pages have one data source for global navigation

**Done**: [x]

**Scope**: Add the Rust and Next.js data contract that the app shell needs: current user, unread notification count, recent repositories, organization/team memberships, and quick-link metadata. Keep existing dashboard/repository pages visually unchanged except for consuming the shared shell context.

**Key changes**:
- `crates/api/src/domain/app_shell.rs`: add `AppShellContext`, `AppShellRepository`, `AppShellOrganization`, `AppShellTeam`, and helpers that derive only permission-visible data for the signed-in user.
- `crates/api/src/routes/app_shell.rs`: add protected `GET /api/app-shell` returning the shell context with standard auth/error envelopes and bounded result counts.
- `crates/api/src/lib.rs`, `crates/api/src/domain/mod.rs`, `crates/api/src/routes/mod.rs`: wire the new route/domain module.
- `web/src/lib/api.ts`: add typed shell-context DTOs and `getAppShellContextFromCookie`.
- `web/src/lib/server-session.ts`: expose a server helper that loads session and shell context without duplicating cookie forwarding.
- `crates/api/tests/app_shell_context.rs` and focused frontend tests: cover anonymous 401, visible private/public recent repositories, org/team membership filtering, unread notification count, empty states, and DB-unavailable behavior.

**Verification**: `make check && make test`; targeted Postgres-backed tests prove the shell context is auth-scoped and does not leak private repositories or organization memberships.

---

## Phase 2: Desktop Header Interactions - global navigation, search entry, create menu, notifications, and avatar menu work

**Done**: [x]

**Scope**: Replace the minimal `AppShell` header with a GitHub-style sticky desktop header for signed-in pages. Every visible control must have a real target or stateful menu: GitHub mark to `/dashboard`, hamburger/global menu trigger, search/jump input to search, create plus menu, Issues/Pull requests quick links, notifications link with unread badge, and avatar menu with profile/settings/sign-out.

**Key changes**:
- `web/src/components/AppShell.tsx`: compose the shell from the loaded context, keep dense 32px controls, add keyboard-accessible menu buttons, and preserve the anonymous sign-in state for public usage.
- `web/src/components/AppHeader.tsx`: new focused client component for interactive header controls, including menus and outside-click/escape close behavior.
- `web/src/app/dashboard/page.tsx`, `web/src/app/[owner]/[repo]/page.tsx`, `web/src/app/new/page.tsx`, and settings/docs pages as needed: consume the shared shell context instead of ad hoc session-only wrappers.
- `web/src/app/issues/page.tsx`, `web/src/app/pulls/page.tsx`, `web/src/app/notifications/page.tsx`, `web/src/app/settings/profile/page.tsx`: add lightweight signed-in destinations when missing so header links never route to 404 placeholders.
- `web/tests/app-shell.test.tsx` and `web/tests/e2e/app-shell.spec.ts`: cover menu opening/closing, link targets, search form submission, create-menu destinations, notification badge rendering, avatar menu actions, and absence of inert `href="#"` or empty handlers.

**Verification**: `make check && make test && make test-e2e`; browser smoke signs in with a real Rust session, opens every desktop header menu/control, follows each link, searches from the jump input, signs out through the avatar menu, and saves a desktop screenshot in `ralph/screenshots/build/`.

---

## Phase 3: Mobile Drawer and Responsive Frame - signed-in navigation collapses cleanly below desktop widths

**Done**: [x]

**Scope**: Implement the hamburger drawer and responsive page frame. Mobile should collapse global navigation into a drawer with recent repositories, organizations/teams, projects/quick links, and primary app links while repository workspaces remain full-width and dashboard/settings pages keep centered containers.

**Key changes**:
- `web/src/components/AppHeader.tsx`: add mobile drawer state, focus management, escape/backdrop close, and drawer content backed by the Phase 1 shell context.
- `web/src/components/AppShell.tsx`: define `contentMode` or equivalent layout props for centered dashboard/settings pages versus full-width repository workspaces.
- `web/src/components/AppShellFrame.tsx` or local layout helper: centralize max-width rules so dashboard pages use centered containers and repository workspaces can span the viewport without nested card shells.
- `web/src/lib/protected-routes.ts` and `web/src/proxy.ts`: ensure newly linked signed-in destinations remain protected and preserve `next` redirects.
- `web/tests/app-shell.test.tsx` and Playwright viewport coverage: cover drawer content, focus/escape behavior, mobile no-horizontal-scroll, protected redirects for header destinations, and repository workspace full-width behavior.

**Verification**: `make check && make test && make test-e2e`; browser smoke validates desktop and mobile viewports, drawer interactions, quick-link navigation, avatar menu behavior, and repository/dashboard frame widths with screenshots in `ralph/screenshots/build/`.

---

## Phase 4: Cross-Page Polish and QA Handoff - finish layout-001 with accessibility and regression guardrails

**Done**: [x]

**Scope**: Tighten visual parity and behavior across all signed-in pages touched so the shell can serve as the foundation for later features. Complete bookkeeping only after all shell interactions, responsive states, and auth redirects are verified.

**Key changes**:
- `web/tests/e2e/app-shell.spec.ts`: add dead-link/dead-button checks across dashboard, repository overview, new repository, notifications, issues, pulls, and settings destinations.
- `web/src/app/globals.css` and shell components: polish color contrast, focus rings, sticky layering, menu shadows, text truncation, and stable dimensions without introducing decorative gradients or nested cards.
- `ralph/screenshots/build/`: save desktop header, create menu, avatar menu, mobile drawer, centered dashboard frame, and full-width repository workspace screenshots.
- `qa-hints.json`: append layout-001 notes covering cross-page auth, keyboard navigation, screen reader labels, notification count edge cases, long usernames/repository names, and mobile drawer behavior.
- `build-progress.txt`: record implemented phase, verification evidence, browser smoke evidence, decisions, and changed files.
- `prd.json`: set `layout-001.build_pass=true` only after all phases are complete and verified; leave `qa_pass=false`.

**Verification**: `make check && make test && make test-e2e`; Ever or Playwright smoke confirms every shell control opens, navigates, submits, or signs out as intended on desktop and mobile, with no placeholder actions or unauthorized content leakage.
