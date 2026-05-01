import { AppShell } from "@/components/AppShell";
import { PullRequestComparePage } from "@/components/PullRequestComparePage";
import { RepositoryUnavailablePage } from "@/components/RepositoryUnavailablePage";
import type { ApiErrorEnvelope } from "@/lib/api";
import { parseRepositoryCompareRange } from "@/lib/navigation";
import {
  getPullRequestCompare,
  getRepository,
  getRepositoryRefs,
  getSessionAndShellContext,
} from "@/lib/server-session";

type RepositoryCompareRangePageProps = {
  params: Promise<{ owner: string; repo: string; range: string[] }>;
  searchParams: Promise<{
    view?: string;
    headOwner?: string;
    headRepo?: string;
  }>;
};

function normalizeViewMode(value: string | undefined) {
  return value === "unified" ? "unified" : "split";
}

function isApiError(value: unknown): value is ApiErrorEnvelope {
  return Boolean(value && typeof value === "object" && "error" in value);
}

export default async function RepositoryCompareRangePage({
  params,
  searchParams,
}: RepositoryCompareRangePageProps) {
  const [{ owner, repo, range }, query, { session, shellContext }] =
    await Promise.all([params, searchParams, getSessionAndShellContext()]);
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const parsedRange = parseRepositoryCompareRange(range);
  const [repository, refs] = await Promise.all([
    getRepository(ownerLogin, repositoryName),
    getRepositoryRefs(ownerLogin, repositoryName),
  ]);

  const compare =
    repository && parsedRange
      ? await getPullRequestCompare(
          ownerLogin,
          repositoryName,
          parsedRange.base,
          parsedRange.head,
          {
            commits: 25,
            files: 100,
            headOwner: query.headOwner,
            headRepo: query.headRepo,
          },
        )
      : null;
  const error = isApiError(compare)
    ? compare
    : parsedRange
      ? null
      : {
          error: {
            code: "validation_failed",
            message: "Compare range must use base...head.",
          },
          status: 422,
        };

  return (
    <AppShell session={session} shellContext={shellContext}>
      {repository ? (
        <PullRequestComparePage
          compare={compare && !isApiError(compare) ? compare : null}
          error={error}
          refs={refs?.items ?? []}
          repository={repository}
          requestedRange={parsedRange}
          viewMode={normalizeViewMode(query.view)}
        />
      ) : (
        <RepositoryUnavailablePage owner={ownerLogin} repo={repositoryName} />
      )}
    </AppShell>
  );
}
