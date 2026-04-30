"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  RepositoryBranchSelector,
  RepositoryFileFinder,
} from "@/components/RepositoryCodeToolbar";
import type { RepositoryBlobView } from "@/lib/api";

type RepositoryBlobViewerProps = {
  blob: RepositoryBlobView;
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

function BlobToolbar({ blob }: RepositoryBlobViewerProps) {
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
          aria-current="page"
          className="bg-[#f6f8fa] px-3 py-1.5 text-[#1f2328]"
          href={current}
        >
          Code
        </Link>
        <Link
          className="border-l border-[#d0d7de] px-3 py-1.5 text-[#1f2328] hover:bg-[#f6f8fa]"
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
        <Link
          className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#f6f8fa]"
          href={`${current}?symbols=1`}
        >
          Symbols
        </Link>
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
          {rows.map((line, index) => {
            const lineNumber = index + 1;
            return (
              <tr
                className="group align-top hover:bg-[#fff8c5]"
                key={`${lineNumber}-${line}`}
              >
                <td className="w-16 border-r border-[#d0d7de] bg-[#f6f8fa]">
                  <LineNumber line={lineNumber} />
                </td>
                <td className="whitespace-pre-wrap break-words px-4 text-[#1f2328]">
                  {line || " "}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export function RepositoryBlobViewer({ blob }: RepositoryBlobViewerProps) {
  const toolbarRepository = useMemo(
    () => ({
      ...blob,
      files: [blob.file],
    }),
    [blob],
  );

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
            <BlobToolbar blob={blob} />
          </div>
          {blob.isBinary || blob.isLarge ? (
            <BinaryFallback blob={blob} />
          ) : (
            <div className="max-h-[760px] overflow-auto bg-white">
              <CodeTable blob={blob} />
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
