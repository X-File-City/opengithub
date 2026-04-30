import Link from "next/link";
import type { DashboardSummary } from "@/lib/api";

type DashboardRepositoryFeedProps = {
  summary: DashboardSummary;
};

export function DashboardRepositoryFeed({
  summary,
}: DashboardRepositoryFeedProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-md border border-[#d0d7de] bg-white">
        <div className="border-b border-[#d0d7de] px-5 py-4">
          <h1 className="text-base font-semibold text-[#1f2328]">
            Recent activity
          </h1>
          <p className="mt-1 text-sm leading-6 text-[#59636e]">
            Repository events, issue updates, and pull request reviews will
            appear here as your projects become active.
          </p>
        </div>
        <ul className="divide-y divide-[#d0d7de]">
          {summary.repositories.items.map((repository) => (
            <li className="px-5 py-4" key={repository.id}>
              <Link
                className="text-sm font-semibold text-[#0969da] hover:underline"
                href={`/${repository.owner_login}/${repository.name}`}
              >
                {repository.owner_login}/{repository.name}
              </Link>
              <p className="mt-1 text-sm leading-6 text-[#59636e]">
                {repository.description ??
                  `No recent activity on ${repository.default_branch} yet.`}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-md border border-[#d0d7de] bg-white p-5">
          <h2 className="text-sm font-semibold text-[#1f2328]">
            Assigned issues
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#59636e]">
            Issues assigned to you will appear here when issue tracking ships.
          </p>
        </section>
        <section className="rounded-md border border-[#d0d7de] bg-white p-5">
          <h2 className="text-sm font-semibold text-[#1f2328]">
            Review requests
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#59636e]">
            Pull requests waiting for your review will appear here.
          </p>
        </section>
      </div>
    </div>
  );
}
