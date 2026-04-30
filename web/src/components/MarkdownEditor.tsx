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
    <section
      aria-labelledby="markdown-editor-title"
      className="rounded-md border border-[#d0d7de] bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-2">
        <h2
          className="text-sm font-semibold text-[#1f2328]"
          id="markdown-editor-title"
        >
          Markdown editor
        </h2>
        <div
          aria-label="Markdown formatting toolbar"
          className="flex flex-wrap items-center gap-1"
          role="toolbar"
        >
          {TOOLBAR_ACTIONS.map((action) => (
            <button
              className="h-8 rounded-md border border-transparent px-2 text-sm font-semibold text-[#1f2328] hover:border-[#d0d7de] hover:bg-white"
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
        className="flex border-b border-[#d0d7de] px-4 pt-3"
        role="tablist"
      >
        <button
          aria-selected={tab === "write"}
          className="border-b-2 px-3 py-2 text-sm font-semibold aria-selected:border-[#fd8c73] aria-selected:text-[#1f2328]"
          onClick={() => setTab("write")}
          role="tab"
          type="button"
        >
          Write
        </button>
        <button
          aria-selected={tab === "preview"}
          className="border-b-2 px-3 py-2 text-sm font-semibold aria-selected:border-[#fd8c73] aria-selected:text-[#1f2328]"
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
              className="min-h-72 w-full resize-y rounded-md border border-[#d0d7de] p-3 font-mono text-sm leading-6 text-[#1f2328]"
              id="markdown-source"
              onChange={(event) => setMarkdown(event.target.value)}
              value={markdown}
            />
            <p className="mt-2 text-xs text-[#59636e]">{lineCount} lines</p>
          </div>
        ) : (
          <div>
            <MarkdownBody html={rendered.html} />
            {isPending ? (
              <p className="mt-3 text-sm text-[#59636e]" role="status">
                Rendering preview...
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 text-sm text-[#cf222e]" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
