import { SettingsSectionPage } from "@/components/SettingsSectionPage";

export default async function AccountSettingsPage() {
  return (
    <SettingsSectionPage
      actions={[
        { href: "/settings/profile", label: "Profile settings", primary: true },
        { href: "/dashboard", label: "Dashboard" },
      ]}
      activeSection="account"
      message="Account preferences, username controls, exports, and deletion workflows will live here. This protected placeholder keeps the settings sitemap concrete while deeper account controls are built."
      title="Account"
    />
  );
}
