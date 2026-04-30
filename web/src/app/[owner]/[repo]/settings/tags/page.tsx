import { RepositorySettingsSectionPage } from "@/components/RepositorySettingsSectionPage";

type RepositorySettingsTagsPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositorySettingsTagsPage({
  params,
}: RepositorySettingsTagsPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositorySettingsSectionPage
      actions={[{ href: `${base}/tags`, label: "View tags", primary: true }]}
      activeSection="tags"
      message="Protected tags and release rules will live here after the repository governance settings API is built."
      owner={owner}
      repo={repo}
      title="Tags"
    />
  );
}
