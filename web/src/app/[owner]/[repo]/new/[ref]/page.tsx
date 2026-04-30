import { AppShell } from "@/components/AppShell";
import { RepositoryPlaceholderPage } from "@/components/RepositoryPlaceholderPage";
import { getSession } from "@/lib/server-session";

type NewFilePageProps = {
  params: Promise<{ owner: string; repo: string; ref: string }>;
};

export default async function NewFilePage({ params }: NewFilePageProps) {
  const [{ owner, repo, ref }, session] = await Promise.all([
    params,
    getSession(),
  ]);
  return (
    <AppShell session={session}>
      <RepositoryPlaceholderPage
        description={`File creation on ${decodeURIComponent(ref)} will be implemented with the repository file editor feature. This route exists so the Code tab Add file action reaches a real destination.`}
        owner={decodeURIComponent(owner)}
        repo={decodeURIComponent(repo)}
        title="Create new file"
      />
    </AppShell>
  );
}
