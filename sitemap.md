# opengithub Sitemap

Status: iteration 2 site-map pass, partial but broad. Live inspection covered the public GitHub home/navigation surface. Authenticated app structure is mapped from the scraped GitHub docs because the reusable Ever sessions were expired and the current browser context was not authenticated.

Evidence:
- Ever attempted first as required: `ever snapshot --mode full` failed with `No tab with given id`; `ever use 1 && ever snapshot --mode full` failed with `Session expired`.
- Fallback live browser capture: Chrome headless screenshot saved to `ralph/screenshots/inspect/home-sitemap.jpg`.
- Fallback live DOM capture: GitHub home page global nav/footer links extracted from `https://github.com/`.
- Docs cross-reference: `target-docs/content/account-and-profile/get-started/personal-dashboard-quickstart.md`, `target-docs/content/repositories/index.md`, `target-docs/content/issues/index.md`, `target-docs/content/pull-requests/index.md`, `target-docs/content/actions/index.md`, `target-docs/content/packages/index.md`, `target-docs/content/pages/index.md`, `target-docs/content/organizations/index.md`, `target-docs/content/search-github/index.md`, `target-docs/content/subscriptions-and-notifications/index.md`.

## Global Layout Pattern

- Public logged-out pages use a marketing header with GitHub mark, dropdown mega-nav sections, search/jump control, Sign in link, bordered Sign up button, large hero content, product sections, and dense multi-column footer.
- Signed-in pages use a compact GitHub app shell: left global navigation menu trigger, GitHub mark back to dashboard, global search/jump bar, quick-create button, Issues/Pull requests/Notifications shortcuts, and avatar menu.
- Repository pages are the core workspace. They use an owner/repo breadcrumb header, visibility badge, repository action buttons, and a horizontal tab bar for Code, Issues, Pull requests, Actions, Projects, Wiki, Security, Insights, and Settings.
- List pages use compact filter bars, status tabs, labels/milestones/actions links, query input, and paginated or grouped result lists.
- Settings pages use left sidebar navigation with right-column forms/cards and dangerous actions at the bottom.

## Public / Logged-Out Pages

- `/` — marketing home. Global nav, search field, sign-in/sign-up CTAs, product feature sections, customer stories, footer.
- `/login` — sign-in page inspected in iteration 1.
- `/signup` — signup page inspected in iteration 1.
- `/password_reset` — target password reset page inspected in iteration 1; excluded for opengithub while auth remains Google-only.
- `/features` — product feature index.
- `/features/actions` — Actions marketing/feature page.
- `/features/issues` — Issues/Projects marketing/feature page.
- `/features/code-review` — code review marketing/feature page.
- `/features/discussions` — Discussions marketing/feature page.
- `/features/copilot`, `/features/models`, `/features/spark`, `/mcp` — AI/product marketing pages; clone should not build these unless later scope expands.
- `/pricing`, `/enterprise`, `/team`, `/solutions`, `/resources`, `/customer-stories`, `/marketplace`, `/sponsors`, `/topics`, `/trending`, `/collections` — secondary public discovery/marketing pages. Build as low-priority static or omit from MVP unless linked from app shell.

## Signed-In Dashboard And Global Pages

- `/dashboard` or `/` after login — personal dashboard. Shows recent activity, feed/recommendations, top repositories, teams, projects, and onboarding empty state for users with no repositories.
- `/notifications` — notification inbox with unread/done triage, filters, subscription controls, and bulk actions.
- `/pulls` — global pull request list across repositories with filters for assigned, created, mentioned, review requests.
- `/issues` — global issue list across repositories with filters for assigned, created, mentioned, subscribed.
- `/codespaces` — cloud dev environment list; out of initial opengithub scope unless later requested.
- `/settings/profile` — personal profile settings.
- `/settings/account` — account preferences, username, export/delete controls.
- `/settings/emails` — email preferences; for opengithub, primary Google email is read-only in MVP.
- `/settings/notifications` — web/email notification preferences.
- `/settings/appearance` — theme and accessibility preferences.
- `/settings/security` — sessions, auth providers, security log.
- `/settings/tokens` — personal access tokens for Git/API access.
- `/settings/keys` — SSH/GPG key management.
- `/new` — repository creation form.
- `/new/import` — repository import flow.
- `/organizations/new` — create organization flow. Completed in iteration 15 with live plan picker/setup form inspection.

## Repository Workspace

Template: `/{owner}/{repo}`.

- `/{owner}/{repo}` — Code tab / repository overview. Branch selector, file tree, README, clone URL, latest commit summary, repository sidebar.
- `/{owner}/{repo}/tree/{branch}/{path}` — directory browser for a branch/path.
- `/{owner}/{repo}/blob/{branch}/{path}` — code file viewer with syntax highlighting, line numbers, blame/history controls, raw/copy/download actions.
- `/{owner}/{repo}/commits/{branch}` — commit history list. Completed in iteration 16 with live branch/user/date filters and grouped commit rows.
- `/{owner}/{repo}/commit/{sha}` — commit detail and diff view. Completed in iteration 16 with live header, verification/checks, parent links, file tree, and split diff inspection.
- `/{owner}/{repo}/branches` — branch list and protection summaries. Completed in iteration 16 with live Overview/Active/Stale/All tabs, search, ahead/behind counts, PR links, protected badges, and row action menu.
- `/{owner}/{repo}/releases` — releases list.
- `/{owner}/{repo}/releases/new` — create release form.
- `/{owner}/{repo}/tags` — tags list.
- `/{owner}/{repo}/issues` — repository issue list.
- `/{owner}/{repo}/issues/new` — new issue form.
- `/{owner}/{repo}/issues/{number}` — issue detail conversation with labels, assignees, milestone, project links, timeline, comments, reactions, close/reopen.
- `/{owner}/{repo}/labels` — label management.
- `/{owner}/{repo}/milestones` — milestone management.
- `/{owner}/{repo}/pulls` — repository pull request list.
- `/{owner}/{repo}/compare/{base}...{head}` — compare branches and create pull request.
- `/{owner}/{repo}/pull/{number}` — pull request conversation.
- `/{owner}/{repo}/pull/{number}/files` — PR changed files review/diff view.
- `/{owner}/{repo}/pull/{number}/commits` — PR commits tab.
- `/{owner}/{repo}/actions` — workflows list and recent runs.
- `/{owner}/{repo}/actions/workflows/{workflow_file}` — workflow detail and runs list.
- `/{owner}/{repo}/actions/runs/{run_id}` — workflow run detail, jobs, logs, artifacts, re-run/cancel controls.
- `/{owner}/{repo}/discussions` — repository discussions list with pinned discussions, query-builder search, filters, categories, most helpful rail, upvotes, and New discussion CTA. Completed in iteration 19.
- `/{owner}/{repo}/discussions/categories/{slug}` — category-scoped discussion list for formats such as Help, Ideas, Polls, RFC, and Show and tell. Completed in iteration 19.
- `/{owner}/{repo}/discussions/new/choose` — category chooser for starting a discussion. Completed in iteration 19.
- `/{owner}/{repo}/discussions/new` — category-specific discussion/poll creation form with Markdown composer and required similar-search acknowledgement. Completed in iteration 19.
- `/{owner}/{repo}/discussions/{number}` — discussion detail timeline with comments, replies, answer marking, reactions, sidebar metadata, subscription, and events. Completed in iteration 19.
- `/{owner}/{repo}/discussions/categories/edit` — permissioned category/section management surface. Mapped from docs in iteration 19.
- `/{owner}/{repo}/projects` — repository projects list linked by default repository or explicit project/repository association. Completed in iteration 20 from live org Projects plus docs-backed repository linking behavior.
- `/{owner}/{repo}/wiki` — repository wiki; lower priority.
- `/{owner}/{repo}/security` — Security and quality overview. Completed in iteration 18 with live public security overview/policy/advisory inspection.
- `/{owner}/{repo}/security/policy` — rendered SECURITY.md policy and maintainer setup/edit entry point. Completed in iteration 18.
- `/{owner}/{repo}/security/advisories` — repository security advisory list and pagination. Completed in iteration 18.
- `/{owner}/{repo}/security/advisories/{ghsa_id}` — public advisory detail with package, affected/patched versions, CVSS, CVE, and CWE disclosures. Completed in iteration 18.
- `/{owner}/{repo}/security/dependabot` — Dependabot alerts list/detail/filter/dismiss/reopen; disabled state inspected live in iteration 18.
- `/{owner}/{repo}/security/code-scanning` — code scanning alerts list/detail/filter/SARIF-backed states; disabled state inspected live in iteration 18.
- `/{owner}/{repo}/security/secret-scanning` — secret scanning alerts list/detail/filter/push-protection states; disabled state inspected live in iteration 18.
- `/{owner}/{repo}/pulse` — activity summary.
- `/{owner}/{repo}/graphs/contributors` — contributors graph.
- `/{owner}/{repo}/graphs/traffic` — traffic graph for push-access users; permission-gated.
- `/{owner}/{repo}/network/dependencies` — dependency graph dependencies and dependents.
- `/{owner}/{repo}/network` — fork/network graph; low priority.
- `/{owner}/{repo}/forks` — searchable/filterable fork list and tree-view switch.
- `/{owner}/{repo}/settings` — repository settings overview.
- `/{owner}/{repo}/settings/access` — collaborators/teams.
- `/{owner}/{repo}/settings/branches` — branch protection/rulesets.
- `/{owner}/{repo}/settings/actions` — Actions permissions and runner settings.
- `/{owner}/{repo}/settings/hooks` — webhooks list and delivery logs.
- `/{owner}/{repo}/settings/pages` — Pages source/domain/build settings.
- `/{owner}/{repo}/settings/secrets/actions` — repository Actions secrets.
- `/{owner}/{repo}/settings/tags` — tag protection/rules.
- `/{owner}/{repo}/settings/security_analysis` — code security settings placeholders.

## Profiles, Organizations, And Teams

- `/{user}` — user profile with avatar, bio, pinned repositories, contribution graph, achievements, followers/following, packages/projects tabs.
- `/{user}?tab=repositories` — user repositories.
- `/{user}?tab=stars` — starred repositories.
- `/{user}?tab=projects` — user projects list with Projects/Templates tabs, open/closed filters, search, sort, copy-project flow, and project rows. Completed in iteration 20 from org/user-equivalent Projects inspection.
- `/{org}` — organization overview/profile with pinned repos, people count, README/profile content.
- `/{org}?tab=repositories` — organization repositories.
- `/{org}?tab=projects` and `/orgs/{org}/projects` — organization Projects list with search, Open/Closed tabs, Templates tab, sort, status pills, row menus, and copy-project modal. Completed in iteration 20.
- `/orgs/{org}/projects/{number}` — Projects v2 workspace with saved views, filter bar, table/board/roadmap layouts, item grid, grouping/slicing, and editable fields. Completed in iteration 20 with live GitHub Public Roadmap inspection.
- `/orgs/{org}/projects/{number}/insights` — project Insights chart surface with Burn up chart, filter bar, range controls, custom charts, and data table. Completed in iteration 20.
- `/orgs/{org}/projects/{number}/settings` and `/workflows` — project settings, access, fields, workflows, templates, status updates, repository linking, close/delete. Mapped from docs in iteration 20 because public project settings are permission-gated.
- `/{org}?tab=people` — members list. Completed in iteration 15 for admin member list, export, row actions, and invite dialog.
- `/{org}?tab=teams` — teams list. Completed in iteration 15 for empty state and new team form.
- `/{org}/{team_slug}` — team page with repositories, members, discussions. Mapped from team docs; detail page still lower-priority if scope remains.
- `/orgs/{org}/settings/profile` — organization profile settings. Completed in iteration 15 with live settings-shell inspection.
- `/orgs/{org}/settings/member_privileges` — member permissions. Completed in iteration 15 with live base-permissions/repository-policy inspection.
- `/orgs/{org}/settings/repository-defaults` — default repository permissions/settings.
- `/orgs/{org}/settings/actions` — organization Actions settings.
- `/orgs/{org}/settings/hooks` — organization webhooks.
- `/orgs/{org}/settings/billing` — out of scope for opengithub because billing/payments are excluded.

## Search And Discovery

- `/search?q={query}&type=repositories` — repository search.
- `/search?q={query}&type=code` — code search with language/path/repo/user/org filters and line result snippets.
- `/search?q={query}&type=issues` — issues search.
- `/search?q={query}&type=pullrequests` — pull request search.
- `/search?q={query}&type=commits` — commit search.
- `/search?q={query}&type=users` — user search.
- `/search?q={query}&type=discussions` — discussion search; low priority.
- Global search/jump bar appears in app header and accepts owner/repo jumps, command palette-style suggestions, and search submission.

## Packages And Pages

- `/{owner}/{repo}/packages` — repository packages.
- `/{owner}?tab=packages` and `/{org}?tab=packages` — owner package lists.
- `/{owner}/{package_type}/{package_name}` — package detail with versions, install commands, visibility/access controls.
- `/{owner}/{repo}/settings/pages` — Pages configuration.
- `https://{owner}.opengithub.namuh.co/{repo}` or configured custom domain — Pages published site via CloudFront/S3.

## Initial Deep-Dive Order

1. Personal dashboard / onboarding empty state. Completed in iteration 3 from docs-backed inspection; live authenticated UI remains blocked by expired Ever session.
2. Repository create/import form group. Completed in iteration 4 with live `/new` form inspection and docs-backed `/new/import` behavior because Ever could navigate to the import tab but could not snapshot/screenshot/extract it.
3. Repository code/file browser. Completed in iteration 5 with live `vercel/next.js` inspection for overview, tree directory, blob view, branch/code controls, and docs-backed clone/raw/blame behavior.
4. Issues list/detail/create. Completed in iteration 6 with live `vercel/next.js` inspection for list, filters, sort menu, label filter menu, filtered query URL, template chooser, issue form, issue detail timeline/comment composer/sidebar, and docs-backed search/template behavior.
5. Pull request list/detail/diff/review. Completed in iteration 7 with live `vercel/next.js` inspection for PR list, sort menu, reviews filter menu, compare/no-diff state, conversation timeline, mergeability/status box, files changed diff, and submit review dialog.
6. Actions workflow runs/logs. Completed in iteration 8 with live `vercel/next.js` inspection for All workflows run list, workflow filter panels, workflow-specific runs, failed run detail, job sidebar, annotations, artifacts, job log view, and log search.
7. Global search/code search. Completed in iteration 9 with live search inspection for repository-scoped code search, qualifier autocomplete, result type menu, saved-search modal, issue search results, issue search sort menu, and docs-backed code search/file finder syntax.
8. User and organization profiles. Completed in iteration 10 with headless Chrome fallback for user overview, user repositories, user stars, org overview, filtered org repositories, and org people list after Ever DOM extraction failed.
9. Repository settings, access, webhooks, Pages. Completed in iteration 11 with docs-backed UI behavior and live `gh api` verification for `namuh-eng/opengithub`; Ever/headless authenticated settings screenshots were blocked.
10. Packages and releases. Completed in iteration 12 with Chrome fallback after Ever snapshot/navigation failures. Covered repository releases list, latest release detail, tags list, organization package filters, npm empty filtered state, and container package detail/install snippets. Create/edit release and package access-control behavior is docs-backed.
11. Notifications, global inbox, and watches/subscriptions. Completed in iteration 13 with live Ever inspection for `/notifications`, inbox sort/group controls, custom filter dialog, and repository Watch menu.
12. Personal settings and developer credentials. Completed after iteration 13 with live Ever inspection for `/settings/profile`, `/settings/notifications`, `/settings/tokens`, `/settings/personal-access-tokens/new` sudo-mode gate, `/settings/keys`, `/settings/security`, `/settings/sessions`, and `/settings/security-log`.
13. Organization/team admin. Completed in iteration 15 with live inspection for `/organizations/new`, organization profile settings, people/member management and invite dialog, teams empty state, new team form, and member privileges.
14. Branch/commit history details. Completed in iteration 16 with live `vercel/next.js` inspection for commit list filters, commit detail diff, branches overview, and branch row menu.
15. Insights graphs and dependency/fork analytics. Completed in iteration 17 with live `vercel/next.js` inspection for Pulse, period menu, Contributors, Network, Dependency graph dependencies/dependents, Forks, and docs-backed Traffic permission/retention behavior.
16. Security overview and code security. Completed in iteration 18 with live inspection for security overview, policy, advisories, Dependabot disabled/settings menu, code scanning disabled, and secret scanning disabled.
17. Discussions. Completed in iteration 19 with live `vercel/next.js` inspection for list/category/create/detail/answered/polls surfaces and docs-backed category/moderation behavior.
18. Projects v2. Completed in iteration 20 with live `github` organization project list, GitHub Public Roadmap workspace, View menu, and Insights inspection; docs-backed settings, fields, workflows, draft issues, and repository linking behavior.
19. Remaining high-value surface: wiki if scope remains.
