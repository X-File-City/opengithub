# Structure Outline: issues-001 Repository Issue List

**Ticket**: `issues-001`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, `web/AGENTS.md`, `design/project/Prototype.html`, `design/project/og-screens-4.jsx`, current `crates/api/src/domain/issues.rs`, current `crates/api/src/routes/issues.rs`, current `web/src/components/RepositoryShell.tsx`, and current `web/src/app/[owner]/[repo]/issues/page.tsx`.
**Date**: 2026-05-01

## Phase 1: Issue List Contract - API returns the screen-ready issue row model

**Done**: [x]

**Scope**: Extend the existing session-authenticated issue list from a raw `Issue` envelope into a repository issue list contract that includes the data the UI needs: open/closed counts, author, labels, milestone, assignees, comment count, linked pull request hint, repository context, permissions, and URL-backed query metadata. Public repositories remain readable; private repositories require permission.

**Key changes**:
- `crates/api/src/domain/issues.rs`: add an `IssueListItem`/`IssueListView` projection helper that joins issues, users, labels, milestones, assignees, comments, and linked pull requests while preserving `RepositoryRole::Read` checks and excluding pull-request backing issues from the issue tab.
- `crates/api/src/routes/issues.rs`: accept `q`, `state`, `labels`, `milestone`, `assignee`, `sort`, `page`, and `page_size`/`pageSize`; normalize the default query to `is:issue state:open`; return the standard list envelope plus counts and active filter metadata.
- `web/src/lib/api.ts`: add typed issue-list DTOs and a server-side fetch helper that forwards the signed session cookie and handles standard error envelopes.
- `crates/api/tests/api_repository_issues_list_contract.rs`: seed real repositories/issues/labels/milestones/comments and assert public/private access, open/closed counts, filter parsing, pagination clamps, comment counts, label metadata, and no stack/cookie/secret leakage.
- `.scratch/issues-001-list-contract-scenario.sh`: run the real Postgres API scenario without mocks.

**Verification**: targeted Rust contract scenario passes, then `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`. Browser smoke is not required in this phase because it only changes the API/view-model contract.

---

## Phase 2: Repository Issues Page - default open list renders real data

**Done**: [x]

**Scope**: Replace the placeholder `/{owner}/{repo}/issues` route with an Editorial repository issue list that fetches Phase 1 data server-side and renders the default `is:issue state:open` list with repository tabs, heading, query input, Labels/Milestones links, New issue link, Open/Closed tabs, and dense issue rows.

**Key changes**:
- `web/src/app/[owner]/[repo]/issues/page.tsx`: fetch repository metadata and issue list data, preserve URL search params, and render the real page inside `RepositoryShell`.
- `web/src/components/RepositoryIssuesPage.tsx`: new screen component using `.input`, `.btn`, `.chip`, `.tabs`, `.list-row`, `.t-*` classes and Editorial tokens only; no GitHub color literals or Primer/Octicon imports.
- `web/src/lib/navigation.ts`: add helpers for issue-list tab/filter hrefs and issue detail hrefs that preserve query state where appropriate.
- `web/tests/repository-issues.test.tsx`: cover default open query rendering, row links, label/milestone/comment metadata, empty states, accessible controls, and no inert links/buttons.
- `web/tests/e2e/repository-issues.spec.ts`: seed a signed-session repository with real issues and verify the open list, row navigation, and screenshot.

**Verification**: `make check`, `make test`, and focused Playwright for `repository-issues.spec.ts`; browser smoke saves `ralph/screenshots/build/issues-001-phase2-open-list.jpg`.

---

## Phase 3: URL Filters and Empty States - search, tabs, sorting, and clear query work

**Done**: [x]

**Scope**: Make the issue query builder and filter controls functional. Typing a query or choosing state/sort/label/milestone filters updates the URL and results. Open/Closed tabs switch state filters, empty results show a no-results state, and the clear-query affordance resets to the default open issue query.

**Key changes**:
- `crates/api/src/domain/issues.rs`: expand query parsing enough for `is:issue`, `state:open|closed`, `label:<name>`, `milestone:<title>`, `assignee:<login>|@me`, and plain text title/body search; keep invalid or unsupported terms bounded and non-leaky.
- `crates/api/src/routes/issues.rs`: return validation envelopes for malformed filters and stable pagination metadata for filtered results.
- `web/src/components/RepositoryIssuesPage.tsx`: wire search form submission, open/closed tab hrefs, sort menu links, label/milestone filter chips, pagination controls, and clear-query link; every button/link must have a real destination or handler.
- Tests: assert saved URL filters round-trip through API and UI, state tabs preserve non-state filters, empty states clear back to the default query, and mobile layout has no horizontal overflow.

**Verification**: targeted API query tests, Vitest issue-filter tests, and Playwright flows for open/closed tabs, text search, clear query, and pagination; screenshot `ralph/screenshots/build/issues-001-phase3-filtered-empty.jpg`.

---

## Phase 4: Issue List Preferences and Contributor Banner - dismiss persists per viewer/repository

**Done**: [x]

**Scope**: Add the dismissible contributor guidance banner and persist dismissal for the signed-in viewer and repository. The banner should appear on first view, hide immediately on dismiss, stay hidden on reload for that viewer/repository, and never block public read-only issue browsing.

**Key changes**:
- `crates/api/migrations/*_repository_issue_preferences.*.sql`: add `repository_issue_preferences` keyed by `repository_id` and `user_id`, with `dismissed_contributor_banner_at` and timestamps.
- `crates/api/src/domain/issues.rs`: add preference read/update helpers gated by repository read access.
- `crates/api/src/routes/issues.rs`: include issue-list preferences in the list view and add `PATCH /api/repos/:owner/:repo/issues/preferences` for banner dismissal using `RestJson`.
- `web/src/components/RepositoryIssuesPage.tsx`: add a client-side dismiss action that calls the preference endpoint, updates local UI state, and shows error feedback if persistence fails.
- Tests: cover preference insert/update idempotency, anonymous/private access behavior, client dismiss success/error states, and reload persistence.

**Verification**: migration-backed Rust tests, Vitest banner dismissal tests, Playwright signed-session dismiss/reload smoke, and screenshot `ralph/screenshots/build/issues-001-phase4-banner-dismissed.jpg`.

---

## Phase 5: Issue List Guardrails and QA Handoff - finish issues-001

**Done**: [x]

**Scope**: Harden accessibility, privacy, query bounds, visual compliance, and bookkeeping. Mark `issues-001` complete only after the repository issue list has real API data, working URL filters, no dead controls, saved banner dismissal, and browser evidence.

**Key changes**:
- `crates/api/tests/api_repository_issues_list_contract.rs`: add final coverage for anonymous public/private access, non-member private 403/404 behavior, invalid filter 422 envelopes, count consistency, deterministic ordering, pagination bounds, and redaction.
- `web/tests/repository-issues.test.tsx`: assert accessible names, keyboard focusable controls, no `href="#"`, no placeholder copy, semantic chips only, and issue title/body inline-code rendering.
- `web/tests/e2e/repository-issues.spec.ts`: signed-session sweep for default list, filters, tabs, row navigation, banner dismissal, empty state, pagination, and mobile no-overflow.
- `ralph/screenshots/build/`: save final desktop and mobile issue-list screenshots.
- Mandatory Editorial banned-value scan before commit: `rg -n -e '#(0969da|1f883d|1a7f37|cf222e|82071e|f6f8fa|1f2328|d0d7de|59636e|f1aeb5|fff1f3)\b|@primer/|Octicon' web/src/ --glob '!**/og*.css'`.
- `qa-hints.json`, `build-progress.txt`, and `prd.json`: record verification evidence and set `issues-001.build_pass=true` only after every phase is complete; leave `qa_pass=false`.

**Verification**: `.scratch/issues-001-list-contract-scenario.sh`, `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check`, `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`, and `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke proves filters, tabs, rows, banner dismissal, pagination, and empty-state controls are all live.
