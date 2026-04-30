# Structure Outline: git-001 HTTPS Git Transport, Raw Files, and Archives

**Ticket**: `git-001`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, `.qrspi/repo-003/structure.md`, `.qrspi/repo-004/structure.md`, existing repository/blob/import implementation, `ralph/screenshots/inspect/repo-code-clone-menu.jpg`, `ralph/screenshots/inspect/repo-blob-file-view.jpg`
**Date**: 2026-04-30

## Phase 1: Read-Only Smart HTTP Clone - public repositories clone with real Git

**Done**: [ ]

**Scope**: Add the durable Git backing store and the upload-pack smart HTTP routes needed for `git clone` and `git fetch` on public repositories. Existing repository creation/import paths must materialize or refresh a bare Git repository so the UI clone URL points at a working endpoint, not only metadata.

**Key changes**:
- `crates/api/migrations/*_git_transport.*.sql`: add Git transport metadata, for example `repository_git_storage` with `repository_id`, `storage_kind`, `storage_path`, `last_materialized_commit_id`, `last_materialized_at`, and integrity/audit fields.
- `crates/api/src/domain/git_transport.rs`: introduce `GitRepositoryStore`, `GitServiceRequest`, `GitTransportError`, `materialize_bare_repository`, `advertise_upload_pack`, and `run_upload_pack` helpers backed by a configured local storage root for development and an S3/ECS-compatible path contract for deployment.
- `crates/api/src/routes/git.rs`: add GitHub-style smart HTTP read routes such as `GET /:owner/:repo.git/info/refs?service=git-upload-pack` and `POST /:owner/:repo.git/git-upload-pack`; enforce public/private visibility before invoking Git plumbing.
- `crates/api/src/domain/repositories.rs` and import/create jobs: call the materialization helper after bootstrap repository creation and after successful import snapshots so existing Code tab repositories have cloneable refs.
- `web/src/components/RepositoryCloneMenu.tsx` / Code toolbar components: keep HTTPS as the visible tab, show the `https://opengithub.namuh.co/{owner}/{repo}.git` URL, and keep SSH hidden/disabled until SSH support ships.
- Tests: add Rust integration tests that seed a public repository, call the smart HTTP discovery endpoint, run `git clone` against the Axum server, and verify fetched files/refs match the repository overview.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`; scenario script starts the API, runs `git clone http://localhost:3016/{owner}/{repo}.git`, verifies `README.md` and branch refs, then saves a Code menu screenshot.

---

## Phase 2: Private Fetch Auth - sessions and tokens unlock private clone/fetch

**Done**: [ ]

**Scope**: Extend clone/fetch authorization from public-only to private repositories using the existing Rust session cookie path plus personal access token hashes for Git clients. This phase remains read-only: `git fetch` works, `git push` still returns a clear unsupported/forbidden response until Phase 3.

**Key changes**:
- `crates/api/src/auth/token.rs` or `domain/tokens.rs`: add personal access token verification against `personal_access_tokens` hashes, prefix lookup, expiry, scope checks, and `last_used_at` updates.
- `crates/api/src/routes/git.rs`: parse Basic auth bearer/token credentials and signed session cookies; require `repo:read` or repository collaborator permission for private upload-pack.
- `crates/api/src/domain/permissions.rs`: expose a transport-focused permission function returning read/write Git capabilities for user, org, team, and repository permission rows.
- `web/src/app/settings/tokens/...` or a minimal developer-token route if no settings shell exists yet: provide a reachable token docs/placeholder surface only if needed for smoke testing; token creation UI remains in `dx-001` unless already available.
- Tests: cover anonymous public clone, anonymous private denial, invalid/expired token denial, valid token private clone/fetch, session-cookie private fetch, and no token/hash leakage in errors or request logs.

**Verification**: `make check && make test`; scenario script creates a private repository and PAT, verifies `git clone` fails anonymously and succeeds with token auth, then verifies `api_request_logs` redact authorization headers.

---

## Phase 3: Authenticated Push - receive-pack writes refs, files, activity, and audit logs

**Done**: [ ]

**Scope**: Implement `git push` over HTTPS for authorized users. Pushed commits update the bare repository, synchronize refs and file snapshots back into Postgres, and appear immediately in the repository Code tab/history without requiring a manual import.

**Key changes**:
- `crates/api/src/routes/git.rs`: add `GET /:owner/:repo.git/info/refs?service=git-receive-pack` and `POST /:owner/:repo.git/git-receive-pack`; require `repo:write` or admin/maintain/write repository permission.
- `crates/api/src/domain/git_transport.rs`: add `run_receive_pack`, `sync_pushed_refs_to_database`, and bounded object/file indexing from the updated bare repository into `commits`, `git_objects`, `repository_git_refs`, and `repository_files`.
- `crates/api/src/domain/repositories.rs`: reuse existing snapshot helpers where possible and add conflict-safe ref updates, default-branch creation for empty repositories, large/binary file handling, and path traversal guards.
- `crates/api/src/domain/search.rs` and activity helpers: enqueue/update search documents and write `repository_activity_events` plus audit records for push events.
- Tests: run a real local `git push` into a seeded empty and non-empty repository; verify refs, commit metadata, file rows, raw/blob views, activity events, unauthorized push denial, and concurrent stale ref behavior.

**Verification**: `make check && make test`; browser smoke creates an empty repo, follows Quick setup commands with a local Git checkout, pushes `README.md`, reloads `/{owner}/{repo}`, and saves `ralph/screenshots/build/git-001-phase3-push-code-tab.jpg`.

---

## Phase 4: Raw and Archive Streaming - bounded downloads use real repository data

**Done**: [ ]

**Scope**: Add GitHub-style raw file and source archive endpoints that stream bounded responses from the selected ref. The Code menu Download ZIP action must generate or reuse an archive and every raw/download link on blob pages must resolve through Rust authorization.

**Key changes**:
- `crates/api/migrations/*_repository_archives.*.sql`: add `repository_archives` with `repository_id`, `ref_name`, `target_oid`, `format`, `storage_key`, `byte_size`, `status`, `created_by_user_id`, `created_at`, and uniqueness on reusable archive identity.
- `crates/api/src/domain/git_archives.rs`: add `stream_raw_file`, `ensure_repository_archive`, `stream_repository_archive`, cache invalidation after pushes, and response size/content-type guards.
- `crates/api/src/routes/git.rs` or `routes/repositories.rs`: expose `GET /:owner/:repo/raw/:ref/*path` and `GET /:owner/:repo/archive/refs/heads/:branch.zip` plus tag/commit variants; enforce public/private permissions before streaming.
- `web/src/components/RepositoryBlobViewer.tsx` and clone menu: route Open raw, Copy raw, Download, and Download ZIP actions to the Rust-backed endpoints; show success/error feedback for copy and archive failures.
- Tests: cover raw text/binary content types, missing ref/path 404 envelopes, private raw denial, archive cache reuse, archive regeneration after push, large response bounds, and no stack traces.

**Verification**: `make check && make test && make test-e2e`; browser smoke opens a blob, clicks raw/download actions, downloads ZIP from the Code menu, verifies archive contents with `unzip -l`, and saves `ralph/screenshots/build/git-001-phase4-archive-menu.jpg`.

---

## Phase 5: Developer Docs, Security, and QA Guardrails - finish git-001 for handoff

**Done**: [ ]

**Scope**: Complete the user-facing Git workflow surfaces and lock the feature down with E2E, API-contract, and security tests. Empty repositories show working Quick setup commands for clone, README creation, and push; docs show opengithub remote examples; no visible Git controls are inert.

**Key changes**:
- `web/src/app/docs/git/page.tsx` or existing docs surface: add HTTPS clone/fetch/push examples, PAT/private repository notes, raw/archive examples, and no GitHub API URLs.
- Empty repository Code tab components: render Quick setup commands using the working `.git` remote, default branch, and token guidance; copy buttons must use real clipboard handlers and success feedback.
- `web/tests/e2e/git-transport.spec.ts`: drive a signed-in repository through clone menu, Quick setup command visibility, raw file access, archive download, and no-dead-control scanning.
- `crates/api/tests/git_transport_security.rs`: cover auth bypass, private repository leakage, token scope boundaries, receive-pack write authorization, invalid service names, oversized requests, malformed paths, request-log redaction, and safe degraded errors.
- `qa-hints.json`, `build-progress.txt`, and `prd.json`: append Git transport QA notes and set `git-001.build_pass=true` only after all phases pass; leave `qa_pass=false`.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; final smoke runs real `git clone`, `git fetch`, `git push`, raw download, ZIP download, private-token checks, docs/Code menu checks, and saves final screenshots under `ralph/screenshots/build/`.
