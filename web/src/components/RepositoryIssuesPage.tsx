import Link from "next/link";
import { IssueContributorBanner } from "@/components/IssueContributorBanner";
import {
  IssueFilterMenu,
  IssuePickerMenu,
  type IssuePickerOption,
} from "@/components/IssueFilterMenu";
import {
  IssueSortMenu,
  type IssueSortOption,
} from "@/components/IssueSortMenu";
import { RepositoryShell } from "@/components/RepositoryShell";
import type {
  ApiErrorEnvelope,
  IssueListItem,
  IssueListView,
  RepositoryOverview,
} from "@/lib/api";
import {
  type RepositoryIssueHrefQuery,
  repositoryIssueAddLabelHref,
  repositoryIssueClearFilterHref,
  repositoryIssueDetailHref,
  repositoryIssueExcludeAuthorHref,
  repositoryIssueExcludeLabelHref,
  repositoryIssueNoLabelsHref,
  repositoryIssueNoMetadataHref,
  repositoryIssueSetMilestoneHref,
  repositoryIssueSetUserFilterHref,
  repositoryIssueSortHref,
  repositoryIssueStateHref,
  repositoryIssuesHref,
} from "@/lib/navigation";

type RepositoryIssuesPageProps = {
  repository: RepositoryOverview;
  issues: IssueListView;
  query: RepositoryIssueHrefQuery;
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
  {
    value: "updated-desc",
    label: "Recently updated",
    group: "Sort by",
    description: "Issues with the latest activity first.",
    shortcut: "u",
  },
  {
    value: "created-desc",
    label: "Newest",
    group: "Sort by",
    description: "Newly opened issues first.",
    shortcut: "n",
  },
  {
    value: "comments-desc",
    label: "Most commented",
    group: "Sort by",
    description: "Issues with the busiest conversations first.",
    shortcut: "c",
  },
  {
    value: "best-match",
    label: "Best match",
    group: "Sort by",
    description: "Prioritize title and body matches for the typed query.",
    shortcut: "b",
  },
  {
    value: "updated-asc",
    label: "Least recently updated",
    group: "Order",
    description: "Issues with the oldest activity first.",
    shortcut: "U",
  },
  {
    value: "created-asc",
    label: "Oldest",
    group: "Order",
    description: "Oldest opened issues first.",
    shortcut: "N",
  },
  {
    value: "comments-asc",
    label: "Least commented",
    group: "Order",
    description: "Issues with the quietest conversations first.",
    shortcut: "C",
  },
] as const satisfies readonly Omit<IssueSortOption, "href" | "active">[];

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
  validationError = null,
}: RepositoryIssuesPageProps) {
  const owner = repository.owner_login;
  const repo = repository.name;
  const activeState = issues.filters.state;
  const baseQuery: RepositoryIssueHrefQuery = {
    ...query,
    q: issues.filters.query,
    state: activeState,
    author: issues.filters.author,
    excludedAuthor: issues.filters.excludedAuthor,
    labels: issues.filters.labels,
    excludedLabels: issues.filters.excludedLabels,
    noLabels: issues.filters.noLabels,
    milestone: issues.filters.milestone,
    noMilestone: issues.filters.noMilestone,
    assignee: issues.filters.assignee,
    noAssignee: issues.filters.noAssignee,
    project: issues.filters.project,
    issueType: issues.filters.issueType,
    sort: issues.filters.sort,
  };
  const userOptions = issues.filterOptions.users.map((user) => ({
    id: user.id,
    label: user.login,
    description: user.displayName,
  }));
  const authorOptions: IssuePickerOption[] = userOptions.map((user) => ({
    ...user,
    href: repositoryIssueSetUserFilterHref(
      owner,
      repo,
      baseQuery,
      "author",
      user.label,
    ),
    excludeHref: repositoryIssueExcludeAuthorHref(
      owner,
      repo,
      baseQuery,
      user.label,
    ),
    selected: issues.filters.author?.toLowerCase() === user.label.toLowerCase(),
  }));
  const assigneeOptions: IssuePickerOption[] = userOptions.map((user) => ({
    ...user,
    href: repositoryIssueSetUserFilterHref(
      owner,
      repo,
      baseQuery,
      "assignee",
      user.label,
    ),
    selected:
      issues.filters.assignee?.toLowerCase() === user.label.toLowerCase(),
  }));
  const milestoneOptions: IssuePickerOption[] =
    issues.filterOptions.milestones.map((milestone) => ({
      id: milestone.id,
      label: milestone.title,
      description: `${milestone.state} milestone`,
      href: repositoryIssueSetMilestoneHref(
        owner,
        repo,
        baseQuery,
        milestone.title,
      ),
      selected:
        issues.filters.milestone?.toLowerCase() ===
        milestone.title.toLowerCase(),
    }));
  const projectOptions: IssuePickerOption[] = issues.filterOptions.projects
    .length
    ? issues.filterOptions.projects.map((project) => ({
        id: project.id,
        label: project.name,
        description: project.description,
        href: repositoryIssuesHref(owner, repo, {
          ...baseQuery,
          project: project.name,
          page: null,
        }),
        selected:
          issues.filters.project?.toLowerCase() === project.name.toLowerCase(),
        disabledReason: project.disabledReason,
      }))
    : [
        {
          id: "projects-empty",
          label: "No repository projects",
          description: "Project metadata is not attached to issues yet.",
          href: repositoryIssuesHref(owner, repo, baseQuery),
          disabledReason:
            "Project filters will activate when project links exist.",
        },
      ];
  const typeOptions: IssuePickerOption[] = issues.filterOptions.issueTypes
    .length
    ? issues.filterOptions.issueTypes.map((issueType) => ({
        id: issueType.id,
        label: issueType.name,
        description: issueType.description,
        href: repositoryIssuesHref(owner, repo, {
          ...baseQuery,
          issueType: issueType.name,
          page: null,
        }),
        selected:
          issues.filters.issueType?.toLowerCase() ===
          issueType.name.toLowerCase(),
        disabledReason: issueType.disabledReason,
      }))
    : [
        {
          id: "types-empty",
          label: "No issue types",
          description:
            "Typed issues are not configured for this repository yet.",
          href: repositoryIssuesHref(owner, repo, baseQuery),
          disabledReason: "Type filters will activate when issue types exist.",
        },
      ];
  const firstItem = (issues.page - 1) * issues.pageSize + 1;
  const lastItem = Math.min(issues.total, issues.page * issues.pageSize);
  const activeSort =
    ISSUE_SORT_OPTIONS.find((option) => option.value === issues.filters.sort) ??
    ISSUE_SORT_OPTIONS[0];
  const sortOptions: IssueSortOption[] = ISSUE_SORT_OPTIONS.map((option) => ({
    ...option,
    href: repositoryIssueSortHref(owner, repo, baseQuery, option.value),
    active: option.value === issues.filters.sort,
  }));

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
              <p className="t-xs mt-1" style={{ color: "var(--ink-3)" }}>
                Your typed search was preserved. Adjust the qualifier or return
                to the default open issue view.
              </p>
            </div>
            <Link
              className="btn sm"
              href={repositoryIssuesHref(owner, repo, {
                q: "is:issue state:open",
                state: "open",
              })}
            >
              Clear invalid query
            </Link>
          </div>
        ) : null}

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
          {issues.filters.excludedLabels.length ? (
            <input
              name="excludedLabels"
              type="hidden"
              value={issues.filters.excludedLabels.join(",")}
            />
          ) : null}
          {issues.filters.noLabels ? (
            <input name="noLabels" type="hidden" value="true" />
          ) : null}
          {issues.filters.author ? (
            <input name="author" type="hidden" value={issues.filters.author} />
          ) : null}
          {issues.filters.excludedAuthor ? (
            <input
              name="excludedAuthor"
              type="hidden"
              value={issues.filters.excludedAuthor}
            />
          ) : null}
          {issues.filters.milestone ? (
            <input
              name="milestone"
              type="hidden"
              value={issues.filters.milestone}
            />
          ) : null}
          {issues.filters.noMilestone ? (
            <input name="noMilestone" type="hidden" value="true" />
          ) : null}
          {issues.filters.assignee ? (
            <input
              name="assignee"
              type="hidden"
              value={issues.filters.assignee}
            />
          ) : null}
          {issues.filters.noAssignee ? (
            <input name="noAssignee" type="hidden" value="true" />
          ) : null}
          {issues.filters.project ? (
            <input
              name="project"
              type="hidden"
              value={issues.filters.project}
            />
          ) : null}
          {issues.filters.issueType ? (
            <input
              name="issueType"
              type="hidden"
              value={issues.filters.issueType}
            />
          ) : null}
          <button className="btn" type="submit">
            Search
          </button>
          <IssuePickerMenu
            buttonLabel="Author"
            dialogLabel="Author filter"
            emptyMessage="No authors match this search."
            options={authorOptions}
            searchLabel="Filter authors"
            searchPlaceholder="Filter authors"
          />
          <IssueFilterMenu
            buttonLabel="Labels"
            labelOptions={issues.filterOptions.labels.map((label) => ({
              ...label,
              selected: issues.filters.labels.some(
                (value) => value.toLowerCase() === label.name.toLowerCase(),
              ),
              excluded: issues.filters.excludedLabels.some(
                (value) => value.toLowerCase() === label.name.toLowerCase(),
              ),
              includeHref: repositoryIssueAddLabelHref(
                owner,
                repo,
                baseQuery,
                label.name,
              ),
              excludeHref: repositoryIssueExcludeLabelHref(
                owner,
                repo,
                baseQuery,
                label.name,
              ),
            }))}
            noLabelsHref={repositoryIssueNoLabelsHref(owner, repo, baseQuery)}
            noLabelsSelected={issues.filters.noLabels}
          />
          <IssuePickerMenu
            buttonLabel="Projects"
            dialogLabel="Projects filter"
            emptyMessage="No projects match this search."
            options={projectOptions}
            searchLabel="Filter projects"
            searchPlaceholder="Filter projects"
          />
          <IssuePickerMenu
            buttonLabel="Milestones"
            dialogLabel="Milestones filter"
            emptyMessage="No milestones match this search."
            noValueOption={{
              id: "no-milestone",
              label: "No milestone",
              description: "Show issues without a milestone.",
              href: repositoryIssueNoMetadataHref(
                owner,
                repo,
                baseQuery,
                "milestone",
              ),
              selected: issues.filters.noMilestone,
            }}
            options={milestoneOptions}
            searchLabel="Filter milestones"
            searchPlaceholder="Filter milestones"
          />
          <IssuePickerMenu
            buttonLabel="Assignees"
            dialogLabel="Assignees filter"
            emptyMessage="No assignees match this search."
            noValueOption={{
              id: "no-assignee",
              label: "No assignee",
              description: "Show issues without an assignee.",
              href: repositoryIssueNoMetadataHref(
                owner,
                repo,
                baseQuery,
                "assignee",
              ),
              selected: issues.filters.noAssignee,
            }}
            options={assigneeOptions}
            searchLabel="Filter assignees"
            searchPlaceholder="Filter assignees"
          />
          <IssuePickerMenu
            buttonLabel="Types"
            dialogLabel="Types filter"
            emptyMessage="No issue types match this search."
            options={typeOptions}
            searchLabel="Filter types"
            searchPlaceholder="Filter types"
          />
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
              <IssueSortMenu
                activeLabel={activeSort.label}
                options={sortOptions}
              />
              {issues.filters.author ? (
                <Link
                  className="chip soft"
                  href={repositoryIssueClearFilterHref(
                    owner,
                    repo,
                    baseQuery,
                    "author",
                  )}
                  title={`Remove author:${issues.filters.author}`}
                >
                  author:{issues.filters.author}
                </Link>
              ) : null}
              {issues.filters.excludedAuthor ? (
                <Link
                  className="chip err"
                  href={repositoryIssueClearFilterHref(
                    owner,
                    repo,
                    baseQuery,
                    "excludedAuthor",
                  )}
                  title={`Remove -author:${issues.filters.excludedAuthor}`}
                >
                  -author:{issues.filters.excludedAuthor}
                </Link>
              ) : null}
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
              {issues.filters.excludedLabels.map((label) => (
                <Link
                  className="chip err"
                  href={repositoryIssueClearFilterHref(
                    owner,
                    repo,
                    baseQuery,
                    "excludedLabels",
                    label,
                  )}
                  key={label}
                  title={`Remove -label:${label}`}
                >
                  -label:{label}
                </Link>
              ))}
              {issues.filters.noLabels ? (
                <Link
                  className="chip soft"
                  href={repositoryIssueClearFilterHref(
                    owner,
                    repo,
                    baseQuery,
                    "noLabels",
                  )}
                  title="Remove no:label"
                >
                  no:label
                </Link>
              ) : null}
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
              {issues.filters.noMilestone ? (
                <Link
                  className="chip soft"
                  href={repositoryIssueClearFilterHref(
                    owner,
                    repo,
                    baseQuery,
                    "noMilestone",
                  )}
                  title="Remove no:milestone"
                >
                  no:milestone
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
              {issues.filters.noAssignee ? (
                <Link
                  className="chip soft"
                  href={repositoryIssueClearFilterHref(
                    owner,
                    repo,
                    baseQuery,
                    "noAssignee",
                  )}
                  title="Remove no:assignee"
                >
                  no:assignee
                </Link>
              ) : null}
              {issues.filters.project ? (
                <Link
                  className="chip soft"
                  href={repositoryIssueClearFilterHref(
                    owner,
                    repo,
                    baseQuery,
                    "project",
                  )}
                  title={`Remove project:${issues.filters.project}`}
                >
                  project:{issues.filters.project}
                </Link>
              ) : null}
              {issues.filters.issueType ? (
                <Link
                  className="chip soft"
                  href={repositoryIssueClearFilterHref(
                    owner,
                    repo,
                    baseQuery,
                    "issueType",
                  )}
                  title={`Remove type:${issues.filters.issueType}`}
                >
                  type:{issues.filters.issueType}
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
