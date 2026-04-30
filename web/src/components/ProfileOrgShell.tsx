import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AppShellFrame } from "@/components/AppShellFrame";
import { QueryTabNavigation } from "@/components/QueryTabNavigation";
import type { AppShellContext, AuthSession } from "@/lib/api";
import type { QueryTab } from "@/lib/navigation";

type ProfileOrgShellProps = {
  actions?: { href: string; label: string; primary?: boolean }[];
  activeTab: string;
  children?: React.ReactNode;
  eyebrow: string;
  hrefForTab: (value: string) => string;
  identityLabel: string;
  message: string;
  session: AuthSession;
  shellContext?: AppShellContext | null;
  tabs: readonly QueryTab[];
  tabLabel: string;
  title: string;
};

function avatarInitial(label: string) {
  return label.trim().slice(0, 1).toUpperCase() || "O";
}

export function ProfileOrgShell({
  actions = [],
  activeTab,
  children,
  eyebrow,
  hrefForTab,
  identityLabel,
  message,
  session,
  shellContext,
  tabs,
  tabLabel,
  title,
}: ProfileOrgShellProps) {
  return (
    <AppShell session={session} shellContext={shellContext}>
      <AppShellFrame className="max-w-[1040px]" mode="centered">
        <section className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <span className="av xl" aria-hidden="true">
                {avatarInitial(identityLabel)}
              </span>
              <div className="min-w-0">
                <p className="t-label" style={{ color: "var(--ink-3)" }}>
                  {eyebrow}
                </p>
                <h1 className="t-h1 mt-1 truncate">{title}</h1>
                <p className="t-mono-sm mt-1" style={{ color: "var(--ink-3)" }}>
                  {identityLabel}
                </p>
              </div>
            </div>
            {actions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <Link
                    className={`btn ${action.primary ? "primary" : "ghost"}`}
                    href={action.href}
                    key={`${action.href}-${action.label}`}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <QueryTabNavigation
            activeValue={activeTab}
            ariaLabel={tabLabel}
            hrefForTab={hrefForTab}
            tabs={tabs}
          />

          <div className="card p-6">
            <p className="t-body" style={{ color: "var(--ink-2)" }}>
              {message}
            </p>
            {children}
          </div>
        </section>
      </AppShellFrame>
    </AppShell>
  );
}
