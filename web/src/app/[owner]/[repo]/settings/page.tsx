import { RepositorySettingsSectionPage } from "@/components/RepositorySettingsSectionPage";

type RepositorySettingsPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositorySettingsPage({
  params,
}: RepositorySettingsPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositorySettingsSectionPage
      actions={[
        { href: `${base}`, label: "Repository Code" },
        {
          href: `${base}/settings/access`,
          label: "Manage access",
          primary: true,
        },
      ]}
      activeSection="general"
      message="General repository controls will manage the repository name, visibility, default branch, and archive state. This section keeps the settings route concrete while write controls are built in the settings feature."
      owner={owner}
      repo={repo}
      title="General"
    />
  );
}
