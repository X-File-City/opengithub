import { AppShell } from "@/components/AppShell";
import { RepositoryCreateForm } from "@/components/RepositoryCreateForm";
import {
  getRepositoryCreationOptions,
  getSessionAndShellContext,
} from "@/lib/server-session";

export default async function NewRepositoryPage() {
  const [{ session, shellContext }, options] = await Promise.all([
    getSessionAndShellContext(),
    getRepositoryCreationOptions(),
  ]);

  return (
    <AppShell session={session} shellContext={shellContext}>
      {options && options.owners.length > 0 ? (
        <RepositoryCreateForm options={options} />
      ) : (
        <section className="mx-auto max-w-3xl px-6 py-8">
          <div
            className="chip err rounded-md px-4 py-3 t-sm"
            role="alert"
            style={{
              background: "var(--err-soft)",
              color: "var(--err)",
              border: "none",
            }}
          >
            Repository creation options could not be loaded. Refresh or sign in
            again to continue.
          </div>
        </section>
      )}
    </AppShell>
  );
}
