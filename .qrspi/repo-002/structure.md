# Structure Outline: repo-002 Repository Import Flow

**Ticket**: `repo-002`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, existing repository/auth/dashboard code, `.qrspi/repo-001/structure.md`, and `web/src/app/new/import/page.tsx`
**Date**: 2026-04-30

## Phase 1: Import Request Contract - create repositories and queued import jobs

**Done**: [x]

**Scope**: Replace the placeholder import route with a protected Rust API contract that validates a public Git remote URL, destination owner/name/visibility, optional source credentials metadata, creates the destination repository, records an import job, and returns a status URL. This phase does not clone remote contents yet; the queued/import status path is real and testable.

**Key changes**:
- `crates/api/migrations/202604300014_repository_imports.*.sql`: add `repository_imports` with status `queued|importing|imported|failed`, source URL host/path metadata, destination repository, requested actor, error code/message, progress message, timestamps, and job lease linkage; add `repository_import_credentials` storing only encrypted/opaque secret references or redacted metadata, never plaintext credentials.
- `crates/api/src/domain/repository_imports.rs`: add `CreateRepositoryImport`, `RepositoryImport`, `RepositoryImportStatus`, `RepositoryImportError`, `validate_import_source_url`, and `create_repository_import` that reuses repository owner/name validation, rejects non-HTTP(S)/non-Git-looking URLs, rejects localhost/private-network hosts, creates the repository transactionally, and enqueues a `repository_import` job.
- `crates/api/src/routes/repository_imports.rs`: add protected `POST /api/repos/imports` and `GET /api/repos/imports/:id`; responses use standard error envelopes and include `statusHref`, `repositoryHref`, and redacted source metadata.
- `crates/api/src/lib.rs` and `crates/api/src/domain/mod.rs`: wire the new route/domain without changing existing repository creation behavior.
- `crates/api/tests/repository_imports.rs`: cover anonymous 401, invalid URL 422, private-network host rejection, duplicate name 409, owner permission 403, successful queued import, credential redaction, job enqueue, and status read isolation.
- `qa-hints.json` and `build-progress.txt`: log that clone execution and UI are later phases.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`; `.scratch/repository-import-contract-scenario.sh` posts a real signed-session import request to the live Rust API and verifies the queued status response plus database rows.

---

## Phase 2: Import Worker Ingestion - process public remotes into repository files and refs

**Done**: [x]

**Scope**: Add the worker-side importer that acquires queued import jobs, clones/fetches a public Git remote into temporary storage, snapshots the default branch into existing repository commit/ref/file/object metadata, updates status transitions, and records failure reasons. This phase makes a public remote import finish without UI involvement.

**Key changes**:
- `Cargo.toml` and `crates/api/Cargo.toml`: add a real Git implementation dependency such as `gix` or `git2` only after installing/adding it to the manifests; add `tempfile` if needed for isolated clone work.
- `crates/api/src/jobs/repository_imports.rs`: add `run_repository_import_once(pool, import_id, worker_id)` and `run_next_repository_import(pool, worker_id)` that acquire `job_leases`, mark `importing`, enforce timeout/size/path bounds, import HEAD/default branch metadata, write `repository_files`, `git_objects`, `commits`, and `repository_git_refs`, then mark `imported` or `failed`.
- `crates/api/src/domain/repository_imports.rs`: add status transition helpers, failure mapping for unreachable source, invalid credentials, unsupported repository, private-network source, and duplicate/permission errors.
- `crates/api/src/domain/repositories.rs`: expose narrowly scoped file/ref/commit insertion helpers needed by the importer instead of duplicating bootstrap logic.
- `crates/api/tests/repository_import_worker.rs`: create a local bare Git fixture, queue an import with a `file://` fixture only under test-only guard or helper, run the worker once, and verify imported status, default branch ref, commit metadata, file rows, README content, notification/job completion, and deterministic failure behavior for unreachable sources.
- `.scratch/repository-import-worker-scenario.sh`: build a temporary local Git remote, queue an import, run the worker helper, and verify the resulting repository overview over HTTP.

**Verification**: `make check && make test`; the worker scenario imports a real Git fixture into Postgres and verifies `GET /api/repos/{owner}/{repo}` returns imported files. Browser smoke remains skipped because the visible UI is Phase 3.

---

## Phase 3: Import Wizard and Status Page - signed-in users can submit and watch progress

**Done**: [x]

**Scope**: Replace `/new/import` with the GitHub-style wizard and add a status page that polls the Rust import status until queued/importing/imported/failed. Every visible control submits real data, and completion links to the imported repository.

**Key changes**:
- `web/src/lib/api.ts`: add typed `RepositoryImportRequest`, `RepositoryImportStatus`, `createRepositoryImportFromCookie`, `getRepositoryImportFromCookie`, and URL builders for same-origin import routes.
- `web/src/app/new/import/page.tsx`: render the wizard titled `Import your project to opengithub` inside `AppShell`, using the existing creation-options API for owner choices and matching compact GitHub form styling; fields include source URL, optional username/token/password credential controls, destination owner/name, visibility, and green `Begin import`.
- `web/src/app/new/import/route.ts` or `web/src/app/new/imports/route.ts`: forward form submissions to `POST /api/repos/imports` with signed cookies and return field/global errors without exposing source credentials.
- `web/src/app/new/import/[importId]/page.tsx` and `web/src/components/RepositoryImportStatusPanel.tsx`: render repository name, redacted source, status badge, spinner/progress message, error callout, retry/back links where appropriate, and completion link to `/{owner}/{repo}`; poll through a same-origin status route.
- `web/tests/repository-import.test.tsx`: cover form defaults, owner/name/visibility submission payloads, credential redaction, inline validation, status badge/callout rendering, polling URL construction, and no inert buttons or `href="#"`.
- `web/tests/e2e/repository-import.spec.ts`: signed-in E2E loads `/new/import`, validates bad URL feedback, submits a reachable fixture/import stub path seeded through the test DB, lands on the status page, and verifies completion navigation.

**Verification**: `make check && make test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke starts `make dev`, signs in with a real Rust session, submits a public import, verifies status progression/completion or a controlled failed state, clicks the repository link, and saves `ralph/screenshots/build/repo-002-phase3-import-wizard.jpg`.

---

## Phase 4: Final Error UX, Notifications, Email Job, and QA Guardrails

**Done**: [x]

**Scope**: Finish repo-002 by hardening edge cases, visible status/error states, email/notification side effects, accessibility, mobile layout, and regression coverage. Mark the PRD complete only after the full import path is verified.

**Key changes**:
- `crates/api/src/domain/notifications.rs` and import worker code: create an in-app notification and queued email job when an import finishes or fails; keep SES delivery as a later infrastructure-backed worker if no SES sender exists yet, but persist a real job record with redacted payload.
- `crates/api/tests/repository_import_security.rs`: cover credential non-persistence in logs/errors, private-network/localhost/IP literal blocking, status access by non-owner, duplicate destination races, source URL normalization, unsupported remote errors, and no stack traces in API envelopes.
- `web/src/components/RepositoryImportForm.tsx` and `RepositoryImportStatusPanel.tsx`: polish mobile layout, disabled/loading states, ARIA status announcements, keyboard focus after errors, long URL/name truncation, retry/back actions, and clear completion/error callouts.
- `web/tests/e2e/repository-import.spec.ts`: add dead-control checks, mobile no-overflow, failed import state, completed import state, and status polling stop conditions.
- `ralph/screenshots/build/`: save empty wizard, validation error, queued/importing status, failed status, completed status, and mobile screenshots.
- `qa-hints.json`: append repo-002 notes covering remote provider diversity, credential redaction, private network blocking, real SES delivery, large repositories, LFS omission, and Git metadata fidelity.
- `build-progress.txt` and `prd.json`: record verification evidence and set `repo-002.build_pass=true` only after all phases are complete; leave `qa_pass=false`.

**Verification**: `make check && make test && make test-e2e`; Ever or Playwright smoke confirms every `/new/import` control works, bad sources show actionable errors, a public Git fixture imports through the worker into a usable repository overview, failed imports do not leak credentials, completion creates notification/email jobs, and all final screenshots are saved.
