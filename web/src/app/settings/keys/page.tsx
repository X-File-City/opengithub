import { SettingsSectionPage } from "@/components/SettingsSectionPage";

export default async function KeySettingsPage() {
  return (
    <SettingsSectionPage
      actions={[
        { href: "/docs/git", label: "Read Git guide", primary: true },
        { href: "/settings/tokens", label: "Developer tokens" },
      ]}
      activeSection="keys"
      message="SSH and signing key management is reserved for the developer credential phases. Git over HTTPS and personal access tokens are the supported credential path first."
      title="Keys"
    />
  );
}
