import Link from "next/link";
import { IssueContributorBanner } from "@/components/IssueContributorBanner";
import { RepositoryShell } from "@/components/RepositoryShell";
import type {
  IssueListItem,
  IssueListView,
  RepositoryOverview,
} from "@/lib/api";
import {
  type RepositoryIssueHrefQuery,
  repositoryIssueClearFilterHref,
  repositoryIssueDetailHref,
  repositoryIssueSortHref,
  repositoryIssueStateHref,
  repositoryIssuesHref,
} from "@/lib/navigation";

type RepositoryIssuesPageProps = {
  repository: RepositoryOverview;
  issues: IssueListView;
  query: RepositoryIssueHrefQuery;
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

function IssueStateMark({ state }: { state: IssueListItem["state"] }) {
  const open = state === "open";
  return (
    <span
      aria-label={open ? "Open issue" : "Closed issue"}
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]"
      role="img"
      style={{
        borderColor: open ? "var(--ok)" : "var(--ink-4)",
        color: open ? "var(--ok)" : "var(--ink-3)",
      }}
    >
      {open ? "!" : "✓"}
    </span>
  );
}

function InlineCodeTitle({ title }: { title: string }) {
  const parts = title.split(/(`[^`]+`)/g).map((part, index, allParts) => ({
    key: `${allParts.slice(0, index + 1).join("").length}:${part}`,
    part,
  }));
  return (
    <>
      {parts.map(({ key, part }) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code className="kbd" key={key}>
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={key}>{part}</span>
        ),
      )}
    </>
  );
}

const ISSUE_SORT_OPTIONS = [
  ["updated-desc", "Recently updated"],
  ["updated-asc", "Least recently updated"],
  ["created-desc", "Newest"],
  ["created-asc", "Oldest"],
] as const;

function IssueRow({
  issue,
  owner,
  repo,
}: {
  issue: IssueListItem;
  owner: string;
  repo: string;
}) {
  const href =
    issue.href || repositoryIssueDetailHref(owner, repo, issue.number);
  return (
    <article className="list-row items-start gap-3 px-5 py-4">
      <IssueStateMark state={issue.state} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            className="font-medium hover:underline"
            href={href}
            style={{ color: "var(--ink-1)" }}
          >
            <InlineCodeTitle title={issue.title} />
          </Link>
          {issue.labels.map((label) => (
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
          {issue.milestone ? (
            <span className="chip soft" title="Milestone">
              {issue.milestone.title}
            </span>
          ) : null}
          {issue.linkedPullRequest ? (
            <Link className="chip soft" href={issue.linkedPullRequest.href}>
              PR #{issue.linkedPullRequest.number}
            </Link>
          ) : null}
        </div>
        <p className="t-xs mt-1" style={{ color: "var(--ink-3)" }}>
          <span className="t-mono-sm">#{issue.number}</span> in{" "}
          <span className="t-mono-sm">
            {issue.repositoryOwner}/{issue.repositoryName}
          </span>{" "}
          opened by {issue.author.login} · updated{" "}
          {relativeTime(issue.updatedAt)}
        </p>
        {issue.assignees.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {issue.assignees.map((assignee) => (
              <span className="chip soft" key={assignee.id}>
                @{assignee.login}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div
        className="t-xs flex min-w-10 shrink-0 items-center justify-end gap-1 pt-1"
        style={{ color: "var(--ink-3)" }}
      >
        <span aria-hidden="true">□</span>
        <span className="t-num">{issue.commentCount}</span>
      </div>
    </article>
  );
}

export function RepositoryIssuesPage({
  repository,
  issues,
  query,
}: RepositoryIssuesPageProps) {
  const owner = repository.owner_login;
  const repo = repository.name;
  const activeState = issues.filters.state;
  const baseQuery: RepositoryIssueHrefQuery = {
    ...query,
    q: issues.filters.query,
    state: activeState,
    labels: issues.filters.labels,
    milestone: issues.filters.milestone,
    assignee: issues.filters.assignee,
    sort: issues.filters.sort,
  };
  const firstItem = (issues.page - 1) * issues.pageSize + 1;
  const lastItem = Math.min(issues.total, issues.page * issues.pageSize);

  return (
    <RepositoryShell
      activePath={`/${owner}/${repo}/issues`}
      frameClassName="max-w-7xl"
      repository={repository}
    >
      <section className="space-y-4">
        <div className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="t-label" style={{ color: "var(--ink-3)" }}>
                Collaboration
              </p>
              <h1 className="t-h2 mt-1">Issues</h1>
              <p
                className="t-sm mt-2 max-w-2xl"
                style={{ color: "var(--ink-3)" }}
              >
                Track bugs, tasks, and follow-up work for this repository.
              </p>
            </div>
            <Link className="btn accent" href={`/${owner}/${repo}/issues/new`}>
              New issue
            </Link>
          </div>
        </div>

        <IssueContributorBanner
          dismissed={issues.preferences.dismissedContributorBanner}
          owner={owner}
          repo={repo}
        />

        <form
          action={`/${owner}/${repo}/issues`}
          className="flex flex-wrap items-center gap-3"
          method="get"
        >
          <label className="input min-w-[260px] flex-1" htmlFor="issue-query">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="issue-query"
              defaultValue={issues.filters.query}
              id="issue-query"
              name="q"
              placeholder="is:issue state:open"
            />
          </label>
          <input name="state" type="hidden" value={activeState} />
          <input name="sort" type="hidden" value={issues.filters.sort} />
          {issues.filters.labels.length ? (
            <input
              name="labels"
              type="hidden"
              value={issues.filters.labels.join(",")}
            />
          ) : null}
          {issues.filters.milestone ? (
            <input
              name="milestone"
              type="hidden"
              value={issues.filters.milestone}
            />
          ) : null}
          {issues.filters.assignee ? (
            <input
              name="assignee"
              type="hidden"
              value={issues.filters.assignee}
            />
          ) : null}
          <button className="btn" type="submit">
            Search
          </button>
          <Link className="btn ghost" href={`/${owner}/${repo}/labels`}>
            Labels
          </Link>
          <Link className="btn ghost" href={`/${owner}/${repo}/milestones`}>
            Milestones
          </Link>
        </form>

        <div className="card overflow-hidden">
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b px-5"
            style={{ borderColor: "var(--line)" }}
          >
            <nav aria-label="Issue state" className="tabs">
              <Link
                aria-current={activeState === "open" ? "page" : undefined}
                className={`tab ${activeState === "open" ? "active" : ""}`}
                href={repositoryIssueStateHref(owner, repo, baseQuery, "open")}
              >
                Open <span className="badge t-num">{issues.openCount}</span>
              </Link>
              <Link
                aria-current={activeState === "closed" ? "page" : undefined}
                className={`tab ${activeState === "closed" ? "active" : ""}`}
                href={repositoryIssueStateHref(
                  owner,
                  repo,
                  baseQuery,
                  "closed",
                )}
              >
                Closed <span className="badge t-num">{issues.closedCount}</span>
              </Link>
            </nav>
            <div className="flex flex-wrap gap-2 py-3">
              {ISSUE_SORT_OPTIONS.map(([value, label]) => (
                <Link
                  aria-current={
                    issues.filters.sort === value ? "page" : undefined
                  }
                  className={`chip ${
                    issues.filters.sort === value ? "active" : "soft"
                  }`}
                  href={repositoryIssueSortHref(owner, repo, baseQuery, value)}
                  key={value}
                >
                  {label}
                </Link>
              ))}
              {issues.filters.labels.map((label) => (
                <Link
                  className="chip soft"
                  href={repositoryIssueClearFilterHref(
                    owner,
                    repo,
                    baseQuery,
                    "labels",
                    label,
                  )}
                  key={label}
                  title={`Remove label:${label}`}
                >
                  label:{label}
                </Link>
              ))}
              {issues.filters.milestone ? (
                <Link
                  className="chip soft"
                  href={repositoryIssueClearFilterHref(
                    owner,
                    repo,
                    baseQuery,
                    "milestone",
                  )}
                  title={`Remove milestone:${issues.filters.milestone}`}
                >
                  milestone:{issues.filters.milestone}
                </Link>
              ) : null}
              {issues.filters.assignee ? (
                <Link
                  className="chip soft"
                  href={repositoryIssueClearFilterHref(
                    owner,
                    repo,
                    baseQuery,
                    "assignee",
                  )}
                  title={`Remove assignee:${issues.filters.assignee}`}
                >
                  assignee:{issues.filters.assignee}
                </Link>
              ) : null}
            </div>
          </div>

          {issues.items.length ? (
            <div>
              <div
                className="flex items-center gap-2 border-b px-5 py-2"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--line-soft)",
                }}
              >
                <span className="t-label">
                  {activeState === "open" ? "Open issues" : "Closed issues"}
                </span>
                <span className="t-xs" style={{ color: "var(--ink-3)" }}>
                  · {firstItem}-{lastItem} of {issues.total}
                </span>
              </div>
              {issues.items.map((issue) => (
                <IssueRow
                  issue={issue}
                  key={issue.id}
                  owner={owner}
                  repo={repo}
                />
              ))}
              <div
                className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3"
                style={{ borderColor: "var(--line-soft)" }}
              >
                <span className="t-xs" style={{ color: "var(--ink-3)" }}>
                  Page <span className="t-num">{issues.page}</span>
                </span>
                <div className="flex gap-2">
                  {issues.page > 1 ? (
                    <Link
                      className="btn sm"
                      href={repositoryIssuesHref(owner, repo, {
                        ...baseQuery,
                        page: issues.page - 1,
                      })}
                    >
                      Previous
                    </Link>
                  ) : null}
                  {issues.page * issues.pageSize < issues.total ? (
                    <Link
                      className="btn sm"
                      href={repositoryIssuesHref(owner, repo, {
                        ...baseQuery,
                        page: issues.page + 1,
                      })}
                    >
                      Next
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="t-h3">No issues matched this query</p>
              <p className="t-sm mt-2" style={{ color: "var(--ink-3)" }}>
                Try the default open issue view or adjust the search terms.
              </p>
              <Link
                className="btn mt-4"
                href={repositoryIssuesHref(owner, repo, {
                  q: "is:issue state:open",
                  state: "open",
                })}
              >
                Clear query
              </Link>
            </div>
          )}
        </div>
      </section>
    </RepositoryShell>
  );
}
