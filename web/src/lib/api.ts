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

export type RepositoryPathBreadcrumb = {
  name: string;
  path: string;
  href: string;
};

export type RepositoryLatestCommit = {
  oid: string;
  shortOid: string;
  message: string;
  href: string;
  committedAt: string;
};

export type RepositoryResolvedRef = {
  kind: "branch" | "tag" | string;
  shortName: string;
  qualifiedName: string;
  targetOid: string | null;
  recoveryHref: string;
};

export type RepositoryPathOverview = RepositorySummary & {
  viewerPermission: string | null;
  refName: string;
  resolvedRef: RepositoryResolvedRef;
  defaultBranchHref: string;
  recoveryHref: string;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  path: string;
  pathName: string;
  breadcrumbs: RepositoryPathBreadcrumb[];
  parentHref: string | null;
  entries: RepositoryTreeEntry[];
  readme: RepositoryFile | null;
  latestCommit: RepositoryLatestCommit | null;
  historyHref: string;
};

export type RepositoryBlobView = RepositorySummary & {
  viewerPermission: string | null;
  refName: string;
  resolvedRef: RepositoryResolvedRef;
  defaultBranchHref: string;
  recoveryHref: string;
  path: string;
  pathName: string;
  breadcrumbs: RepositoryPathBreadcrumb[];
  parentHref: string | null;
  file: RepositoryFile;
  language: string | null;
  isBinary: boolean;
  isLarge: boolean;
  lineCount: number;
  locCount: number;
  sizeLabel: string;
  mimeType: string;
  renderMode: "text" | "binary" | "large" | string;
  displayContent: string | null;
  latestCommit: RepositoryLatestCommit | null;
  latestPathCommit: RepositoryLatestCommit | null;
  historyHref: string;
  rawHref: string;
  downloadHref: string;
  rawApiHref: string;
  downloadApiHref: string;
  permalinkHref: string;
  symbols: RepositoryCodeSymbol[];
};

export type RepositoryCodeSymbol = {
  kind: string;
  name: string;
  lineNumber: number;
  preview: string;
};

export type RepositoryBlameCommit = {
  oid: string;
  shortOid: string;
  message: string;
  href: string;
  committedAt: string;
  authorLogin: string | null;
};

export type RepositoryBlameLine = {
  lineNumber: number;
  content: string;
  commit: RepositoryBlameCommit;
};

export type RepositoryBlameView = RepositoryBlobView & {
  lines: RepositoryBlameLine[];
};

export type RepositoryCommitHistoryItem = {
  oid: string;
  shortOid: string;
  message: string;
  href: string;
  committedAt: string;
  authorLogin: string | null;
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

export type RepositoryViewerState = {
  starred: boolean;
  watching: boolean;
  forkedRepositoryHref: string | null;
};

export type RepositorySocialState = RepositoryViewerState & {
  starsCount: number;
  watchersCount: number;
  forksCount: number;
};

export type RepositoryForkResult = {
  sourceRepositoryId: string;
  forkRepository: RepositorySummary;
  forkHref: string;
  social: RepositorySocialState;
};

export type RepositoryCloneUrls = {
  https: string;
  git: string;
  zip: string;
};

export type RepositoryRefSummary = {
  name: string;
  shortName: string;
  kind: "branch" | "tag" | string;
  href: string;
  samePathHref: string;
  active: boolean;
  targetShortOid: string | null;
  updatedAt: string;
};

export type RepositoryFileFinderItem = {
  path: string;
  name: string;
  kind: "file" | string;
  href: string;
  byteSize: number;
  language: string | null;
};

export type RepositoryFileFinderResult =
  ListEnvelope<RepositoryFileFinderItem> & {
    resolvedRef: RepositoryResolvedRef;
    defaultBranchHref: string;
    recoveryHref: string;
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
  viewerState: RepositoryViewerState;
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
  details?: {
    field?: string;
    reason?: string;
    [key: string]: unknown;
  } | null;
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

export type AppShellRepository = {
  id: string;
  ownerLogin: string;
  name: string;
  visibility: RepositoryVisibility;
  href: string;
  updatedAt: string;
  lastVisitedAt: string | null;
};

export type AppShellOrganization = {
  id: string;
  slug: string;
  displayName: string;
  role: string;
  href: string;
};

export type AppShellTeam = {
  id: string;
  organizationId: string;
  organizationSlug: string;
  slug: string;
  name: string;
  role: string;
  href: string;
};

export type AppShellQuickLink = {
  label: string;
  href: string;
  kind: string;
};

export type AppShellContext = {
  user: AuthUser;
  unreadNotificationCount: number;
  recentRepositories: AppShellRepository[];
  organizations: AppShellOrganization[];
  teams: AppShellTeam[];
  quickLinks: AppShellQuickLink[];
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

export type IssueState = "open" | "closed";

export type IssueListLabel = {
  id: string;
  name: string;
  color: string;
  description: string | null;
};

export type IssueListUser = {
  id: string;
  login: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type IssueListMilestone = {
  id: string;
  title: string;
  state: IssueState;
};

export type IssueSort =
  | "updated-desc"
  | "updated-asc"
  | "created-desc"
  | "created-asc"
  | "comments-desc"
  | "comments-asc"
  | "best-match";

export type IssueListMetadataOption = {
  id: string;
  name: string;
  description: string | null;
  count: number;
  disabledReason: string | null;
};

export type LinkedPullRequestHint = {
  number: number;
  state: string;
  href: string;
};

export type IssueListItem = {
  id: string;
  repositoryId: string;
  repositoryOwner: string;
  repositoryName: string;
  number: number;
  title: string;
  body: string | null;
  state: IssueState;
  author: IssueListUser;
  labels: IssueListLabel[];
  milestone: IssueListMilestone | null;
  assignees: IssueListUser[];
  commentCount: number;
  linkedPullRequest: LinkedPullRequestHint | null;
  href: string;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type IssueListFilters = {
  query: string;
  state: IssueState;
  author: string | null;
  excludedAuthor: string | null;
  labels: string[];
  excludedLabels: string[];
  noLabels: boolean;
  milestone: string | null;
  noMilestone: boolean;
  assignee: string | null;
  noAssignee: boolean;
  project: string | null;
  issueType: string | null;
  sort: IssueSort;
};

export type IssueListPreferences = {
  dismissedContributorBanner: boolean;
  dismissedContributorBannerAt: string | null;
};

export type IssueListView = ListEnvelope<IssueListItem> & {
  openCount: number;
  closedCount: number;
  counts: {
    open: number;
    closed: number;
  };
  filters: IssueListFilters;
  filterOptions: {
    labels: IssueListLabel[];
    users: IssueListUser[];
    milestones: IssueListMilestone[];
    projects: IssueListMetadataOption[];
    issueTypes: IssueListMetadataOption[];
  };
  viewerPermission: string | null;
  repository: {
    id: string;
    ownerLogin: string;
    name: string;
    visibility: RepositoryVisibility;
  };
  preferences: IssueListPreferences;
};

export type RepositoryIssueListQuery = {
  q?: string;
  state?: IssueState;
  author?: string;
  excludedAuthor?: string;
  labels?: string[];
  excludedLabels?: string[];
  noLabels?: boolean;
  milestone?: string;
  noMilestone?: boolean;
  assignee?: string;
  noAssignee?: boolean;
  project?: string;
  issueType?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
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

export type SearchResultType =
  | "repositories"
  | "code"
  | "issues"
  | "pull_requests"
  | "commits"
  | "users"
  | "organizations"
  | "discussions";

export type SearchDocumentKind =
  | "repository"
  | "code"
  | "commit"
  | "issue"
  | "pull_request"
  | "user"
  | "organization"
  | "package";

export type SearchDocument = {
  id: string;
  repository_id: string | null;
  owner_user_id: string | null;
  owner_organization_id: string | null;
  kind: SearchDocumentKind;
  resource_id: string;
  title: string;
  body: string;
  path: string | null;
  language: string | null;
  branch: string | null;
  visibility: RepositoryVisibility;
  metadata: Record<string, unknown>;
  indexed_at: string;
  created_at: string;
  updated_at: string;
};

export type GlobalSearchResult = {
  document: SearchDocument;
  rank: number;
  type: SearchResultType | string;
  href: string;
  title: string;
  summary: string | null;
  owner_login: string | null;
  repository_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  visibility: RepositoryVisibility;
  updated_at: string;
  snippet: {
    path: string;
    branch: string;
    line_number: number | null;
    fragment: string;
    language: string | null;
    match_ranges: { start: number; end: number }[];
  } | null;
  commit: {
    oid: string;
    short_oid: string;
    message_title: string;
    message_body: string | null;
    author_login: string | null;
    committed_at: string | null;
  } | null;
};

export type GlobalSearchQuery = {
  query: string;
  type: SearchResultType | string;
  page?: number;
  pageSize?: number;
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

export async function getAppShellContextFromCookie(
  cookie: string | null | undefined,
): Promise<AppShellContext | null> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/api/app-shell`, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AppShellContext;
}

export function globalSearchPath(query: GlobalSearchQuery): string {
  const params = new URLSearchParams();
  params.set("q", query.query);
  params.set("type", query.type);
  if (query.page && query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.pageSize) {
    params.set("pageSize", String(query.pageSize));
  }
  return `/api/search?${params.toString()}`;
}

export async function searchGlobalFromCookie(
  cookie: string | null | undefined,
  query: GlobalSearchQuery,
): Promise<ListEnvelope<GlobalSearchResult> | ApiErrorEnvelope> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${globalSearchPath(query)}`, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
  } catch {
    return {
      error: {
        code: "network_error",
        message: "Search is temporarily unavailable.",
      },
      status: 503,
    };
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    return (
      (body as ApiErrorEnvelope | null) ?? {
        error: {
          code: "search_failed",
          message: "Search failed.",
        },
        status: response.status,
      }
    );
  }

  return body as ListEnvelope<GlobalSearchResult>;
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

export function repositoryIssuesPath(
  owner: string,
  repo: string,
  query: RepositoryIssueListQuery = {},
): string {
  const params = new URLSearchParams();
  if (query.q?.trim()) {
    params.set("q", query.q.trim());
  }
  if (query.state) {
    params.set("state", query.state);
  }
  if (query.author?.trim()) {
    params.set("author", query.author.trim());
  }
  if (query.excludedAuthor?.trim()) {
    params.set("excludedAuthor", query.excludedAuthor.trim());
  }
  if (query.labels?.length) {
    params.set("labels", query.labels.join(","));
  }
  if (query.excludedLabels?.length) {
    params.set("excludedLabels", query.excludedLabels.join(","));
  }
  if (query.noLabels) {
    params.set("noLabels", "true");
  }
  if (query.milestone?.trim()) {
    params.set("milestone", query.milestone.trim());
  }
  if (query.noMilestone) {
    params.set("noMilestone", "true");
  }
  if (query.assignee?.trim()) {
    params.set("assignee", query.assignee.trim());
  }
  if (query.noAssignee) {
    params.set("noAssignee", "true");
  }
  if (query.project?.trim()) {
    params.set("project", query.project.trim());
  }
  if (query.issueType?.trim()) {
    params.set("issueType", query.issueType.trim());
  }
  if (query.sort?.trim()) {
    params.set("sort", query.sort.trim());
  }
  if (query.page && query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.pageSize) {
    params.set("pageSize", String(query.pageSize));
  }
  const suffix = params.size ? `?${params.toString()}` : "";
  return `/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues${suffix}`;
}

export async function getRepositoryIssuesFromCookie(
  cookie: string | null | undefined,
  owner: string,
  repo: string,
  query: RepositoryIssueListQuery = {},
): Promise<IssueListView | ApiErrorEnvelope> {
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl()}${repositoryIssuesPath(owner, repo, query)}`,
      {
        headers: cookie ? { cookie } : undefined,
        cache: "no-store",
      },
    );
  } catch {
    return {
      error: {
        code: "network_error",
        message: "Issues are temporarily unavailable.",
      },
      status: 503,
    };
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    return (
      (body as ApiErrorEnvelope | null) ?? {
        error: {
          code: "issues_failed",
          message: "Issues could not be loaded.",
        },
        status: response.status,
      }
    );
  }

  return body as IssueListView;
}

export async function saveRepositoryIssuePreferences(
  cookie: string | null | undefined,
  owner: string,
  repo: string,
  preferences: Pick<IssueListPreferences, "dismissedContributorBanner">,
): Promise<IssueListPreferences> {
  const response = await fetch(
    `${apiBaseUrl()}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo,
    )}/issues/preferences`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(preferences),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Issue preferences failed to save");
  }

  return (await response.json()) as IssueListPreferences;
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

export async function getRepositoryPathFromCookie(
  cookie: string | null | undefined,
  owner: string,
  repo: string,
  refName: string,
  path: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<RepositoryPathOverview | null> {
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  const encodedPath = normalizedPath
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const params = new URLSearchParams({ ref: refName });
  if (options.page) {
    params.set("page", String(options.page));
  }
  if (options.pageSize) {
    params.set("pageSize", String(options.pageSize));
  }
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl()}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?${params.toString()}`,
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

  return (await response.json()) as RepositoryPathOverview;
}

export async function getRepositoryBlobFromCookie(
  cookie: string | null | undefined,
  owner: string,
  repo: string,
  refName: string,
  path: string,
): Promise<RepositoryBlobView | null> {
  const encodedPath = path
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const params = new URLSearchParams({ ref: refName });
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl()}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/blobs/${encodedPath}?${params.toString()}`,
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

  return (await response.json()) as RepositoryBlobView;
}

export async function getRepositoryBlameFromCookie(
  cookie: string | null | undefined,
  owner: string,
  repo: string,
  refName: string,
  path: string,
): Promise<RepositoryBlameView | null> {
  const encodedPath = path
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const params = new URLSearchParams({ ref: refName });
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl()}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/blame/${encodedPath}?${params.toString()}`,
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

  return (await response.json()) as RepositoryBlameView;
}

export async function getRepositoryCommitHistoryFromCookie(
  cookie: string | null | undefined,
  owner: string,
  repo: string,
  refName: string,
  path = "",
): Promise<ListEnvelope<RepositoryCommitHistoryItem> | null> {
  const params = new URLSearchParams({ ref: refName });
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  if (normalizedPath) {
    params.set("path", normalizedPath);
  }
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl()}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?${params.toString()}`,
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

  return (await response.json()) as ListEnvelope<RepositoryCommitHistoryItem>;
}

export async function getRepositoryRefsFromCookie(
  cookie: string | null | undefined,
  owner: string,
  repo: string,
  options: {
    query?: string;
    currentPath?: string;
    activeRef?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<ListEnvelope<RepositoryRefSummary> | null> {
  const params = new URLSearchParams();
  if (options.query?.trim()) {
    params.set("q", options.query.trim());
  }
  if (options.currentPath?.trim()) {
    params.set("currentPath", options.currentPath.trim());
  }
  if (options.activeRef?.trim()) {
    params.set("activeRef", options.activeRef.trim());
  }
  if (options.page) {
    params.set("page", String(options.page));
  }
  if (options.pageSize) {
    params.set("pageSize", String(options.pageSize));
  }
  const suffix = params.size ? `?${params.toString()}` : "";
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl()}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/refs${suffix}`,
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

  return (await response.json()) as ListEnvelope<RepositoryRefSummary>;
}

export async function getRepositoryFileFinderFromCookie(
  cookie: string | null | undefined,
  owner: string,
  repo: string,
  refName: string,
  query: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<RepositoryFileFinderResult | null> {
  const params = new URLSearchParams({ ref: refName });
  if (query.trim()) {
    params.set("q", query.trim());
  }
  if (options.page) {
    params.set("page", String(options.page));
  }
  if (options.pageSize) {
    params.set("pageSize", String(options.pageSize));
  }
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl()}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/file-finder?${params.toString()}`,
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

  return (await response.json()) as RepositoryFileFinderResult;
}

export async function setRepositoryStarFromCookie(
  cookie: string | null | undefined,
  owner: string,
  repo: string,
  starred: boolean,
): Promise<RepositorySocialState> {
  const response = await fetch(
    `${apiBaseUrl()}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/star`,
    {
      method: starred ? "PUT" : "DELETE",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiErrorEnvelope | null;
    throw new Error(body?.error.message ?? "Repository star update failed", {
      cause: body,
    });
  }

  return (await response.json()) as RepositorySocialState;
}

export async function setRepositoryWatchFromCookie(
  cookie: string | null | undefined,
  owner: string,
  repo: string,
  watching: boolean,
): Promise<RepositorySocialState> {
  const response = await fetch(
    `${apiBaseUrl()}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/watch`,
    {
      method: watching ? "PUT" : "DELETE",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiErrorEnvelope | null;
    throw new Error(body?.error.message ?? "Repository watch update failed", {
      cause: body,
    });
  }

  return (await response.json()) as RepositorySocialState;
}

export async function forkRepositoryFromCookie(
  cookie: string | null | undefined,
  owner: string,
  repo: string,
): Promise<RepositoryForkResult> {
  const response = await fetch(
    `${apiBaseUrl()}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/forks`,
    {
      method: "POST",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiErrorEnvelope | null;
    throw new Error(body?.error.message ?? "Repository fork failed", {
      cause: body,
    });
  }

  return (await response.json()) as RepositoryForkResult;
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
