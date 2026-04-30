import { AppShell } from "@/components/AppShell";
import { RepositoryPlaceholderPage } from "@/components/RepositoryPlaceholderPage";
import { RepositoryUnavailablePage } from "@/components/RepositoryUnavailablePage";
import { getRepository, getSession } from "@/lib/server-session";

type ReleasesPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function ReleasesPage({ params }: ReleasesPageProps) {
  const [{ owner, repo }, session] = await Promise.all([params, getSession()]);
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const repository = await getRepository(ownerLogin, repositoryName);
  return (
    <AppShell session={session}>
      {repository ? (
        <RepositoryPlaceholderPage
          activePath={`/${ownerLogin}/${repositoryName}`}
          description="Release publishing and asset management are scheduled for the releases feature."
          repository={repository}
          title="Releases"
        />
      ) : (
        <RepositoryUnavailablePage owner={ownerLogin} repo={repositoryName} />
      )}
    </AppShell>
  );
}
