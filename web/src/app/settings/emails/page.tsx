import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function EmailSettingsPage() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <PlaceholderPage
      actions={[
        {
          href: "/settings/notifications",
          label: "Notification settings",
          primary: true,
        },
        { href: "/settings/profile", label: "Profile settings" },
      ]}
      eyebrow="Settings"
      message="Email preferences will show the Google account address and delivery choices for opengithub notifications. Password and magic-link email auth remain intentionally out of scope."
      session={session}
      shellContext={shellContext}
      title="Emails"
    />
  );
}
