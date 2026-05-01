import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type RepositoryComparePageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositoryComparePage({
  params,
}: RepositoryComparePageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[{ href: `${base}/pulls`, label: "Back to pull requests" }]}
      activePath={`${base}/pulls`}
      description="Choose branches and review changed commits before opening a pull request. The full compare workflow lands in the pull request creation feature; this route keeps the New pull request action concrete."
      owner={owner}
      repo={repo}
      title="Compare changes"
    />
  );
}
