import { RepositorySettingsSectionPage } from "@/components/RepositorySettingsSectionPage";

type RepositorySettingsActionsPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositorySettingsActionsPage({
  params,
}: RepositorySettingsActionsPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositorySettingsSectionPage
      actions={[
        { href: `${base}/actions`, label: "Open Actions", primary: true },
      ]}
      activeSection="actions"
      message="Workflow permissions, runner policy, and artifact retention controls will be managed here after the Actions settings surface is implemented."
      owner={owner}
      repo={repo}
      title="Actions"
    />
  );
}
