import { AppShell } from "@/components/AppShell";
import { DeveloperTokensPage } from "@/components/DeveloperTokensPage";
import { getSession } from "@/lib/server-session";

export default async function SettingsTokensRoute() {
  const session = await getSession();

  return (
    <AppShell session={session}>
      <DeveloperTokensPage />
    </AppShell>
  );
}
