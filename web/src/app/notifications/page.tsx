import { AppShell } from "@/components/AppShell";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function NotificationsPage() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <AppShell session={session} shellContext={shellContext}>
      <section className="mx-auto max-w-[1240px] px-6 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="t-label" style={{ color: "var(--ink-3)" }}>
              Inbox
            </p>
            <h1 className="t-h1">Notifications</h1>
          </div>
          <span className="chip">
            {shellContext?.unreadNotificationCount ?? 0} unread
          </span>
        </div>
        <div className="card p-6">
          <p className="t-body" style={{ color: "var(--ink-2)" }}>
            Notification delivery is available through the Rust data model. The
            full inbox list arrives in the notification feature phases.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
