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

function formatRelativeActivityTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(deltaSeconds);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absSeconds < 60) {
    return formatter.format(deltaSeconds, "second");
  }
  if (absSeconds < 3600) {
    return formatter.format(Math.round(deltaSeconds / 60), "minute");
  }
  if (absSeconds < 86_400) {
    return formatter.format(Math.round(deltaSeconds / 3600), "hour");
  }
  return formatter.format(Math.round(deltaSeconds / 86_400), "day");
}

function activityKindLabel(kind: string): string {
  switch (kind) {
    case "issue":
      return "Issue";
    case "pull_request":
      return "Pull request";
    default:
      return "Activity";
  }
}

function ActivityIcon({ kind }: { kind: string }) {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#59636e]"
    >
      {kind === "pull_request" ? "P" : "I"}
    </span>
  );
}

function ActivityStateBadge({ state }: { state: string }) {
  const isOpen = state === "open";

  return (
    <span
      className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-semibold capitalize text-white ${
        isOpen ? "bg-[#1f883d]" : "bg-[#8250df]"
      }`}
    >
      {state}
    </span>
  );
}

function ActorAvatar({ item }: { item: DashboardActivityItem }) {
  const initial = item.actorLogin.charAt(0).toUpperCase() || "U";

  if (item.actorAvatarUrl) {
    return (
      <span
        aria-hidden="true"
        className="h-5 w-5 rounded-full bg-[#f6f8fa] bg-cover bg-center"
        style={{ backgroundImage: `url(${item.actorAvatarUrl})` }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#d8dee4] text-[10px] font-semibold text-[#59636e]"
    >
      {initial}
    </span>
  );
}

function ActivityCard({ item }: { item: DashboardActivityItem }) {
  return (
    <li>
      <article className="flex gap-3 rounded-md border border-[#d0d7de] bg-white p-4">
        <ActivityIcon kind={item.kind} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#59636e]">
            <span className="font-medium">{activityKindLabel(item.kind)}</span>
            <Link
              className="font-medium text-[#0969da] hover:underline"
              href={item.repositoryHref}
            >
              {item.repositoryName}
            </Link>
            <span>#{item.number}</span>
            <ActivityStateBadge state={item.state} />
          </div>
          <h2 className="mt-1 truncate text-sm font-semibold leading-5 text-[#1f2328]">
            <Link
              className="hover:text-[#0969da] hover:underline"
              href={item.href}
            >
              {item.title}
            </Link>
          </h2>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-[#59636e]">
            <ActorAvatar item={item} />
            <span className="truncate">{item.actorLogin}</span>
            {item.description ? <span>{item.description}</span> : null}
            <time
              dateTime={item.occurredAt}
              suppressHydrationWarning
              title={formatActivityDate(item.occurredAt)}
            >
              {formatRelativeActivityTime(item.occurredAt)}
            </time>
          </div>
        </div>
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
                There is no recent activity involving you.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  className="text-sm font-semibold text-[#0969da] hover:underline"
                  href="/new"
                >
                  Create repository
                </Link>
                <Link
                  className="text-sm font-semibold text-[#0969da] hover:underline"
                  href="/explore"
                >
                  Explore repositories
                </Link>
              </div>
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
