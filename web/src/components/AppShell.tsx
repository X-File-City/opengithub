import { AppHeader } from "@/components/AppHeader";
import type { AppShellContext, AuthSession } from "@/lib/api";

type AppShellProps = {
  children: React.ReactNode;
  session: AuthSession;
  shellContext?: AppShellContext | null;
};

export function AppShell({ children, session, shellContext }: AppShellProps) {
  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{ background: "var(--bg)" }}
    >
      <AppHeader session={session} shellContext={shellContext} />
      {children}
    </main>
  );
}
