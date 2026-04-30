import { SettingsSectionPage } from "@/components/SettingsSectionPage";

export default async function NotificationSettingsPage() {
  return (
    <SettingsSectionPage
      actions={[
        { href: "/notifications", label: "Open inbox", primary: true },
        { href: "/settings/emails", label: "Email settings" },
      ]}
      activeSection="notifications"
      message="Web and email notification preferences will appear here after notification delivery and subscription controls are connected."
      title="Notifications"
    />
  );
}
