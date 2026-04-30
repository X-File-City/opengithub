export type NavigationKind =
  | "primary"
  | "create"
  | "settings"
  | "repository"
  | "profile"
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

export function navigationHrefs() {
  return [
    ...GLOBAL_NAV_ITEMS.map((item) => item.href),
    ...CREATE_NAV_ITEMS.map((item) => item.href),
    ...SETTINGS_NAV_ITEMS.map((item) => item.href),
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
