import { DeveloperTokensPage } from "@/components/DeveloperTokensPage";
import { SettingsShell } from "@/components/SettingsShell";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function SettingsTokensRoute() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <SettingsShell
      activeSection="tokens"
      eyebrow="Developer settings"
      session={session}
      shellContext={shellContext}
      title="Personal access tokens"
    >
      <DeveloperTokensPage showHeading={false} />
    </SettingsShell>
  );
}
