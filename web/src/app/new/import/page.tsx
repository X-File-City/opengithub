import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/server-session";

export default async function ImportRepositoryPage() {
  const session = await getSession();

  return (
    <AppShell session={session}>
      <section className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-md border border-[#d0d7de] bg-white p-6">
          <p className="text-sm font-semibold text-[#59636e]">
            Import repository
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-[#1f2328]">
            Bring an existing project into opengithub
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#59636e]">
            Repository import is reserved for a later build slice. Create a new
            repository now, then add remote import support when Git ingestion
            lands.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-9 items-center rounded-md bg-[#1f883d] px-4 text-sm font-semibold text-white hover:bg-[#1a7f37]"
              href="/new"
            >
              Create repository
            </Link>
            <Link
              className="inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
              href="/dashboard"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
