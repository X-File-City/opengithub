import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function KeySettingsPage() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <PlaceholderPage
      actions={[
        { href: "/docs/git", label: "Read Git guide", primary: true },
        { href: "/settings/tokens", label: "Developer tokens" },
      ]}
      eyebrow="Settings"
      message="SSH and signing key management is reserved for the developer credential phases. Git over HTTPS and personal access tokens are the supported credential path first."
      session={session}
      shellContext={shellContext}
      title="Keys"
    />
  );
}
