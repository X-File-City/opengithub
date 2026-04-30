import { AppShell } from "@/components/AppShell";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function IssuesPage() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <AppShell session={session} shellContext={shellContext}>
      <section className="mx-auto max-w-[1240px] px-6 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="t-label" style={{ color: "var(--ink-3)" }}>
              Work queue
            </p>
            <h1 className="t-h1">Issues</h1>
          </div>
          <a className="btn" href="/dashboard">
            Dashboard
          </a>
        </div>
        <div className="card p-6">
          <p className="t-body" style={{ color: "var(--ink-2)" }}>
            Repository issue lists and filters will appear here as the issue
            workflow phases land. The global shell routes here now so navigation
            never falls through to a missing page.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
