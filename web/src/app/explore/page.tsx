import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/server-session";

export default async function ExplorePage() {
  const session = await getSession();

  return (
    <AppShell session={session}>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <section
          className="card p-6"
          style={{
            background: "var(--surface)",
            borderColor: "var(--line)",
          }}
        >
          <p className="t-label" style={{ color: "var(--ink-3)" }}>
            Explore repositories
          </p>
          <h1 className="t-h1 mt-2" style={{ color: "var(--ink-1)" }}>
            Find projects to follow
          </h1>
          <p
            className="mt-3 max-w-2xl t-body"
            style={{ color: "var(--ink-3)" }}
          >
            Public repository discovery will expand as repository search and
            profiles ship. For now, create a repository or use the dashboard
            sidebar to open projects you can access.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="btn primary" href="/new">
              Create repository
            </Link>
            <Link className="btn ghost" href="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
