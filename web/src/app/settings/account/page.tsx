import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function AccountSettingsPage() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <PlaceholderPage
      actions={[
        { href: "/settings/profile", label: "Profile settings", primary: true },
        { href: "/dashboard", label: "Dashboard" },
      ]}
      eyebrow="Settings"
      message="Account preferences, username controls, exports, and deletion workflows will live here. This protected placeholder keeps the settings sitemap concrete while deeper account controls are built."
      session={session}
      shellContext={shellContext}
      title="Account"
    />
  );
}
