export type AuthUser = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type AuthSession = {
  authenticated: boolean;
  user: AuthUser | null;
};

export type RepositoryVisibility = "public" | "private" | "internal";

export type RepositoryOwnerType = "user" | "organization";

export type RepositorySummary = {
  id: string;
  owner_user_id: string | null;
  owner_organization_id: string | null;
  owner_login: string;
  name: string;
  description: string | null;
  visibility: RepositoryVisibility;
  default_branch: string;
  is_archived: boolean;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

export type RepositoryFile = {
  id: string;
  repositoryId: string;
  commitId: string;
  path: string;
  content: string;
  oid: string;
  byteSize: number;
  createdAt: string;
};

export type RepositoryTreeEntry = {
  kind: "folder" | "file" | string;
  name: string;
  path: string;
  href: string;
  byteSize: number | null;
  latestCommitMessage: string | null;
  latestCommitHref: string | null;
  updatedAt: string;
};

export type RepositoryLatestCommit = {
  oid: string;
  shortOid: string;
  message: string;
  href: string;
  committedAt: string;
};

export type RepositoryLanguageSummary = {
  language: string;
  color: string;
  byteCount: number;
  percentage: number;
};

export type RepositorySidebarMetadata = {
  about: string | null;
  websiteUrl: string | null;
  topics: string[];
  starsCount: number;
  watchersCount: number;
  forksCount: number;
  releasesCount: number;
  deploymentsCount: number;
  contributorsCount: number;
  languages: RepositoryLanguageSummary[];
};

export type RepositoryCloneUrls = {
  https: string;
  git: string;
  zip: string;
};

export type RepositoryOverview = RepositorySummary & {
  viewerPermission: string | null;
  branchCount: number;
  tagCount: number;
  defaultBranchRef: {
    id: string;
    repository_id: string;
    name: string;
    kind: string;
    target_commit_id: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  latestCommit: RepositoryLatestCommit | null;
  rootEntries: RepositoryTreeEntry[];
  files: RepositoryFile[];
  readme: RepositoryFile | null;
  sidebar: RepositorySidebarMetadata;
  cloneUrls: RepositoryCloneUrls;
};

export type WritableRepositoryOwner = {
  ownerType: RepositoryOwnerType;
  id: string;
  login: string;
  displayName: string;
  avatarUrl: string | null;
};

export type RepositoryTemplateOption = {
  slug: string;
  displayName: string;
  description: string;
};

export type GitignoreTemplateOption = {
  slug: string;
  displayName: string;
  description: string;
};

export type LicenseTemplateOption = {
  slug: string;
  displayName: string;
  description: string;
};

export type RepositoryCreationOptions = {
  owners: WritableRepositoryOwner[];
  templates: RepositoryTemplateOption[];
  gitignoreTemplates: GitignoreTemplateOption[];
  licenseTemplates: LicenseTemplateOption[];
  suggestedName: string;
};

export type RepositoryNameAvailability = {
  ownerType: RepositoryOwnerType;
  ownerId: string;
  ownerLogin: string;
  requestedName: string;
  normalizedName: string;
  available: boolean;
  reason: string | null;
};

export type CreateRepositoryRequest = {
  ownerType: RepositoryOwnerType;
  ownerId: string;
  name: string;
  description?: string | null;
  visibility: Exclude<RepositoryVisibility, "internal">;
  defaultBranch?: string | null;
  initializeReadme?: boolean;
  templateSlug?: string | null;
  gitignoreTemplateSlug?: string | null;
  licenseTemplateSlug?: string | null;
};

export type CreatedRepository = RepositorySummary & {
  href: string;
  files?: RepositoryFile[];
  readme?: RepositoryFile | null;
};

export type RepositoryImportRequest = {
  sourceUrl: string;
  sourceUsername?: string | null;
  sourceToken?: string | null;
  sourcePassword?: string | null;
  ownerType: RepositoryOwnerType;
  ownerId: string;
  name: string;
  description?: string | null;
  visibility: Exclude<RepositoryVisibility, "internal">;
};

export type RepositoryImportStatusName =
  | "queued"
  | "importing"
  | "imported"
  | "failed";

export type RepositoryImportStatus = {
  id: string;
  repositoryId: string;
  requestedByUserId: string;
  source: {
    url: string;
    host: string;
    path: string;
  };
  status: RepositoryImportStatusName;
  progressMessage: string;
  errorCode: string | null;
  errorMessage: string | null;
  jobLeaseId: string | null;
  repositoryHref: string;
  statusHref: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
  };
  status: number;
};

export type DashboardTopRepository = {
  ownerLogin: string;
  name: string;
  visibility: RepositoryVisibility;
  primaryLanguage: string | null;
  primaryLanguageColor: string | null;
  updatedAt: string;
  lastVisitedAt: string | null;
  href: string;
};

export type ListEnvelope<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type DashboardHintDismissal = {
  id: string;
  userId: string;
  hintKey: string;
  dismissedAt: string;
};

export type DashboardSummary = {
  user: AuthUser;
  repositories: ListEnvelope<RepositorySummary>;
  topRepositories: ListEnvelope<DashboardTopRepository>;
  hasRepositories: boolean;
  recentActivity: DashboardActivityItem[];
  feedEvents: DashboardFeedEvent[];
  feedPreferences: DashboardFeedPreferences;
  supportedFeedEventTypes: DashboardFeedEventType[];
  assignedIssues: DashboardIssueSummary[];
  reviewRequests: DashboardReviewRequest[];
  dismissedHints: DashboardHintDismissal[];
};

export type DashboardFeedTab = "following" | "for_you";

export type DashboardFeedEventType =
  | "star"
  | "follow"
  | "repository_create"
  | "help_wanted_issue"
  | "help_wanted_pull_request"
  | "push"
  | "fork"
  | "release";

export type DashboardFeedEvent = {
  id: string;
  eventType: DashboardFeedEventType;
  title: string;
  excerpt: string | null;
  occurredAt: string;
  actorLogin: string;
  actorAvatarUrl: string | null;
  repositoryName: string;
  repositoryHref: string;
  targetHref: string;
  actionSummary: string;
};

export type DashboardFeedPreferences = {
  feedTab: DashboardFeedTab;
  eventTypes: DashboardFeedEventType[];
};

export type DashboardActivityItem = {
  id: string;
  kind: "repository" | "commit" | "issue" | "pull_request" | string;
  title: string;
  number: number;
  state: "open" | "closed" | "merged" | string;
  repositoryName: string;
  repositoryHref: string;
  href: string;
  occurredAt: string;
  description: string | null;
  actorLogin: string;
  actorAvatarUrl: string | null;
};

export type DashboardIssueSummary = {
  id: string;
  title: string;
  repositoryName: string;
  number: number;
  href: string;
  updatedAt: string;
};

export type DashboardReviewRequest = {
  id: string;
  title: string;
  repositoryName: string;
  number: number;
  href: string;
  updatedAt: string;
};

export type RenderMarkdownRequest = {
  markdown: string;
  repositoryId?: string | null;
  owner?: string | null;
  repo?: string | null;
  ref?: string | null;
  enableTaskToggles?: boolean;
};

export type RenderedMarkdown = {
  contentSha: string;
  html: string;
  cached: boolean;
};

export type HighlightToken = {
  text: string;
  className: string;
};

export type HighlightedLine = {
  number: number;
  text: string;
  tokens: HighlightToken[];
};

export type CodeSymbol = {
  name: string;
  kind: string;
  line: number;
};

export type LanguageOption = {
  id: string;
  label: string;
};

export type HighlightCodeRequest = {
  source: string;
  path?: string | null;
  sha?: string | null;
  repositoryId?: string | null;
  language?: string | null;
};

export type HighlightedFile = {
  sha: string;
  path: string;
  language: string;
  cached: boolean;
  lines: HighlightedLine[];
  symbols: CodeSymbol[];
  supportedLanguages: LanguageOption[];
};

const DEFAULT_API_URL = "http://localhost:3016";

export function apiBaseUrl(): string {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    DEFAULT_API_URL
  ).replace(/\/$/, "");
}

export function sanitizeNextPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    !candidate?.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    candidate.includes("\n") ||
    candidate.includes("\r")
  ) {
    return "/dashboard";
  }
  return candidate;
}

export function googleStartUrl(nextPath: string): string {
  const url = new URL("/api/auth/google/start", apiBaseUrl());
  url.searchParams.set("next", sanitizeNextPath(nextPath));
  return url.toString();
}

export async function getSessionFromCookie(
  cookie: string | null | undefined,
): Promise<AuthSession> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/api/auth/me`, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
  } catch {
    return { authenticated: false, user: null };
  }

  if (!response.ok) {
    return { authenticated: false, user: null };
  }

  return (await response.json()) as AuthSession;
}

export async function getSessionFromHeaders(
  requestHeaders: Headers,
): Promise<AuthSession> {
  return getSessionFromCookie(requestHeaders.get("cookie"));
}

export type DashboardSummaryQuery = {
  feedTab?: DashboardFeedTab;
  eventTypes?: DashboardFeedEventType[];
  repositoryFilter?: string;
};

export function dashboardSummaryPath(
  query: DashboardSummaryQuery = {},
): string {
  const params = new URLSearchParams();
  if (query.feedTab) {
    params.set("feedTab", query.feedTab);
  }
  for (const eventType of query.eventTypes ?? []) {
    params.append("eventType", eventType);
  }
  if (query.repositoryFilter?.trim()) {
    params.set("repositoryFilter", query.repositoryFilter.trim());
  }

  const paramString = params.toString();
  return paramString ? `/api/dashboard?${paramString}` : "/api/dashboard";
}

export async function getDashboardSummaryFromCookie(
  cookie: string | null | undefined,
  query: DashboardSummaryQuery = {},
): Promise<DashboardSummary | null> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${dashboardSummaryPath(query)}`, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as DashboardSummary;
}

export async function saveDashboardFeedPreferences(
  cookie: string | null | undefined,
  preferences: DashboardFeedPreferences,
): Promise<DashboardFeedPreferences> {
  const response = await fetch(
    `${apiBaseUrl()}/api/dashboard/feed-preferences`,
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(preferences),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Dashboard feed preferences failed to save");
  }

  return (await response.json()) as DashboardFeedPreferences;
}

export async function resetDashboardFeedPreferences(
  cookie: string | null | undefined,
): Promise<DashboardFeedPreferences> {
  const response = await fetch(
    `${apiBaseUrl()}/api/dashboard/feed-preferences`,
    {
      method: "DELETE",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Dashboard feed preferences failed to reset");
  }

  const body = (await response.json()) as {
    feedPreferences: DashboardFeedPreferences;
  };
  return body.feedPreferences;
}

export async function getRepositoryFromCookie(
  cookie: string | null | undefined,
  owner: string,
  repo: string,
): Promise<RepositoryOverview | null> {
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl()}/api/repos/${encodeURI(owner)}/${encodeURI(repo)}`,
      {
        headers: cookie ? { cookie } : undefined,
        cache: "no-store",
      },
    );
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as RepositoryOverview;
}

export async function getRepositoryCreationOptionsFromCookie(
  cookie: string | null | undefined,
): Promise<RepositoryCreationOptions | null> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/api/repos/creation-options`, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as RepositoryCreationOptions;
}

export function repositoryNameAvailabilityPath({
  ownerType,
  ownerId,
  name,
}: {
  ownerType: RepositoryOwnerType;
  ownerId: string;
  name: string;
}): string {
  const params = new URLSearchParams({
    ownerType,
    ownerId,
    name,
  });
  return `/api/repos/name-availability?${params.toString()}`;
}

export async function getRepositoryNameAvailabilityFromCookie(
  cookie: string | null | undefined,
  query: {
    ownerType: RepositoryOwnerType;
    ownerId: string;
    name: string;
  },
): Promise<RepositoryNameAvailability | null> {
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl()}${repositoryNameAvailabilityPath(query)}`,
      {
        headers: cookie ? { cookie } : undefined,
        cache: "no-store",
      },
    );
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as RepositoryNameAvailability;
}

export async function createRepositoryFromCookie(
  cookie: string | null | undefined,
  request: CreateRepositoryRequest,
): Promise<CreatedRepository> {
  const response = await fetch(`${apiBaseUrl()}/api/repos`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(request),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiErrorEnvelope | null;
    throw new Error(body?.error.message ?? "Repository could not be created", {
      cause: body,
    });
  }

  return (await response.json()) as CreatedRepository;
}

export async function createRepositoryImportFromCookie(
  cookie: string | null | undefined,
  request: RepositoryImportRequest,
): Promise<RepositoryImportStatus> {
  const response = await fetch(`${apiBaseUrl()}/api/repos/imports`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(request),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiErrorEnvelope | null;
    throw new Error(
      body?.error.message ?? "Repository import could not start",
      {
        cause: body,
      },
    );
  }

  return (await response.json()) as RepositoryImportStatus;
}

export async function getRepositoryImportFromCookie(
  cookie: string | null | undefined,
  importId: string,
): Promise<RepositoryImportStatus | null> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/api/repos/imports/${importId}`, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as RepositoryImportStatus;
}

export async function logout(cookie: string | null): Promise<string | null> {
  const response = await fetch(`${apiBaseUrl()}/api/auth/logout`, {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  });

  return response.headers.get("set-cookie");
}

export async function renderMarkdown(
  request: RenderMarkdownRequest,
): Promise<RenderedMarkdown> {
  const response = await fetch(`${apiBaseUrl()}/api/markdown/render`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Markdown preview failed");
  }

  return (await response.json()) as RenderedMarkdown;
}

export async function highlightCode(
  request: HighlightCodeRequest,
): Promise<HighlightedFile> {
  const response = await fetch(`${apiBaseUrl()}/api/highlight/render`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Syntax highlighting failed");
  }

  return (await response.json()) as HighlightedFile;
}
