# Structure Outline: search-001 Global Search and Jump Navigation

**Ticket**: `search-001`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, `web/AGENTS.md`, `design/project/Prototype.html`, `design/project/og-shell.jsx`, current `crates/api/src/domain/search.rs`, current `crates/api/src/routes/search.rs`, current `web/src/components/AppHeader.tsx`, and current `web/src/app/search/page.tsx`.
**Date**: 2026-05-01

## Phase 1: Header Jump Suggestions - search input opens useful destinations

**Done**: [x]

**Scope**: Replace the signed-in header's plain search form with an Editorial command-field interaction that opens a suggestion popover for recent repositories, organizations/teams, create actions, and query suggestions. Pressing Enter still submits to `/search?q=<query>&type=repositories`; selecting a repository/user/org suggestion navigates directly.

**Key changes**:
- `crates/api/src/domain/app_shell.rs` and `crates/api/src/routes/app_shell.rs`: include enough recent repository, organization, and team metadata for jump suggestions without adding a second header fetch.
- `web/src/components/AppHeader.tsx`: add popover state, focus/open/Escape/outside-click behavior, keyboard highlight, direct navigation for suggestions, and default search submit.
- `web/src/lib/navigation.ts`: add typed jump suggestion helpers and stable href builders for repository, profile, organization, team, and search-query suggestions.
- `web/tests/app-shell.test.tsx` and `web/tests/e2e/app-shell.spec.ts`: cover focus opening suggestions, keyboard navigation, direct repository navigation, query submit URL, Escape close, no inert buttons, and mobile behavior remaining stable.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke saves `ralph/screenshots/build/search-001-phase1-header-suggestions.jpg`.

---

## Phase 2: Repository and People Results - `/search` renders real indexed results

**Done**: [ ]

**Scope**: Connect the search page to the Rust API for repository, user, and organization result types. The page should render result count, filter sidebar, pagination, empty state with syntax tips, and type tabs using the existing Editorial shell instead of placeholder copy.

**Key changes**:
- `crates/api/src/domain/search.rs`: add result projection helpers that normalize repository/user/organization metadata into browser-friendly fields while preserving permission filtering and pagination clamps.
- `crates/api/src/routes/search.rs`: accept both `type` and legacy `kind` query params; map UI tab names (`repositories`, `users`, `organizations`) to existing search document kinds.
- `web/src/lib/api.ts`: add `searchGlobal({ query, type, page, pageSize })` and typed result DTOs with standard error-envelope handling.
- `web/src/components/SearchResultsPage.tsx`: render search form, type tabs, sidebar filters, result cards, pagination controls, and no-results state.
- `web/src/app/search/page.tsx`: fetch real results server-side with cookie forwarding and render validation/API errors without leaking internals.
- Tests: seed real `search_documents` for public/private repositories, users, and organizations; assert visible/hidden results match session permissions.

**Verification**: targeted Rust search API contract scenario in `.scratch/search-001-results-scenario.sh`, `make check`, `make test`, and Playwright smoke for `/search?q=<marker>&type=repositories` plus empty results screenshot `ralph/screenshots/build/search-001-phase2-results.jpg`.

---

## Phase 3: Code and Commit Results - snippets, paths, and direct file links work

**Done**: [ ]

**Scope**: Make code and commit tabs useful: code results show repository, branch, path, matching line/fragment, language, and clickable links to the blob route; commit results show sha/title/body/repository links. Permission filtering must keep private code invisible to outsiders.

**Key changes**:
- `crates/api/src/domain/search.rs`: add code snippet shaping from `body`, `path`, `branch`, and `metadata` fields; include line number and match ranges when present.
- `crates/api/src/domain/repositories.rs` and Git indexing paths: ensure pushed/bootstrap repository files upsert code search documents for the default branch with stable `resource_id` values.
- `web/src/components/SearchResultsPage.tsx`: add code and commit result renderers with mono paths, highlighted fragments, file links, and commit links.
- `web/tests/search-results.test.tsx` and `crates/api/tests/search_global_contract.rs`: cover snippet rendering, branch/path links, private code filtering, pagination, and invalid query envelopes.
- `web/tests/e2e/search.spec.ts`: from a seeded pushed repository, search a unique code marker and open the matching blob page.

**Verification**: real Postgres + real Git scenario seeds a repository, pushes searchable content, confirms `/api/search?type=code`, opens the UI result, and saves `ralph/screenshots/build/search-001-phase3-code-results.jpg`.

---

## Phase 4: Issues, Pull Requests, and Discussions Tabs - collaboration search feels complete

**Done**: [ ]

**Scope**: Render issue and pull request results with state chips, numbers, labels, author/repository context, and links to detail pages. Keep the discussions tab present as an explicit no-results/not-yet-indexed state until discussions data exists, with no dead controls.

**Key changes**:
- `crates/api/src/domain/issues.rs`, `crates/api/src/domain/pull_requests.rs`, and mutation/indexing paths: upsert search documents when issues/PRs are created or updated, including state, number, labels, author, and timestamps in metadata.
- `crates/api/src/domain/search.rs`: map UI `issues`, `pull_requests`, and `discussions` type names; return consistent envelopes for unsupported-but-visible discussion results.
- `web/src/components/SearchResultsPage.tsx`: add issue/PR renderers with `.chip.ok` / `.chip.warn` / `.chip.err` semantics only, label display, repository context, and detail links.
- Tests: create issues and pull requests through existing APIs, search by unique title/body marker, verify state metadata, permission filtering, direct links, and discussions empty state.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && ... make test && ... make test-e2e`; browser smoke saves `ralph/screenshots/build/search-001-phase4-collaboration-results.jpg`.

---

## Phase 5: Search Guardrails and QA Handoff - finish search-001

**Done**: [ ]

**Scope**: Harden cross-type behavior, performance bounds, accessibility, visual compliance, and bookkeeping. Mark `search-001` complete only after all tabs, header suggestions, empty states, pagination, and dead-control scans pass.

**Key changes**:
- `crates/api/tests/search_global_contract.rs`: cover anonymous 401, invalid type 422, short query 422, page/pageSize clamps, private visibility across all indexed kinds, no stack/cookie/secret leakage, and deterministic ordering.
- `web/tests/e2e/search.spec.ts`: sweep header suggestions and `/search` tabs for repositories, code, issues, pull requests, commits, users, organizations, and discussions with real signed-session data.
- `web/tests/search-results.test.tsx`: assert accessible names, no `href="#"`, no empty click handlers, pagination href preservation, syntax tips, and mobile no-overflow.
- `ralph/screenshots/build/`: save final desktop and mobile search screenshots.
- Mandatory Editorial banned-value scan before commit: `rg -n -e '#(0969da|1f883d|1a7f37|cf222e|82071e|f6f8fa|1f2328|d0d7de|59636e|f1aeb5|fff1f3)\b|@primer/|Octicon' web/src/ --glob '!**/og*.css'`.
- `qa-hints.json`, `build-progress.txt`, and `prd.json`: record verification evidence and set `search-001.build_pass=true` only after every phase is complete; leave `qa_pass=false`.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke proves every search tab has real results or a working empty state, header jump suggestions navigate or submit, pagination preserves query/type, and no known search surface falls through to a placeholder.
