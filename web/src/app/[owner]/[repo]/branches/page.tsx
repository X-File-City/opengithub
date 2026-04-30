import { AppShell } from "@/components/AppShell";
import { RepositoryPlaceholderPage } from "@/components/RepositoryPlaceholderPage";
import { getSession } from "@/lib/server-session";

type BranchesPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function BranchesPage({ params }: BranchesPageProps) {
  const [{ owner, repo }, session] = await Promise.all([params, getSession()]);
  return (
    <AppShell session={session}>
      <RepositoryPlaceholderPage
        description="Branch protection and branch management are scheduled for a later repository settings feature."
        owner={decodeURIComponent(owner)}
        repo={decodeURIComponent(repo)}
        title="Branches"
      />
    </AppShell>
  );
}
