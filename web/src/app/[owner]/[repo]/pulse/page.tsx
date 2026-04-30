import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type RepositoryPulsePageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositoryPulsePage({
  params,
}: RepositoryPulsePageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[{ href: `${base}/commits/main`, label: "Commit history" }]}
      activePath={`${base}/pulse`}
      description="Repository activity, contributors, forks, traffic, and dependency insights will land after the collaboration data model is complete."
      owner={owner}
      repo={repo}
      title="Insights"
    />
  );
}
