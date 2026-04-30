import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type RepositoryPullsPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositoryPullsPage({
  params,
}: RepositoryPullsPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[
        { href: `${base}/pull/1`, label: "Open pull request detail" },
        { href: "/pulls", label: "Global pull requests" },
      ]}
      activePath={`${base}/pulls`}
      description="Repository pull request lists, review filters, and compare/create flows will be connected in the pull request feature. This skeleton keeps review navigation anchored to the repository."
      owner={owner}
      repo={repo}
      title="Pull requests"
    />
  );
}
