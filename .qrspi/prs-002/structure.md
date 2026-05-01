# Structure Outline: prs-002 Pull Request Filter Menus and Sort Controls

**Ticket**: `prs-002`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, `web/AGENTS.md`, `design/project/Prototype.html`, `design/project/og-screens-3.jsx`, `ralph/screenshots/inspect/pr-list.jpg`, `ralph/screenshots/inspect/pr-reviews-filter-menu.jpg`, `ralph/screenshots/inspect/pr-sort-menu.jpg`, `.qrspi/prs-001/structure.md`, `.qrspi/issues-002/structure.md`, current `crates/api/src/domain/pulls.rs`, current `crates/api/src/routes/pulls.rs`, current `web/src/components/RepositoryPullsPage.tsx`, current `web/src/components/IssueFilterMenu.tsx`, current `web/src/components/IssueSortMenu.tsx`, and current `web/src/lib/navigation.ts`.
**Date**: 2026-05-01

## Phase 1: People Filters - author and assignee menus update the PR query

**Done**: [x]

**Scope**: Add Author and Assignee dropdowns to the repository pull request toolbar. Opening each menu focuses its combobox, options come from real PR authors and issue assignees, selections update `author:` / `assignee:` qualifiers and URL params without dropping existing labels, milestones, reviews, checks, state, or sort filters, and clear chips remove only the selected people filter.

**Key changes**:
- `crates/api/src/domain/pulls.rs`: extend `PullRequestListQuery`, `PullRequestListFilters`, and `PullRequestFilterOptions` with `author`, `assignee`, `noAssignee`, and people option groups; filter through `pull_requests.author_user_id` and backing `issues.assignees`.
- `crates/api/src/routes/pulls.rs`: parse explicit `author` / `assignee` params and typed `author:`, `assignee:`, and `no:assignee` qualifiers; return safe validation envelopes for malformed values while preserving typed query text.
- `web/src/lib/api.ts`: add typed fields for PR people filters and options, reusing `IssueListUser` where possible.
- `web/src/lib/navigation.ts`: add PR qualifier helpers for setting, replacing, clearing, and `no:assignee` selection while resetting pagination only for filter changes.
- `web/src/components/RepositoryPullsPage.tsx`: render Author and Assignee `IssuePickerMenu` controls plus selected chips using Editorial `.btn`, `.input`, `.chip`, `.card`, and `.list-row` primitives only.
- Tests: Rust contract coverage for author, assignee, no-assignee, privacy, validation, and URL/query aliasing; Vitest coverage for focus, href preservation, selected chips, and no inert controls; focused Playwright screenshot `ralph/screenshots/build/prs-002-phase1-people-filters.jpg`.

**Verification**: targeted pull-list contract tests, focused `repository-pulls.test.tsx`, focused `repository-pulls.spec.ts`, then `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`. Browser smoke proves Author and Assignee menus open, filter, clear, and preserve other qualifiers.

---

## Phase 2: Projects and Milestone Parity - metadata menus match the issue toolbar contract

**Done**: [ ]

**Scope**: Complete the metadata filter set with Projects and richer Milestones behavior. Project filters should be honest about unsupported project-link data until modeled, while milestone selection remains fully backed by repository milestones and supports no-milestone filtering.

**Key changes**:
- `crates/api/src/domain/pulls.rs`: add `project` and `noMilestone` fields to the list query/filter contract; use real milestone joins for `milestone:` / `no:milestone`; expose project option metadata from modeled project links if present, otherwise a disabled/empty option group with an explicit reason.
- `crates/api/src/routes/pulls.rs`: parse `project:`, explicit `project`, and `no:milestone`; reject unsupported project syntax with inline-safe diagnostics rather than silently ignoring it.
- `web/src/lib/api.ts`: expose project filter option metadata and no-milestone state.
- `web/src/lib/navigation.ts`: add PR metadata qualifier helpers for project, milestone replacement, no-milestone, and clear operations.
- `web/src/components/RepositoryPullsPage.tsx`: add Projects menu, add No milestone option to Milestones, and show project/no-milestone selected chips without placeholder links.
- Tests: API coverage for milestone/no-milestone filtering, project placeholder/real-data behavior, invalid project filters, and preserving existing filters; Vitest/Playwright coverage for Projects and Milestones menu flows.

**Verification**: focused Rust API tests plus Vitest/Playwright toolbar sweep; screenshot `ralph/screenshots/build/prs-002-phase2-metadata-filters.jpg`.

---

## Phase 3: Review Filter Semantics - full review and review-request radio menu

**Done**: [ ]

**Scope**: Expand the Reviews menu from the basic `required|approved|changes_requested|commented` set to the PRD contract: No reviews, Review required, Approved review, Changes requested, Reviewed by you, Not reviewed by you, Awaiting review from you, and Awaiting review from you or your team. The menu behaves as a radio popover and maps viewer-relative options through the signed-in actor.

**Key changes**:
- `crates/api/src/domain/pulls.rs`: add canonical review filter values such as `none`, `required`, `approved`, `changes_requested`, `reviewed_by_me`, `not_reviewed_by_me`, `review_requested`, and `team_review_requested`; resolve viewer/team semantics through `pull_request_reviews`, `pull_request_review_requests`, team membership, and repository permissions.
- `crates/api/src/routes/pulls.rs`: accept aliases like `review:approved`, `review-requested:@me`, and explicit `review`; return validation for viewer-relative filters when no actor is available.
- `web/src/components/RepositoryPullsPage.tsx`: render Reviews as a radio-style picker with checked state and PRD labels; selected review chips clear cleanly and do not affect unrelated filters.
- `web/src/lib/navigation.ts`: add PR review qualifier mapping helpers so typed qualifiers and menu-selected values round-trip to the same canonical URL.
- Tests: seed reviews, review requests, and team requests; assert viewer-relative behavior, public/anonymous handling, selected radio state, and invalid query preservation.

**Verification**: targeted Rust review-filter matrix, focused Vitest, focused Playwright for every Reviews option, and screenshot `ralph/screenshots/build/prs-002-phase3-review-menu.jpg`.

---

## Phase 4: Expanded Sort Menu - comments, updates, best match, and reactions sort in place

**Done**: [ ]

**Scope**: Extend the Sort menu to the full PRD set: Newest, Oldest, Most/Least commented, Recently/Least recently updated, Best match, and emoji reaction sorts. Sort choices update results in place, preserve all active filters, and show validation when best match or reaction sorts cannot be honored.

**Key changes**:
- `crates/api/migrations/*_pull_request_reactions_sort.*.sql`: add narrow reaction-summary support only if existing reaction data cannot provide deterministic PR reaction counts.
- `crates/api/src/domain/pulls.rs`: support sort values for `best-match`, comment count, updated time, created time, and reaction counts; best match ranks indexed/search text when a non-qualifier search term exists and degrades with a validation warning when it does not.
- `crates/api/src/routes/pulls.rs`: normalize `sort` / `order` aliases and typed `sort:` qualifiers; return the full `sortOptions` contract and safe errors for unknown sorts.
- `web/src/components/IssueSortMenu.tsx`: generalize labels/ARIA from issue-specific wording where needed so PR sort menus announce correctly.
- `web/src/components/RepositoryPullsPage.tsx`: list all PRD sort options with grouped radio state and keyboard focus; preserve filters in generated hrefs.
- Tests: Rust ordering tests for each sort, including ties and reaction totals; Vitest href/radio-state coverage; Playwright sort-in-place coverage.

**Verification**: targeted ordering contract tests, focused Vitest/Playwright, then standard check/test; screenshot `ralph/screenshots/build/prs-002-phase4-sort-menu.jpg`.

---

## Phase 5: Advanced Query Guardrails and QA Handoff - finish prs-002

**Done**: [ ]

**Scope**: Harden the full pull request filter toolbar: invalid advanced queries preserve typed text, all menus remain keyboard-accessible, every visible control performs a real action, the URL is the source of truth, and the feature is ready for QA to verify against GitHub-style information architecture rendered in the Editorial system.

**Key changes**:
- `crates/api/tests/api_repository_pulls_list_contract.rs`: final cross-filter matrix for author, assignee, no-assignee, label, project, milestone, no-milestone, review states, review requests, comments, updates, best match, reactions, pagination, privacy, and validation envelopes.
- `web/tests/repository-pulls.test.tsx`: final coverage for combobox focus, Escape/outside close behavior, radio/listbox roles, selected/checked state, no `href="#"`, no placeholder handlers, query preservation, selected-chip clearing, and Editorial token use.
- `web/tests/e2e/repository-pulls.spec.ts`: signed-session sweep for every toolbar menu, invalid query warning, filter combinations, sort changes, empty state, mobile no-overflow, and saved desktop/mobile screenshots.
- Mandatory Editorial banned-value scan before commit: `rg -nE '#(0969da|1f883d|1a7f37|cf222e|82071e|f6f8fa|1f2328|d0d7de|59636e|f1aeb5|fff1f3)\b|@primer/|Octicon' web/src/ --glob '!**/og*.css'`.
- `qa-hints.json`, `build-progress.txt`, and `prd.json`: record verification evidence and set `prs-002.build_pass=true` only after every phase is complete; leave `qa_pass=false`.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check`, `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`, and `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke saves final filter-menu screenshots under `ralph/screenshots/build/`.
