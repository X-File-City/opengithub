"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  RepositoryBranchSelector,
  RepositoryFileFinder,
} from "@/components/RepositoryCodeToolbar";
import type { RepositoryBlameView, RepositoryBlobView } from "@/lib/api";
import {
  type HighlightNode,
  highlightCodeLine,
} from "@/lib/syntax-highlighter";

type RepositoryBlobViewerProps = {
  blob: RepositoryBlobView;
  initialBlame?: RepositoryBlameView | null;
  initialMode?: "code" | "blame";
  initialSymbolsOpen?: boolean;
};

function splitPath(path: string) {
  return path.split("/").filter(Boolean);
}

function encodedPath(path: string) {
  return splitPath(path).map(encodeURIComponent).join("/");
}

function repositoryBase(blob: RepositoryBlobView) {
  return `/${blob.owner_login}/${blob.name}`;
}

function refSegment(blob: RepositoryBlobView) {
  return encodeURIComponent(blob.resolvedRef.shortName || blob.refName);
}

function rawHref(blob: RepositoryBlobView) {
  return `${repositoryBase(blob)}/raw/${refSegment(blob)}/${encodedPath(
    blob.path,
  )}`;
}

function downloadHref(blob: RepositoryBlobView) {
  return `${repositoryBase(blob)}/download/${refSegment(blob)}/${encodedPath(
    blob.path,
  )}`;
}

function currentBlobHref(blob: RepositoryBlobView) {
  return `${repositoryBase(blob)}/blob/${refSegment(blob)}/${encodedPath(
    blob.path,
  )}`;
}

function formatCommitTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function lineRows(content: string) {
  const lines = content.split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines.length > 0 ? lines : [""];
}

function LineNumber({ line }: { line: number }) {
  return (
    <a
      aria-label={`Line ${line}`}
      className="block select-none px-3 text-right text-[#59636e] hover:text-[#0969da]"
      href={`#L${line}`}
      id={`L${line}`}
    >
      {line}
    </a>
  );
}

function highlightedText(node: HighlightNode): string {
  if (node.type === "text") {
    return node.value;
  }
  return (node.children ?? []).map(highlightedText).join("");
}

function HighlightedCode({ nodes }: { nodes: HighlightNode[] }): ReactNode {
  return nodes.map((node) => {
    if (node.type === "text") {
      return node.value;
    }
    const className = node.properties?.className?.join(" ");
    return (
      <span
        className={className}
        key={`${node.tagName}-${className ?? "plain"}-${highlightedText(node)}`}
      >
        <HighlightedCode nodes={node.children ?? []} />
      </span>
    );
  });
}

function BlobToolbar({
  blob,
  mode,
  onLineJump,
  onSymbolsOpen,
}: {
  blob: RepositoryBlobView;
  mode: "code" | "blame";
  onLineJump: () => void;
  onSymbolsOpen: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const base = repositoryBase(blob);
  const raw = rawHref(blob);
  const download = downloadHref(blob);
  const current = currentBlobHref(blob);

  async function copyRaw() {
    try {
      const response = await fetch(raw);
      if (!response.ok) {
        throw new Error("raw fetch failed");
      }
      await navigator.clipboard.writeText(await response.text());
      setCopyStatus("Raw content copied");
    } catch {
      setCopyStatus("Copy unavailable");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <fieldset className="inline-flex overflow-hidden rounded-md border border-[#d0d7de] bg-white text-sm font-semibold">
        <legend className="sr-only">Blob view mode</legend>
        <Link
          aria-current={mode === "code" ? "page" : undefined}
          className={`px-3 py-1.5 text-[#1f2328] ${
            mode === "code" ? "bg-[#f6f8fa]" : "hover:bg-[#f6f8fa]"
          }`}
          href={current}
        >
          Code
        </Link>
        <Link
          aria-current={mode === "blame" ? "page" : undefined}
          className={`border-l border-[#d0d7de] px-3 py-1.5 text-[#1f2328] ${
            mode === "blame" ? "bg-[#f6f8fa]" : "hover:bg-[#f6f8fa]"
          }`}
          href={`${current}?view=blame`}
        >
          Blame
        </Link>
      </fieldset>
      <span className="text-sm text-[#59636e]">
        {blob.lineCount} lines ({blob.locCount} loc) · {blob.sizeLabel}
        {blob.language ? ` · ${blob.language}` : ""}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2 max-md:ml-0">
        <button
          className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#f6f8fa]"
          onClick={onSymbolsOpen}
          type="button"
        >
          Symbols
        </button>
        {!blob.isBinary && !blob.isLarge ? (
          <button
            className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#f6f8fa]"
            onClick={onLineJump}
            type="button"
          >
            Jump to line
          </button>
        ) : null}
        <Link
          className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#f6f8fa]"
          href={raw}
        >
          Raw
        </Link>
        <button
          className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#f6f8fa]"
          onClick={copyRaw}
          type="button"
        >
          Copy raw
        </button>
        <Link
          className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#f6f8fa]"
          download={blob.pathName}
          href={download}
        >
          Download
        </Link>
        <details className="relative">
          <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#f6f8fa]">
            More
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-md border border-[#d0d7de] bg-white py-1 text-sm shadow-lg">
            <Link
              className="block px-3 py-2 text-[#1f2328] hover:bg-[#f6f8fa]"
              href={blob.permalinkHref}
            >
              Copy permalink target
            </Link>
            <Link
              className="block px-3 py-2 text-[#1f2328] hover:bg-[#f6f8fa]"
              href={blob.defaultBranchHref}
            >
              Open default branch
            </Link>
            <Link
              className="block px-3 py-2 text-[#1f2328] hover:bg-[#f6f8fa]"
              href={`${base}/commits/${refSegment(blob)}`}
            >
              Repository commits
            </Link>
          </div>
        </details>
      </div>
      {copyStatus ? (
        <p className="basis-full text-xs text-[#1a7f37]" role="status">
          {copyStatus}
        </p>
      ) : null}
    </div>
  );
}

function LatestCommitStrip({ blob }: RepositoryBlobViewerProps) {
  const commit = blob.latestPathCommit ?? blob.latestCommit;
  if (!commit) {
    return (
      <div className="rounded-md border border-[#d0d7de] bg-white px-4 py-3 text-sm text-[#59636e]">
        No commit metadata is available for this file yet.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-[#d0d7de] bg-white px-4 py-3 text-sm">
      <span className="font-semibold text-[#1f2328]">{blob.owner_login}</span>
      <Link
        className="min-w-0 flex-1 truncate text-[#0969da] hover:underline"
        href={commit.href}
      >
        {commit.message}
      </Link>
      <Link
        className="font-mono text-xs text-[#59636e] hover:text-[#0969da]"
        href={commit.href}
      >
        {commit.shortOid}
      </Link>
      <span className="text-xs text-[#59636e]">
        {formatCommitTime(commit.committedAt)}
      </span>
      <Link
        className="text-sm font-semibold text-[#0969da] hover:underline"
        href={blob.historyHref}
      >
        History
      </Link>
    </div>
  );
}

function BinaryFallback({ blob }: RepositoryBlobViewerProps) {
  const message = blob.isLarge
    ? "This file is too large to render inline."
    : "This binary file cannot be previewed inline.";

  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-base font-semibold text-[#1f2328]">{message}</p>
      <p className="max-w-xl text-sm text-[#59636e]">
        Use Raw or Download to inspect the stored blob without rendering it in
        the code viewer.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
          href={rawHref(blob)}
        >
          Open raw file
        </Link>
        <Link
          className="inline-flex h-8 items-center rounded-md bg-[#1f883d] px-3 text-sm font-semibold text-white hover:bg-[#1a7f37]"
          download={blob.pathName}
          href={downloadHref(blob)}
        >
          Download file
        </Link>
      </div>
    </div>
  );
}

function CodeTable({ blob }: RepositoryBlobViewerProps) {
  const content = blob.displayContent ?? blob.file.content;
  const rows = useMemo(() => lineRows(content), [content]);
  const highlightedRows = useMemo(
    () =>
      rows.map((line) => ({
        line,
        nodes: highlightCodeLine(line, blob.language),
      })),
    [blob.language, rows],
  );

  return (
    <>
      <textarea
        aria-label={`Raw contents of ${blob.path}`}
        className="sr-only"
        readOnly
        value={content}
      />
      <table className="w-full table-fixed border-collapse font-mono text-xs leading-5">
        <tbody>
          {highlightedRows.map(({ line, nodes }, index) => {
            const lineNumber = index + 1;
            return (
              <tr
                className="group align-top hover:bg-[#fff8c5]"
                key={`${lineNumber}-${line}`}
              >
                <td className="w-16 border-r border-[#d0d7de] bg-[#f6f8fa]">
                  <LineNumber line={lineNumber} />
                </td>
                <td className="whitespace-pre-wrap break-words px-4 text-[#1f2328] [&_.hljs-attr]:text-[#0550ae] [&_.hljs-built_in]:text-[#8250df] [&_.hljs-comment]:text-[#6e7781] [&_.hljs-keyword]:font-semibold [&_.hljs-keyword]:text-[#cf222e] [&_.hljs-literal]:text-[#0550ae] [&_.hljs-number]:text-[#0550ae] [&_.hljs-string]:text-[#0a3069] [&_.hljs-title]:text-[#6639ba] [&_.hljs-type]:text-[#953800]">
                  {line ? (
                    <span>
                      <HighlightedCode nodes={nodes} />
                    </span>
                  ) : (
                    " "
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function SymbolPanel({
  blob,
  onClose,
}: {
  blob: RepositoryBlobView;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const symbols = blob.symbols.filter((symbol) => {
    if (!normalizedQuery) {
      return true;
    }
    return (
      symbol.name.toLowerCase().includes(normalizedQuery) ||
      symbol.preview.toLowerCase().includes(normalizedQuery) ||
      symbol.kind.toLowerCase().includes(normalizedQuery)
    );
  });

  function jumpToLine(lineNumber: number) {
    const target = document.getElementById(`L${lineNumber}`);
    target?.scrollIntoView({ block: "center" });
    target?.focus();
    window.history.replaceState(null, "", `#L${lineNumber}`);
    onClose();
  }

  return (
    <aside
      aria-label="File symbols"
      className="rounded-md border border-[#d0d7de] bg-white p-3"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-[#1f2328]">Symbols</h2>
        <button
          className="ml-auto inline-flex h-7 items-center rounded-md border border-[#d0d7de] bg-white px-2 text-xs font-semibold text-[#1f2328] hover:bg-[#f6f8fa]"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
      <label className="mt-3 block text-xs font-semibold text-[#59636e]">
        Filter symbols
        <input
          className="mt-1 h-8 w-full rounded-md border border-[#d0d7de] px-2 text-sm font-normal text-[#1f2328]"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search file symbols"
          type="search"
          value={query}
        />
      </label>
      <div className="mt-3 max-h-80 overflow-auto">
        {symbols.length > 0 ? (
          <ul className="space-y-1">
            {symbols.map((symbol) => (
              <li key={`${symbol.lineNumber}-${symbol.name}`}>
                <button
                  className="grid w-full grid-cols-[1fr_auto] gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[#f6f8fa]"
                  onClick={() => jumpToLine(symbol.lineNumber)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#0969da]">
                      {symbol.name}
                    </span>
                    <span className="block truncate font-mono text-xs text-[#59636e]">
                      {symbol.preview}
                    </span>
                  </span>
                  <span className="text-xs text-[#59636e]">
                    L{symbol.lineNumber}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md bg-[#f6f8fa] p-3 text-sm text-[#59636e]">
            No symbols found for this file.
          </p>
        )}
      </div>
    </aside>
  );
}

function BlameTable({
  blame,
}: {
  blame: RepositoryBlameView | null | undefined;
}) {
  if (!blame) {
    return (
      <div className="p-6 text-sm text-[#59636e]" role="status">
        Blame attribution is unavailable for this file.
      </div>
    );
  }

  return (
    <table className="w-full table-fixed border-collapse font-mono text-xs leading-5">
      <tbody>
        {blame.lines.map((line) => (
          <tr
            className="group align-top hover:bg-[#fff8c5]"
            key={`${line.lineNumber}-${line.commit.oid}`}
          >
            <td className="w-52 border-r border-[#d0d7de] bg-[#f6f8fa] px-3 py-0.5 text-[#59636e]">
              <Link
                className="block truncate font-sans text-xs font-semibold text-[#0969da] hover:underline"
                href={line.commit.href}
                title={line.commit.message}
              >
                {line.commit.shortOid} {line.commit.authorLogin ?? "Unknown"}
              </Link>
              <span
                className="block truncate font-sans"
                title={line.commit.message}
              >
                {line.commit.message}
              </span>
            </td>
            <td className="w-16 border-r border-[#d0d7de] bg-[#f6f8fa]">
              <LineNumber line={line.lineNumber} />
            </td>
            <td className="whitespace-pre-wrap break-words px-4 text-[#1f2328]">
              {line.content || " "}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LineJumpDialog({
  maxLine,
  onClose,
}: {
  maxLine: number;
  onClose: () => void;
}) {
  const [line, setLine] = useState("1");
  const clampedMax = Math.max(1, maxLine);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number.parseInt(line, 10);
    const targetLine = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), clampedMax)
      : 1;
    const target = document.getElementById(`L${targetLine}`);
    target?.scrollIntoView({ block: "center" });
    target?.focus();
    window.history.replaceState(null, "", `#L${targetLine}`);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/20 px-4"
      role="presentation"
    >
      <form
        aria-label="Jump to line"
        className="w-full max-w-sm rounded-md border border-[#d0d7de] bg-white p-4 shadow-xl"
        onSubmit={submit}
      >
        <label
          className="block text-sm font-semibold text-[#1f2328]"
          htmlFor="blob-line-jump"
        >
          Jump to line
        </label>
        <input
          className="mt-2 h-9 w-full rounded-md border border-[#d0d7de] px-3 text-sm"
          id="blob-line-jump"
          max={clampedMax}
          min={1}
          onChange={(event) => setLine(event.target.value)}
          type="number"
          value={line}
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#f6f8fa]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-8 items-center rounded-md bg-[#1f883d] px-3 text-sm font-semibold text-white hover:bg-[#1a7f37]"
            type="submit"
          >
            Jump
          </button>
        </div>
      </form>
    </div>
  );
}

export function RepositoryBlobViewer({
  blob,
  initialBlame,
  initialMode = "code",
  initialSymbolsOpen = false,
}: RepositoryBlobViewerProps) {
  const [lineJumpOpen, setLineJumpOpen] = useState(false);
  const [symbolsOpen, setSymbolsOpen] = useState(initialSymbolsOpen);
  const mode =
    initialMode === "blame" && !blob.isBinary && !blob.isLarge
      ? "blame"
      : "code";
  const toolbarRepository = useMemo(
    () => ({
      ...blob,
      files: [blob.file],
    }),
    [blob],
  );
  const current = currentBlobHref(blob);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase() ?? "";
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable ||
        blob.isBinary ||
        blob.isLarge
      ) {
        return;
      }
      if (event.key === "y") {
        event.preventDefault();
        window.history.replaceState(null, "", blob.permalinkHref);
      }
      if (event.key === "b") {
        event.preventDefault();
        window.location.assign(
          mode === "blame" ? current : `${current}?view=blame`,
        );
      }
      if (event.key === "l") {
        event.preventDefault();
        setLineJumpOpen(true);
      }
      if (event.key === "Escape") {
        setLineJumpOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [blob.isBinary, blob.isLarge, blob.permalinkHref, current, mode]);

  return (
    <section
      aria-label="Repository file viewer"
      className="grid grid-cols-[minmax(0,16rem)_minmax(0,1fr)] gap-4 max-lg:grid-cols-1"
    >
      <aside className="rounded-md border border-[#d0d7de] bg-white p-3">
        <nav aria-label="Current file tree" className="text-sm">
          <Link
            className="block truncate rounded-md px-2 py-1.5 font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
            href={`${repositoryBase(blob)}/tree/${refSegment(blob)}`}
          >
            {blob.name}
          </Link>
          <div className="mt-2 border-l border-[#d0d7de] pl-3">
            {splitPath(blob.path).map((segment, index, parts) => {
              const path = parts.slice(0, index + 1).join("/");
              const isFile = index === parts.length - 1;
              return (
                <Link
                  aria-current={isFile ? "page" : undefined}
                  className={`block truncate rounded-md px-2 py-1.5 ${
                    isFile
                      ? "bg-[#ddf4ff] font-semibold text-[#0969da]"
                      : "text-[#1f2328] hover:bg-[#f6f8fa]"
                  }`}
                  href={
                    isFile
                      ? currentBlobHref(blob)
                      : `${repositoryBase(blob)}/tree/${refSegment(
                          blob,
                        )}/${encodedPath(path)}`
                  }
                  key={path}
                >
                  {segment}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <RepositoryBranchSelector
            activeRef={blob.resolvedRef.shortName}
            currentPath={blob.path}
            repository={toolbarRepository}
          />
          <RepositoryFileFinder
            activeRef={blob.resolvedRef.shortName}
            currentPath={blob.path}
            repository={toolbarRepository}
          />
          {blob.parentHref ? (
            <Link
              className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
              href={blob.parentHref}
            >
              Parent
            </Link>
          ) : null}
        </div>
        <div className="space-y-1">
          <nav
            aria-label="Current file"
            className="flex flex-wrap items-center gap-1 text-sm"
          >
            {blob.breadcrumbs.map((breadcrumb, index) => (
              <span
                className="flex min-w-0 items-center gap-1"
                key={breadcrumb.href}
              >
                {index > 0 ? <span className="text-[#59636e]">/</span> : null}
                <Link
                  className="max-w-48 truncate font-semibold text-[#0969da] hover:underline"
                  href={breadcrumb.href}
                >
                  {breadcrumb.name}
                </Link>
              </span>
            ))}
          </nav>
          <h1 className="text-xl font-semibold tracking-normal text-[#1f2328]">
            {blob.path}
          </h1>
        </div>
        <LatestCommitStrip blob={blob} />
        <section className="overflow-hidden rounded-md border border-[#d0d7de] bg-white">
          <div className="border-b border-[#d0d7de] bg-[#f6f8fa] px-3 py-2">
            <BlobToolbar
              blob={blob}
              mode={mode}
              onLineJump={() => setLineJumpOpen(true)}
              onSymbolsOpen={() => setSymbolsOpen(true)}
            />
          </div>
          {blob.isBinary || blob.isLarge ? (
            <BinaryFallback blob={blob} />
          ) : (
            <div className="max-h-[760px] overflow-auto bg-white">
              {mode === "blame" ? (
                <BlameTable blame={initialBlame} />
              ) : (
                <CodeTable blob={blob} />
              )}
            </div>
          )}
        </section>
        {lineJumpOpen ? (
          <LineJumpDialog
            maxLine={
              mode === "blame"
                ? (initialBlame?.lines.length ?? 1)
                : blob.lineCount
            }
            onClose={() => setLineJumpOpen(false)}
          />
        ) : null}
        {symbolsOpen ? (
          <SymbolPanel blob={blob} onClose={() => setSymbolsOpen(false)} />
        ) : null}
      </div>
    </section>
  );
}
