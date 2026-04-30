"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  RepositoryImportStatus,
  RepositoryImportStatusName,
} from "@/lib/api";

type RepositoryImportStatusPanelProps = {
  initialImport: RepositoryImportStatus;
  pollIntervalMs?: number;
};

const BADGE_STYLES: Record<RepositoryImportStatusName, string> = {
  queued: "border-[#bf8700] bg-[#fff8c5] text-[#7d4e00]",
  importing: "border-[#0969da] bg-[#ddf4ff] text-[#0969da]",
  imported: "border-[#1f883d] bg-[#dafbe1] text-[#1a7f37]",
  failed: "border-[#cf222e] bg-[#ffebe9] text-[#cf222e]",
};

function statusLabel(status: RepositoryImportStatusName) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function shouldPoll(status: RepositoryImportStatusName) {
  return status === "queued" || status === "importing";
}

export function RepositoryImportStatusPanel({
  initialImport,
  pollIntervalMs = 2_500,
}: RepositoryImportStatusPanelProps) {
  const [repositoryImport, setRepositoryImport] = useState(initialImport);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldPoll(repositoryImport.status)) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/new/imports/${repositoryImport.id}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("status fetch failed");
        }
        const nextImport = (await response.json()) as RepositoryImportStatus;
        setRepositoryImport(nextImport);
        setPollError(null);
      } catch {
        setPollError("Import status could not be refreshed.");
      }
    }, pollIntervalMs);

    return () => window.clearInterval(timer);
  }, [pollIntervalMs, repositoryImport.id, repositoryImport.status]);

  const sourceLabel = `${repositoryImport.source.host}/${repositoryImport.source.path}`;

  return (
    <section className="mx-auto max-w-[860px] px-4 py-7 sm:px-6">
      <div className="rounded-md border border-[#d0d7de] bg-white">
        <header className="border-b border-[#d0d7de] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#59636e]">
                Repository import
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[#1f2328]">
                Preparing {repositoryImport.repositoryHref.replace(/^\//, "")}
              </h1>
            </div>
            <span
              className={`inline-flex h-7 items-center rounded-full border px-3 text-sm font-semibold ${
                BADGE_STYLES[repositoryImport.status]
              }`}
            >
              {shouldPoll(repositoryImport.status) ? (
                <span
                  aria-hidden="true"
                  className="mr-2 h-2 w-2 animate-pulse rounded-full bg-current"
                />
              ) : null}
              {statusLabel(repositoryImport.status)}
            </span>
          </div>
        </header>

        <div className="grid gap-0 md:grid-cols-[1fr_260px]">
          <div className="p-5">
            <p className="text-sm leading-6 text-[#59636e]" role="status">
              {repositoryImport.progressMessage}
            </p>

            {repositoryImport.status === "imported" ? (
              <div className="mt-5 rounded-md border border-[#1f883d] bg-[#dafbe1] p-4 text-sm text-[#1a7f37]">
                <p className="font-semibold">Import completed</p>
                <p className="mt-1">
                  The default branch is ready in the destination repository.
                </p>
                <Link
                  className="mt-3 inline-flex h-9 items-center rounded-md bg-[#1f883d] px-4 font-semibold text-white hover:bg-[#1a7f37]"
                  href={repositoryImport.repositoryHref}
                >
                  View repository
                </Link>
              </div>
            ) : null}

            {repositoryImport.status === "failed" ? (
              <div
                className="mt-5 rounded-md border border-[#ff8182] bg-[#ffebe9] p-4 text-sm text-[#cf222e]"
                role="alert"
              >
                <p className="font-semibold">Import failed</p>
                <p className="mt-1">
                  {repositoryImport.errorMessage ??
                    "The source could not be imported. Check the source URL and credentials."}
                </p>
                <Link
                  className="mt-3 inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-white px-4 font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
                  href="/new/import"
                >
                  Start another import
                </Link>
              </div>
            ) : null}

            {pollError ? (
              <p className="mt-4 text-sm text-[#cf222e]" role="alert">
                {pollError}
              </p>
            ) : null}
          </div>

          <aside className="border-t border-[#d0d7de] bg-[#f6f8fa] p-5 text-sm md:border-l md:border-t-0">
            <dl className="grid gap-4">
              <div>
                <dt className="font-semibold text-[#1f2328]">Source</dt>
                <dd className="mt-1 break-all text-[#59636e]">{sourceLabel}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#1f2328]">Destination</dt>
                <dd className="mt-1 break-all text-[#59636e]">
                  {repositoryImport.repositoryHref}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#1f2328]">Last updated</dt>
                <dd className="mt-1 text-[#59636e]">
                  {new Date(repositoryImport.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </section>
  );
}
