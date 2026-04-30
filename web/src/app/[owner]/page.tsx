import { ProfileOrgShell } from "@/components/ProfileOrgShell";
import {
  activeProfileTab,
  PROFILE_TABS,
  profileTabHref,
} from "@/lib/navigation";
import { getSessionAndShellContext } from "@/lib/server-session";

type ProfilePageProps = {
  params: Promise<{ owner: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProfilePage({
  params,
  searchParams,
}: ProfilePageProps) {
  const [{ owner }, queryParams, { session, shellContext }] = await Promise.all(
    [params, searchParams, getSessionAndShellContext()],
  );
  const ownerLogin = decodeURIComponent(owner);
  const activeTab = activeProfileTab(firstParam(queryParams?.tab));
  const activeTabLabel =
    PROFILE_TABS.find((tab) => tab.value === activeTab)?.label ?? "Overview";

  return (
    <ProfileOrgShell
      activeTab={activeTab}
      eyebrow="Profile"
      hrefForTab={(value) => profileTabHref(ownerLogin, value)}
      identityLabel={ownerLogin}
      message={`${activeTabLabel} for ${ownerLogin} will connect to profile repositories, stars, packages, and activity once the profile data APIs land. This route is concrete now so owner links never fall through to a 404.`}
      session={session}
      shellContext={shellContext}
      tabLabel="Profile sections"
      tabs={PROFILE_TABS}
      title={ownerLogin}
    />
  );
}
