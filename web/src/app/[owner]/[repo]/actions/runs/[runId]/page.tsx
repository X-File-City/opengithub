import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type ActionRunPageProps = {
  params: Promise<{ owner: string; repo: string; runId: string }>;
};

export default async function ActionRunPage({ params }: ActionRunPageProps) {
  const { owner, repo, runId } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[{ href: `${base}/actions`, label: "All workflow runs" }]}
      activePath={`${base}/actions/runs/${decodeURIComponent(runId)}`}
      description={`Workflow run ${decodeURIComponent(runId)} logs, jobs, and artifacts will appear when the Actions detail feature lands.`}
      owner={owner}
      repo={repo}
      title="Workflow run"
    />
  );
}
