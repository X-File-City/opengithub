import Link from "next/link";
import type { ReactNode } from "react";
import type { RepositoryLatestCommit, RepositoryTreeEntry } from "@/lib/api";

type RepositoryFileTableProps = {
  entries: RepositoryTreeEntry[];
  latestCommit: RepositoryLatestCommit | null;
  historyHref: string;
  emptyState?: ReactNode;
  parentHref?: string | null;
  parentLabel?: string;
  compact?: boolean;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function FileIcon({ kind }: { kind: RepositoryTreeEntry["kind"] }) {
  return (
    <span aria-hidden="true" className="w-5 text-center text-[#59636e]">
      {kind === "folder" ? "▸" : "□"}
    </span>
  );
}

export function RepositoryFileTable({
  entries,
  latestCommit,
  historyHref,
  emptyState,
  parentHref = null,
  parentLabel = "Parent directory",
  compact = false,
}: RepositoryFileTableProps) {
  if (entries.length === 0 && !parentHref) {
    return emptyState ?? null;
  }

  return (
    <div className="overflow-hidden rounded-md border border-[#d0d7de] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-3 text-sm">
        <div className="min-w-0">
          <span className="font-semibold text-[#1f2328]">
            {latestCommit?.message ?? "No commits yet"}
          </span>
          {latestCommit ? (
            <Link
              className="ml-2 font-mono text-xs text-[#0969da] hover:underline"
              href={latestCommit.href}
            >
              {latestCommit.shortOid}
            </Link>
          ) : null}
        </div>
        <Link
          className="text-sm font-semibold text-[#0969da] hover:underline"
          href={historyHref}
        >
          History
        </Link>
      </div>
      {compact ? (
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto] gap-3 border-b border-[#d0d7de] bg-white px-4 py-2 text-xs font-semibold text-[#59636e] max-md:hidden">
          <span>Name</span>
          <span>Last commit message</span>
          <span>Last commit date</span>
        </div>
      ) : null}
      <ul>
        {parentHref ? (
          <li className="border-b border-[#d0d7de]">
            <Link
              aria-label={parentLabel}
              className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto] items-center gap-3 px-4 py-3 text-sm hover:bg-[#f6f8fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0969da] max-md:grid-cols-1"
              href={parentHref}
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold text-[#0969da]">
                <span aria-hidden="true" className="w-5 text-center">
                  ↰
                </span>
                <span className="truncate">{parentLabel}</span>
              </span>
              <span className="truncate text-[#59636e]">
                Return to the containing directory
              </span>
              <span className="whitespace-nowrap text-xs text-[#59636e]">
                -
              </span>
            </Link>
          </li>
        ) : null}
        {entries.map((entry) => (
          <li
            className="border-b border-[#d0d7de] last:border-b-0"
            key={entry.path}
          >
            <Link
              className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto] items-center gap-3 px-4 py-3 text-sm hover:bg-[#f6f8fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0969da] max-md:grid-cols-1"
              href={entry.href}
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold text-[#0969da]">
                <FileIcon kind={entry.kind} />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="truncate text-[#59636e]">
                {entry.latestCommitMessage ?? "Repository file"}
              </span>
              <span className="whitespace-nowrap text-xs text-[#59636e]">
                {formatDate(entry.updatedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
