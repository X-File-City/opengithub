import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RepositoryCommitHistoryView } from "@/components/RepositoryPathViews";
import { getRepositoryCommitHistory, getSession } from "@/lib/server-session";

type RepositoryCommitsPageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    ref: string;
    path?: string[];
  }>;
};

export default async function RepositoryCommitsPage({
  params,
}: RepositoryCommitsPageProps) {
  const [{ owner, repo, ref, path = [] }, session] = await Promise.all([
    params,
    getSession(),
  ]);
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const refName = decodeURIComponent(ref);
  const repositoryPath = path.map(decodeURIComponent).join("/");
  const history =
    session.authenticated && session.user
      ? await getRepositoryCommitHistory(
          ownerLogin,
          repositoryName,
          refName,
          repositoryPath,
        )
      : null;

  return (
    <AppShell session={session}>
      {history ? (
        <RepositoryCommitHistoryView
          history={history}
          owner={ownerLogin}
          path={repositoryPath}
          refName={refName}
          repo={repositoryName}
        />
      ) : (
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-5">
            <h1 className="text-2xl font-semibold tracking-normal text-[var(--ink-1)]">
              Commit history unavailable
            </h1>
            <p
              className="mt-2 t-sm leading-6 text-[var(--ink-3)]"
              role="status"
            >
              The requested commit history could not be loaded for this session.
            </p>
            <Link
              className="btn mt-4 inline-flex h-9 items-center px-4 text-[var(--accent)] hover:bg-[var(--surface-2)]"
              href={`/${ownerLogin}/${repositoryName}`}
            >
              Back to repository
            </Link>
          </div>
        </section>
      )}
    </AppShell>
  );
}
