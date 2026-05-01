import { AppShell } from "@/components/AppShell";
import { RepositoryIssueDetailPage } from "@/components/RepositoryIssueDetailPage";
import { RepositoryUnavailablePage } from "@/components/RepositoryUnavailablePage";
import {
  getRepository,
  getRepositoryIssue,
  getRepositoryIssueTimeline,
  getSessionAndShellContext,
} from "@/lib/server-session";

type IssuePageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
};

export default async function IssuePage({ params }: IssuePageProps) {
  const { owner, repo, number } = await params;
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const issueNumber = Number.parseInt(decodeURIComponent(number), 10);
  const [{ session, shellContext }, repository, issue, timeline] =
    await Promise.all([
      getSessionAndShellContext(),
      getRepository(ownerLogin, repositoryName),
      Number.isFinite(issueNumber)
        ? getRepositoryIssue(ownerLogin, repositoryName, issueNumber)
        : Promise.resolve(null),
      Number.isFinite(issueNumber)
        ? getRepositoryIssueTimeline(ownerLogin, repositoryName, issueNumber)
        : Promise.resolve([]),
    ]);

  return (
    <AppShell session={session} shellContext={shellContext}>
      {repository && issue && !("error" in issue) && !("error" in timeline) ? (
        <RepositoryIssueDetailPage
          issue={issue}
          repository={repository}
          timeline={timeline}
          viewerAuthenticated={session.authenticated}
        />
      ) : (
        <RepositoryUnavailablePage owner={ownerLogin} repo={repositoryName} />
      )}
    </AppShell>
  );
}
