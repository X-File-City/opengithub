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

const BADGE_CLASS: Record<RepositoryImportStatusName, string> = {
  queued: "chip warn",
  importing: "chip info",
  imported: "chip ok",
  failed: "chip err",
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
      <div className="card">
        <header className="border-b p-5" style={{ borderColor: "var(--line)" }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p
                className="t-sm font-semibold"
                style={{ color: "var(--ink-3)" }}
              >
                Repository import
              </p>
              <h1 className="mt-1 t-h2" style={{ color: "var(--ink-1)" }}>
                Preparing {repositoryImport.repositoryHref.replace(/^\//, "")}
              </h1>
            </div>
            <span
              className={`inline-flex h-7 items-center rounded-full px-3 t-sm font-semibold ${BADGE_CLASS[repositoryImport.status]}`}
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
            <p
              aria-live="polite"
              className="t-sm leading-6"
              role="status"
              style={{ color: "var(--ink-3)" }}
            >
              {repositoryImport.progressMessage}
            </p>

            {shouldPoll(repositoryImport.status) ? (
              <div
                className="mt-5 rounded-md p-4 t-sm"
                style={{
                  border: "1px solid var(--line)",
                  background: "var(--surface-2)",
                  color: "var(--ink-3)",
                }}
              >
                <p className="font-semibold" style={{ color: "var(--ink-1)" }}>
                  Import is in progress
                </p>
                <p className="mt-1">
                  You can leave this page and return while opengithub fetches
                  the default branch.
                </p>
                <Link
                  className="btn mt-3 inline-flex h-9 items-center px-4 font-semibold"
                  href="/new/import"
                >
                  Start another import
                </Link>
              </div>
            ) : null}

            {repositoryImport.status === "imported" ? (
              <div
                className="mt-5 rounded-md p-4 t-sm"
                style={{
                  border: "1px solid var(--ok)",
                  background:
                    "var(--ok-soft, color-mix(in oklch, var(--ok) 12%, var(--surface)))",
                  color: "var(--ok)",
                }}
              >
                <p className="font-semibold">Import completed</p>
                <p className="mt-1">
                  The default branch is ready in the destination repository.
                </p>
                <Link
                  className="btn primary mt-3 inline-flex h-9 items-center px-4 font-semibold"
                  href={repositoryImport.repositoryHref}
                >
                  View repository
                </Link>
              </div>
            ) : null}

            {repositoryImport.status === "failed" ? (
              <div
                className="mt-5 rounded-md p-4 t-sm"
                role="alert"
                style={{
                  border: "1px solid var(--err)",
                  background: "var(--err-soft)",
                  color: "var(--err)",
                }}
              >
                <p className="font-semibold">Import failed</p>
                <p className="mt-1">
                  {repositoryImport.errorMessage ??
                    "The source could not be imported. Check the source URL and credentials."}
                </p>
                <Link
                  className="btn mt-3 inline-flex h-9 items-center px-4 font-semibold"
                  href="/new/import"
                >
                  Start another import
                </Link>
              </div>
            ) : null}

            {pollError ? (
              <p
                className="mt-4 t-sm"
                role="alert"
                style={{ color: "var(--err)" }}
              >
                {pollError}
              </p>
            ) : null}
          </div>

          <aside
            className="border-t p-5 t-sm md:border-l md:border-t-0"
            style={{
              borderColor: "var(--line)",
              background: "var(--surface-2)",
            }}
          >
            <dl className="grid gap-4">
              <div>
                <dt className="font-semibold" style={{ color: "var(--ink-1)" }}>
                  Source
                </dt>
                <dd
                  className="mt-1 max-w-full truncate"
                  title={sourceLabel}
                  style={{ color: "var(--ink-3)" }}
                >
                  {sourceLabel}
                </dd>
              </div>
              <div>
                <dt className="font-semibold" style={{ color: "var(--ink-1)" }}>
                  Destination
                </dt>
                <dd
                  className="mt-1 max-w-full truncate"
                  title={repositoryImport.repositoryHref}
                  style={{ color: "var(--ink-3)" }}
                >
                  {repositoryImport.repositoryHref}
                </dd>
              </div>
              <div>
                <dt className="font-semibold" style={{ color: "var(--ink-1)" }}>
                  Last updated
                </dt>
                <dd className="mt-1" style={{ color: "var(--ink-3)" }}>
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
