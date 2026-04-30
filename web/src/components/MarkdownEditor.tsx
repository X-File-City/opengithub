"use client";

import { useMemo, useState } from "react";
import { MarkdownBody } from "@/components/MarkdownBody";
import type { RenderedMarkdown } from "@/lib/api";

type MarkdownEditorProps = {
  initialMarkdown: string;
  initialRendered: RenderedMarkdown;
  owner?: string;
  repo?: string;
  refName?: string;
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

export function MarkdownEditor({
  initialMarkdown,
  initialRendered,
  owner,
  repo,
  refName,
  previewMarkdown,
}: MarkdownEditorProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [rendered, setRendered] = useState(initialRendered);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const lineCount = useMemo(() => markdown.split("\n").length, [markdown]);

  function applyToolbarAction(action: ToolbarAction) {
    setMarkdown(
      (current) =>
        `${current}\n${action.prefix}${action.placeholder}${action.suffix}`,
    );
    setTab("write");
  }

  function refreshPreview(nextMarkdown = markdown) {
    setError(null);
    setIsPending(true);
    void (async () => {
      try {
        const nextRendered =
          previewMarkdown !== undefined
            ? await previewMarkdown(nextMarkdown)
            : await fetch("/markdown/preview", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  markdown: nextMarkdown,
                  owner,
                  repo,
                  ref: refName,
                  enableTaskToggles: true,
                }),
              }).then((response) => {
                if (!response.ok) {
                  throw new Error("Preview failed");
                }
                return response.json() as Promise<RenderedMarkdown>;
              });

        setRendered(nextRendered);
      } catch {
        setError("Preview could not be rendered.");
      } finally {
        setIsPending(false);
      }
    })();
  }

  function showPreview() {
    setTab("preview");
    refreshPreview();
  }

  return (
    <section aria-labelledby="markdown-editor-title" className="card">
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2"
        style={{
          borderBottom: "1px solid var(--line)",
          background: "var(--surface-2)",
        }}
      >
        <h2 className="t-h3" id="markdown-editor-title">
          Markdown editor
        </h2>
        <div
          aria-label="Markdown formatting toolbar"
          className="flex flex-wrap items-center gap-1"
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
      </div>
      <div
        aria-label="Markdown editor tabs"
        className="tabs flex px-4 pt-3"
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
          onClick={showPreview}
          role="tab"
          type="button"
        >
          Preview
        </button>
      </div>
      <div className="p-4">
        {tab === "write" ? (
          <div>
            <label className="sr-only" htmlFor="markdown-source">
              Markdown source
            </label>
            <textarea
              className="input min-h-72 w-full resize-y p-3 t-mono leading-6"
              style={{ color: "var(--ink-1)" }}
              id="markdown-source"
              onChange={(event) => setMarkdown(event.target.value)}
              value={markdown}
            />
            <p className="mt-2 t-xs" style={{ color: "var(--ink-3)" }}>
              {lineCount} lines
            </p>
          </div>
        ) : (
          <div>
            <MarkdownBody html={rendered.html} />
            {isPending ? (
              <p
                className="mt-3 t-sm"
                style={{ color: "var(--ink-3)" }}
                role="status"
              >
                Rendering preview...
              </p>
            ) : null}
            {error ? (
              <p
                className="mt-3 t-sm"
                style={{ color: "var(--err)" }}
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
