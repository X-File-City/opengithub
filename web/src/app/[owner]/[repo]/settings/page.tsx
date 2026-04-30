import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type RepositorySettingsPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositorySettingsPage({
  params,
}: RepositorySettingsPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[{ href: `${base}`, label: "Repository Code" }]}
      activePath={`${base}/settings`}
      description="Repository settings sections will be expanded in the settings shell phase. For now this route confirms admin navigation has a concrete workspace destination."
      owner={owner}
      repo={repo}
      title="Settings"
    />
  );
}
