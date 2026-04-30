import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function NotificationSettingsPage() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <PlaceholderPage
      actions={[
        { href: "/notifications", label: "Open inbox", primary: true },
        { href: "/settings/emails", label: "Email settings" },
      ]}
      eyebrow="Settings"
      message="Web and email notification preferences will appear here after notification delivery and subscription controls are connected."
      session={session}
      shellContext={shellContext}
      title="Notifications"
    />
  );
}
