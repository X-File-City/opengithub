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
        className="block truncate rounded-md px-2 py-1.5 font-semibold hover:bg-[var(--surface-2)]"
        href={directoryHref(overview, "")}
        style={{ color: "var(--accent)" }}
      >
        {overview.name}
      </Link>
      {overview.path ? (
        <div
          className="mt-1 border-l pl-3"
          style={{ borderColor: "var(--line)" }}
        >
          {splitPath(overview.path).map((segment, index, parts) => {
            const currentPath = parts.slice(0, index + 1).join("/");
            const active = currentPath === overview.path;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`block truncate rounded-md px-2 py-1.5 ${
                  active ? "font-semibold" : "hover:bg-[var(--surface-2)]"
                }`}
                style={{
                  color: active ? "var(--accent)" : "var(--ink-1)",
                  background: active ? "var(--accent-soft)" : undefined,
                }}
                href={directoryHref(overview, currentPath)}
                key={currentPath}
              >
                {segment}
              </Link>
            );
          })}
        </div>
      ) : null}
      <div
        className="mt-3 border-t pt-3"
        style={{ borderColor: "var(--line)" }}
      >
        {[...directories, ...files].slice(0, 30).map((entry) => (
          <Link
            className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--surface-2)]"
            href={entry.href}
            key={entry.path}
            style={{ color: "var(--ink-1)" }}
          >
            <span
              aria-hidden="true"
              className="w-4 text-center"
              style={{ color: "var(--ink-3)" }}
            >
              {entry.kind === "folder" ? "▸" : "□"}
            </span>
            <span className="truncate">{entry.name}</span>
          </Link>
        ))}
        {overview.hasMore ? (
          <Link
            className="mt-2 block rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-[var(--surface-2)]"
            href={pagedDirectoryHref(overview, overview.page + 1)}
            style={{ color: "var(--accent)" }}
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
          <summary className="btn sm inline-flex cursor-pointer list-none items-center">
            Add file
          </summary>
          <div
            className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-md py-1 text-sm"
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <Link
              className="block px-3 py-2 hover:bg-[var(--surface-2)]"
              href={`${base}/new/${encodeURIComponent(
                overview.resolvedRef.shortName,
              )}`}
              style={{ color: "var(--ink-1)" }}
            >
              Create new file
            </Link>
            <Link
              className="block px-3 py-2 hover:bg-[var(--surface-2)]"
              href={`${base}/upload/${encodeURIComponent(
                overview.resolvedRef.shortName,
              )}`}
              style={{ color: "var(--ink-1)" }}
            >
              Upload files
            </Link>
          </div>
        </details>
        <details className="relative">
          <summary className="btn inline-flex cursor-pointer list-none items-center">
            More
          </summary>
          <div
            className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-md py-1 text-sm"
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <Link
              className="block px-3 py-2 hover:bg-[var(--surface-2)]"
              href={overview.historyHref}
              style={{ color: "var(--ink-1)" }}
            >
              View directory history
            </Link>
            <Link
              className="block px-3 py-2 hover:bg-[var(--surface-2)]"
              href={overview.defaultBranchHref}
              style={{ color: "var(--ink-1)" }}
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
            {index > 0 ? (
              <span style={{ color: "var(--ink-3)" }}>/</span>
            ) : null}
            <Link
              className="max-w-48 truncate font-semibold hover:underline"
              href={breadcrumb.href}
              style={{ color: "var(--accent)" }}
            >
              {breadcrumb.name}
            </Link>
          </span>
        ))}
      </nav>
      <h1 className="t-h3" style={{ color: "var(--ink-1)" }}>
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
            className="shrink-0 rounded-md p-3 max-lg:mb-4 max-lg:w-full"
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface)",
              width: paneWidth,
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="t-h3" style={{ color: "var(--ink-1)" }}>
                Files
              </h2>
              <button
                aria-label="Collapse file tree"
                className="btn sm inline-flex h-7 w-7 items-center justify-center"
                onClick={() => setTreeOpen(false)}
                type="button"
                style={{ color: "var(--ink-3)" }}
              >
                ‹
              </button>
            </div>
            <TreePane entries={visibleEntries} overview={overview} />
          </aside>
        ) : (
          <button
            aria-label="Expand file tree"
            className="btn sm max-lg:mb-4"
            onClick={() => setTreeOpen(true)}
            type="button"
            style={{ color: "var(--accent)" }}
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
            className="h-[520px] w-2 cursor-col-resize rounded-full hover:bg-[var(--accent)] focus-visible:outline focus-visible:outline-2 max-lg:hidden"
            style={{ background: "var(--line)" }}
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
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-md px-4 py-2 text-sm"
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              color: "var(--ink-3)",
            }}
          >
            <span>
              Showing{" "}
              <strong
                className="font-semibold"
                style={{ color: "var(--ink-1)" }}
              >
                {overview.entries.length}
              </strong>{" "}
              of{" "}
              <strong
                className="font-semibold"
                style={{ color: "var(--ink-1)" }}
              >
                {overview.total}
              </strong>{" "}
              entries
            </span>
            {overview.hasMore ? (
              <Link
                className="btn sm"
                href={pagedDirectoryHref(overview, overview.page + 1)}
                style={{ color: "var(--accent)" }}
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
            <article
              className="rounded-md"
              style={{
                border: "1px solid var(--line)",
                background: "var(--surface)",
              }}
            >
              <h2
                className="border-b px-4 py-3 t-h3"
                style={{ borderColor: "var(--line)", color: "var(--ink-1)" }}
              >
                {overview.readme.path}
              </h2>
              <pre
                className="whitespace-pre-wrap px-4 py-4 t-sm leading-6"
                style={{ color: "var(--ink-1)" }}
              >
                {overview.readme.content}
              </pre>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
