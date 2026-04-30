import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getRepository, getSession } from "@/lib/server-session";

type PullRequestPageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
};

export default async function PullRequestPage({
  params,
}: PullRequestPageProps) {
  const [{ owner, repo, number }, session] = await Promise.all([
    params,
    getSession(),
  ]);
  const repository = await getRepository(owner, repo);
  const repositoryHref = `/${owner}/${repo}`;

  return (
    <AppShell session={session}>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-6">
          <div className="flex flex-wrap items-center gap-2 t-sm text-[var(--ink-3)]">
            <Link
              className="font-semibold text-[var(--accent)] hover:underline"
              href={repositoryHref}
            >
              {owner}/{repo}
            </Link>
            <span>/</span>
            <span>Pull request #{number}</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal text-[var(--ink-1)]">
            Pull request #{number}
          </h1>
          <p className="mt-3 max-w-2xl t-sm leading-6 text-[var(--ink-3)]">
            Pull request conversations and file review are coming in the pull
            request detail feature. This route keeps dashboard activity links
            navigable for {repository?.name ?? repo}.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="btn inline-flex h-9 items-center px-4 text-[var(--accent)] hover:bg-[var(--surface-2)]"
              href={repositoryHref}
            >
              Back to repository
            </Link>
            <Link
              className="btn inline-flex h-9 items-center px-4 text-[var(--accent)] hover:bg-[var(--surface-2)]"
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
