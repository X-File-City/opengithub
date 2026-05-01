"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { RepositoryShell } from "@/components/RepositoryShell";
import type {
  ApiErrorEnvelope,
  ListEnvelope,
  PullRequestCompareFile,
  PullRequestCompareView,
  RepositoryOverview,
  RepositoryRefSummary,
} from "@/lib/api";
import {
  repositoryCompareRangeHref,
  repositoryCompareSwapHref,
  repositoryCompareViewHref,
} from "@/lib/navigation";

type PullRequestComparePageProps = {
  repository: RepositoryOverview;
  compare: PullRequestCompareView | null;
  error?: ApiErrorEnvelope | null;
  requestedRange?: { base: string; head: string } | null;
  refs?: RepositoryRefSummary[];
  viewMode?: "split" | "unified";
};

type CompareRefSelectorProps = {
  owner: string;
  repo: string;
  label: string;
  value: string;
  otherValue: string;
  side: "base" | "head";
  initialRefs: RepositoryRefSummary[];
  viewMode: "split" | "unified";
};

function formatCount(value: number, label: string) {
  return `${new Intl.NumberFormat("en").format(value)} ${label}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function fileStatusLabel(file: PullRequestCompareFile) {
  if (file.status === "added") {
    return "Added";
  }
  if (file.status === "removed") {
    return "Removed";
  }
  return "Modified";
}

function compareHrefForSide({
  owner,
  repo,
  side,
  selected,
  otherValue,
  viewMode,
}: {
  owner: string;
  repo: string;
  side: "base" | "head";
  selected: string;
  otherValue: string;
  viewMode: "split" | "unified";
}) {
  return side === "base"
    ? repositoryCompareRangeHref(owner, repo, selected, otherValue, {
        view: viewMode,
      })
    : repositoryCompareRangeHref(owner, repo, otherValue, selected, {
        view: viewMode,
      });
}

function CompareRefSelector({
  owner,
  repo,
  label,
  value,
  otherValue,
  side,
  initialRefs,
  viewMode,
}: CompareRefSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"branch" | "tag">("branch");
  const [refs, setRefs] = useState(initialRefs);
  const [isPending, startTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const base = `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  useEffect(() => {
    if (!open && refs.length > 0 && query === "") {
      return;
    }
    startTransition(async () => {
      try {
        const params = new URLSearchParams({
          activeRef: value,
          pageSize: "100",
        });
        if (query.trim()) {
          params.set("q", query.trim());
        }
        const response = await fetch(`${base}/refs?${params.toString()}`);
        if (!response.ok) {
          return;
        }
        const body =
          (await response.json()) as ListEnvelope<RepositoryRefSummary>;
        setRefs(body.items);
      } catch {
        setRefs([]);
      }
    });
  }, [base, open, query, refs.length, value]);

  const visibleRefs = refs.filter((ref) => ref.kind === kind);
  const branchCount = refs.filter((ref) => ref.kind === "branch").length;
  const tagCount = refs.filter((ref) => ref.kind === "tag").length;

  useEffect(() => {
    if (open) {
      searchInputRef.current?.focus();
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        aria-label={`${label}. Current ref ${value}`}
        aria-expanded={open}
        className="btn sm inline-flex min-w-0 max-w-full cursor-pointer list-none items-center gap-2"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="t-label" style={{ color: "var(--ink-3)" }}>
          {side}
        </span>
        <span className="truncate t-mono-sm">{value}</span>
      </button>
      {open ? (
        <div
          className="absolute left-0 z-20 mt-2 w-80 overflow-hidden rounded-md text-sm max-sm:w-[calc(100vw-3rem)]"
          style={{
            border: "1px solid var(--line)",
            background: "var(--surface)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div
            className="border-b px-3 py-2 font-semibold"
            style={{ borderColor: "var(--line)", color: "var(--ink-1)" }}
          >
            {label}
          </div>
          <label className="sr-only" htmlFor={`compare-${side}-ref-search`}>
            Search {side} branches and tags
          </label>
          <input
            aria-label={`Search ${side} branches and tags`}
            className="input h-10 w-full border-b px-3 outline-none"
            id={`compare-${side}-ref-search`}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a branch or tag"
            ref={searchInputRef}
            style={{ borderColor: "var(--line)" }}
            value={query}
          />
          <div
            className="grid grid-cols-2 border-b text-sm font-semibold"
            style={{ borderColor: "var(--line)" }}
          >
            <button
              aria-pressed={kind === "branch"}
              className={`px-3 py-2 ${
                kind === "branch"
                  ? "border-b-2 border-[var(--accent)]"
                  : "hover:bg-[var(--surface-2)]"
              }`}
              onClick={() => setKind("branch")}
              style={{
                color: kind === "branch" ? "var(--ink-1)" : "var(--ink-3)",
              }}
              type="button"
            >
              Branches {branchCount}
            </button>
            <button
              aria-pressed={kind === "tag"}
              className={`px-3 py-2 ${
                kind === "tag"
                  ? "border-b-2 border-[var(--accent)]"
                  : "hover:bg-[var(--surface-2)]"
              }`}
              onClick={() => setKind("tag")}
              style={{
                color: kind === "tag" ? "var(--ink-1)" : "var(--ink-3)",
              }}
              type="button"
            >
              Tags {tagCount}
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <div
              className="px-3 py-2 t-label"
              style={{ color: "var(--ink-3)" }}
            >
              {kind === "branch" ? "Branches" : "Tags"}
            </div>
            {visibleRefs.map((ref) => (
              <Link
                className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-[var(--surface-2)]"
                href={compareHrefForSide({
                  owner,
                  repo,
                  side,
                  selected: ref.shortName,
                  otherValue,
                  viewMode,
                })}
                key={ref.name}
                style={{ color: "var(--ink-1)" }}
              >
                <span className="truncate">{ref.shortName}</span>
                {ref.shortName === value ? (
                  <span className="t-xs" style={{ color: "var(--ok)" }}>
                    Current
                  </span>
                ) : ref.targetShortOid ? (
                  <span className="t-mono-sm" style={{ color: "var(--ink-3)" }}>
                    {ref.targetShortOid}
                  </span>
                ) : null}
              </Link>
            ))}
            {visibleRefs.length === 0 ? (
              <p className="px-3 py-3" style={{ color: "var(--ink-3)" }}>
                {isPending ? "Loading refs..." : "No matching refs"}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CompareErrorState({
  repository,
  requestedRange,
  error,
}: {
  repository: RepositoryOverview;
  requestedRange: { base: string; head: string } | null | undefined;
  error: ApiErrorEnvelope | null | undefined;
}) {
  const owner = repository.owner_login;
  const repo = repository.name;
  const defaultRangeHref = repositoryCompareRangeHref(
    owner,
    repo,
    repository.default_branch,
    repository.default_branch,
  );

  return (
    <div className="card p-6">
      <div className="t-label" style={{ color: "var(--ink-3)" }}>
        Comparing changes
      </div>
      <h1 className="t-h2 mt-2" style={{ color: "var(--ink-1)" }}>
        Comparison unavailable
      </h1>
      <p
        className="t-sm mt-2 max-w-2xl leading-6"
        style={{ color: "var(--ink-3)" }}
      >
        {error?.error.message ??
          "The selected base and compare refs could not be resolved in this repository."}
      </p>
      {requestedRange ? (
        <p className="t-sm mt-4" style={{ color: "var(--ink-2)" }}>
          Requested <span className="t-mono-sm">{requestedRange.base}</span>
          <span style={{ color: "var(--ink-4)" }}> ... </span>
          <span className="t-mono-sm">{requestedRange.head}</span>
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="btn primary" href={defaultRangeHref}>
          Open default comparison
        </Link>
        <Link className="btn ghost" href={`/${owner}/${repo}/pulls`}>
          Back to pull requests
        </Link>
      </div>
    </div>
  );
}

export function PullRequestComparePage({
  repository,
  compare,
  error = null,
  requestedRange = null,
  refs = [],
  viewMode = "split",
}: PullRequestComparePageProps) {
  const owner = repository.owner_login;
  const repo = repository.name;
  const [forkPanelOpen, setForkPanelOpen] = useState(false);
  const baseRef =
    compare?.base.shortName ??
    requestedRange?.base ??
    repository.default_branch;
  const headRef =
    compare?.head.shortName ??
    requestedRange?.head ??
    repository.default_branch;
  const statusCopy = useMemo(() => {
    if (!compare) {
      return null;
    }
    if (compare.status === "same_ref") {
      return "There isn't anything to compare";
    }
    if (compare.status === "no_diff") {
      return "No file changes between these refs";
    }
    if (compare.status === "diverged") {
      return "Branches have diverged";
    }
    return "Ready for review";
  }, [compare]);

  return (
    <RepositoryShell
      activePath={`/${owner}/${repo}/pulls`}
      frameClassName="max-w-7xl"
      repository={repository}
    >
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="t-label" style={{ color: "var(--ink-3)" }}>
              Pull requests
            </div>
            <h1 className="t-h1 mt-2" style={{ color: "var(--ink-1)" }}>
              Comparing changes
            </h1>
            <p
              className="t-sm mt-2 max-w-2xl leading-6"
              style={{ color: "var(--ink-3)" }}
            >
              Review commits and changed files before opening a pull request.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <button
                aria-expanded={forkPanelOpen}
                className="btn"
                onClick={() => setForkPanelOpen((current) => !current)}
                type="button"
              >
                Compare across forks
              </button>
              {forkPanelOpen ? (
                <div
                  className="absolute right-0 z-10 mt-2 w-72 rounded-md p-4 text-sm"
                  id="compare-across-forks"
                  style={{
                    border: "1px solid var(--line)",
                    background: "var(--surface)",
                    boxShadow: "var(--shadow-md)",
                  }}
                >
                  <p className="t-label" style={{ color: "var(--ink-3)" }}>
                    Fork comparison
                  </p>
                  <p
                    className="mt-2 leading-6"
                    style={{ color: "var(--ink-2)" }}
                  >
                    {owner}/{repo} is selected as both the base and head
                    repository.
                  </p>
                  <Link
                    className="btn ghost sm mt-3"
                    href={`/${owner}/${repo}/forks`}
                  >
                    Browse forks
                  </Link>
                </div>
              ) : null}
            </div>
            <Link className="btn ghost" href={`/${owner}/${repo}/pulls`}>
              Pull requests
            </Link>
          </div>
        </div>

        <section className="card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <CompareRefSelector
              initialRefs={refs}
              label="Choose base ref"
              owner={owner}
              otherValue={headRef}
              repo={repo}
              side="base"
              value={baseRef}
              viewMode={viewMode}
            />
            <Link
              aria-label="Swap base and compare refs"
              className="btn sm"
              href={repositoryCompareSwapHref(owner, repo, baseRef, headRef, {
                view: viewMode,
              })}
            >
              Swap
            </Link>
            <CompareRefSelector
              initialRefs={refs}
              label="Choose compare ref"
              owner={owner}
              otherValue={baseRef}
              repo={repo}
              side="head"
              value={headRef}
              viewMode={viewMode}
            />
            <div className="ml-auto flex gap-2">
              <Link
                aria-current={viewMode === "split" ? "page" : undefined}
                className={`chip ${viewMode === "split" ? "active" : "soft"}`}
                href={repositoryCompareViewHref(
                  owner,
                  repo,
                  baseRef,
                  headRef,
                  "split",
                )}
              >
                Split
              </Link>
              <Link
                aria-current={viewMode === "unified" ? "page" : undefined}
                className={`chip ${viewMode === "unified" ? "active" : "soft"}`}
                href={repositoryCompareViewHref(
                  owner,
                  repo,
                  baseRef,
                  headRef,
                  "unified",
                )}
              >
                Unified
              </Link>
            </div>
          </div>
        </section>

        {compare ? (
          <section className="card overflow-hidden">
            <div
              className="flex flex-wrap items-center gap-3 border-b p-4"
              style={{ borderColor: "var(--line)" }}
            >
              <span
                className={`chip ${compare.status === "ahead" ? "ok" : "soft"}`}
              >
                {statusCopy}
              </span>
              <span className="t-sm" style={{ color: "var(--ink-3)" }}>
                <span className="t-num">{compare.aheadBy}</span> ahead ·{" "}
                <span className="t-num">{compare.behindBy}</span> behind
              </span>
              <span className="ml-auto t-sm" style={{ color: "var(--ink-3)" }}>
                <span className="t-num" style={{ color: "var(--ok)" }}>
                  +{compare.additions}
                </span>{" "}
                <span className="t-num" style={{ color: "var(--err)" }}>
                  -{compare.deletions}
                </span>
              </span>
            </div>
            {compare.status === "same_ref" || compare.status === "no_diff" ? (
              <div className="p-8 text-center">
                <p className="t-h3" style={{ color: "var(--ink-1)" }}>
                  {statusCopy}
                </p>
                <p className="t-sm mt-2" style={{ color: "var(--ink-3)" }}>
                  Choose a different compare ref or return to the pull request
                  list.
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <Link
                    className="btn primary"
                    href={`/${owner}/${repo}/pulls`}
                  >
                    Back to pull requests
                  </Link>
                  <Link
                    className="btn ghost"
                    href={repositoryCompareRangeHref(
                      owner,
                      repo,
                      repository.default_branch,
                      repository.default_branch,
                    )}
                  >
                    Sample comparison
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-0 max-lg:grid-cols-1">
                <div className="min-w-0">
                  <div
                    className="border-b p-4"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <h2 className="t-h3" style={{ color: "var(--ink-1)" }}>
                      Changed files
                    </h2>
                    <p className="t-sm mt-1" style={{ color: "var(--ink-3)" }}>
                      {formatCount(compare.totalFiles, "files")} changed across{" "}
                      {formatCount(compare.totalCommits, "commits")}.
                    </p>
                  </div>
                  <div>
                    {compare.files.map((file) => (
                      <Link
                        className="list-row flex items-center gap-3 px-4 py-3"
                        href={file.href}
                        key={file.path}
                      >
                        <span className="chip soft">
                          {fileStatusLabel(file)}
                        </span>
                        <span className="min-w-0 flex-1 truncate t-mono-sm">
                          {file.path}
                        </span>
                        <span className="t-num" style={{ color: "var(--ok)" }}>
                          +{file.additions}
                        </span>
                        <span className="t-num" style={{ color: "var(--err)" }}>
                          -{file.deletions}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
                <aside
                  className="border-l p-4 max-lg:border-l-0 max-lg:border-t"
                  style={{ borderColor: "var(--line)" }}
                >
                  <h2 className="t-h3" style={{ color: "var(--ink-1)" }}>
                    Commits
                  </h2>
                  <div className="mt-3 space-y-3">
                    {compare.commits.map((commit) => (
                      <Link
                        className="block rounded-md p-3 hover:bg-[var(--surface-2)]"
                        href={commit.href}
                        key={commit.id}
                      >
                        <p
                          className="truncate t-sm"
                          style={{ color: "var(--ink-1)" }}
                        >
                          {commit.message}
                        </p>
                        <p
                          className="t-xs mt-1"
                          style={{ color: "var(--ink-3)" }}
                        >
                          <span className="t-mono-sm">{commit.shortOid}</span>
                          {" · "}
                          {commit.authorLogin ?? "unknown"}
                          {" · "}
                          {formatDate(commit.committedAt)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </aside>
              </div>
            )}
          </section>
        ) : (
          <CompareErrorState
            error={error}
            repository={repository}
            requestedRange={requestedRange}
          />
        )}
      </div>
    </RepositoryShell>
  );
}
