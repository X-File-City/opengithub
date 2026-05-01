# Structure Outline: prs-003 Pull Request Compare and Create Flow

**Ticket**: `prs-003`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, `web/AGENTS.md`, `design/project/Prototype.html`, `design/project/og-screens-3.jsx`, `ralph/screenshots/inspect/pr-compare-no-diff.jpg`, `ralph/screenshots/inspect/pr-files-diff.jpg`, `.qrspi/prs-001/structure.md`, `.qrspi/prs-002/structure.md`, `.qrspi/repo-004/structure.md`, `.qrspi/issues-004/structure.md`, current `crates/api/src/domain/pulls.rs`, current `crates/api/src/routes/pulls.rs`, current repository ref/tree/blob APIs, current issue template APIs, current `web/src/app/[owner]/[repo]/compare/page.tsx`, and current `web/src/components/RepositoryPullsPage.tsx`.
**Date**: 2026-05-01

## Phase 1: Compare Contract - refs resolve to commits and changed files

**Done**: [x]

**Scope**: Replace the placeholder compare surface with a real permission-aware read contract for `/{owner}/{repo}/compare/{base}...{head}` and `/api/repos/:owner/:repo/compare/:base...:head`. The API resolves base/head refs, supports same-repository comparisons first, computes ahead/behind commit lists from stored commit/ref metadata, returns changed-file summaries from indexed repository file/blob data, detects same-ref/no-diff states, and emits repository-scoped errors for invalid refs.

**Key changes**:
- `crates/api/migrations/*_pull_request_compare.*.sql`: add narrow tables only if missing for persisted comparison snapshots, such as `pull_request_commits` and `pull_request_files`, while reusing `repository_git_refs`, `commits`, and repository file/blob metadata for read comparisons.
- `crates/api/src/domain/pulls.rs`: add `PullRequestCompareView`, `CompareRef`, `CompareCommit`, `CompareFile`, `CompareStatus`, and `compare_pull_request_refs_for_actor`; enforce `RepositoryRole::Read` on both visible repositories and normalize branch/tag names safely.
- `crates/api/src/routes/pulls.rs`: add compare GET routing with standard envelopes for `same_ref`, `no_diff`, `invalid_ref`, `private_head_repository`, and validation errors; clamp file/commit counts and include recovery hrefs for the default branch and pull-list page.
- `web/src/lib/api.ts`: add typed compare DTOs and `getPullRequestCompareFromCookie`, preserving API error envelopes.
- `crates/api/tests/api_pull_request_compare_contract.rs`: seed real repositories, refs, commits, file snapshots, and assert base/head resolution, no-diff behavior, changed-file summaries, public/private access, invalid refs, pagination bounds, and duplicate-friendly metadata.
- `.scratch/prs-003-compare-contract-scenario.sh`: exercise the compare endpoint against the real Axum API and Postgres without mocks.

**Verification**: focused Rust compare contract tests and the `.scratch` scenario pass, then `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`. Browser smoke is optional in this backend contract phase.

---

## Phase 2: Editorial Compare Page - branch selectors and diff summary are live

**Done**: [x]

**Scope**: Implement the Next.js compare page for `/{owner}/{repo}/compare/{base}...{head}` and make the existing `/{owner}/{repo}/compare` entry route redirect or default to `default_branch...<candidate>`. The page renders the Editorial `Comparing changes` layout with base/head selectors, compare-across-forks affordance, swap direction link, split/unified controls, commits/files summary, no-diff callout, sample comparison links, and no dead controls.

**Key changes**:
- `web/src/app/[owner]/[repo]/compare/[range]/page.tsx`: fetch Phase 1 data server-side, parse `{base}...{head}`, render repository-scoped unavailable states, and keep auth redirects only for write actions.
- `web/src/app/[owner]/[repo]/compare/page.tsx`: replace the placeholder with a real compare landing that links to valid branch comparisons and pull-list recovery.
- `web/src/components/PullRequestComparePage.tsx`: new Editorial page component using `.btn`, `.chip`, `.card`, `.input`, `.tabs`, `.list-row`, `.t-*`, and existing diff summary components where possible; use tokenized status colors only.
- `web/src/components/CompareRefSelector.tsx`: searchable Branches/Tags selector reusing `RepositoryCodeToolbar` ref contracts; changing a ref updates the URL and preserves the other side.
- `web/src/lib/navigation.ts`: add compare range parsing/building, swap hrefs, split/unified mode hrefs, and create form href helpers without `href="#"`.
- Tests: Vitest coverage for range parsing, ref selector behavior, no-diff and invalid-ref rendering, split/unified toggles, swap links, and dead-control scans; Playwright smoke saves `ralph/screenshots/build/prs-003-phase2-compare-page.jpg`.

**Verification**: focused frontend tests, focused Playwright compare smoke, mandatory Editorial banned-value scan, then standard `make check` and `make test`.

---

## Phase 3: Create Form Contract - title, template body, draft, and metadata persist

**Done**: [ ]

**Scope**: Upgrade the Rust create endpoint from a minimal PR insert into the full create contract. Creating a PR validates base/head comparison, prevents duplicate open PRs for the same base/head/head repository, preloads pull request template content, persists draft state, labels, milestone, assignees, reviewers, linked closing keywords, commits/files snapshots, timeline events, notifications, audit records, and returns the canonical `/pull/{number}` href.

**Key changes**:
- `crates/api/migrations/*_pull_request_create_metadata.*.sql`: add `pull_request_templates` and any missing uniqueness/index support for duplicate detection, PR commit/file snapshots, review requests, and draft metadata.
- `crates/api/src/domain/pulls.rs`: extend `CreatePullRequest` with `is_draft`, `label_ids`, `milestone_id`, `assignee_user_ids`, `reviewer_user_ids`, `template_slug`, and optional `head_repository_id`; add validation helpers for duplicate open PRs, ref differences, reviewer/assignee permissions, label/milestone ownership, closing keyword extraction, and snapshot writes.
- `crates/api/src/routes/pulls.rs`: accept the richer create JSON shape, return `201` with detail plus `href`, and return standard `422` validation envelopes for same refs, no diff, duplicate PR, unauthorized metadata, and invalid IDs.
- `crates/api/src/domain/issues.rs`: reuse supported issue label/assignee/milestone/cross-reference helpers so PR creation stays consistent with issue metadata semantics.
- `crates/api/tests/api_pull_request_create_contract.rs`: seed labels, milestones, users, review requests, templates, refs, linked issues, duplicate PRs, and assert persistence, timeline/search/notification/audit side effects, and private/public permission boundaries against real Postgres.
- `.scratch/prs-003-create-contract-scenario.sh`: create a PR through the live API with metadata and verify rows in Postgres plus the returned PR detail URL.

**Verification**: focused Rust create contract tests and `.scratch` scenario pass, then `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`. Browser smoke waits for Phase 4 when the form exists.

---

## Phase 4: Create Pull Request UI - form submits and redirects to detail

**Done**: [ ]

**Scope**: Render the create form when refs differ and the viewer can write. The form includes title input, Markdown body editor prefilled from the selected template, draft checkbox, reviewers/assignees/labels/milestone selectors, duplicate/no-diff warnings, Create pull request button, success/error feedback, and redirect to `/{owner}/{repo}/pull/{number}` after creation.

**Key changes**:
- `web/src/components/PullRequestCreateForm.tsx`: client component for title/body/draft/metadata selection and submit state, using `MarkdownEditor`, existing issue/PR picker menu primitives, and Editorial controls only.
- `web/src/app/[owner]/[repo]/pulls/create/route.ts` or compare-local route handler: same-origin POST proxy that forwards signed cookies to the Rust create endpoint and preserves standard error envelopes.
- `web/src/components/PullRequestComparePage.tsx`: show the create form only for valid differing refs; show sign-in CTA for anonymous write attempts; show duplicate/no-diff/permission callouts with concrete links.
- `web/src/lib/api.ts`: add typed create request/response and pull request template option DTOs.
- `web/tests/pull-request-create.test.tsx`: cover template prefill, Markdown preview, draft checkbox, metadata menus, duplicate/no-diff states, validation errors, redirect href, no placeholder buttons, and accessible labels.
- `web/tests/e2e/pull-request-create.spec.ts`: seed a signed-session repository, open compare, choose base/head, fill metadata, create a draft PR, assert redirect to detail, and save `ralph/screenshots/build/prs-003-phase4-create-form.jpg`.

**Verification**: focused Vitest, focused Playwright create flow, `make check`, `make test`, and `make test-e2e`. Browser smoke proves every visible selector and submit action is live.

---

## Phase 5: Fork Comparison and PR Creation Guardrails - finish prs-003

**Done**: [ ]

**Scope**: Complete fork-aware compare/create behavior and harden the full feature for QA. Compare-across-forks lets users choose a readable head repository, preserves base repository notifications, enforces write permissions on metadata while allowing public fork contributions where permitted, handles invalid/missing refs cleanly, and leaves no GitHub-style visual regressions.

**Key changes**:
- `crates/api/src/domain/pulls.rs`: extend compare/create helpers to resolve readable fork repositories through `repository_forks`, validate base repository write or contribution permissions, and associate notifications/audit events with the base repository.
- `crates/api/src/routes/pulls.rs`: support explicit `headOwner`, `headRepo`, `baseOwner`, and `baseRepo` params/JSON fields while keeping same-repo shortcuts backwards compatible.
- `web/src/components/CompareAcrossForksPanel.tsx`: fork selector panel with searchable repository options, selected base/head repository chips, and concrete href updates.
- `web/tests/e2e/pull-request-create.spec.ts`: add fork compare/create, same-ref no-diff, invalid-ref recovery, anonymous public read with write CTA, mobile no-overflow, and desktop/mobile screenshot coverage.
- `crates/api/tests/api_pull_request_create_contract.rs`: final matrix for forks, private fork denial, duplicate detection across head repositories, metadata authorization, notification/audit attribution, linked issue keywords, snapshot persistence, and error-envelope hygiene.
- Mandatory Editorial banned-value scan before commit: `rg -nE '#(0969da|1f883d|1a7f37|cf222e|82071e|f6f8fa|1f2328|d0d7de|59636e|f1aeb5|fff1f3)\b|@primer/|Octicon' web/src/ --glob '!**/og*.css'`.
- `qa-hints.json`, `build-progress.txt`, and `prd.json`: record verification evidence and set `prs-003.build_pass=true` only after all phases are complete; leave `qa_pass=false`.

**Verification**: `.scratch/prs-003-compare-contract-scenario.sh`, `.scratch/prs-003-create-contract-scenario.sh`, `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check`, `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`, and `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke proves compare selectors, split/unified toggles, metadata menus, create redirect, fork compare, no-diff/invalid-ref recovery, and mobile layout all work.
