# Structure Outline: repo-004 Repository Tree Navigation

**Ticket**: `repo-004`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, `.qrspi/repo-003/structure.md`, `ralph/screenshots/inspect/repo-tree-directory.jpg`, `ralph/screenshots/inspect/repo-branch-selector.jpg`, `ralph/screenshots/inspect/repo-blob-file-view.jpg`, and current repository Code tab/API implementation
**Date**: 2026-04-30

## Phase 1: Ref-Aware Tree Contract - same path can resolve across branches and tags

**Done**: [x]

**Scope**: Extend the existing tree/blob/file-finder API so `/{owner}/{repo}/tree/{branch}/{path}` has a branch/tag-aware contract instead of always reading the repository's latest stored file snapshot. This phase makes branch/tag selection testable at the API and server-rendered page layer while preserving the existing `repo-003` root, tree, blob, and history flows.

**Key changes**:
- `crates/api/src/domain/repositories.rs`: introduce a `RepositoryResolvedRef` shape with `kind`, `shortName`, `qualifiedName`, `targetOid`, and recovery href metadata; return it from tree/blob/commit-history/file-finder reads.
- `crates/api/src/domain/repositories.rs`: make `repository_path_overview_for_actor`, `repository_blob_for_actor`, and `repository_file_finder_for_actor_by_owner_name` validate the requested ref and emit a typed invalid-ref error with default-branch recovery data.
- `crates/api/src/routes/repositories.rs`: keep existing route URLs but normalize all ref/path errors into standard envelopes with `404` for missing refs/paths and no stack leakage.
- `web/src/lib/api.ts`: add typed `resolvedRef`, `defaultBranchHref`, `recoveryHref`, `page`, `pageSize`, and `hasMore` fields to tree/file-finder DTOs.
- `crates/api/tests/repository_tree_navigation.rs`: cover branch reads, tag reads, invalid refs, path-not-found recovery links, private repository denial, and query/page bounds.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test cargo test --test repository_tree_navigation -- --nocapture`, then `make check && make test`. Browser smoke is optional for this backend-heavy slice.

---

## Phase 2: Split-Pane Directory Browser - render GitHub-like tree navigation

**Done**: [x]

**Scope**: Replace the current simple nested tree page with the repo-004 directory browsing layout: repository header, toolbar, breadcrumb/title, latest commit strip, file table, optional collapsible left tree, and a stable draggable splitter. Directory rows navigate to tree routes and file rows navigate to blob routes with no inert controls.

**Key changes**:
- `web/src/components/RepositoryTreeBrowser.tsx`: new client/server component boundary for the split-pane shell, collapsible left file tree, draggable splitter state, breadcrumb/current-directory title, latest commit summary, and parent directory row.
- `web/src/components/RepositoryFileTable.tsx`: support compact tree-page columns for Name, Last commit message, and Last commit date; keep deterministic folder/file href generation.
- `web/src/app/[owner]/[repo]/tree/[ref]/[[...path]]/page.tsx`: render `RepositoryTreeBrowser` with server-fetched tree data and repository-scoped 404 recovery UI for missing paths.
- `web/tests/repository-tree-navigation.test.tsx`: cover parent row, breadcrumbs, collapsible left pane, splitter keyboard/mouse behavior, row hrefs, latest commit strip, and absence of `href="#"`/dead buttons.
- `web/tests/e2e/repository-tree-navigation.spec.ts`: use real Postgres-seeded repositories to click root directory rows, nested parent rows, file rows, and recovery links.

**Verification**: `make check && make test && make test-e2e`; browser smoke opens a seeded repository tree, drags the splitter, collapses and restores the left pane, opens a nested directory and a file, and saves `ralph/screenshots/build/repo-004-phase2-tree-browser.jpg`.

---

## Phase 3: Searchable Branch Selector and Go To File - ref/path controls drive real navigation

**Done**: [ ]

**Scope**: Upgrade the branch/tag menu and Go to file combobox for tree pages so the selected ref preserves the current path when possible, file search results route to blob pages at the chosen ref, and missing paths show a branch/path recovery link instead of a generic 404.

**Key changes**:
- `crates/api/src/domain/repositories.rs`: extend `repository_refs_for_actor_by_owner_name` with searchable query, active-ref annotation, branch/tag totals, and same-path href calculation for the current tree path.
- `crates/api/src/routes/repositories.rs`: accept `q`, `currentPath`, `activeRef`, `page`, and `pageSize` on `/api/repos/:owner/:repo/refs`; keep list-envelope bounds and permission checks.
- `web/src/components/RepositoryCodeToolbar.tsx` or new `RepositoryTreeToolbar.tsx`: render searchable tabs for Branches and Tags, preserve current path on ref switch, show active ref, and use the resolved ref rather than the repository default branch.
- `web/src/components/RepositoryFileFinder.tsx`: share the Go to file combobox across overview/tree pages, search through the Rust file-finder endpoint, preserve selected ref, and navigate on click/Enter.
- Tests cover branch/tag search, active-ref labels, same-path ref switching, fallback to ref root when path is missing on a target ref, Go to file keyboard selection, loading/empty states, and API validation.

**Verification**: `make check && make test && make test-e2e`; browser smoke opens branch selector, searches a branch and tag, switches refs from a nested path, uses Go to file to open a file at the selected ref, and saves `ralph/screenshots/build/repo-004-phase3-ref-file-controls.jpg`.

---

## Phase 4: Large Directory and Visual Guardrails - finish repo-004 for QA handoff

**Done**: [ ]

**Scope**: Add bounded large-directory behavior, final responsive polish, and regression coverage. Large directories must paginate or virtualize without layout shift, every visible menu/button/link must perform a real action, and invalid refs/paths must have repository-scoped recovery.

**Key changes**:
- `crates/api/src/domain/repositories.rs`: paginate tree entries and file-finder results with stable sorting by directory/file/name; include `total`, `page`, `pageSize`, and `hasMore` metadata for tree views.
- `web/src/components/RepositoryTreeBrowser.tsx`: add Load more or virtualization behavior with fixed row heights and no layout shift; keep the latest commit/header rows stable across pagination.
- `web/tests/e2e/repository-tree-navigation.spec.ts`: add desktop/mobile screenshots, large-directory pagination/virtualization checks, branch/path recovery checks, dead-control scans, no horizontal overflow, and row navigation assertions.
- `crates/api/tests/repository_tree_navigation.rs`: add large-directory query-plan and pagination tests plus error-envelope coverage for malformed refs and encoded traversal-like paths.
- `qa-hints.json`, `build-progress.txt`, and `prd.json`: append repo-004 QA notes and set `repo-004.build_pass=true` only after all four phases pass; leave `qa_pass=false`.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke verifies nested directories, branch/tag switching, Go to file, invalid-path recovery, large-directory paging, mobile layout, and saves final repo-004 screenshots under `ralph/screenshots/build/`.
