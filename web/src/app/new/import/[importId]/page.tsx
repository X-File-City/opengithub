import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RepositoryImportStatusPanel } from "@/components/RepositoryImportStatusPanel";
import { getRepositoryImport, getSession } from "@/lib/server-session";

type ImportStatusPageProps = {
  params: Promise<{
    importId: string;
  }>;
};

export default async function ImportStatusPage({
  params,
}: ImportStatusPageProps) {
  const { importId } = await params;
  const [session, repositoryImport] = await Promise.all([
    getSession(),
    getRepositoryImport(importId),
  ]);

  return (
    <AppShell session={session}>
      {repositoryImport ? (
        <RepositoryImportStatusPanel initialImport={repositoryImport} />
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
              Import not found
            </h1>
            <p className="mt-3 t-body" style={{ color: "var(--ink-3)" }}>
              This repository import is unavailable or belongs to another user.
            </p>
            <Link className="btn ghost mt-5" href="/new/import">
              Start another import
            </Link>
          </div>
        </section>
      )}
    </AppShell>
  );
}
