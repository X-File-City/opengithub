# Structure Outline: issues-002 Issue Filter Menus

**Ticket**: `issues-002`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, `web/AGENTS.md`, `design/project/Prototype.html`, `design/project/og-screens-4.jsx`, `.qrspi/issues-001/structure.md`, current `crates/api/src/domain/issues.rs`, current `crates/api/src/routes/issues.rs`, current `web/src/components/RepositoryIssuesPage.tsx`, and current `web/src/lib/navigation.ts`.
**Date**: 2026-05-01

## Phase 1: Label Filter Menu - searchable label options mutate the issue query

**Done**: [x]

**Scope**: Add the first real compact dropdown menu to the repository Issues toolbar: Labels. Opening the menu focuses a combobox, typing narrows repository labels, selecting a label adds `label:<name>` to the URL-backed query, selecting No labels adds the no-label qualifier, and Alt-clicking a label creates an exclusion qualifier without losing existing filters.

**Key changes**:
- `crates/api/src/domain/issues.rs`: extend issue query/filter parsing with included labels, excluded labels, and no-label semantics while preserving current public/private repository access behavior.
- `crates/api/src/routes/issues.rs`: normalize new label qualifiers from `q` and explicit query params; return standard `422 validation_failed` envelopes for unsupported label syntax without leaking internals.
- `web/src/lib/api.ts`: extend `IssueListFilters` with `excludedLabels` and `noLabels`; add screen-ready label option metadata if the current list view is enough, or a narrow repository issue filter-options DTO if the UI needs all repository labels regardless of current results.
- `web/src/lib/navigation.ts`: add helpers that append, replace, remove, and exclude issue label qualifiers while preserving state, sort, milestone, assignee, page reset, and free-text terms.
- `web/src/components/IssueFilterMenu.tsx`: new reusable accessible popover primitive for combobox + listbox filter menus, using Editorial `.btn`, `.input`, `.chip`, `.card`, and token colors only.
- `web/src/components/RepositoryIssuesPage.tsx`: replace the static label chips area with a Labels dropdown button, searchable label list, selected/excluded chips, No labels option, and real destinations for every menu item.
- Tests: API contract tests for included/excluded/no-label filtering; Vitest tests for combobox focus, narrowing, selection hrefs, Alt-click exclusion, query preservation, and no inert controls; focused Playwright screenshot `ralph/screenshots/build/issues-002-phase1-label-menu.jpg`.

**Verification**: targeted Rust issue-list contract tests, focused `repository-issues.test.tsx`, focused `repository-issues.spec.ts`, then `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`. Browser smoke proves the Labels menu opens, filters, selects, excludes, and refreshes results.

---

## Phase 2: People and Metadata Menus - author, assignee, milestone, project, and type controls

**Done**: [ ]

**Scope**: Complete the compact filter toolbar with Author, Projects, Milestones, Assignees, and Types menus. Each menu opens with focus in its combobox when searchable, narrows options, updates the search-builder query and URL without dropping existing qualifiers, and renders honest empty states for dimensions not fully modeled yet.

**Key changes**:
- `crates/api/src/domain/issues.rs`: extend `IssueListQuery` and filtering for `author:`, `-author:`, `assignee:`, `no:assignee`, `milestone:`, `no:milestone`, and bounded `type:`/`project:` placeholders that either filter real modeled data or return explicit unsupported/empty metadata.
- `crates/api/src/routes/issues.rs`: parse quoted qualifier values consistently for author, assignee, milestone, project, and type filters; keep invalid advanced queries as inline-safe validation messages.
- `web/src/lib/api.ts`: expose filter option groups for users, milestones, projects, and issue types, including counts where cheaply available and disabled/empty-state reasons where the backend cannot yet back a dimension.
- `web/src/lib/navigation.ts`: add qualifier mutation helpers for singleton filters that replace the previous value and multiselect filters that append/remove values.
- `web/src/components/RepositoryIssuesPage.tsx`: render Author, Projects, Milestones, Assignees, and Types dropdown buttons with selected chips, disabled-but-explained empty dimensions, and no placeholder `href="#"`.
- Tests: Rust coverage for each supported qualifier and validation envelope; Vitest coverage for focus behavior, query mutation, empty dimensions, and typed quoted values; Playwright coverage for the toolbar menu sweep.

**Verification**: focused Rust contract tests plus Vitest/Playwright for all toolbar menus; screenshot `ralph/screenshots/build/issues-002-phase2-filter-toolbar.jpg`.

---

## Phase 3: Sort Menu - grouped radio choices update sort and order safely

**Done**: [ ]

**Scope**: Replace the current row of static sort chips with a compact Sort by dropdown menu. The menu is a grouped radio menu with checked state, accessible metadata for shortcuts/order, and choices that update `sort:`/`order:` or the existing `sort` param while preserving all other filters.

**Key changes**:
- `crates/api/src/domain/issues.rs`: support the full issue-list sort contract needed by the UI: newest, oldest, recently updated, least recently updated, most/least commented, and best match where query text is present; keep unsupported reaction sorts out of this feature unless the data model exists.
- `crates/api/src/routes/issues.rs`: normalize sort aliases from URL/query-builder syntax into stable backend sort values and return structured validation for unknown sorts/orders.
- `web/src/lib/api.ts`: document the stable `IssueSort` union type and expose it to navigation/UI code.
- `web/src/lib/navigation.ts`: add sort/order mutation helpers that reset pagination and preserve query filters.
- `web/src/components/IssueSortMenu.tsx`: new radio-menu component with checked state, `aria-checked`, keyboard-friendly buttons/links, and shortcut text exposed via labels or descriptions.
- `web/src/components/RepositoryIssuesPage.tsx`: replace static sort chips with the Sort by menu and selected sort summary.
- Tests: Rust ordering tests with seeded comment counts and dates; Vitest assertions for radio state and href preservation; Playwright smoke for changing sort in place.

**Verification**: targeted ordering contract tests, focused Vitest, focused Playwright, then standard `make check` and `make test`; screenshot `ralph/screenshots/build/issues-002-phase3-sort-menu.jpg`.

---

## Phase 4: Advanced Query Feedback - invalid queries preserve text and show inline warnings

**Done**: [ ]

**Scope**: Make the search-builder resilient. Invalid advanced qualifiers preserve the typed text, show inline warnings near the toolbar, keep the page shell usable, and avoid losing previously selected filters. Valid typed qualifiers and menu-selected qualifiers round-trip through the same parser.

**Key changes**:
- `crates/api/src/routes/issues.rs`: return field-level issue filter diagnostics in the standard error envelope, with safe messages suitable for inline UI display.
- `web/src/lib/api.ts` and `web/src/lib/server-session.ts`: preserve typed query values and expose issue-list validation errors to the page instead of collapsing to a generic unavailable state.
- `web/src/app/[owner]/[repo]/issues/page.tsx`: render the issue page with the last typed query plus warning state when the API returns validation errors.
- `web/src/components/RepositoryIssuesPage.tsx`: add inline warning copy, keep filter menus enabled where possible, and provide a clear-invalid-query action that returns to `is:issue state:open`.
- Tests: Rust validation envelope redaction, Vitest invalid-query preservation, and Playwright invalid-query flow with no dead controls.

**Verification**: targeted invalid-query API tests, focused Vitest/Playwright, screenshot `ralph/screenshots/build/issues-002-phase4-invalid-query.jpg`.

---

## Phase 5: Filter Menu Guardrails and QA Handoff - finish issues-002

**Done**: [ ]

**Scope**: Harden keyboard behavior, accessibility, visual compliance, browser smoke coverage, and bookkeeping. Mark `issues-002` complete only after every compact dropdown menu is live, query mutations are URL-backed, invalid query feedback is inline, and no menu/button is inert.

**Key changes**:
- `web/tests/repository-issues.test.tsx`: final coverage for menu accessible names, combobox focus on open, Escape/outside close behavior, listbox roles, selected/checked state, no placeholder links, and query preservation across all menus.
- `web/tests/e2e/repository-issues.spec.ts`: signed-session sweep for Labels, Author, Projects, Milestones, Assignees, Types, Sort by, invalid query warning, mobile no-overflow, and screenshot evidence.
- `crates/api/tests/api_repository_issues_list_contract.rs`: final cross-filter matrix for label inclusion/exclusion, no-label, author, assignee, no-assignee, milestone, no-milestone, sort aliases, pagination reset assumptions, private filtering, and redaction.
- Mandatory Editorial banned-value scan before commit: `rg -n -e '#(0969da|1f883d|1a7f37|cf222e|82071e|f6f8fa|1f2328|d0d7de|59636e|f1aeb5|fff1f3)\b|@primer/|Octicon' web/src/ --glob '!**/og*.css'`.
- `qa-hints.json`, `build-progress.txt`, and `prd.json`: record verification evidence and set `issues-002.build_pass=true` only after every phase is complete; leave `qa_pass=false`.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check`, `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`, and `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke saves final desktop and mobile filter-menu screenshots under `ralph/screenshots/build/`.
