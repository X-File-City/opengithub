import { RepositorySettingsSectionPage } from "@/components/RepositorySettingsSectionPage";

type RepositorySettingsPagesPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositorySettingsPagesPage({
  params,
}: RepositorySettingsPagesPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositorySettingsSectionPage
      actions={[{ href: `${base}`, label: "Repository Code" }]}
      activeSection="pages"
      message="Static site publishing, build source selection, custom domains, and deployment status will be configured here when Pages support ships."
      owner={owner}
      repo={repo}
      title="Pages"
    />
  );
}
