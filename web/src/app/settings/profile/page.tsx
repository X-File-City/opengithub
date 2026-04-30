import { SettingsShell } from "@/components/SettingsShell";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function ProfileSettingsPage() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <SettingsShell
      activeSection="profile"
      session={session}
      shellContext={shellContext}
      title="Profile"
    >
      <div className="card p-6">
        <dl className="grid gap-4 t-sm">
          <div>
            <dt className="t-label" style={{ color: "var(--ink-3)" }}>
              Display name
            </dt>
            <dd>{session.user?.display_name ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="t-label" style={{ color: "var(--ink-3)" }}>
              Email
            </dt>
            <dd>{session.user?.email ?? "Unknown"}</dd>
          </div>
        </dl>
      </div>
    </SettingsShell>
  );
}
