import { AppShell } from "@/components/AppShell";
import { RepositoryPlaceholderPage } from "@/components/RepositoryPlaceholderPage";
import { getSession } from "@/lib/server-session";

type DeploymentsPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function DeploymentsPage({
  params,
}: DeploymentsPageProps) {
  const [{ owner, repo }, session] = await Promise.all([params, getSession()]);
  return (
    <AppShell session={session}>
      <RepositoryPlaceholderPage
        description="Deployment history will be populated by Actions and Pages features."
        owner={decodeURIComponent(owner)}
        repo={decodeURIComponent(repo)}
        title="Deployments"
      />
    </AppShell>
  );
}
