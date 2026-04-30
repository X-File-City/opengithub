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
  assignedIssues: DashboardIssueSummary[];
  reviewRequests: DashboardReviewRequest[];
  dismissedHints: DashboardHintDismissal[];
};

export type DashboardActivityItem = {
  id: string;
  kind: "repository" | "commit" | "issue" | "pull_request" | string;
  title: string;
  repositoryName: string;
  repositoryHref: string;
  href: string;
  occurredAt: string;
  description: string | null;
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

export async function getDashboardSummaryFromCookie(
  cookie: string | null | undefined,
): Promise<DashboardSummary | null> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/api/dashboard`, {
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

export async function getRepositoryFromCookie(
  cookie: string | null | undefined,
  owner: string,
  repo: string,
): Promise<RepositorySummary | null> {
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

  return (await response.json()) as RepositorySummary;
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
