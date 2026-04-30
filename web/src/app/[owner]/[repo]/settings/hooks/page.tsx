import { RepositorySettingsSectionPage } from "@/components/RepositorySettingsSectionPage";

type RepositorySettingsHooksPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositorySettingsHooksPage({
  params,
}: RepositorySettingsHooksPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositorySettingsSectionPage
      actions={[{ href: `${base}/settings`, label: "General settings" }]}
      activeSection="hooks"
      message="Webhook endpoints, delivery logs, retries, and secret rotation will appear here once webhook management reaches its repository settings phase."
      owner={owner}
      repo={repo}
      title="Webhooks"
    />
  );
}
