import { AppShell } from "@/components/AppShell";
import {
  RepositorySettingsPlaceholderContent,
  RepositorySettingsShell,
} from "@/components/RepositorySettingsShell";
import { RepositoryUnavailablePage } from "@/components/RepositoryUnavailablePage";
import { getRepository, getSessionAndShellContext } from "@/lib/server-session";

type RepositorySettingsSectionPageProps = {
  actions?: { href: string; label: string; primary?: boolean }[];
  activeSection: string;
  children?: React.ReactNode;
  message: string;
  owner: string;
  repo: string;
  title: string;
};

export async function RepositorySettingsSectionPage({
  actions,
  activeSection,
  children,
  message,
  owner,
  repo,
  title,
}: RepositorySettingsSectionPageProps) {
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const { session, shellContext } = await getSessionAndShellContext();
  const repository = await getRepository(ownerLogin, repositoryName);

  return (
    <AppShell session={session} shellContext={shellContext}>
      {repository ? (
        <RepositorySettingsShell
          activeSection={activeSection}
          repository={repository}
          title={title}
        >
          <RepositorySettingsPlaceholderContent
            actions={actions}
            message={message}
          >
            {children}
          </RepositorySettingsPlaceholderContent>
        </RepositorySettingsShell>
      ) : (
        <RepositoryUnavailablePage owner={ownerLogin} repo={repositoryName} />
      )}
    </AppShell>
  );
}
