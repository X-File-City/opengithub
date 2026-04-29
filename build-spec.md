# opengithub Build Spec

Status: partial, iteration 11 repository settings/access/hooks/Pages inspection.

## Product Overview

opengithub is a production-grade GitHub clone for code hosting and collaboration. It should support repositories, Git operations, file browsing, commits, branches, pull requests, issues, Actions, Pages, Packages, code search, organizations, teams, profiles, notifications, settings, and public/private access controls.

## Stack

- Backend: Rust 2021, Axum, Tokio, SQLx, Postgres.
- Frontend: Next.js + TypeScript in `web/`.
- Database: AWS RDS Postgres with `pg_trgm`.
- Auth: Rust-native Google OAuth (`oauth2` + `tower-sessions` + `axum-login`). Next.js is a thin client.
- Cloud: AWS ECS Fargate, RDS, S3, SES, CloudFront, ECR; DNS through Cloudflare for `opengithub.namuh.co`.

## Design System Notes

From the public home/auth pages and iteration 2 home-page sitemap screenshot:

- GitHub Primer-like visual language: neutral backgrounds, compact forms, Octocat mark, high-contrast dark text, blue primary buttons, gray secondary surfaces.
- Auth forms use a centered narrow card, GitHub mark above heading, label-over-input fields, full-width primary action, and small secondary links.
- Public home uses global top navigation with dropdown megamenus, search/jump control, sign-in/sign-up links, large hero, email signup field, product demo media, repeated product-section CTAs, customer story cards, and dense multi-column footer.
- Signed-in app pages should use compact Primer-style controls: 32px-ish header height, subtle gray borders, rounded 6px inputs/buttons, blue primary actions, muted secondary buttons, small badges, horizontal repository tabs, and left settings sidebars.

Detailed repository/app UI design remains to be inspected in later iterations.

## Site Map

Full working sitemap lives in `sitemap.md`. Summary:

- Public unauthenticated: `/`, `/login`, `/signup`, `/features`, `/features/actions`, `/features/issues`, `/features/code-review`, `/features/discussions`, `/pricing`, `/enterprise`, `/team`, `/solutions`, `/resources`, `/marketplace`, `/sponsors`, `/topics`, `/trending`, `/collections`.
- Signed-in app shell: `/dashboard`, `/notifications`, `/pulls`, `/issues`, `/settings/*`, `/new`, `/new/import`, `/organizations/new`.
- Repository core: `/{owner}/{repo}`, `/tree/{branch}/{path}`, `/blob/{branch}/{path}`, `/commits/{branch}`, `/commit/{sha}`, `/branches`, `/releases`, `/tags`.
- Repository collaboration: `/issues`, `/issues/new`, `/issues/{number}`, `/labels`, `/milestones`, `/pulls`, `/compare/{base}...{head}`, `/pull/{number}`, `/pull/{number}/files`, `/pull/{number}/commits`.
- Repository automation and admin: `/actions`, `/actions/workflows/{workflow_file}`, `/actions/runs/{run_id}`, `/projects`, `/wiki`, `/security`, `/pulse`, `/graphs/contributors`, `/settings`, `/settings/access`, `/settings/branches`, `/settings/actions`, `/settings/hooks`, `/settings/pages`, `/settings/secrets/actions`.
- Profiles/orgs: `/{user}`, `/{user}?tab=repositories`, `/{user}?tab=stars`, `/{org}`, `/{org}?tab=repositories`, `/{org}?tab=people`, `/{org}?tab=teams`, `/{org}/{team_slug}`, `/orgs/{org}/settings/*`.
- Search: `/search?q={query}&type=repositories|code|issues|pullrequests|commits|users|discussions`.
- Packages/Pages: `/{owner}/{repo}/packages`, `/{owner}?tab=packages`, `/{org}?tab=packages`, `/{owner}/{package_type}/{package_name}`, `/{owner}/{repo}/settings/pages`, plus CloudFront/S3-backed published Pages domains.

Deep page-level screenshots and interaction details remain pending except auth/public home, the docs-backed personal dashboard slice, repository creation/import, repository code/file browsing, repository issues, repository pull requests, repository Actions workflow runs/logs, global search/code search, user/organization profiles, and repository settings/access/hooks/Pages.

## Repository Settings, Access, Webhooks, Secrets, And Pages

Status: inspected in iteration 11. Ever was attempted first but failed DOM extraction and later timed out on navigation/screenshot. Headless Chrome with the local profile could not reuse GitHub cookies because macOS keychain access is unavailable in headless mode, so visual settings screenshots were blocked by GitHub's signed-out 404. Live repository state was verified through `gh api` for `namuh-eng/opengithub`, and UI/behavior details were cross-checked against scraped GitHub docs for repository settings, access, branch protection/rulesets, webhooks, Actions secrets, and Pages.

Evidence and blocked screenshots:

- Required Ever snapshot failed: `Failed to get DOM document - extraction cannot proceed`.
- Ever navigate/screenshot to `/namuh-eng/opengithub/settings` timed out.
- Headless Chrome fallback reached GitHub but was unauthenticated and captured a 404/sign-in state instead of settings: `ralph/screenshots/inspect/repo-settings-auth-blocked.png`. This is evidence of the auth limitation, not a UI reference for settings.
- `gh api repos/namuh-eng/opengithub` confirmed admin access for the token, public visibility, default branch `main`, Issues disabled, Projects/Wiki enabled, merge/squash/rebase enabled, auto-merge disabled, delete-branch-on-merge disabled, forking enabled, web commit signoff disabled, and secret scanning features disabled.
- `gh api repos/namuh-eng/opengithub/collaborators` returned two admin collaborators.
- `gh api repos/namuh-eng/opengithub/branches` returned `main` as unprotected.
- `gh api repos/namuh-eng/opengithub/hooks` returned no repository webhooks.
- `gh api repos/namuh-eng/opengithub/pages` returned 404, meaning Pages is not configured.
- `gh api repos/namuh-eng/opengithub/actions/secrets` returned zero repository secrets.

Repository settings shell:

- `/{owner}/{repo}/settings` uses the repository workspace header and Settings tab, then switches to a settings layout with a left sidebar and form/card content.
- Sidebar groups include General, Access/Collaborators and teams, Code and automation items such as Branches/Rules/Actions/Webhooks/Pages, Security-related settings, and Danger Zone actions at the bottom.
- General settings are grouped into bordered sections for repository name, template status, social preview, features, pull request merge methods, default branch, forking, discussions/wiki/projects/issues toggles, and Danger Zone actions such as archive, change visibility, transfer, and delete.
- opengithub should model dangerous actions as confirm-name dialogs with typed repository confirmation and server-side permission checks. Do not make destructive settings available until the related backend behavior is implemented.

Access and collaborators:

- `/{owner}/{repo}/settings/access` shows a combined overview of people and teams with access. Organization repositories include inherited team access and direct collaborators.
- Rows need avatar/name/login or team name/parent path, permission role, source of access (direct, team, inherited, organization owner), and management menu for admins.
- The add-access flow opens a dialog/search control for people or teams and selects a role: read, triage, write, maintain, admin. Removing access requires confirmation. Inherited team permissions cannot be removed at the child team row; the parent team or org base permission must be changed.
- Live API state for `namuh-eng/opengithub` showed admin collaborators `ashley-ha` and `jaeyunha`.

Branches, branch protection, and rulesets:

- `/{owner}/{repo}/settings/branches` lists default branch and branch protection/ruleset entries. If no rules exist, show an empty state with Add branch protection rule / New ruleset controls.
- Branch protection supports a pattern input and rule toggles: require PR reviews, required approving review count, dismiss stale approvals, require code owner review, restrict review dismissal, require status checks, require branches to be up to date, required check contexts/sources, require conversation resolution, require signed commits, require linear history, require merge queue, require deployments, lock branch, block bypass, restrict pushes/branch creation, allow force pushes, and allow deletions.
- Rulesets are named, can be active/evaluate/disabled, target branches or tags with fnmatch patterns, layer with branch protections, and aggregate to the most restrictive applicable rule. Build rulesets as the forward-looking policy model, then map classic branch protection into the same mergeability evaluator.
- Live API state showed branch `main` was not protected.

Repository webhooks:

- `/{owner}/{repo}/settings/hooks` lists configured hooks with endpoint URL, active status, subscribed event summary, latest delivery status, updated time, Edit/Delete/Test controls, and an Add webhook button.
- Add/Edit webhook form fields: Payload URL, Content type (`application/json` or form encoding), Secret, SSL verification, event selection radio group (Just push, Send me everything, Let me select individual events), individual event checkboxes, and Active checkbox.
- After creation, GitHub sends a `ping` event. The hook detail page has a Recent Deliveries tab showing delivery GUIDs, request headers/body, response status/body, sent time, duration, and Redeliver controls for recent deliveries.
- Live API state for `namuh-eng/opengithub` had no hooks, so opengithub needs a no-webhooks empty state and add form.

Actions secrets and variables:

- `/{owner}/{repo}/settings/secrets/actions` uses tabs for Secrets and Variables. The repository secrets list shows secret name, last updated time, and Update/Delete actions; values are write-only after save.
- New repository secret form has Name and Secret fields and Add secret action. Secret names should be upper-case identifier-like strings, unique per repository, and encrypted before storage. The API must never return secret values.
- Environment and organization secrets are separate scopes; repository pages may show inherited organization/environment availability but should not leak values or unauthorized metadata.
- Live API state returned zero repository Actions secrets for `namuh-eng/opengithub`.

GitHub Pages:

- `/{owner}/{repo}/settings/pages` configures Pages source and custom domains. When unconfigured, show a Build and deployment card with Source selector.
- Branch publishing flow: Source = Deploy from a branch, branch dropdown, folder dropdown (`/(root)` or `/docs`), Save. The source branch/folder must exist before saving.
- Actions publishing flow: Source = GitHub Actions, workflow template suggestions, link to latest Pages deployment workflow run, and deployment environment `github-pages`.
- Custom domain settings include domain input, Save/Remove, DNS verification status, HTTPS enforcement, certificate/provisioning status, and warnings that a `CNAME` file alone does not configure the domain.
- opengithub should publish Pages artifacts to S3 and serve through CloudFront. Default project URL should be `https://{owner}.opengithub.namuh.co/{repo}` with optional custom domain records managed through Cloudflare after verification.

API examples:

```http
GET /api/repos/{owner}/{repo}/settings
Response: {
  "repository": { "fullName": "namuh-eng/opengithub", "visibility": "public", "defaultBranch": "main" },
  "features": { "issues": false, "projects": true, "wiki": true, "discussions": false },
  "merge": { "mergeCommit": true, "squash": true, "rebase": true, "autoMerge": false, "deleteBranchOnMerge": false },
  "forkingAllowed": true,
  "webCommitSignoffRequired": false,
  "security": { "secretScanning": "disabled", "pushProtection": "disabled" }
}
Error: { "error": { "code": "forbidden", "message": "Admin access is required" }, "status": 403 }
```

```http
PATCH /api/repos/{owner}/{repo}/settings
Request: { "hasIssues": true, "allowSquashMerge": true, "deleteBranchOnMerge": true, "webCommitSignoffRequired": false }
Response: { "repository": { "fullName": "mona/app" }, "updated": ["hasIssues", "deleteBranchOnMerge"] }
Error: { "error": { "code": "validation_failed", "message": "At least one merge method must remain enabled" }, "status": 422 }
```

```http
GET /api/repos/{owner}/{repo}/access
Response: {
  "items": [
    { "subjectType": "user", "login": "jaeyunha", "role": "admin", "source": "direct", "permissions": { "pull": true, "push": true, "admin": true } }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 30
}
Error: { "error": { "code": "forbidden", "message": "Admin access is required" }, "status": 403 }
```

```http
PUT /api/repos/{owner}/{repo}/access/{subject}
Request: { "subjectType": "user", "role": "write" }
Response: { "subjectType": "user", "login": "octo", "role": "write", "invitationState": "pending" }
Error: { "error": { "code": "role_not_allowed", "message": "Unsupported repository role" }, "status": 422 }
```

```http
GET /api/repos/{owner}/{repo}/branch-rules
Response: {
  "defaultBranch": "main",
  "branches": [{ "name": "main", "protected": false }],
  "rules": []
}
Error: { "error": { "code": "not_found", "message": "Repository not found" }, "status": 404 }
```

```http
POST /api/repos/{owner}/{repo}/branch-rules
Request: {
  "name": "Protect main",
  "target": "branch",
  "pattern": "main",
  "enforcement": "active",
  "rules": { "requiredApprovingReviewCount": 1, "requiredStatusChecks": ["make check"], "blockForcePushes": true }
}
Response: { "id": "uuid", "name": "Protect main", "pattern": "main", "enforcement": "active" }
Error: { "error": { "code": "pattern_conflict", "message": "A branch rule already targets this pattern" }, "status": 409 }
```

```http
GET /api/repos/{owner}/{repo}/hooks
Response: { "items": [], "total": 0, "page": 1, "pageSize": 30 }
Error: { "error": { "code": "forbidden", "message": "Admin access is required" }, "status": 403 }
```

```http
POST /api/repos/{owner}/{repo}/hooks
Request: {
  "payloadUrl": "https://example.com/webhook",
  "contentType": "json",
  "secret": "redacted",
  "events": ["push", "pull_request"],
  "active": true
}
Response: { "id": "uuid", "payloadUrl": "https://example.com/webhook", "active": true, "events": ["push", "pull_request"], "lastResponse": null }
Error: { "error": { "code": "invalid_url", "message": "Payload URL must be HTTPS" }, "status": 422 }
```

```http
GET /api/repos/{owner}/{repo}/hooks/{hookId}/deliveries
Response: {
  "items": [{ "id": "uuid", "event": "ping", "statusCode": 200, "durationMs": 132, "deliveredAt": "2026-04-30T12:00:00Z" }],
  "total": 1,
  "page": 1,
  "pageSize": 30
}
Error: { "error": { "code": "not_found", "message": "Webhook not found" }, "status": 404 }
```

```http
GET /api/repos/{owner}/{repo}/actions/secrets
Response: { "items": [{ "name": "DEPLOY_TOKEN", "updatedAt": "2026-04-30T12:00:00Z" }], "total": 1 }
Error: { "error": { "code": "forbidden", "message": "Admin access is required" }, "status": 403 }
```

```http
PUT /api/repos/{owner}/{repo}/actions/secrets/{name}
Request: { "encryptedValue": "base64", "keyId": "repository-public-key-id" }
Response: { "name": "DEPLOY_TOKEN", "created": true, "updatedAt": "2026-04-30T12:00:00Z" }
Error: { "error": { "code": "invalid_secret_name", "message": "Secret names must use letters, digits, and underscores" }, "status": 422 }
```

```http
GET /api/repos/{owner}/{repo}/pages
Response: { "configured": false, "source": null, "customDomain": null, "httpsEnforced": false, "latestDeployment": null }
Error: { "error": { "code": "not_found", "message": "Pages is not enabled for this repository" }, "status": 404 }
```

```http
PATCH /api/repos/{owner}/{repo}/pages
Request: { "source": { "type": "branch", "branch": "main", "folder": "/docs" }, "customDomain": "docs.example.com", "httpsEnforced": true }
Response: { "configured": true, "url": "https://mona.opengithub.namuh.co/app", "source": { "type": "branch", "branch": "main", "folder": "/docs" }, "customDomain": "docs.example.com", "domainState": "pending_dns" }
Error: { "error": { "code": "source_not_found", "message": "The selected branch or folder does not exist" }, "status": 422 }
```

Implementation mapping:

- Next.js owns settings layout, sidebar navigation, forms, confirmation dialogs, access search dialogs, branch rule editors, webhook event checklists, secret write-only forms, Pages source/domain cards, and validation/error display.
- Rust API owns admin permission checks, repository settings persistence, access/invitation mutations, branch rule mergeability evaluation, webhook delivery queueing/signing/retry/redelivery, encrypted secret storage, and Pages build/deploy state.
- Postgres stores repository feature flags, settings audit events, direct repository permissions, repository invitations, branch rules/rulesets, webhook configs/deliveries, secret metadata, Pages config, and Pages deployment records.
- S3 stores Pages build artifacts and webhook delivery payload archives when retention exceeds Postgres row size limits. CloudFront serves Pages sites. SES sends collaborator invitations and webhook failure notifications if enabled. SQS can back webhook delivery and Pages deploy jobs.

## User And Organization Profiles

Status: inspected in iteration 10 with headless Chrome fallback after Ever DOM extraction failed. Screenshots:

- `ralph/screenshots/inspect/profile-user-overview.jpg`
- `ralph/screenshots/inspect/profile-user-repositories.jpg`
- `ralph/screenshots/inspect/profile-user-stars.jpg`
- `ralph/screenshots/inspect/profile-org-overview.jpg`
- `ralph/screenshots/inspect/profile-org-repositories-filtered.jpg`
- `ralph/screenshots/inspect/profile-org-people.jpg`

User profile overview:

- Public user profiles use the global public/signed-in header, then a profile shell with a left identity column and a main tabbed content column.
- The left column shows avatar, display name, username, Follow button, follower/following counts, organization/company, location, achievements/badges, and a block/report menu. Signed-out users see login-gated block/report messaging.
- Main tabs include Overview, Repositories with count, Projects, Packages, Stars with count, and a More menu. Active tab is underlined and duplicated in responsive mobile layout.
- Overview content shows a Pinned section with up to six repositories/gists as compact cards: owner/name, visibility, description, language color/name, star count, and fork count. Docs confirm users can customize pins, filter repositories/gists, reorder with a grabber, and save up to six combined pins.
- The contribution graph shows annual contribution total, per-day accessible labels, month axis, intensity cells, and a contribution-year selector. Contribution counting is based on repository creation, forks, issues, PRs, reviews, discussions, and commits that meet visibility/repository/email/ref criteria.
- Private profiles hide achievements, activity overview/feed, contribution graph, follower/following counts, follow/sponsor buttons, organization memberships, Stars/Projects/Packages/Sponsoring tabs, and pronouns; README, bio, and profile picture remain public.

User repository and stars tabs:

- `/{user}?tab=repositories` shows repository filters above a list: search box, Type menu (All, Sources, Forks, Archived, Can be sponsored, Mirrors, Templates), Language menu, and Sort menu (Last updated, Name, Stars).
- Repository rows show name, visibility, archived/fork badges, fork source where applicable, description, language, star/fork counts, license, and last-updated date.
- `/{user}?tab=stars` reuses the same list shell with a search box, Type, Language, and Sort menu. Sort options include Recently starred, Recently active, and Most stars. Rows show starred repository owner/name, description, language, stars/forks, and updated date.

Organization overview and repositories:

- Organization profiles use a similar tab shell but the identity header spans the top: avatar/logo, display name, description, Verified badge when domain is verified, Sponsor button, follower count, website, and social links.
- Org tabs include Overview, Repositories, Projects, Packages, People, Sponsoring, and More. Overview shows pinned repositories followed by an inline repository list preview, People preview, Sponsoring preview, top languages, most-used topics, and GitHub Sponsor CTA.
- `/{org}?tab=repositories` and `/orgs/{org}/repositories` provide stronger repository management filters than user profiles: All, Contributed by me, Admin access, Public, Sources, Forks, Archived, Templates, repository search, type/language/sort filters encoded in the URL, display-density controls, and rows with topics, language/license, forks/stars/issues/PR counts, and updated timestamps.

Organization people:

- `/orgs/{org}/people` shows organization header tabs, an Organization permissions side nav, Members tab, paginated member list, avatar/name/username rows, and Previous/Next pagination.
- Signed-out/public view exposes public members only. Authenticated organization admins need additional role filters, pending invitations, outside collaborators, and permission management in settings/admin slices.

API examples:

```http
GET /api/users/{username}
Response: {
  "username": "torvalds",
  "displayName": "Linus Torvalds",
  "avatarUrl": "https://...",
  "bio": null,
  "company": "Linux Foundation",
  "location": "Portland, OR",
  "followers": 300000,
  "following": 0,
  "viewerIsFollowing": false,
  "isPrivate": false,
  "achievements": [{ "key": "arctic-code-vault", "count": 4 }]
}
Error: { "error": { "code": "not_found", "message": "User not found" }, "status": 404 }
```

```http
GET /api/users/{username}/profile
Response: {
  "pinned": [{ "type": "repository", "owner": "torvalds", "name": "linux", "description": "Linux kernel source tree", "language": "C", "stars": 231292, "forks": 61971 }],
  "contributions": { "year": 2026, "total": 3066, "days": [{ "date": "2026-04-29", "count": 1, "level": 1 }] },
  "tabs": { "repositories": 11, "projects": 0, "packages": 0, "stars": 2 }
}
Error: { "error": { "code": "profile_private", "message": "This profile is private" }, "status": 403 }
```

```http
GET /api/users/{username}/repositories?type=sources&language=C&sort=updated&page=1&pageSize=30
Response: {
  "items": [{ "name": "linux", "visibility": "public", "description": "Linux kernel source tree", "language": "C", "stars": 231292, "forks": 61971, "license": "Other", "updatedAt": "2026-04-29T00:00:00Z" }],
  "filters": { "types": ["all", "sources", "forks", "archived", "templates"], "languages": ["C", "OpenSCAD", "C++"] },
  "total": 11,
  "page": 1,
  "pageSize": 30
}
Error: { "error": { "code": "invalid_filter", "message": "Unsupported repository type filter" }, "status": 422 }
```

```http
GET /api/orgs/{org}
Response: {
  "slug": "vercel",
  "displayName": "Vercel",
  "description": "Agentic infrastructure for every app and agent.",
  "verifiedDomain": "vercel.com",
  "followers": 27800,
  "websiteUrl": "https://vercel.com",
  "tabs": { "repositories": 232, "people": 68, "sponsoring": 4 }
}
Error: { "error": { "code": "not_found", "message": "Organization not found" }, "status": 404 }
```

```http
GET /api/orgs/{org}/people?page=1&pageSize=30
Response: {
  "items": [{ "username": "alex-grover", "displayName": "Alex Grover", "avatarUrl": "https://...", "publicRole": "member" }],
  "total": 68,
  "page": 1,
  "pageSize": 30
}
Error: { "error": { "code": "forbidden", "message": "You do not have permission to view private members" }, "status": 403 }
```

Implementation mapping:

- Next.js owns profile shells, identity cards, tab routing, pinned repository cards, contribution graph rendering, repository/star/org/member filters, public/private states, and signed-in follow/star/block/report controls.
- Rust API owns user/org profile reads, follow/star/block/report mutations, pin ordering, contribution aggregation, repository/member filtering, and permission-aware public/private visibility.
- Postgres stores profile fields, profile README rendered HTML, profile pins, follows, stars, contribution summaries/days/events, achievements, organization verified domains, organization memberships, and repository list denormalizations for profile search/sort.

## Global Search And Code Search

Status: inspected live in iteration 9 against signed-in GitHub search results for `repo:vercel/next.js router`. Screenshots:

- `ralph/screenshots/inspect/search-code-results.jpg`
- `ralph/screenshots/inspect/search-more-languages.jpg`
- `ralph/screenshots/inspect/search-type-menu.jpg`
- `ralph/screenshots/inspect/search-save-scope.jpg`
- `ralph/screenshots/inspect/search-issues-results.jpg`
- `ralph/screenshots/inspect/search-issues-sort-menu.jpg`

Global search bar and suggestions:

- The signed-in header search button shows the active scoped query as tokenized text, for example `repo: vercel/next.js router`.
- Opening the search bar displays a query-builder modal with a combobox, search syntax tips link, feedback button, saved-search management dialog, and categorized suggestions.
- In repository scope, suggestions include "Search in this repository", "Search in this organization", "Search all of GitHub", direct code jumps to files/symbols, and Copilot chat suggestions. opengithub should omit Copilot-specific suggestions in MVP.
- Typing qualifier prefixes such as `language:` changes suggestions into autocomplete lists. Observed language completions include C++, Go, Java, JavaScript, PHP, Python, and Ruby.
- Saved searches open a modal titled "Create saved search" with Name and Query required inputs, Cancel, Create saved search, and a documentation link. Saved searches should be per-user and appear in future search suggestions.

Code search results:

- `/search?q=repo:vercel/next.js router&type=code` uses a two-pane search layout with a scrollable left filter rail, draggable vertical splitter, and main results pane.
- Left rail contains result-type navigation with counts for Code, Issues, Pull requests, Discussions, Commits, Packages, and Wikis. Code-specific facets include Languages, Paths, Owner, Symbol, Exclude archived, and Advanced search.
- Code results header shows total file count, query timing, active scope chips such as `vercel/next.js` with backspace/delete hint, Save button, type menu, column/view option buttons, and search feedback affordances.
- Code result cards are grouped by file. Each card has collapse/expand, repository/path link, language badge, match count, code snippet table with line anchors, highlighted terms, and "Show N more matches".
- Type switcher menu is a radio list with keyboard accelerators and counts for Code, Issues, Pull requests, Discussions, Commits, Packages, and Wikis.
- Docs confirm upgraded code search supports bare terms matching content or path, quoted exact strings, boolean `AND`/`OR`/`NOT`, parentheses, regex delimited by slashes, and qualifiers including `repo:`, `org:`, `user:`, `language:`, `license:`, `path:`, `symbol:`, `content:`, and `is:`. Code search currently indexes default branches and only returns results visible to the viewer.

Issues/Pull request search results:

- Switching to `type=issues` keeps the same search shell but changes the filter rail to State plus advanced issue qualifiers: Owner, State, Close reason, Has linked pull request, Author, Assignee, Mentioned user, Mentioned team, Commenter, Involved user, Label, Milestone, Number of comments, Number of interactions, and Advanced search.
- Issue result rows show repository, title with highlighted matches, labels, snippet text when available, author, opened date, comment count, issue number, and active repository scope.
- Sort menu for issue search is a radio menu: Best match, Most commented, Least commented, Newest, Oldest, Recently updated, and Least recently updated. Docs add qualifier equivalents such as `sort:comments`, `sort:created`, `sort:updated`, `sort:interactions`, and `sort:reactions`.

Repository file finder:

- Docs confirm repository file finder is separate from global search and opens with `t` or the "Go to file" control. It searches files/directories in a single repository and excludes generated/vendor-like directories by default unless `.gitattributes` overrides `linguist-generated=false`.

API examples:

```http
GET /api/search/code?q=repo:vercel/next.js%20router&language=typescript&page=1&pageSize=25
Response: {
  "items": [{
    "repository": { "owner": "vercel", "name": "next.js" },
    "path": "packages/next/src/client/next.ts",
    "language": "TypeScript",
    "matchCount": 2,
    "snippets": [{ "lineStart": 13, "lineEnd": 19, "lines": [{ "line": 15, "html": "// <mark>router</mark> is initialized later so it has to be live-binded" }] }]
  }],
  "facets": { "languages": [{ "name": "TypeScript", "count": 623 }], "paths": [{ "path": "packages/next/src/client/", "count": 215 }] },
  "total": 1500,
  "page": 1,
  "pageSize": 25,
  "durationMs": 520
}
Error: { "error": { "code": "invalid_query", "message": "Unsupported qualifier: enterprise" }, "status": 422 }
```

```http
GET /api/search/issues?q=repo:vercel/next.js%20router&state=open&sort=best-match&page=1&pageSize=25
Response: {
  "items": [{
    "repository": "vercel/next.js",
    "number": 92187,
    "title": "router.replace/push restores stale query parameters from router cache",
    "state": "open",
    "author": { "username": "azu" },
    "labels": [{ "name": "Runtime", "color": "5319e7" }],
    "snippetHtml": "...stale query parameters from <mark>router</mark> cache...",
    "comments": 0,
    "openedAt": "2026-04-02T00:00:00Z"
  }],
  "facets": { "states": [{ "name": "open", "count": 6400 }, { "name": "closed", "count": 1200 }] },
  "total": 6400,
  "page": 1,
  "pageSize": 25,
  "durationMs": 175
}
Error: { "error": { "code": "query_too_large", "message": "Search query is too long" }, "status": 413 }
```

```http
POST /api/search/saved
Request: { "name": "next router", "query": "repo:vercel/next.js router" }
Response: { "id": "uuid", "name": "next router", "query": "repo:vercel/next.js router", "createdAt": "2026-04-30T13:00:00Z" }
Error: { "error": { "code": "validation_failed", "message": "Name and query are required" }, "status": 422 }
```

Implementation mapping:

- Next.js owns the global search/jump modal, qualifier autocomplete, saved-search modal, `/search` result shell, filter rail, result type switching, code snippet rendering, issue/PR/commit/repository result rows, and repository file finder UI.
- Rust API owns query parsing, permission-aware search execution, faceting, saved-search CRUD, repository file finder indexes, and result-type-specific pagination.
- Postgres stores saved_searches, search_queries telemetry, repository_file_index, code_symbol_index, issue_search_documents, pull_request_search_documents, commit_search_documents, repository_search_documents, and trigram/full-text indexes. MVP uses Postgres `pg_trgm` plus tsvector; a dedicated code indexer can be introduced later if scale requires it.

## Repository Actions

Status: inspected live in iteration 8 against `https://github.com/vercel/next.js` while authenticated. Screenshots:

- `ralph/screenshots/inspect/actions-runs-list.jpg`
- `ralph/screenshots/inspect/actions-status-filter.jpg`
- `ralph/screenshots/inspect/actions-workflow-detail.jpg`
- `ralph/screenshots/inspect/actions-run-detail.jpg`
- `ralph/screenshots/inspect/actions-job-log.jpg`
- `ralph/screenshots/inspect/actions-log-search.jpg`

Actions runs list:

- The Actions tab keeps the repository header/tab bar and replaces the main content with a two-column Actions workspace.
- Left rail is headed "Actions" and lists All workflows, pinned workflows, additional workflow files/names, a "Show more workflows..." control, then Management links for Caches, Deployments, Attestations, Usage metrics, and Performance metrics.
- The All workflows view has a filter search input labeled "Filter workflow runs", a run count (`2,500+ workflow runs` in the inspected repository), and compact filter buttons for Workflow, Event, Status, Branch, and Actor.
- Status filter opens a select-panel dialog with search and single-choice options: action required, cancelled, completed, failure, in progress, neutral, queued, skipped, stale, success, timed out, and waiting.
- Run rows show status icon and accessible status text, run title, workflow name, run number, triggering event/object, commit or pull request link, actor avatar/name, branch/ref pill, relative time, duration or live state, and a kebab/options menu.
- Observed statuses include in progress, queued, completed successfully, skipped, cancelled, failed, and action required.

Workflow-specific page:

- Selecting a workflow switches the heading from All workflows to the workflow name and shows the source workflow file link, workflow-level options menu, the same run filter search, and run filters scoped to that workflow.
- Run list rows are the same component as All workflows but omit the Workflow filter because the workflow is fixed.
- A workflow with `workflow_dispatch` should show a Run workflow button above runs; docs confirm this opens branch selection and workflow input fields before queueing a run.

Run detail and job logs:

- Run detail header shows workflow name, status icon/conclusion, run title, run number, rerun/action menus, and the triggering commit/PR/branch metadata.
- Left sidebar has Summary, an All jobs heading, grouped/collapsible job categories, and individual job links. Large workflows can have many matrix jobs; the sidebar must support scrolling and progressive rendering.
- Summary area includes job summary cards/tables, annotations, artifact sections, and download links. Artifact rows include name, digest copy control, size/metadata columns, and download links that open signed downloads.
- Job detail/log view keeps the job sidebar and shows job name/status, duration, annotations, log search input with previous/next result buttons, a log options menu, and collapsible step rows.
- Step rows show pass/fail/cancel status, step name, duration, and expand/collapse behavior. GitHub injects setup/completion steps in addition to user-defined YAML steps.
- Log options include display settings and download links. Searching logs only searches expanded log content in GitHub; opengithub can initially search indexed stored log chunks for better reliability.

API examples:

```http
GET /api/repos/{owner}/{repo}/actions/runs?workflow=build-and-test&status=failure&page=1&pageSize=25
Response: {
  "items": [{
    "id": "uuid",
    "runNumber": 107277,
    "workflow": { "id": "uuid", "name": "build-and-test", "path": ".github/workflows/build_and_test.yml" },
    "title": "perf(ecmascript): shrink JsValue 64->40 bytes",
    "event": "pull_request",
    "status": "completed",
    "conclusion": "failure",
    "headSha": "abc123",
    "headBranch": "mmastrac/jsvalue-perf-experiment",
    "actor": { "username": "lukesandberg", "avatarUrl": "https://..." },
    "startedAt": "2026-04-30T03:10:00Z",
    "completedAt": "2026-04-30T03:43:37Z",
    "durationSeconds": 2017
  }],
  "total": 2500,
  "page": 1,
  "pageSize": 25
}
Error: { "error": { "code": "repo_not_found", "message": "Repository not found" }, "status": 404 }
```

```http
GET /api/repos/{owner}/{repo}/actions/runs/{runId}
Response: {
  "id": "uuid",
  "runNumber": 107277,
  "title": "perf(ecmascript): shrink JsValue 64->40 bytes",
  "status": "completed",
  "conclusion": "failure",
  "jobs": [{ "id": "uuid", "name": "lint / build", "status": "completed", "conclusion": "success", "durationSeconds": 336 }],
  "annotations": [{ "level": "warning", "message": "Deprecated command", "path": ".github/workflows/build_and_test.yml" }],
  "artifacts": [{ "id": "uuid", "name": "turbo-run-summary-test-unit-20", "sizeBytes": 40213, "digest": "sha256:142dc1...", "downloadUrl": "/api/repos/vercel/next.js/actions/artifacts/uuid/download" }]
}
Error: { "error": { "code": "run_not_found", "message": "Workflow run not found" }, "status": 404 }
```

```http
GET /api/repos/{owner}/{repo}/actions/jobs/{jobId}/logs?query=error&page=1&pageSize=200
Response: {
  "job": { "id": "uuid", "name": "lint / build", "status": "completed", "conclusion": "success" },
  "steps": [{ "number": 13, "name": "Run actions/checkout@v4", "status": "completed", "conclusion": "success", "durationSeconds": 7 }],
  "lines": [{ "stepNumber": 13, "lineNumber": 42, "timestamp": "2026-04-30T03:12:00Z", "message": "Checking out repository", "match": false }],
  "total": 2000,
  "page": 1,
  "pageSize": 200
}
Error: { "error": { "code": "logs_expired", "message": "Logs are no longer available for this run" }, "status": 410 }
```

```http
POST /api/repos/{owner}/{repo}/actions/workflows/{workflowId}/dispatches
Request: { "ref": "canary", "inputs": { "release_type": "patch" } }
Response: { "queued": true, "runId": "uuid", "status": "queued" }
Error: { "error": { "code": "workflow_not_dispatchable", "message": "Workflow does not define workflow_dispatch" }, "status": 422 }
```

```http
POST /api/repos/{owner}/{repo}/actions/runs/{runId}/rerun
Request: { "mode": "failed_jobs", "enableDebugLogging": true }
Response: { "queued": true, "runId": "uuid", "attempt": 2 }
Error: { "error": { "code": "rerun_limit_exceeded", "message": "Workflow run cannot be re-run more than 50 times" }, "status": 409 }
```

Implementation mapping:

- Next.js owns `/actions`, `/actions/workflows/{workflow_file}`, `/actions/runs/{run_id}`, job log views, filter panels, run workflow modal, artifact table, annotations panel, and logs search UI.
- Rust API owns workflow discovery from `.github/workflows/*.yml`, YAML parsing/validation, event matching, run queueing, job orchestration, check-run/status aggregation, log streaming/search, artifact upload/download, cancel/rerun/dispatch endpoints, and permission enforcement.
- Postgres stores actions_workflows, workflow_runs, workflow_jobs, workflow_steps, workflow_run_attempts, workflow_annotations, workflow_artifacts, workflow_caches, workflow_dispatch_inputs, check_suites, and check_runs.
- SQS can queue workflow jobs. ECS Fargate worker tasks execute trusted sandboxed jobs in MVP; self-hosted runners, larger runners, ARC, and custom runner images are later features.
- S3 stores log chunks, artifacts, cache archives, and attestations with short-lived signed download URLs. SES sends run failure/approval notification emails where configured.

## Repository Pull Requests

Status: inspected live in iteration 7 against `https://github.com/vercel/next.js` while authenticated. Screenshots:

- `ralph/screenshots/inspect/pr-list.jpg`
- `ralph/screenshots/inspect/pr-sort-menu.jpg`
- `ralph/screenshots/inspect/pr-reviews-filter-menu.jpg`
- `ralph/screenshots/inspect/pr-compare-no-diff.jpg`
- `ralph/screenshots/inspect/pr-detail-conversation.jpg`
- `ralph/screenshots/inspect/pr-detail-merge-box.jpg`
- `ralph/screenshots/inspect/pr-files-diff.jpg`
- `ralph/screenshots/inspect/pr-submit-review-menu.jpg`

Pull request list:

- Repository Pull requests uses the shared repository header/tab bar. On `vercel/next.js`, the tab count showed roughly 1.7k open pull requests.
- A dismissible first-time contributor banner appears above the list and points contributors to issues and contributing guidelines.
- The search builder default query is `is:pr is:open`. Open/Closed tabs showed 1,719 open and 34,869 closed during inspection.
- Toolbar controls include Filters, Labels, Milestones, New pull request, Author, Label, Projects, Milestones, Reviews, Assignee, and Sort.
- Rows show PR state icon, title, labels, number, opened relative time, author, author role badge, draft badge when applicable, check run summary, review status, task progress, linked issue count, comment count, and pagination.
- Review filter menu options are No reviews, Review required, Approved review, Changes requested, Reviewed by you, Not reviewed by you, Awaiting review from you, and Awaiting review from you or your team.
- Sort menu options are Newest, Oldest, Most commented, Least commented, Recently updated, Least recently updated, Best match, and most-reaction emoji sorts.

Compare/create flow:

- `/compare/{base}...{head}` is the entry point for creating a pull request and for comparing refs.
- The compare page has a "Comparing changes" heading, optional compare-across-forks button, base and compare branch/tag selectors, swap affordance, explanatory empty state, sample comparison links, split/unified diff buttons, and changed-file summary.
- When the same branch is selected for base and compare, GitHub shows "There isn't anything to compare" and explains that two different branch names are required.
- Docs confirm pull request creation collects base repository/branch, head repository/branch, title, description, draft state, labels, milestone, assignees, and reviewers. Pull request templates can prefill the body.

Pull request conversation:

- Detail header shows title, PR number, Open/Draft/Merged/Closed state pill, stack navigation when stacked PRs exist, author, base and head refs, line-change counts, Preview/View status/Code controls, and tabs for Conversation, Commits, Checks, and Files changed.
- Conversation timeline includes the PR body, label events, bot comments with collapsible details, force-push events, base-branch changes, ready-for-review events, review requests, review approval events, commits, reactions, comment composer, and right sidebar metadata.
- Sidebar sections include Reviewers, draft/ready-for-review status, Assignees, Labels, Projects, Milestone, Development/linked issues, Notifications, Subscribe, and Participants.
- Merge box appears near the bottom of the conversation. Observed state showed Changes approved, All checks have passed, and Unable to merge as stack because another PR in the stack failed rules.
- Merge behavior must account for draft PRs, merge conflicts, required reviews, required status checks, branch protection/rulesets, stacked PR status, and repository-enabled merge methods.

Files changed and review:

- Files changed tab has a sticky pull request toolbar, viewed progress, Submit review button, diff setting controls, changed-commit selector, file filter input, resizable file tree, per-file header, additions/deletions summary, Viewed toggle, file actions, and a diff table.
- The diff table exposes original and new line-number columns, hunk headers, expand-up/down controls, split/unified rows, syntax-highlighted changed lines, and line-comment entry points.
- Clicking Submit review opens a dialog titled "Finish your review" with a Markdown summary editor, Write/Preview tabs, formatting toolbar, attachment affordance, review event radio choices, Cancel, and Submit review with Command+Enter hint.
- Review event choices are Comment, Approve, and Request changes. Pending line/file comments stay private until review submission.
- Docs confirm reviewers can mark files Viewed, filter the changed file list, switch split/unified diff, hide whitespace, leave single-line and multi-line comments, suggest changes, approve, request changes, or abandon pending reviews.

API examples:

```http
GET /api/repos/{owner}/{repo}/pulls?state=open&page=1&pageSize=25
Response: {
  "pullRequests": [{
    "id": "uuid",
    "number": 93365,
    "title": "[test] Ensure target page is compiled before navigation in instant-navs-devtools",
    "state": "open",
    "draft": false,
    "author": { "username": "eps1lon", "avatarUrl": "https://..." },
    "base": { "repo": "vercel/next.js", "ref": "sebbie/pw-traces-first" },
    "head": { "repo": "vercel/next.js", "ref": "sebbie/03-17-..." },
    "labels": [{ "name": "tests", "color": "0e8a16" }],
    "reviewState": "approved",
    "checks": { "total": 184, "passed": 167, "skipped": 17, "failed": 0 },
    "comments": 2,
    "linkedIssues": 0,
    "updatedAt": "2026-04-30T09:12:00Z"
  }],
  "total": 1719,
  "page": 1,
  "pageSize": 25
}
Error: { "error": { "code": "repo_not_found", "message": "Repository not found" }, "status": 404 }
```

```http
POST /api/repos/{owner}/{repo}/pulls
Request: { "title": "Fix cache collision", "body": "Summary...", "base": "main", "head": "feature/cache-fix", "draft": false, "reviewerUsernames": ["octocat"], "labelNames": ["bug"] }
Response: { "id": "uuid", "number": 42, "url": "/owner/repo/pull/42", "state": "open", "mergeable": null }
Error: { "error": { "code": "invalid_ref_range", "message": "Base and head must be different branches" }, "status": 422 }
```

```http
GET /api/repos/{owner}/{repo}/pulls/{number}/files?diff=split&commit=all
Response: {
  "files": [{
    "path": "test/development/app-dir/instant-navs-devtools/instant-navs-devtools.test.ts",
    "status": "modified",
    "additions": 14,
    "deletions": 10,
    "viewed": false,
    "hunks": [{ "oldStart": 96, "oldLines": 11, "newStart": 96, "newLines": 13, "lines": [{ "type": "context", "oldLine": 97, "newLine": 97, "content": \"it('should show...\" }] }]
  }]
}
Error: { "error": { "code": "pull_request_not_found", "message": "Pull request not found" }, "status": 404 }
```

```http
POST /api/repos/{owner}/{repo}/pulls/{number}/reviews
Request: { "body": "Looks good.", "event": "approve", "comments": [{ "path": "src/file.ts", "line": 12, "side": "right", "body": "Nit: ..." }] }
Response: { "id": "uuid", "state": "approved", "submittedAt": "2026-04-30T09:42:00Z", "pendingCommentsPublished": 1 }
Error: { "error": { "code": "cannot_review_own_pr", "message": "Authors cannot approve their own pull request" }, "status": 403 }
```

```http
PUT /api/repos/{owner}/{repo}/pulls/{number}/merge
Request: { "method": "merge", "commitTitle": "Merge pull request #42", "commitMessage": "Fix cache collision" }
Response: { "merged": true, "mergeCommitSha": "abc123", "state": "merged", "deletedHeadBranch": false }
Error: { "error": { "code": "merge_blocked", "message": "Required checks or reviews are not satisfied", "details": { "checks": "passed", "reviews": "approved", "rulesets": ["stack has blocked pull requests"] } }, "status": 409 }
```

Implementation mapping:

- Next.js owns `/pulls`, `/compare/{base}...{head}`, `/pull/{number}`, `/pull/{number}/commits`, `/pull/{number}/checks`, `/pull/{number}/files`, query/search UI, compare selectors, PR form, conversation timeline, merge box, files diff, review modal, and metadata sidebar.
- Rust API owns PR list/search, compare ref validation, diff generation, PR creation, review requests, review submission, comment persistence, check summary aggregation, mergeability computation, branch protection/ruleset enforcement, merge commits/squash/rebase, and notification fanout.
- Postgres stores pull_requests, pull_request_commits, pull_request_files, pull_request_reviews, pull_request_review_comments, pull_request_review_requests, pull_request_checks_summary, pull_request_viewed_files, branch_protection_rules, rulesets, merge_queue/status records, timeline events, notifications, and audit records.
- Git object storage and Rust git plumbing must compute merge bases, ref ranges, patch hunks, conflict detection, merge commits, squashes, rebases, and plaintext `.diff`/`.patch` responses.
- Actions/check-run data feeds the PR checks tab and merge box. SES sends review-request, comment, approval, change-request, and merge notifications.

## Repository Issues

Status: inspected live in iteration 6 against `https://github.com/vercel/next.js` while authenticated. Screenshots:

- `ralph/screenshots/inspect/issues-list.jpg`
- `ralph/screenshots/inspect/issues-sort-menu.jpg`
- `ralph/screenshots/inspect/issues-label-filter-menu.jpg`
- `ralph/screenshots/inspect/issues-filtered-bug.jpg`
- `ralph/screenshots/inspect/issues-new-template-chooser.jpg`
- `ralph/screenshots/inspect/issues-new-form.jpg`
- `ralph/screenshots/inspect/issues-detail.jpg`
- `ralph/screenshots/inspect/issues-detail-comment-preview.jpg`
- `ralph/screenshots/inspect/issues-notification-customize.jpg`

Issue list:

- Repository Issues uses the shared repository header and tab bar. The tab count on `vercel/next.js` showed roughly 2.1k open issues.
- A dismissible contributor guidance banner appears above the list: it links to contributing guidelines and a good-first-issues collection.
- The list header has a search builder labeled `Search Issues`; default query is `is:issue state:open`.
- To the right of the search builder are Labels and Milestones links and a green New issue button.
- Open and Closed tabs show counts. On the unfiltered list, Open showed 2,131 and Closed showed 22,473.
- The filter toolbar includes Author, Labels, Projects, Milestones, Assignees, Types, and Sort by.
- Issue rows are compact list items with title, inline code spans where needed, label pills, open status, issue number, repository context, author, relative opened time, linked PR indicator, and comments count.
- Filtering by `label:Bug` updated the query to `is:issue state:open label:Bug`, changed counts, and produced a new URL with the encoded query.

Filter and sort behavior:

- Sort opens a radio menu with Sort by options: Created on, Last updated, Total comments, Best match, Reactions. Order options are Oldest and Newest. The current checked state was Created on + Newest.
- Label filtering opens a popover/dialog titled "Filter by label" with a search combobox, "Items will be filtered as you type" helper text, and a multiselect listbox. Rows show a color swatch, label name, and optional description.
- Observed label options included No labels, After, Backport, Broken Link, CSS, Cache Components, Cookies, Documentation, Error Handling, Font, Form, and Freeze.
- Docs confirm advanced issue filters support qualifiers such as `author:`, `involves:`, `assignee:`, `label:`, negative qualifiers with `-`, `linked:pr`, close reason, issue type, issue fields, boolean `AND`/`OR`, and nested parentheses up to five levels.
- Sorting must support newest/oldest created, newest/oldest updated, most/least commented, and most reactions. URL query state must be shareable.

Issue creation:

- New issue opens a "Create new issue" template chooser when the repository has issue templates.
- Observed template cards for `vercel/next.js`: Report an issue, Report a documentation issue, Report a security vulnerability, Ask a question or discuss a topic, Feature or documentation request, and Next.js Learn course.
- Selecting "Report an issue" changed the chooser into an issue form titled "Create new issue in vercel/next.js: Report an issue".
- The form has a required title input and template-defined fields, including reproduction link input, To Reproduce Markdown editor, Current vs. Expected behavior Markdown editor, environment information textarea, affected areas/stages, and additional context.
- Markdown editors use Write/Preview tabs, formatting toolbar buttons, expandable toolbar menus, textareas with instructional placeholders, and "Paste, drop, or click to add files" attachment affordances.
- Footer controls include Create more checkbox, Cancel, and green Create button with Command+Enter hint. The inspection did not submit the form to avoid creating an issue on the target.
- Docs confirm issue creation can also happen from comments, code lines/ranges, discussions, projects, task list items, CLI/API, and URL query parameters. MVP should implement repository form creation plus URL query prefill first; code/comment/discussion conversions can be later.

Issue detail:

- Detail page shows title, issue number, Open state pill, New issue action, timeline column, comment composer, and metadata sidebar.
- The first card shows author avatar/name, opened timestamp, contributor role badge, kebab actions, rendered Markdown body, code blocks with copy buttons, and reaction toolbar.
- Timeline events include label additions, comments, linked pull request events, and commit references.
- The comment composer supports Write/Preview tabs, Markdown toolbar, textarea placeholder "Use Markdown to format your comment", attachment affordance, and `Nothing to preview` when preview is empty.
- Primary composer actions include Close issue and Comment. The page reminds contributors to follow contributing guidelines, security policy, and code of conduct.
- Sidebar sections observed: Assignees, Labels, Type, Fields, Projects, Milestone, Relationships, Development, Notifications, Participants, and Issue actions.
- Notification controls include Customize and Subscribe, with helper text when the current user is not receiving thread notifications.
- Labels in the sidebar are linked color pills with tooltip descriptions; Development showed a linked PR expected to close the issue.

Implementation mapping:

- Next.js owns `/issues`, `/issues/new`, `/issues/{number}`, query builder UI, dropdown filters, template chooser/forms, Markdown editor/preview, issue timeline rendering, metadata sidebar, reaction controls, and notification controls.
- Rust API owns issue list/search, issue creation, template loading, permission checks, metadata mutation, comments, reactions, timeline event creation, subscriptions, notification fanout, and closing/reopening.
- Postgres stores issues, comments, issue timeline events, labels, milestones, issue templates/forms, issue types, field values, relationships, linked pull requests/commits, reactions, subscriptions, participants, and notification records.
- `pg_trgm` and full-text indexes should back issue query search. Search qualifier parsing should be centralized so repository issues, global issues, and pull request lists share behavior.
- SES sends subscribed issue/comment notifications after domain verification.

## Repository Code And File Browser

Status: inspected live in iteration 5 against `https://github.com/vercel/next.js` while authenticated. Screenshots:

- `ralph/screenshots/inspect/repo-code-overview.jpg`
- `ralph/screenshots/inspect/repo-branch-selector.jpg`
- `ralph/screenshots/inspect/repo-code-clone-menu.jpg`
- `ralph/screenshots/inspect/repo-blob-file-view.jpg`
- `ralph/screenshots/inspect/repo-tree-directory.jpg`

Repository overview / Code tab:

- Header shows owner/repo breadcrumb (`vercel / next.js`), repository name, `Public` badge, and action buttons for Watch, Fork, and Star with counts.
- Repository tab bar is horizontal and compact: Code, Issues with count, Pull requests with count, Agents, Discussions, Actions, Security and quality with count, Insights. Settings is permission-gated and was not visible for this public repository.
- Code tab content starts with repository description/sidebar metadata, website link, topics, resource links, activity, stars/watchers/forks, releases, deployments, contributors, and language breakdown.
- Main code toolbar includes branch selector (`canary`), branch count, tag count, Go to file combobox, Add file dropdown, and Code button for clone/download options.
- File table header shows latest commit actor/avatar, commit message, linked PR number, short SHA, relative time, and History/commit count link.
- Directory rows include folder/file icon, path/name, latest commit message with PR links, and relative last commit date. GitHub collapses chains of empty directories into a path segment like `.agents/skills` or `apps/bundle-analyzer`.
- Large repositories render a scrollable, lazily hydrated file table; later rows appear as the page scrolls.

Directory tree view:

- Directory URLs use `/{owner}/{repo}/tree/{branch}/{path}`.
- The tree page keeps the same repository tabs and header, then switches the content header to a split-pane layout with optional collapsible left file tree, draggable pane splitter, branch selector, breadcrumb path, current directory title, Go to file, Add file, More options, latest commit summary, History link, and file table.
- A parent directory row (`..`) appears at the top for nested directories.
- File table columns are Name, Last commit message, and Last commit date.

Blob/file view:

- File URLs use `/{owner}/{repo}/blob/{branch}/{path}`.
- Blob view uses the same split-pane layout. Header has branch selector, breadcrumbs, file name, Go to file, latest commit actor/message/SHA/time, History link, and file metadata.
- File metadata area shows Code and Blame toggles, line/loc/size text such as `352 lines (352 loc) · 15.9 KB`, Raw link, copy/download controls, symbol pane button, Copilot-specific button, and a More file actions menu.
- Code content is a read-only code viewer with line numbers, syntax highlighting, and a hidden read-only textarea for keyboard/screen-reader access.
- Docs confirm Raw displays raw content, copy raw copies file content, download saves raw file, Blame shows line-by-line commit history, and `.git-blame-ignore-revs` suppresses specified formatting/noise commits.
- Docs confirm code navigation uses tree-sitter-like symbol extraction where supported; users can open a symbols pane, jump to definitions, find references, and search a symbol within the repo or all repositories. MVP can ship syntax highlighting and line anchors first, then add symbols after code index support is stable.

Clone/download behavior:

- Code menu must expose clone URL copy for HTTPS first. opengithub should later support SSH once SSH keys are implemented.
- Empty repositories show a Quick setup panel instead of the file table, with HTTPS/SSH clone URL copy, setup-in-desktop equivalent omitted for MVP, and command snippets for creating or pushing an existing repository.
- Download ZIP/source archive should stream the selected ref as an archive generated by Rust git plumbing; large archive generation should be bounded and can spill to S3 for caching.

Implementation mapping:

- Next.js owns repository header/tabs, code toolbar, branch/tag menus, Go to file combobox, file tree, file table, blob viewer, README rendering, sidebar metadata, clone/download menus, and responsive split-pane behavior.
- Rust API owns repository metadata, permission checks, Git ref resolution, tree walking, blob reads, commit summaries, README discovery/render source, line counts, raw file responses, archive generation, clone/fetch/push smart HTTP, and later symbol extraction.
- Postgres stores repository metadata, refs, commits, trees/blobs metadata, language stats, topics, stars, watches, forks, deployments, releases, and code index records. Git object bytes can start on local/ECS volume for dev but production needs durable S3-backed object storage or a dedicated Git object storage layer.
- S3 stores large blobs, source archives, and any cached rendered artifacts. CloudFront can cache public raw/blob/archive responses with permission-aware cache keys.
- `pg_trgm` backs Go to file path search and code search metadata; code contents can be indexed into Postgres text/trigram tables for MVP.

## Repository Creation And Import

Status: inspected in iteration 4. Ever was usable and authenticated for `/new`. Screenshots:

- `ralph/screenshots/inspect/repo-new-form.jpg`
- `ralph/screenshots/inspect/repo-new-gitignore-menu.jpg`

The import route `/new/import` loaded in the Ever tab, but Ever snapshot/screenshot/extract failed with `Cannot access a chrome-extension:// URL of different extension`. Import behavior is therefore docs-backed from `target-docs/content/migrations/importing-source-code/using-github-importer/importing-a-repository-with-github-importer.md` and `about-github-importer.md`.

Repository create form:

- Page title is "Create a new repository" with helper text "Repositories contain a project's files and version history."
- A top inline link says "Have a project elsewhere? Import a repository" and routes to `/new/import`.
- Required fields are marked with an asterisk. The General section starts with "Repository owner and name".
- Owner is a dropdown button defaulting to the signed-in user. It should include personal account and organizations where the user can create repositories.
- Repository name is a required input. GitHub shows a generated suggestion such as `silver-train`; clicking the suggestion fills the input.
- Typing a name with spaces shows a normalized destination line ("Your new repository will be created as OpenGitHub-Invalid-Name-With-Spaces") and an inline validation warning that names can contain ASCII letters, digits, and limited punctuation. The clone should normalize spaces to hyphens for preview, but still require server-side validation.
- Description is optional with a 350-character counter.
- Visibility is a dropdown defaulting to Public. Menu options are Public ("Anyone on the internet can see this repository. You choose who can commit.") and Private ("You choose who can see and commit to this repository.").
- Start with a template is a searchable dropdown defaulting to "No template".
- Add README is a two-state toggle with visible On/Off labels. Toggling it changes the button pressed state immediately.
- Add `.gitignore` opens a dialog/popup titled "Choose a .gitignore template" with a search combobox and listbox. Initial options include "No .gitignore", "AL", "Actionscript", "Ada", "Android", "Angular", and many language/framework templates.
- Add license is a dropdown defaulting to "No license".
- Primary submit button says "Create repository". This inspection did not click it because that would create a real GitHub repository.

Repository import behavior:

- Import is reached from the create form or the global plus/create menu.
- The import page title in docs is "Import your project to GitHub".
- Step 1 collects the source remote repository URL.
- If the source repository is private, the form asks for credentials that will be used only to perform a `git clone` against the source.
- The user chooses destination owner, destination repository name, and visibility.
- Clicking "Begin import" creates a new repository and redirects to a "Preparing your new repository" status page.
- Import tracks source-code and commit history only. It does not import issues, pull requests, hosting-service metadata, Git LFS objects, or repositories hosted on private networks. Non-Git sources are unsupported.

Implementation mapping:

- Next.js owns `/new`, `/new/import`, inline validation, dropdown/popup interactions, async import status page, and redirect to `/{owner}/{repo}`.
- Rust API owns repository creation, owner permission checks, name availability checks, default branch/bootstrap commit creation, template materialization, `.gitignore`/license lookup, and import jobs.
- Postgres stores repository metadata, feature flags, visibility, template selections, import job state, and audit/activity events.
- Git object storage should start on the API service filesystem or S3-backed object storage per the repository storage design; large import artifacts/logs belong in S3.
- Async imports should run in an ECS Fargate worker path with job state in Postgres. If queueing is introduced, use SQS.
- SES sends the completion/failure email for import jobs after the domain is verified.

## Personal Dashboard

Status: partially inspected in iteration 3. Ever was attempted first but the reusable session was expired, and the prompt forbids `ever start`. The authenticated dashboard could not be visually inspected live. Evidence came from scraped GitHub docs plus a fallback Chrome check of `https://github.com/dashboard`, which confirmed unauthenticated users are redirected to the sign-in page. Fallback screenshot: `ralph/screenshots/inspect/dashboard-redirect.jpg`.

Core dashboard behavior to clone:

- The personal dashboard is the first signed-in page and is reachable by clicking the GitHub mark in the top-left global header.
- The signed-in dashboard uses the global app shell plus a dashboard-specific layout: a left repository/navigation sidebar and a central feed/activity column.
- New users with no repositories should see first-run onboarding with Create repository, Import repository, and setup-guide CTAs.
- The left sidebar exposes top repositories and teams through the global navigation menu, plus recently visited repositories/teams/projects through the global search/jump field.
- Top repositories are generated automatically from repositories the user has interacted with, including commits, opened issues, issue comments, opened pull requests, and pull request comments. Users cannot manually edit this ranking; inactive repos should age out after one year.
- Recent activity previews up to four issue/pull-request updates from the last two weeks that involve the user.
- Feed activity supports a Following feed and a For you/recommendations feed. The feed can be filtered by event type.

Dashboard implementation mapping:

- Next.js owns `/dashboard`, responsive layout, empty states, feed cards, filter dropdowns, and client-side repository filtering.
- Rust API owns dashboard aggregation endpoints and permission-aware repository/activity queries.
- Postgres stores dashboard source data in normal product tables plus optional `activity_events`, `feed_events`, `recent_visits`, `follows`, `repository_watches`, `stars`, and `dashboard_hint_dismissals` tables.
- No GitHub Copilot dashboard/prompt features should be built for opengithub; they are target-specific preview features outside the clone's current scope.

## Releases, Tags, And Packages

Status: inspected in iteration 12. Ever was attempted first as required but the active session snapshot failed with `Failed to get DOM document`, and subsequent Ever navigation timed out on the active tab. Used the same Chrome headless fallback pattern from earlier blocked iterations, plus scraped docs for create/edit/delete and package registry behavior.

Screenshots:

- `ralph/screenshots/inspect/releases-list.jpg`
- `ralph/screenshots/inspect/releases-tags.jpg`
- `ralph/screenshots/inspect/release-detail-latest.jpg`
- `ralph/screenshots/inspect/org-packages.jpg`
- `ralph/screenshots/inspect/org-packages-npm-filter.jpg`
- `ralph/screenshots/inspect/package-detail.jpg`

Repository releases:

- `/{owner}/{repo}/releases` uses the repository workspace shell and an internal subnav with Releases and Tags.
- Each release card shows tag name, publish date, author, linked commit SHA, signature verification badge when present, Compare button, release state badge such as Latest or Pre-release, rendered release notes grouped by headings, contributors, expandable Assets count, reaction summary, and pagination.
- The Compare control opens a tag picker/dialog with a filter input and "View all tags"; in headless public capture GitHub showed a transient load error for the picker content, so clone behavior should be implemented as a normal searchable tag selector.
- `/{owner}/{repo}/releases/latest` resolves to the latest stable release detail page. It shows the release title/tag, Latest badge, compare control, commit, release notes, contributors, and assets such as Source code zip and tar.gz.
- `/{owner}/{repo}/tags` uses the same Releases/Tags subnav. Tag rows show tag name, optional Verified badge with GPG key details, date, short commit SHA, zip and tar.gz archive links, and a Notes link when a release exists for that tag. Pagination uses Previous/Next.
- Release creation/editing is write-permission-only and docs-backed: form includes tag selector or new tag from a target branch, optional previous tag for generated notes, title, Markdown description, Generate release notes, binary asset upload, prerelease checkbox, latest-release state, draft/publish controls, and delete confirmation.

Packages:

- Organization package list `/{org}?tab=packages` / `/orgs/{org}/packages` uses the organization profile shell and selected Packages tab.
- The page has two package-mode tabs: GitHub Packages and Linked artifacts. MVP should implement GitHub Packages first and show Linked artifacts as an empty or future state.
- Filter bar includes Type dropdown with All, Container, npm, RubyGems, Maven, and NuGet; Visibility dropdown with All, Public, Internal, and Private; Sort dropdown with Most downloads and Least downloads; and a search field. Query/filter state is encoded in URL query params such as `ecosystem=npm`.
- Package list rows show package icon/type, package name link, published date and publisher, linked repository when present, and download count. Empty filtered results show "0 packages", "No results matched your search", and a link to browse all packages.
- Container package detail page shows package name, short version/digest, Public visibility, Latest badge, installation panel with `docker pull ghcr.io/{namespace}/{name}:{tag}` commands, OS/Arch variants, digests, recent tagged image versions, per-version download counts, repository README/about content when connected, and package settings/management affordances for admins.
- Docs confirm packages may be repository-scoped or account/org-scoped with granular permissions, can inherit access from a linked repository, and use personal access tokens with `read:packages`, `write:packages`, and `delete:packages` scopes. Actions workflows can publish packages and may receive package access through repository inheritance.

Implementation mapping:

- Next.js owns release list/detail/tag views, create/edit release forms, asset upload UI, reaction display, package list/filter pages, package detail/install snippets, package settings views, and empty states.
- Rust API owns release CRUD, tag/ref resolution, generated release notes, immutable/draft/prerelease/latest state transitions, asset upload metadata, source archive generation, package metadata APIs, package permission checks, and OCI registry-compatible container manifest/blob routes.
- Postgres stores releases, release assets, package metadata, package versions, package downloads, package permissions, package-repository links, and package visibility/inheritance settings.
- S3 stores release assets, generated archives, package blobs/manifests/layers, and large metadata payloads. CloudFront can cache public package blobs and source archives. ECS workers can generate release notes and archive artifacts asynchronously.

## Notifications, Watches, And Subscriptions

Status: inspected in iteration 13 with live Ever access. Evidence came from `ever snapshot` on `/notifications`, live screenshots, the repository Watch menu on `vercel/next.js`, and scraped notification/subscription docs.

Screenshots:

- `ralph/screenshots/inspect/notifications-inbox.jpg`
- `ralph/screenshots/inspect/notifications-sort-menu.jpg`
- `ralph/screenshots/inspect/notifications-group-menu.jpg`
- `ralph/screenshots/inspect/notifications-custom-filter-dialog.jpg`
- `ralph/screenshots/inspect/repo-watch-menu.jpg`

Notifications inbox:

- `/notifications` uses the signed-in app shell with a notification-specific two-column layout: fixed left rail for folders/filters/repositories/manage links and a main list panel.
- Left rail sections include Folders with Inbox, Saved, and Done; default Filters with Assigned, Participating, Mentioned, Team mentioned, and Review requested; a custom filter dialog; a Repositories section with per-repository unread counts; and a Manage notifications action menu linking to notification settings, subscriptions, and watched repositories.
- Main panel has All and Unread segmented tabs, a query-builder search input, Sort by menu with Newest to oldest and Oldest to newest, Group by menu with Date and Repository, and a cleanup prompt for marking read notifications as done.
- Notification groups can be rendered by date or by repository. Date grouping observed a "Notifications by date" heading with per-group Select all and group-level actions.
- Notification rows include a checkbox, repository/name and issue or pull request number, title, reason/action text such as "commented", relative timestamp, read/unread state, and right-side triage controls. Row actions observed in the DOM include Move to inbox, Done, Unsubscribe, Subscribe, Save, and Unsave.
- Bulk triage appears after selecting rows and supports Done, Unsubscribe, Save/Unsave, Read/Unread, and Move to inbox depending on current folder/query.
- Saved notifications are retained indefinitely. Done notifications and non-saved notifications follow the target's five-month retention behavior; opengithub can implement this as a scheduled retention job.
- Custom filters are managed in a dialog. Default filters are editable in the dialog but docs say their order and definition should not be changed; opengithub should present defaults as read-only or resettable and allow up to 15 user-created filters. Custom filter fields are name plus query string.
- Supported notification custom-filter qualifiers are `repo:owner/name`, `org:org`, `author:user`, `is:check-suite|commit|issue-or-pull-request|release|repository-invitation|repository-vulnerability-alert|repository-advisory|discussion|saved|done|unread|read`, and `reason:assign|author|comment|participating|invitation|manual|mention|review-requested|security-alert|state-change|team-mention|ci-activity`.

Watches and subscriptions:

- Repository Watch menu is a radio menu with Participating and @mentions, All Activity, Ignore, and Custom. Observed selected state was Participating and @mentions, with keyboard accelerators `p`, `a`, `i`, and `c`.
- Participating and @mentions means the user receives notifications only when participating in a thread, directly mentioned, team-mentioned, assigned, or requested for review.
- All Activity subscribes the user to all repository notifications.
- Ignore suppresses repository notifications, including normal updates; docs warn this can hide mentions, so clone UI should show a warning.
- Custom lets users choose event types in addition to participating/mentions. MVP can model custom event types as a JSON set on `repository_watches`.
- Issue and pull request detail sidebars share thread-level notification controls: Subscribe/Unsubscribe and Customize. Custom thread notifications can fire on merged, closed, or reopened state changes in addition to participation/mentions.

Implementation mapping:

- Next.js owns `/notifications`, `/notifications?query=...`, `/notifications/subscriptions`, `/watching`, `/settings/notifications`, filter dialogs, row/bulk triage controls, grouped list rendering, repository Watch menus, and thread notification sidebars.
- Rust API owns notification fanout from issues, PRs, Actions, releases, repository invitations, security alerts, mentions, review requests, and state changes; query parsing; row and bulk triage; subscription resolution; email delivery handoff; and retention cleanup.
- Postgres stores notifications, notification_threads, notification_subscriptions, repository_watches, notification_custom_filters, notification_delivery_preferences, notification_email_deliveries, and notification_retention_jobs.
- SES sends email notifications after domain verification. Email should include notification identifiers and thread metadata so future inbound-email reply support can be added, but inbound email is not required for MVP.

## Data Models

Initial model set inferred from docs/OpenAPI:

- `users`: id, username, display_name, email, avatar_url, bio, company, location, website_url, created_at, updated_at.
- `auth_accounts`: id, user_id, provider, provider_account_id, access_token_hash, refresh_token_hash, expires_at.
- `sessions`: id, user_id, token_hash, expires_at, ip_address, user_agent, created_at.
- `repositories`: id, owner_type, owner_id, name, full_name, description, visibility, default_branch, has_issues, has_projects, has_wiki, has_discussions, is_template, archived, created_at, updated_at.
- `repository_git_refs`: id, repository_id, ref_type, name, target_sha, created_at, updated_at.
- `commits`: id, repository_id, sha, tree_sha, parent_shas, author_name, author_email, committer_name, committer_email, message, committed_at.
- `issues`: id, repository_id, number, title, body, state, author_id, assignee_id, milestone_id, closed_at, created_at, updated_at.
- `issue_comments`: id, issue_id, author_id, body, rendered_html, created_at, updated_at, edited_at, deleted_at.
- `issue_timeline_events`: id, issue_id, actor_id, event_type, payload_json, created_at.
- `issue_labels`: issue_id, label_id, created_at.
- `issue_assignees`: issue_id, user_id, assigned_by_id, created_at.
- `issue_templates`: id, repository_id, name, description, template_type, body, form_schema_json, default_labels, default_assignees, active, created_at, updated_at.
- `issue_reactions`: id, subject_type, subject_id, user_id, emoji, created_at.
- `issue_subscriptions`: id, issue_id, user_id, state, reason, created_at, updated_at.
- `issue_relationships`: id, source_issue_id, target_type, target_id, relationship_type, created_at.
- `pull_requests`: id, repository_id, number, title, body, state, author_id, head_repo_id, head_ref, base_repo_id, base_ref, merge_commit_sha, merged_at, closed_at, created_at, updated_at.
- `pull_request_commits`: id, pull_request_id, commit_sha, position, authored_at, committed_at.
- `pull_request_files`: id, pull_request_id, path, status, additions, deletions, patch_hash, viewed_state_version, created_at, updated_at.
- `pull_request_reviews`: id, pull_request_id, reviewer_id, state, body, submitted_at, dismissed_at, dismissal_message.
- `pull_request_review_comments`: id, pull_request_id, review_id, author_id, path, body, side, line, start_line, commit_sha, original_commit_sha, state, created_at, updated_at.
- `pull_request_review_requests`: id, pull_request_id, requested_user_id, requested_team_id, requested_by_id, state, created_at, fulfilled_at.
- `pull_request_viewed_files`: id, pull_request_id, user_id, path, file_version_hash, viewed_at.
- `pull_request_checks_summary`: id, pull_request_id, total_count, successful_count, skipped_count, failed_count, pending_count, updated_at.
- `branch_protection_rules`: id, repository_id, pattern, required_reviews_count, dismiss_stale_reviews, require_code_owner_reviews, required_check_contexts, require_linear_history, created_at, updated_at.
- `labels`: id, repository_id, name, color, description.
- `organizations`: id, slug, display_name, description, avatar_url, created_at, updated_at.
- `organization_verified_domains`: id, organization_id, domain, verified_at, verification_token_hash, created_at.
- `organization_memberships`: id, organization_id, user_id, role, public, state, invited_by_id, created_at, updated_at.
- `teams`: id, organization_id, slug, name, description, privacy.
- `user_profile_readmes`: id, user_id, repository_id, commit_sha, rendered_html, rendered_at.
- `profile_pins`: id, owner_type, owner_id, subject_type, subject_id, position, created_at, updated_at.
- `profile_contribution_days`: id, user_id, date, contribution_count, contribution_level, public_count, private_count.
- `profile_contribution_events`: id, user_id, subject_type, subject_id, repository_id, contribution_type, occurred_at, visibility.
- `achievements`: id, key, name, icon_url, description.
- `user_achievements`: id, user_id, achievement_id, tier, count, awarded_at.
- `user_blocks`: id, blocker_id, blocked_user_id, note, created_at.
- `actions_workflows`: id, repository_id, path, name, state, created_at, updated_at.
- `workflow_runs`: id, repository_id, workflow_id, run_number, run_attempt, title, status, conclusion, event, head_sha, head_branch, actor_id, started_at, completed_at, queued_at.
- `workflow_jobs`: id, run_id, name, status, conclusion, runner_label, started_at, completed_at, duration_seconds.
- `workflow_steps`: id, job_id, number, name, status, conclusion, started_at, completed_at, duration_seconds, log_cursor.
- `workflow_logs`: id, job_id, step_id, line_number, timestamp, message, storage_key, indexed_text.
- `workflow_artifacts`: id, run_id, job_id, name, size_bytes, digest, storage_key, expires_at, created_at.
- `workflow_annotations`: id, run_id, job_id, step_id, level, message, path, start_line, end_line, raw_json, created_at.
- `workflow_caches`: id, repository_id, key, version, ref, size_bytes, last_accessed_at, storage_key, created_at.
- `workflow_dispatch_inputs`: id, workflow_id, name, input_type, required, default_value, options_json.
- `check_suites`: id, repository_id, workflow_run_id, head_sha, status, conclusion, created_at, updated_at.
- `check_runs`: id, check_suite_id, workflow_job_id, name, status, conclusion, details_url, started_at, completed_at.
- `packages`: id, owner_type, owner_id, repository_id, package_type, name, visibility, created_at, updated_at.
- `package_versions`: id, package_id, version, tag, digest, manifest_media_type, size_bytes, metadata_json, published_by_id, published_at, deleted_at.
- `package_blobs`: id, package_version_id, digest, media_type, size_bytes, os, architecture, storage_key, created_at.
- `package_downloads`: id, package_id, package_version_id, actor_id, ip_hash, user_agent_hash, downloaded_at.
- `package_permissions`: id, package_id, subject_type, subject_id, role, inherited_from_repository_id, created_at, updated_at.
- `package_repository_links`: id, package_id, repository_id, inherit_permissions, linked_by_id, linked_at.
- `releases`: id, repository_id, tag_name, target_commit_sha, title, body, rendered_html, author_id, state, prerelease, latest, immutable, created_at, published_at, updated_at.
- `release_assets`: id, release_id, name, label, content_type, size_bytes, download_count, storage_key, uploaded_by_id, created_at, updated_at.
- `webhooks`: id, owner_type, owner_id, url, secret_hash, events, active, created_at, updated_at.
- `notifications`: id, user_id, thread_id, subject_type, subject_id, repository_id, reason, state, unread, saved, done_at, last_read_at, last_event_at, updated_at.
- `notification_threads`: id, repository_id, subject_type, subject_id, title, url, state, last_actor_id, last_event_type, last_event_at, created_at, updated_at.
- `notification_subscriptions`: id, user_id, subject_type, subject_id, repository_id, state, reason, custom_events_json, ignored, created_at, updated_at.
- `notification_custom_filters`: id, user_id, name, query_string, position, created_at, updated_at.
- `notification_delivery_preferences`: id, user_id, channel, enabled, events_json, email_address_id, created_at, updated_at.
- `notification_email_deliveries`: id, notification_id, user_id, ses_message_id, status, error_message, sent_at, opened_at.
- `notification_retention_jobs`: id, job_type, cutoff_at, processed_count, status, started_at, completed_at.
- `activity_events`: id, actor_id, repository_id, subject_type, subject_id, event_type, title, summary, created_at.
- `feed_events`: id, actor_id, repository_id, organization_id, event_type, payload_json, visibility, created_at.
- `recent_visits`: id, user_id, subject_type, subject_id, last_visited_at.
- `follows`: id, follower_id, subject_type, subject_id, created_at.
- `repository_watches`: id, user_id, repository_id, watching_level, created_at, updated_at.
- `stars`: id, user_id, repository_id, created_at.
- `dashboard_hint_dismissals`: id, user_id, hint_key, dismissed_at.
- `repository_creation_templates`: id, name, source_repository_id, description, owner_id, visibility, created_at.
- `repository_template_files`: id, template_id, path, mode, content_sha, created_at.
- `gitignore_templates`: id, name, body, source, updated_at.
- `license_templates`: id, spdx_id, name, body, description, permissions, conditions, limitations, updated_at.
- `repository_imports`: id, repository_id, owner_id, source_url, source_host, status, progress_message, error_code, error_message, started_at, completed_at, created_at, updated_at.
- `repository_import_credentials`: id, import_id, username, secret_ref, created_at, expires_at. Store credentials encrypted or as a short-lived AWS Secrets Manager/S3 envelope reference; never persist plaintext.
- `repository_activity_events`: id, repository_id, actor_id, event_type, payload_json, created_at.
- `repository_permissions`: id, repository_id, subject_type, subject_id, role, created_at, updated_at.
- `git_objects`: id, repository_id, object_type, sha, size_bytes, storage_backend, storage_key, created_at.
- `git_trees`: id, repository_id, commit_sha, path, entry_name, entry_type, object_sha, mode, size_bytes, last_commit_sha.
- `repository_languages`: id, repository_id, language, bytes, percentage, color.
- `repository_topics`: id, repository_id, topic.
- `repository_readmes`: id, repository_id, commit_sha, path, rendered_html, rendered_at.
- `code_search_index`: id, repository_id, branch, path, language, line_count, content_tsv, trigram_text, indexed_commit_sha, updated_at.
- `repository_archives`: id, repository_id, ref_name, commit_sha, format, storage_key, expires_at, created_at.
- `repository_settings_audit_events`: id, repository_id, actor_id, setting_key, old_value_json, new_value_json, created_at.
- `repository_invitations`: id, repository_id, invitee_user_id, invitee_email, invited_by_id, role, state, token_hash, expires_at, created_at, accepted_at.
- `repository_rulesets`: id, repository_id, name, target_type, target_pattern, enforcement, bypass_actors_json, rules_json, created_by_id, created_at, updated_at.
- `repository_rule_evaluations`: id, repository_id, ruleset_id, ref_name, commit_sha, actor_id, result, violations_json, evaluated_at.
- `webhook_deliveries`: id, webhook_id, event, delivery_guid, request_headers_json, request_body_storage_key, response_status, response_headers_json, response_body_storage_key, duration_ms, delivered_at, redelivered_from_id.
- `actions_secrets`: id, scope_type, scope_id, name, encrypted_value_ref, key_id, created_by_id, updated_by_id, created_at, updated_at.
- `actions_variables`: id, scope_type, scope_id, name, value, created_by_id, updated_by_id, created_at, updated_at.
- `pages_sites`: id, repository_id, source_type, source_branch, source_folder, custom_domain, domain_state, https_enforced, public_url, latest_deployment_id, created_at, updated_at.
- `pages_deployments`: id, pages_site_id, source_commit_sha, source_workflow_run_id, status, artifact_storage_key, deployed_storage_prefix, error_message, created_at, completed_at.

## API Architecture

The Rust API should expose opengithub-owned REST endpoints modeled after the GitHub REST API style. Initial endpoints:

```http
GET /api/user
Response: { "id": "uuid", "username": "mona", "name": "Mona Lisa", "avatarUrl": "https://..." }
Error: { "error": { "code": "unauthorized", "message": "Authentication required" } }
```

```http
GET /api/dashboard
Response: {
  "topRepositories": [
    { "owner": "mona", "name": "hello-world", "visibility": "public", "language": "TypeScript", "languageColor": "#3178c6", "updatedAt": "2026-04-30T00:00:00Z" }
  ],
  "recentActivity": [
    { "type": "issue", "repository": "mona/hello-world", "number": 12, "title": "Fix flaky test", "state": "open", "updatedAt": "2026-04-30T00:00:00Z", "actor": { "username": "mona", "avatarUrl": "https://..." } }
  ],
  "feed": [],
  "dismissedHints": ["import-repository"]
}
Error: { "error": { "code": "unauthorized", "message": "Authentication required" } }
```

```http
GET /api/dashboard/feed?mode=following&eventType=release&page=1&pageSize=30
Response: {
  "items": [
    { "id": "uuid", "eventType": "release", "actor": { "username": "octo" }, "repository": "octo/app", "title": "v1.2.0", "createdAt": "2026-04-30T00:00:00Z" }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 30
}
Error: { "error": { "code": "validation_failed", "message": "Unsupported feed mode" } }
```

```http
POST /api/dashboard/dismiss-hint
Request: { "hintKey": "create-repository" }
Response: { "hintKey": "create-repository", "dismissed": true }
Error: { "error": { "code": "validation_failed", "message": "hintKey is required" } }
```

```http
POST /api/user/repos
Request: { "name": "hello-world", "description": "My first repository", "private": false, "autoInit": true, "hasIssues": true, "hasDiscussions": false }
Response: { "id": "uuid", "name": "hello-world", "fullName": "mona/hello-world", "private": false, "defaultBranch": "main" }
Error: { "error": { "code": "validation_failed", "message": "Repository name is required" } }
```

```http
GET /api/repositories/name-check?owner=mona&name=hello-world
Response: { "owner": "mona", "name": "hello-world", "normalizedName": "hello-world", "available": true, "message": "hello-world is available." }
Error: { "error": { "code": "validation_failed", "message": "Repository names can only contain ASCII letters, digits, hyphens, underscores, and periods." } }
```

```http
GET /api/repository-options
Response: {
  "owners": [{ "type": "user", "login": "mona", "displayName": "Mona Lisa", "avatarUrl": "https://..." }],
  "gitignoreTemplates": [{ "name": "No .gitignore" }, { "name": "Rust" }, { "name": "Node" }],
  "licenseTemplates": [{ "spdxId": "mit", "name": "MIT License" }],
  "repositoryTemplates": [{ "id": "uuid", "fullName": "mona/template" }]
}
Error: { "error": { "code": "unauthorized", "message": "Authentication required" } }
```

```http
POST /api/repositories/imports
Request: { "sourceUrl": "https://example.com/acme/app.git", "owner": "mona", "name": "app", "visibility": "private", "credentials": { "username": "mona", "password": "secret" } }
Response: { "id": "uuid", "repository": { "fullName": "mona/app" }, "status": "queued", "statusUrl": "/api/repositories/imports/uuid" }
Error: { "error": { "code": "source_unreachable", "message": "The source repository could not be cloned." } }
```

```http
GET /api/repositories/imports/{id}
Response: { "id": "uuid", "repository": { "fullName": "mona/app" }, "status": "importing", "progressMessage": "Cloning source repository", "startedAt": "2026-04-30T00:00:00Z", "completedAt": null }
Error: { "error": { "code": "not_found", "message": "Import job not found" } }
```

```http
GET /api/repos/{owner}/{repo}
Response: {
  "id": "uuid",
  "owner": "mona",
  "name": "hello-world",
  "fullName": "mona/hello-world",
  "description": "My first repository",
  "homepageUrl": "https://example.com",
  "visibility": "public",
  "defaultBranch": "main",
  "stars": 12,
  "watchers": 3,
  "forks": 1,
  "topics": ["rust", "nextjs"],
  "permissions": { "admin": true, "push": true, "pull": true }
}
Error: { "error": { "code": "not_found", "message": "Repository not found" } }
```

```http
GET /api/repos/{owner}/{repo}/tree/{ref}?path=packages/next&page=1&pageSize=100
Response: {
  "repository": { "fullName": "vercel/next.js", "visibility": "public" },
  "ref": { "name": "canary", "type": "branch", "commitSha": "f3f7c7c..." },
  "path": "packages/next",
  "breadcrumbs": ["packages", "next"],
  "latestCommit": { "sha": "f3f7c7c", "message": "Update upload trace url", "author": { "username": "timneutkens", "avatarUrl": "https://..." }, "committedAt": "2026-04-30T10:00:00Z" },
  "entries": [
    { "name": "src", "path": "packages/next/src", "type": "directory", "mode": "040000", "lastCommit": { "sha": "f3f7c7c", "message": "Update upload trace url", "committedAt": "2026-04-30T10:00:00Z" } },
    { "name": "package.json", "path": "packages/next/package.json", "type": "file", "sizeBytes": 15900, "mode": "100644", "lastCommit": { "sha": "4945b6e", "message": "chore: bump postcss to 8.5.10", "committedAt": "2026-04-30T05:00:00Z" } }
  ],
  "total": 86,
  "page": 1,
  "pageSize": 100
}
Error: { "error": { "code": "ref_not_found", "message": "Branch or tag not found" } }
```

```http
GET /api/repos/{owner}/{repo}/blob/{ref}?path=package.json
Response: {
  "repository": { "fullName": "vercel/next.js" },
  "ref": { "name": "canary", "commitSha": "4945b6e..." },
  "path": "package.json",
  "name": "package.json",
  "language": "JSON",
  "sizeBytes": 15900,
  "lineCount": 352,
  "rawUrl": "/api/repos/vercel/next.js/raw/canary?path=package.json",
  "historyUrl": "/vercel/next.js/commits/canary/package.json",
  "latestCommit": { "sha": "4945b6e", "message": "chore: bump postcss to 8.5.10", "author": { "username": "maximecolin" }, "committedAt": "2026-04-30T05:00:00Z" },
  "contentBase64": "ewogICJuYW1lIjogIm5leHRqcy1wcm9qZWN0Ig==",
  "renderedHtml": null
}
Error: { "error": { "code": "blob_too_large", "message": "This file is too large to render in the browser" } }
```

```http
GET /api/repos/{owner}/{repo}/raw/{ref}?path=package.json
Response: raw bytes with Content-Type inferred from file type
Error: { "error": { "code": "not_found", "message": "File not found" } }
```

```http
GET /api/repos/{owner}/{repo}/refs?type=branch&q=can&page=1&pageSize=30
Response: {
  "items": [{ "name": "canary", "type": "branch", "commitSha": "f3f7c7c...", "isDefault": true, "updatedAt": "2026-04-30T10:00:00Z" }],
  "total": 3170,
  "page": 1,
  "pageSize": 30
}
Error: { "error": { "code": "validation_failed", "message": "Unsupported ref type" } }
```

```http
GET /api/repos/{owner}/{repo}/archive/{ref}.zip
Response: 302 to signed S3/CloudFront URL or streamed zip bytes
Error: { "error": { "code": "archive_unavailable", "message": "Archive generation failed" } }
```

```http
GET /api/repos/{owner}/{repo}/issues?state=open&page=1&pageSize=30
Response: { "items": [{ "id": "uuid", "number": 1, "title": "Bug", "state": "open" }], "total": 1, "page": 1, "pageSize": 30 }
```

```http
GET /api/repos/{owner}/{repo}/issues?q=is%3Aissue%20state%3Aopen%20label%3ABug&sort=created-desc&page=1&pageSize=25
Response: {
  "items": [
    {
      "id": "uuid",
      "number": 92877,
      "title": "@vercel/otel fetch instrumentation stripped after HMR in dev mode",
      "state": "open",
      "author": { "username": "Strernd", "avatarUrl": "https://..." },
      "labels": [{ "name": "bug", "color": "d73a4a", "description": "Issue was opened via the bug report template." }],
      "comments": 3,
      "linkedPullRequests": [{ "number": 93249, "state": "open" }],
      "createdAt": "2026-04-16T12:00:00Z",
      "updatedAt": "2026-04-26T07:10:00Z"
    }
  ],
  "total": 813,
  "page": 1,
  "pageSize": 25
}
Error: { "error": { "code": "invalid_query", "message": "Unsupported issue search qualifier" } }
```

```http
GET /api/repos/{owner}/{repo}/issue-options
Response: {
  "labels": [{ "id": "uuid", "name": "bug", "color": "d73a4a", "description": "Indicates an unexpected problem or unintended behavior" }],
  "milestones": [{ "id": "uuid", "title": "v1.0", "openIssues": 12, "closedIssues": 3 }],
  "assignees": [{ "id": "uuid", "username": "mona", "avatarUrl": "https://..." }],
  "types": [{ "id": "uuid", "name": "Bug" }],
  "templates": [{ "id": "uuid", "name": "Report an issue", "description": "Report a product issue." }]
}
Error: { "error": { "code": "not_found", "message": "Repository not found" } }
```

```http
POST /api/repos/{owner}/{repo}/issues
Request: {
  "title": "Bug report",
  "body": "Steps to reproduce...",
  "templateId": "uuid",
  "labels": ["bug"],
  "assignees": ["mona"],
  "milestoneId": "uuid"
}
Response: { "id": "uuid", "number": 42, "title": "Bug report", "state": "open", "url": "/mona/app/issues/42" }
Error: { "error": { "code": "validation_failed", "message": "Title is required" } }
```

```http
GET /api/repos/{owner}/{repo}/issues/{number}
Response: {
  "id": "uuid",
  "number": 92877,
  "title": "@vercel/otel fetch instrumentation stripped after HMR in dev mode",
  "state": "open",
  "author": { "username": "Strernd", "avatarUrl": "https://..." },
  "bodyHtml": "<p>Rendered Markdown</p>",
  "labels": [{ "name": "bug", "color": "d73a4a" }],
  "assignees": [],
  "milestone": null,
  "development": [{ "type": "pull_request", "number": 93249, "state": "open", "title": "fix: preserve OTel fetch instrumentation across HMR in dev mode" }],
  "timeline": [
    { "id": "uuid", "type": "comment", "author": { "username": "vitalets" }, "bodyHtml": "<p>We also encountered this behavior...</p>", "createdAt": "2026-04-19T20:59:00Z" }
  ],
  "subscription": { "state": "not_subscribed", "reason": null }
}
Error: { "error": { "code": "not_found", "message": "Issue not found" } }
```

```http
POST /api/repos/{owner}/{repo}/issues/{number}/comments
Request: { "body": "Thanks, I can reproduce this." }
Response: { "id": "uuid", "bodyHtml": "<p>Thanks, I can reproduce this.</p>", "author": { "username": "mona" }, "createdAt": "2026-04-30T12:00:00Z" }
Error: { "error": { "code": "validation_failed", "message": "Comment body is required" } }
```

```http
PATCH /api/repos/{owner}/{repo}/issues/{number}
Request: { "state": "closed", "stateReason": "completed", "labels": ["bug", "Turbopack"], "assignees": ["mona"], "milestoneId": null }
Response: { "id": "uuid", "number": 92877, "state": "closed", "closedAt": "2026-04-30T12:05:00Z" }
Error: { "error": { "code": "forbidden", "message": "You do not have permission to update this issue" } }
```

```http
POST /api/repos/{owner}/{repo}/issues/{number}/reactions
Request: { "emoji": "+1" }
Response: { "emoji": "+1", "count": 2, "viewerHasReacted": true }
Error: { "error": { "code": "validation_failed", "message": "Unsupported reaction" } }
```

```http
GET /api/search/code?q=Button+repo:mona/hello-world&page=1&pageSize=30
Response: { "items": [{ "repository": "mona/hello-world", "path": "src/Button.tsx", "line": 12, "fragment": "export function Button" }], "total": 1, "page": 1, "pageSize": 30 }
```

```http
GET /api/repos/{owner}/{repo}/releases?page=1&pageSize=10
Response: {
  "items": [{
    "id": "uuid",
    "tagName": "v16.2.4",
    "title": "v16.2.4",
    "state": "published",
    "latest": true,
    "prerelease": false,
    "author": { "username": "next-js-bot", "avatarUrl": "https://..." },
    "targetCommitSha": "2275bd8...",
    "publishedAt": "2026-04-15T22:17:08Z",
    "bodyHtml": "<h2>What's Changed</h2>",
    "assets": [{ "name": "Source code (zip)", "downloadUrl": "/api/repos/vercel/next.js/archive/v16.2.4.zip" }],
    "reactions": { "+1": 4, "hooray": 3 }
  }],
  "total": 1000,
  "page": 1,
  "pageSize": 10
}
Error: { "error": { "code": "not_found", "message": "Repository not found" } }
```

```http
POST /api/repos/{owner}/{repo}/releases
Request: {
  "tagName": "v1.0.0",
  "target": "main",
  "title": "v1.0.0",
  "body": "Initial release",
  "draft": false,
  "prerelease": false,
  "generateNotes": true
}
Response: { "id": "uuid", "tagName": "v1.0.0", "url": "/mona/app/releases/tag/v1.0.0", "state": "published" }
Error: { "error": { "code": "forbidden", "message": "Write access is required to create releases" } }
```

```http
GET /api/repos/{owner}/{repo}/tags?page=1&pageSize=30
Response: {
  "items": [{
    "name": "v16.3.0-canary.5",
    "commitSha": "16150cc...",
    "verified": true,
    "taggedAt": "2026-04-28T00:00:00Z",
    "zipUrl": "/api/repos/vercel/next.js/archive/v16.3.0-canary.5.zip",
    "tarUrl": "/api/repos/vercel/next.js/archive/v16.3.0-canary.5.tar.gz",
    "releaseUrl": "/vercel/next.js/releases/tag/v16.3.0-canary.5"
  }],
  "total": 3000,
  "page": 1,
  "pageSize": 30
}
Error: { "error": { "code": "not_found", "message": "Repository not found" } }
```

```http
GET /api/orgs/{org}/packages?ecosystem=container&visibility=public&sort=downloads-desc&page=1&pageSize=30
Response: {
  "items": [{
    "id": "uuid",
    "name": "bridge-cli",
    "packageType": "container",
    "visibility": "public",
    "publishedAt": "2026-02-24T20:19:22Z",
    "publisher": { "username": "vercel" },
    "linkedRepository": { "fullName": "vercel/bridge" },
    "downloads": 3620
  }],
  "total": 9,
  "page": 1,
  "pageSize": 30
}
Error: { "error": { "code": "invalid_filter", "message": "Unsupported package ecosystem" } }
```

```http
GET /api/packages/{owner}/{package_type}/{package_name}
Response: {
  "id": "uuid",
  "name": "bridge-cli",
  "packageType": "container",
  "visibility": "public",
  "latestVersion": "2a20e3f",
  "install": [{ "label": "linux/amd64", "command": "docker pull ghcr.io/vercel/bridge-cli:2a20e3f@sha256:07ee..." }],
  "versions": [{ "tag": "latest", "digest": "sha256:3992...", "publishedAt": "2026-03-20T12:00:00Z", "downloads": 0 }],
  "readmeHtml": "<h1>Bridge</h1>"
}
Error: { "error": { "code": "forbidden", "message": "You do not have permission to view this package" } }
```

```http
GET /api/notifications?query=is:unread%20repo:mona/hello-world&sort=desc&group=date&page=1&pageSize=50
Response: {
  "items": [{
    "id": "uuid",
    "thread": { "type": "issue", "repository": "mona/hello-world", "number": 42, "title": "Fix build failure", "url": "/mona/hello-world/issues/42" },
    "reason": "comment",
    "state": "inbox",
    "unread": true,
    "saved": false,
    "lastActor": { "username": "octo", "avatarUrl": "https://..." },
    "lastEventType": "commented",
    "lastEventAt": "2026-04-30T02:15:00Z"
  }],
  "groups": [{ "key": "2026-04-30", "label": "Today", "count": 1 }],
  "total": 1,
  "page": 1,
  "pageSize": 50
}
Error: { "error": { "code": "invalid_query", "message": "Unsupported notification filter qualifier" } }
```

```http
PATCH /api/notifications
Request: { "ids": ["uuid"], "action": "done" }
Response: { "updated": 1, "action": "done" }
Error: { "error": { "code": "validation_failed", "message": "ids are required" } }
```

```http
GET /api/notifications/filters
Response: {
  "defaults": [
    { "name": "Assigned", "query": "reason:assign", "readonly": true },
    { "name": "Participating", "query": "reason:participating", "readonly": true }
  ],
  "custom": [{ "id": "uuid", "name": "OSS mentions", "query": "repo:mona/hello-world reason:mention", "position": 1 }]
}
Error: { "error": { "code": "unauthorized", "message": "Authentication required" } }
```

```http
POST /api/notifications/filters
Request: { "name": "OSS mentions", "query": "repo:mona/hello-world reason:mention" }
Response: { "id": "uuid", "name": "OSS mentions", "query": "repo:mona/hello-world reason:mention" }
Error: { "error": { "code": "limit_exceeded", "message": "You can create up to 15 custom filters" } }
```

```http
PUT /api/repos/{owner}/{repo}/subscription
Request: { "level": "custom", "events": ["issues", "pull_requests", "releases", "actions"] }
Response: { "repository": "mona/hello-world", "level": "custom", "events": ["issues", "pull_requests", "releases", "actions"] }
Error: { "error": { "code": "forbidden", "message": "Repository access is required" } }
```

More endpoint examples must be completed after feature-page inspection.

## Backend Architecture

- Axum routes: auth verification middleware, REST JSON routes, Git smart HTTP endpoints, webhook receivers.
- Postgres/RDS: primary relational store, search indexes with `pg_trgm`.
- S3: repository large files if needed, Actions artifacts/log archives, package blobs, Pages static outputs.
- SES: transactional email for notifications and organization invites. Password reset is not needed while auth remains Google-only.
- ECS Fargate: Rust API and background workers.
- ECR: container images.
- CloudFront: Next.js/static asset delivery and Pages CDN.
- SQS optional: repository import queue and later Actions job queue when import concurrency exceeds a single worker loop.

## SDK / DX

`ralph-config.json` disables SDK generation, so do not build a standalone SDK package in the first pass. Build developer experience through:

- REST API documentation.
- Personal access tokens.
- Git clone/push setup instructions.
- Webhook configuration and delivery logs.
- Later optional CLI docs modeled after `gh`.

## Known Constraints

- Auth is Rust-native (no Better Auth, no NextAuth, no JS auth library). Google OAuth only — do not add GitHub OAuth even though this is a GitHub clone.
- No password auth means no password reset flow in opengithub unless the auth mode changes.
- Google OAuth requires authorized JavaScript origins and redirect URIs in Google Cloud Console.
- `DATABASE_URL` is pending until AWS RDS is provisioned by `scripts/preflight.sh`.
- SES requires verified sender/domain before production email.
- Cloudflare env vars are required for DNS automation.
- The clone must not call GitHub APIs for product functionality; GitHub docs/OpenAPI are reference material only.
- Repository creation must validate owner permissions in both Next.js and Rust; Rust is authoritative.
- Repository imports require source repositories reachable from the public internet; private network sources are unsupported in MVP.
- Repository imports must not claim to migrate issues, pull requests, webhooks, or LFS objects unless those migrations are explicitly implemented later.
- Repository code browsing must resolve refs server-side on every tree/blob/raw request and enforce repository visibility before reading git objects.
- Large blobs should not be fully rendered in Next.js; show a too-large state with Raw/Download actions and bounded streaming from Rust.
- Git clone/fetch/push must be implemented by opengithub smart HTTP endpoints and local/S3 object storage, not by proxying GitHub remotes.
- SSH clone URLs should be hidden or disabled until `/settings/keys` and SSH git transport are implemented.
- Public raw/archive responses can be cached, but private repository raw/blob/archive responses must be permission checked and use short-lived signed URLs only.
- Issues can be disabled per repository; routes must return an explicit disabled state instead of exposing stale issue data.
- Public repositories allow issue reading and often issue creation by authenticated users with read access, but metadata mutation such as labels, assignees, milestones, pinning, transfer, and deletion requires triage/write/admin permission.
- Issue templates/forms are repository content and configuration; invalid YAML/form schemas should not break issue creation. Show a blank issue fallback for malformed templates.
- Issue search query parsing must be bounded: reject excessive nesting, unsupported qualifiers, and oversized URLs with structured errors.
- Closing keywords in pull requests must create issue references but should only close issues when the PR is merged.
- Actions workflow discovery must only read `.github/workflows/*.yml` and `.yaml` from the repository default branch unless a run targets a specific ref.
- Workflow YAML parsing and expression evaluation must be sandboxed and bounded; invalid workflow files should show an invalid-workflow row instead of crashing the Actions tab.
- Workflow dispatch is available only when the workflow defines `workflow_dispatch` on the default branch; inputs should be capped at 25 and validated against declared input types/options.
- Re-runs use the original run actor/ref/SHA privileges and should enforce a 50-attempt limit.
- Workflow logs and artifacts are private to users with repository read access; S3 downloads must use short-lived signed URLs and should expire old logs/artifacts according to retention policy.
- MVP runners should execute in isolated ECS Fargate tasks without Docker socket or host credential access. Self-hosted runners, larger runners, ARC, custom images, OIDC federation, and artifact attestations can be added later.
- Search must be permission-aware at query time and index time; private repository code, issues, commits, and saved searches must never leak through counts, facets, suggestions, snippets, or autocomplete.
- Code search MVP should index default branches first. Searching non-default branches, forks, generated/vendor directories, and all historical revisions should be explicit later work.
- Search query parsing must bound boolean nesting, regex complexity, result windows, and facet cardinality to protect Postgres. Return structured 422/413 errors instead of timing out.
- Repository settings writes must require admin permission and create audit events; public repository settings pages must never reveal private collaborators, secrets, hook secrets, or inherited organization policy details beyond what the viewer may administer.
- At least one pull request merge method must remain enabled if pull requests are enabled, otherwise PR merge boxes become impossible to satisfy.
- Branch protection/rulesets must be evaluated by the Rust mergeability path used by pull requests and by Git push endpoints; UI-only enforcement is insufficient.
- Webhook secrets and Actions secrets are write-only after creation. Store encrypted values or envelope references only, redact them in logs, and sign webhook deliveries with an HMAC header.
- Webhook delivery workers must bound retries, timeouts, payload size, and retained delivery history; redelivery should create a new delivery row linked to the original.
- GitHub Pages custom domains require Cloudflare DNS verification before CloudFront alias activation. A repository `CNAME` file alone must not configure the domain.
- Release tags must resolve to repository git refs server-side, and release creation must either use an existing tag or atomically create the tag before publishing the release row.
- Release assets and generated source archives belong in S3 with permission-aware signed URLs for private repositories; public archive URLs may be cached by CloudFront.
- Immutable releases, once enabled for a repository, must prevent asset/tag mutation after publish; draft releases remain editable until published.
- Package registry pushes must authenticate with opengithub personal access tokens or workflow tokens, not Google OAuth browser sessions.
- Package blobs/manifests must be content-addressed by digest and visibility checked before serving; private package counts, versions, install snippets, and download totals must not leak through public package search.
- Container registry MVP should support OCI/Docker manifest, blob upload/download, tag listing, and digest pulls before adding Maven/npm/NuGet/RubyGems protocol-specific registries.
- Notification query parsing must be bounded and should reject unsupported qualifiers, exclusions, full-text inbox search, and oversized queries with structured 422 responses.
- Notification counts, repository buckets, custom filters, and autocomplete must be permission-aware and must not leak private repository names or thread titles.
- Custom notification filters are capped at 15 per user and should support only the documented qualifiers until the parser is intentionally expanded.
- Saved notifications are retained indefinitely; unsaved and Done notifications should expire after five months through an auditable retention job.
- Repository Ignore watch mode should display a warning because it suppresses normal repository notifications and may hide important mentions in the MVP implementation.

## Build Order

1. Rust/Next.js scaffolding and shared environment contract.
2. Database schema and migrations for users, sessions, repositories, Git refs, issues, pull requests.
3. Rust-native Google OAuth login (`oauth2` + `tower-sessions` + `axum-login`).
4. App shell, global navigation, search/jump bar, and dashboard empty state.
5. Repository create/import and repository overview.
6. Git plumbing: clone/fetch/push, refs, commits, tree/blob/raw/archive file browser.
7. Issues and pull requests.
8. Global search/code search, Actions, Releases, Packages, Pages, organizations, teams, profiles, settings, notifications.
9. Public marketing/home surfaces only after the core app is usable.
10. Deployment and production hardening.

## Keyboard Shortcuts

Partial inventory from GitHub command palette docs:

| Shortcut | Scope | Behavior |
| --- | --- | --- |
| `Cmd+K` / `Ctrl+K` | Global | Open command palette in search/navigation mode. |
| `Cmd+Option+K` / `Ctrl+Alt+K` | Global, Markdown-safe | Open command palette when normal shortcut conflicts with text editing. |
| `Cmd+Shift+K` / `Ctrl+Shift+K` | Global | Open command palette in command mode. |
| `>` | Command palette | Switch from search/navigation mode to command mode. |
| `#` | Command palette | Search issues, pull requests, discussions, and projects. |
| `@` | Command palette | Search users, organizations, and repositories. |
| `/` | Command palette | Search files inside a repository scope or repositories inside an organization scope. |
| `!` | Command palette | Search projects only. |
| `Enter` | Command palette | Open highlighted result or run highlighted command. |
| `Cmd+Enter` / `Ctrl+Enter` | Command palette | Open highlighted search/navigation result in a new tab. |
| `Esc` | Command palette | Close command palette. |
| `?` | Command palette | Show command palette help. |
| `/` | Global search results | Focus the active search input again to adjust the query. |
| `c` / `i` / `p` / `d` / `w` | Search type menu | Switch result type to Code, Issues, Pull requests, Discussions, or Wikis when the type menu is open. |
| `Alt+ArrowUp` | Search results | Observed on result repository links; keep result row navigation accessible by keyboard. |
| `t` | Repository | Focus Go to file / file finder. |
| `w` | Repository | Open branch/tag switcher on repository code pages. |
| `y` | Blob view | Replace branch URL with permalink to the current commit. |
| `b` | Blob view | Open Blame for the current file. |
| `l` | Blob view | Jump to a line number prompt or line focus. |
| `g` then `i` | Repository | Go to the Issues tab. |
| `Cmd+/` / `Ctrl+/` | Issues/Pulls list | Focus the issues or pull requests search bar. |
| `l` | Issues/Pulls list or detail | Filter by/edit labels, or apply a label in issue context. |
| `m` | Issues/Pulls list or detail | Filter by/edit milestones, or set a milestone in issue context. |
| `a` | Issues/Pulls list or detail | Filter by/edit assignees, or set an assignee in issue context. |
| `x` | Issue detail | Link an issue or pull request from the same repository. |
| `Ctrl+.` then `Ctrl+<number>` | Comment composer | Open saved replies menu and insert a saved reply. |
| `Cmd+Enter` / `Ctrl+Enter` | Issue creation/comment form | Submit the issue or comment when valid. |
| `p` | Repository Watch menu | Select Participating and @mentions. |
| `a` | Repository Watch menu | Select All Activity. |
| `i` | Repository Watch menu | Select Ignore. |
| `c` | Repository Watch menu | Select Custom notification events. |
