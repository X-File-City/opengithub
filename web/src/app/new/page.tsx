import { AppShell } from "@/components/AppShell";
import { RepositoryCreateForm } from "@/components/RepositoryCreateForm";
import { getRepositoryCreationOptions, getSession } from "@/lib/server-session";

export default async function NewRepositoryPage() {
  const [session, options] = await Promise.all([
    getSession(),
    getRepositoryCreationOptions(),
  ]);

  return (
    <AppShell session={session}>
      {options && options.owners.length > 0 ? (
        <RepositoryCreateForm options={options} />
      ) : (
        <section className="mx-auto max-w-3xl px-6 py-8">
          <div
            className="rounded-md border border-[#f1aeb5] bg-[#fff1f3] px-4 py-3 text-sm text-[#82071e]"
            role="alert"
          >
            Repository creation options could not be loaded. Refresh or sign in
            again to continue.
          </div>
        </section>
      )}
    </AppShell>
  );
}
