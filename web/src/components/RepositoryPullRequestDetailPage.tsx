import Link from "next/link";
import type { ReactNode } from "react";
import { MarkdownBody } from "@/components/MarkdownBody";
import { RepositoryShell } from "@/components/RepositoryShell";
import type { PullRequestDetailView, RepositoryOverview } from "@/lib/api";

type RepositoryPullRequestDetailPageProps = {
  repository: RepositoryOverview;
  pullRequest: PullRequestDetailView;
  viewerAuthenticated: boolean;
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
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}

function avatarLabel(login: string) {
  return login.slice(0, 1).toUpperCase();
}

function stateLabel(pullRequest: PullRequestDetailView) {
  if (pullRequest.state === "merged") {
    return "Merged";
  }
  if (pullRequest.state === "closed") {
    return "Closed";
  }
  return pullRequest.isDraft ? "Draft" : "Open";
}

function stateClass(pullRequest: PullRequestDetailView) {
  if (pullRequest.state === "merged") {
    return "accent";
  }
  if (pullRequest.state === "closed") {
    return "err";
  }
  return pullRequest.isDraft ? "warn" : "ok";
}

function SidebarSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="border-b py-4" style={{ borderColor: "var(--line)" }}>
      <h2 className="t-label mb-3">{title}</h2>
      {children}
    </section>
  );
}

export function RepositoryPullRequestDetailPage({
  repository,
  pullRequest,
  viewerAuthenticated,
}: RepositoryPullRequestDetailPageProps) {
  const bodyLabelId = `pull-request-${pullRequest.number}-body`;
  const basePath = `/${repository.owner_login}/${repository.name}`;
  const activePath = `${basePath}/pull/${pullRequest.number}`;
  const tabItems = [
    {
      href: activePath,
      label: "Conversation",
      count: pullRequest.stats.comments,
    },
    {
      href: `${activePath}/commits`,
      label: "Commits",
      count: pullRequest.stats.commits,
    },
    {
      href: `${activePath}/checks`,
      label: "Checks",
      count: pullRequest.checks.totalCount || null,
    },
    {
      href: pullRequest.filesHref,
      label: "Files changed",
      count: pullRequest.stats.files,
    },
  ];

  return (
    <RepositoryShell
      activePath={`${basePath}/pulls`}
      frameClassName="max-lg:grid-cols-1"
      repository={repository}
    >
      <main className="min-w-0">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="t-label mr-2">
                Pull request #{pullRequest.number}
              </h2>
              <Link className="btn sm" href={`${basePath}/pulls`}>
                All pull requests
              </Link>
              <Link className="btn primary sm" href={`${basePath}/compare`}>
                New pull request
              </Link>
            </div>
            <h1 className="t-h1 break-words">
              {pullRequest.title}{" "}
              <span className="t-num" style={{ color: "var(--ink-4)" }}>
                #{pullRequest.number}
              </span>
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`chip ${stateClass(pullRequest)}`}>
                {stateLabel(pullRequest)}
              </span>
              <p className="t-sm" style={{ color: "var(--ink-3)" }}>
                <span className="av sm mr-1 inline-flex align-middle">
                  {avatarLabel(pullRequest.author.login)}
                </span>
                <strong style={{ color: "var(--ink-1)" }}>
                  {pullRequest.author.login}
                </strong>{" "}
                wants to merge{" "}
                <span className="t-num">{pullRequest.stats.commits}</span>{" "}
                {pullRequest.stats.commits === 1 ? "commit" : "commits"} into{" "}
                <span className="t-mono-sm">{pullRequest.baseRef}</span> from{" "}
                <span className="t-mono-sm">{pullRequest.headRef}</span>
              </p>
            </div>
          </div>
          <Link className="btn" href={pullRequest.filesHref}>
            View changes
          </Link>
        </div>

        <nav aria-label="Pull request sections" className="tabs mb-6">
          {tabItems.map((item) => (
            <Link
              aria-current={item.href === activePath ? "page" : undefined}
              className={`tab ${item.href === activePath ? "active" : ""}`}
              href={item.href}
              key={item.label}
            >
              {item.label}
              {item.count !== null ? (
                <span className="badge t-num">{item.count}</span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="grid grid-cols-[minmax(0,1fr)_296px] gap-8 max-lg:grid-cols-1">
          <div className="min-w-0">
            <article className="flex gap-4">
              <div className="av lg shrink-0" aria-hidden="true">
                {avatarLabel(pullRequest.author.login)}
              </div>
              <div className="card min-w-0 flex-1 overflow-hidden">
                <div
                  className="flex flex-wrap items-center gap-2 border-b px-4 py-3"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--line)",
                  }}
                >
                  <h2 className="t-sm font-semibold" id={bodyLabelId}>
                    {pullRequest.author.login}
                  </h2>
                  <span className="t-xs">
                    opened {relativeTime(pullRequest.createdAt)}
                  </span>
                  <span className="chip soft ml-auto">
                    {pullRequest.authorRole}
                  </span>
                </div>
                <div className="p-5">
                  {pullRequest.body?.trim() ? (
                    <MarkdownBody
                      html={pullRequest.bodyHtml}
                      labelledBy={bodyLabelId}
                    />
                  ) : (
                    <p className="t-sm" style={{ color: "var(--ink-3)" }}>
                      No description provided.
                    </p>
                  )}
                </div>
              </div>
            </article>

            <section className="card mt-6 overflow-hidden">
              <div
                className="border-b px-5 py-4"
                style={{ borderColor: "var(--line)" }}
              >
                <h2 className="t-h3">Merge readiness</h2>
                <p className="t-sm mt-1" style={{ color: "var(--ink-3)" }}>
                  {pullRequest.isDraft
                    ? "Draft pull requests cannot be merged until they are marked ready."
                    : pullRequest.checks.totalCount
                      ? `${pullRequest.checks.completedCount} of ${pullRequest.checks.totalCount} checks completed.`
                      : "Checks are not configured for this pull request yet."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span
                  className={`chip ${pullRequest.checks.failedCount ? "err" : "soft"}`}
                >
                  {pullRequest.checks.failedCount
                    ? `${pullRequest.checks.failedCount} failed`
                    : pullRequest.checks.status.replaceAll("_", " ")}
                </span>
                <span className="chip soft">
                  {pullRequest.review.state.replaceAll("_", " ")}
                </span>
                <span className="chip soft">
                  <span className="t-num">{pullRequest.stats.additions}</span>{" "}
                  additions
                </span>
                <span className="chip soft">
                  <span className="t-num">{pullRequest.stats.deletions}</span>{" "}
                  deletions
                </span>
              </div>
            </section>

            {!viewerAuthenticated ? (
              <div className="card mt-6 p-5">
                <p className="t-sm" style={{ color: "var(--ink-3)" }}>
                  Sign in to comment, request reviews, or change merge state.
                </p>
                <Link
                  className="btn accent mt-3"
                  href={`/login?next=${encodeURIComponent(activePath)}`}
                >
                  Sign in to participate
                </Link>
              </div>
            ) : null}
          </div>

          <aside className="min-w-0">
            <SidebarSection title="Reviewers">
              {pullRequest.latestReviews.length ? (
                <div className="flex flex-col gap-2">
                  {pullRequest.latestReviews.map((review) => (
                    <div
                      className="flex items-center gap-2"
                      key={review.reviewer.id}
                    >
                      <span className="av sm" aria-hidden="true">
                        {avatarLabel(review.reviewer.login)}
                      </span>
                      <span className="t-sm flex-1">
                        {review.reviewer.login}
                      </span>
                      <span className="chip soft">
                        {review.state.replaceAll("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : pullRequest.requestedReviewers.length ? (
                <div className="flex flex-col gap-2">
                  {pullRequest.requestedReviewers.map((reviewer) => (
                    <div className="flex items-center gap-2" key={reviewer.id}>
                      <span className="av sm" aria-hidden="true">
                        {avatarLabel(reviewer.login)}
                      </span>
                      <span className="t-sm flex-1">{reviewer.login}</span>
                      <span className="chip soft">requested</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="t-xs">No review requests</p>
              )}
            </SidebarSection>

            <SidebarSection title="Assignees">
              {pullRequest.assignees.length ? (
                <div className="flex flex-col gap-2">
                  {pullRequest.assignees.map((assignee) => (
                    <div className="row gap-2" key={assignee.id}>
                      <span className="av sm" aria-hidden="true">
                        {avatarLabel(assignee.login)}
                      </span>
                      <span className="t-sm">{assignee.login}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="t-xs">No one assigned</p>
              )}
            </SidebarSection>

            <SidebarSection title="Labels">
              {pullRequest.labels.length ? (
                <div className="flex flex-wrap gap-2">
                  {pullRequest.labels.map((label) => (
                    <span className="chip soft" key={label.id}>
                      {label.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="t-xs">No labels</p>
              )}
            </SidebarSection>

            <SidebarSection title="Milestone">
              {pullRequest.milestone ? (
                <span className="chip soft">{pullRequest.milestone.title}</span>
              ) : (
                <p className="t-xs">No milestone</p>
              )}
            </SidebarSection>

            <SidebarSection title="Linked issues">
              {pullRequest.linkedIssues.length ? (
                <div className="flex flex-col gap-2">
                  {pullRequest.linkedIssues.map((issue) => (
                    <Link
                      className="chip soft"
                      href={issue.href}
                      key={issue.number}
                    >
                      #{issue.number} · {issue.state}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="t-xs">No linked issues</p>
              )}
            </SidebarSection>

            <SidebarSection title="Notifications">
              <p className="t-xs">
                {pullRequest.subscription.subscribed
                  ? `Subscribed because you are ${pullRequest.subscription.reason}.`
                  : "Sign in to subscribe to this pull request."}
              </p>
            </SidebarSection>

            <SidebarSection title="Participants">
              {pullRequest.participants.length ? (
                <div className="flex flex-wrap gap-2">
                  {pullRequest.participants.slice(0, 12).map((participant) => (
                    <span
                      className="av sm"
                      key={participant.id}
                      title={participant.login}
                    >
                      {avatarLabel(participant.login)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="t-xs">No participants yet</p>
              )}
            </SidebarSection>
          </aside>
        </div>
      </main>
    </RepositoryShell>
  );
}
