import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getRepository, getSession } from "@/lib/server-session";

type RepositoryOverviewPageProps = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

export default async function RepositoryOverviewPage({
  params,
}: RepositoryOverviewPageProps) {
  const [{ owner, repo }, session] = await Promise.all([params, getSession()]);
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const repository =
    session.authenticated && session.user
      ? await getRepository(ownerLogin, repositoryName)
      : null;

  return (
    <AppShell session={session}>
      <section className="mx-auto max-w-6xl px-6 py-8">
        {repository ? (
          <div className="space-y-5">
            <div className="border-b border-[#d0d7de] pb-4">
              <p className="text-sm text-[#59636e]">{repository.owner_login}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-normal text-[#1f2328]">
                  {repository.name}
                </h1>
                <span className="rounded-full border border-[#d0d7de] px-2 py-0.5 text-xs font-semibold capitalize text-[#59636e]">
                  {repository.visibility}
                </span>
              </div>
              {repository.description ? (
                <p className="mt-2 text-sm leading-6 text-[#59636e]">
                  {repository.description}
                </p>
              ) : null}
              <p className="mt-3 text-sm text-[#59636e]">
                Default branch{" "}
                <span className="font-mono text-[#1f2328]">
                  {repository.default_branch}
                </span>
              </p>
            </div>
            <div className="rounded-md border border-[#d0d7de] bg-white p-5">
              <h2 className="text-base font-semibold text-[#1f2328]">Code</h2>
              {repository.files.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-md border border-[#d0d7de]">
                  {repository.files.map((file) => (
                    <Link
                      className="flex items-center justify-between border-b border-[#d0d7de] px-4 py-3 text-sm last:border-b-0 hover:bg-[#f6f8fa]"
                      href={`/${repository.owner_login}/${repository.name}/blob/${repository.default_branch}/${file.path}`}
                      key={file.id}
                    >
                      <span className="font-mono text-[#0969da]">
                        {file.path}
                      </span>
                      <span className="text-xs text-[#59636e]">
                        {file.byteSize} bytes
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-[#59636e]">
                  This repository is ready. Add a README, push an existing
                  project, or create a new file to get started.
                </p>
              )}
            </div>
            {repository.readme ? (
              <article className="rounded-md border border-[#d0d7de] bg-white">
                <h2 className="border-b border-[#d0d7de] px-4 py-3 text-sm font-semibold text-[#1f2328]">
                  README.md
                </h2>
                <pre className="whitespace-pre-wrap px-4 py-4 text-sm leading-6 text-[#1f2328]">
                  {repository.readme.content}
                </pre>
              </article>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border border-[#d0d7de] bg-white p-5">
            <p className="text-sm text-[#59636e]">{ownerLogin}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[#1f2328]">
              {repositoryName}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#59636e]" role="status">
              Repository metadata is unavailable in this session. Dashboard rows
              still resolve to the repository overview destination.
            </p>
            <Link
              className="mt-4 inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
              href="/dashboard"
            >
              Back to dashboard
            </Link>
          </div>
        )}
      </section>
    </AppShell>
  );
}
