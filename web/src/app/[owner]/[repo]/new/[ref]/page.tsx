import { AppShell } from "@/components/AppShell";
import { RepositoryPlaceholderPage } from "@/components/RepositoryPlaceholderPage";
import { RepositoryUnavailablePage } from "@/components/RepositoryUnavailablePage";
import { getRepository, getSession } from "@/lib/server-session";

type NewFilePageProps = {
  params: Promise<{ owner: string; repo: string; ref: string }>;
};

export default async function NewFilePage({ params }: NewFilePageProps) {
  const [{ owner, repo, ref }, session] = await Promise.all([
    params,
    getSession(),
  ]);
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const repository = await getRepository(ownerLogin, repositoryName);
  return (
    <AppShell session={session}>
      {repository ? (
        <RepositoryPlaceholderPage
          activePath={`/${ownerLogin}/${repositoryName}`}
          description={`File creation on ${decodeURIComponent(ref)} will be implemented with the repository file editor feature. This route exists so the Code tab Add file action reaches a real destination.`}
          repository={repository}
          title="Create new file"
        />
      ) : (
        <RepositoryUnavailablePage owner={ownerLogin} repo={repositoryName} />
      )}
    </AppShell>
  );
}
