import { SettingsSectionPage } from "@/components/SettingsSectionPage";

export default async function SessionSettingsPage() {
  return (
    <SettingsSectionPage
      actions={[
        { href: "/logout", label: "Sign out", primary: true },
        { href: "/settings/security", label: "Security settings" },
      ]}
      activeSection="sessions"
      message="Active browser sessions will be listed here once session management gets its full settings surface. Sign out is available now through the shared app shell."
      title="Sessions"
    />
  );
}
