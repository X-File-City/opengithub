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
};

export default async function RepositoryTreePage({
  params,
}: RepositoryTreePageProps) {
  const [{ owner, repo, ref, path = [] }, session] = await Promise.all([
    params,
    getSession(),
  ]);
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const refName = decodeURIComponent(ref);
  const repositoryPath = path.map(decodeURIComponent).join("/");
  const overview =
    session.authenticated && session.user
      ? repositoryPath
        ? await getRepositoryPath(
            ownerLogin,
            repositoryName,
            refName,
            repositoryPath,
          )
        : await getRepository(ownerLogin, repositoryName)
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
          </div>
        </section>
      )}
    </AppShell>
  );
}
