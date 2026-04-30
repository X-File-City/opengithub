"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardRepositoryFeed } from "@/components/DashboardRepositoryFeed";
import type { DashboardSummary, RepositorySummary } from "@/lib/api";

type DashboardOnboardingProps = {
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
    <section className="rounded-md border border-[#d0d7de] bg-white">
      <div className="p-6">
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
      </div>
      {visibleHints.length > 0 ? (
        <div className="border-t border-[#d0d7de]">
          <h2 className="sr-only">Getting started tasks</h2>
          <ul className="divide-y divide-[#d0d7de]">
            {visibleHints.map((hint) => (
              <li
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={hint.key}
              >
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[#1f2328]">
                    {hint.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#59636e]">
                    {hint.description}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
                    href={hint.href}
                  >
                    {hint.action}
                  </Link>
                  <button
                    className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-semibold text-[#59636e] hover:bg-[#eef1f4] disabled:cursor-not-allowed disabled:opacity-60"
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
          className="border-t border-[#d0d7de] px-6 py-3 text-sm text-[#59636e]"
          role="status"
        >
          {feedback}
        </p>
      ) : null}
    </section>
  );
}

export function DashboardOnboarding({ summary }: DashboardOnboardingProps) {
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
      <TopRepositories summary={summary} />
      <div className="space-y-5">
        {summary.repositories.total === 0 ? (
          <WelcomePanel
            dismissedHintKeys={dismissedHintSet}
            dismissingHint={dismissingHint}
            feedback={feedback}
            onDismiss={dismissHint}
            userName={userName}
          />
        ) : (
          <DashboardRepositoryFeed summary={summary} />
        )}
      </div>
    </div>
  );
}
