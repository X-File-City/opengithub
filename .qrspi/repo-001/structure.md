# Structure Outline: repo-001 Repository Creation Flow

**Ticket**: `repo-001`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, existing repository/auth/dashboard code, and `ralph/screenshots/inspect/repo-new-form.jpg`
**Date**: 2026-04-30

## Phase 1: Creation Options and Availability - signed-in `/new` renders real owner/template choices

**Done**: [x]

**Scope**: Replace the placeholder `/new` destination with the GitHub-style create form shell backed by Rust APIs for writable owners, template choices, gitignore templates, license templates, and repository-name availability. This phase does not submit repositories yet; it makes the form truthful and testable with real data.

**Key changes**:
- `crates/api/migrations/202604300012_repository_creation_options.*.sql`: add `repository_creation_templates`, `gitignore_templates`, and `license_templates` seedable lookup tables if no equivalent exists; include stable slugs, display names, descriptions, sort order, and optional template content.
- `crates/api/src/domain/repositories.rs`: add `RepositoryCreationOptions`, `WritableRepositoryOwner`, `RepositoryTemplateOption`, `GitignoreTemplateOption`, `LicenseTemplateOption`, and `RepositoryNameAvailability`; read personal owner plus organizations where the signed-in user can create repositories.
- `crates/api/src/routes/repositories.rs`: add protected `GET /api/repositories/creation-options` and `GET /api/repositories/name-availability?ownerType=&ownerId=&name=` using standard JSON error envelopes.
- `web/src/lib/api.ts`: add typed fetch helpers for creation options and name availability.
- `web/src/app/new/page.tsx` and `web/src/components/RepositoryCreateForm.tsx`: render a centered Primer-style form under the signed-in shell with owner dropdown, required name input, suggestion button, description counter, visibility selector, template selector, README toggle, gitignore dialog trigger, license selector, and disabled submit until Phase 2.
- `crates/api/tests/repository_creation_options.rs` and `web/tests/repository-create.test.tsx`: cover signed-session access, owner permission filtering, lookup data shape, name normalization/availability, form labels, counters, default states, and no inert `href="#"` controls.

**Verification**: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`; browser smoke loads `/new` with a real signed session, verifies option data renders, verifies availability feedback, opens/closes selectors, and saves `ralph/screenshots/build/repo-001-phase1-form-options.jpg`.

---

## Phase 2: Basic Repository Submit - create public/private repositories and redirect to overview

**Done**: [ ]

**Scope**: Make the primary submit path work end-to-end for name, owner, description, visibility, and default branch without advanced bootstrap files. Successful creates redirect to `/{owner}/{repo}`; validation and availability errors stay inline without clearing the form.

**Key changes**:
- `crates/api/src/domain/repositories.rs`: add `CreateRepositoryFromForm` or extend `CreateRepository` with normalized name validation, description length validation, owner permission validation, and predictable conflict errors; create default labels and a repository activity/feed event in the same transaction.
- `crates/api/src/routes/repositories.rs`: update `POST /api/repos` to accept the create-form contract, ignore caller-supplied owner IDs the actor cannot use, and return `201` with owner/name/href metadata.
- `web/src/app/new/actions.ts` or a same-origin route handler: submit form data to the Rust API with forwarded signed cookies and normalize API errors into field/global form state.
- `web/src/components/RepositoryCreateForm.tsx`: enable the green `Create repository` button, preserve field values on error, show inline conflict/validation messages, and redirect to `/{owner}/{repo}` on success.
- `web/src/app/[owner]/[repo]/page.tsx`: ensure newly created empty repositories render a non-404 overview with owner/name/visibility/default branch and empty-code guidance.
- `crates/api/tests/repository_create_flow.rs`, `web/tests/repository-create.test.tsx`, and `web/tests/e2e/repository-create.spec.ts`: cover anonymous 401, unauthorized org owner 403, duplicate name 409, description length validation, successful private/public creation, redirect, and dashboard/repository overview visibility.

**Verification**: `make check && make test && make test-e2e`; browser smoke signs in with a real Rust session, creates a public repository and a private repository via `/new`, verifies redirects and repository overview content, verifies duplicate-name inline errors, and saves `ralph/screenshots/build/repo-001-phase2-create-submit.jpg`.

---

## Phase 3: Bootstrap Files and First Commit - README/template/gitignore/license selections create content

**Done**: [ ]

**Scope**: Honor README, template, gitignore, and license selections by bootstrapping the default branch and first commit metadata/content in the existing repository/git tables. This phase makes the advanced configuration controls materially affect the created repository.

**Key changes**:
- `crates/api/migrations/202604300013_repository_bootstrap_content.*.sql`: add any missing columns/tables needed for bootstrap file metadata, repository feature flags, and activity records while reusing existing `commits`, `git_objects`, and `repository_git_refs` where possible.
- `crates/api/src/domain/repositories.rs`: add `RepositoryBootstrapRequest`, `BootstrapFile`, and transactional bootstrap helpers that create README, `.gitignore`, `LICENSE`, and optional template starter files; compute deterministic object identifiers for tests.
- `crates/api/src/routes/repositories.rs`: extend `POST /api/repos` payload with `initializeReadme`, `templateSlug`, `gitignoreTemplateSlug`, and `licenseTemplateSlug`; validate unknown slugs as `422`.
- `web/src/components/RepositoryCreateForm.tsx`: wire README toggle pressed state, searchable gitignore listbox/dialog selection, license dropdown, and template dropdown into the submitted payload.
- `web/src/app/[owner]/[repo]/page.tsx`: show the initialized file list and README preview when bootstrap files exist; keep the empty guidance when none were selected.
- `crates/api/tests/repository_bootstrap.rs`, `web/tests/repository-create.test.tsx`, and Playwright coverage: verify selected bootstrap files, first commit/ref creation, invalid template errors, README toggle behavior, searchable gitignore selection, and license selector submission.

**Verification**: `make check && make test && make test-e2e`; browser smoke creates a repository with README, a gitignore template, and a license, lands on the repository overview, verifies file rows and README content, and saves `ralph/screenshots/build/repo-001-phase3-bootstrap-files.jpg`.

---

## Phase 4: Full Form Polish and QA Guardrails - finish repo-001 and hand off to QA

**Done**: [ ]

**Scope**: Lock the GitHub-like creation experience across validation, keyboard use, mobile layout, dense option lists, and error recovery; update bookkeeping only after the full feature is verified.

**Key changes**:
- `web/src/components/RepositoryCreateForm.tsx`: polish responsive spacing, disabled/loading states, focus management, keyboard interaction for dropdowns/listbox, normalized-name preview for spaces and punctuation, suggestion button behavior, 350-character description counter, and field-level error placement.
- `web/tests/e2e/repository-create.spec.ts`: add dead-button/dead-link checks, keyboard navigation for owner/visibility/gitignore/license controls, mobile no-overflow checks, conflict recovery without clearing the form, and successful create after an initial validation error.
- `ralph/screenshots/build/`: save reference screenshots for empty form, gitignore selector, validation errors, successful redirect, and mobile form.
- `qa-hints.json`: append repo-001 notes covering org permissions, duplicate races, bootstrap content correctness, long names/descriptions, mobile selector accessibility, and follow-up QA for real Git object semantics.
- `build-progress.txt`: record implemented phase, verification evidence, browser smoke evidence, decisions, and changed files.
- `prd.json`: set `repo-001.build_pass=true` only after all phases are complete and verified; leave `qa_pass=false`.

**Verification**: `make check && make test && make test-e2e`; Ever or Playwright smoke confirms every `/new` control opens/changes/submits as intended, every validation path gives inline feedback, successful creation redirects to a usable repository overview, and no placeholder actions remain.
