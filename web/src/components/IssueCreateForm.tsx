"use client";

import Link from "next/link";
import type { KeyboardEvent } from "react";
import { useMemo, useState } from "react";
import { MarkdownBody } from "@/components/MarkdownBody";
import type {
  ApiErrorEnvelope,
  CreatedIssue,
  RenderedMarkdown,
} from "@/lib/api";

type IssueCreateFormProps = {
  owner: string;
  repo: string;
  initialTitle?: string;
  initialBody?: string;
  defaultLabelIds?: string[];
  defaultAssigneeUserIds?: string[];
  templateName?: string | null;
  cancelHref: string;
  onCreated?: (issue: CreatedIssue) => void;
  previewMarkdown?: (markdown: string) => Promise<RenderedMarkdown>;
};

type ToolbarAction = {
  label: string;
  prefix: string;
  suffix: string;
  placeholder: string;
};

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: "B", prefix: "**", suffix: "**", placeholder: "bold" },
  { label: "I", prefix: "_", suffix: "_", placeholder: "italic" },
  { label: "Code", prefix: "`", suffix: "`", placeholder: "code" },
  {
    label: "Link",
    prefix: "[",
    suffix: "](https://example.com)",
    placeholder: "link",
  },
  { label: "Task", prefix: "- [ ] ", suffix: "", placeholder: "task" },
  { label: "Quote", prefix: "> ", suffix: "", placeholder: "quote" },
];

const EMPTY_PREVIEW = "<p>Nothing to preview</p>";

function defaultRendered(markdown: string): RenderedMarkdown {
  return {
    contentSha: "local-preview",
    html: markdown.trim() ? `<p>${escapeHtml(markdown)}</p>` : EMPTY_PREVIEW,
    cached: false,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function errorMessageFromEnvelope(envelope: ApiErrorEnvelope | null) {
  return envelope?.error.message ?? "Issue could not be created.";
}

export function IssueCreateForm({
  owner,
  repo,
  initialTitle = "",
  initialBody = "",
  defaultLabelIds = [],
  defaultAssigneeUserIds = [],
  templateName = null,
  cancelHref,
  onCreated,
  previewMarkdown,
}: IssueCreateFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [createMore, setCreateMore] = useState(false);
  const [rendered, setRendered] = useState<RenderedMarkdown>(
    defaultRendered(initialBody),
  );
  const [isPreviewPending, setIsPreviewPending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleTouched, setTitleTouched] = useState(false);
  const [createdIssue, setCreatedIssue] = useState<CreatedIssue | null>(null);

  const titleError = useMemo(
    () => (title.trim() ? null : "Title is required."),
    [title],
  );
  const canSubmit = !titleError && !isSubmitting;
  const createEndpoint = `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/new/create`;

  async function showPreview(nextBody = body) {
    setTab("preview");
    setIsPreviewPending(true);
    setError(null);
    try {
      const nextRendered =
        previewMarkdown !== undefined
          ? await previewMarkdown(nextBody)
          : await fetch("/markdown/preview", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                markdown: nextBody,
                owner,
                repo,
                enableTaskToggles: true,
              }),
            }).then((response) => {
              if (!response.ok) {
                throw new Error("Preview failed");
              }
              return response.json() as Promise<RenderedMarkdown>;
            });
      setRendered(
        nextBody.trim()
          ? nextRendered
          : { ...nextRendered, html: EMPTY_PREVIEW },
      );
    } catch {
      setRendered(defaultRendered(nextBody));
      setError("Preview could not be rendered.");
    } finally {
      setIsPreviewPending(false);
    }
  }

  function applyToolbarAction(action: ToolbarAction) {
    setBody((current) =>
      current
        ? `${current}\n${action.prefix}${action.placeholder}${action.suffix}`
        : `${action.prefix}${action.placeholder}${action.suffix}`,
    );
    setTab("write");
  }

  async function submit() {
    setTitleTouched(true);
    setError(null);
    setCreatedIssue(null);
    if (titleError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(createEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() ? body : null,
          labelIds: defaultLabelIds,
          assigneeUserIds: defaultAssigneeUserIds,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | CreatedIssue
        | ApiErrorEnvelope
        | null;

      if (!response.ok) {
        setError(errorMessageFromEnvelope(payload as ApiErrorEnvelope | null));
        return;
      }

      const issue = payload as CreatedIssue;
      if (createMore) {
        setCreatedIssue(issue);
        setTitle("");
        setBody("");
        setRendered(defaultRendered(""));
        setTab("write");
        setTitleTouched(false);
        return;
      }

      if (onCreated) {
        onCreated(issue);
      } else {
        window.location.assign(
          issue.href ?? `/${owner}/${repo}/issues/${issue.number}`,
        );
      }
    } catch {
      setError("Issue could not be created.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <section aria-labelledby="issue-create-title" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="t-label" style={{ color: "var(--accent)" }}>
            Issues
          </p>
          <h1 className="t-h1 mt-2" id="issue-create-title">
            Create new issue
          </h1>
          <p className="t-sm mt-2 max-w-2xl" style={{ color: "var(--ink-3)" }}>
            {templateName
              ? `Using the ${templateName} template. Review the defaults, then create the issue.`
              : "Start with a focused title and a Markdown body."}
          </p>
        </div>
        <Link className="btn" href={cancelHref}>
          Cancel
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b p-4" style={{ borderColor: "var(--line)" }}>
          <label className="t-label" htmlFor="issue-title">
            Title <span aria-hidden="true">*</span>
          </label>
          <input
            aria-describedby={
              titleTouched && titleError ? "title-error" : undefined
            }
            aria-invalid={titleTouched && titleError ? "true" : "false"}
            className="input mt-2 w-full"
            id="issue-title"
            onBlur={() => setTitleTouched(true)}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Briefly describe the work"
            required
            value={title}
          />
          {titleTouched && titleError ? (
            <p
              className="mt-2 t-sm"
              id="title-error"
              role="alert"
              style={{ color: "var(--err)" }}
            >
              {titleError}
            </p>
          ) : null}
        </div>

        <div>
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2"
            style={{
              borderColor: "var(--line)",
              background: "var(--surface-2)",
            }}
          >
            <div
              aria-label="Markdown formatting toolbar"
              className="flex flex-wrap gap-1"
              role="toolbar"
            >
              {TOOLBAR_ACTIONS.map((action) => (
                <button
                  className="btn ghost sm"
                  key={action.label}
                  onClick={() => applyToolbarAction(action)}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
            <span className="kbd">Command+Enter</span>
          </div>
          <div
            aria-label="Issue body tabs"
            className="tabs px-4 pt-3"
            role="tablist"
          >
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
          <div className="p-4">
            {tab === "write" ? (
              <div>
                <label className="sr-only" htmlFor="issue-body">
                  Issue body
                </label>
                <textarea
                  className="input min-h-72 w-full resize-y p-3 t-mono leading-6"
                  id="issue-body"
                  onChange={(event) => setBody(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add context, reproduction steps, screenshots, or a task list."
                  value={body}
                />
                <p className="mt-2 t-xs" style={{ color: "var(--ink-3)" }}>
                  Markdown is supported. Attachments are planned for a later
                  phase.
                </p>
              </div>
            ) : (
              <div>
                <MarkdownBody html={rendered.html} />
                {isPreviewPending ? (
                  <p
                    className="mt-3 t-sm"
                    role="status"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Rendering preview...
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <p className="chip err" role="alert">
          {error}
        </p>
      ) : null}
      {createdIssue ? (
        <p className="chip ok" role="status">
          Created{" "}
          <Link
            className="underline"
            href={createdIssue.href ?? `${cancelHref}/${createdIssue.number}`}
          >
            issue #{createdIssue.number}
          </Link>
          . The form is ready for another issue.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-2 t-sm" htmlFor="create-more">
          <input
            checked={createMore}
            id="create-more"
            onChange={(event) => setCreateMore(event.target.checked)}
            type="checkbox"
          />
          Create more
        </label>
        <div className="flex flex-wrap gap-2">
          <Link className="btn" href={cancelHref}>
            Cancel
          </Link>
          <button
            className="btn accent"
            disabled={!canSubmit}
            onClick={() => void submit()}
            type="button"
          >
            {isSubmitting ? "Creating..." : "Create issue"}
          </button>
        </div>
      </div>
    </section>
  );
}
