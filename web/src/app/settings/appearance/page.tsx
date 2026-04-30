import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function AppearanceSettingsPage() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <PlaceholderPage
      actions={[
        { href: "/dashboard", label: "Preview dashboard", primary: true },
        { href: "/settings/profile", label: "Profile settings" },
      ]}
      eyebrow="Settings"
      message="Theme and accessibility preferences will be managed here. The Editorial light theme remains the locked default until theme switching is built."
      session={session}
      shellContext={shellContext}
      title="Appearance"
    />
  );
}
