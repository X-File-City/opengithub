import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RepositoryCodeOverview } from "@/components/RepositoryCodeOverview";
import { getRepository, getSessionAndShellContext } from "@/lib/server-session";

type RepositoryOverviewPageProps = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

export default async function RepositoryOverviewPage({
  params,
}: RepositoryOverviewPageProps) {
  const [{ owner, repo }, { session, shellContext }] = await Promise.all([
    params,
    getSessionAndShellContext(),
  ]);
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const repository =
    session.authenticated && session.user
      ? await getRepository(ownerLogin, repositoryName)
      : null;

  return (
    <AppShell session={session} shellContext={shellContext}>
      {repository ? (
        <RepositoryCodeOverview repository={repository} />
      ) : (
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-5">
            <p className="t-sm text-[var(--ink-3)]">{ownerLogin}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[var(--ink-1)]">
              {repositoryName}
            </h1>
            <p
              className="mt-2 t-sm leading-6 text-[var(--ink-3)]"
              role="status"
            >
              Repository metadata is unavailable in this session. Dashboard rows
              still resolve to the repository overview destination.
            </p>
            <Link
              className="btn mt-4 inline-flex h-9 items-center px-4 text-[var(--accent)] hover:bg-[var(--surface-2)]"
              href="/dashboard"
            >
              Back to dashboard
            </Link>
          </div>
        </section>
      )}
    </AppShell>
  );
}
