"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  RepositoryBranchSelector,
  RepositoryFileFinder,
} from "@/components/RepositoryCodeToolbar";
import { RepositoryFileTable } from "@/components/RepositoryFileTable";
import type { RepositoryPathOverview, RepositoryTreeEntry } from "@/lib/api";

type RepositoryTreeBrowserProps = {
  overview: RepositoryPathOverview;
};

function splitPath(path: string) {
  return path.split("/").filter(Boolean);
}

function joinEncodedPath(parts: string[]) {
  return parts.map(encodeURIComponent).join("/");
}

function repositoryBase(overview: RepositoryPathOverview) {
  return `/${overview.owner_login}/${overview.name}`;
}

function directoryHref(overview: RepositoryPathOverview, path: string) {
  const encodedPath = joinEncodedPath(splitPath(path));
  const suffix = encodedPath ? `/${encodedPath}` : "";
  return `${repositoryBase(overview)}/tree/${encodeURIComponent(
    overview.resolvedRef.shortName,
  )}${suffix}`;
}

function currentDirectoryHref(overview: RepositoryPathOverview) {
  return directoryHref(overview, overview.path);
}

function pagedDirectoryHref(overview: RepositoryPathOverview, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(overview.pageSize),
  });
  return `${currentDirectoryHref(overview)}?${params.toString()}`;
}

function TreePane({
  entries,
  overview,
}: {
  entries: RepositoryTreeEntry[];
  overview: RepositoryPathOverview;
}) {
  const directories = entries.filter((entry) => entry.kind === "folder");
  const files = entries.filter((entry) => entry.kind !== "folder");

  return (
    <nav aria-label="Repository file tree" className="text-sm">
      <Link
        className="block truncate rounded-md px-2 py-1.5 font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
        href={directoryHref(overview, "")}
      >
        {overview.name}
      </Link>
      {overview.path ? (
        <div className="mt-1 border-l border-[#d0d7de] pl-3">
          {splitPath(overview.path).map((segment, index, parts) => {
            const currentPath = parts.slice(0, index + 1).join("/");
            const active = currentPath === overview.path;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`block truncate rounded-md px-2 py-1.5 ${
                  active
                    ? "bg-[#ddf4ff] font-semibold text-[#0969da]"
                    : "text-[#1f2328] hover:bg-[#f6f8fa]"
                }`}
                href={directoryHref(overview, currentPath)}
                key={currentPath}
              >
                {segment}
              </Link>
            );
          })}
        </div>
      ) : null}
      <div className="mt-3 border-t border-[#d0d7de] pt-3">
        {[...directories, ...files].slice(0, 30).map((entry) => (
          <Link
            className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-[#1f2328] hover:bg-[#f6f8fa]"
            href={entry.href}
            key={entry.path}
          >
            <span aria-hidden="true" className="w-4 text-center text-[#59636e]">
              {entry.kind === "folder" ? "▸" : "□"}
            </span>
            <span className="truncate">{entry.name}</span>
          </Link>
        ))}
        {overview.hasMore ? (
          <Link
            className="mt-2 block rounded-md px-2 py-1.5 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
            href={pagedDirectoryHref(overview, overview.page + 1)}
          >
            Load more entries
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

function TreeToolbar({ overview }: RepositoryTreeBrowserProps) {
  const base = repositoryBase(overview);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RepositoryBranchSelector
        activeRef={overview.resolvedRef.shortName}
        currentPath={overview.path}
        repository={overview}
      />
      <RepositoryFileFinder
        activeRef={overview.resolvedRef.shortName}
        currentPath={overview.path}
        repository={overview}
      />
      <div className="ml-auto flex flex-wrap items-center gap-2 max-md:ml-0">
        <details className="relative">
          <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#eef1f4]">
            Add file
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-md border border-[#d0d7de] bg-white py-1 text-sm shadow-lg">
            <Link
              className="block px-3 py-2 text-[#1f2328] hover:bg-[#f6f8fa]"
              href={`${base}/new/${encodeURIComponent(
                overview.resolvedRef.shortName,
              )}`}
            >
              Create new file
            </Link>
            <Link
              className="block px-3 py-2 text-[#1f2328] hover:bg-[#f6f8fa]"
              href={`${base}/upload/${encodeURIComponent(
                overview.resolvedRef.shortName,
              )}`}
            >
              Upload files
            </Link>
          </div>
        </details>
        <details className="relative">
          <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#f6f8fa]">
            More
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-md border border-[#d0d7de] bg-white py-1 text-sm shadow-lg">
            <Link
              className="block px-3 py-2 text-[#1f2328] hover:bg-[#f6f8fa]"
              href={overview.historyHref}
            >
              View directory history
            </Link>
            <Link
              className="block px-3 py-2 text-[#1f2328] hover:bg-[#f6f8fa]"
              href={overview.defaultBranchHref}
            >
              Open default branch
            </Link>
          </div>
        </details>
      </div>
    </div>
  );
}

function BreadcrumbTitle({ overview }: RepositoryTreeBrowserProps) {
  return (
    <div className="space-y-2">
      <nav
        aria-label="Current directory"
        className="flex flex-wrap items-center gap-1 text-sm"
      >
        {overview.breadcrumbs.map((breadcrumb, index) => (
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
        {overview.pathName || overview.name}
      </h1>
    </div>
  );
}

export function RepositoryTreeBrowser({
  overview,
}: RepositoryTreeBrowserProps) {
  const [treeOpen, setTreeOpen] = useState(true);
  const [paneWidth, setPaneWidth] = useState(256);
  const visibleEntries = useMemo(
    () =>
      [...overview.entries].sort((left, right) => {
        if (left.kind !== right.kind) {
          return left.kind === "folder" ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      }),
    [overview.entries],
  );

  function resizeBy(delta: number) {
    setPaneWidth((width) => Math.min(360, Math.max(192, width + delta)));
  }

  return (
    <section className="space-y-4" aria-label="Repository directory browser">
      <TreeToolbar overview={overview} />
      <div className="flex items-start gap-4 max-lg:block">
        {treeOpen ? (
          <aside
            className="shrink-0 rounded-md border border-[#d0d7de] bg-white p-3 max-lg:mb-4 max-lg:w-full"
            style={{ width: paneWidth }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#1f2328]">Files</h2>
              <button
                aria-label="Collapse file tree"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#d0d7de] text-sm text-[#59636e] hover:bg-[#f6f8fa]"
                onClick={() => setTreeOpen(false)}
                type="button"
              >
                ‹
              </button>
            </div>
            <TreePane entries={visibleEntries} overview={overview} />
          </aside>
        ) : (
          <button
            aria-label="Expand file tree"
            className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa] max-lg:mb-4"
            onClick={() => setTreeOpen(true)}
            type="button"
          >
            Files
          </button>
        )}
        {treeOpen ? (
          <hr
            aria-label="Resize file tree"
            aria-orientation="vertical"
            aria-valuemax={360}
            aria-valuemin={192}
            aria-valuenow={paneWidth}
            className="h-[520px] w-2 cursor-col-resize rounded-full bg-[#d0d7de] hover:bg-[#0969da] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0969da] max-lg:hidden"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                resizeBy(-24);
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                resizeBy(24);
              }
            }}
            onPointerDown={(event) => {
              const startX = event.clientX;
              const startWidth = paneWidth;
              event.currentTarget.setPointerCapture(event.pointerId);
              const target = event.currentTarget;
              function onPointerMove(moveEvent: PointerEvent) {
                setPaneWidth(
                  Math.min(
                    360,
                    Math.max(192, startWidth + moveEvent.clientX - startX),
                  ),
                );
              }
              function onPointerUp() {
                target.removeEventListener("pointermove", onPointerMove);
                target.removeEventListener("pointerup", onPointerUp);
              }
              target.addEventListener("pointermove", onPointerMove);
              target.addEventListener("pointerup", onPointerUp);
            }}
            tabIndex={0}
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-4">
          <BreadcrumbTitle overview={overview} />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-4 py-2 text-sm text-[#59636e]">
            <span>
              Showing{" "}
              <strong className="font-semibold text-[#1f2328]">
                {overview.entries.length}
              </strong>{" "}
              of{" "}
              <strong className="font-semibold text-[#1f2328]">
                {overview.total}
              </strong>{" "}
              entries
            </span>
            {overview.hasMore ? (
              <Link
                className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
                href={pagedDirectoryHref(overview, overview.page + 1)}
              >
                Load more directory entries
              </Link>
            ) : null}
          </div>
          <RepositoryFileTable
            compact
            entries={visibleEntries}
            historyHref={overview.historyHref}
            latestCommit={overview.latestCommit}
            parentHref={overview.parentHref}
          />
          {overview.readme ? (
            <article className="rounded-md border border-[#d0d7de] bg-white">
              <h2 className="border-b border-[#d0d7de] px-4 py-3 text-sm font-semibold text-[#1f2328]">
                {overview.readme.path}
              </h2>
              <pre className="whitespace-pre-wrap px-4 py-4 text-sm leading-6 text-[#1f2328]">
                {overview.readme.content}
              </pre>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
