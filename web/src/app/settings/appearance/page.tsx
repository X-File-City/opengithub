import { SettingsSectionPage } from "@/components/SettingsSectionPage";

export default async function AppearanceSettingsPage() {
  return (
    <SettingsSectionPage
      actions={[
        { href: "/dashboard", label: "Preview dashboard", primary: true },
        { href: "/settings/profile", label: "Profile settings" },
      ]}
      activeSection="appearance"
      message="Theme and accessibility preferences will be managed here. The Editorial light theme remains the locked default until theme switching is built."
      title="Appearance"
    />
  );
}
