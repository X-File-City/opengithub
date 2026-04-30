import { AppShell } from "@/components/AppShell";
import { DeveloperTokensPage } from "@/components/DeveloperTokensPage";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function SettingsTokensRoute() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <AppShell session={session} shellContext={shellContext}>
      <DeveloperTokensPage />
    </AppShell>
  );
}
