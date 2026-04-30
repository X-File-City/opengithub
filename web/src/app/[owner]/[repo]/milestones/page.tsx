import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type RepositoryMilestonesPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositoryMilestonesPage({
  params,
}: RepositoryMilestonesPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[{ href: `${base}/issues`, label: "Repository issues" }]}
      activePath={`${base}/issues`}
      description="Milestone planning is scheduled for the dedicated milestones feature. This route keeps issue filters and navigation reachable."
      owner={owner}
      repo={repo}
      title="Milestones"
    />
  );
}
