import { SettingsSectionPage } from "@/components/SettingsSectionPage";

export default async function EmailSettingsPage() {
  return (
    <SettingsSectionPage
      actions={[
        {
          href: "/settings/notifications",
          label: "Notification settings",
          primary: true,
        },
        { href: "/settings/profile", label: "Profile settings" },
      ]}
      activeSection="emails"
      message="Email preferences will show the Google account address and delivery choices for opengithub notifications. Password and magic-link email auth remain intentionally out of scope."
      title="Emails"
    />
  );
}
