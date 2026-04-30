"use client";

import { useState } from "react";

type IssueContributorBannerProps = {
  dismissed: boolean;
  owner: string;
  repo: string;
};

export function IssueContributorBanner({
  dismissed,
  owner,
  repo,
}: IssueContributorBannerProps) {
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
        )}/issues/preferences`,
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
          <p className="t-label" style={{ color: "var(--ink-3)" }}>
            Contributor workflow
          </p>
          <h2 className="t-h3 mt-1">Make work discussable.</h2>
          <p className="t-sm mt-2 max-w-3xl" style={{ color: "var(--ink-3)" }}>
            Add labels, milestones, and assignees so contributors can find the
            right thread before opening a pull request.
          </p>
        </div>
        <button
          className="btn ghost sm disabled:cursor-not-allowed disabled:opacity-60"
          disabled={dismissing}
          onClick={dismissBanner}
          type="button"
        >
          {dismissing ? "Dismissing" : "Dismiss"}
        </button>
      </div>
      {feedback ? (
        <p className="t-sm mt-3" role="status" style={{ color: "var(--err)" }}>
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
