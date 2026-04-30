# Structure Outline: repo-003 Repository Code Tab Overview

**Ticket**: `repo-003`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, existing repository/auth/dashboard/import code, `ralph/screenshots/inspect/repo-code-overview.jpg`, `ralph/screenshots/inspect/repo-branch-selector.jpg`, `ralph/screenshots/inspect/repo-code-clone-menu.jpg`, and `ralph/screenshots/inspect/repo-watch-menu.jpg`
**Date**: 2026-04-30

## Phase 1: Code Overview Read Contract - render the real repository workspace shell

**Done**: [x]

**Scope**: Expand the existing repository overview from a placeholder into a permission-aware Code tab read contract and UI shell for the default branch. This phase renders header breadcrumbs, visibility badge, tabs, branch/file toolbar, latest commit summary, root file table, README, and right sidebar metadata from real API data. Mutating Watch/Star/Fork controls remain out of the visible UI until Phase 3 so no rendered control is inert.

**Key changes**:
- `crates/api/src/domain/repositories.rs`: replace the minimal `RepositoryOverview` with a richer `RepositoryCodeOverview` shape containing repository summary, viewer permission, default branch ref, branch/tag counts, latest commit summary, root entries, README file, languages, topics, releases/deployments/contributors counts, clone URLs, and computed hrefs.
- `crates/api/src/routes/repositories.rs`: keep `GET /api/repos/:owner/:repo` as the page contract; enforce signed-session access, public/private permissions, standard error envelopes, and query support for `?ref=` and optional root `path`.
- `web/src/lib/api.ts`: add typed DTOs for `RepositoryCodeOverview`, `RepositoryTreeEntry`, `RepositoryLatestCommit`, `RepositorySidebarMetadata`, and clone URL fields.
- `web/src/app/[owner]/[repo]/page.tsx` and `web/src/components/RepositoryCodeOverview.tsx`: render a GitHub-like full-width repository workspace with working tab links, branch selector display, Go to file link, Add file link, Code dropdown trigger with clone commands, file/folder rows, README panel, and sidebar metadata.
- `crates/api/tests/repository_code_overview.rs`, `web/tests/repository-code-overview.test.tsx`, and Playwright coverage: verify public/private access, imported/bootstrap file ordering, README detection, latest commit summary, sidebar metadata, tab/file hrefs, clone dropdown behavior, and no `href="#"` or dead visible controls.
- `ralph/screenshots/build/`: save a default-branch Code tab screenshot.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke signs in with a real Rust session, opens a repository with bootstrap/imported files, opens the Code clone dropdown, clicks tab links and file rows, and saves `ralph/screenshots/build/repo-003-phase1-code-overview.jpg`.

---

## Phase 2: Tree, Blob, and History Navigation - file rows lead to real destinations

**Done**: [x]

**Scope**: Make Code tab navigation useful beyond the root overview by adding tree/blob/history routes backed by the same repository file metadata. Folder rows open `tree/{ref}/{path}`, file rows open `blob/{ref}/{path}`, and History opens commit history for the current path.

**Key changes**:
- `crates/api/src/domain/repositories.rs`: add `RepositoryPathOverview`, `RepositoryBlobView`, and `RepositoryCommitHistoryItem`; split root entries by path prefix and return path breadcrumbs, parent links, file language/size, latest path commit, and bounded history.
- `crates/api/src/routes/repositories.rs`: add `GET /api/repos/:owner/:repo/contents/*path` and `GET /api/repos/:owner/:repo/commits?path=&ref=` or equivalent REST-shaped routes with permission checks and list envelopes.
- `web/src/app/[owner]/[repo]/tree/[ref]/[[...path]]/page.tsx`, `web/src/app/[owner]/[repo]/blob/[ref]/[[...path]]/page.tsx`, and `web/src/app/[owner]/[repo]/commits/[[...path]]/page.tsx`: render folder listings, blob preview using the existing code/markdown components where appropriate, breadcrumbs, raw/download links where data exists, and commit-history rows.
- `web/src/components/RepositoryFileTable.tsx`: share row rendering between root and nested tree views; folder/file icons and hrefs must be deterministic and URL-encoded.
- Tests cover nested imported files, README in subfolders, missing path 404, binary/large placeholder behavior, history links, mobile no-overflow, and row navigation.

**Verification**: `make check && make test && make test-e2e`; browser smoke opens root, nested tree, blob, and history pages from real file rows, verifies all links resolve, and saves `ralph/screenshots/build/repo-003-phase2-tree-blob-history.jpg`.

---

## Phase 3: Watch, Star, Fork, and Repository Activity - header actions mutate real data

**Done**: [x]

**Scope**: Add the header action buttons with real optimistic UI and Rust write APIs. Watch/Star toggle rows in existing tables, Fork creates a new repository fork with permission checks, and each mutation records repository activity/feed events for later dashboard/search surfaces.

**Key changes**:
- `crates/api/src/domain/repository_social.rs` or `repositories.rs`: add `get_repository_viewer_state`, `set_repository_watch`, `set_repository_star`, and `fork_repository_for_actor` with idempotent semantics, count reconciliation, private-repo permission checks, and feed event creation.
- `crates/api/src/routes/repositories.rs`: add `PUT/DELETE /api/repos/:owner/:repo/star`, `PUT/DELETE /api/repos/:owner/:repo/watch`, and `POST /api/repos/:owner/:repo/forks`; all return updated counts/viewer state or fork href.
- `web/src/app/[owner]/[repo]/actions.ts` or same-origin route handlers: forward signed cookies to Rust and normalize error envelopes.
- `web/src/components/RepositoryHeaderActions.tsx`: render Watch, Fork, and Star controls with counts, menus where needed, loading/disabled states, rollback on failure, and navigation to the forked repository on success.
- Rust, Vitest, and Playwright tests cover anonymous 401, private 403, idempotent toggles, count updates, duplicate fork conflicts, optimistic rollback, and no credential/error leaks.

**Verification**: `make check && make test && make test-e2e`; browser smoke toggles Watch and Star, creates a fork for a test repository, confirms counts reconcile after reload, confirms dashboard feed activity exists, and saves `ralph/screenshots/build/repo-003-phase3-header-actions.jpg`.

---

## Phase 4: Branch Selector, Go To File, and Sidebar Polish - complete Code tab ergonomics

**Done**: [x]

**Scope**: Finish the GitHub-like Code tab ergonomics: branch/tag selector, Go to file combobox, Add file dropdown destinations, clone/download menu details, sidebar topics/resources/language bar, and empty-repository quick setup.

**Key changes**:
- `crates/api/src/domain/repositories.rs`: add branch/tag list DTOs, repository topic CRUD helpers if missing, language percentage calculation, contributor summaries, release/deployment summaries, and quick-setup clone/push commands for empty repositories.
- `crates/api/src/routes/repositories.rs`: add `GET /api/repos/:owner/:repo/refs`, `GET /api/repos/:owner/:repo/file-finder?q=`, and any read endpoints needed for sidebar counts; defer actual file creation to a later feature but make Add file menu links route to real placeholder pages.
- `web/src/components/RepositoryBranchSelector.tsx`, `RepositoryFileFinder.tsx`, `RepositoryCloneMenu.tsx`, and `RepositorySidebar.tsx`: implement keyboard-accessible menus/comboboxes, copyable clone URL fields, topic chips, resource links, language bar, releases/deployments/contributors cards, and quick-setup commands for empty repositories.
- `web/src/app/[owner]/[repo]/new/main/page.tsx` and upload placeholder routes: render reachable signed-in placeholders so Add file menu links are not dead before full file-edit features land.
- Tests cover branch switching URLs, tag count display, file finder keyboard selection, clone menu copy affordances, sidebar truncation, empty repository quick setup, responsive layout, and accessibility labels.

**Verification**: `make check && make test && make test-e2e`; browser smoke opens branch selector, finds a file, opens clone menu, follows Add file links, verifies empty and non-empty repository states, checks mobile layout, and saves `ralph/screenshots/build/repo-003-phase4-code-toolbar-sidebar.jpg`.

---

## Phase 5: Final Visual QA and Regression Guardrails - finish repo-003 for QA handoff

**Done**: [x]

**Scope**: Lock down the completed repository Code tab against visual, accessibility, API-contract, and regression failures; update bookkeeping only after the full feature passes.

**Key changes**:
- `web/tests/e2e/repository-code-overview.spec.ts`: add end-to-end coverage for public/private repositories, empty repositories, imported repositories, bootstrap repositories, nested paths, header actions, toolbar menus, tab navigation, mobile layout, and dead-control scanning.
- `crates/api/tests/repository_code_security.rs`: cover auth bypass, private repo access, path traversal attempts, invalid refs, malformed path encoding, mutation authorization, and no stack traces in error envelopes.
- `ralph/screenshots/build/`: save final screenshots for default overview, empty quick setup, clone menu, branch selector, watch menu/action state, sidebar/language bar, nested tree/blob/history, and mobile.
- `qa-hints.json`: append repo-003 notes covering Git metadata fidelity limits, imported large/binary files, branch/tag edge cases, fork semantics, optimistic action races, and sidebar count freshness.
- `build-progress.txt` and `prd.json`: record verification evidence and set `repo-003.build_pass=true` only after all phases are complete; leave `qa_pass=false`.

**Verification**: `make check && make test && make test-e2e`; Ever or Playwright smoke confirms every visible button/menu/link on `/{owner}/{repo}` performs a real action or reaches a real page, all API responses use the standard envelopes, screenshots are saved, and no placeholder Code tab controls remain.
