import Link from "next/link";
import type {
  DashboardActivityItem,
  DashboardIssueSummary,
  DashboardReviewRequest,
  DashboardSummary,
} from "@/lib/api";

type DashboardRepositoryFeedProps = {
  summary: DashboardSummary;
};

function formatActivityDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function activityKindLabel(kind: string): string {
  switch (kind) {
    case "commit":
      return "Commit";
    case "issue":
      return "Issue";
    case "pull_request":
      return "Pull request";
    case "repository":
      return "Repository";
    default:
      return "Activity";
  }
}

function ActivityCard({ item }: { item: DashboardActivityItem }) {
  return (
    <li>
      <article className="rounded-md border border-[#d0d7de] bg-white p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#59636e]">
          <span className="font-medium">{activityKindLabel(item.kind)}</span>
          <span aria-hidden="true">·</span>
          <Link
            className="font-medium text-[#0969da] hover:underline"
            href={item.repositoryHref}
          >
            {item.repositoryName}
          </Link>
          <span aria-hidden="true">·</span>
          <time dateTime={item.occurredAt}>
            {formatActivityDate(item.occurredAt)}
          </time>
        </div>
        <h2 className="mt-2 text-sm font-semibold leading-5 text-[#1f2328]">
          <Link
            className="hover:text-[#0969da] hover:underline"
            href={item.href}
          >
            {item.title}
          </Link>
        </h2>
        {item.description ? (
          <p className="mt-2 text-sm leading-6 text-[#59636e]">
            {item.description}
          </p>
        ) : null}
      </article>
    </li>
  );
}

function CompactWorkItem({
  item,
  type,
}: {
  item: DashboardIssueSummary | DashboardReviewRequest;
  type: "issue" | "review";
}) {
  return (
    <li className="py-3">
      <Link
        className="text-sm font-semibold leading-5 text-[#0969da] hover:underline"
        href={item.href}
      >
        {item.title}
      </Link>
      <p className="mt-1 text-xs text-[#59636e]">
        {item.repositoryName} #{item.number} ·{" "}
        {type === "issue" ? "Assigned" : "Review requested"}{" "}
        {formatActivityDate(item.updatedAt)}
      </p>
    </li>
  );
}

export function DashboardRepositoryFeed({
  summary,
}: DashboardRepositoryFeedProps) {
  const hasActivity = summary.recentActivity.length > 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,720px)_minmax(240px,1fr)]">
      <main className="max-w-[720px] space-y-5">
        <section aria-labelledby="recent-activity-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h1
              className="text-base font-semibold text-[#1f2328]"
              id="recent-activity-heading"
            >
              Recent activity
            </h1>
          </div>
          {hasActivity ? (
            <ul className="space-y-3">
              {summary.recentActivity.map((item) => (
                <ActivityCard item={item} key={`${item.kind}-${item.id}`} />
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-[#d0d7de] bg-white p-5">
              <p className="text-sm leading-6 text-[#59636e]">
                Repository events, issue updates, and pull request reviews will
                appear here as your projects become active.
              </p>
            </div>
          )}
        </section>

        <section
          aria-labelledby="assigned-issues-heading"
          className="rounded-md border border-[#d0d7de] bg-white p-5"
        >
          <h2 className="text-sm font-semibold text-[#1f2328]">
            <span id="assigned-issues-heading">Assigned issues</span>
          </h2>
          {summary.assignedIssues.length > 0 ? (
            <ul className="mt-1 divide-y divide-[#d0d7de]">
              {summary.assignedIssues.map((item) => (
                <CompactWorkItem item={item} key={item.id} type="issue" />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[#59636e]">
              Issues assigned to you will appear here when issue tracking ships.
            </p>
          )}
        </section>
      </main>

      <aside className="space-y-5">
        <section
          aria-labelledby="review-requests-heading"
          className="rounded-md border border-[#d0d7de] bg-white p-5"
        >
          <h2
            className="text-sm font-semibold text-[#1f2328]"
            id="review-requests-heading"
          >
            Review requests
          </h2>
          {summary.reviewRequests.length > 0 ? (
            <ul className="mt-1 divide-y divide-[#d0d7de]">
              {summary.reviewRequests.map((item) => (
                <CompactWorkItem item={item} key={item.id} type="review" />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[#59636e]">
              Pull requests waiting for your review will appear here.
            </p>
          )}
        </section>
        <section className="rounded-md border border-[#d0d7de] bg-white p-5">
          <h2 className="text-sm font-semibold text-[#1f2328]">
            Explore repositories
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#59636e]">
            Use the repository list to jump back into active projects and open
            the latest code, issues, and pull requests.
          </p>
        </section>
      </aside>
    </div>
  );
}
