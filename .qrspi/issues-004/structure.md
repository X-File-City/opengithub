# Structure Outline: issues-004 Repository Issue Detail

**Ticket**: `issues-004`
**Design**: `build-spec.md`, `BUILD_GUIDE.md`, `prd.json`, `web/AGENTS.md`, `design/project/Prototype.html`, `design/project/og-screens-3.jsx`, `design/project/og-screens-4.jsx`, `.qrspi/issues-001/structure.md`, `.qrspi/issues-002/structure.md`, `.qrspi/issues-003/structure.md`, current `crates/api/src/domain/issues.rs`, current `crates/api/src/routes/issues.rs`, current `web/src/app/[owner]/[repo]/issues/[number]/page.tsx`, current `web/src/components/RepositoryIssuesPage.tsx`, `web/src/components/MarkdownBody.tsx`, and `web/src/components/MarkdownEditor.tsx`.
**Date**: 2026-05-01

## Phase 1: Detail Read Model - render issue header, body, and sidebar shell

**Done**: [ ]

**Scope**: Replace the placeholder `/{owner}/{repo}/issues/{number}` route with a real permission-aware issue detail page. The page should load repository context, issue title/body/state/author/counts/labels/assignees/milestone/linked PR hints, render Markdown, keep repository tabs, and show the Editorial two-column timeline/sidebar layout. Mutation controls can be visually present only when they already have concrete hrefs or handlers in this phase.

**Key changes**:
- `crates/api/src/domain/issues.rs`: add an `IssueDetailView` read model that composes the existing `Issue`, author, labels, assignees, milestone, comment count, linked pull request hints, viewer permission, repository summary, participants, attachments metadata, and subscription default state where available.
- `crates/api/src/routes/issues.rs`: make `GET /api/repos/:owner/:repo/issues/:number` return the screen-ready detail view with optional anonymous public-repository reads matching the issue-list contract; preserve redacted private-repository errors.
- `web/src/lib/api.ts`: add typed `IssueDetailView`, `IssueTimelineItem` placeholders if needed for the first body event, and `getRepositoryIssueFromCookie`.
- `web/src/app/[owner]/[repo]/issues/[number]/page.tsx`: fetch the detail view server-side, use `RepositoryShell`, handle 404/403 with existing unavailable patterns, and redirect only when a write-only action requires auth.
- `web/src/components/RepositoryIssueDetailPage.tsx`: new Editorial issue detail component with title, issue number, state chip, back/next placeholders only if live, New issue link, original body card, metadata sidebar sections, and no inert controls.
- Tests: Rust detail read contract for public/anonymous, private denial, linked metadata, and sidebar data; Vitest rendering coverage for header/body/sidebar; Playwright public and signed-in detail smoke screenshot `ralph/screenshots/build/issues-004-phase1-detail-read.jpg`.

**Verification**: focused Rust detail-read contract, focused `repository-issue-detail` Vitest, focused Playwright detail smoke, mandatory Editorial banned-value scan, then `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`.

---

## Phase 2: Timeline Comments - load, render, and create comments

**Done**: [ ]

**Scope**: Turn the detail body into a real conversation timeline. Existing opened/commented/state events should be normalized into timeline items, comment cards should render Markdown with author/timestamp/action affordances, and the signed-in comment composer should post a new comment through the Rust API and show success/error feedback. Anonymous readers on public repositories can read the timeline but must see a concrete sign-in CTA for commenting.

**Key changes**:
- `crates/api/src/domain/issues.rs`: extend `issue_timeline` into a detail timeline view that joins event actors, comment rows, author profile data, issue/comment reactions summary slots, and safe event metadata for label/state/reference events.
- `crates/api/src/routes/issues.rs`: keep `GET /issues/:number/timeline` read-access compatible with public anonymous reads and ensure `POST /issues/:number/comments` returns the created comment plus enough author/timeline data for the UI.
- `web/src/lib/api.ts`: add timeline fetch and comment-create helpers, preserving API error envelopes for validation.
- `web/src/app/[owner]/[repo]/issues/[number]/comments/route.ts`: add a same-origin route that forwards signed cookies to the Rust comment endpoint.
- `web/src/components/IssueTimeline.tsx` and `web/src/components/IssueCommentComposer.tsx`: render the vertical line, event icons, comment cards, Write/Preview Markdown composer, attachment metadata affordance only if already supported, submit state, and no dead toolbar buttons.
- Tests: Rust timeline/comment contract including empty body validation and private redaction; Vitest timeline rendering/comment submit/preview/error coverage; Playwright signed-session comment flow screenshot `ralph/screenshots/build/issues-004-phase2-comment.jpg`.

**Verification**: focused API/timeline tests, focused frontend tests, focused Playwright comment-create smoke, `make check`, `make test`, and `make test-e2e` if the route changes shared issue navigation.

---

## Phase 3: State, Reactions, and Notifications - live conversation actions

**Done**: [ ]

**Scope**: Wire the primary issue-detail actions: close/reopen, comment-and-close, issue/comment reactions, and subscribe/unsubscribe notification state. Every visible button in the header, timeline cards, composer, reaction toolbar, and Notifications sidebar must either perform a real action or be absent. State changes and reactions must update the timeline/read model and persist through reload.

**Key changes**:
- `crates/api/migrations/*_issue_detail_interactions.*.sql`: add issue subscription rows or reaction uniqueness columns only if absent; reuse existing `reactions`, `timeline_events`, `notifications`, and audit tables where possible.
- `crates/api/src/domain/issues.rs`: add subscription helpers, comment-level reaction support if the current schema supports `comment_id`, reaction summary aggregation, viewer reaction state, and state-change notification/timeline side effects.
- `crates/api/src/routes/issues.rs`: add or extend `PATCH /issues/:number`, `POST /issues/:number/reactions`, comment reaction routes if required, and subscription routes with standard validation and auth errors.
- `web/src/app/[owner]/[repo]/issues/[number]/state/route.ts`, `/reactions/route.ts`, and `/subscription/route.ts`: add same-origin cookie-forwarding routes for client actions.
- `web/src/components/RepositoryIssueDetailPage.tsx`, `IssueTimeline.tsx`, and `IssueCommentComposer.tsx`: close/reopen buttons, Comment/Close issue split actions, reaction toggles with counts, and Notifications sidebar controls using `.btn`, `.chip`, `.card`, `.tabs`, and tokenized colors only.
- Tests: Rust action contract for state transitions, reaction idempotency/toggle semantics, subscription persistence, unauthorized denial, and notification/timeline side effects; Vitest for all action controls; Playwright signed-session close/reopen/reaction/subscribe smoke screenshot `ralph/screenshots/build/issues-004-phase3-actions.jpg`.

**Verification**: focused Rust interaction contract, focused Vitest action suite, focused Playwright action flow, full `make check`, `make test`, and mandatory Editorial banned-value scan.

---

## Phase 4: Metadata Sidebar Editing - labels, assignees, milestone, relationships, and participants

**Done**: [ ]

**Scope**: Make the metadata sidebar useful without overbuilding unsupported project/type fields. Authorized viewers can update labels, assignees, milestone, and relationship links where the current data model supports them; unsupported Type/Fields/Projects sections must show honest empty or disabled states. Changes write timeline events, update notifications/search where applicable, and the issue detail page reflects updates after reload.

**Key changes**:
- `crates/api/src/domain/issues.rs`: add permission-checked metadata update helpers for labels, assignees, milestone, linked issue/PR relationships, participant derivation, and timeline event emission.
- `crates/api/src/routes/issues.rs`: add `PATCH /api/repos/:owner/:repo/issues/:number/metadata` or narrowly scoped metadata routes, returning the updated detail read model or updated sidebar fragment.
- `web/src/lib/api.ts`: add typed metadata update requests/responses and sidebar option DTOs reusing issue-list filter option types where possible.
- `web/src/components/IssueMetadataSidebar.tsx`: add Editorial popovers for assignees/labels/milestone, relationship rows, participants, Development/Issue actions sections, disabled placeholders for unsupported Type/Fields/Projects, and no inert menu items.
- Tests: Rust metadata contract for permission checks, invalid IDs, timeline events, participant updates, and private redaction; Vitest for menu accessibility/query preservation/no inert controls; Playwright signed-session metadata-edit smoke screenshot `ralph/screenshots/build/issues-004-phase4-metadata.jpg`.

**Verification**: focused metadata API tests, focused sidebar Vitest, focused Playwright metadata flow, then standard `make check` and `make test`.

---

## Phase 5: Issue Detail Guardrails and QA Handoff - finish issues-004

**Done**: [ ]

**Scope**: Harden the full issue detail feature: public/private access, auth redirects for writes, mobile layout, keyboard/a11y, Markdown/code/copy behavior, event ordering, validation envelopes, no placeholder controls, screenshot evidence, QA hints, and final bookkeeping. Mark `issues-004` complete only after read, comment, state, reaction, subscription, and supported metadata actions are all verified.

**Key changes**:
- `crates/api/tests/api_repository_issue_detail_contract.rs`: final matrix for anonymous public reads, private denial/redaction, detail read model, timeline ordering, comment validation, close/reopen, reactions, subscriptions, metadata updates, participants, and unsupported-section behavior.
- `web/tests/repository-issue-detail.test.tsx`: final coverage for header/sidebar/timeline/composer accessibility, Write/Preview tabs, reaction controls, close/reopen controls, metadata menus, no `href="#"`, no empty handlers, and API error display.
- `web/tests/e2e/repository-issue-detail.spec.ts`: signed-session sweep for detail load, comment create, preview, close/reopen, reaction toggle, subscription toggle, metadata edit, anonymous public read, auth-gated write CTA, mobile no-overflow, and final desktop/mobile screenshots.
- `ralph/screenshots/build/`: save final desktop/mobile issue-detail screenshots.
- Mandatory Editorial banned-value scan before commit: `rg -nE '#(0969da|1f883d|1a7f37|cf222e|82071e|f6f8fa|1f2328|d0d7de|59636e|f1aeb5|fff1f3)\b|@primer/|Octicon' web/src/ --glob '!**/og*.css'`.
- `qa-hints.json`, `build-progress.txt`, and `prd.json`: record verification evidence and set `issues-004.build_pass=true` only after every phase is complete; leave `qa_pass=false`.

**Verification**: `.scratch/issues-004-detail-scenario.sh` or equivalent TEST_DATABASE_URL-backed API/browser scenario, `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make check`, `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test`, and `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opengithub_identity_test make test-e2e`; browser smoke proves every visible control is live and saves screenshots.
