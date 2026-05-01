# Structure Outline: prs-001 Repository Pull Request List

**Ticket**: `prs-001`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, `web/AGENTS.md`, `design/project/Prototype.html`, `design/project/og-screens-3.jsx`, `ralph/screenshots/inspect/pr-list.jpg`, `ralph/screenshots/inspect/pr-reviews-filter-menu.jpg`, `ralph/screenshots/inspect/pr-sort-menu.jpg`, current `crates/api/src/domain/pulls.rs`, current `crates/api/src/routes/pulls.rs`, current `web/src/components/RepositoryShell.tsx`, and current `web/src/app/[owner]/[repo]/pulls/page.tsx`.
**Date**: 2026-05-01

## Phase 1: Pull List Contract - API returns screen-ready PR rows

**Done**: [x]

**Scope**: Extend the existing authenticated pull request list from a raw `PullRequest` envelope into a repository pull-list contract that includes open/closed/merged counts, author, labels, comment count, linked issue hints, review/check/task metadata, role badges, branch refs, permissions, URL-backed filters, and repository context. Public repositories remain readable; private repositories require permission.

**Key changes**:
- `crates/api/migrations/*_pull_request_list_metadata.*.sql`: add the narrow missing list metadata tables/columns if they do not already exist, such as `pull_request_reviews`, `pull_request_review_requests`, `pull_request_checks_summary`, `pull_request_task_progress`, and `repository_pull_preferences`.
- `crates/api/src/domain/pulls.rs`: add `PullRequestListItem`, `PullRequestListView`, `PullRequestListFilters`, `PullRequestReviewSummary`, `PullRequestChecksSummary`, and projection helpers that join `pull_requests`, backing `issues`, users, labels, comments, timeline events, linked issues, and the new PR metadata while preserving `RepositoryRole::Read`.
- `crates/api/src/routes/pulls.rs`: accept `q`, `state`, `labels`, `milestone`, `review`, `checks`, `sort`, `page`, and `page_size`/`pageSize`; normalize the default query to `is:pr is:open`; return the standard list envelope plus counts, active filter metadata, options, preferences, and safe validation diagnostics.
- `web/src/lib/api.ts`: add typed pull-list DTOs and server fetch helpers that forward signed session cookies and preserve standard error envelopes.
- `crates/api/tests/api_repository_pulls_list_contract.rs`: seed real repositories, users, PRs, labels, comments, linked issues, review/check/task metadata, and assert public/private access, count consistency, filter parsing, pagination clamps, row shape, and redaction.
- `.scratch/prs-001-list-contract-scenario.sh`: run the same contract through the real Axum API against Postgres without mocks.

**Verification**: targeted Rust contract tests and scenario pass, then `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`. Browser smoke is not required in this phase because it only changes the API/view-model contract.

---

## Phase 2: Repository Pulls Page - default open PR list renders real data

**Done**: [x]

**Scope**: Replace the placeholder `/{owner}/{repo}/pulls` route with an Editorial repository pull request list that fetches Phase 1 data server-side and renders the default `is:pr is:open` list with repository tabs, query input, Labels/Milestones links, New pull request link, Open/Closed tabs, contributor banner, and dense PR rows.

**Key changes**:
- `web/src/app/[owner]/[repo]/pulls/page.tsx`: fetch repository metadata and pull-list data, preserve URL search params, render inside `RepositoryShell`, and handle API validation envelopes without collapsing the page shell.
- `web/src/components/RepositoryPullsPage.tsx`: new screen component using `.input`, `.btn`, `.chip`, `.tabs`, `.list-row`, `.t-*` classes and Editorial tokens only; no GitHub color literals, Primer imports, or Octicons.
- `web/src/lib/navigation.ts`: add pull-list href helpers for state tabs, query submission, filters, pagination, PR detail links, compare/create links, and detail-section anchors.
- `web/src/app/[owner]/[repo]/compare/page.tsx` or a narrow create destination: provide a real compare/create landing page for the New pull request CTA until the full compare flow ships.
- `web/tests/repository-pulls.test.tsx`: cover default open query rendering, row links, labels, author/role/check/review/comment/task metadata, empty state, contributor banner, accessible controls, and no inert links/buttons.
- `web/tests/e2e/repository-pulls.spec.ts`: seed a signed-session repository with real PRs and verify the default open list, row navigation, New pull request CTA, and screenshot.

**Verification**: `make check`, `make test`, and focused Playwright for `repository-pulls.spec.ts`; browser smoke saves `ralph/screenshots/build/prs-001-phase2-open-list.jpg`.

---

## Phase 3: URL Filters and Toolbar Menus - search, tabs, labels, milestones, review, checks, and sort work

**Done**: [x]

**Scope**: Make the pull request query builder and compact toolbar controls functional. Typing a query or choosing state, label, milestone, review, checks, or sort filters updates the URL and results. Open/Closed tabs switch state filters, empty results show a no-results state, and clear/reset affordances return to the default open PR query.

**Key changes**:
- `crates/api/src/domain/pulls.rs`: expand query parsing for `is:pr`, `is:open|closed|merged`, `label:<name>`, `milestone:<title>`, `review:required|approved|changes_requested`, `checks:success|failure|pending|running`, and bounded plain-text title/body/branch search.
- `crates/api/src/routes/pulls.rs`: return structured `422 validation_failed` envelopes for malformed filters, stable pagination metadata for filtered results, and filter option groups for labels, milestones, review states, check states, and sort choices.
- `web/src/components/RepositoryPullsPage.tsx`: wire search form submission, state tabs, filter menus, selected chips, pagination controls, clear-query link, invalid-query warning, and detail-section anchor hrefs for checks/reviews/comments/linked issues.
- `web/src/components/IssueFilterMenu.tsx` and `web/src/components/IssueSortMenu.tsx`: reuse or generalize existing accessible dropdown primitives instead of creating a separate menu system.
- Tests: assert typed qualifiers round-trip through API and UI, tabs preserve non-state filters, unsupported qualifiers preserve typed text with inline warning, empty states clear back to the default query, and mobile layout has no horizontal overflow.

**Verification**: targeted API query tests, Vitest pull-filter tests, and Playwright flows for open/closed tabs, text search, menus, clear query, invalid query, and pagination; screenshot `ralph/screenshots/build/prs-001-phase3-filtered-empty.jpg`.

---

## Phase 4: Contributor Banner and Preference Persistence - viewer dismissal sticks

**Done**: [ ]

**Scope**: Add the dismissible contributor guidance banner for pull requests and persist dismissal per signed-in viewer/repository. The banner appears on first view, hides immediately on dismiss, stays hidden after reload for that viewer/repository, and never blocks public read-only PR browsing.

**Key changes**:
- `crates/api/src/domain/pulls.rs`: add preference read/update helpers keyed by `repository_id` and `user_id`, gated by repository read access.
- `crates/api/src/routes/pulls.rs`: include pull-list preferences in the list view and add `PATCH /api/repos/:owner/:repo/pulls/preferences` for banner dismissal using `RestJson`.
- `web/src/components/PullRequestContributorBanner.tsx`: client component for dismiss success/error feedback, matching the Editorial issue banner language and primitives while using pull-request-specific copy.
- `web/src/components/RepositoryPullsPage.tsx`: show or suppress the banner based on API preferences and keep all list interactions usable while dismissal is pending.
- Tests: cover preference insert/update idempotency, anonymous/private access behavior, client dismiss success/error states, reload persistence, and no cross-user leakage.

**Verification**: migration-backed Rust tests, Vitest banner dismissal tests, Playwright signed-session dismiss/reload smoke, and screenshot `ralph/screenshots/build/prs-001-phase4-banner-dismissed.jpg`.

---

## Phase 5: Pull List Guardrails and QA Handoff - finish prs-001

**Done**: [ ]

**Scope**: Harden accessibility, privacy, visual compliance, query bounds, browser smoke coverage, and bookkeeping. Mark `prs-001` complete only after the repository pull list has real API data, working URL filters, no dead controls, saved banner dismissal, pagination, and browser evidence.

**Key changes**:
- `crates/api/tests/api_repository_pulls_list_contract.rs`: add final coverage for anonymous public/private access, non-member private denial, invalid filter envelopes, count consistency, deterministic ordering, pagination bounds, metadata joins, and redaction.
- `web/tests/repository-pulls.test.tsx`: assert accessible names, keyboard-focusable controls, no `href="#"`, no placeholder copy, semantic chips only, row/detail-section hrefs, and Editorial token use.
- `web/tests/e2e/repository-pulls.spec.ts`: signed-session sweep for default list, filters, tabs, row navigation, New pull request CTA, check/review/comment/linked-issue anchors, banner dismissal, empty state, pagination, and mobile no-overflow.
- `ralph/screenshots/build/`: save final desktop and mobile pull-list screenshots.
- Mandatory Editorial banned-value scan before commit: `rg -n -e '#(0969da|1f883d|1a7f37|cf222e|82071e|f6f8fa|1f2328|d0d7de|59636e|f1aeb5|fff1f3)\b|@primer/|Octicon' web/src/ --glob '!**/og*.css'`.
- `qa-hints.json`, `build-progress.txt`, and `prd.json`: record verification evidence and set `prs-001.build_pass=true` only after every phase is complete; leave `qa_pass=false`.

**Verification**: `.scratch/prs-001-list-contract-scenario.sh`, `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check`, `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`, and `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke proves filters, tabs, rows, banner dismissal, pagination, detail anchors, and empty-state controls are all live.
