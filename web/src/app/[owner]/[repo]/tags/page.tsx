import { AppShell } from "@/components/AppShell";
import { RepositoryPlaceholderPage } from "@/components/RepositoryPlaceholderPage";
import { getSession } from "@/lib/server-session";

type TagsPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function TagsPage({ params }: TagsPageProps) {
  const [{ owner, repo }, session] = await Promise.all([params, getSession()]);
  return (
    <AppShell session={session}>
      <RepositoryPlaceholderPage
        description="Tag browsing will expand when release publishing ships. The Code tab selector already resolves tag refs."
        owner={decodeURIComponent(owner)}
        repo={decodeURIComponent(repo)}
        title="Tags"
      />
    </AppShell>
  );
}
