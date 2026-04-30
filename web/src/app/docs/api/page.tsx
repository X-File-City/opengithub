import { ApiDocsPage } from "@/components/ApiDocsPage";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/server-session";

export default async function RestApiDocsPage() {
  const session = await getSession();

  return (
    <AppShell session={session}>
      <ApiDocsPage />
    </AppShell>
  );
}
