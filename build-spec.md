# opengithub Build Spec

Status: partial, iteration 22 repository labels and milestones inspection.

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

Deep page-level screenshots and interaction details remain pending except auth/public home, the docs-backed personal dashboard slice, repository creation/import, repository code/file browsing, repository issues, repository labels/milestones, repository pull requests, repository Actions workflow runs/logs, global search/code search, user/organization profiles, repository settings/access/hooks/Pages, repository Insights, repository code-security surfaces, repository Discussions, Projects v2, and Wiki.

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

## Repository Labels And Milestones

Status: inspected live in iteration 22 against `https://github.com/vercel/next.js` while authenticated. Screenshots:

- `ralph/screenshots/inspect/labels-list.jpg`
- `ralph/screenshots/inspect/labels-sort-menu.jpg`
- `ralph/screenshots/inspect/milestones-list.jpg`
- `ralph/screenshots/inspect/milestones-sort-menu.jpg`
- `ralph/screenshots/inspect/milestone-detail.jpg`
- `ralph/screenshots/inspect/milestone-detail-selected.jpg`

Labels:

- `/labels` uses the repository workspace shell and a compact management list rather than the issue-list query builder.
- Public read-only view showed a heading `Labels`, search input labelled `Search all labels`, label count (`86 labels`), Sort button, and a list of label rows.
- Each label row shows a color swatch/pill, label name, optional description, and open issue/open pull request count links when nonzero. Observed labels included `adapters`, `After`, `Backport`, `benchmark`, `bug`, `Cache Components`, `create-next-app`, and `CSS`.
- Sort is a radio menu with `Name` and `Total issue count`, plus order choices `Ascending` and `Descending`. The current checked state was Name + Ascending.
- New label, Edit, and Delete controls are permission-gated; docs confirm write access can create/edit/delete labels, while triage access can apply/dismiss labels on issues, pull requests, and discussions.
- Label creation/editing needs name, description, color hex input, random color affordance, validation, Save/Create action, and delete confirmation. Deleting a label removes it from conversations but does not delete issues, pull requests, or discussions.
- Organization default labels seed new repositories only; changing org defaults must not mutate existing repository labels.

Milestones:

- `/milestones` uses the repository workspace shell and a list view with Open and Closed tabs, Sort button, and permissioned New milestone button.
- Public `vercel/next.js` showed one open milestone named `backlog`, `No due date`, `213` closed out of `223` issues, `95 complete`, and links for `10 open` and `213 closed`.
- Milestone sort is a radio menu with `Recently updated`, `Furthest due date`, `Closest due date`, `Least complete`, `Most complete`, `Alphabetical`, `Reverse alphabetical`, `Most issues`, and `Fewest issues`.
- Detail page shows Back to Milestones, milestone title, New issue button, Open state, due date/no due date, last updated timestamp, percent complete, Open/Closed tabs, select-all checkbox, selected count, and issue rows scoped to that milestone.
- Issue rows inside a milestone mirror issue list rows: checkbox, title, status, labels, issue number, repository context, author, opened date, linked PR count, comments, and assignee avatars.
- Selecting an issue updates the selection state from `0 issues of 10 selected` to `1 issue of 10 selected`. No destructive action was taken.
- Docs confirm milestones have title, Markdown description, due date, progress percentage, open/closed issue and pull request counts, create/edit/delete flows, and close/reopen state. Deleting a milestone does not delete associated issues or pull requests.
- Docs also confirm maintainers can prioritize issues/PRs within a milestone by drag/drop unless there are more than 500 open items.

API examples:

```http
GET /api/repos/{owner}/{repo}/labels?q=bug&sort=name&direction=asc
Response: { "labels": [{ "id": "uuid", "name": "bug", "description": "Issue was opened via the bug report template.", "color": "d73a4a", "openIssues": 827, "openPullRequests": 0 }], "total": 1, "page": 1, "pageSize": 50 }
Error: { "error": { "code": "not_found", "message": "Repository not found" }, "status": 404 }
```

```http
POST /api/repos/{owner}/{repo}/labels
Request: { "name": "triage", "description": "Needs maintainer triage", "color": "ededed" }
Response: { "label": { "id": "uuid", "name": "triage", "description": "Needs maintainer triage", "color": "ededed" } }
Error: { "error": { "code": "forbidden", "message": "Write access required" }, "status": 403 }
```

```http
GET /api/repos/{owner}/{repo}/milestones?state=open&sort=updated
Response: { "milestones": [{ "id": "uuid", "number": 1, "title": "backlog", "description": "", "state": "open", "dueOn": null, "openIssues": 10, "closedIssues": 213, "completePercent": 95 }], "total": 1, "page": 1, "pageSize": 50 }
Error: { "error": { "code": "not_found", "message": "Repository not found" }, "status": 404 }
```

```http
PATCH /api/repos/{owner}/{repo}/milestones/{number}
Request: { "title": "v1.0", "description": "Release tracking", "dueOn": "2026-06-01", "state": "open" }
Response: { "milestone": { "id": "uuid", "number": 2, "title": "v1.0", "state": "open", "dueOn": "2026-06-01", "openIssues": 0, "closedIssues": 0, "completePercent": 0 } }
Error: { "error": { "code": "validation_failed", "message": "Title is required" }, "status": 422 }
```

Implementation mapping:

- Next.js owns `/labels`, `/milestones`, `/milestones/{number}`, search/sort menus, label and milestone forms, delete/close confirmations, progress bars, issue-row selection, and permission-gated controls.
- Rust API owns permission checks, CRUD, search/sort, applying/dismissing labels, assigning/unassigning milestones, milestone progress aggregation, issue ordering within milestones, timeline events, notifications, and audit logging.
- Postgres stores labels, label assignments for issues/pull requests/discussions, milestones, issue/pull request milestone links, milestone item ordering, timeline events, notification rows, and organization default-label templates.

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

## Repository Commit History And Branches

Status: inspected live in iteration 16 against `https://github.com/vercel/next.js` while authenticated. Screenshots:

- `ralph/screenshots/inspect/commits-list.jpg`
- `ralph/screenshots/inspect/commits-branch-selector.jpg`
- `ralph/screenshots/inspect/commits-user-selector.jpg`
- `ralph/screenshots/inspect/commits-date-picker.jpg`
- `ralph/screenshots/inspect/commit-detail.jpg`
- `ralph/screenshots/inspect/branches-list.jpg`
- `ralph/screenshots/inspect/branches-row-menu.jpg`

Commit history:

- `/commits/{branch}` keeps the repository header/tab shell and renders inside `repo-content-turbo-frame`.
- Top controls are Branch selector, User selector, and Datepicker. Branch selector opens a `Switch branches/tags` dialog with search input, Branches/Tags tabs, selected default-branch badge, and `View all branches` link.
- User selector opens a searchable author menu plus `View commits for all users`; selecting an author filters to `/commits?author={login}`.
- Datepicker opens an accessible calendar dialog with month/year selects, previous-month button, date grid, `Clear`, and `Today`.
- Commits are grouped by day. Rows show linked subject, linked PR number, optional expand button for the full message, author avatar/login, relative authored time, status-check summary, Verified/Partially verified badge, short SHA, browse-at-commit control, and row action menu.

Commit detail:

- `/commit/{sha}` shows short SHA, Browse files button, author avatar/login, relative time, check summary, Verified badge, full subject/body, branch link, linked PR, parent commit link, full SHA, and copy control.
- Diff content uses a split layout with collapsible file tree, draggable pane splitter, file filter, search-within-code input, per-file more menu, expandable context controls, line-change summaries, and side-by-side diff grids with original/new line numbers.
- Status check buttons link to check-run summaries and include success/failure counts. Verification must distinguish verified, partially verified, and unverified signatures.

Branches:

- `/branches` uses tabs for Overview, Active, Stale, and All, plus a branch search input. Docs add a Your branches view for users with push access.
- Overview separates Default and Active branches. Table columns are Branch, Updated, Check status, Behind, Ahead, Pull request, and Action menu.
- Rows show branch link, copy branch-name button, protected-branch icon/link, latest author avatar, updated relative time, status-check count, ahead/behind counts against default, linked draft/open PR number, and action menu.
- Default branch row shows `Default`; protected rows show rules affordances. The default branch row menu exposed Activity and View rules.
- Docs-backed behavior: Active branches have commits within the last three months; Stale branches have no commits in the last three months; All shows default first and then other branches by recency. Search is simple case-insensitive substring matching over branch names.

API examples:

```http
GET /api/repos/{owner}/{repo}/commits?sha=canary&author=ztanner&until=2026-04-30T23:59:59Z&page=1
Response: {
  "commits": [{
    "sha": "4ba05cc300cd3f196bdcebe56de2f6811171bb68",
    "shortSha": "4ba05cc",
    "messageHeadline": "enable validateRSCRequestHeaders by default (#93367)",
    "author": { "login": "ztanner", "avatarUrl": "https://..." },
    "authoredAt": "2026-04-30T08:12:00Z",
    "parents": ["f3f7c7c09b0ad2f79f9c4ac0b464af23721dedbc"],
    "checks": { "conclusion": "failure", "passed": 174, "total": 184 },
    "verification": { "verified": true, "reason": "valid", "signatureType": "gpg" },
    "linkedPullRequest": { "number": 93367, "state": "merged" }
  }],
  "total": 41293, "page": 1, "pageSize": 35
}
Error: { "error": { "code": "ref_not_found", "message": "Branch, tag, or commit not found" }, "status": 404 }
```

```http
GET /api/repos/{owner}/{repo}/commits/{sha}
Response: {
  "sha": "4ba05cc300cd3f196bdcebe56de2f6811171bb68",
  "message": "enable validateRSCRequestHeaders by default (#93367)\n\nThis flag has been enabled...",
  "treeSha": "ab12...",
  "parents": [{ "sha": "f3f7c7c09b0ad2f79f9c4ac0b464af23721dedbc" }],
  "author": { "name": "ztanner", "email": "ztanner@example.com", "login": "ztanner", "date": "2026-04-30T08:12:00Z" },
  "verification": { "verified": true, "reason": "valid" },
  "stats": { "additions": 2, "deletions": 5, "total": 7 },
  "files": [{ "path": "packages/next/src/server/config-shared.ts", "status": "modified", "additions": 1, "deletions": 4, "patch": "@@ -13,7 +13,6 @@" }]
}
Error: { "error": { "code": "commit_not_found", "message": "Commit not found" }, "status": 404 }
```

```http
GET /api/repos/{owner}/{repo}/branches?view=active&query=error&page=1
Response: {
  "branches": [{
    "name": "aurorascharff/error-overlay-metadata-viewport-sync",
    "default": false,
    "protected": true,
    "updatedAt": "2026-04-30T11:20:00Z",
    "checks": { "conclusion": "failure", "passed": 120, "total": 175 },
    "ahead": 11,
    "behind": 43,
    "pullRequest": { "number": 93287, "state": "draft" }
  }],
  "total": 218, "page": 1, "pageSize": 30
}
Error: { "error": { "code": "repository_not_found", "message": "Repository not found" }, "status": 404 }
```

Implementation mapping:

- Next.js owns `/commits/{ref}`, `/commit/{sha}`, `/branches`, filter dialogs, datepicker, commit diff/file-tree rendering, branch table tabs, and row menus.
- Rust API owns ref resolution, commit walks, author/date filters, commit signature verification, status/check aggregation, diff generation, branch active/stale classification, ahead/behind calculations, protected-branch/rules metadata, and permission checks.
- Postgres stores commit metadata, commit_search_index rows, commit_signature_verifications, commit_status_summaries, repository_git_refs, branch activity projections, branch protection/rulesets, and linked PR refs. Git object storage remains the source of truth for commit/tree/blob bytes.
- Actions/check-run data feeds commit and branch status buttons. Branch protection/rules data feeds protected badges and View rules links.

## Repository Insights

Status: inspected in iteration 17 with live Ever navigation on `vercel/next.js`. Traffic redirected to the authenticated dashboard for a read-only public repository, matching GitHub's permission gate that repository traffic requires push access. Traffic UI details are docs-backed.

Screenshots:
- `ralph/screenshots/inspect/insights-pulse.jpg`
- `ralph/screenshots/inspect/insights-pulse-period-menu.jpg`
- `ralph/screenshots/inspect/insights-contributors.jpg`
- `ralph/screenshots/inspect/insights-traffic.jpg`
- `ralph/screenshots/inspect/insights-network.jpg`
- `ralph/screenshots/inspect/insights-dependency-graph.jpg`
- `ralph/screenshots/inspect/insights-dependents.jpg`
- `ralph/screenshots/inspect/insights-forks.jpg`

Shared Insights shell:
- Insights keeps the repository header/tab bar and renders a left sidebar headed `Insights: {owner}/{repo}`.
- Sidebar links observed: Pulse, Contributors, Community standards, Commits, Code frequency, Dependency graph, Network, Forks, Actions usage metrics, and Actions performance metrics.
- Graph pages use accessible Highcharts regions with "View as data table" controls, chart export/action buttons, and keyboard-readable chart summaries.

Pulse:
- Pulse defaults to a one-week window and shows the exact date range, a Period button, overview metric cards for active pull requests and active issues, linked counts for merged/open PRs and closed/new issues, and a summary sentence for authors, commits on default branch, commits on all branches, changed files, additions, and deletions.
- Period menu is a radio menu with 24 hours, 3 days, 1 week, and 1 month. Selecting a period reloads the Pulse aggregates.
- Top Committers is a bar chart with avatar links below it. Activity streams below include releases published and pull requests merged, with linked release tags/PR titles, actors, states, and relative times.

Contributors:
- Contributors page shows a heading, default branch scope, commit-limit message when line counts are omitted, Period button, a repository-wide "Commits over time" interactive chart, range sliders for start/end selection, and per-contributor cards.
- Contributor rows/cards include avatar, login link, total commit count, an expandable/exportable chart menu, and an individual bar chart. Docs confirm only the top 100 contributors are shown, merge commits and empty commits are excluded, and only commits merged to the default branch count.

Traffic:
- `/{owner}/{repo}/graphs/traffic` is push-access gated. Read-only navigation redirected to dashboard during live inspection.
- Docs-backed UI: traffic contains clones and visitors line charts for the past 14 days, referring sites table, and popular content table. Data uses UTC, clones/visitors update hourly, and referrers/popular content update daily.

Network and forks:
- Network page shows an explanatory "Network graph" page, a timeline of recent commits to the repository and network, and notes that the network graph displays the 50 most recently pushed forks and updates daily.
- Forks page links back to tree view and has filter menus for Period, Repository type, and Sort, plus a disabled "Defaults Saved" button when current filters match defaults.
- Fork rows show fork owner/avatar, repository name, small metric icons/counts, Created relative time, and Updated relative time. Observed defaults: Period = 2 years, Repository type = Active, Sort = Most starred.

Dependency graph:
- Dependency graph has tabs for Dependencies and Dependents and an Export SBOM button.
- Dependencies tab has a query-builder search input, total count, Ecosystem select-panel filter, and rows for each dependency. Rows include package name/version, Direct or Transitive badge, ecosystem, manifest/lockfile path, detected automatically date, license, and a row options menu.
- Dependents tab has a package filter menu, counts for dependent repositories and packages, warning disclosure, owner filter with username input, and dependent repository rows. Observed `next` package dependent counts were millions of repositories and over one hundred thousand packages.

API examples:

```http
GET /api/repos/{owner}/{repo}/insights/pulse?period=week
Response: {
  "range": { "from": "2026-04-22", "to": "2026-04-29", "period": "week" },
  "overview": { "activePullRequests": 140, "activeIssues": 35, "mergedPullRequests": 71, "openPullRequests": 69, "closedIssues": 22, "newIssues": 13 },
  "summary": { "authors": 27, "defaultBranchCommits": 73, "allBranchCommits": 432, "changedFiles": 395, "additions": 10380, "deletions": 5384 },
  "topCommitters": [{ "user": { "login": "feedthejim", "avatarUrl": "https://..." }, "commits": 114 }],
  "activity": [{ "type": "pull_request_merged", "title": "enable validateRSCRequestHeaders by default", "number": 93367, "actor": "feedthejim", "occurredAt": "2026-04-30T05:00:00Z" }]
}
Error: { "error": { "code": "not_found", "message": "Repository not found" }, "status": 404 }
```

```http
GET /api/repos/{owner}/{repo}/insights/contributors?period=all&page=1&pageSize=25
Response: {
  "branch": "canary",
  "lineCountsOmitted": true,
  "chart": [{ "week": "2026-04-26", "commits": 312 }],
  "contributors": [{ "login": "ijjk", "avatarUrl": "https://...", "commits": 4631, "weekly": [{ "week": "2026-04-26", "commits": 24 }] }],
  "total": 100, "page": 1, "pageSize": 25
}
Error: { "error": { "code": "insights_unavailable", "message": "Contributor graph is not available for this repository" }, "status": 422 }
```

```http
GET /api/repos/{owner}/{repo}/insights/traffic
Response: {
  "clones": [{ "date": "2026-04-29", "count": 420, "uniques": 90 }],
  "views": [{ "date": "2026-04-29", "count": 1500, "uniques": 620 }],
  "referrers": [{ "referrer": "google.com", "count": 230, "uniques": 190 }],
  "popularContent": [{ "path": "/", "title": "README", "count": 900, "uniques": 500 }]
}
Error: { "error": { "code": "forbidden", "message": "Push access is required to view traffic" }, "status": 403 }
```

```http
GET /api/repos/{owner}/{repo}/network/forks?period=2y&type=active&sort=stars&page=1&pageSize=25
Response: {
  "forks": [{ "owner": "supertokens", "name": "next.js", "stars": 19, "createdAt": "2021-04-01T00:00:00Z", "updatedAt": "2024-04-01T00:00:00Z" }],
  "filters": { "period": "2y", "type": "active", "sort": "stars" },
  "total": 50, "page": 1, "pageSize": 25
}
Error: { "error": { "code": "invalid_filter", "message": "Unsupported fork filter" }, "status": 422 }
```

```http
GET /api/repos/{owner}/{repo}/dependency-graph/dependencies?q=react&ecosystem=npm&page=1&pageSize=25
Response: {
  "dependencies": [{ "package": "@actions/core", "version": "1.10.1", "relationship": "direct", "ecosystem": "npm", "manifestPath": "pnpm-lock.yaml", "detectedAt": "2026-02-24T00:00:00Z", "license": "MIT" }],
  "total": 12977, "page": 1, "pageSize": 25
}
Error: { "error": { "code": "dependency_graph_disabled", "message": "Dependency graph is disabled for this repository" }, "status": 422 }

GET /api/repos/{owner}/{repo}/dependency-graph/dependents?package=next&type=repository&owner=OcularEngineering&page=1&pageSize=25
Response: {
  "package": "next",
  "counts": { "repositories": 5050990, "packages": 136378 },
  "dependents": [{ "owner": "OcularEngineering", "name": "ocular", "stars": 449, "forks": 34 }],
  "total": 5050990, "page": 1, "pageSize": 25
}
```

Implementation mapping:
- Next.js owns the Insights sidebar, filter menus, chart rendering, data-table fallbacks, dependency search/filter UI, forks list filters, and traffic permission empty state.
- Rust owns aggregation jobs for Pulse, contributor stats, traffic rollups, fork/network projections, dependency extraction from manifests/lockfiles, dependents index, SBOM export, and permission gates.
- Postgres stores repository_insight_snapshots, repository_traffic_daily, repository_contributors_weekly, repository_network_forks, dependency_manifests, repository_dependencies, repository_dependents, sbom_exports, and chart cache rows.
- S3 stores generated SBOM exports and optional large dependency graph artifacts. Background jobs can run inside the API worker initially; move to SQS/ECS workers if graph generation becomes slow.

## Repository Code Security

Status: inspected in iteration 18. Ever was healthy and authenticated. Live inspection covered public `vercel/next.js` security policy/advisory pages and admin-visible empty/disabled alert pages for `namuh-eng/opengithub`. Alert list/detail behavior was cross-checked against scraped GitHub docs for Dependabot alerts, code scanning alerts, secret scanning alerts, security advisories, and SECURITY.md policy setup.

Screenshots:
- `ralph/screenshots/inspect/security-overview.jpg`
- `ralph/screenshots/inspect/security-policy.jpg`
- `ralph/screenshots/inspect/security-advisories-list.jpg`
- `ralph/screenshots/inspect/security-advisory-detail.jpg`
- `ralph/screenshots/inspect/security-dependabot-empty.jpg`
- `ralph/screenshots/inspect/security-dependabot-settings-menu.jpg`
- `ralph/screenshots/inspect/security-code-scanning-empty.jpg`
- `ralph/screenshots/inspect/security-secret-scanning-empty.jpg`

Shared security shell:
- The repository tab label is `Security and quality` and shows a count badge when advisories or alerts exist.
- The security page renders inside the repository workspace and adds a left sidebar headed `Security and quality`.
- Observed sidebar groups: Overview, Findings, Code quality, Dependabot, Malware, Vulnerabilities, Code scanning, Secret scanning, Reporting, Security policy, Advisories.
- Public repositories expose Security policy and published advisories to readers. Alert management pages require repository write/admin-level permissions and feature enablement.

Security policy:
- `/security/policy` renders repository `SECURITY.md` content with the standard Markdown renderer, heading anchors, email links, and a compact action/menu button near the file title.
- Docs confirm setup starts from Security -> Security policy -> Start setup, creates `.github/SECURITY.md` or `SECURITY.md`, writes supported versions/reporting instructions, and follows the normal file commit/propose-change flow.
- opengithub should allow maintainers to author/edit the policy through the same file-editor plumbing used for repository code edits, while public readers get a read-only rendered policy.

Repository advisories:
- `/security/advisories` uses the security sidebar and a dense advisory list. Rows show published/draft status icon, advisory title, GHSA identifier, state text, relative/published date, author, and severity pill.
- Advisory pagination uses Previous, numbered pages, and Next. The public security overview also embeds recent advisories below the policy.
- Detail pages show title, severity badge, author/state, GHSA id, package/ecosystem, affected versions, patched versions, Markdown description, CVSS score modal, CVSS base metrics, CVE id, weakness/CWE disclosure, and footer navigation.
- Maintainer docs define draft advisory creation with required title plus CVE, description, details, severity/CVSS, CWE, credits, collaborators, private fork collaboration, publish, edit, and delete flows. MVP should implement draft/list/detail/publish metadata and omit Copilot-specific fix generation.

Dependabot alerts:
- Admin-visible `/security/dependabot` page showed disabled state for `namuh-eng/opengithub`: title `Dependabot alerts`, feedback link, alert-settings kebab, message that alerts are disabled, settings link, and ProTip query `scope:development`.
- Opening the alert settings menu revealed Manage repository vulnerability settings, Manage Dependabot rules, Manage account notification settings, Refresh Dependabot alerts, and a ProTip for `resolution:auto-dismissed`.
- Docs confirm enabled lists have Open/Closed tabs, search, package/ecosystem/manifest filters, Most important sort, labels such as Development, row selection, bulk dismiss/reopen, alert detail pages, assignee selector, dismissal reason/comment, reopen, security update PR creation, audit events, and GraphQL dismissal comments.
- opengithub should generate vulnerability alerts from parsed dependency manifests and an internal advisory feed, not by calling GitHub APIs.

Code scanning alerts:
- Admin-visible `/security/code-scanning` empty state showed `Code scanning is not enabled`, explanatory text, and an Enable code scanning link.
- Docs confirm enabled list defaults to the default branch, requires write permission for summary pages, includes free-text search, filter dropdowns, tool/branch/severity/state/ref filters, linked issues, application-code-only filter, detail views with highlighted locations, data-flow `Show paths`, `Show more` remediation guidance, assignee selector, and audit events.
- opengithub should accept SARIF uploads from Actions or external tools, normalize alerts by rule/location/fingerprint, and expose PR annotations to repository readers while limiting global alert management to write/admin users.

Secret scanning alerts:
- Admin-visible `/security/secret-scanning` empty state showed `Secret scanning alerts`, disabled text, explanation of accidental secret detection, and an Enable secret scanning link to Advanced Security settings.
- Docs confirm enabled lists support provider/default and generic results tabs, filters for bypassed, is, provider, repo, resolution, results, secret-type, sort, team, topic, validity, and optional push-protection bypass states.
- opengithub should scan committed blobs and pushed commits for configured secret patterns, store redacted alert evidence only, support validity states where implemented, and block or warn on pushes through the Rust Git endpoint when push protection is enabled.

Implementation mapping:
- Rust API owns feature enablement, permission checks, alert search parsing, SARIF ingestion, dependency manifest extraction, secret pattern scanning, advisory CRUD/publish, security-policy file writes, audit events, notification fanout, and PR/check integration.
- Next.js owns the Security and quality sidebar, alert list/filter/detail surfaces, disabled/empty states, advisory forms, policy Markdown authoring, CVSS/CWE disclosures, and confirmation modals.
- Postgres stores normalized alerts/advisories, dismissed/reopened state, filters, advisory metadata, SARIF runs, secret-scanning pattern hits, dependency vulnerability matches, and audit records.
- S3 stores SARIF uploads, code-scanning analysis artifacts, optional evidence bundles, and exported audit/report files. SES sends alert/advisory notifications after domain verification.

## Repository Discussions

Status: inspected in iteration 19 with live Ever access on `vercel/next.js`, plus docs-backed maintainer/category behavior for permissioned actions.

Screenshots:

- `ralph/screenshots/inspect/discussions-list.jpg`
- `ralph/screenshots/inspect/discussions-new-form.jpg`
- `ralph/screenshots/inspect/discussions-create-help-form.jpg`
- `ralph/screenshots/inspect/discussions-create-preview-empty.jpg`
- `ralph/screenshots/inspect/discussions-detail.jpg`
- `ralph/screenshots/inspect/discussions-answered-detail.jpg`
- `ralph/screenshots/inspect/discussions-polls-category.jpg`

Observed list and category UI:

- `/{owner}/{repo}/discussions` uses the repository workspace shell and active Discussions tab.
- The main content starts with repository/name + Discussions heading, then a Pinned Discussions block with compact cards showing avatar, title, category chip, and author.
- The filter row uses a query-builder search input labeled "Search all discussions" with default query `is:open`, Sort by menu, Label select-panel, Filter action menu, and green New discussion button.
- Category pages such as `/discussions/categories/polls` keep the same list shell but add the category name/emoji/description and prefill the query with `category:Polls`.
- Right rail contains Categories links, Most helpful contributors for the last 30 days, and Community links such as Code of conduct and project site.
- Discussion rows show upvote button/count, optional category emoji, title, author/action/time/category, unanswered/answered state, participant avatars, and comment count.

Observed creation UI:

- `/discussions/new/choose` first asks the user to select a category. Cards show emoji, title, description, and "Answers enabled" where relevant.
- Selecting Help opened a category-specific form with title input, structured fields from the repository discussion form template, Markdown composer with Write/Preview tabs, toolbar, attachment input, saved replies menu, required "I have done a search for similar discussions" checkbox, and Start discussion button.
- Helpful resources sidebar links to Contributing, Code of conduct, Security policy, and Community Guidelines.
- First-time contributors see a community reminder callout. Security-sensitive categories point users to the repository security policy.
- Preview tab renders a panel without submitting. Required title/body/search acknowledgement remain server-validated.

Observed detail and answer UI:

- Discussion detail shows title, number, Open/Closed/Unanswered or Answered status, author/category line, body/comment cards, collaborator badges, edit history/action menus, upvote controls, reaction menus, and permalink anchors.
- Comment timeline has Replies counts, Oldest/Newest/Top sort links, nested replies, code block copy buttons, comment action menus, and reaction menus.
- Answer-enabled discussions show "Answered by" in the header, an "Answered: jump to answer" link, a highlighted answer preview/card, "View full answer", and sidebar event rows recording answer marking.
- Right sidebar includes Category, Labels, Participants, Notifications subscribe button, and Events.
- Comment composer at the bottom uses the same Markdown toolbar, saved replies, attachments, and hidden anti-spam fields as issue/PR comments.

Docs-backed maintainer behavior:

- Repository admins/write users can enable Discussions, configure a welcome post, and manage categories. Organization discussions use a source repository.
- Categories have unique emoji/name pairs, description, format, optional section, and a maximum of 25 categories. Supported formats include Announcement, Open-ended, Poll, and Question and Answer.
- Deleting a category requires choosing another category to move its discussions into. Sections can be created/edited/deleted; deleting a section does not delete categories.
- Category forms live in `/.github/DISCUSSION_TEMPLATE/*.yml` on the default branch and use GitHub-style form schema. They are not supported for polls.
- Maintainers can pin up to four discussions globally and up to four per category, customize pinned appearance, unpin, recategorize non-poll discussions, transfer discussions within allowed ownership constraints, delete discussions, close/reopen discussions, and lock/unlock conversations with optional reactions.
- Triage users can mark comments as answers and convert issues to discussions by choosing a discussion category. Poll discussions cannot be moved to/from non-poll categories.

Implementation mapping:

- Next.js owns Discussions list/category pages, query-builder UI, category chooser, category-form rendering, Markdown write/preview composer, detail timeline, answer card, poll controls, sidebar metadata, and moderator dialogs.
- Rust API owns discussion query parsing, repository visibility checks, category/form loading from Git, creation/comment/reaction/vote mutations, moderation permissions, answer marking, pin/lock/transfer/delete/convert actions, subscriptions, notifications, and audit events.
- Postgres stores discussions, categories, sections, pins, comments, replies, votes, reactions, answers, labels, events, polls, poll options, and poll votes. S3 stores discussion/comment attachments. SES sends notification fanout where email notifications are enabled.

## Projects V2

Status: inspected in iteration 20 with live Ever access on `github` organization public Projects and GitHub Public Roadmap, plus docs-backed admin/workflow/settings behavior for permissioned controls.

Screenshots:

- `ralph/screenshots/inspect/projects-org-list.jpg`
- `ralph/screenshots/inspect/projects-roadmap-table.jpg`
- `ralph/screenshots/inspect/projects-view-menu-board.jpg`
- `ralph/screenshots/inspect/projects-insights.jpg`

Observed project list UI:

- `/orgs/github/projects` uses the organization profile shell with active Projects tab and count. It has a dismissible "Welcome to Projects" banner describing table, board, roadmap, custom fields, saved views, workflows, and insights.
- The page has Projects and Templates sub-tabs, a search input labeled "Search all projects" prefilled with `is:open`, Open and Closed tabs with counts, and a Sort action menu.
- Project rows show title, optional description, project number, updated timestamp, optional status pill such as "On track", and a More project options menu.
- Copy project flow is exposed from row action menus. The copy dialog includes a title input prefilled with `[COPY] <project name>`, an "Include draft issues" checkbox, Cancel, and submit button.

Observed project workspace:

- `/orgs/github/projects/4247` opens a dense `projects-v2` workspace with breadcrumb `github / Projects / GitHub Public Roadmap`, project title, project-view link, Insights link, saved view tabs, and a plus button for new views.
- The inspected default view had tabs for All Items, General Availability Items, Public Previews, Server (GHES), and Recently Shipped.
- A left slice rail grouped by Product Focus Area with counts. The filter bar used tokenized qualifiers such as `is:open -status:"Q3 2025 – Jul-Sep","Q4 2025 – Oct-Dec"` and displayed a matching item count.
- The item grid was grouped by roadmap quarters (`Q1 2026 – Jan-Mar`, `Q2 2026 – Apr-Jun`, `Future`) and showed issue icons, source repository `roadmap`, issue numbers, titles, labels/field pills, product focus area, and release phase. Clicking field values filters the view.
- The workspace uses virtualized scroll regions and a draggable pane splitter for dense data.

Observed view configuration:

- The View button opens a menu with layout choices Table, Board, and Roadmap. The buttons expose keyboard hints `t`, `b`, and `r`.
- The same menu contains Fields, Column by, Swimlanes, Sort by, Field sum, and Slice by configuration rows.
- Docs confirm table layout supports showing/hiding fields, grouping/slicing by field values, field/row reordering, sorting, and number field sums.
- Docs confirm board layout supports columns from single-select/iteration fields, card dragging to update field values, optional column limits, shown/hidden columns, swimlane grouping, slicing, sorting, and field sums.
- Docs confirm roadmap layout supports start/target date or iteration fields, vertical markers for iterations/milestones/item dates, Month/Quarter/Year zoom, slicing, sorting, grouping, and field sums.

Observed insights:

- `/orgs/github/projects/4247/insights` replaces the project grid with an Insights surface and "Return to project view" link.
- Left sidebar has Default charts and Custom charts, with Burn up selected.
- Burn up chart page has description text, filter bar (`is:issue` in the inspected project), matching item count, range links for 2 weeks, 1 month, 3 months, Max, Custom range button, chart action buttons, and an accessible interactive chart region with "View as data table".
- Docs confirm custom charts can define filters, chart type, and displayed information, and are available to project viewers.

Docs-backed admin and automation behavior:

- Projects can exist at user or organization level and can be linked to repositories. A default repository makes new issues created from the project use that repository and makes the project appear on the repository Projects tab.
- Project items may be issues, pull requests, or draft issues. Items can be added by URL paste, repository search with `#`, bulk add, issue/PR list selection, issue/PR sidebar, command palette, issue creation modal, or draft issue row.
- Draft issues are project-only until converted to repository issues. They can have title, body, assignees, and custom fields, but repository, labels, and milestones require conversion.
- Custom fields include text, number, date, single select, iteration, issue fields, pull-request fields, parent/sub-issue progress, and issue type. Projects can use up to 50 fields including built-ins.
- Iteration fields create three iterations initially, support custom duration/start date, adding more iterations, editing names/date ranges, deleting iterations, inserting breaks, and bulk-moving items between iterations.
- Built-in workflows can update Status when items are added/closed/merged/reopened, auto-add matching issues/PRs from repositories, and auto-archive matching items. Default workflows set closed issues/PRs and merged PRs to Done.
- Project settings include title, description, README, visibility, default repository, repository links, access grants, templates, status updates, close/delete, and organization policies for base permissions/visibility/project enablement.

Implementation mapping:

- Next.js owns project list pages, dense project workspace, saved view tabs, filter query builder, table/board/roadmap renderers, editable cells, item side panel, view menu, field/settings pages, workflow forms, access controls, templates, status updates, and Insights charts.
- Rust API owns project authorization, query parsing, view state persistence, item sync with issues/PRs, draft issue conversion, custom field mutation, workflow execution, repository linking, template copy, chart aggregation, status updates, and audit events.
- Postgres stores projects, views, fields/options/iterations, items, item field values, draft issues, workflows, repositories links, access grants, charts, status updates, templates, events, and chart caches. SQS-style background jobs can process auto-add/archive workflows and chart cache refreshes. SES sends notification fanout only after draft issues become real issues or linked issue/PR changes require notifications.

## Repository Wiki

Status: inspected in iteration 21. Ever was attempted first but the active session failed with the existing `chrome-extension://` context error. Live visual evidence came from headless Chrome on the public `microsoft/TypeScript` wiki, plus scraped GitHub wiki docs for permissioned create/edit/sidebar/footer/history behavior.

Screenshots:

- `ralph/screenshots/inspect/wiki-typescript-home.png`
- `ralph/screenshots/inspect/wiki-typescript-pages.png`
- `ralph/screenshots/inspect/wiki-typescript-history.png`

Observed wiki reader UI:

- Wiki pages sit inside the standard repository workspace with the Wiki tab selected. Public readers who are signed out see the logged-out global header, repository breadcrumb, repository action buttons, and the repo tab bar.
- `/microsoft/TypeScript/wiki` renders `Home · microsoft/TypeScript Wiki`; GitHub also exposes the canonical page URL as `/wiki/Home`.
- The main page body renders Markdown through the same GitHub-flavored Markdown presentation as repository files, including heading anchor links and normal internal/external links.
- The right column contains an auto-generated wiki page navigation list. Rows include a page-title link, optional chevron button for lazy-loaded table of contents, and a `Show 63 more pages...` expansion control on large wikis.
- Custom sidebar content is rendered from `_Sidebar.*`; the inspected wiki shows grouped link sections such as User documentation, Debugging TypeScript, Contributing to TypeScript, Building Tools for TypeScript, FAQs, and The Main Repo.
- The page includes a `Clone this wiki locally` section with a read-only monospace input for `https://github.com/microsoft/TypeScript.wiki.git` and a copy-to-clipboard button.

Observed pages index:

- `/wiki/_pages` renders a `Pages · microsoft/TypeScript Wiki` route with a bordered list of wiki pages.
- Each row has a document icon, page-title link, and `Last updated` relative timestamp. The page list includes all wiki pages, not just the truncated sidebar subset.
- Signed-out/non-editor views do not show create/edit controls; docs confirm editors see a New Page control and Edit controls on page detail.

Observed history:

- `/wiki/_history` renders `History · TypeScript Wiki`.
- History rows use checkboxes labelled with commit-message text, commit message/title, author link/avatar, committed relative time, and revision identity.
- The page has Newer/Older pagination. Docs confirm selecting two revisions enables Compare Revisions, SHA links open a previous revision, and users with edit permission can revert changes from the compare view.

Docs-backed create/edit/sidebar/footer behavior:

- New Page opens a page editor. Users may choose an Edit mode/format other than Markdown; filenames determine page title and extension determines renderer.
- Save requires page content plus an Edit message commit message, then commits to the wiki Git repository. Invalid title characters are `\ / : * ? " < > |`.
- Edit uses the same editor and Save Page flow. The toolbar supports image insertion with URL and alt text. Wiki Markdown supports diagrams/math where GitHub Markdown supports them; footnotes and some MediaWiki constructs remain unsupported.
- Custom footer and sidebar are created by saving `_Footer.<extension>` or `_Sidebar.<extension>` through the same editor or by pushing those files to the wiki Git repository.
- Wiki access defaults to repository collaborators/editors. Repository settings can allow any signed-in user to edit a public repository wiki by disabling `Restrict editing to collaborators only`.

API examples:

```http
GET /api/repos/{owner}/{repo}/wiki/pages?per_page=50&page=1
Response: {
  "items": [
    { "slug": "Home", "title": "Home", "path": "Home.md", "lastUpdatedAt": "2026-04-08T17:36:23Z", "lastCommitSha": "abc1234" }
  ],
  "total": 84,
  "page": 1,
  "pageSize": 50
}
Error: { "error": { "code": "wiki_disabled", "message": "Wiki is disabled for this repository" } }
```

```http
GET /api/repos/{owner}/{repo}/wiki/pages/{slug}
Response: {
  "slug": "Home",
  "title": "Home",
  "path": "Home.md",
  "format": "markdown",
  "body": "# Home\n...",
  "renderedHtml": "<h1 id=\"home\">Home</h1>",
  "revision": { "sha": "abc1234", "message": "Updated Home", "author": { "username": "mona" }, "committedAt": "2026-04-08T17:36:23Z" },
  "sidebarHtml": "<h2>User documentation</h2>",
  "footerHtml": null
}
Error: { "error": { "code": "not_found", "message": "Wiki page not found" } }
```

```http
PUT /api/repos/{owner}/{repo}/wiki/pages/{slug}
Request: { "title": "Install Guide", "body": "# Install", "format": "markdown", "message": "Add install guide" }
Response: { "slug": "Install-Guide", "path": "Install-Guide.md", "commitSha": "def5678", "htmlUrl": "/acme/widgets/wiki/Install-Guide" }
Error: { "error": { "code": "invalid_title", "message": "Wiki page titles cannot contain \\\\, /, :, *, ?, quote, <, >, or |" } }
```

```http
GET /api/repos/{owner}/{repo}/wiki/history?page=1&pageSize=30
Response: {
  "items": [
    { "sha": "abc1234", "message": "Updated FAQ", "author": { "username": "mona" }, "committedAt": "2026-04-08T17:36:23Z", "changedPages": ["FAQ.md"] }
  ],
  "total": 340,
  "page": 1,
  "pageSize": 30
}
Error: { "error": { "code": "forbidden", "message": "You do not have access to this wiki" } }
```

```http
POST /api/repos/{owner}/{repo}/wiki/compare
Request: { "baseSha": "abc1234", "headSha": "def5678" }
Response: { "baseSha": "abc1234", "headSha": "def5678", "files": [{ "path": "Home.md", "status": "modified", "patch": "@@ -1 +1 @@" }] }
Error: { "error": { "code": "invalid_revision", "message": "Revision not found" } }
```

Implementation mapping:

- Next.js owns wiki route rendering, page/sidebar/footer Markdown display, page index, editor/preview UI, image insert dialog, history table, compare view, revert confirmation, clone URL copy, and disabled/permission states.
- Rust API owns wiki feature flag checks, repository permission checks, wiki Git repository creation, read/write through Git objects, Markdown rendering/cache invalidation, title/filename validation, history/diff/revert endpoints, search indexing, and audit/activity events.
- Store wiki content as a Git repository namespace/object store tied to the main repository, with Postgres metadata/cache rows for page lookup, rendered HTML, revisions, and search. S3 is only needed for attached/uploaded assets; normal wiki content remains Git-backed.

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

## Personal Settings And Developer Credentials

Status: inspected after notifications with live Ever access. Evidence came from `ever snapshot` and screenshots on `/settings/profile`, `/settings/notifications`, `/settings/tokens`, `/settings/personal-access-tokens/new`, `/settings/keys`, `/settings/security`, `/settings/sessions`, and `/settings/security-log`.

Screenshots:

- `ralph/screenshots/inspect/settings-profile.jpg`
- `ralph/screenshots/inspect/settings-notifications.jpg`
- `ralph/screenshots/inspect/settings-notifications-channel-menu.jpg`
- `ralph/screenshots/inspect/settings-tokens-classic.jpg`
- `ralph/screenshots/inspect/settings-token-new-sudo.jpg`
- `ralph/screenshots/inspect/settings-ssh-gpg-keys.jpg`
- `ralph/screenshots/inspect/settings-password-authentication.jpg`
- `ralph/screenshots/inspect/settings-sessions.jpg`
- `ralph/screenshots/inspect/settings-security-log.jpg`
- `ralph/screenshots/inspect/settings-security-log-filters.jpg`

Settings shell:

- Personal settings use the signed-in app header plus a two-column settings layout: persistent left sidebar grouped into account, access, code/planning/automation, security, integrations, and archives; the right pane is a Turbo-frame-style content area with forms/cards.
- Context switcher at the top of the sidebar lets users switch between personal, organization, and enterprise settings. The clone should keep organization/enterprise entries only when the user actually belongs to those owners.
- Billing, Copilot, Codespaces, Models, Sponsors, and premium analytics are out of MVP scope. Keep routes absent or render a low-priority disabled state, not misleading billing UI.

Public profile settings:

- `/settings/profile` exposes optional fields for display name, public email, bio, pronouns, website URL, up to four social URLs, company, location, local-time display/time zone, ORCID connection, profile picture upload/remove/reset, private profile/activity privacy, private contribution count, PRO badge, achievements visibility, jobs/hireable status, and preferred spoken language.
- The form has multiple independent save buttons (`Update profile`, `Update preferences`, `Save jobs profile`) rather than one global save. Optional fields can be cleared at any time.
- opengithub should include profile identity fields, avatar upload, private profile/activity visibility, achievements visibility, and contribution privacy. ORCID, jobs profile, PRO badge, and GitHub Developer Program are low priority or out of scope.

Notification preferences:

- `/settings/notifications` sets default email address, custom routing link, subscriptions for Watching and Participating/@mentions/custom, email-update categories, ignored repositories, and system channels for Actions, Dependabot alerts, email digest, security campaign emails, and agent sessions.
- Channel selectors are select-panel dialogs with selectable options such as On GitHub, Email, and CLI plus Cancel/Save. Observed Watching preferences were On GitHub + Email.
- MVP should implement web/email channels, default email selection, Watching and Participating channel preferences, Actions notification preferences, and ignored repository links. Dependabot/security-campaign/agent-session categories can be placeholders unless the corresponding products exist.

Developer credentials:

- `/settings/tokens` is under Developer Settings and has GitHub Apps, OAuth Apps, and Personal access tokens navigation. The token page shows a `Generate new token` details menu with Fine-grained repo-scoped and classic/general options.
- Existing token rows show token name, scopes, last-used state, expiration state, and a Delete details dialog. Token secret values are never shown after creation.
- Visiting `/settings/personal-access-tokens/new?...` triggered sudo mode before the fine-grained token form. The sudo screen supports passkey, GitHub Mobile, authenticator app, and email code options, and preserves prefilled token URL parameters (`name`, `description`, `contents=read`) as hidden state.
- For opengithub, build personal access tokens as the core credential for Git over HTTPS, REST API, and package registry auth. Prefer fine-grained tokens first: name, description, expiration, resource owner, repository access, permission matrix, generated secret shown once, revoke/delete, and audit events. Classic tokens can be a compatibility fallback if needed for package/checks gaps.

SSH/GPG keys and signing:

- `/settings/keys` lists SSH authentication keys with title, SHA256 fingerprint, added date, added-by source, last-used status, and read/write access. Each row has a Delete dialog.
- The same page has a New SSH key CTA, an empty GPG keys section with New GPG key CTA, and Vigilant mode checkbox to flag unsigned commits as unverified.
- Key creation requires title, public key, and type (`authentication` or `signing`) per docs; the same public key must be uploaded twice if used for both auth and signing. opengithub should validate key type/fingerprint uniqueness and store only public keys/fingerprints.
- SSH Git transport remains a later feature. Until then, key management can power commit signature metadata and future SSH enablement while clone/push instructions prefer HTTPS + PAT.

Password/authentication, sessions, and security log:

- `/settings/security` is "Password and authentication". GitHub shows password change, passkeys, connected Google/Apple accounts, two-factor auth methods, preferred 2FA method, authenticator/SMS/GitHub Mobile/security keys, and recovery codes.
- opengithub stack is Google OAuth only. Do not build password change, Apple, passkeys, SMS, or recovery codes unless auth mode changes. Build connected Google account display, session management, sudo-mode reauthentication for sensitive credential actions, and security/audit log coverage.
- `/settings/sessions` lists web sessions with browser/device icon, coarse location, IP, active/stale state, last accessed date, country seen, Details links, and separate GitHub Mobile sessions with Revoke. MVP should support web sessions only, with revoke for non-current sessions and current-session marker.
- `/settings/security-log` lists recent audit events with actor, action, target, integration/app, IP, location, relative timestamp, expandable detail rows, filter menu, text search, and Export menu with JSON/CSV. Built-in filters observed: Yesterday's activity, Repository management, Billing updates, Copilot activity, and Personal access token activity. opengithub should include filters relevant to supported products and omit billing/Copilot filters.

Implementation mapping:

- Next.js owns the settings shell, profile forms, notification preference panels, token/key forms, session list, sudo-mode interstitial, audit log table/filter/export UI, and destructive confirmation dialogs.
- Rust API owns authoritative writes, sudo-mode token validation, token hashing, session revocation, SSH/GPG key validation, notification preference persistence, audit-event append, and CSV/JSON security-log export.
- Postgres stores user profile fields, email addresses, notification preferences, PAT metadata/hashes, SSH/GPG public keys, web sessions, sudo grants, and audit events. S3 stores avatar images. SES sends notification emails after verified domain setup.

## Organization And Team Administration

Status: inspected after personal settings with live Ever access. Evidence came from `ever snapshot`, screenshots on `/organizations/new`, `/organizations/namuh-eng/settings/profile`, `/orgs/namuh-eng/people`, `/orgs/namuh-eng/teams`, `/orgs/namuh-eng/teams/new`, `/organizations/namuh-eng/settings/member_privileges`, docs for organization invitations/teams/repository policies, and non-destructive `gh api` checks for `namuh-eng`.

Screenshots:

- `ralph/screenshots/inspect/org-create-plan-picker.jpg`
- `ralph/screenshots/inspect/org-create-form.jpg`
- `ralph/screenshots/inspect/org-settings-profile.jpg`
- `ralph/screenshots/inspect/org-people-members.jpg`
- `ralph/screenshots/inspect/org-invite-member-dialog.jpg`
- `ralph/screenshots/inspect/org-teams-empty.jpg`
- `ralph/screenshots/inspect/org-team-new-form.jpg`
- `ralph/screenshots/inspect/org-member-privileges.jpg`

Organization creation:

- `/organizations/new` first shows a three-column plan picker. Free, Team, and Enterprise cards list feature bullets in disclosure rows. Free has a direct `Create a free organization` CTA; Team uses a dropdown-style `Continue with Team`; Enterprise offers trial/contact-sales CTAs.
- The free organization setup form is a narrow centered form titled `Tell us about your organization`. Required fields are organization name, contact email, ownership type, captcha, terms checkbox, and `Next`.
- Organization name normalizes spaces to hyphens in the account URL preview. Tested value `open github labs` normalized to `open-github-labs` and immediately showed reserved-keyword validation. The Rust API must reserve terms such as `github`, `admin`, `settings`, and future opengithub system slugs server-side.
- Ownership radio options are `My personal account` and `A business or institution`. Choosing business reveals company name. GitHub requires captcha and terms acceptance; opengithub can use Google OAuth trust plus rate limits instead of captcha unless abuse requires a provider later.

Organization settings shell and profile:

- Organization settings use the same signed-in header plus organization top navigation and a dense two-column settings layout. Left nav groups include Organization, Access, Code/planning/automation, Security, Third-party Access, Integrations, Archive, and Developer settings.
- Profile settings expose display name, public email, description, URL, up to four social account links, searchable location selector, billing/contact fields, rename organization, archive, and delete danger-zone actions.
- Non-destructive live API check for `namuh-eng` showed display name `namuh`, email `founders@namuh.co`, blog `namuh.co`, default repository permission `read`, repository creation enabled, public/private repository creation enabled, two-factor requirement disabled, two public members, and no teams.

People and invitations:

- `/orgs/{org}/people` has tabs for Members, Outside collaborators, Pending collaborators, Invitations, Failed invitations, and Security Managers. The page has a member search box, disabled bulk action button until selection, Export dropdown for JSON/CSV, Invite member button, role help link, and a member table.
- Member rows include checkbox, avatar, display name, username, 2FA state badge, public/private membership visibility menu, organization role, teams count, custom roles count, row action menu, and membership source.
- Invite member opens a dialog with username/email autocomplete and submit button. Docs add that invitations send an email link, expire after 7 days, can be retried/canceled, and are rate-limited to 50 per 24h for new orgs or 500 per 24h for older/paid orgs. Billing/license checks are out of scope for opengithub.
- Role changes and removals open confirmation dialogs. Owner continuity must be protected: do not allow removing/demoting the final organization owner.

Teams:

- `/orgs/{org}/teams` renders an onboarding empty state when no teams exist. It explains flexible repository access, request-to-join teams, and team mentions, with `New team` and `Learn more` CTAs.
- `/orgs/{org}/teams/new` form has team name, description, parent team selector, visibility radio group, notification radio group, and Create team. Visible is recommended and mentionable by every member; Secret can only be seen by members and may not be nested. Notifications Enabled means members are notified when the team is mentioned.
- Docs confirm nested team permissions cascade from parent to child teams, outside collaborators cannot belong to teams, teams can be requested for review, and team maintainers can manage team membership/settings within their scope.

Member privileges and organization policy:

- `/organizations/{org}/settings/member_privileges` is a long settings page of independent cards/forms. Observed cards include Base permissions, Repository creation, Repository forking, Repository discussions, Projects base permissions, Pages creation, App access requests, repository visibility changes, delete/transfer controls, issue deletion, and team creation.
- Base permissions are selected from an action menu with None, Read, Write, and Admin options, followed by confirmation. This setting applies to all organization members but excludes outside collaborators; explicit higher repository/team permissions override it.
- Repository creation uses independent checkboxes for public/private creation and a Save button. Public creation may be disabled by higher-level policy. Outside collaborators can never create organization repositories.
- Organization-level policy must feed repository creation, repository settings, Git push, PR mergeability, Pages publishing, package visibility, and Actions permissions. UI-only enforcement is insufficient.

Implementation mapping:

- Next.js owns `/organizations/new`, `/orgs/{org}/people`, `/orgs/{org}/teams`, `/orgs/{org}/teams/new`, `/organizations/{org}/settings/profile`, `/organizations/{org}/settings/member_privileges`, invite dialogs, role dialogs, team forms, and settings sidebars.
- Rust API owns organization slug validation, owner/member permission checks, invitation email generation, team nesting constraints, membership visibility/role updates, base permission policy, repository creation policy, policy audit events, and organization settings writes.
- Postgres stores organizations, organization_memberships, organization_invitations, teams, team_memberships, team_repository_permissions, organization_policy_settings, organization_social_accounts, organization_audit_events, and organization_verified_domains. SES sends organization invite emails. S3 stores organization avatars. Cloudflare is used for verified-domain checks where domain automation is required.

## Data Models

Initial model set inferred from docs/OpenAPI:

- `users`: id, username, display_name, email, avatar_url, bio, pronouns, company, location, website_url, private_profile, show_private_contribution_count, achievements_enabled, display_local_time, time_zone, preferred_language, created_at, updated_at.
- `auth_accounts`: id, user_id, provider, provider_account_id, access_token_hash, refresh_token_hash, expires_at.
- `sessions`: id, user_id, token_hash, expires_at, ip_address, user_agent, browser_name, os_name, device_name, country_code, city, last_seen_at, revoked_at, created_at.
- `user_email_addresses`: id, user_id, email, verified_at, primary, public, notification_default, created_at, updated_at.
- `user_social_accounts`: id, user_id, provider_key, url, position, created_at, updated_at.
- `user_avatars`: id, user_id, storage_key, content_type, size_bytes, uploaded_at, active.
- `sudo_grants`: id, user_id, session_id, method, granted_at, expires_at, ip_address.
- `personal_access_tokens`: id, user_id, token_hash, token_prefix, name, description, token_type, resource_owner_type, resource_owner_id, repository_selection, permissions_json, scopes_json, expires_at, last_used_at, revoked_at, created_at.
- `personal_access_token_repositories`: id, token_id, repository_id, created_at.
- `ssh_keys`: id, user_id, title, key_type, public_key, fingerprint_sha256, added_by, last_used_at, read_write, created_at, revoked_at.
- `gpg_keys`: id, user_id, public_key, fingerprint, key_id, emails_json, verified, created_at, revoked_at.
- `security_audit_events`: id, actor_id, action, subject_type, subject_id, target_user_id, repository_id, app_name, oauth_app_id, ip_address, country_code, city, user_agent, metadata_json, created_at.
- `repositories`: id, owner_type, owner_id, name, full_name, description, visibility, default_branch, has_issues, has_projects, has_wiki, has_discussions, is_template, archived, created_at, updated_at.
- `repository_git_refs`: id, repository_id, ref_type, name, target_sha, created_at, updated_at.
- `commits`: id, repository_id, sha, tree_sha, parent_shas, author_name, author_email, committer_name, committer_email, message, committed_at.
- `commit_signature_verifications`: id, repository_id, commit_sha, verified, reason, signature_type, signer_user_id, key_fingerprint, verified_at, raw_payload_hash.
- `commit_status_summaries`: id, repository_id, commit_sha, total_count, successful_count, failed_count, skipped_count, pending_count, conclusion, updated_at.
- `commit_file_changes`: id, repository_id, commit_sha, path, previous_path, status, additions, deletions, patch_hash, binary, generated, created_at.
- `branch_activity_snapshots`: id, repository_id, ref_name, latest_commit_sha, latest_actor_id, active_state, ahead_count, behind_count, linked_pull_request_id, computed_at.
- `repository_insight_snapshots`: id, repository_id, period_key, starts_at, ends_at, active_pull_requests, active_issues, merged_pull_requests, open_pull_requests, closed_issues, new_issues, authors_count, default_branch_commits, all_branch_commits, changed_files, additions, deletions, activity_json, computed_at.
- `repository_contributors_weekly`: id, repository_id, user_id, author_email_hash, week_start, commit_count, additions, deletions, default_branch_only, computed_at.
- `repository_traffic_daily`: id, repository_id, date, clones_count, clones_unique, views_count, views_unique, computed_at.
- `repository_referrers_daily`: id, repository_id, date, referrer, views_count, uniques_count, computed_at.
- `repository_popular_content_daily`: id, repository_id, date, path, title, views_count, uniques_count, computed_at.
- `forks`: id, source_repository_id, fork_repository_id, forked_by_id, created_at, synced_at.
- `repository_network_forks`: id, repository_id, fork_repository_id, latest_push_at, latest_commit_sha, active_state, stars_count, forks_count, issues_count, pull_requests_count, computed_at.
- `dependency_manifests`: id, repository_id, path, ecosystem, manifest_hash, parsed_at, parser_version.
- `dependency_packages`: id, ecosystem, package_name, normalized_name, latest_version, metadata_json, updated_at.
- `repository_dependencies`: id, repository_id, manifest_id, package_id, package_name, version, relationship, scope, license, detected_at, resolved_at.
- `repository_dependents`: id, package_id, dependent_repository_id, dependent_package_id, detected_at, stars_count, forks_count, owner_id.
- `sbom_exports`: id, repository_id, actor_id, format, status, storage_key, error_message, created_at, completed_at, expires_at.
- `repository_security_feature_settings`: id, repository_id, dependabot_alerts_enabled, code_scanning_enabled, secret_scanning_enabled, push_protection_enabled, private_vulnerability_reporting_enabled, updated_by_id, updated_at.
- `repository_security_policies`: id, repository_id, path, commit_sha, rendered_html, rendered_at, updated_by_id, updated_at.
- `repository_security_advisories`: id, repository_id, ghsa_id, cve_id, title, description, details, state, severity, cvss_vector, cvss_score, cwe_ids_json, package_ecosystem, package_name, affected_versions, patched_versions, author_id, published_at, created_at, updated_at.
- `repository_security_advisory_credits`: id, advisory_id, user_id, email, credit_type, state, created_at, updated_at.
- `dependabot_alerts`: id, repository_id, manifest_id, package_id, advisory_id, number, state, dependency_scope, vulnerable_requirements, fixed_in_version, severity, priority_score, dismissed_reason, dismissed_comment, dismissed_by_id, dismissed_at, created_at, updated_at.
- `code_scanning_runs`: id, repository_id, tool_name, tool_version, ref, commit_sha, upload_storage_key, status, uploaded_by_id, started_at, completed_at.
- `code_scanning_alerts`: id, repository_id, run_id, rule_id, tool_name, fingerprint, state, severity, security_severity, path, start_line, end_line, message, details_markdown, remediation_markdown, linked_issue_id, dismissed_reason, dismissed_comment, dismissed_by_id, created_at, updated_at.
- `secret_scanning_alerts`: id, repository_id, number, state, provider, secret_type, secret_fingerprint, validity, resolution, bypassed, path, start_line, commit_sha, pushed_by_id, assignee_id, resolved_by_id, resolved_at, created_at, updated_at.
- `security_alert_events`: id, repository_id, alert_type, alert_id, actor_id, event_type, payload_json, created_at.
- `discussion_category_sections`: id, repository_id, emoji, name, position, created_by_id, created_at, updated_at.
- `discussion_categories`: id, repository_id, section_id, slug, emoji, name, description, format, answers_enabled, position, created_by_id, created_at, updated_at.
- `discussion_category_forms`: id, repository_id, category_id, path, commit_sha, schema_json, valid, validation_errors_json, parsed_at.
- `discussions`: id, repository_id, number, category_id, title, body, rendered_html, state, answer_state, author_id, locked, locked_reason, pinned_global, pinned_category, created_at, updated_at, closed_at.
- `discussion_comments`: id, discussion_id, parent_comment_id, author_id, body, rendered_html, created_at, updated_at, edited_at, deleted_at.
- `discussion_answers`: id, discussion_id, comment_id, marked_by_id, marked_at, unmarked_at.
- `discussion_votes`: id, discussion_id, comment_id, user_id, vote_type, created_at, updated_at.
- `discussion_labels`: discussion_id, label_id, created_at.
- `discussion_events`: id, discussion_id, actor_id, event_type, payload_json, created_at.
- `discussion_pins`: id, discussion_id, pin_scope, category_id, title_override, body_override, position, created_by_id, created_at, updated_at.
- `discussion_polls`: id, discussion_id, question, allow_vote_change, closes_at, created_at, updated_at.
- `discussion_poll_options`: id, poll_id, body, position, created_at.
- `discussion_poll_votes`: id, poll_id, option_id, user_id, created_at, updated_at.
- `projects`: id, owner_type, owner_id, number, title, short_description, readme_markdown, visibility, state, default_repository_id, template_source_project_id, is_template, created_by_id, created_at, updated_at, closed_at, deleted_at.
- `project_repositories`: id, project_id, repository_id, link_type, added_by_id, created_at.
- `project_views`: id, project_id, name, layout, position, filter_query, group_by_field_id, slice_by_field_id, sort_json, visible_fields_json, settings_json, created_by_id, updated_at.
- `project_fields`: id, project_id, name, field_type, data_type, built_in_key, position, settings_json, created_by_id, created_at, updated_at, deleted_at.
- `project_field_options`: id, field_id, name, color, description, position, created_at, updated_at.
- `project_iterations`: id, field_id, name, starts_on, ends_on, duration_days, position, created_at, updated_at.
- `project_iteration_breaks`: id, field_id, name, starts_on, ends_on, position, created_at, updated_at.
- `project_items`: id, project_id, item_type, issue_id, pull_request_id, draft_issue_id, repository_id, position, archived_at, added_by_id, created_at, updated_at.
- `draft_issues`: id, project_id, title, body_markdown, converted_issue_id, created_by_id, created_at, updated_at, converted_at.
- `project_item_field_values`: id, project_item_id, field_id, text_value, number_value, date_value, option_id, iteration_id, user_id, label_id, milestone_id, repository_id, updated_by_id, updated_at.
- `project_workflows`: id, project_id, name, trigger_type, enabled, conditions_json, actions_json, created_by_id, updated_at.
- `project_workflow_execution_logs`: id, workflow_id, project_item_id, source_event_type, status, error_message, executed_at.
- `wiki_repositories`: id, repository_id, git_namespace, default_branch, public_editing_enabled, file_count, created_at, updated_at.
- `wiki_pages`: id, repository_id, slug, title, path, format, latest_commit_sha, latest_author_id, last_updated_at, deleted_at.
- `wiki_page_revisions`: id, repository_id, page_id, commit_sha, path, title, format, body_hash, rendered_html_hash, author_id, message, committed_at.
- `wiki_git_commits`: id, repository_id, sha, parent_shas, author_name, author_email, committer_name, committer_email, message, committed_at.
- `wiki_diff_cache`: id, repository_id, base_sha, head_sha, diff_json, created_at, expires_at.
- `wiki_revert_events`: id, repository_id, actor_id, base_sha, head_sha, revert_commit_sha, created_at.
- `project_access_grants`: id, project_id, principal_type, principal_id, role, granted_by_id, created_at, updated_at.
- `project_status_updates`: id, project_id, status, starts_on, target_on, body_markdown, author_id, created_at, updated_at.
- `project_charts`: id, project_id, name, chart_type, filter_query, x_field_id, y_field_id, group_by_field_id, range_json, position, created_by_id, created_at, updated_at.
- `project_chart_series_cache`: id, chart_id, cache_key, data_json, computed_at, expires_at.
- `project_events`: id, project_id, actor_id, event_type, subject_type, subject_id, payload_json, created_at.
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
- `organizations`: id, slug, display_name, description, avatar_url, public_email, website_url, location, billing_email, terms_of_service_type, company_name, default_repository_permission, members_can_create_public_repositories, members_can_create_private_repositories, allow_private_repository_forking, readers_can_create_discussions, members_can_create_teams, archived_at, created_at, updated_at.
- `organization_social_accounts`: id, organization_id, provider_key, url, position, created_at, updated_at.
- `organization_verified_domains`: id, organization_id, domain, verified_at, verification_token_hash, created_at.
- `organization_memberships`: id, organization_id, user_id, role, public, state, invited_by_id, created_at, updated_at.
- `organization_invitations`: id, organization_id, invitee_user_id, invitee_email, invited_by_id, role, team_ids_json, token_hash, state, expires_at, created_at, accepted_at, canceled_at.
- `organization_policy_settings`: id, organization_id, setting_key, value_json, enforced_by, updated_by_id, updated_at.
- `organization_audit_events`: id, organization_id, actor_id, action, subject_type, subject_id, metadata_json, ip_address, user_agent, created_at.
- `teams`: id, organization_id, slug, name, description, privacy, parent_team_id, notification_setting, created_by_id, created_at, updated_at, deleted_at.
- `team_memberships`: id, team_id, user_id, role, state, added_by_id, created_at, updated_at.
- `team_repository_permissions`: id, team_id, repository_id, permission, inherited_from_team_id, created_at, updated_at.
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

```http
GET /api/settings/profile
Response: {
  "username": "mona",
  "name": "Mona Lisa",
  "publicEmail": "mona@example.com",
  "bio": "Building tools",
  "pronouns": "she/her",
  "websiteUrl": "https://example.com",
  "socialAccounts": [{ "provider": "generic", "url": "https://social.example/mona", "position": 1 }],
  "company": "Octo Org",
  "location": "San Francisco, CA",
  "privateProfile": false,
  "showPrivateContributionCount": true,
  "achievementsEnabled": true,
  "avatarUrl": "https://..."
}
Error: { "error": { "code": "unauthorized", "message": "Authentication required" } }
```

```http
PATCH /api/settings/profile
Request: {
  "name": "Mona Lisa",
  "bio": "Building tools",
  "pronouns": "she/her",
  "websiteUrl": "https://example.com",
  "company": "Octo Org",
  "location": "San Francisco, CA",
  "privateProfile": false,
  "achievementsEnabled": true
}
Response: { "username": "mona", "updated": true }
Error: { "error": { "code": "validation_failed", "message": "Profile URL is invalid" } }
```

```http
GET /api/settings/notification-preferences
Response: {
  "defaultEmail": "mona@example.com",
  "watching": { "channels": ["web", "email"] },
  "participating": { "channels": ["web", "email"] },
  "emailUpdates": ["reviews", "pushes", "comments"],
  "actions": { "channels": ["email"], "failedWorkflowsOnly": true }
}
Error: { "error": { "code": "unauthorized", "message": "Authentication required" } }
```

```http
PATCH /api/settings/notification-preferences
Request: { "watching": { "channels": ["web"] }, "participating": { "channels": ["web", "email"] } }
Response: { "updated": true }
Error: { "error": { "code": "validation_failed", "message": "Unsupported notification channel" } }
```

```http
GET /api/settings/tokens
Response: {
  "items": [{
    "id": "uuid",
    "name": "deploy token",
    "type": "fine_grained",
    "resourceOwner": "mona",
    "repositorySelection": "selected",
    "permissions": { "contents": "write", "pull_requests": "write" },
    "lastUsedAt": null,
    "expiresAt": "2026-05-30T00:00:00Z"
  }],
  "total": 1,
  "page": 1,
  "pageSize": 50
}
Error: { "error": { "code": "unauthorized", "message": "Authentication required" } }
```

```http
POST /api/settings/tokens
Request: {
  "sudoToken": "opaque-sudo-grant",
  "name": "deploy token",
  "description": "CI deploys",
  "expiresInDays": 30,
  "resourceOwner": "mona",
  "repositorySelection": "selected",
  "repositories": ["mona/app"],
  "permissions": { "contents": "write", "pull_requests": "write" }
}
Response: { "id": "uuid", "token": "ogh_...", "tokenPrefix": "ogh_", "expiresAt": "2026-05-30T00:00:00Z" }
Error: { "error": { "code": "sudo_required", "message": "Confirm access before creating a token" } }
```

```http
GET /api/settings/keys
Response: {
  "sshKeys": [{ "id": "uuid", "title": "work laptop", "keyType": "authentication", "fingerprintSha256": "SHA256:abc...", "lastUsedAt": null, "readWrite": true }],
  "gpgKeys": [],
  "vigilantMode": false
}
Error: { "error": { "code": "unauthorized", "message": "Authentication required" } }
```

```http
POST /api/settings/ssh-keys
Request: { "title": "work laptop", "keyType": "authentication", "publicKey": "ssh-ed25519 AAAA..." }
Response: { "id": "uuid", "title": "work laptop", "fingerprintSha256": "SHA256:abc..." }
Error: { "error": { "code": "validation_failed", "message": "This SSH key is already in use" } }
```

```http
GET /api/settings/sessions
Response: {
  "items": [{
    "id": "uuid",
    "current": true,
    "browser": "Chrome",
    "os": "macOS",
    "ipAddress": "203.0.113.10",
    "location": "Seoul, KR",
    "state": "active",
    "lastSeenAt": "2026-04-30T09:00:00Z"
  }]
}
Error: { "error": { "code": "unauthorized", "message": "Authentication required" } }
```

```http
GET /api/settings/security-log?q=action:personal_access_token&page=1&pageSize=50
Response: {
  "items": [{
    "id": "uuid",
    "actor": { "username": "mona" },
    "action": "personal_access_token.create",
    "target": "deploy token",
    "ipAddress": "203.0.113.10",
    "location": "Seoul, KR",
    "createdAt": "2026-04-30T09:00:00Z",
    "metadata": { "tokenType": "fine_grained" }
  }],
  "total": 1,
  "page": 1,
  "pageSize": 50
}
Error: { "error": { "code": "invalid_query", "message": "Unsupported audit log qualifier" } }
```

```http
GET /api/orgs/{org}
Response: {
  "id": "uuid",
  "login": "namuh-eng",
  "displayName": "namuh",
  "email": "founders@namuh.co",
  "websiteUrl": "https://namuh.co",
  "publicRepos": 6,
  "privateRepos": 2,
  "viewerRole": "owner",
  "settings": { "defaultRepositoryPermission": "read", "membersCanCreatePublicRepositories": true, "membersCanCreatePrivateRepositories": true }
}
Error: { "error": { "code": "not_found", "message": "Organization not found" } }
```

```http
POST /api/orgs
Request: { "slug": "open-github-labs", "displayName": "Open GitHub Labs", "contactEmail": "team@example.com", "termsOfServiceType": "standard", "companyName": null }
Response: { "id": "uuid", "login": "open-github-labs", "displayName": "Open GitHub Labs", "viewerRole": "owner" }
Error: { "error": { "code": "reserved_slug", "message": "This organization name contains a reserved keyword" } }
```

```http
GET /api/orgs/{org}/members?q=jae&role=owner&page=1&pageSize=50
Response: {
  "items": [{
    "user": { "id": "uuid", "username": "jaeyunha", "displayName": "Jaeyun Ha", "avatarUrl": "https://..." },
    "role": "owner",
    "public": true,
    "twoFactorEnabled": true,
    "teamsCount": 0,
    "customRolesCount": 0,
    "membershipSource": "direct"
  }],
  "total": 2,
  "page": 1,
  "pageSize": 50
}
Error: { "error": { "code": "forbidden", "message": "Organization owner access required" } }
```

```http
POST /api/orgs/{org}/invitations
Request: { "identifier": "teammate@example.com", "role": "direct_member", "teamIds": ["uuid"] }
Response: { "id": "uuid", "state": "pending", "expiresAt": "2026-05-07T00:00:00Z" }
Error: { "error": { "code": "rate_limited", "message": "Organization invitation limit reached" } }
```

```http
PATCH /api/orgs/{org}/members/{username}
Request: { "role": "admin", "public": false }
Response: { "username": "mona", "role": "admin", "public": false }
Error: { "error": { "code": "last_owner", "message": "An organization must keep at least one owner" } }
```

```http
GET /api/orgs/{org}/teams?page=1&pageSize=50
Response: {
  "items": [{ "id": "uuid", "slug": "platform", "name": "Platform", "privacy": "closed", "membersCount": 5, "reposCount": 8, "parentTeam": null }],
  "total": 1,
  "page": 1,
  "pageSize": 50
}
Error: { "error": { "code": "forbidden", "message": "Organization member access required" } }
```

```http
POST /api/orgs/{org}/teams
Request: { "name": "Platform", "description": "Core platform maintainers", "parentTeamId": null, "privacy": "closed", "notificationSetting": "notifications_enabled" }
Response: { "id": "uuid", "slug": "platform", "name": "Platform", "privacy": "closed", "notificationSetting": "notifications_enabled" }
Error: { "error": { "code": "validation_failed", "message": "Secret teams cannot be nested" } }
```

```http
GET /api/orgs/{org}/settings/member-privileges
Response: {
  "defaultRepositoryPermission": "read",
  "membersCanCreatePublicRepositories": true,
  "membersCanCreatePrivateRepositories": true,
  "allowPrivateRepositoryForking": false,
  "readersCanCreateDiscussions": true,
  "membersCanCreateTeams": false,
  "projectsBasePermission": "write",
  "pagesCreation": { "public": true, "private": false }
}
Error: { "error": { "code": "forbidden", "message": "Organization owner access required" } }
```

```http
PATCH /api/orgs/{org}/settings/member-privileges
Request: { "defaultRepositoryPermission": "read", "membersCanCreatePublicRepositories": false, "membersCanCreatePrivateRepositories": true }
Response: { "updated": true }
Error: { "error": { "code": "policy_locked", "message": "This setting is enforced by a higher-level policy" } }
```

```http
GET /api/repos/{owner}/{repo}/security/dependabot-alerts?q=is:open scope:development&page=1&pageSize=25
Response: {
  "items": [{
    "number": 42,
    "package": { "ecosystem": "npm", "name": "minimist" },
    "manifestPath": "package-lock.json",
    "scope": "development",
    "severity": "high",
    "state": "open",
    "fixedInVersion": "1.2.8",
    "advisory": { "ghsaId": "GHSA-xxxx-yyyy-zzzz", "summary": "Prototype pollution" }
  }],
  "total": 1,
  "page": 1,
  "pageSize": 25
}
Error: { "error": { "code": "dependabot_alerts_disabled", "message": "Dependabot alerts are disabled for this repository" }, "status": 422 }

PATCH /api/repos/{owner}/{repo}/security/dependabot-alerts/{number}
Request: { "state": "dismissed", "dismissedReason": "tolerable_risk", "dismissedComment": "Dev-only dependency" }
Response: { "number": 42, "state": "dismissed", "dismissedReason": "tolerable_risk" }
Error: { "error": { "code": "forbidden", "message": "Write access required" }, "status": 403 }
```

```http
GET /api/repos/{owner}/{repo}/security/code-scanning-alerts?q=is:open branch:main severity:high&page=1&pageSize=25
Response: {
  "items": [{
    "number": 7,
    "ruleId": "js/sql-injection",
    "tool": "CodeQL",
    "severity": "high",
    "state": "open",
    "path": "src/db.ts",
    "startLine": 42,
    "message": "Database query built from user-controlled sources",
    "linkedIssue": null
  }],
  "total": 1,
  "page": 1,
  "pageSize": 25
}
Error: { "error": { "code": "code_scanning_not_enabled", "message": "Code scanning is not enabled" }, "status": 422 }

POST /api/repos/{owner}/{repo}/security/code-scanning/sarif
Request: { "commitSha": "abc123", "ref": "refs/heads/main", "toolName": "CodeQL", "sarifStorageKey": "uploads/sarif/uuid.sarif" }
Response: { "runId": "uuid", "status": "queued" }
Error: { "error": { "code": "invalid_sarif", "message": "SARIF file exceeds supported result limits" }, "status": 422 }
```

```http
GET /api/repos/{owner}/{repo}/security/secret-scanning-alerts?q=is:open provider:github validity:active&page=1&pageSize=25
Response: {
  "items": [{
    "number": 3,
    "state": "open",
    "provider": "github",
    "secretType": "github_personal_access_token",
    "validity": "active",
    "path": ".env",
    "startLine": 12,
    "createdAt": "2026-04-30T09:00:00Z"
  }],
  "total": 1,
  "page": 1,
  "pageSize": 25
}
Error: { "error": { "code": "secret_scanning_not_enabled", "message": "Secret scanning is not enabled" }, "status": 422 }
```

```http
GET /api/repos/{owner}/{repo}/security/advisories?page=1&pageSize=25
Response: {
  "items": [{ "ghsaId": "GHSA-q4gf-8mx6-v5v3", "title": "Denial of Service with Server Components", "state": "published", "severity": "high", "publishedAt": "2026-04-09T00:00:00Z" }],
  "total": 37,
  "page": 1,
  "pageSize": 25
}
Error: { "error": { "code": "not_found", "message": "Repository not found" }, "status": 404 }

POST /api/repos/{owner}/{repo}/security/advisories
Request: { "title": "Package allows unsafe input", "severity": "high", "description": "Summary", "details": "Markdown details", "package": { "ecosystem": "npm", "name": "demo" }, "affectedVersions": "<1.2.3", "patchedVersions": "1.2.3" }
Response: { "ghsaId": "GHSA-local-0001", "state": "draft", "title": "Package allows unsafe input" }
Error: { "error": { "code": "forbidden", "message": "Repository admin access required" }, "status": 403 }
```

```http
GET /api/repos/{owner}/{repo}/discussions?discussions_q=is:open category:Help&sort=latest&page=1&pageSize=25
Response: {
  "items": [{
    "number": 89939,
    "title": "[SEO] _next Folder Being Crawled by Search Engines",
    "state": "closed",
    "answerState": "answered",
    "category": { "slug": "help", "emoji": "🎓", "name": "Help", "answersEnabled": true },
    "author": { "username": "abhishekmardiya", "avatarUrl": "https://..." },
    "upvotes": 1,
    "comments": 2,
    "participants": [{ "username": "icyJoseph", "avatarUrl": "https://..." }],
    "updatedAt": "2026-02-13T00:00:00Z"
  }],
  "total": 42,
  "page": 1,
  "pageSize": 25
}
Error: { "error": { "code": "discussions_disabled", "message": "Discussions are disabled for this repository" }, "status": 422 }

POST /api/repos/{owner}/{repo}/discussions
Request: { "categoryId": "uuid", "title": "How should cache invalidation work?", "body": "Markdown body", "formAnswers": [{ "fieldId": "summary", "value": "..." }], "searchedSimilar": true }
Response: { "number": 101, "url": "/mona/app/discussions/101", "state": "open", "answerState": "unanswered" }
Error: { "error": { "code": "validation_failed", "message": "Title and required form fields are required" }, "status": 422 }

POST /api/repos/{owner}/{repo}/discussions/{number}/comments
Request: { "body": "I found a workaround." }
Response: { "id": "uuid", "body": "I found a workaround.", "renderedHtml": "<p>I found a workaround.</p>", "createdAt": "2026-04-30T00:00:00Z" }
Error: { "error": { "code": "locked", "message": "This discussion is locked" }, "status": 423 }

PUT /api/repos/{owner}/{repo}/discussions/{number}/answer
Request: { "commentId": "uuid" }
Response: { "number": 89939, "answerCommentId": "uuid", "answerState": "answered" }
Error: { "error": { "code": "forbidden", "message": "Triage access required" }, "status": 403 }

POST /api/repos/{owner}/{repo}/discussions/{number}/poll/votes
Request: { "optionId": "uuid" }
Response: { "pollId": "uuid", "selectedOptionId": "uuid", "results": [{ "optionId": "uuid", "votes": 12, "percent": 60.0 }] }
Error: { "error": { "code": "already_voted", "message": "You have already voted in this poll" }, "status": 409 }
```

```http
GET /api/orgs/{org}/projects?query=is%3Aopen&sort=updated-desc&page=1&pageSize=20
Response: {
  "projects": [
    { "id": "uuid", "number": 4247, "title": "GitHub Public Roadmap", "description": "The official GitHub product roadmap!", "state": "open", "status": null, "updatedAt": "2026-04-30T00:00:00Z" }
  ],
  "counts": { "open": 16, "closed": 0 },
  "total": 16,
  "page": 1,
  "pageSize": 20
}
Error: { "error": { "code": "not_found", "message": "Organization not found" }, "status": 404 }

GET /api/orgs/{org}/projects/{number}
Response: {
  "project": { "id": "uuid", "number": 4247, "title": "GitHub Public Roadmap", "visibility": "public", "state": "open" },
  "views": [{ "id": "uuid", "name": "All Items", "layout": "table", "filterQuery": "is:open", "position": 1 }],
  "fields": [{ "id": "uuid", "name": "Status", "type": "single_select", "options": [{ "id": "uuid", "name": "Todo", "color": "gray" }] }]
}
Error: { "error": { "code": "forbidden", "message": "Project access required" }, "status": 403 }

GET /api/projects/{projectId}/views/{viewId}/items?filter=is%3Aopen&page=1&pageSize=50
Response: {
  "items": [
    { "id": "uuid", "type": "issue", "repository": "github/roadmap", "number": 1040, "title": "Secret scanning indicators for alerts", "fieldValues": { "Status": "Q1 2026 - Jan-Mar", "Release Phase": "GA" } }
  ],
  "groups": [{ "field": "Status", "value": "Q1 2026 - Jan-Mar", "count": 17 }],
  "total": 47,
  "page": 1,
  "pageSize": 50
}
Error: { "error": { "code": "validation_failed", "message": "Unsupported project filter qualifier" }, "status": 422 }

PATCH /api/projects/{projectId}/items/{itemId}/fields/{fieldId}
Request: { "value": { "optionId": "uuid" } }
Response: { "itemId": "uuid", "fieldId": "uuid", "value": { "optionId": "uuid", "name": "Done" }, "updatedAt": "2026-04-30T00:00:00Z" }
Error: { "error": { "code": "forbidden", "message": "Project write access required" }, "status": 403 }

POST /api/projects/{projectId}/draft-issues
Request: { "title": "Triage roadmap item", "body": "Capture early planning notes", "fieldValues": { "Status": "Todo" } }
Response: { "id": "uuid", "type": "draft_issue", "title": "Triage roadmap item", "convertedIssue": null }
Error: { "error": { "code": "validation_failed", "message": "title is required" }, "status": 422 }

GET /api/projects/{projectId}/insights/charts/{chartId}?range=1m&filter=is%3Aissue
Response: {
  "chart": { "id": "uuid", "name": "Burn up", "type": "burn_up" },
  "series": [{ "name": "Completed", "points": [{ "date": "2026-04-01", "value": 59 }] }],
  "dataTable": [{ "date": "2026-04-01", "completed": 59, "total": 59 }]
}
Error: { "error": { "code": "not_found", "message": "Chart not found" }, "status": 404 }
```

## Backend Architecture

- Axum routes: auth verification middleware, REST JSON routes, Git smart HTTP endpoints, webhook receivers, SARIF upload ingestion, and security-alert management endpoints.
- Postgres/RDS: primary relational store, search indexes with `pg_trgm`, security alert/advisory state, dependency projections, and audit logs.
- S3: repository large files if needed, Actions artifacts/log archives, package blobs, Pages static outputs, SARIF uploads, and generated security exports.
- SES: transactional email for notifications, organization invites, security alert fanout, and advisory notifications. Password reset is not needed while auth remains Google-only.
- Discussions: Rust owns query parsing, permission checks, category/form loading from Git, answer/moderation state, poll votes, notification fanout, and audit events; Next.js owns list/detail/create/moderator UI.
- Projects: Rust owns project permissions, query parsing, view state, item/field mutations, issue/PR sync, draft issue conversion, workflow execution, chart aggregation, repository links, templates, and audit events; Next.js owns list/workspace layouts, table/board/roadmap, settings, workflows, access, status updates, and Insights UI.
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
- Commit history must walk Git objects from the requested ref and apply author/date filters server-side; cached Postgres commit metadata is an index, not the source of truth.
- Commit signature verification must distinguish valid, unknown key, unsigned, bad email, expired/revoked key, and partially verified states without blocking commit display.
- Branch active/stale classification should be computed from latest commit time and refreshed asynchronously, but Rust endpoints must recompute when branch refs change.
- Ahead/behind counts can be expensive on large repositories; cache by `(repository_id, branch, default_branch, default_sha, branch_sha)` and invalidate on ref updates.
- Issues can be disabled per repository; routes must return an explicit disabled state instead of exposing stale issue data.
- Public repositories allow issue reading and often issue creation by authenticated users with read access, but metadata mutation such as labels, assignees, milestones, pinning, transfer, and deletion requires triage/write/admin permission.
- Issue templates/forms are repository content and configuration; invalid YAML/form schemas should not break issue creation. Show a blank issue fallback for malformed templates.
- Issue search query parsing must be bounded: reject excessive nesting, unsupported qualifiers, and oversized URLs with structured errors.
- Labels are repository-scoped. Deleting a label must remove assignments from issues, pull requests, and discussions without deleting those conversations; organization default-label changes only affect future repositories.
- Milestone deletion must clear associated issue and pull request milestone links without deleting the items. Drag/drop prioritization should be disabled or server-rejected once a milestone has more than 500 open items.
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
- Personal settings should omit billing, Copilot, Codespaces, Sponsors, Models, and premium analytics until those products exist; do not create empty settings pages that imply unsupported entitlements.
- Profile settings are partially public data. Treat display name, bio, pronouns, website, social links, company, location, local time, achievements, and contribution privacy as independently clearable optional fields.
- Avatar uploads should go to S3 with content-type and size validation; old avatars should be retained only as needed for rollback/audit and should not remain publicly linked after replacement/removal.
- Sensitive credential actions such as creating PATs, deleting tokens, deleting keys, and revoking sessions should require sudo-mode reauthentication with a short-lived server-side grant tied to the current session.
- Personal access tokens must be hashed before storage, shown only once on creation, revocable, auditable, and scoped in Rust middleware before Git/API/package access. Never store or log plaintext token values.
- Fine-grained tokens should be capped per user and must validate resource owner, repository selection, permission matrix, expiration, and organization policy before creation. Prefilled token URLs must be validated server-side.
- SSH/GPG key management stores public keys and fingerprints only. Duplicate fingerprints across users should be rejected; malformed keys should return structured validation errors.
- SSH keys should not enable visible SSH clone URLs until SSH Git transport is implemented. HTTPS clone with PAT remains the MVP credential path.
- Security log/audit export can expose sensitive metadata; restrict export to the account owner, apply pagination/rate limits, and redact token values, secrets, and session cookies.
- Session revocation must refuse to revoke the current session through bulk/row actions unless the UI explicitly signs the user out; revoked session tokens must be invalidated server-side immediately.
- Organization slugs must be globally unique and must reject reserved system words and GitHub/opengithub lookalikes server-side, regardless of client-side normalization.
- Organization creation should not include billing or paid-plan checkout in MVP. Keep plan selection to Free/internal defaults unless billing is explicitly added later.
- Organization invitations must expire, be cancelable, and be rate-limited. SES invite email failures should leave the invitation in a retryable failed state rather than silently dropping it.
- Organization membership mutations must preserve at least one active owner and must not allow outside collaborators to be added to teams.
- Team nesting must enforce one parent per child, no cycles, and no nested secret teams. Cascaded permissions must be evaluated by repository authorization, PR review request, and team mention paths.
- Organization base repository permission and repository creation policy must be enforced by Rust API and Git endpoints. Repository create UI restrictions are advisory only.
- Organization settings pages may expose sensitive members, invites, policies, audit logs, and tokens; every organization settings route requires owner or policy-specific admin permission.
- Security policy authoring writes real repository files and commits; do not store SECURITY.md only in a side table because raw/tree/blob views must reflect it.
- Dependabot alerts must be generated from opengithub dependency extraction plus an internal advisory feed. Do not call GitHub APIs or expose GitHub-only advisory IDs as required foreign keys.
- Code scanning SARIF ingestion must validate upload size, result count, rule metadata, and path normalization before creating alerts; malformed SARIF should fail the upload without corrupting prior alerts.
- Secret scanning must store redacted evidence and stable fingerprints, never plaintext secrets. Push protection must run inside Rust Git push handling, not only as a web warning.
- Security alert list counts, filters, suggestions, and search results must be permission-aware and must not leak private repository package names, file paths, alert titles, or secret types.
- Repository security advisories can involve embargoed/private content. Draft advisories, private forks, collaborators, credits, and comments require strict repository-admin/collaborator authorization and audit events.
- Discussions can be disabled per repository; all routes must return explicit disabled states without exposing private discussion counts.
- Discussion category formats control allowed behavior. Poll discussions cannot use YAML category forms and cannot be moved to or from non-poll categories.
- Discussion category form YAML is repository content from the default branch. Malformed forms must not break discussion creation; render a maintainer-visible validation error and a generic fallback form.
- Answer marking, lock/unlock, close/reopen, pin/unpin, transfer, delete, and issue-to-discussion conversion require triage/write/admin permissions and must create timeline/audit events.
- Poll voting must enforce one vote per authenticated user per poll unless an explicit change-vote policy is implemented; results for private repositories must be permission checked.
- Project permissions are independent from repository permissions. A user can see a public project item only if they can see the linked issue/PR/repository content; private item metadata must be redacted.
- Project field updates that map to native issue/PR metadata must write through the issue/PR authorization path and emit normal timeline events.
- Draft issues are project-only and should not send mention/assignee notifications until converted to real repository issues.
- Built-in project workflows must be idempotent and attributed to an automation actor; they must never bypass repository visibility, organization policy, or branch/security rules.
- Project views can be large and highly virtualized. API pagination, grouping, and chart aggregation must be server-backed rather than loading every item into Next.js.
- Wikis are separate Git repositories named like `{owner}/{repo}.wiki.git`; do not store editable wiki content only in SQL because clone/push/history/diff behavior must remain Git-compatible.
- Wiki page titles must reject characters that cannot be safely represented as cross-platform filenames: `\ / : * ? " < > |`.
- Only commits pushed to the wiki default branch should become live. Branches may exist in local wiki clones but should not publish reader-visible pages until merged/pushed to default.
- Wiki read/write routes must enforce repository visibility, `has_wiki`, collaborator permissions, and optional public-editing settings. Private wiki page titles, counts, clone URLs, and history must not leak.
- Wiki rendering should bound file count, file size, markup conversion time, and rendered HTML size; GitHub documents a soft limit of 5,000 total wiki files.

## Build Order

1. Rust/Next.js scaffolding and shared environment contract.
2. Database schema and migrations for users, sessions, repositories, Git refs, issues, pull requests.
3. Rust-native Google OAuth login (`oauth2` + `tower-sessions` + `axum-login`).
4. App shell, global navigation, search/jump bar, and dashboard empty state.
5. Repository create/import and repository overview.
6. Git plumbing: clone/fetch/push, refs, commits, tree/blob/raw/archive file browser.
7. Issues and pull requests.
8. Global search/code search, Actions, Discussions, Projects, Wiki, security alerts/advisories, Releases, Packages, Pages, organizations, teams, profiles, settings, notifications.
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
| `g` then `g` | Repository | Go to the Discussions tab. |
| `Cmd+/` / `Ctrl+/` | Issues/Pulls list | Focus the issues or pull requests search bar. |
| `l` | Issues/Pulls list or detail | Filter by/edit labels, or apply a label in issue context. |
| `m` | Issues/Pulls list or detail | Filter by/edit milestones, or set a milestone in issue context. |
| `a` | Issues/Pulls list or detail | Filter by/edit assignees, or set an assignee in issue context. |
| `x` | Issue detail | Link an issue or pull request from the same repository. |
| `Ctrl+.` then `Ctrl+<number>` | Comment composer | Open saved replies menu and insert a saved reply. |
| `Cmd+Enter` / `Ctrl+Enter` | Issue creation/comment form | Submit the issue or comment when valid. |
| `t` / `b` / `r` | Projects View menu | Switch a project view to Table, Board, or Roadmap layout when the View menu is open. |
| `f` / `c` / `s` | Projects View menu | Open Fields, Column by, Swimlanes, Sort by, Field sum, or Slice by rows depending on focused menu item. |
| `#` | Projects add item row | Open repository issue/PR picker while adding project items. |
| `p` | Repository Watch menu | Select Participating and @mentions. |
| `a` | Repository Watch menu | Select All Activity. |
| `i` | Repository Watch menu | Select Ignore. |
| `c` | Repository Watch menu | Select Custom notification events. |
