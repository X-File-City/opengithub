import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type RepositorySecurityPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositorySecurityPage({
  params,
}: RepositorySecurityPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[{ href: `${base}/settings`, label: "Repository settings" }]}
      activePath={`${base}/security`}
      description="Security alerts, policy checks, dependency review, and secret scanning will be connected in later security phases. The Security tab now resolves to a stable workspace skeleton."
      owner={owner}
      repo={repo}
      title="Security"
    />
  );
}
