import { PlaceholderPage } from "@/components/PlaceholderPage";
import { organizationHref, organizationSettingsHref } from "@/lib/navigation";
import { getSessionAndShellContext } from "@/lib/server-session";

type OrganizationProjectsPageProps = {
  params: Promise<{ org: string }>;
};

export default async function OrganizationProjectsPage({
  params,
}: OrganizationProjectsPageProps) {
  const [{ org }, { session, shellContext }] = await Promise.all([
    params,
    getSessionAndShellContext(),
  ]);
  const orgLogin = decodeURIComponent(org);

  return (
    <PlaceholderPage
      actions={[
        { href: organizationHref(orgLogin), label: "Organization profile" },
        { href: organizationSettingsHref(orgLogin), label: "Settings" },
      ]}
      eyebrow="Organization projects"
      message={`Project boards for ${orgLogin} will appear here after organization planning features are built. This route keeps project links concrete.`}
      session={session}
      shellContext={shellContext}
      title={`${orgLogin} projects`}
    />
  );
}
