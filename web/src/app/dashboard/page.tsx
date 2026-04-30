import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/server-session";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session.authenticated || !session.user) {
    return (
      <AppShell session={session}>
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div
            className="rounded-md border border-[#f1aeb5] bg-[#fff1f3] px-4 py-3 text-sm text-[#82071e]"
            role="alert"
          >
            Your session could not be verified. Sign in again to continue.
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell session={session}>
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
    </AppShell>
  );
}
