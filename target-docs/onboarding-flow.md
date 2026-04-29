# Onboarding Flow: GitHub / opengithub

Source files:

- `target-docs/content/get-started/onboarding/getting-started-with-your-github-account.md`
- `target-docs/content/account-and-profile/get-started/personal-dashboard-quickstart.md`
- `target-docs/content/repositories/creating-and-managing-repositories/quickstart-for-repositories.md`
- `target-docs/content/github-cli/github-cli/quickstart.md`

## Target GitHub Flow

1. Create a personal account from the public home page.
2. Choose product/plan. This is documented by GitHub but excluded from opengithub because billing is out of scope.
3. Verify email so the account can use the full feature set.
4. Configure two-factor authentication; optionally add a passkey.
5. View profile and contribution graph.
6. Set up Git locally and choose how to interact with GitHub: web, command line, desktop, IDE.
7. Create the first repository, optionally with description, visibility, README, gitignore, and license.
8. Commit the first README change in the web editor or with Git.
9. Return to the personal dashboard, which shows recent activity, top repositories and teams, feed/recommendations, issues, and pull requests.
10. Continue to collaboration features: collaborators, repository settings, issues, pull requests, notifications, Pages, Discussions, Actions, Packages, and security.

## opengithub First-Run Flow

Required:

1. User signs in with Google via Better Auth.
2. App creates or updates an opengithub user profile from the Google identity.
3. First dashboard load shows an empty state when the user has no repositories.
4. Primary CTA opens the create repository flow.
5. Repository creation asks for owner, name, description, public/private visibility, initialize with README, gitignore template, license template, issues enabled, discussions enabled, wiki enabled, and merge policy defaults.
6. On success, user lands on `/{owner}/{repo}` with a README or empty-repository quick setup panel.

Skippable / later:

- Profile bio/location/company setup.
- Personal access token creation.
- Organization creation.
- Local Git/CLI setup instructions.
- Security feature setup.

Done state:

- User has at least one repository and the dashboard switches from empty-state onboarding to recent activity, repositories, assigned issues/PRs, and recommendations.

## Empty States To Build

- Dashboard with no repositories: welcome panel, "Create repository", "Import repository", and "Read the guide" actions.
- Repository with no commits: quick setup commands for HTTPS clone, push existing repository, create README, add `.gitignore`, add license.
- Issues tab with no issues: explanation plus "New issue" CTA.
- Pull requests tab with no PRs: explanation plus branch/compare guidance.
- Actions tab with no workflows: workflow template cards and "New workflow" CTA.
- Packages tab with no packages: publish instructions and token requirements.

