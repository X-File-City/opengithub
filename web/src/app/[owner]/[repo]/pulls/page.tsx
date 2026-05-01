import { AppShell } from "@/components/AppShell";
import { RepositoryPullsPage as RepositoryPullsScreen } from "@/components/RepositoryPullsPage";
import { RepositoryUnavailablePage } from "@/components/RepositoryUnavailablePage";
import type {
  ApiErrorEnvelope,
  PullRequestListView,
  PullRequestSort,
} from "@/lib/api";
import {
  getRepository,
  getRepositoryPullRequests,
  getSessionAndShellContext,
} from "@/lib/server-session";

type RepositoryPullsPageProps = {
  params: Promise<{ owner: string; repo: string }>;
  searchParams: Promise<{
    q?: string;
    state?: "open" | "closed" | "merged";
    author?: string;
    labels?: string;
    milestone?: string;
    noMilestone?: string;
    assignee?: string;
    noAssignee?: string;
    project?: string;
    review?: string;
    checks?: string;
    sort?: string;
    page?: string;
  }>;
};

const PULL_SORTS = new Set<PullRequestSort>([
  "updated-desc",
  "updated-asc",
  "created-desc",
  "created-asc",
  "comments-desc",
  "comments-asc",
]);

function fallbackSort(value: string | undefined): PullRequestSort {
  return PULL_SORTS.has(value as PullRequestSort)
    ? (value as PullRequestSort)
    : "updated-desc";
}

function fallbackState(
  explicitState: "open" | "closed" | "merged" | undefined,
  typedQuery: string | undefined,
) {
  if (explicitState) {
    return explicitState;
  }
  if (
    typedQuery?.includes("state:merged") ||
    typedQuery?.includes("is:merged")
  ) {
    return "merged";
  }
  if (
    typedQuery?.includes("state:closed") ||
    typedQuery?.includes("is:closed")
  ) {
    return "closed";
  }
  return "open";
}

function validationFallbackPulls(
  repository: NonNullable<Awaited<ReturnType<typeof getRepository>>>,
  query: {
    q?: string;
    state?: "open" | "closed" | "merged";
    author?: string;
    labels?: string[];
    milestone?: string;
    noMilestone?: boolean;
    assignee?: string;
    noAssignee?: boolean;
    project?: string;
    review?: string;
    checks?: string;
    sort?: string;
    page?: number;
  },
): PullRequestListView {
  const state = fallbackState(query.state, query.q);
  return {
    items: [],
    total: 0,
    page: query.page ?? 1,
    pageSize: 30,
    openCount: 0,
    closedCount: 0,
    mergedCount: 0,
    counts: { open: 0, closed: 0, merged: 0 },
    filters: {
      query: query.q?.trim() || "is:pr is:open",
      state,
      author: query.author ?? null,
      labels: query.labels ?? [],
      milestone: query.milestone ?? null,
      noMilestone: query.noMilestone ?? false,
      assignee: query.assignee ?? null,
      noAssignee: query.noAssignee ?? false,
      project: query.project ?? null,
      review: query.review ?? null,
      checks: query.checks ?? null,
      sort: fallbackSort(query.sort),
    },
    filterOptions: {
      labels: [],
      users: [],
      milestones: [],
      projects: [
        {
          id: "projects-unavailable",
          name: "No repository projects",
          description: "Project links are not modeled for pull requests yet.",
          count: 0,
          disabledReason:
            "Project filters will activate when project links exist.",
        },
      ],
      reviewStates: [],
      checkStates: [],
      sortOptions: [],
    },
    viewerPermission: repository.viewerPermission,
    repository: {
      id: repository.id,
      ownerLogin: repository.owner_login,
      name: repository.name,
      visibility: repository.visibility,
      defaultBranch: repository.default_branch,
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

export default async function RepositoryPullsPage({
  params,
  searchParams,
}: RepositoryPullsPageProps) {
  const [{ owner, repo }, query, { session, shellContext }] = await Promise.all(
    [params, searchParams, getSessionAndShellContext()],
  );
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const page = Number.parseInt(query.page ?? "1", 10);
  const pullQuery = {
    q: query.q,
    state: query.state,
    author: query.author,
    labels: query.labels
      ?.split(",")
      .map((label) => label.trim())
      .filter(Boolean),
    milestone: query.milestone,
    noMilestone: query.noMilestone === "true",
    assignee: query.assignee,
    noAssignee: query.noAssignee === "true",
    project: query.project,
    review: query.review,
    checks: query.checks,
    sort: query.sort,
    page: Number.isFinite(page) ? page : 1,
  };
  const [repository, pulls] = await Promise.all([
    getRepository(ownerLogin, repositoryName),
    getRepositoryPullRequests(ownerLogin, repositoryName, pullQuery),
  ]);

  return (
    <AppShell session={session} shellContext={shellContext}>
      {repository && pulls && !("error" in pulls) ? (
        <RepositoryPullsScreen
          pulls={pulls}
          query={pullQuery}
          repository={repository}
        />
      ) : repository && isValidationError(pulls) ? (
        <RepositoryPullsScreen
          pulls={validationFallbackPulls(repository, pullQuery)}
          query={pullQuery}
          repository={repository}
          validationError={pulls}
        />
      ) : (
        <RepositoryUnavailablePage owner={ownerLogin} repo={repositoryName} />
      )}
    </AppShell>
  );
}
