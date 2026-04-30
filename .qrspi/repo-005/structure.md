# Structure Outline: repo-005 Repository Blob/File Views

**Ticket**: `repo-005`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, `.qrspi/repo-003/structure.md`, `.qrspi/repo-004/structure.md`, `ralph/screenshots/inspect/repo-blob-file-view.jpg`, and the current repository tree/blob API and UI implementation
**Date**: 2026-04-30

## Phase 1: Blob Read Contract and Raw Streaming - file pages expose real content actions

**Done**: [x]

**Scope**: Upgrade the existing blob API from a preview DTO into a file-view contract that supports GitHub-like metadata, latest commit context, raw bytes, download headers, binary/large-file states, and recent-visit writes. This phase keeps the current UI usable while making every visible Raw/Download/History action backed by real Rust endpoints.

**Key changes**:
- `crates/api/src/domain/repositories.rs`: extend `RepositoryBlobView` with `lineCount`, `locCount`, `sizeLabel`, `mimeType`, `renderMode`, `rawApiHref`, `downloadApiHref`, `permalinkHref`, `latestPathCommit`, and bounded display content for text files.
- `crates/api/src/routes/repositories.rs`: add raw/download handling for blob requests, returning `text/plain` or `application/octet-stream` bodies with safe `Content-Disposition` filenames while preserving permission checks, ref validation, and path normalization.
- `crates/api/src/domain/repositories.rs`: record a recent repository visit when a signed-in viewer opens a blob and keep private/public repository behavior aligned with repo-004.
- `web/src/lib/api.ts`: update blob DTOs and helpers for raw/download URLs, render-mode metadata, and latest commit fields.
- `crates/api/tests/repository_blob_view.rs`: cover authenticated public/private reads, raw body streaming, download headers, invalid refs, missing paths, binary detection, large-file non-renderable responses, recent visit writes, and no traversal leakage.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test cargo test --test repository_blob_view -- --nocapture`, then `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`. Browser smoke is optional for this backend-heavy slice.

---

## Phase 2: Code Viewer UI and File Header Actions - render the GitHub-style blob surface

**Done**: [x]

**Scope**: Replace the simple `<pre>` preview with a repository split-pane blob page matching the inspected GitHub file view: branch selector, breadcrumbs, Go to file, latest commit strip, Code/Blame toggle, metadata text, line numbers, hoverable anchors, Raw, copy raw, download, symbol pane, and more-actions controls. Every rendered control either performs a real action or reaches a real route.

**Key changes**:
- `web/src/components/RepositoryBlobViewer.tsx`: add the file header, latest commit strip, toolbar, metadata line, code table with stable line-number gutters, line anchors, hidden read-only textarea for accessibility, and binary/large fallback state.
- `web/src/app/[owner]/[repo]/blob/[ref]/[[...path]]/page.tsx`: render the new viewer with the repo-004 branch selector and Go to file controls, using server-fetched blob data and repository-scoped recovery UI.
- `web/src/components/RepositoryCodeToolbar.tsx` and related shared components: preserve the current blob path when switching branches/tags where possible and route Go to file results to blob pages at the selected ref.
- `web/tests/repository-blob-view.test.tsx`: cover metadata rendering, raw/download/copy action wiring, line anchor hrefs, binary/large states, branch selector path preservation, no `href="#"`, and no visible inert buttons.
- `web/tests/e2e/repository-blob-view.spec.ts`: seed a real repository, open a blob from the tree, verify line anchors, click Raw/Download/History, use Go to file, and save `ralph/screenshots/build/repo-005-phase2-blob-view.jpg`.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke opens a seeded file view, exercises all header actions, confirms no dead controls, and saves the phase screenshot.

---

## Phase 3: Blame Mode and Keyboard Shortcuts - file navigation behaves like a code tool

**Done**: [x]

**Scope**: Add a real blame view and keyboard interactions for the blob page. The Code/Blame segmented control must switch between normal code rendering and line-by-line attribution; `y` creates a permalink to the resolved commit, `b` toggles blame, and `l` opens a line-jump control that scrolls/focuses the selected line.

**Key changes**:
- `crates/api/src/domain/repositories.rs`: add a blame DTO that maps each displayed line to the best available commit attribution from imported commit metadata, with deterministic fallback to the latest path commit when exact line history is unavailable.
- `crates/api/src/routes/repositories.rs`: expose `GET /api/repos/:owner/:repo/blame/*path?ref=` or equivalent query mode with the same auth, ref, path, large-file, and binary safeguards as normal blob reads.
- `web/src/components/RepositoryBlobViewer.tsx`: add Code/Blame mode switching, attribution columns with commit author/message/SHA/time, permalink URL updates, line-jump dialog, and keyboard shortcut handlers scoped to the file view.
- `web/tests/repository-blob-view.test.tsx` and `web/tests/e2e/repository-blob-view.spec.ts`: cover shortcut behavior, permalink conversion to commit SHA, blame rendering, line jump focus/scroll, binary shortcut disabling, and no form/input shortcut conflicts.
- `crates/api/tests/repository_blob_view.rs`: cover blame permission checks, missing attribution fallback, branch/tag ref resolution, and large/binary rejection.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke toggles blame, uses `y`, `b`, and `l`, verifies focus/URL behavior, and saves `ralph/screenshots/build/repo-005-phase3-blame-shortcuts.jpg`.

---

## Phase 4: Syntax Highlighting and Symbol Entry Points - code view is readable and extensible

**Done**: [x]

**Scope**: Add dependency-backed syntax highlighting for common source files and a non-inert symbol entry point. The symbol pane can start with indexed headings/functions from stored metadata or a deterministic file-outline fallback, but it must open, search/filter, and navigate to line anchors without requiring a future feature to make the button useful.

**Key changes**:
- Install and pin a frontend syntax-highlighting package before importing it, then wrap highlighting behind a small local adapter so unsupported languages fall back to escaped plain text.
- `web/src/components/RepositoryBlobViewer.tsx`: render tokenized code without layout shift, keep line numbers and selection/permalink behavior stable, add a symbol side panel with search/filter and line-anchor navigation, and preserve readable contrast in light/dark-ish repository surfaces.
- `crates/api/src/domain/repositories.rs`: return optional `symbols` for known languages using stored/indexed rows when available and a bounded regex-free fallback for Markdown headings, Rust/TypeScript/Python function-like lines, and JSON top-level keys.
- Add or extend migrations only if a lightweight `repository_symbols` table is needed for cached code navigation; otherwise document the fallback and leave cache writes to a later dedicated indexing feature.
- Tests cover HTML escaping, language fallback, symbol extraction limits, panel open/close/search/navigation, unsupported files, and mobile no-overflow.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke opens TypeScript/JSON/Markdown files, verifies highlighting and symbols, checks mobile layout, and saves `ralph/screenshots/build/repo-005-phase4-highlighting-symbols.jpg`.

---

## Phase 5: Final Blob QA and Regression Guardrails - finish repo-005 for QA handoff

**Done**: [ ]

**Scope**: Lock down the completed blob/file view across API contracts, security, visual regressions, browser flows, and bookkeeping. This phase marks the PRD feature complete only after every repo-005 phase passes with real Postgres-backed data and browser evidence.

**Key changes**:
- `web/tests/e2e/repository-blob-view.spec.ts`: expand coverage for text, Markdown, JSON, binary, large file, invalid ref/path recovery, branch/tag switching, Raw/Download/History, copy raw, line permalinks, blame, line jump, symbol panel, desktop/mobile screenshots, and dead-control scanning.
- `crates/api/tests/repository_blob_security.rs`: cover auth bypass, private repo denial, raw/download permissions, content-disposition filename sanitization, malformed encoded paths, binary/large response hygiene, and no stack traces or content leaks in error envelopes.
- `ralph/screenshots/build/`: save final screenshots for normal code view, blame mode, symbol panel, binary/large fallback, invalid-path recovery, and mobile.
- `qa-hints.json`: append repo-005 notes covering blame fidelity limits, syntax-highlighting language coverage, raw/download filename edge cases, keyboard shortcut conflicts, large-file thresholds, and binary detection heuristics.
- `build-progress.txt` and `prd.json`: record verification evidence and set `repo-005.build_pass=true` only after all phases are complete; leave `qa_pass=false`.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; Ever or Playwright smoke confirms every visible action on `/{owner}/{repo}/blob/{branch}/{path}` works, screenshots are saved, and no placeholder blob controls remain.
