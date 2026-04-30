import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type RepositoryActionsPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositoryActionsPage({
  params,
}: RepositoryActionsPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[
        { href: `${base}/actions/runs/example-run`, label: "Run details" },
      ]}
      activePath={`${base}/actions`}
      description="Workflow lists, run history, logs, artifacts, and dispatch controls will be populated by the Actions feature. The Actions tab now resolves as a real repository workspace page."
      owner={owner}
      repo={repo}
      title="Actions"
    />
  );
}
