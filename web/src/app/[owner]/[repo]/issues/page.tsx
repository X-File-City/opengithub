import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type RepositoryIssuesPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositoryIssuesPage({
  params,
}: RepositoryIssuesPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[
        { href: `${base}/issues/1`, label: "Open issue detail" },
        { href: "/issues", label: "Global issues" },
      ]}
      activePath={`${base}/issues`}
      description="Repository issue lists, filters, labels, milestones, and create flows will be connected in the issues feature. This skeleton keeps issue navigation anchored to the repository."
      owner={owner}
      repo={repo}
      title="Issues"
    />
  );
}
