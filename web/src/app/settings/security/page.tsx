import { SettingsSectionPage } from "@/components/SettingsSectionPage";

export default async function SecuritySettingsPage() {
  return (
    <SettingsSectionPage
      actions={[
        { href: "/settings/sessions", label: "Review sessions", primary: true },
        { href: "/settings/tokens", label: "Developer tokens" },
      ]}
      activeSection="security"
      message="Session review, provider details, and the security log will live here. The Rust API remains authoritative for authentication and session checks."
      title="Security"
    />
  );
}
