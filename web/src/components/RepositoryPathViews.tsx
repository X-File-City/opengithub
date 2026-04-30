import Link from "next/link";
import type { ReactNode } from "react";
import { RepositoryBlobViewer } from "@/components/RepositoryBlobViewer";
import { RepositoryTreeBrowser } from "@/components/RepositoryTreeBrowser";
import type {
  ListEnvelope,
  RepositoryBlobView,
  RepositoryCommitHistoryItem,
  RepositoryPathBreadcrumb,
  RepositoryPathOverview,
} from "@/lib/api";

function Breadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs: RepositoryPathBreadcrumb[];
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1 text-sm"
    >
      {breadcrumbs.map((breadcrumb, index) => (
        <span className="flex min-w-0 items-center gap-1" key={breadcrumb.href}>
          {index > 0 ? <span className="text-[#59636e]">/</span> : null}
          <Link
            className="max-w-48 truncate font-semibold text-[#0969da] hover:underline"
            href={breadcrumb.href}
          >
            {breadcrumb.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}

function RepositoryPathHeader({
  owner,
  repo,
  visibility,
  children,
}: {
  owner: string;
  repo: string;
  visibility?: string;
  children: ReactNode;
}) {
  return (
    <header className="border-b border-[#d0d7de] bg-[#f6f8fa] px-6 py-5">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm text-[#59636e]">{owner}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Link
            className="text-xl font-semibold tracking-normal text-[#0969da] hover:underline"
            href={`/${owner}/${repo}`}
          >
            {repo}
          </Link>
          {visibility ? (
            <span className="rounded-full border border-[#d0d7de] px-2 py-0.5 text-xs font-semibold capitalize text-[#59636e]">
              {visibility}
            </span>
          ) : null}
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </header>
  );
}

export function RepositoryTreeView({
  overview,
}: {
  overview: RepositoryPathOverview;
}) {
  return (
    <div>
      <RepositoryPathHeader
        owner={overview.owner_login}
        repo={overview.name}
        visibility={overview.visibility}
      >
        <Breadcrumbs breadcrumbs={overview.breadcrumbs} />
      </RepositoryPathHeader>
      <main className="mx-auto max-w-7xl space-y-4 px-6 py-6">
        <RepositoryTreeBrowser overview={overview} />
      </main>
    </div>
  );
}

export function RepositoryBlobViewPage({ blob }: { blob: RepositoryBlobView }) {
  return (
    <div>
      <RepositoryPathHeader
        owner={blob.owner_login}
        repo={blob.name}
        visibility={blob.visibility}
      >
        <Breadcrumbs breadcrumbs={blob.breadcrumbs} />
      </RepositoryPathHeader>
      <main className="mx-auto max-w-7xl space-y-4 px-6 py-6">
        <RepositoryBlobViewer blob={blob} />
      </main>
    </div>
  );
}

export function RepositoryCommitHistoryView({
  owner,
  repo,
  refName,
  path,
  history,
}: {
  owner: string;
  repo: string;
  refName: string;
  path: string;
  history: ListEnvelope<RepositoryCommitHistoryItem>;
}) {
  return (
    <div>
      <RepositoryPathHeader owner={owner} repo={repo}>
        <h1 className="text-base font-semibold text-[#1f2328]">
          Commit history for {path || refName}
        </h1>
      </RepositoryPathHeader>
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="overflow-hidden rounded-md border border-[#d0d7de] bg-white">
          {history.items.map((commit) => (
            <Link
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[#d0d7de] px-4 py-3 text-sm last:border-b-0 hover:bg-[#f6f8fa] max-md:grid-cols-1"
              href={commit.href}
              key={commit.oid}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-[#1f2328]">
                  {commit.message}
                </span>
                <span className="mt-1 block text-xs text-[#59636e]">
                  {commit.authorLogin ?? "Unknown author"}
                </span>
              </span>
              <span className="font-mono text-xs text-[#0969da]">
                {commit.shortOid}
              </span>
            </Link>
          ))}
          {history.items.length === 0 ? (
            <p className="p-6 text-sm text-[#59636e]">
              No commits are recorded for this path.
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
