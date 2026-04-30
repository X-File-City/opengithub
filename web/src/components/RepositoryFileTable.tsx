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
    <span
      aria-hidden="true"
      className="w-5 text-center"
      style={{ color: "var(--ink-3)" }}
    >
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
    <div
      className="overflow-hidden rounded-md"
      style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-sm"
        style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
      >
        <div className="min-w-0">
          <span className="font-semibold" style={{ color: "var(--ink-1)" }}>
            {latestCommit?.message ?? "No commits yet"}
          </span>
          {latestCommit ? (
            <Link
              className="ml-2 t-mono-sm hover:underline"
              href={latestCommit.href}
              style={{ color: "var(--accent)" }}
            >
              {latestCommit.shortOid}
            </Link>
          ) : null}
        </div>
        <Link
          className="text-sm font-semibold hover:underline"
          href={historyHref}
          style={{ color: "var(--accent)" }}
        >
          History
        </Link>
      </div>
      {compact ? (
        <div
          className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto] gap-3 border-b px-4 py-2 text-xs font-semibold max-md:hidden"
          style={{ borderColor: "var(--line)", color: "var(--ink-3)" }}
        >
          <span>Name</span>
          <span>Last commit message</span>
          <span>Last commit date</span>
        </div>
      ) : null}
      <ul>
        {parentHref ? (
          <li className="border-b" style={{ borderColor: "var(--line-soft)" }}>
            <Link
              aria-label={parentLabel}
              className="list-row grid min-h-[54px] grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto] items-center gap-3 px-4 py-3 text-sm max-md:grid-cols-1"
              href={parentHref}
            >
              <span
                className="flex min-w-0 items-center gap-2 font-semibold"
                style={{ color: "var(--accent)" }}
              >
                <span aria-hidden="true" className="w-5 text-center">
                  ↰
                </span>
                <span className="truncate">{parentLabel}</span>
              </span>
              <span className="truncate" style={{ color: "var(--ink-3)" }}>
                Return to the containing directory
              </span>
              <span
                className="whitespace-nowrap text-xs"
                style={{ color: "var(--ink-3)" }}
              >
                -
              </span>
            </Link>
          </li>
        ) : null}
        {entries.map((entry) => (
          <li
            className="border-b last:border-b-0"
            key={entry.path}
            style={{ borderColor: "var(--line-soft)" }}
          >
            <Link
              className="list-row grid min-h-[54px] grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto] items-center gap-3 px-4 py-3 text-sm max-md:grid-cols-1"
              href={entry.href}
            >
              <span
                className="flex min-w-0 items-center gap-2 font-semibold"
                style={{ color: "var(--accent)" }}
              >
                <FileIcon kind={entry.kind} />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="truncate" style={{ color: "var(--ink-3)" }}>
                {entry.latestCommitMessage ?? "Repository file"}
              </span>
              <span
                className="whitespace-nowrap text-xs"
                style={{ color: "var(--ink-3)" }}
              >
                {formatDate(entry.updatedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
