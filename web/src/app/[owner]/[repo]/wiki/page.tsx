import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type RepositoryWikiPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositoryWikiPage({
  params,
}: RepositoryWikiPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[{ href: `${base}`, label: "Repository Code" }]}
      activePath={`${base}/wiki`}
      description="Wiki pages will be implemented after the core repository collaboration workflows. This placeholder keeps the tab route available without pretending content exists."
      owner={owner}
      repo={repo}
      title="Wiki"
    />
  );
}
