import Image from "next/image";
import Link from "next/link";
import type { AuthSession } from "@/lib/api";

type AppShellProps = {
  children: React.ReactNode;
  session: AuthSession;
};

function userLabel(session: AuthSession) {
  return session.user?.display_name ?? session.user?.email ?? "Sign in";
}

function avatarText(session: AuthSession) {
  const label = userLabel(session).trim();
  return label.slice(0, 1).toUpperCase() || "O";
}

export function AppShell({ children, session }: AppShellProps) {
  const signedIn = session.authenticated && session.user;

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-[#d0d7de] bg-[#24292f] px-4 py-3 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <Link
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white text-sm font-semibold text-[#24292f]"
            href={signedIn ? "/dashboard" : "/"}
            aria-label="opengithub home"
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
          </nav>

          {signedIn ? (
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-white/10">
                {session.user?.avatar_url ? (
                  <Image
                    alt=""
                    className="h-7 w-7 rounded-full"
                    height={28}
                    src={session.user.avatar_url}
                    width={28}
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6e7781] text-xs font-semibold">
                    {avatarText(session)}
                  </span>
                )}
                <span className="max-w-[12rem] truncate">
                  {userLabel(session)}
                </span>
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border border-[#d0d7de] bg-white py-2 text-sm text-[#1f2328] shadow-lg">
                <div className="border-b border-[#d0d7de] px-4 pb-2">
                  <p className="text-xs text-[#59636e]">Signed in as</p>
                  <p className="truncate font-semibold">{userLabel(session)}</p>
                </div>
                <Link
                  className="block px-4 py-2 hover:bg-[#f6f8fa]"
                  href="/settings/profile"
                >
                  Your profile
                </Link>
                <Link
                  className="block px-4 py-2 hover:bg-[#f6f8fa]"
                  href="/settings/tokens"
                >
                  Developer settings
                </Link>
                <a
                  className="block px-4 py-2 hover:bg-[#f6f8fa]"
                  href="/logout"
                >
                  Sign out
                </a>
              </div>
            </details>
          ) : (
            <Link
              className="inline-flex h-8 items-center rounded-md border border-white/30 px-3 text-sm font-medium hover:bg-white/10"
              href="/login"
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
