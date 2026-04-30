import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RepositoryTreeView } from "@/components/RepositoryPathViews";
import {
  getRepository,
  getRepositoryPath,
  getSession,
} from "@/lib/server-session";

type RepositoryTreePageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    ref: string;
    path?: string[];
  }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
  }>;
};

export default async function RepositoryTreePage({
  params,
  searchParams,
}: RepositoryTreePageProps) {
  const [{ owner, repo, ref, path = [] }, query, session] = await Promise.all([
    params,
    searchParams,
    getSession(),
  ]);
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const refName = decodeURIComponent(ref);
  const repositoryPath = path.map(decodeURIComponent).join("/");
  const page = Number.parseInt(query.page ?? "1", 10);
  const pageSize = Number.parseInt(query.pageSize ?? "30", 10);
  const overview =
    session.authenticated && session.user
      ? repositoryPath
        ? await getRepositoryPath(
            ownerLogin,
            repositoryName,
            refName,
            repositoryPath,
            {
              page: Number.isFinite(page) ? page : 1,
              pageSize: Number.isFinite(pageSize) ? pageSize : 30,
            },
          )
        : await getRepository(ownerLogin, repositoryName)
      : null;
  const recoveryRepository =
    !overview && session.authenticated && session.user
      ? await getRepository(ownerLogin, repositoryName)
      : null;

  return (
    <AppShell session={session}>
      {overview ? (
        "entries" in overview ? (
          <RepositoryTreeView overview={overview} />
        ) : (
          <RepositoryTreeView
            overview={{
              ...overview,
              refName,
              resolvedRef: {
                kind:
                  refName === overview.default_branch ? "branch" : "unknown",
                shortName: refName,
                qualifiedName:
                  refName === overview.default_branch
                    ? `refs/heads/${refName}`
                    : refName,
                targetOid: overview.latestCommit?.oid ?? null,
                recoveryHref: `/${ownerLogin}/${repositoryName}/tree/${overview.default_branch}`,
              },
              defaultBranchHref: `/${ownerLogin}/${repositoryName}/tree/${overview.default_branch}`,
              recoveryHref: `/${ownerLogin}/${repositoryName}/tree/${refName}`,
              total: overview.rootEntries.length,
              page: 1,
              pageSize: Math.max(overview.rootEntries.length, 1),
              hasMore: false,
              path: "",
              pathName: repositoryName,
              breadcrumbs: [
                {
                  name: repositoryName,
                  path: "",
                  href: `/${ownerLogin}/${repositoryName}/tree/${refName}`,
                },
              ],
              parentHref: null,
              entries: overview.rootEntries,
              historyHref: `/${ownerLogin}/${repositoryName}/commits/${refName}`,
            }}
          />
        )
      ) : (
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-md border border-[#d0d7de] bg-white p-5">
            <h1 className="text-2xl font-semibold tracking-normal text-[#1f2328]">
              Path unavailable
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#59636e]" role="status">
              The requested folder could not be loaded for this session.
            </p>
            <Link
              className="mt-4 inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
              href={`/${ownerLogin}/${repositoryName}`}
            >
              Back to repository
            </Link>
            {recoveryRepository ? (
              <Link
                className="ml-2 mt-4 inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-[#0969da] px-4 text-sm font-semibold text-white hover:bg-[#0757b8]"
                href={`/${ownerLogin}/${repositoryName}/tree/${recoveryRepository.default_branch}`}
              >
                Open default branch
              </Link>
            ) : null}
          </div>
        </section>
      )}
    </AppShell>
  );
}
