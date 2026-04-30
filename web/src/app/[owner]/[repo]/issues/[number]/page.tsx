import { RepositoryFeaturePage } from "@/components/RepositoryFeaturePage";

type IssuePageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
};

export default async function IssuePage({ params }: IssuePageProps) {
  const { owner, repo, number } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositoryFeaturePage
      actions={[
        { href: `${base}/issues`, label: "All issues" },
        { href: "/issues", label: "Global issues" },
      ]}
      activePath={`${base}/issues/${decodeURIComponent(number)}`}
      description={`Issue #${decodeURIComponent(number)} timelines, comments, labels, and state controls are coming in the issue detail feature. This route keeps activity links navigable with repository context.`}
      owner={owner}
      repo={repo}
      title={`Issue #${decodeURIComponent(number)}`}
    />
  );
}
