"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DashboardTopRepository } from "@/lib/api";

type DashboardTopRepositoriesProps = {
  repositories: DashboardTopRepository[];
};

function formatUpdatedAt(value: string): string {
  const updatedAt = new Date(value);
  if (Number.isNaN(updatedAt.getTime())) {
    return "Updated recently";
  }

  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  });
  return `Updated ${formatter.format(updatedAt)}`;
}

function matchesRepository(repository: DashboardTopRepository, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return `${repository.ownerLogin}/${repository.name}`
    .toLowerCase()
    .includes(normalized);
}

function VisibilityBadge({
  visibility,
}: {
  visibility: DashboardTopRepository["visibility"];
}) {
  return (
    <span className="rounded-full border border-[#d0d7de] px-2 py-0.5 text-xs font-medium capitalize text-[#59636e]">
      {visibility}
    </span>
  );
}

function LanguageLabel({ repository }: { repository: DashboardTopRepository }) {
  if (!repository.primaryLanguage) {
    return null;
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span
        aria-hidden="true"
        className="h-3 w-3 rounded-full border border-black/10"
        style={{
          backgroundColor: repository.primaryLanguageColor ?? "#59636e",
        }}
      />
      <span className="truncate">{repository.primaryLanguage}</span>
    </span>
  );
}

function RepositoryRow({ repository }: { repository: DashboardTopRepository }) {
  return (
    <li>
      <Link
        className="block rounded-md px-2 py-2 hover:bg-[#f6f8fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0969da]"
        href={repository.href}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#0969da]">
            {repository.ownerLogin}/{repository.name}
          </span>
          <VisibilityBadge visibility={repository.visibility} />
        </div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#59636e]">
          <LanguageLabel repository={repository} />
          <span>{formatUpdatedAt(repository.updatedAt)}</span>
        </div>
      </Link>
    </li>
  );
}

export function DashboardTopRepositories({
  repositories,
}: DashboardTopRepositoriesProps) {
  const [query, setQuery] = useState("");
  const filteredRepositories = useMemo(
    () =>
      repositories.filter((repository) => matchesRepository(repository, query)),
    [repositories, query],
  );
  const hasRepositories = repositories.length > 0;

  return (
    <aside
      aria-labelledby="top-repositories-heading"
      className="w-full space-y-4 lg:w-[296px]"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          className="text-sm font-semibold text-[#1f2328]"
          id="top-repositories-heading"
        >
          Top repositories
        </h2>
        <Link
          className="inline-flex h-8 shrink-0 items-center rounded-md bg-[#1f883d] px-3 text-sm font-semibold text-white hover:bg-[#1a7f37] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0969da]"
          href="/new"
        >
          New
        </Link>
      </div>
      <label className="sr-only" htmlFor="repository-filter">
        Find a repository
      </label>
      <input
        className="h-8 w-full rounded-md border border-[#d0d7de] px-3 text-sm text-[#1f2328] placeholder:text-[#59636e]"
        id="repository-filter"
        name="repository-filter"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Find a repository..."
        type="search"
        value={query}
      />
      <div className="min-h-32">
        {filteredRepositories.length > 0 ? (
          <ul className="space-y-1">
            {filteredRepositories.map((repository) => (
              <RepositoryRow
                key={`${repository.ownerLogin}/${repository.name}`}
                repository={repository}
              />
            ))}
          </ul>
        ) : hasRepositories ? (
          <p className="rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 py-4 text-sm leading-6 text-[#59636e]">
            No repositories match your filter.
          </p>
        ) : (
          <div className="rounded-md border border-[#d0d7de] bg-white px-4 py-5 text-sm leading-6 text-[#59636e]">
            <p>You do not have any repositories yet.</p>
            <Link
              className="mt-3 inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-semibold text-[#0969da] hover:bg-[#eef1f4]"
              href="/new"
            >
              Create repository
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
