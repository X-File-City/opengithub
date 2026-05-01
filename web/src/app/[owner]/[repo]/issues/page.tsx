import { AppShell } from "@/components/AppShell";
import { RepositoryIssuesPage as RepositoryIssuesScreen } from "@/components/RepositoryIssuesPage";
import { RepositoryUnavailablePage } from "@/components/RepositoryUnavailablePage";
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
    labels?: string;
    excludedLabels?: string;
    noLabels?: string;
    milestone?: string;
    assignee?: string;
    sort?: string;
    page?: string;
  }>;
};

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
    assignee: query.assignee,
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
      ) : (
        <RepositoryUnavailablePage owner={ownerLogin} repo={repositoryName} />
      )}
    </AppShell>
  );
}
