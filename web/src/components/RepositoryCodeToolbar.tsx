"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type {
  ListEnvelope,
  RepositoryFileFinderItem,
  RepositoryOverview,
  RepositoryRefSummary,
} from "@/lib/api";

type RepositoryCodeToolbarProps = {
  repository: RepositoryOverview;
};

function formatCount(value: number, label: string) {
  return `${new Intl.NumberFormat("en").format(value)} ${label}`;
}

function basePath(repository: RepositoryOverview) {
  return `/${repository.owner_login}/${repository.name}`;
}

function BranchSelector({ repository }: RepositoryCodeToolbarProps) {
  const [open, setOpen] = useState(false);
  const [refs, setRefs] = useState<RepositoryRefSummary[]>([]);
  const [isPending, startTransition] = useTransition();
  const base = basePath(repository);

  useEffect(() => {
    startTransition(async () => {
      try {
        const response = await fetch(`${base}/refs`);
        if (!response.ok) {
          return;
        }
        const envelope =
          (await response.json()) as ListEnvelope<RepositoryRefSummary>;
        setRefs(envelope.items);
      } catch {
        setRefs([]);
      }
    });
  }, [base]);

  const branches = refs.filter((ref) => ref.kind === "branch");
  const tags = refs.filter((ref) => ref.kind === "tag");

  return (
    <details
      className="relative"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary
        aria-label={`Switch branches or tags. Current branch ${repository.default_branch}`}
        className="inline-flex h-8 cursor-pointer list-none items-center gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#eef1f4]"
      >
        <span aria-hidden="true">⑂</span>
        {repository.default_branch}
      </summary>
      <div className="absolute left-0 z-20 mt-2 w-80 overflow-hidden rounded-md border border-[#d0d7de] bg-white text-sm shadow-lg max-sm:w-[calc(100vw-3rem)]">
        <div className="border-b border-[#d0d7de] px-3 py-2 font-semibold text-[#1f2328]">
          Switch branches/tags
        </div>
        <div className="max-h-80 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold uppercase text-[#59636e]">
            Branches
          </div>
          {(branches.length ? branches : refs).map((ref) => (
            <Link
              className="flex items-center justify-between gap-3 px-3 py-2 text-[#1f2328] hover:bg-[#f6f8fa]"
              href={ref.href}
              key={ref.name}
            >
              <span className="truncate">{ref.shortName}</span>
              {ref.shortName === repository.default_branch ? (
                <span className="text-xs text-[#1a7f37]">Current</span>
              ) : null}
            </Link>
          ))}
          {tags.length > 0 ? (
            <>
              <div className="border-t border-[#d0d7de] px-3 py-2 text-xs font-semibold uppercase text-[#59636e]">
                Tags
              </div>
              {tags.map((ref) => (
                <Link
                  className="flex items-center justify-between gap-3 px-3 py-2 text-[#1f2328] hover:bg-[#f6f8fa]"
                  href={ref.href}
                  key={ref.name}
                >
                  <span className="truncate">{ref.shortName}</span>
                  {ref.targetShortOid ? (
                    <span className="font-mono text-xs text-[#59636e]">
                      {ref.targetShortOid}
                    </span>
                  ) : null}
                </Link>
              ))}
            </>
          ) : null}
        </div>
        {isPending && open ? (
          <p className="border-t border-[#d0d7de] px-3 py-2 text-xs text-[#59636e]">
            Loading refs...
          </p>
        ) : null}
      </div>
    </details>
  );
}

function FileFinder({ repository }: RepositoryCodeToolbarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<RepositoryFileFinderItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const base = basePath(repository);
  const files = repository.files;

  useEffect(() => {
    if (!open) {
      return;
    }

    const normalizedQuery = query.trim().toLowerCase();
    setItems(
      files
        .filter(
          (file) =>
            !normalizedQuery ||
            file.path.toLowerCase().includes(normalizedQuery),
        )
        .slice(0, 20)
        .map((file) => {
          const name = file.path.split("/").at(-1) ?? file.path;
          return {
            path: file.path,
            name,
            kind: "file",
            href: `${base}/blob/${repository.default_branch}/${file.path
              .split("/")
              .map(encodeURIComponent)
              .join("/")}`,
            byteSize: file.byteSize,
            language: null,
          };
        }),
    );

    startTransition(async () => {
      try {
        const params = new URLSearchParams({
          ref: repository.default_branch,
          q: query,
        });
        const response = await fetch(`${base}/file-finder?${params}`);
        if (!response.ok) {
          setItems([]);
          return;
        }
        const envelope =
          (await response.json()) as ListEnvelope<RepositoryFileFinderItem>;
        setItems(envelope.items);
        setActiveIndex(0);
      } catch {
        setItems([]);
      }
    });
  }, [base, files, open, query, repository.default_branch]);

  function openActiveItem() {
    const item = items[activeIndex];
    if (item) {
      window.location.assign(item.href);
    }
  }

  return (
    <div className="relative">
      <button
        className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm text-[#59636e] hover:bg-[#f6f8fa]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        Go to file
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-96 overflow-hidden rounded-md border border-[#d0d7de] bg-white text-sm shadow-lg max-sm:right-auto max-sm:left-0 max-sm:w-[calc(100vw-3rem)]">
          <label className="sr-only" htmlFor="repository-file-finder">
            Find a file
          </label>
          <input
            aria-label="Find a file"
            className="h-10 w-full border-b border-[#d0d7de] px-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0969da]"
            id="repository-file-finder"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) =>
                  Math.min(items.length - 1, index + 1),
                );
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(0, index - 1));
              }
              if (event.key === "Enter") {
                event.preventDefault();
                openActiveItem();
              }
              if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Type to search files"
            value={query}
          />
          <ul
            className="max-h-80 overflow-y-auto py-1"
            id="repository-file-finder-results"
          >
            {items.map((item, index) => (
              <li id={`file-finder-${index}`} key={item.path}>
                <Link
                  aria-current={index === activeIndex ? "true" : undefined}
                  className={`block px-3 py-2 hover:bg-[#f6f8fa] ${
                    index === activeIndex ? "bg-[#f6f8fa]" : ""
                  }`}
                  href={item.href}
                >
                  <span className="block truncate font-semibold text-[#0969da]">
                    {item.path}
                  </span>
                  <span className="text-xs text-[#59636e]">
                    {item.language ?? "File"} · {item.byteSize} bytes
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {items.length === 0 ? (
            <p className="px-3 py-3 text-[#59636e]">
              {isPending ? "Searching files..." : "No matching files"}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AddFileMenu({ repository }: RepositoryCodeToolbarProps) {
  const base = basePath(repository);
  return (
    <details className="relative">
      <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#eef1f4]">
        Add file
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-md border border-[#d0d7de] bg-white py-1 text-sm shadow-lg">
        <Link
          className="block px-3 py-2 text-[#1f2328] hover:bg-[#f6f8fa]"
          href={`${base}/new/${repository.default_branch}`}
        >
          Create new file
        </Link>
        <Link
          className="block px-3 py-2 text-[#1f2328] hover:bg-[#f6f8fa]"
          href={`${base}/upload/${repository.default_branch}`}
        >
          Upload files
        </Link>
      </div>
    </details>
  );
}

function CloneMenu({ repository }: RepositoryCodeToolbarProps) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} copied`);
    } catch {
      setCopied("Copy unavailable");
    }
  }

  return (
    <details className="relative">
      <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-md bg-[#1f883d] px-3 text-sm font-semibold text-white hover:bg-[#1a7f37]">
        Code
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border border-[#d0d7de] bg-white p-3 text-sm text-[#1f2328] shadow-lg max-sm:w-[calc(100vw-3rem)]">
        <p className="font-semibold">Clone</p>
        {(["https", "git"] as const).map((kind) => (
          <div className="mt-3" key={kind}>
            <label
              className="block text-xs font-semibold uppercase text-[#59636e]"
              htmlFor={`clone-${kind}`}
            >
              {kind === "https" ? "HTTPS" : "SSH"}
            </label>
            <div className="mt-1 flex">
              <input
                className="min-w-0 flex-1 rounded-l-md border border-[#d0d7de] px-2 font-mono text-xs"
                id={`clone-${kind}`}
                readOnly
                value={repository.cloneUrls[kind]}
              />
              <button
                className="h-8 rounded-r-md border border-l-0 border-[#d0d7de] bg-[#f6f8fa] px-3 text-xs font-semibold hover:bg-[#eef1f4]"
                onClick={() =>
                  copy(repository.cloneUrls[kind], kind.toUpperCase())
                }
                type="button"
              >
                Copy
              </button>
            </div>
          </div>
        ))}
        {copied ? (
          <p className="mt-2 text-xs text-[#1a7f37]" role="status">
            {copied}
          </p>
        ) : null}
        <Link
          className="mt-3 block text-[#0969da] hover:underline"
          href={repository.cloneUrls.zip}
        >
          Download ZIP
        </Link>
      </div>
    </details>
  );
}

export function RepositoryCodeToolbar({
  repository,
}: RepositoryCodeToolbarProps) {
  const base = useMemo(() => basePath(repository), [repository]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-[#59636e]">Default branch</span>
      <Link
        className="text-sm font-semibold text-[#0969da] hover:underline"
        href={`${base}/tree/${repository.default_branch}`}
      >
        {repository.default_branch}
      </Link>
      <BranchSelector repository={repository} />
      <Link
        className="text-sm text-[#59636e] hover:text-[#0969da]"
        href={`${base}/branches`}
      >
        {formatCount(repository.branchCount, "Branches")}
      </Link>
      <Link
        className="text-sm text-[#59636e] hover:text-[#0969da]"
        href={`${base}/tags`}
      >
        {formatCount(repository.tagCount, "Tags")}
      </Link>
      <div className="ml-auto flex flex-wrap items-center gap-2 max-md:ml-0">
        <FileFinder repository={repository} />
        <AddFileMenu repository={repository} />
        <CloneMenu repository={repository} />
      </div>
    </div>
  );
}
