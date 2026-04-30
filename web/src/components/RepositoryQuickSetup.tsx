"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RepositoryOverview } from "@/lib/api";

type RepositoryQuickSetupProps = {
  repository: RepositoryOverview;
};

function commandLines(repository: RepositoryOverview) {
  return [
    `git clone ${repository.cloneUrls.https}`,
    `cd ${repository.name}`,
    'echo "# Getting started" > README.md',
    "git add README.md",
    'git commit -m "Add README"',
    `git branch -M ${repository.default_branch}`,
    `git push -u origin ${repository.default_branch}`,
  ];
}

export function RepositoryQuickSetup({
  repository,
}: RepositoryQuickSetupProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const commands = useMemo(() => commandLines(repository), [repository]);
  const script = commands.join("\n");

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} copied`);
    } catch {
      setCopied("Copy unavailable");
    }
  }

  return (
    <div className="rounded-md border border-[#d0d7de] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#1f2328]">
            Quick setup
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#59636e]">
            Clone this empty repository, create a README, and push the first
            commit to the default branch.
          </p>
        </div>
        <Link
          className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-semibold text-[#0969da] hover:bg-[#eef1f4]"
          href="/docs/git"
        >
          Git docs
        </Link>
      </div>
      <div className="mt-4 rounded-md border border-[#d0d7de] bg-[#f6f8fa]">
        <div className="flex items-center justify-between gap-3 border-b border-[#d0d7de] px-3 py-2">
          <p className="text-xs font-semibold uppercase text-[#59636e]">
            HTTPS remote
          </p>
          <button
            className="h-7 rounded-md border border-[#d0d7de] bg-white px-2 text-xs font-semibold text-[#1f2328] hover:bg-[#f6f8fa]"
            onClick={() => copy(repository.cloneUrls.https, "Clone URL")}
            type="button"
          >
            Copy URL
          </button>
        </div>
        <input
          aria-label="HTTPS clone URL"
          className="w-full border-0 bg-white px-3 py-2 font-mono text-xs text-[#1f2328] outline-none"
          readOnly
          value={repository.cloneUrls.https}
        />
      </div>
      <div className="mt-3 rounded-md border border-[#d0d7de] bg-[#0d1117]">
        <div className="flex items-center justify-between gap-3 border-b border-[#30363d] px-3 py-2">
          <p className="text-xs font-semibold uppercase text-[#8b949e]">
            Create README and push
          </p>
          <button
            className="h-7 rounded-md border border-[#30363d] bg-[#21262d] px-2 text-xs font-semibold text-[#f0f6fc] hover:bg-[#30363d]"
            onClick={() => copy(script, "Quick setup commands")}
            type="button"
          >
            Copy commands
          </button>
        </div>
        <pre className="overflow-x-auto whitespace-pre px-3 py-3 font-mono text-xs leading-5 text-[#f0f6fc]">
          {commands.map((line) => `$ ${line}`).join("\n")}
        </pre>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#59636e]">
        Private repositories require a personal access token with repository
        read/write scope when using Git over HTTPS.
      </p>
      {copied ? (
        <p className="mt-2 text-xs font-medium text-[#1a7f37]" role="status">
          {copied}
        </p>
      ) : null}
    </div>
  );
}
