"use client";

import { useState, useTransition } from "react";
import type { RepositoryOverview, RepositorySocialState } from "@/lib/api";

type RepositoryHeaderActionsProps = {
  repository: RepositoryOverview;
};

function formatCompactCount(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

function socialStateFromRepository(
  repository: RepositoryOverview,
): RepositorySocialState {
  return {
    starred: repository.viewerState.starred,
    watching: repository.viewerState.watching,
    forkedRepositoryHref: repository.viewerState.forkedRepositoryHref,
    starsCount: repository.sidebar.starsCount,
    watchersCount: repository.sidebar.watchersCount,
    forksCount: repository.sidebar.forksCount,
  };
}

async function mutateSocial(
  owner: string,
  repo: string,
  action: "star" | "watch",
  enabled: boolean,
) {
  const response = await fetch(`/${owner}/${repo}/actions/${action}`, {
    method: enabled ? "PUT" : "DELETE",
  });
  if (!response.ok) {
    throw new Error(`${action} update failed`);
  }
  return (await response.json()) as RepositorySocialState;
}

export function RepositoryHeaderActions({
  repository,
}: RepositoryHeaderActionsProps) {
  const [social, setSocial] = useState(() =>
    socialStateFromRepository(repository),
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const owner = repository.owner_login;
  const repo = repository.name;

  function setOptimisticSocial(
    next: RepositorySocialState,
    operation: () => Promise<RepositorySocialState>,
  ) {
    const previous = social;
    setSocial(next);
    setFeedback(null);
    startTransition(async () => {
      try {
        setSocial(await operation());
      } catch {
        setSocial(previous);
        setFeedback("Repository action could not be saved.");
      }
    });
  }

  function toggleStar() {
    const starred = !social.starred;
    setOptimisticSocial(
      {
        ...social,
        starred,
        starsCount: Math.max(0, social.starsCount + (starred ? 1 : -1)),
      },
      () => mutateSocial(owner, repo, "star", starred),
    );
  }

  function toggleWatch() {
    const watching = !social.watching;
    setOptimisticSocial(
      {
        ...social,
        watching,
        watchersCount: Math.max(0, social.watchersCount + (watching ? 1 : -1)),
      },
      () => mutateSocial(owner, repo, "watch", watching),
    );
  }

  function forkRepository() {
    setFeedback(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/${owner}/${repo}/actions/fork`, {
          method: "POST",
        });
        if (!response.ok) {
          throw new Error("fork failed");
        }
        const result = (await response.json()) as {
          forkHref: string;
          social: RepositorySocialState;
        };
        setSocial(result.social);
        window.location.assign(result.forkHref);
      } catch {
        setFeedback("Repository could not be forked.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <button
        aria-pressed={social.watching}
        className="inline-flex h-8 items-center gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 font-semibold text-[#1f2328] hover:bg-[#eef1f4] disabled:opacity-60"
        disabled={isPending}
        onClick={toggleWatch}
        type="button"
      >
        {social.watching ? "Unwatch" : "Watch"}
        <span className="rounded-full bg-[#eaeef2] px-1.5 py-0.5 text-xs">
          {formatCompactCount(social.watchersCount)}
        </span>
      </button>
      {social.forkedRepositoryHref ? (
        <a
          className="inline-flex h-8 items-center gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 font-semibold text-[#1f2328] hover:bg-[#eef1f4]"
          href={social.forkedRepositoryHref}
        >
          Forked
          <span className="rounded-full bg-[#eaeef2] px-1.5 py-0.5 text-xs">
            {formatCompactCount(social.forksCount)}
          </span>
        </a>
      ) : (
        <button
          className="inline-flex h-8 items-center gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 font-semibold text-[#1f2328] hover:bg-[#eef1f4] disabled:opacity-60"
          disabled={isPending}
          onClick={forkRepository}
          type="button"
        >
          Fork
          <span className="rounded-full bg-[#eaeef2] px-1.5 py-0.5 text-xs">
            {formatCompactCount(social.forksCount)}
          </span>
        </button>
      )}
      <button
        aria-pressed={social.starred}
        className="inline-flex h-8 items-center gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 font-semibold text-[#1f2328] hover:bg-[#eef1f4] disabled:opacity-60"
        disabled={isPending}
        onClick={toggleStar}
        type="button"
      >
        {social.starred ? "Unstar" : "Star"}
        <span className="rounded-full bg-[#eaeef2] px-1.5 py-0.5 text-xs">
          {formatCompactCount(social.starsCount)}
        </span>
      </button>
      {feedback ? (
        <p
          className="basis-full text-right text-xs text-[#cf222e]"
          role="alert"
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
