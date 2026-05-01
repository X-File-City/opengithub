"use client";

import { useState } from "react";
import { repositoryPullRequestCompareHref } from "@/lib/navigation";

type PullRequestContributorBannerProps = {
  dismissed: boolean;
  owner: string;
  repo: string;
};

export function PullRequestContributorBanner({
  dismissed,
  owner,
  repo,
}: PullRequestContributorBannerProps) {
  const [hidden, setHidden] = useState(dismissed);
  const [dismissing, setDismissing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (hidden) {
    return null;
  }

  async function dismissBanner() {
    setDismissing(true);
    setFeedback(null);

    try {
      const response = await fetch(
        `/${encodeURIComponent(owner)}/${encodeURIComponent(
          repo,
        )}/pulls/preferences`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ dismissedContributorBanner: true }),
        },
      );

      if (!response.ok) {
        setFeedback("This preference could not be saved. Try again.");
        return;
      }

      setHidden(true);
    } catch {
      setFeedback("This preference could not be saved. Try again.");
    } finally {
      setDismissing(false);
    }
  }

  return (
    <section
      aria-label="Contributor guidance"
      className="card p-4"
      style={{ background: "var(--surface-2)" }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="t-label" style={{ color: "var(--accent)" }}>
            Contributor workflow
          </p>
          <h2 className="t-h3 mt-1">Keep changes ready for review.</h2>
          <p className="t-sm mt-2 max-w-3xl" style={{ color: "var(--ink-3)" }}>
            Open a pull request when a branch is ready for discussion. Keep the
            branch narrow, describe the intent, and watch checks before
            requesting merge attention.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            className="btn sm"
            href={repositoryPullRequestCompareHref(owner, repo)}
          >
            Compare changes
          </a>
          <button
            className="btn ghost sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={dismissing}
            onClick={dismissBanner}
            type="button"
          >
            {dismissing ? "Dismissing" : "Dismiss"}
          </button>
        </div>
      </div>
      {feedback ? (
        <p className="t-sm mt-3" role="status" style={{ color: "var(--err)" }}>
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
