import Link from "next/link";
import type { ReactNode } from "react";
import { MarkdownBody } from "@/components/MarkdownBody";
import { RepositoryShell } from "@/components/RepositoryShell";
import type { IssueDetailView, RepositoryOverview } from "@/lib/api";
import {
  repositoryIssueDetailHref,
  repositoryIssuesHref,
} from "@/lib/navigation";

type RepositoryIssueDetailPageProps = {
  repository: RepositoryOverview;
  issue: IssueDetailView;
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

function bytesLabel(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }
  const kib = value / 1024;
  if (kib < 1024) {
    return `${kib.toFixed(1)} KB`;
  }
  return `${(kib / 1024).toFixed(1)} MB`;
}

function avatarLabel(login: string) {
  return login.slice(0, 1).toUpperCase();
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b py-4" style={{ borderColor: "var(--line)" }}>
      <h2 className="t-label mb-3">{title}</h2>
      {children}
    </section>
  );
}

export function RepositoryIssueDetailPage({
  repository,
  issue,
}: RepositoryIssueDetailPageProps) {
  const issueHref = repositoryIssueDetailHref(
    repository.owner_login,
    repository.name,
    issue.number,
  );
  const issueListHref = repositoryIssuesHref(
    repository.owner_login,
    repository.name,
    { state: issue.state },
  );
  const bodyLabelId = `issue-${issue.number}-body`;
  const stateOpen = issue.state === "open";

  return (
    <RepositoryShell
      activePath={issueHref}
      frameClassName="max-lg:grid-cols-1"
      repository={repository}
    >
      <main className="min-w-0">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Link className="btn sm" href={issueListHref}>
                All issues
              </Link>
              <Link
                className="btn primary sm"
                href={`/${repository.owner_login}/${repository.name}/issues/new`}
              >
                New issue
              </Link>
            </div>
            <h1 className="t-h1 break-words">
              {issue.title}{" "}
              <span className="t-num" style={{ color: "var(--ink-4)" }}>
                #{issue.number}
              </span>
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`chip ${stateOpen ? "ok" : "soft"}`}>
                {stateOpen ? "Open" : "Closed"}
              </span>
              <p className="t-sm" style={{ color: "var(--ink-3)" }}>
                <strong style={{ color: "var(--ink-1)" }}>
                  {issue.author.login}
                </strong>{" "}
                opened this issue {relativeTime(issue.createdAt)} ·{" "}
                <span className="t-num">{issue.commentCount}</span>{" "}
                {issue.commentCount === 1 ? "comment" : "comments"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_296px] gap-8 max-lg:grid-cols-1">
          <div className="min-w-0">
            <article className="flex gap-4">
              <div className="av lg shrink-0" aria-hidden="true">
                {avatarLabel(issue.author.login)}
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
                    {issue.author.login}
                  </h2>
                  <span className="t-xs">
                    opened {relativeTime(issue.createdAt)}
                  </span>
                  <span className="chip soft ml-auto">author</span>
                </div>
                <div className="p-5">
                  {issue.body?.trim() ? (
                    <MarkdownBody
                      html={issue.bodyHtml}
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

            <div
              className="mt-6 border-l pl-6"
              style={{ borderColor: "var(--line)" }}
            >
              <div className="card p-4">
                <p className="t-sm">
                  <strong>{issue.author.login}</strong> opened this issue.
                </p>
                <p className="t-xs mt-1">
                  Conversation timeline, comments, reactions, and state changes
                  are wired in the next issue-detail phases.
                </p>
              </div>
            </div>
          </div>

          <aside className="min-w-0">
            <SidebarSection title="Assignees">
              {issue.assignees.length ? (
                <div className="flex flex-col gap-2">
                  {issue.assignees.map((assignee) => (
                    <div className="row gap-2" key={assignee.id}>
                      <div className="av sm" aria-hidden="true">
                        {avatarLabel(assignee.login)}
                      </div>
                      <span className="t-sm">{assignee.login}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="t-xs">No one assigned</p>
              )}
            </SidebarSection>

            <SidebarSection title="Labels">
              {issue.labels.length ? (
                <div className="flex flex-wrap gap-2">
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
                </div>
              ) : (
                <p className="t-xs">No labels</p>
              )}
            </SidebarSection>

            <SidebarSection title="Milestone">
              {issue.milestone ? (
                <span className="chip soft">{issue.milestone.title}</span>
              ) : (
                <p className="t-xs">No milestone</p>
              )}
            </SidebarSection>

            <SidebarSection title="Development">
              {issue.linkedPullRequest ? (
                <Link className="chip soft" href={issue.linkedPullRequest.href}>
                  PR #{issue.linkedPullRequest.number} ·{" "}
                  {issue.linkedPullRequest.state}
                </Link>
              ) : (
                <p className="t-xs">No linked pull requests</p>
              )}
            </SidebarSection>

            <SidebarSection title="Attachments">
              {issue.attachments.length ? (
                <div className="flex flex-col gap-2">
                  {issue.attachments.map((attachment) => (
                    <div className="card p-3" key={attachment.id}>
                      <p className="t-sm font-medium">{attachment.fileName}</p>
                      <p className="t-xs">
                        {bytesLabel(attachment.byteSize)} ·{" "}
                        {attachment.storageStatus.replaceAll("_", " ")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="t-xs">No attachments</p>
              )}
            </SidebarSection>

            <SidebarSection title="Notifications">
              <p className="t-xs">
                {issue.subscription.subscribed
                  ? `Subscribed: ${issue.subscription.reason}`
                  : "Not subscribed"}
              </p>
            </SidebarSection>

            <SidebarSection title="Participants">
              {issue.participants.length ? (
                <div className="flex flex-wrap gap-1">
                  {issue.participants.map((participant) => (
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
