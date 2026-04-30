"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { AppShellContext, AuthSession } from "@/lib/api";

type AppHeaderProps = {
  session: AuthSession;
  shellContext?: AppShellContext | null;
};

type MenuName = "global" | "create" | "avatar" | null;

function userLabel(session: AuthSession) {
  return session.user?.display_name ?? session.user?.email ?? "Sign in";
}

function avatarText(session: AuthSession) {
  const label = userLabel(session).trim();
  return label.slice(0, 1).toUpperCase() || "O";
}

function Icon({ name }: { name: "menu" | "search" | "plus" | "bell" }) {
  if (name === "menu") {
    return (
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
        <path
          d="M2.5 4h11M2.5 8h11M2.5 12h11"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  if (name === "search") {
    return (
      <svg aria-hidden="true" height="15" viewBox="0 0 16 16" width="15">
        <path
          d="m11.2 11.2 2.3 2.3M7.1 12.2a5.1 5.1 0 1 1 0-10.2 5.1 5.1 0 0 1 0 10.2Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  if (name === "plus") {
    return (
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
        <path
          d="M8 3v10M3 8h10"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
      <path
        d="M4.5 6.8a3.5 3.5 0 1 1 7 0c0 3 1.3 3.7 1.3 3.7H3.2s1.3-.7 1.3-3.7ZM6.7 12.6h2.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function MenuPanel({
  children,
  id,
  labelledBy,
}: {
  children: React.ReactNode;
  id: string;
  labelledBy: string;
}) {
  return (
    <div
      aria-labelledby={labelledBy}
      className="absolute z-40 mt-2 w-72 rounded-md border py-2 shadow-lg"
      id={id}
      role="menu"
      style={{
        background: "var(--surface)",
        borderColor: "var(--line)",
        color: "var(--ink-1)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {children}
    </div>
  );
}

function MenuLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className="block px-4 py-2 t-sm hover:opacity-75 focus:outline-none focus:ring-2"
      href={href}
      role="menuitem"
      style={{ outlineColor: "var(--accent)" }}
    >
      {children}
    </Link>
  );
}

export function AppHeader({ session, shellContext }: AppHeaderProps) {
  const signedIn = session.authenticated && session.user;
  const [openMenu, setOpenMenu] = useState<MenuName>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const globalButtonId = useId();
  const createButtonId = useId();
  const avatarButtonId = useId();
  const globalMenuId = useId();
  const createMenuId = useId();
  const avatarMenuId = useId();
  const unreadCount = shellContext?.unreadNotificationCount ?? 0;
  const recentRepositories = shellContext?.recentRepositories ?? [];
  const organizations = shellContext?.organizations ?? [];
  const teams = shellContext?.teams ?? [];

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <header
      className="sticky top-0 z-30 border-b px-4"
      ref={headerRef}
      style={{
        height: "var(--header-h)",
        background: "var(--surface)",
        borderColor: "var(--line)",
        color: "var(--ink-1)",
      }}
    >
      <div className="mx-auto flex h-full max-w-[1240px] items-center gap-3">
        <div className="relative">
          <button
            aria-controls={globalMenuId}
            aria-expanded={openMenu === "global"}
            aria-label="Global menu"
            className="btn ghost grid h-8 w-8 place-items-center p-0"
            id={globalButtonId}
            onClick={() => setOpenMenu(openMenu === "global" ? null : "global")}
            type="button"
          >
            <Icon name="menu" />
          </button>
          {openMenu === "global" ? (
            <MenuPanel id={globalMenuId} labelledBy={globalButtonId}>
              <div
                className="border-b px-4 pb-2"
                style={{ borderColor: "var(--line)" }}
              >
                <p className="t-label" style={{ color: "var(--ink-3)" }}>
                  Navigate
                </p>
              </div>
              <MenuLink href="/dashboard">Dashboard</MenuLink>
              <MenuLink href="/issues">Issues</MenuLink>
              <MenuLink href="/pulls">Pull requests</MenuLink>
              <MenuLink href="/notifications">Notifications</MenuLink>
              <MenuLink href="/explore">Explore</MenuLink>
              <div
                className="mt-2 border-t px-4 pb-1 pt-3"
                style={{ borderColor: "var(--line)" }}
              >
                <p className="t-label" style={{ color: "var(--ink-3)" }}>
                  Recent repositories
                </p>
              </div>
              {recentRepositories.length > 0 ? (
                recentRepositories.slice(0, 5).map((repo) => (
                  <MenuLink href={repo.href} key={repo.id}>
                    <span className="t-mono-sm">
                      {repo.ownerLogin}/{repo.name}
                    </span>
                  </MenuLink>
                ))
              ) : (
                <p className="px-4 py-2 t-xs">No recent repositories yet.</p>
              )}
              {organizations.length > 0 || teams.length > 0 ? (
                <>
                  <div
                    className="mt-2 border-t px-4 pb-1 pt-3"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <p className="t-label" style={{ color: "var(--ink-3)" }}>
                      Organizations and teams
                    </p>
                  </div>
                  {organizations.slice(0, 3).map((org) => (
                    <MenuLink href={org.href} key={org.id}>
                      {org.displayName}
                    </MenuLink>
                  ))}
                  {teams.slice(0, 3).map((team) => (
                    <MenuLink href={team.href} key={team.id}>
                      {team.organizationSlug}/{team.name}
                    </MenuLink>
                  ))}
                </>
              ) : null}
            </MenuPanel>
          ) : null}
        </div>

        <Link
          aria-label="opengithub dashboard"
          className="flex items-center gap-2"
          href={signedIn ? "/dashboard" : "/"}
        >
          <span
            className="grid h-8 w-8 place-items-center rounded-full t-h3"
            style={{
              background: "var(--accent)",
              color: "var(--surface)",
              fontFamily: "var(--display)",
            }}
          >
            o
          </span>
          <span
            className="hidden text-[18px] font-medium sm:inline"
            style={{ fontFamily: "var(--display)" }}
          >
            opengithub
          </span>
        </Link>

        {signedIn ? (
          <>
            <nav
              className="hidden items-center gap-1 md:flex"
              aria-label="Global"
            >
              <Link
                className="rounded-md px-2.5 py-1.5 t-sm hover:opacity-75"
                href="/dashboard"
              >
                Home
              </Link>
              <Link
                className="rounded-md px-2.5 py-1.5 t-sm hover:opacity-75"
                href="/pulls"
              >
                Pull requests
              </Link>
              <Link
                className="rounded-md px-2.5 py-1.5 t-sm hover:opacity-75"
                href="/issues"
              >
                Issues
              </Link>
            </nav>

            {/* biome-ignore lint/a11y/useSemanticElements: React and jsdom do not recognize the native search element yet. */}
            <form
              action="/search"
              className="ml-auto hidden h-8 min-w-[220px] max-w-[360px] flex-1 items-center gap-2 rounded-md border px-2 lg:flex"
              role="search"
              style={{
                background: "var(--surface)",
                borderColor: "var(--line-strong)",
                color: "var(--ink-3)",
              }}
            >
              <Icon name="search" />
              <input
                aria-label="Search or jump to"
                className="min-w-0 flex-1 bg-transparent t-sm outline-none"
                name="q"
                placeholder="Search or jump to..."
                style={{ color: "var(--ink-1)" }}
                type="search"
              />
              <span className="kbd">/</span>
            </form>

            <div className="relative">
              <button
                aria-controls={createMenuId}
                aria-expanded={openMenu === "create"}
                aria-label="Create new"
                className="btn ghost grid h-8 w-8 place-items-center p-0"
                id={createButtonId}
                onClick={() =>
                  setOpenMenu(openMenu === "create" ? null : "create")
                }
                type="button"
              >
                <Icon name="plus" />
              </button>
              {openMenu === "create" ? (
                <MenuPanel id={createMenuId} labelledBy={createButtonId}>
                  <MenuLink href="/new">New repository</MenuLink>
                  <MenuLink href="/new/import">Import repository</MenuLink>
                </MenuPanel>
              ) : null}
            </div>

            <Link
              aria-label={
                unreadCount > 0
                  ? `${unreadCount} unread notifications`
                  : "Notifications"
              }
              className="relative grid h-8 w-8 place-items-center rounded-md hover:opacity-75"
              href="/notifications"
            >
              <Icon name="bell" />
              {unreadCount > 0 ? (
                <span
                  className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full px-1 t-num"
                  style={{
                    background: "var(--accent)",
                    color: "var(--surface)",
                    fontSize: 10,
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>

            <div className="relative">
              <button
                aria-controls={avatarMenuId}
                aria-expanded={openMenu === "avatar"}
                aria-label="Open user menu"
                className="grid h-8 w-8 place-items-center overflow-hidden rounded-full"
                id={avatarButtonId}
                onClick={() =>
                  setOpenMenu(openMenu === "avatar" ? null : "avatar")
                }
                type="button"
              >
                {session.user?.avatar_url ? (
                  <Image
                    alt=""
                    className="h-8 w-8 rounded-full"
                    height={32}
                    src={session.user.avatar_url}
                    width={32}
                  />
                ) : (
                  <span className="av sm">{avatarText(session)}</span>
                )}
              </button>
              {openMenu === "avatar" ? (
                <div className="absolute right-0">
                  <MenuPanel id={avatarMenuId} labelledBy={avatarButtonId}>
                    <div
                      className="border-b px-4 pb-2"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <p className="t-xs">Signed in as</p>
                      <p className="truncate t-sm">{userLabel(session)}</p>
                    </div>
                    <MenuLink href="/settings/profile">Your profile</MenuLink>
                    <MenuLink href="/settings/tokens">
                      Developer settings
                    </MenuLink>
                    <MenuLink href="/logout">Sign out</MenuLink>
                  </MenuPanel>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <Link className="btn ml-auto" href="/login">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
