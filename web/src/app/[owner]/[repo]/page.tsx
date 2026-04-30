import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RepositoryCodeOverview } from "@/components/RepositoryCodeOverview";
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
      {repository ? (
        <RepositoryCodeOverview repository={repository} />
      ) : (
        <section className="mx-auto max-w-6xl px-6 py-8">
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
        </section>
      )}
    </AppShell>
  );
}
