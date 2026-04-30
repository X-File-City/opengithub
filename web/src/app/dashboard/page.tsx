import { AppShell } from "@/components/AppShell";
import { DashboardOnboarding } from "@/components/DashboardOnboarding";
import { getDashboardSummary, getSession } from "@/lib/server-session";

export default async function DashboardPage() {
  const session = await getSession();
  const summary =
    session.authenticated && session.user ? await getDashboardSummary() : null;

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

  if (!summary) {
    return (
      <AppShell session={session}>
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div
            className="rounded-md border border-[#f1aeb5] bg-[#fff1f3] px-4 py-3 text-sm text-[#82071e]"
            role="alert"
          >
            Dashboard data could not be loaded. Refresh or sign in again to
            continue.
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell session={session}>
      <DashboardOnboarding summary={summary} />
    </AppShell>
  );
}
