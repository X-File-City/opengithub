import { AppShell } from "@/components/AppShell";
import { RepositoryIssuesPage as RepositoryIssuesScreen } from "@/components/RepositoryIssuesPage";
import { RepositoryUnavailablePage } from "@/components/RepositoryUnavailablePage";
import type { ApiErrorEnvelope, IssueListView, IssueSort } from "@/lib/api";
import {
  getRepository,
  getRepositoryIssues,
  getSessionAndShellContext,
} from "@/lib/server-session";

type RepositoryIssuesPageProps = {
  params: Promise<{ owner: string; repo: string }>;
  searchParams: Promise<{
    q?: string;
    state?: "open" | "closed";
    author?: string;
    excludedAuthor?: string;
    labels?: string;
    excludedLabels?: string;
    noLabels?: string;
    milestone?: string;
    noMilestone?: string;
    assignee?: string;
    noAssignee?: string;
    project?: string;
    issueType?: string;
    sort?: string;
    page?: string;
  }>;
};

const ISSUE_SORTS = new Set<IssueSort>([
  "updated-desc",
  "updated-asc",
  "created-desc",
  "created-asc",
  "comments-desc",
  "comments-asc",
  "best-match",
]);

function fallbackSort(value: string | undefined): IssueSort {
  return ISSUE_SORTS.has(value as IssueSort)
    ? (value as IssueSort)
    : "updated-desc";
}

function fallbackState(
  explicitState: "open" | "closed" | undefined,
  typedQuery: string | undefined,
) {
  if (explicitState) {
    return explicitState;
  }
  return typedQuery?.includes("state:closed") ||
    typedQuery?.includes("is:closed")
    ? "closed"
    : "open";
}

function validationFallbackIssues(
  repository: NonNullable<Awaited<ReturnType<typeof getRepository>>>,
  query: {
    q?: string;
    state?: "open" | "closed";
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
  },
): IssueListView {
  const state = fallbackState(query.state, query.q);
  return {
    items: [],
    total: 0,
    page: query.page ?? 1,
    pageSize: 30,
    openCount: 0,
    closedCount: 0,
    counts: { open: 0, closed: 0 },
    filters: {
      query: query.q?.trim() || "is:issue state:open",
      state,
      author: query.author ?? null,
      excludedAuthor: query.excludedAuthor ?? null,
      labels: query.labels ?? [],
      excludedLabels: query.excludedLabels ?? [],
      noLabels: query.noLabels ?? false,
      milestone: query.milestone ?? null,
      noMilestone: query.noMilestone ?? false,
      assignee: query.assignee ?? null,
      noAssignee: query.noAssignee ?? false,
      project: query.project ?? null,
      issueType: query.issueType ?? null,
      sort: fallbackSort(query.sort),
    },
    filterOptions: {
      labels: [],
      users: [],
      milestones: [],
      projects: [],
      issueTypes: [],
    },
    viewerPermission: repository.viewerPermission,
    repository: {
      id: repository.id,
      ownerLogin: repository.owner_login,
      name: repository.name,
      visibility: repository.visibility,
    },
    preferences: {
      dismissedContributorBanner: false,
      dismissedContributorBannerAt: null,
    },
  };
}

function isValidationError(value: unknown): value is ApiErrorEnvelope {
  return Boolean(
    value &&
      typeof value === "object" &&
      "error" in value &&
      (value as ApiErrorEnvelope).error?.code === "validation_failed",
  );
}

export default async function RepositoryIssuesPage({
  params,
  searchParams,
}: RepositoryIssuesPageProps) {
  const [{ owner, repo }, query, { session, shellContext }] = await Promise.all(
    [params, searchParams, getSessionAndShellContext()],
  );
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const page = Number.parseInt(query.page ?? "1", 10);
  const issueQuery = {
    q: query.q,
    state: query.state,
    author: query.author,
    excludedAuthor: query.excludedAuthor,
    labels: query.labels
      ?.split(",")
      .map((label) => label.trim())
      .filter(Boolean),
    excludedLabels: query.excludedLabels
      ?.split(",")
      .map((label) => label.trim())
      .filter(Boolean),
    noLabels: query.noLabels === "true",
    milestone: query.milestone,
    noMilestone: query.noMilestone === "true",
    assignee: query.assignee,
    noAssignee: query.noAssignee === "true",
    project: query.project,
    issueType: query.issueType,
    sort: query.sort,
    page: Number.isFinite(page) ? page : 1,
  };
  const [repository, issues] = await Promise.all([
    getRepository(ownerLogin, repositoryName),
    getRepositoryIssues(ownerLogin, repositoryName, issueQuery),
  ]);

  return (
    <AppShell session={session} shellContext={shellContext}>
      {repository && issues && !("error" in issues) ? (
        <RepositoryIssuesScreen
          issues={issues}
          query={issueQuery}
          repository={repository}
        />
      ) : repository && isValidationError(issues) ? (
        <RepositoryIssuesScreen
          issues={validationFallbackIssues(repository, issueQuery)}
          query={issueQuery}
          repository={repository}
          validationError={issues}
        />
      ) : (
        <RepositoryUnavailablePage owner={ownerLogin} repo={repositoryName} />
      )}
    </AppShell>
  );
}
