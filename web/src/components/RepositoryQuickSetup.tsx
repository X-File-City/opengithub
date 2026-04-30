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
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="t-h3" style={{ color: "var(--ink-1)" }}>
            Quick setup
          </h2>
          <p
            className="t-sm mt-2 max-w-2xl leading-6"
            style={{ color: "var(--ink-3)" }}
          >
            Clone this empty repository, create a README, and push the first
            commit to the default branch.
          </p>
        </div>
        <Link className="btn sm" href="/docs/git">
          Git docs
        </Link>
      </div>
      <div
        className="mt-4 rounded-md"
        style={{
          border: "1px solid var(--line)",
          background: "var(--surface-2)",
        }}
      >
        <div
          className="flex items-center justify-between gap-3 border-b px-3 py-2"
          style={{ borderColor: "var(--line)" }}
        >
          <p className="t-label" style={{ color: "var(--ink-3)" }}>
            HTTPS remote
          </p>
          <button
            className="btn sm"
            onClick={() => copy(repository.cloneUrls.https, "Clone URL")}
            type="button"
          >
            Copy URL
          </button>
        </div>
        <input
          aria-label="HTTPS clone URL"
          className="w-full border-0 px-3 py-2 t-mono-sm outline-none"
          style={{ background: "var(--surface)" }}
          readOnly
          value={repository.cloneUrls.https}
        />
      </div>
      <div
        className="mt-3 rounded-md"
        style={{
          background: "var(--surface-3)",
          border: "1px solid var(--line)",
        }}
      >
        <div
          className="flex items-center justify-between gap-3 border-b px-3 py-2"
          style={{ borderColor: "var(--line)" }}
        >
          <p className="t-label" style={{ color: "var(--ink-3)" }}>
            Create README and push
          </p>
          <button
            className="btn sm"
            onClick={() => copy(script, "Quick setup commands")}
            type="button"
          >
            Copy commands
          </button>
        </div>
        <pre
          className="overflow-x-auto whitespace-pre px-3 py-3 t-mono-sm leading-5"
          style={{ color: "var(--ink-1)" }}
        >
          {commands.map((line) => `$ ${line}`).join("\n")}
        </pre>
      </div>
      <p className="mt-3 t-xs leading-5" style={{ color: "var(--ink-3)" }}>
        Private repositories require a personal access token with repository
        read/write scope when using Git over HTTPS.
      </p>
      {copied ? (
        <p
          className="mt-2 t-xs font-medium"
          role="status"
          style={{ color: "var(--ok)" }}
        >
          {copied}
        </p>
      ) : null}
    </div>
  );
}
