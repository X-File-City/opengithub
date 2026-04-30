import { AppShell } from "@/components/AppShell";
import { RepositoryPlaceholderPage } from "@/components/RepositoryPlaceholderPage";
import { RepositoryUnavailablePage } from "@/components/RepositoryUnavailablePage";
import { getRepository, getSessionAndShellContext } from "@/lib/server-session";

type RepositoryFeaturePageProps = {
  owner: string;
  repo: string;
  activePath: string;
  title: string;
  description: string;
  actions?: { href: string; label: string; primary?: boolean }[];
};

export async function RepositoryFeaturePage({
  owner,
  repo,
  activePath,
  title,
  description,
  actions,
}: RepositoryFeaturePageProps) {
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const { session, shellContext } = await getSessionAndShellContext();
  const repository = await getRepository(ownerLogin, repositoryName);

  return (
    <AppShell session={session} shellContext={shellContext}>
      {repository ? (
        <RepositoryPlaceholderPage
          actions={actions}
          activePath={activePath}
          description={description}
          repository={repository}
          title={title}
        />
      ) : (
        <RepositoryUnavailablePage owner={ownerLogin} repo={repositoryName} />
      )}
    </AppShell>
  );
}
