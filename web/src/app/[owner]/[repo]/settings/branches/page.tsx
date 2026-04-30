import { RepositorySettingsSectionPage } from "@/components/RepositorySettingsSectionPage";

type RepositorySettingsBranchesPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositorySettingsBranchesPage({
  params,
}: RepositorySettingsBranchesPageProps) {
  const { owner, repo } = await params;
  const base = `/${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`;

  return (
    <RepositorySettingsSectionPage
      actions={[
        { href: `${base}/branches`, label: "View branches", primary: true },
      ]}
      activeSection="branches"
      message="Default branch updates and branch protection rules will be configured here once the repository settings write APIs are connected."
      owner={owner}
      repo={repo}
      title="Branches"
    />
  );
}
