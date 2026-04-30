export type NavigationKind =
  | "primary"
  | "create"
  | "settings"
  | "repository"
  | "profile"
  | "organization"
  | "search";

export type NavigationItem = {
  href: string;
  label: string;
  kind: NavigationKind;
  description?: string;
  protected: boolean;
};

export type SettingsSection = NavigationItem & {
  section: string;
};

export type RepositoryTab = NavigationItem & {
  segment: string;
};

export type RepositorySettingsSection = NavigationItem & {
  section: string;
  hrefSuffix: string;
};

export type QueryTab = {
  label: string;
  value: string;
  description: string;
};

export const GLOBAL_NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    kind: "primary",
    description: "Home feed and repository overview",
    protected: true,
  },
  {
    href: "/pulls",
    label: "Pull requests",
    kind: "primary",
    description: "Review requests across repositories",
    protected: true,
  },
  {
    href: "/issues",
    label: "Issues",
    kind: "primary",
    description: "Assigned, mentioned, and subscribed issues",
    protected: true,
  },
  {
    href: "/notifications",
    label: "Notifications",
    kind: "primary",
    description: "Unread and done inbox triage",
    protected: true,
  },
  {
    href: "/search",
    label: "Search",
    kind: "search",
    description: "Search repositories, code, issues, and people",
    protected: true,
  },
  {
    href: "/explore",
    label: "Explore",
    kind: "primary",
    description: "Discover repositories and activity",
    protected: true,
  },
  {
    href: "/codespaces",
    label: "Codespaces",
    kind: "primary",
    description: "Cloud development environments",
    protected: true,
  },
] as const satisfies readonly NavigationItem[];

export const CREATE_NAV_ITEMS = [
  {
    href: "/new",
    label: "New repository",
    kind: "create",
    description: "Create a repository owned by you or an organization",
    protected: true,
  },
  {
    href: "/new/import",
    label: "Import repository",
    kind: "create",
    description: "Import an existing Git repository",
    protected: true,
  },
  {
    href: "/organizations/new",
    label: "New organization",
    kind: "create",
    description: "Create a shared organization workspace",
    protected: true,
  },
] as const satisfies readonly NavigationItem[];

export const SETTINGS_NAV_ITEMS = [
  {
    href: "/settings/profile",
    label: "Profile",
    section: "profile",
    kind: "settings",
    description: "Public identity and profile details",
    protected: true,
  },
  {
    href: "/settings/account",
    label: "Account",
    section: "account",
    kind: "settings",
    description: "Username, export, and account controls",
    protected: true,
  },
  {
    href: "/settings/emails",
    label: "Emails",
    section: "emails",
    kind: "settings",
    description: "Primary Google email and notification addresses",
    protected: true,
  },
  {
    href: "/settings/notifications",
    label: "Notifications",
    section: "notifications",
    kind: "settings",
    description: "Web and email notification preferences",
    protected: true,
  },
  {
    href: "/settings/appearance",
    label: "Appearance",
    section: "appearance",
    kind: "settings",
    description: "Theme and accessibility preferences",
    protected: true,
  },
  {
    href: "/settings/security",
    label: "Security",
    section: "security",
    kind: "settings",
    description: "Sessions, providers, and security log",
    protected: true,
  },
  {
    href: "/settings/sessions",
    label: "Sessions",
    section: "sessions",
    kind: "settings",
    description: "Signed-in browser sessions",
    protected: true,
  },
  {
    href: "/settings/keys",
    label: "Keys",
    section: "keys",
    kind: "settings",
    description: "SSH and signing keys",
    protected: true,
  },
  {
    href: "/settings/tokens",
    label: "Tokens",
    section: "tokens",
    kind: "settings",
    description: "Personal access tokens for Git and API access",
    protected: true,
  },
] as const satisfies readonly SettingsSection[];

export const REPOSITORY_TABS = [
  {
    href: "",
    label: "Code",
    segment: "",
    kind: "repository",
    protected: false,
  },
  {
    href: "/issues",
    label: "Issues",
    segment: "issues",
    kind: "repository",
    protected: false,
  },
  {
    href: "/pulls",
    label: "Pull requests",
    segment: "pulls",
    kind: "repository",
    protected: false,
  },
  {
    href: "/actions",
    label: "Actions",
    segment: "actions",
    kind: "repository",
    protected: false,
  },
  {
    href: "/projects",
    label: "Projects",
    segment: "projects",
    kind: "repository",
    protected: false,
  },
  {
    href: "/wiki",
    label: "Wiki",
    segment: "wiki",
    kind: "repository",
    protected: false,
  },
  {
    href: "/security",
    label: "Security",
    segment: "security",
    kind: "repository",
    protected: false,
  },
  {
    href: "/pulse",
    label: "Insights",
    segment: "pulse",
    kind: "repository",
    protected: false,
  },
  {
    href: "/settings",
    label: "Settings",
    segment: "settings",
    kind: "repository",
    protected: true,
  },
] as const satisfies readonly RepositoryTab[];

export const REPOSITORY_SETTINGS_NAV_ITEMS = [
  {
    href: "",
    hrefSuffix: "/settings",
    label: "General",
    section: "general",
    kind: "settings",
    description: "Repository name, visibility, and default branch",
    protected: true,
  },
  {
    href: "",
    hrefSuffix: "/settings/access",
    label: "Access",
    section: "access",
    kind: "settings",
    description: "Collaborators, teams, and repository permissions",
    protected: true,
  },
  {
    href: "",
    hrefSuffix: "/settings/branches",
    label: "Branches",
    section: "branches",
    kind: "settings",
    description: "Default branch and branch protection rules",
    protected: true,
  },
  {
    href: "",
    hrefSuffix: "/settings/actions",
    label: "Actions",
    section: "actions",
    kind: "settings",
    description: "Workflow permissions and runner policy",
    protected: true,
  },
  {
    href: "",
    hrefSuffix: "/settings/hooks",
    label: "Webhooks",
    section: "hooks",
    kind: "settings",
    description: "Repository webhook endpoints and deliveries",
    protected: true,
  },
  {
    href: "",
    hrefSuffix: "/settings/pages",
    label: "Pages",
    section: "pages",
    kind: "settings",
    description: "Static site publishing and custom domains",
    protected: true,
  },
  {
    href: "",
    hrefSuffix: "/settings/secrets",
    label: "Secrets",
    section: "secrets",
    kind: "settings",
    description: "Actions secrets and environment variables",
    protected: true,
  },
  {
    href: "",
    hrefSuffix: "/settings/tags",
    label: "Tags",
    section: "tags",
    kind: "settings",
    description: "Protected tags and release rules",
    protected: true,
  },
  {
    href: "",
    hrefSuffix: "/settings/security",
    label: "Security analysis",
    section: "security",
    kind: "settings",
    description: "Security features, alerts, and audit controls",
    protected: true,
  },
] as const satisfies readonly RepositorySettingsSection[];

export const PROFILE_TABS = [
  {
    label: "Overview",
    value: "overview",
    description: "Profile summary and contribution highlights",
  },
  {
    label: "Repositories",
    value: "repositories",
    description: "Public and visible repositories owned by this account",
  },
  {
    label: "Projects",
    value: "projects",
    description: "Project boards connected to this account",
  },
  {
    label: "Packages",
    value: "packages",
    description: "Published packages",
  },
  {
    label: "Stars",
    value: "stars",
    description: "Starred repositories",
  },
] as const satisfies readonly QueryTab[];

export const ORGANIZATION_TABS = [
  {
    label: "Overview",
    value: "overview",
    description: "Organization summary and pinned repositories",
  },
  {
    label: "Repositories",
    value: "repositories",
    description: "Repositories owned by this organization",
  },
  {
    label: "Projects",
    value: "projects",
    description: "Organization planning surfaces",
  },
  {
    label: "Packages",
    value: "packages",
    description: "Packages published by this organization",
  },
  {
    label: "People",
    value: "people",
    description: "Organization members and owners",
  },
  {
    label: "Teams",
    value: "teams",
    description: "Team directories and access groups",
  },
] as const satisfies readonly QueryTab[];

export const SEARCH_TABS = [
  {
    label: "Repositories",
    value: "repositories",
    description: "Repository name, description, and topic matches",
  },
  {
    label: "Code",
    value: "code",
    description: "Indexed file content and symbols",
  },
  {
    label: "Issues",
    value: "issues",
    description: "Issue titles, bodies, labels, and comments",
  },
  {
    label: "Pull requests",
    value: "pull_requests",
    description: "Pull request titles, branches, and review text",
  },
  {
    label: "Commits",
    value: "commits",
    description: "Commit messages and authors",
  },
  {
    label: "Users",
    value: "users",
    description: "People using opengithub",
  },
  {
    label: "Organizations",
    value: "organizations",
    description: "Organization profiles and teams",
  },
] as const satisfies readonly QueryTab[];

export type JumpSuggestionKind =
  | "repository"
  | "organization"
  | "team"
  | "create"
  | "search";

export type JumpSuggestion = {
  id: string;
  kind: JumpSuggestionKind;
  label: string;
  description: string;
  href: string;
  section: "Jump to" | "Create" | "Search";
};

export function navigationHrefs() {
  return [
    ...GLOBAL_NAV_ITEMS.map((item) => item.href),
    ...CREATE_NAV_ITEMS.map((item) => item.href),
    ...SETTINGS_NAV_ITEMS.map((item) => item.href),
  ];
}

function tabValue<T extends QueryTab>(
  tabs: readonly T[],
  value: string | null,
): string {
  if (value && tabs.some((tab) => tab.value === value)) {
    return value;
  }

  return tabs[0].value;
}

function queryTabHref(
  basePath: string,
  paramName: string,
  value: string,
  preservedParams: Record<string, string | null | undefined> = {},
) {
  const params = new URLSearchParams();
  for (const [key, paramValue] of Object.entries(preservedParams)) {
    if (paramValue?.trim()) {
      params.set(key, paramValue.trim());
    }
  }
  params.set(paramName, value);
  return `${basePath}?${params.toString()}`;
}

export function activeProfileTab(value: string | null | undefined) {
  return tabValue(PROFILE_TABS, value ?? null);
}

export function profileTabHref(owner: string, tabValueName: string) {
  return queryTabHref(`/${encodeURIComponent(owner)}`, "tab", tabValueName);
}

export function activeOrganizationTab(value: string | null | undefined) {
  return tabValue(ORGANIZATION_TABS, value ?? null);
}

export function organizationHref(org: string) {
  return `/orgs/${encodeURIComponent(org)}`;
}

export function organizationTabHref(org: string, tabValueName: string) {
  return queryTabHref(organizationHref(org), "tab", tabValueName);
}

export function organizationProjectHref(org: string) {
  return `${organizationHref(org)}/projects`;
}

export function organizationSettingsHref(org: string) {
  return `${organizationHref(org)}/settings`;
}

export function organizationTeamHref(org: string, teamSlug: string) {
  return `${organizationHref(org)}/teams/${encodeURIComponent(teamSlug)}`;
}

export function activeSearchType(value: string | null | undefined) {
  return tabValue(SEARCH_TABS, value ?? null);
}

export function searchTypeHref(type: string, query: string | null | undefined) {
  return queryTabHref("/search", "type", type, { q: query });
}

export function searchQueryHref(query: string) {
  return searchTypeHref("repositories", query);
}

export function repositoryJumpHref(owner: string, repo: string) {
  return `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

export function profileHref(owner: string) {
  return `/${encodeURIComponent(owner)}`;
}

export function createJumpSuggestions(): JumpSuggestion[] {
  return CREATE_NAV_ITEMS.map((item) => ({
    id: `create:${item.href}`,
    kind: "create",
    label: item.label,
    description: item.description,
    href: item.href,
    section: "Create",
  }));
}

export function queryJumpSuggestions(query: string): JumpSuggestion[] {
  const normalized = query.trim();
  if (!normalized) {
    return [];
  }

  return [
    {
      id: `search:${normalized}`,
      kind: "search",
      label: `Search repositories for "${normalized}"`,
      description: "Press Enter",
      href: searchQueryHref(normalized),
      section: "Search",
    },
  ];
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function activeSettingsSection(pathname: string): string {
  return (
    SETTINGS_NAV_ITEMS.find((item) => isActivePath(pathname, item.href))
      ?.section ?? "profile"
  );
}

export function repositorySettingsHref(
  owner: string,
  repo: string,
  item: RepositorySettingsSection,
) {
  return `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${item.hrefSuffix}`;
}

export function activeRepositorySettingsSection(pathname: string): string {
  const [, owner, repo, settings, section] = pathname.split("/");

  if (!owner || !repo || settings !== "settings") {
    return "general";
  }

  return (
    REPOSITORY_SETTINGS_NAV_ITEMS.find((item) => item.section === section)
      ?.section ?? "general"
  );
}

export function repositoryTabHref(
  owner: string,
  repo: string,
  tab: RepositoryTab,
) {
  return `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${tab.href}`;
}

export function activeRepositoryTab(pathname: string): string {
  const [, , , segment = ""] = pathname.split("/");

  if (segment === "pull") {
    return "pulls";
  }

  if (segment === "graphs" || segment === "network" || segment === "forks") {
    return "pulse";
  }

  return REPOSITORY_TABS.some((tab) => tab.segment === segment) ? segment : "";
}
