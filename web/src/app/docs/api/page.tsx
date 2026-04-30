import { ApiDocsPage } from "@/components/ApiDocsPage";
import { AppShell } from "@/components/AppShell";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function RestApiDocsPage() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <AppShell session={session} shellContext={shellContext}>
      <ApiDocsPage />
    </AppShell>
  );
}
