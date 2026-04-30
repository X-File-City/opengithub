import { AppShell } from "@/components/AppShell";
import { DashboardOnboarding } from "@/components/DashboardOnboarding";
import type {
  DashboardFeedEventType,
  DashboardFeedTab,
  DashboardSummaryQuery,
} from "@/lib/api";
import { getDashboardSummary, getSession } from "@/lib/server-session";

const FEED_TABS = new Set<DashboardFeedTab>(["following", "for_you"]);
const FEED_EVENT_TYPES = new Set<DashboardFeedEventType>([
  "star",
  "follow",
  "repository_create",
  "help_wanted_issue",
  "help_wanted_pull_request",
  "push",
  "fork",
  "release",
]);

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseEventTypes(
  value: string | string[] | undefined,
): DashboardFeedEventType[] | undefined {
  const values = (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
  const eventTypes: DashboardFeedEventType[] = [];
  for (const value of values) {
    if (FEED_EVENT_TYPES.has(value as DashboardFeedEventType)) {
      const eventType = value as DashboardFeedEventType;
      if (!eventTypes.includes(eventType)) {
        eventTypes.push(eventType);
      }
    }
  }
  return eventTypes.length > 0 ? eventTypes : undefined;
}

async function dashboardQueryFromSearchParams(
  searchParams: DashboardPageProps["searchParams"],
): Promise<DashboardSummaryQuery> {
  const params = (await searchParams) ?? {};
  const feedTabValue = firstSearchParam(params.feedTab);
  const feedTab = FEED_TABS.has(feedTabValue as DashboardFeedTab)
    ? (feedTabValue as DashboardFeedTab)
    : undefined;

  return {
    feedTab,
    eventTypes: parseEventTypes(params.eventType),
  };
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await getSession();
  const dashboardQuery = await dashboardQueryFromSearchParams(searchParams);
  const summary =
    session.authenticated && session.user
      ? await getDashboardSummary(dashboardQuery)
      : null;

  if (!session.authenticated || !session.user) {
    return (
      <AppShell session={session}>
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div
            className="rounded-md border border-[#f1aeb5] bg-[#fff1f3] px-4 py-3 text-sm text-[#82071e]"
            role="alert"
          >
            Your session could not be verified. Sign in again to continue.
          </div>
        </section>
      </AppShell>
    );
  }

  if (!summary) {
    return (
      <AppShell session={session}>
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div
            className="rounded-md border border-[#f1aeb5] bg-[#fff1f3] px-4 py-3 text-sm text-[#82071e]"
            role="alert"
          >
            Dashboard data could not be loaded. Refresh or sign in again to
            continue.
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell session={session}>
      <DashboardOnboarding
        activeEventTypes={
          dashboardQuery.eventTypes ?? summary.feedPreferences.eventTypes
        }
        activeFeedTab={
          dashboardQuery.feedTab ?? summary.feedPreferences.feedTab
        }
        summary={summary}
      />
    </AppShell>
  );
}
