"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MarkdownBody } from "@/components/MarkdownBody";
import type {
  ApiErrorEnvelope,
  IssueTimelineItem,
  RenderedMarkdown,
} from "@/lib/api";

type IssueTimelineProps = {
  owner: string;
  repo: string;
  issueNumber: number;
  initialItems: IssueTimelineItem[];
  viewerAuthenticated: boolean;
  loginHref: string;
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

function eventText(item: IssueTimelineItem) {
  const actor = item.actor?.login ?? "Someone";
  switch (item.eventType) {
    case "opened":
      return `${actor} opened this issue`;
    case "closed":
      return `${actor} closed this issue`;
    case "open":
      return `${actor} reopened this issue`;
    case "reopened":
      return `${actor} reopened this issue`;
    default:
      return `${actor} added a ${item.eventType.replaceAll("_", " ")} event`;
  }
}

function TimelineEvent({ item }: { item: IssueTimelineItem }) {
  if (item.comment) {
    const actor = item.actor?.login ?? "unknown";
    const titleId = `issue-comment-${item.comment.id}`;
    return (
      <article className="flex gap-4">
        <div className="av lg shrink-0" aria-hidden="true">
          {avatarLabel(actor)}
        </div>
        <div className="card min-w-0 flex-1 overflow-hidden">
          <div
            className="flex flex-wrap items-center gap-2 border-b px-4 py-3"
            style={{
              background: "var(--surface-2)",
              borderColor: "var(--line)",
            }}
          >
            <h2 className="t-sm font-semibold" id={titleId}>
              {actor}
            </h2>
            <span className="t-xs">
              commented {relativeTime(item.comment.createdAt)}
            </span>
            <span className="chip soft ml-auto">comment</span>
          </div>
          <div className="p-5">
            {item.comment.isMinimized ? (
              <p className="t-sm" style={{ color: "var(--ink-3)" }}>
                This comment is minimized.
              </p>
            ) : (
              <MarkdownBody html={item.comment.bodyHtml} labelledBy={titleId} />
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="flex gap-4">
      <div
        aria-hidden="true"
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          color: "var(--ink-3)",
        }}
      >
        <span className="t-mono-sm">*</span>
      </div>
      <p className="t-sm py-1" style={{ color: "var(--ink-3)" }}>
        <strong style={{ color: "var(--ink-1)" }}>{eventText(item)}</strong>{" "}
        {relativeTime(item.createdAt)}
      </p>
    </div>
  );
}

function CommentComposer({
  owner,
  repo,
  issueNumber,
  onCreated,
}: {
  owner: string;
  repo: string;
  issueNumber: number;
  onCreated: (item: IssueTimelineItem) => void;
}) {
  const [body, setBody] = useState("");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [preview, setPreview] = useState<RenderedMarkdown | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canSubmit = body.trim().length > 0 && !isSubmitting;

  async function showPreview() {
    setTab("preview");
    setMessage(null);
    setIsPreviewing(true);
    try {
      const response = await fetch("/markdown/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          markdown: body,
          owner,
          repo,
          enableTaskToggles: false,
        }),
      });
      if (!response.ok) {
        throw new Error("Preview failed");
      }
      setPreview((await response.json()) as RenderedMarkdown);
    } catch {
      setMessage("Preview could not be rendered.");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function submit() {
    if (!canSubmit) {
      return;
    }
    setMessage(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const envelope = payload as ApiErrorEnvelope | null;
        throw new Error(
          envelope?.error.message ?? "Comment could not be posted.",
        );
      }
      onCreated(payload as IssueTimelineItem);
      setBody("");
      setPreview(null);
      setTab("write");
      setMessage("Comment posted.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Comment could not be posted.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card overflow-hidden" aria-labelledby="comment-title">
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
        style={{
          background: "var(--surface-2)",
          borderColor: "var(--line)",
        }}
      >
        <h2 className="t-h3" id="comment-title">
          Add a comment
        </h2>
        <div className="tabs" role="tablist" aria-label="Comment editor">
          <button
            aria-selected={tab === "write"}
            className={`tab${tab === "write" ? " active" : ""}`}
            onClick={() => setTab("write")}
            role="tab"
            type="button"
          >
            Write
          </button>
          <button
            aria-selected={tab === "preview"}
            className={`tab${tab === "preview" ? " active" : ""}`}
            onClick={() => void showPreview()}
            role="tab"
            type="button"
          >
            Preview
          </button>
        </div>
      </div>
      <div className="p-4">
        {tab === "write" ? (
          <>
            <label className="sr-only" htmlFor="issue-comment-body">
              Comment body
            </label>
            <textarea
              className="input min-h-40 w-full resize-y p-3 t-mono leading-6"
              id="issue-comment-body"
              onChange={(event) => setBody(event.target.value)}
              placeholder="Leave a comment"
              value={body}
            />
            <p className="mt-2 t-xs">
              Markdown is supported. Attachments are coming in a later phase.
            </p>
          </>
        ) : (
          <div>
            {preview ? (
              <MarkdownBody html={preview.html} />
            ) : (
              <p className="t-sm" style={{ color: "var(--ink-3)" }}>
                {isPreviewing ? "Rendering preview..." : "Nothing to preview."}
              </p>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {message ? (
            <p
              className="t-sm"
              role={message === "Comment posted." ? "status" : "alert"}
              style={{
                color:
                  message === "Comment posted." ? "var(--ok)" : "var(--err)",
              }}
            >
              {message}
            </p>
          ) : (
            <span />
          )}
          <button
            className="btn accent"
            disabled={!canSubmit}
            onClick={() => void submit()}
            type="button"
          >
            {isSubmitting ? "Posting..." : "Comment"}
          </button>
        </div>
      </div>
    </section>
  );
}

export function IssueTimeline({
  owner,
  repo,
  issueNumber,
  initialItems,
  viewerAuthenticated,
  loginHref,
}: IssueTimelineProps) {
  const [items, setItems] = useState(initialItems);
  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [items],
  );

  return (
    <section aria-labelledby="conversation-title">
      <h2 className="sr-only" id="conversation-title">
        Conversation
      </h2>
      <div
        className="flex flex-col gap-5 border-l pl-6"
        style={{ borderColor: "var(--line)" }}
      >
        {sortedItems.map((item) => (
          <TimelineEvent item={item} key={item.id} />
        ))}
        {viewerAuthenticated ? (
          <CommentComposer
            issueNumber={issueNumber}
            onCreated={(item) => setItems((current) => [...current, item])}
            owner={owner}
            repo={repo}
          />
        ) : (
          <div className="card p-4">
            <p className="t-sm">
              <Link className="font-semibold" href={loginHref}>
                Sign in
              </Link>{" "}
              to join the conversation.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
