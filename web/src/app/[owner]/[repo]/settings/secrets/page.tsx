import { RepositorySettingsSectionPage } from "@/components/RepositorySettingsSectionPage";

type RepositorySettingsSecretsPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositorySettingsSecretsPage({
  params,
}: RepositorySettingsSecretsPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositorySettingsSectionPage
      actions={[{ href: `${base}/settings/actions`, label: "Actions policy" }]}
      activeSection="secrets"
      message="Actions secrets and environment variables will be managed here with Rust API authorization and audit logging."
      owner={owner}
      repo={repo}
      title="Secrets"
    />
  );
}
