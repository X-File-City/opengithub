import Link from "next/link";
import { RepositoryShell } from "@/components/RepositoryShell";
import type {
  ApiErrorEnvelope,
  PullRequestListItem,
  PullRequestListView,
  RepositoryOverview,
} from "@/lib/api";
import {
  type RepositoryPullRequestHrefQuery,
  repositoryPullRequestCompareHref,
  repositoryPullRequestDetailHref,
  repositoryPullRequestPageHref,
  repositoryPullRequestStateHref,
  repositoryPullRequestsHref,
} from "@/lib/navigation";

type RepositoryPullsPageProps = {
  repository: RepositoryOverview;
  pulls: PullRequestListView;
  query: RepositoryPullRequestHrefQuery;
  validationError?: ApiErrorEnvelope | null;
};

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "recently";
  }
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }
  return `${Math.floor(months / 12)}y ago`;
}

function PullRequestStateMark({
  draft,
  state,
}: {
  draft: boolean;
  state: PullRequestListItem["state"];
}) {
  const label = draft
    ? "Draft pull request"
    : state === "open"
      ? "Open pull request"
      : state === "merged"
        ? "Merged pull request"
        : "Closed pull request";
  const color =
    state === "open"
      ? "var(--ok)"
      : state === "merged"
        ? "var(--accent)"
        : "var(--ink-3)";
  const mark = draft
    ? "◌"
    : state === "open"
      ? "↟"
      : state === "merged"
        ? "◆"
        : "×";
  return (
    <span
      aria-label={label}
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]"
      role="img"
      style={{ borderColor: color, color }}
    >
      {mark}
    </span>
  );
}

function checksLabel(checks: PullRequestListItem["checks"]) {
  if (!checks.totalCount) {
    return "No checks";
  }
  if (checks.failedCount > 0 || checks.conclusion === "failure") {
    return `${checks.failedCount} failed`;
  }
  if (
    checks.completedCount < checks.totalCount ||
    checks.status === "running"
  ) {
    return `${checks.completedCount}/${checks.totalCount} checks`;
  }
  return `${checks.totalCount} passing`;
}

function ChecksChip({ pull }: { pull: PullRequestListItem }) {
  const failing =
    pull.checks.failedCount > 0 || pull.checks.conclusion === "failure";
  const passing =
    pull.checks.totalCount > 0 &&
    pull.checks.completedCount === pull.checks.totalCount &&
    !failing;
  return (
    <Link
      className={`chip ${passing ? "ok" : failing ? "err" : "soft"}`}
      href={pull.checksHref}
    >
      {checksLabel(pull.checks)}
    </Link>
  );
}

function reviewLabel(review: PullRequestListItem["review"]) {
  if (review.state === "approved") {
    return "Approved";
  }
  if (review.state === "changes_requested") {
    return "Changes requested";
  }
  if (review.requestedReviewers.length) {
    return `${review.requestedReviewers.length} requested`;
  }
  return review.required ? "Review required" : "No review";
}

function ReviewChip({ pull }: { pull: PullRequestListItem }) {
  const approved = pull.review.state === "approved";
  const changesRequested = pull.review.state === "changes_requested";
  return (
    <Link
      className={`chip ${approved ? "ok" : changesRequested ? "warn" : "soft"}`}
      href={pull.reviewsHref}
    >
      {reviewLabel(pull.review)}
    </Link>
  );
}

function PullRequestRow({ pull }: { pull: PullRequestListItem }) {
  const href =
    pull.href ||
    repositoryPullRequestDetailHref(
      pull.repositoryOwner,
      pull.repositoryName,
      pull.number,
    );
  return (
    <article className="list-row items-start gap-3 px-5 py-4">
      <PullRequestStateMark draft={pull.isDraft} state={pull.state} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            className="font-medium hover:underline"
            href={href}
            style={{ color: "var(--ink-1)" }}
          >
            {pull.title}
          </Link>
          {pull.isDraft ? <span className="chip soft">Draft</span> : null}
          {pull.labels.map((label) => (
            <span
              className="chip soft"
              key={label.id}
              title={label.description ?? label.name}
            >
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: label.color }}
              />
              {label.name}
            </span>
          ))}
        </div>
        <p className="t-xs mt-1" style={{ color: "var(--ink-3)" }}>
          <span className="t-mono-sm">#{pull.number}</span> opened by{" "}
          {pull.author.login} · updated {relativeTime(pull.updatedAt)} ·{" "}
          <span className="t-mono-sm">{pull.headRef}</span> into{" "}
          <span className="t-mono-sm">{pull.baseRef}</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="chip soft">{pull.authorRole}</span>
          <ChecksChip pull={pull} />
          <ReviewChip pull={pull} />
          {pull.linkedIssues.length ? (
            <Link className="chip soft" href={pull.linkedIssuesHref}>
              {pull.linkedIssues.length} linked
            </Link>
          ) : null}
          {pull.taskProgress.total ? (
            <span className="chip soft">
              {pull.taskProgress.completed}/{pull.taskProgress.total} tasks
            </span>
          ) : null}
        </div>
      </div>
      <div
        className="t-xs flex min-w-10 shrink-0 items-center justify-end gap-1 pt-1"
        style={{ color: "var(--ink-3)" }}
      >
        <Link
          className="inline-flex items-center gap-1 hover:underline"
          href={pull.commentsHref}
        >
          <span aria-hidden="true">□</span>
          <span className="t-num">{pull.commentCount}</span>
        </Link>
      </div>
    </article>
  );
}

export function RepositoryPullsPage({
  repository,
  pulls,
  query,
  validationError = null,
}: RepositoryPullsPageProps) {
  const owner = repository.owner_login;
  const repo = repository.name;
  const activeState = pulls.filters.state;
  const baseQuery: RepositoryPullRequestHrefQuery = {
    ...query,
    q: pulls.filters.query,
    state: activeState,
    labels: pulls.filters.labels,
    milestone: pulls.filters.milestone,
    review: pulls.filters.review,
    checks: pulls.filters.checks,
    sort: pulls.filters.sort,
  };
  const firstItem = (pulls.page - 1) * pulls.pageSize + 1;
  const lastItem = Math.min(pulls.total, pulls.page * pulls.pageSize);

  return (
    <RepositoryShell
      activePath={`/${owner}/${repo}/pulls`}
      frameClassName="max-w-7xl"
      repository={repository}
    >
      <section className="space-y-4">
        <div className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="t-label" style={{ color: "var(--ink-3)" }}>
                Review queue
              </p>
              <h1 className="t-h2 mt-1">Pull requests</h1>
              <p
                className="t-sm mt-2 max-w-2xl"
                style={{ color: "var(--ink-3)" }}
              >
                Review proposed changes, checks, comments, and linked work for
                this repository.
              </p>
            </div>
            <Link
              className="btn accent"
              href={repositoryPullRequestCompareHref(owner, repo)}
            >
              New pull request
            </Link>
          </div>
        </div>

        {validationError ? (
          <div
            aria-live="polite"
            className="card flex flex-wrap items-start justify-between gap-3 p-4"
            role="alert"
            style={{
              background: "var(--warn-soft)",
              borderColor: "var(--warn)",
            }}
          >
            <div className="min-w-0 flex-1">
              <p className="t-label" style={{ color: "var(--warn)" }}>
                Query warning
              </p>
              <p className="t-sm mt-1" style={{ color: "var(--ink-2)" }}>
                {validationError.details?.reason ??
                  validationError.error.message}
              </p>
            </div>
            <Link
              className="btn sm"
              href={repositoryPullRequestsHref(owner, repo, {
                q: "is:pr is:open",
                state: "open",
              })}
            >
              Clear invalid query
            </Link>
          </div>
        ) : null}

        {!pulls.preferences.dismissedContributorBanner ? (
          <div className="card flex flex-wrap items-start justify-between gap-4 p-4">
            <div>
              <p className="t-label" style={{ color: "var(--accent)" }}>
                Contributor guidance
              </p>
              <p className="t-sm mt-1" style={{ color: "var(--ink-2)" }}>
                Open a pull request when a branch is ready for review. Keep the
                branch narrow, describe the intent, and watch checks before
                requesting merge attention.
              </p>
            </div>
            <Link
              className="btn sm"
              href={repositoryPullRequestCompareHref(owner, repo)}
            >
              Compare changes
            </Link>
          </div>
        ) : null}

        <form
          action={`/${owner}/${repo}/pulls`}
          className="flex flex-wrap items-center gap-3"
          method="get"
        >
          <label className="input min-w-[260px] flex-1" htmlFor="pull-query">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="pull-query"
              defaultValue={pulls.filters.query}
              id="pull-query"
              name="q"
              placeholder="is:pr is:open"
            />
          </label>
          <input name="state" type="hidden" value={activeState} />
          <input name="sort" type="hidden" value={pulls.filters.sort} />
          {pulls.filters.labels.length ? (
            <input
              name="labels"
              type="hidden"
              value={pulls.filters.labels.join(",")}
            />
          ) : null}
          {pulls.filters.milestone ? (
            <input
              name="milestone"
              type="hidden"
              value={pulls.filters.milestone}
            />
          ) : null}
          {pulls.filters.review ? (
            <input name="review" type="hidden" value={pulls.filters.review} />
          ) : null}
          {pulls.filters.checks ? (
            <input name="checks" type="hidden" value={pulls.filters.checks} />
          ) : null}
          <button className="btn" type="submit">
            Search
          </button>
          <Link className="btn" href={`/${owner}/${repo}/labels`}>
            Labels
          </Link>
          <Link className="btn" href={`/${owner}/${repo}/milestones`}>
            Milestones
          </Link>
        </form>

        <div className="card overflow-hidden">
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b px-5"
            style={{ borderColor: "var(--line)" }}
          >
            <nav aria-label="Pull request state" className="tabs">
              {(["open", "merged", "closed"] as const).map((state) => (
                <Link
                  aria-current={activeState === state ? "page" : undefined}
                  className={`tab ${activeState === state ? "active" : ""}`}
                  href={repositoryPullRequestStateHref(
                    owner,
                    repo,
                    baseQuery,
                    state,
                  )}
                  key={state}
                >
                  {state === "open"
                    ? "Open"
                    : state === "merged"
                      ? "Merged"
                      : "Closed"}
                  <span className="badge t-num">{pulls.counts[state]}</span>
                </Link>
              ))}
            </nav>
            <p className="t-xs py-3" style={{ color: "var(--ink-3)" }}>
              {pulls.total ? `${firstItem}-${lastItem}` : "0"} of{" "}
              <span className="t-num">{pulls.total}</span>
            </p>
          </div>

          {pulls.items.length ? (
            pulls.items.map((pull) => (
              <PullRequestRow key={pull.id} pull={pull} />
            ))
          ) : (
            <div className="px-6 py-14 text-center">
              <p className="t-h3">No pull requests matched this query</p>
              <p className="t-sm mt-2" style={{ color: "var(--ink-3)" }}>
                Clear the query or start a new pull request from a branch.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link
                  className="btn"
                  href={repositoryPullRequestsHref(owner, repo, {
                    q: "is:pr is:open",
                    state: "open",
                  })}
                >
                  Clear query
                </Link>
                <Link
                  className="btn accent"
                  href={repositoryPullRequestCompareHref(owner, repo)}
                >
                  New pull request
                </Link>
              </div>
            </div>
          )}
        </div>

        {pulls.total > pulls.pageSize ? (
          <nav
            aria-label="Pull request pagination"
            className="flex flex-wrap justify-end gap-2"
          >
            <Link
              aria-disabled={pulls.page <= 1}
              className="btn sm"
              href={repositoryPullRequestPageHref(
                owner,
                repo,
                baseQuery,
                Math.max(1, pulls.page - 1),
              )}
            >
              Previous
            </Link>
            <Link
              aria-disabled={pulls.page * pulls.pageSize >= pulls.total}
              className="btn sm"
              href={repositoryPullRequestPageHref(
                owner,
                repo,
                baseQuery,
                pulls.page + 1,
              )}
            >
              Next
            </Link>
          </nav>
        ) : null}
      </section>
    </RepositoryShell>
  );
}
