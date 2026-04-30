import { AppShell } from "@/components/AppShell";
import { RepositoryPlaceholderPage } from "@/components/RepositoryPlaceholderPage";
import { getSession } from "@/lib/server-session";

type ReleasesPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function ReleasesPage({ params }: ReleasesPageProps) {
  const [{ owner, repo }, session] = await Promise.all([params, getSession()]);
  return (
    <AppShell session={session}>
      <RepositoryPlaceholderPage
        description="Release publishing and asset management are scheduled for the releases feature."
        owner={decodeURIComponent(owner)}
        repo={decodeURIComponent(repo)}
        title="Releases"
      />
    </AppShell>
  );
}
