import { PlaceholderPage } from "@/components/PlaceholderPage";
import { organizationHref, organizationSettingsHref } from "@/lib/navigation";
import { getSessionAndShellContext } from "@/lib/server-session";

type TeamPageProps = {
  params: Promise<{ org: string; teamSlug: string }>;
};

export default async function TeamPage({ params }: TeamPageProps) {
  const [{ org, teamSlug }, { session, shellContext }] = await Promise.all([
    params,
    getSessionAndShellContext(),
  ]);
  const orgLogin = decodeURIComponent(org);
  const teamName = decodeURIComponent(teamSlug);

  return (
    <PlaceholderPage
      actions={[
        { href: organizationHref(orgLogin), label: "Organization profile" },
        {
          href: organizationSettingsHref(orgLogin),
          label: "Organization settings",
        },
      ]}
      eyebrow="Team"
      message={`${teamName} in ${orgLogin} will show members, repositories, discussions, and access policy when team management is implemented. The team URL is concrete now for app-shell organization links.`}
      session={session}
      shellContext={shellContext}
      title={`${orgLogin} / ${teamName}`}
    />
  );
}
