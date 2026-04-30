import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type PullRequestPageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
};

export default async function PullRequestPage({
  params,
}: PullRequestPageProps) {
  const { owner, repo, number } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[
        { href: `${base}/pull/${number}/files`, label: "Files changed" },
        { href: `${base}/pulls`, label: "All pull requests" },
      ]}
      activePath={`${base}/pull/${decodeURIComponent(number)}`}
      description={`Pull request #${decodeURIComponent(number)} conversations, checks, and mergeability will be connected in the pull request detail feature. This skeleton keeps review links navigable with repository context.`}
      owner={owner}
      repo={repo}
      title={`Pull request #${decodeURIComponent(number)}`}
    />
  );
}
