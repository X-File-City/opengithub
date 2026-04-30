import { PlaceholderPage } from "@/components/PlaceholderPage";
import { organizationHref, organizationProjectHref } from "@/lib/navigation";
import { getSessionAndShellContext } from "@/lib/server-session";

type OrganizationSettingsPageProps = {
  params: Promise<{ org: string }>;
};

export default async function OrganizationSettingsPage({
  params,
}: OrganizationSettingsPageProps) {
  const [{ org }, { session, shellContext }] = await Promise.all([
    params,
    getSessionAndShellContext(),
  ]);
  const orgLogin = decodeURIComponent(org);

  return (
    <PlaceholderPage
      actions={[
        { href: organizationHref(orgLogin), label: "Organization profile" },
        { href: organizationProjectHref(orgLogin), label: "Projects" },
      ]}
      eyebrow="Organization settings"
      message={`Organization settings for ${orgLogin} will manage members, teams, billing-free policies, and repository defaults once the settings feature lands.`}
      session={session}
      shellContext={shellContext}
      title={`${orgLogin} settings`}
    />
  );
}
