"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardRepositoryFeed } from "@/components/DashboardRepositoryFeed";
import { DashboardTopRepositories } from "@/components/DashboardTopRepositories";
import type {
  DashboardFeedEventType,
  DashboardFeedTab,
  DashboardSummary,
} from "@/lib/api";

type DashboardOnboardingProps = {
  activeEventTypes?: DashboardFeedEventType[];
  activeFeedTab?: DashboardFeedTab;
  summary: DashboardSummary;
};

type OnboardingHint = {
  key: string;
  title: string;
  description: string;
  href: string;
  action: string;
};

const ONBOARDING_HINTS: OnboardingHint[] = [
  {
    key: "create-repository",
    title: "Create your first repository",
    description:
      "Start with a fresh repository and add code from your local machine.",
    href: "/new",
    action: "Create repository",
  },
  {
    key: "import-repository",
    title: "Import an existing project",
    description:
      "Bring an existing Git remote into opengithub when import support lands.",
    href: "/new/import",
    action: "Import repository",
  },
  {
    key: "read-guide",
    title: "Read the setup guide",
    description:
      "Review the local Git and collaboration setup flow for new projects.",
    href: "/docs/get-started",
    action: "Read setup guide",
  },
];

function WelcomePanel({
  userName,
  dismissedHintKeys,
  onDismiss,
  dismissingHint,
  feedback,
}: {
  userName: string;
  dismissedHintKeys: Set<string>;
  onDismiss: (hintKey: string) => void;
  dismissingHint: string | null;
  feedback: string | null;
}) {
  const visibleHints = ONBOARDING_HINTS.filter(
    (hint) => !dismissedHintKeys.has(hint.key),
  );

  return (
    <section className="card">
      <div className="p-6">
        <p className="t-label" style={{ color: "var(--ink-3)" }}>
          Welcome, {userName}
        </p>
        <h1 className="mt-2 t-h2">Start building on opengithub</h1>
        <p className="mt-3 max-w-2xl t-body" style={{ color: "var(--ink-3)" }}>
          Create your first repository, import an existing project, or read the
          setup guide to connect Git and collaboration workflows.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="btn primary" href="/new">
            Create repository
          </Link>
          <Link className="btn ghost" href="/new/import">
            Import repository
          </Link>
          <Link className="btn ghost" href="/docs/get-started">
            Read setup guide
          </Link>
        </div>
      </div>
      {visibleHints.length > 0 ? (
        <div style={{ borderTop: "1px solid var(--line)" }}>
          <h2 className="sr-only">Getting started tasks</h2>
          <ul
            style={{ borderTop: "1px solid var(--line)" }}
            className="divide-y"
          >
            {visibleHints.map((hint) => (
              <li
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={hint.key}
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <div className="min-w-0">
                  <h3 className="t-h3">{hint.title}</h3>
                  <p className="mt-1 t-body" style={{ color: "var(--ink-3)" }}>
                    {hint.description}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link className="btn ghost sm" href={hint.href}>
                    {hint.action}
                  </Link>
                  <button
                    className="btn ghost sm disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={dismissingHint === hint.key}
                    onClick={() => onDismiss(hint.key)}
                    type="button"
                  >
                    {dismissingHint === hint.key ? "Dismissing" : "Dismiss"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {feedback ? (
        <p
          className="px-6 py-3 t-sm"
          style={{ borderTop: "1px solid var(--line)", color: "var(--ink-3)" }}
          role="status"
        >
          {feedback}
        </p>
      ) : null}
    </section>
  );
}

export function DashboardOnboarding(props: DashboardOnboardingProps) {
  const { summary } = props;
  const activeEventTypes =
    props.activeEventTypes ?? summary.feedPreferences.eventTypes;
  const activeFeedTab = props.activeFeedTab ?? summary.feedPreferences.feedTab;
  const userName = summary.user.display_name ?? summary.user.email;
  const initiallyDismissed = useMemo(
    () => summary.dismissedHints.map((hint) => hint.hintKey),
    [summary.dismissedHints],
  );
  const [dismissedHintKeys, setDismissedHintKeys] =
    useState<string[]>(initiallyDismissed);
  const [dismissingHint, setDismissingHint] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const dismissedHintSet = useMemo(
    () => new Set(dismissedHintKeys),
    [dismissedHintKeys],
  );

  async function dismissHint(hintKey: string) {
    setDismissingHint(hintKey);
    setFeedback(null);

    try {
      const response = await fetch(`/dashboard/onboarding/hints/${hintKey}`, {
        method: "POST",
      });

      if (!response.ok) {
        setFeedback("This hint could not be dismissed. Try again.");
        return;
      }

      setDismissedHintKeys((current) =>
        current.includes(hintKey) ? current : [...current, hintKey],
      );
      setFeedback("Hint dismissed.");
    } catch {
      setFeedback("This hint could not be dismissed. Try again.");
    } finally {
      setDismissingHint(null);
    }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[296px_minmax(0,1fr)]">
      <DashboardTopRepositories repositories={summary.topRepositories.items} />
      <div className="min-w-0 space-y-5">
        {summary.repositories.total === 0 ? (
          <WelcomePanel
            dismissedHintKeys={dismissedHintSet}
            dismissingHint={dismissingHint}
            feedback={feedback}
            onDismiss={dismissHint}
            userName={userName}
          />
        ) : (
          <DashboardRepositoryFeed
            activeEventTypes={activeEventTypes}
            activeFeedTab={activeFeedTab}
            summary={summary}
          />
        )}
      </div>
    </div>
  );
}
