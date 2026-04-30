import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RepositoryBlobViewPage } from "@/components/RepositoryPathViews";
import {
  getRepositoryBlame,
  getRepositoryBlob,
  getSession,
} from "@/lib/server-session";

type RepositoryBlobPageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    ref: string;
    path?: string[];
  }>;
  searchParams: Promise<{
    view?: string;
    symbols?: string;
  }>;
};

export default async function RepositoryBlobPage({
  params,
  searchParams,
}: RepositoryBlobPageProps) {
  const [{ owner, repo, ref, path = [] }, { view, symbols }, session] =
    await Promise.all([params, searchParams, getSession()]);
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const refName = decodeURIComponent(ref);
  const repositoryPath = path.map(decodeURIComponent).join("/");
  const blob =
    session.authenticated && session.user && repositoryPath
      ? await getRepositoryBlob(
          ownerLogin,
          repositoryName,
          refName,
          repositoryPath,
        )
      : null;
  const blame =
    blob && view === "blame"
      ? await getRepositoryBlame(
          ownerLogin,
          repositoryName,
          refName,
          repositoryPath,
        )
      : null;

  return (
    <AppShell session={session}>
      {blob ? (
        <RepositoryBlobViewPage
          blob={blob}
          initialBlame={blame}
          initialMode={view === "blame" ? "blame" : "code"}
          initialSymbolsOpen={symbols === "1"}
        />
      ) : (
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-5">
            <h1 className="text-2xl font-semibold tracking-normal text-[var(--ink-1)]">
              File unavailable
            </h1>
            <p
              className="mt-2 t-sm leading-6 text-[var(--ink-3)]"
              role="status"
            >
              The requested file could not be loaded for this session.
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
