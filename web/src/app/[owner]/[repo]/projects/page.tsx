import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type RepositoryProjectsPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositoryProjectsPage({
  params,
}: RepositoryProjectsPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[{ href: `${base}/issues`, label: "Repository issues" }]}
      activePath={`${base}/projects`}
      description="Repository project boards and planning views are scheduled after issues and pull requests. This route keeps the workspace tab concrete."
      owner={owner}
      repo={repo}
      title="Projects"
    />
  );
}
