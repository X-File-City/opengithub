import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type NewRepositoryIssuePageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function NewRepositoryIssuePage({
  params,
}: NewRepositoryIssuePageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[{ href: `${base}/issues`, label: "All issues" }]}
      activePath={`${base}/issues/new`}
      description="Issue creation will connect the existing repository issue API to a full editor in the issue creation feature. This route keeps the list action concrete."
      owner={owner}
      repo={repo}
      title="New issue"
    />
  );
}
