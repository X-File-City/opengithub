import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/server-session";

export default async function NewRepositoryPage() {
  const session = await getSession();

  return (
    <AppShell session={session}>
      <section className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-md border border-[#d0d7de] bg-white p-6">
          <p className="text-sm font-semibold text-[#59636e]">New repository</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-[#1f2328]">
            Create your first repository
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#59636e]">
            Repository creation is wired through the Rust API and will receive
            its full form in the repository creation feature. This page gives
            dashboard onboarding a real destination today.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
              href="/new/import"
            >
              Import repository
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
