import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getRepository, getSession } from "@/lib/server-session";

type IssuePageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
};

export default async function IssuePage({ params }: IssuePageProps) {
  const [{ owner, repo, number }, session] = await Promise.all([
    params,
    getSession(),
  ]);
  const repository = await getRepository(owner, repo);
  const repositoryHref = `/${owner}/${repo}`;

  return (
    <AppShell session={session}>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="rounded-md border border-[#d0d7de] bg-white p-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#59636e]">
            <Link
              className="font-semibold text-[#0969da] hover:underline"
              href={repositoryHref}
            >
              {owner}/{repo}
            </Link>
            <span>/</span>
            <span>Issue #{number}</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal text-[#1f2328]">
            Issue #{number}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#59636e]">
            Issue detail timelines are coming in the issue detail feature. This
            route keeps dashboard activity links navigable for{" "}
            {repository?.name ?? repo}.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-4 text-sm font-semibold text-[#0969da] hover:bg-[#eef1f4]"
              href={repositoryHref}
            >
              Back to repository
            </Link>
            <Link
              className="inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
              href="/dashboard"
            >
              Back to dashboard
            </Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
