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
- `/organizations/new` — create organization flow.

## Repository Workspace

Template: `/{owner}/{repo}`.

- `/{owner}/{repo}` — Code tab / repository overview. Branch selector, file tree, README, clone URL, latest commit summary, repository sidebar.
- `/{owner}/{repo}/tree/{branch}/{path}` — directory browser for a branch/path.
- `/{owner}/{repo}/blob/{branch}/{path}` — code file viewer with syntax highlighting, line numbers, blame/history controls, raw/copy/download actions.
- `/{owner}/{repo}/commits/{branch}` — commit history list.
- `/{owner}/{repo}/commit/{sha}` — commit detail and diff view.
- `/{owner}/{repo}/branches` — branch list and protection summaries.
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
- `/{owner}/{repo}/projects` — repository projects list; lower priority than issues/PRs.
- `/{owner}/{repo}/wiki` — repository wiki; lower priority.
- `/{owner}/{repo}/security` — security overview, Dependabot/code scanning/secret scanning placeholders.
- `/{owner}/{repo}/pulse` — activity summary.
- `/{owner}/{repo}/graphs/contributors` — contributors graph.
- `/{owner}/{repo}/network` — fork/network graph; low priority.
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
- `/{user}?tab=projects` — user projects.
- `/{org}` — organization overview/profile with pinned repos, people count, README/profile content.
- `/{org}?tab=repositories` — organization repositories.
- `/{org}?tab=people` — members list.
- `/{org}?tab=teams` — teams list.
- `/{org}/{team_slug}` — team page with repositories, members, discussions.
- `/orgs/{org}/settings/profile` — organization profile settings.
- `/orgs/{org}/settings/member_privileges` — member permissions.
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
4. Issues list/detail/create.
5. Pull request list/detail/diff/review.
6. Actions workflow runs/logs.
7. Global search/code search.
8. User and organization profiles.
9. Repository settings, access, webhooks, Pages.
10. Packages and releases.
