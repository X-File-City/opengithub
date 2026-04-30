import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function SecuritySettingsPage() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <PlaceholderPage
      actions={[
        { href: "/settings/sessions", label: "Review sessions", primary: true },
        { href: "/settings/tokens", label: "Developer tokens" },
      ]}
      eyebrow="Settings"
      message="Session review, provider details, and the security log will live here. The Rust API remains authoritative for authentication and session checks."
      session={session}
      shellContext={shellContext}
      title="Security"
    />
  );
}
