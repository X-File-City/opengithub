import Link from "next/link";
import type { DashboardSummary, RepositorySummary } from "@/lib/api";

type DashboardOnboardingProps = {
  summary: DashboardSummary;
};

function RepositoryVisibility({ visibility }: { visibility: string }) {
  return (
    <span className="rounded-full border border-[#d0d7de] px-2 py-0.5 text-xs font-medium text-[#59636e]">
      {visibility}
    </span>
  );
}

function RepositoryRow({ repository }: { repository: RepositorySummary }) {
  return (
    <li className="border-t border-[#d0d7de] first:border-t-0">
      <Link
        className="block px-4 py-3 hover:bg-[#f6f8fa]"
        href={`/${repository.owner_login}/${repository.name}`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-semibold text-[#0969da]">
            {repository.owner_login}/{repository.name}
          </span>
          <RepositoryVisibility visibility={repository.visibility} />
        </div>
        {repository.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#59636e]">
            {repository.description}
          </p>
        ) : null}
      </Link>
    </li>
  );
}

function TopRepositories({ summary }: DashboardOnboardingProps) {
  const repositories = summary.repositories.items;

  return (
    <aside className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#1f2328]">
          Top repositories
        </h2>
        <Link
          className="inline-flex h-8 items-center rounded-md bg-[#1f883d] px-3 text-sm font-semibold text-white hover:bg-[#1a7f37]"
          href="/new"
        >
          New
        </Link>
      </div>
      <label className="sr-only" htmlFor="repository-filter">
        Find a repository
      </label>
      <input
        className="h-8 w-full rounded-md border border-[#d0d7de] px-3 text-sm text-[#1f2328] placeholder:text-[#59636e]"
        id="repository-filter"
        name="repository-filter"
        placeholder="Find a repository..."
        type="search"
      />
      <div className="rounded-md border border-[#d0d7de] bg-white">
        {repositories.length > 0 ? (
          <ul>
            {repositories.map((repository) => (
              <RepositoryRow key={repository.id} repository={repository} />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm leading-6 text-[#59636e]">
            You do not have any repositories yet.
          </p>
        )}
      </div>
    </aside>
  );
}

function WelcomePanel({ userName }: { userName: string }) {
  return (
    <section className="rounded-md border border-[#d0d7de] bg-white p-6">
      <p className="text-sm font-semibold text-[#59636e]">
        Welcome, {userName}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-normal text-[#1f2328]">
        Start building on opengithub
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#59636e]">
        Create your first repository, import an existing project, or read the
        setup guide to connect Git and collaboration workflows.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="inline-flex h-9 items-center rounded-md bg-[#1f883d] px-4 text-sm font-semibold text-white hover:bg-[#1a7f37]"
          href="/new"
        >
          Create repository
        </Link>
        <Link
          className="inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-4 text-sm font-semibold text-[#0969da] hover:bg-[#eef1f4]"
          href="/new/import"
        >
          Import repository
        </Link>
        <Link
          className="inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
          href="/docs/get-started"
        >
          Read setup guide
        </Link>
      </div>
    </section>
  );
}

function EmptyFeedPanel() {
  return (
    <section className="rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-5">
      <h2 className="text-base font-semibold text-[#1f2328]">
        Recent activity
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#59636e]">
        Activity, issues, and review requests will appear here after you create
        or join repositories.
      </p>
    </section>
  );
}

export function DashboardOnboarding({ summary }: DashboardOnboardingProps) {
  const userName = summary.user.display_name ?? summary.user.email;

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[296px_minmax(0,1fr)]">
      <TopRepositories summary={summary} />
      <div className="space-y-5">
        {summary.repositories.total === 0 ? (
          <WelcomePanel userName={userName} />
        ) : (
          <EmptyFeedPanel />
        )}
      </div>
    </div>
  );
}
