import { RepositorySettingsSectionPage } from "@/components/RepositorySettingsSectionPage";

type RepositorySettingsSecurityPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositorySettingsSecurityPage({
  params,
}: RepositorySettingsSecurityPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositorySettingsSectionPage
      actions={[
        { href: `${base}/security`, label: "Security overview", primary: true },
      ]}
      activeSection="security"
      message="Repository security analysis, alert policy, and audit controls will be configured here while the Security tab remains the read surface."
      owner={owner}
      repo={repo}
      title="Security analysis"
    />
  );
}
