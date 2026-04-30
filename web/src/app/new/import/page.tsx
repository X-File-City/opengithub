import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RepositoryImportForm } from "@/components/RepositoryImportForm";
import {
  getRepositoryCreationOptions,
  getSessionAndShellContext,
} from "@/lib/server-session";

export default async function ImportRepositoryPage() {
  const [{ session, shellContext }, options] = await Promise.all([
    getSessionAndShellContext(),
    getRepositoryCreationOptions(),
  ]);

  return (
    <AppShell session={session} shellContext={shellContext}>
      {options ? (
        <RepositoryImportForm options={options} />
      ) : (
        <section className="mx-auto max-w-3xl px-6 py-8">
          <div
            className="card p-6"
            style={{
              background: "var(--surface)",
              borderColor: "var(--line)",
            }}
          >
            <h1 className="t-h1" style={{ color: "var(--ink-1)" }}>
              Import your project to opengithub
            </h1>
            <p className="mt-3 t-body" style={{ color: "var(--ink-3)" }}>
              Repository import options could not be loaded. Sign in again or
              retry after the API is available.
            </p>
            <Link className="btn ghost mt-5" href="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </section>
      )}
    </AppShell>
  );
}
