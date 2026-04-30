import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/api";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session.authenticated || !session.user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-[#d0d7de] bg-[#24292f] px-6 py-3 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link className="text-base font-semibold" href="/dashboard">
            opengithub
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <span>{session.user.display_name ?? session.user.email}</span>
            <a className="hover:underline" href="/logout">
              Sign out
            </a>
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-sm text-[#59636e]">Signed in as</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#1f2328]">
          {session.user.display_name ?? session.user.email}
        </h1>
        <div className="mt-6 rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-5">
          <h2 className="text-base font-semibold text-[#1f2328]">
            Your repositories
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#59636e]">
            Repository creation and activity feeds arrive in the next product
            slices.
          </p>
        </div>
      </section>
    </main>
  );
}
