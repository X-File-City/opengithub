# Structure Outline: issues-003 Repository Issue Creation

**Ticket**: `issues-003`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, `web/AGENTS.md`, `design/project/Prototype.html`, `design/project/og-screens-4.jsx`, `.qrspi/issues-001/structure.md`, `.qrspi/issues-002/structure.md`, current `crates/api/src/domain/issues.rs`, current `crates/api/src/routes/issues.rs`, current `web/src/app/[owner]/[repo]/issues/new/page.tsx`, current `web/src/components/RepositoryIssuesPage.tsx`, and current Markdown editor/rendering components.
**Date**: 2026-05-01

## Phase 1: Generic Issue Composer - create a plain issue end-to-end

**Done**: [x]

**Scope**: Replace the placeholder `/{owner}/{repo}/issues/new` route with an authenticated Editorial issue creation page that supports title/body entry, Write/Preview Markdown tabs, validation, Cancel, Create, and Create more for the generic no-template path. This phase proves the create API, page form, Markdown preview, redirect, and issue-list return path work without introducing templates yet.

**Key changes**:
- `crates/api/src/routes/issues.rs`: extend `CreateIssueRequest` and `POST /api/repos/:owner/:repo/issues` response handling enough for a screen-friendly create result and stable `422 validation_failed` title/body envelopes.
- `crates/api/src/domain/issues.rs`: keep permission-aware `create_issue` as the write boundary; add any missing body-version/initial-comment/search-index hooks only if the current data model requires them for a real issue body.
- `web/src/lib/api.ts`: add typed issue-create request/response helpers and a same-origin route helper for forwarding signed cookies from the form action.
- `web/src/app/[owner]/[repo]/issues/new/page.tsx`: fetch repository context, render the real route inside `RepositoryShell`, redirect anonymous users through the existing auth wall, and preserve `title`/`body` query-parameter prefill.
- `web/src/components/IssueCreateForm.tsx`: new client form using `.input`, `.btn`, `.card`, `.tabs`, `.chip`, `.t-*`, and `MarkdownEditor`; no GitHub color literals, Primer, Octicons, or inert controls.
- Tests: Rust API create validation/authz coverage, Vitest form validation/preview/prefill/Create more coverage, and Playwright signed-session create flow screenshot `ralph/screenshots/build/issues-003-phase1-generic-create.jpg`.

**Verification**: focused Rust create tests, focused `issue-create` Vitest, focused Playwright create-flow smoke, mandatory Editorial banned-value scan, then `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`.

---

## Phase 2: Template Chooser - configured templates drive the route

**Done**: [ ]

**Scope**: Add repository issue-template metadata and a chooser screen. Repositories with templates show `Create new issue` template cards first; choosing a template loads the configured title/body/default labels/type/assignees into the composer. Repositories without templates go directly to Phase 1's generic composer.

**Key changes**:
- `crates/api/migrations/*_issue_templates.*.sql`: add `issue_templates` and minimal `issue_form_fields` tables keyed by repository, with slug/name/description/body/prefill/default metadata and timestamps.
- `crates/api/src/domain/issues.rs`: add template list/read helpers gated by repository read access and maintain write checks for default metadata that can only be applied by authorized users.
- `crates/api/src/routes/issues.rs`: add `GET /api/repos/:owner/:repo/issues/templates` and include safe template detail by slug/id; keep missing templates as standard 404 envelopes.
- `web/src/app/[owner]/[repo]/issues/new/page.tsx`: branch between template chooser and composer based on API data and `template=` query state.
- `web/src/components/IssueTemplateChooser.tsx`: Editorial card grid for template cards, generic blank issue option, and no dead buttons.
- Tests: migration/domain template contract tests, Vitest chooser routing/prefill tests, and Playwright chooser-to-composer smoke screenshot `ralph/screenshots/build/issues-003-phase2-template-chooser.jpg`.

**Verification**: migration-backed Rust tests plus focused frontend tests and Playwright; standard `make check` and `make test`. Full E2E runs if the new route or template chooser changes shared navigation behavior.

---

## Phase 3: Issue Form Fields - required template inputs and Markdown sections validate

**Done**: [ ]

**Scope**: Render GitHub-style issue-form fields from `issue_form_fields`: required text inputs, textarea/Markdown sections with Write/Preview tabs, explanatory template body, required markers, validation messages, and Command+Enter submission. This phase makes template forms more than static body prefill.

**Key changes**:
- `crates/api/src/domain/issues.rs`: add form-field DTOs and create-request validation that checks required configured fields server-side, not only in the browser.
- `crates/api/src/routes/issues.rs`: accept `template_id`/`templateSlug` and structured `field_values`; return field-level validation details in the standard error envelope.
- `web/src/components/IssueCreateForm.tsx`: render field components from template metadata, join field values into the persisted issue body/body version, wire Command+Enter, and show `Nothing to preview` for empty previews.
- `web/src/app/markdown/preview/route.ts` or existing preview client: reuse the current Markdown render API for per-field preview without adding a JS-side Markdown renderer.
- Tests: Rust required-field validation and persisted body composition; Vitest field validation/preview/keyboard submit; Playwright required-field blocking and successful form submit screenshot `ralph/screenshots/build/issues-003-phase3-form-fields.jpg`.

**Verification**: focused API/form tests, focused Vitest, focused Playwright, then `make check` and `make test`.

---

## Phase 4: Metadata, Attachments, and Notifications - submit applies authorized side effects

**Done**: [ ]

**Scope**: Complete create side effects: template-provided labels/type/assignees when authorized, optional milestone/project hooks where the current data model supports them, attachment metadata affordances, initial body/comment/body-version records, timeline events, search indexing, and notifications for assignees/watchers. Attachment uploads may remain metadata-only until the S3 upload feature lands, but the UI must be honest and non-dead.

**Key changes**:
- `crates/api/migrations/*_issue_create_side_effects.*.sql`: add `issue_body_versions` and `issue_attachments` only if absent; use existing `issue_labels`, `issue_assignees`, `timeline_events`, `notifications`, and search document tables.
- `crates/api/src/domain/issues.rs`: add a transactional create path that applies template metadata, writes body history/initial timeline metadata, validates label/assignee permissions, and records attachment metadata without exposing submitted credentials or local file paths.
- `crates/api/src/domain/notifications.rs`: reuse `create_notification` for issue creation assignment/watch notifications where recipients are known.
- `web/src/components/IssueCreateForm.tsx`: add attachment drop zone/file input affordance, selected attachment rows, inline unsupported/upload-pending copy if binary upload is deferred, and metadata chips for labels/assignees supplied by the template.
- Tests: transactional side-effect Rust tests, permission denial tests for unauthorized metadata, Vitest attachment affordance tests, and Playwright create-with-template-metadata smoke.

**Verification**: real Postgres scenario for one issue created with template labels/assignees/body version/attachment metadata/notification rows, plus standard `make check`, `make test`, and focused E2E.

---

## Phase 5: Issue Creation Guardrails and QA Handoff - finish issues-003

**Done**: [ ]

**Scope**: Harden accessibility, query-prefill edge cases, visual compliance, dead-control checks, mobile layout, privacy/redaction, and final bookkeeping. Mark `issues-003` complete only after generic creation, template chooser, required fields, Markdown preview, metadata side effects, attachment affordances, Cancel, Create more, and redirect flows are all verified.

**Key changes**:
- `crates/api/tests/api_repository_issue_creation_contract.rs`: final matrix for anonymous/private/public access, validation envelopes, template required fields, metadata authorization, create-more-safe idempotency assumptions, notification/body-version side effects, and redaction.
- `web/tests/issue-create.test.tsx`: final coverage for accessible labels, required markers, Write/Preview tabs, Command+Enter hint/submit, Cancel href, Create more behavior, query-parameter prefill, no `href="#"`, and no placeholder buttons.
- `web/tests/e2e/repository-issue-create.spec.ts`: signed-session sweep for generic create, template chooser, required-field blocking, Markdown preview, Create more reset, Cancel return, redirect to issue detail, and mobile no-overflow.
- `ralph/screenshots/build/`: save final desktop/mobile issue-create screenshots.
- Mandatory Editorial banned-value scan before commit: `rg -nE '#(0969da|1f883d|1a7f37|cf222e|82071e|f6f8fa|1f2328|d0d7de|59636e|f1aeb5|fff1f3)\b|@primer/|Octicon' web/src/ --glob '!**/og*.css'`.
- `qa-hints.json`, `build-progress.txt`, and `prd.json`: record verification evidence and set `issues-003.build_pass=true` only after every phase is complete; leave `qa_pass=false`.

**Verification**: `.scratch/issues-003-create-scenario.sh`, `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check`, `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`, and `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke proves every button/link/form path is live and saves screenshots.
