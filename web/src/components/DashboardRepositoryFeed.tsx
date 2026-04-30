import Link from "next/link";
import type {
  DashboardFeedEvent,
  DashboardFeedEventType,
  DashboardFeedTab,
  DashboardIssueSummary,
  DashboardReviewRequest,
  DashboardSummary,
} from "@/lib/api";

type DashboardRepositoryFeedProps = {
  activeEventTypes: DashboardFeedEventType[];
  activeFeedTab: DashboardFeedTab;
  summary: DashboardSummary;
};

const FEED_EVENT_LABELS: Record<DashboardFeedEventType, string> = {
  star: "Stars",
  follow: "Follows",
  repository_create: "Repository creation",
  help_wanted_issue: "Help wanted issues",
  help_wanted_pull_request: "Help wanted pull requests",
  push: "Pushes",
  fork: "Forks",
  release: "Releases",
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

function feedIconLabel(eventType: DashboardFeedEventType): string {
  switch (eventType) {
    case "star":
      return "S";
    case "follow":
      return "F";
    case "repository_create":
      return "R";
    case "help_wanted_issue":
      return "I";
    case "help_wanted_pull_request":
      return "P";
    case "push":
      return "C";
    case "fork":
      return "Y";
    case "release":
      return "V";
  }
}

function FeedIcon({ eventType }: { eventType: DashboardFeedEventType }) {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#59636e]"
    >
      {feedIconLabel(eventType)}
    </span>
  );
}

function ActorAvatar({ event }: { event: DashboardFeedEvent }) {
  const initial = event.actorLogin.charAt(0).toUpperCase() || "U";

  if (event.actorAvatarUrl) {
    return (
      <span
        aria-hidden="true"
        className="h-5 w-5 rounded-full bg-[#f6f8fa] bg-cover bg-center"
        style={{ backgroundImage: `url(${event.actorAvatarUrl})` }}
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

function feedUrl(
  feedTab: DashboardFeedTab,
  eventTypes: DashboardFeedEventType[] = [],
): string {
  const params = new URLSearchParams();
  params.set("feedTab", feedTab);
  for (const eventType of eventTypes) {
    params.append("eventType", eventType);
  }
  return `/dashboard?${params.toString()}`;
}

function FeedCard({ event }: { event: DashboardFeedEvent }) {
  return (
    <li>
      <article className="flex gap-3 rounded-md border border-[#d0d7de] bg-white p-4">
        <FeedIcon eventType={event.eventType} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#59636e]">
            <span className="font-medium">
              {FEED_EVENT_LABELS[event.eventType]}
            </span>
            <Link
              className="font-medium text-[#0969da] hover:underline"
              href={event.repositoryHref}
            >
              {event.repositoryName}
            </Link>
          </div>
          <h2 className="mt-1 truncate text-sm font-semibold leading-5 text-[#1f2328]">
            <Link
              className="hover:text-[#0969da] hover:underline"
              href={event.targetHref}
            >
              {event.title}
            </Link>
          </h2>
          {event.excerpt ? (
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#59636e]">
              {event.excerpt}
            </p>
          ) : null}
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-[#59636e]">
            <ActorAvatar event={event} />
            <span className="truncate">{event.actionSummary}</span>
            <time
              dateTime={event.occurredAt}
              suppressHydrationWarning
              title={formatActivityDate(event.occurredAt)}
            >
              {formatRelativeActivityTime(event.occurredAt)}
            </time>
          </div>
        </div>
      </article>
    </li>
  );
}

function DashboardFeedControls({
  activeEventTypes,
  activeFeedTab,
  supportedEventTypes,
}: {
  activeEventTypes: DashboardFeedEventType[];
  activeFeedTab: DashboardFeedTab;
  supportedEventTypes: DashboardFeedEventType[];
}) {
  return (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        aria-label="Dashboard feed"
        className="inline-flex w-fit rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-0.5"
        role="tablist"
      >
        {[
          ["following", "Following"],
          ["for_you", "For you"],
        ].map(([feedTab, label]) => {
          const selected = activeFeedTab === feedTab;
          return (
            <Link
              aria-selected={selected}
              className={`inline-flex h-8 items-center rounded-[6px] px-3 text-sm font-semibold ${
                selected
                  ? "bg-white text-[#1f2328] shadow-sm"
                  : "text-[#59636e] hover:text-[#1f2328]"
              }`}
              href={feedUrl(feedTab as DashboardFeedTab, activeEventTypes)}
              key={feedTab}
              role="tab"
            >
              {label}
            </Link>
          );
        })}
      </div>

      <details className="relative">
        <summary className="inline-flex h-8 cursor-pointer list-none items-center justify-center rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#eef1f4]">
          Filter
          {activeEventTypes.length > 0 ? (
            <span className="ml-2 rounded-full bg-[#0969da] px-1.5 text-xs text-white">
              {activeEventTypes.length}
            </span>
          ) : null}
        </summary>
        <form
          action="/dashboard"
          className="absolute right-0 z-10 mt-2 w-72 rounded-md border border-[#d0d7de] bg-white p-3 shadow-lg"
          method="get"
        >
          <input name="feedTab" type="hidden" value={activeFeedTab} />
          <fieldset>
            <legend className="px-1 text-xs font-semibold uppercase text-[#59636e]">
              Event types
            </legend>
            <div className="mt-2 grid gap-1">
              {supportedEventTypes.map((eventType) => (
                <label
                  className="flex min-h-8 items-center gap-2 rounded-md px-2 text-sm text-[#1f2328] hover:bg-[#f6f8fa]"
                  key={eventType}
                >
                  <input
                    className="h-4 w-4"
                    defaultChecked={activeEventTypes.includes(eventType)}
                    name="eventType"
                    type="checkbox"
                    value={eventType}
                  />
                  <span>{FEED_EVENT_LABELS[eventType]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-3 flex items-center justify-between border-t border-[#d0d7de] pt-3">
            <Link
              className="text-sm font-semibold text-[#0969da] hover:underline"
              href={feedUrl(activeFeedTab)}
            >
              Clear filters
            </Link>
            <button
              className="inline-flex h-8 items-center rounded-md bg-[#1f883d] px-3 text-sm font-semibold text-white hover:bg-[#1a7f37]"
              type="submit"
            >
              Apply
            </button>
          </div>
        </form>
      </details>
    </div>
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
  activeEventTypes,
  activeFeedTab,
  summary,
}: DashboardRepositoryFeedProps) {
  const hasFeedEvents = summary.feedEvents.length > 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,720px)_minmax(240px,1fr)]">
      <main className="min-w-0 max-w-[720px] space-y-5">
        <section aria-labelledby="dashboard-feed-heading">
          <h1
            className="mb-3 text-base font-semibold text-[#1f2328]"
            id="dashboard-feed-heading"
          >
            Dashboard feed
          </h1>
          <DashboardFeedControls
            activeEventTypes={activeEventTypes}
            activeFeedTab={activeFeedTab}
            supportedEventTypes={summary.supportedFeedEventTypes}
          />
          {hasFeedEvents ? (
            <ul className="space-y-3">
              {summary.feedEvents.map((event) => (
                <FeedCard event={event} key={event.id} />
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-[#d0d7de] bg-white p-5">
              <p className="text-sm leading-6 text-[#59636e]">
                No dashboard feed events match the current filters.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  className="text-sm font-semibold text-[#0969da] hover:underline"
                  href={feedUrl(activeFeedTab)}
                >
                  Clear filters
                </Link>
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
