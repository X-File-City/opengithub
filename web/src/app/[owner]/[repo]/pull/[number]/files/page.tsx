import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type PullRequestFilesPageProps = {
  params: Promise<{ owner: string; repo: string; number: string }>;
};

export default async function PullRequestFilesPage({
  params,
}: PullRequestFilesPageProps) {
  const { owner, repo, number } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[{ href: `${base}/pull/${number}`, label: "Conversation" }]}
      activePath={`${base}/pull/${number}/files`}
      description={`Changed files for pull request #${decodeURIComponent(number)} will appear when the pull request diff feature lands. The route already preserves repository and pull request context.`}
      owner={owner}
      repo={repo}
      title={`Pull request #${decodeURIComponent(number)} files`}
    />
  );
}
