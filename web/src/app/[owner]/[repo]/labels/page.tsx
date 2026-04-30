import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type RepositoryLabelsPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositoryLabelsPage({
  params,
}: RepositoryLabelsPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[{ href: `${base}/issues`, label: "Repository issues" }]}
      activePath={`${base}/issues`}
      description="Repository label management is scheduled for the dedicated labels feature. This route keeps issue filters and navigation reachable."
      owner={owner}
      repo={repo}
      title="Labels"
    />
  );
}
