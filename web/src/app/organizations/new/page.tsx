import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function NewOrganizationPage() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <PlaceholderPage
      actions={[
        { href: "/new", label: "Create repository" },
        { href: "/settings/profile", label: "Profile settings" },
      ]}
      eyebrow="Organization"
      message="Organization creation will collect a slug, display name, owner role, and initial team membership once organization write flows are built. This protected destination is available now from create navigation."
      session={session}
      shellContext={shellContext}
      title="Create a new organization"
    />
  );
}
