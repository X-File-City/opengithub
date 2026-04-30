import Image from "next/image";
import Link from "next/link";
import type { AppShellContext, AuthSession } from "@/lib/api";

type AppShellProps = {
  children: React.ReactNode;
  session: AuthSession;
  shellContext?: AppShellContext | null;
};

function userLabel(session: AuthSession) {
  return session.user?.display_name ?? session.user?.email ?? "Sign in";
}

function avatarText(session: AuthSession) {
  const label = userLabel(session).trim();
  return label.slice(0, 1).toUpperCase() || "O";
}

export function AppShell({ children, session, shellContext }: AppShellProps) {
  const signedIn = session.authenticated && session.user;
  const unreadCount = shellContext?.unreadNotificationCount ?? 0;
  const recentRepositoryCount = shellContext?.recentRepositories.length ?? 0;

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header
        className="border-b px-4 py-3"
        style={{
          background: "var(--surface)",
          borderColor: "var(--line)",
          color: "var(--ink-1)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <Link
            className="flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold"
            href={signedIn ? "/dashboard" : "/"}
            aria-label="opengithub home"
            style={{
              background: "var(--accent)",
              borderColor: "var(--accent)",
              color: "var(--surface)",
            }}
          >
            o
          </Link>

          <nav className="flex flex-1 items-center gap-4 text-sm font-medium">
            <Link className="hover:underline" href="/dashboard">
              Dashboard
            </Link>
            <Link className="hover:underline" href="/new">
              New repository
            </Link>
            {signedIn ? (
              <Link
                className="hover:underline"
                href="/notifications"
                aria-label={
                  unreadCount > 0
                    ? `${unreadCount} unread notifications`
                    : "Notifications"
                }
              >
                Notifications
                {unreadCount > 0 ? ` (${unreadCount})` : ""}
              </Link>
            ) : null}
          </nav>

          {signedIn ? (
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 text-sm hover:opacity-75">
                {session.user?.avatar_url ? (
                  <Image
                    alt=""
                    className="h-7 w-7 rounded-full"
                    height={28}
                    src={session.user.avatar_url}
                    width={28}
                  />
                ) : (
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                    style={{
                      background: "var(--surface-3)",
                      color: "var(--ink-2)",
                    }}
                  >
                    {avatarText(session)}
                  </span>
                )}
                <span className="max-w-[12rem] truncate">
                  {userLabel(session)}
                </span>
              </summary>
              <div
                className="absolute right-0 z-10 mt-2 w-56 rounded-md border py-2 text-sm shadow-lg"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--line)",
                  color: "var(--ink-1)",
                }}
              >
                <div
                  className="border-b px-4 pb-2"
                  style={{ borderColor: "var(--line)" }}
                >
                  <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                    Signed in as
                  </p>
                  <p className="truncate font-semibold">{userLabel(session)}</p>
                  {shellContext ? (
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {recentRepositoryCount} recent repositories
                    </p>
                  ) : null}
                </div>
                <Link
                  className="block px-4 py-2 hover:opacity-75"
                  href="/settings/profile"
                >
                  Your profile
                </Link>
                <Link
                  className="block px-4 py-2 hover:opacity-75"
                  href="/settings/tokens"
                >
                  Developer settings
                </Link>
                <a className="block px-4 py-2 hover:opacity-75" href="/logout">
                  Sign out
                </a>
              </div>
            </details>
          ) : (
            <Link
              className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:opacity-75"
              href="/login"
              style={{ borderColor: "var(--line-strong)" }}
            >
              Sign in
            </Link>
          )}
        </div>
      </header>
      {children}
    </main>
  );
}
