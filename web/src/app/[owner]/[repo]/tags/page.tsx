import { AppShell } from "@/components/AppShell";
import { RepositoryPlaceholderPage } from "@/components/RepositoryPlaceholderPage";
import { RepositoryUnavailablePage } from "@/components/RepositoryUnavailablePage";
import { getRepository, getSession } from "@/lib/server-session";

type TagsPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function TagsPage({ params }: TagsPageProps) {
  const [{ owner, repo }, session] = await Promise.all([params, getSession()]);
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const repository = await getRepository(ownerLogin, repositoryName);
  return (
    <AppShell session={session}>
      {repository ? (
        <RepositoryPlaceholderPage
          activePath={`/${ownerLogin}/${repositoryName}`}
          description="Tag browsing will expand when release publishing ships. The Code tab selector already resolves tag refs."
          repository={repository}
          title="Tags"
        />
      ) : (
        <RepositoryUnavailablePage owner={ownerLogin} repo={repositoryName} />
      )}
    </AppShell>
  );
}
