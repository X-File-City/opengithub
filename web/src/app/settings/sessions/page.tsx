import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function SessionSettingsPage() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <PlaceholderPage
      actions={[
        { href: "/logout", label: "Sign out", primary: true },
        { href: "/settings/security", label: "Security settings" },
      ]}
      eyebrow="Settings"
      message="Active browser sessions will be listed here once session management gets its full settings surface. Sign out is available now through the shared app shell."
      session={session}
      shellContext={shellContext}
      title="Sessions"
    />
  );
}
