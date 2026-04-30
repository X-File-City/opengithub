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
          <div className="rounded-md border border-[#d0d7de] bg-white p-6">
            <h1 className="text-2xl font-semibold tracking-normal text-[#1f2328]">
              Import not found
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#59636e]">
              This repository import is unavailable or belongs to another user.
            </p>
            <Link
              className="mt-5 inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
              href="/new/import"
            >
              Start another import
            </Link>
          </div>
        </section>
      )}
    </AppShell>
  );
}
