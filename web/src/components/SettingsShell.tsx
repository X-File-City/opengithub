import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AppShellFrame } from "@/components/AppShellFrame";
import type { AppShellContext, AuthSession } from "@/lib/api";
import { SETTINGS_NAV_ITEMS } from "@/lib/navigation";

type SettingsShellProps = {
  activeSection: string;
  children: React.ReactNode;
  eyebrow?: string;
  session: AuthSession;
  shellContext?: AppShellContext | null;
  title: string;
};

export function SettingsShell({
  activeSection,
  children,
  eyebrow = "Settings",
  session,
  shellContext,
  title,
}: SettingsShellProps) {
  return (
    <AppShell session={session} shellContext={shellContext}>
      <AppShellFrame
        className="grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)]"
        mode="centered"
      >
        <aside className="lg:pr-6 lg:[border-right:1px_solid_var(--line)]">
          <div className="mb-4">
            <p className="t-label" style={{ color: "var(--ink-3)" }}>
              Account
            </p>
            <h1 className="t-h2 mt-2">Personal settings</h1>
          </div>
          <nav aria-label="Settings navigation" className="grid gap-1 t-sm">
            {SETTINGS_NAV_ITEMS.map((item) => {
              const active = activeSection === item.section;
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className="rounded-md px-3 py-2 font-medium hover:bg-[var(--hover)]"
                  href={item.href}
                  key={item.section}
                  style={
                    active
                      ? {
                          background: "var(--surface-2)",
                          border: "1px solid var(--line)",
                          color: "var(--ink-1)",
                        }
                      : {
                          border: "1px solid transparent",
                          color: "var(--ink-3)",
                        }
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <section className="min-w-0">
          <div
            className="pb-5"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            <p className="t-label" style={{ color: "var(--ink-3)" }}>
              {eyebrow}
            </p>
            <h2 className="t-h1 mt-2">{title}</h2>
          </div>
          <div className="mt-6">{children}</div>
        </section>
      </AppShellFrame>
    </AppShell>
  );
}

type SettingsPlaceholderContentProps = {
  actions?: { href: string; label: string; primary?: boolean }[];
  children?: React.ReactNode;
  message: string;
};

export function SettingsPlaceholderContent({
  actions = [],
  children,
  message,
}: SettingsPlaceholderContentProps) {
  return (
    <div className="card p-6">
      <p className="t-body" style={{ color: "var(--ink-2)" }}>
        {message}
      </p>
      {children}
      {actions.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              className={action.primary ? "btn primary" : "btn"}
              href={action.href}
              key={`${action.href}-${action.label}`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
