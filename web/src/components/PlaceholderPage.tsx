import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AppShellFrame } from "@/components/AppShellFrame";
import type { AppShellContext, AuthSession } from "@/lib/api";

type PlaceholderAction = {
  href: string;
  label: string;
  primary?: boolean;
};

type PlaceholderPageProps = {
  actions?: PlaceholderAction[];
  children?: React.ReactNode;
  eyebrow: string;
  message: string;
  session: AuthSession;
  shellContext?: AppShellContext | null;
  title: string;
};

export function PlaceholderPage({
  actions = [{ href: "/dashboard", label: "Back to dashboard", primary: true }],
  children,
  eyebrow,
  message,
  session,
  shellContext,
  title,
}: PlaceholderPageProps) {
  return (
    <AppShell session={session} shellContext={shellContext}>
      <AppShellFrame className="max-w-[900px]" mode="centered">
        <section className="grid gap-6">
          <div>
            <p className="t-label" style={{ color: "var(--ink-3)" }}>
              {eyebrow}
            </p>
            <h1 className="t-h1 mt-2">{title}</h1>
          </div>
          <div className="card p-6">
            <p className="t-body" style={{ color: "var(--ink-2)" }}>
              {message}
            </p>
            {children}
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
          </div>
        </section>
      </AppShellFrame>
    </AppShell>
  );
}
