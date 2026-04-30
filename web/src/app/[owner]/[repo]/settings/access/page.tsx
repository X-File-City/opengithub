import { RepositorySettingsSectionPage } from "@/components/RepositorySettingsSectionPage";

type RepositorySettingsAccessPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositorySettingsAccessPage({
  params,
}: RepositorySettingsAccessPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositorySettingsSectionPage
      actions={[{ href: `${base}/settings`, label: "General settings" }]}
      activeSection="access"
      message="Collaborator invitations, team grants, and permission reviews will live here. Repository access still flows through the Rust permission model before these write controls ship."
      owner={owner}
      repo={repo}
      title="Access"
    />
  );
}
