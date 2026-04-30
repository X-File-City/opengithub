import { AppShell } from "@/components/AppShell";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function ProfileSettingsPage() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <AppShell session={session} shellContext={shellContext}>
      <section className="mx-auto max-w-[900px] px-6 py-8">
        <div className="mb-6">
          <p className="t-label" style={{ color: "var(--ink-3)" }}>
            Settings
          </p>
          <h1 className="t-h1">Profile</h1>
        </div>
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
      </section>
    </AppShell>
  );
}
