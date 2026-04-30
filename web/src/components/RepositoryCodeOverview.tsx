import Link from "next/link";
import type { RepositoryOverview, RepositoryTreeEntry } from "@/lib/api";

type RepositoryCodeOverviewProps = {
  repository: RepositoryOverview;
};

function formatCount(value: number, label: string) {
  return `${new Intl.NumberFormat("en").format(value)} ${label}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function RepositoryTabs({ repository }: RepositoryCodeOverviewProps) {
  const base = `/${repository.owner_login}/${repository.name}`;
  const tabs = [
    ["Code", base],
    ["Issues", `${base}/issues`],
    ["Pull requests", `${base}/pulls`],
    ["Discussions", `${base}/discussions`],
    ["Actions", `${base}/actions`],
    ["Security", `${base}/security`],
    ["Insights", `${base}/pulse`],
  ];
  const canAdmin = ["owner", "admin"].includes(
    repository.viewerPermission ?? "",
  );
  if (canAdmin) {
    tabs.push(["Settings", `${base}/settings`]);
  }

  return (
    <nav
      aria-label="Repository"
      className="mt-5 flex gap-1 overflow-x-auto border-b border-[#d0d7de] text-sm"
    >
      {tabs.map(([label, href]) => (
        <Link
          className={`shrink-0 border-b-2 px-3 py-3 font-medium ${
            label === "Code"
              ? "border-[#fd8c73] text-[#1f2328]"
              : "border-transparent text-[#59636e] hover:border-[#d0d7de] hover:text-[#1f2328]"
          }`}
          href={href}
          key={label}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function FileIcon({ kind }: { kind: RepositoryTreeEntry["kind"] }) {
  return (
    <span aria-hidden="true" className="w-5 text-center text-[#59636e]">
      {kind === "folder" ? "▸" : "□"}
    </span>
  );
}

function RepositoryFileTable({ repository }: RepositoryCodeOverviewProps) {
  if (repository.rootEntries.length === 0) {
    return (
      <div className="rounded-md border border-[#d0d7de] bg-white p-6">
        <h2 className="text-base font-semibold text-[#1f2328]">Quick setup</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#59636e]">
          This repository is ready. Push an existing project or create a new
          file to start the default branch.
        </p>
        <div className="mt-4 rounded-md bg-[#f6f8fa] p-3 font-mono text-xs text-[#1f2328]">
          git remote add origin {repository.cloneUrls.https}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-[#d0d7de] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-3 text-sm">
        <div className="min-w-0">
          <span className="font-semibold text-[#1f2328]">
            {repository.latestCommit?.message ?? "No commits yet"}
          </span>
          {repository.latestCommit ? (
            <Link
              className="ml-2 font-mono text-xs text-[#0969da] hover:underline"
              href={repository.latestCommit.href}
            >
              {repository.latestCommit.shortOid}
            </Link>
          ) : null}
        </div>
        <Link
          className="text-sm font-semibold text-[#0969da] hover:underline"
          href={`/${repository.owner_login}/${repository.name}/commits/${repository.default_branch}`}
        >
          History
        </Link>
      </div>
      <ul>
        {repository.rootEntries.map((entry) => (
          <li
            className="border-b border-[#d0d7de] last:border-b-0"
            key={entry.path}
          >
            <Link
              className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto] items-center gap-3 px-4 py-3 text-sm hover:bg-[#f6f8fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0969da] max-md:grid-cols-1"
              href={entry.href}
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold text-[#0969da]">
                <FileIcon kind={entry.kind} />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="truncate text-[#59636e]">
                {entry.latestCommitMessage ?? "Repository file"}
              </span>
              <span className="whitespace-nowrap text-xs text-[#59636e]">
                {formatDate(entry.updatedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RepositoryToolbar({ repository }: RepositoryCodeOverviewProps) {
  const base = `/${repository.owner_login}/${repository.name}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-[#59636e]">Default branch</span>
      <Link
        className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#eef1f4]"
        href={`${base}/tree/${repository.default_branch}`}
      >
        {repository.default_branch}
      </Link>
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
        <Link
          className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm text-[#59636e] hover:bg-[#f6f8fa]"
          href={`${base}/find/${repository.default_branch}`}
        >
          Go to file
        </Link>
        <Link
          className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#eef1f4]"
          href={`${base}/new/${repository.default_branch}`}
        >
          Add file
        </Link>
        <details className="relative">
          <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-md bg-[#1f883d] px-3 text-sm font-semibold text-white hover:bg-[#1a7f37]">
            Code
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-80 rounded-md border border-[#d0d7de] bg-white p-3 text-sm text-[#1f2328] shadow-lg">
            <p className="font-semibold">Clone</p>
            <label
              className="mt-3 block text-xs font-semibold text-[#59636e]"
              htmlFor="clone-https"
            >
              HTTPS
            </label>
            <input
              className="mt-1 h-8 w-full rounded-md border border-[#d0d7de] px-2 font-mono text-xs"
              id="clone-https"
              readOnly
              value={repository.cloneUrls.https}
            />
            <label
              className="mt-3 block text-xs font-semibold text-[#59636e]"
              htmlFor="clone-ssh"
            >
              SSH
            </label>
            <input
              className="mt-1 h-8 w-full rounded-md border border-[#d0d7de] px-2 font-mono text-xs"
              id="clone-ssh"
              readOnly
              value={repository.cloneUrls.git}
            />
            <Link
              className="mt-3 block text-[#0969da] hover:underline"
              href={repository.cloneUrls.zip}
            >
              Download ZIP
            </Link>
          </div>
        </details>
      </div>
    </div>
  );
}

function RepositorySidebar({ repository }: RepositoryCodeOverviewProps) {
  return (
    <aside className="space-y-5 text-sm">
      <section>
        <h2 className="font-semibold text-[#1f2328]">About</h2>
        <p className="mt-3 leading-6 text-[#1f2328]">
          {repository.sidebar.about ??
            "No description, website, or topics provided."}
        </p>
        {repository.sidebar.websiteUrl ? (
          <Link
            className="mt-2 block text-[#0969da] hover:underline"
            href={repository.sidebar.websiteUrl}
          >
            {repository.sidebar.websiteUrl}
          </Link>
        ) : null}
      </section>
      <section className="space-y-2 text-[#59636e]">
        <p>{formatCount(repository.sidebar.starsCount, "stars")}</p>
        <p>{formatCount(repository.sidebar.watchersCount, "watching")}</p>
        <p>{formatCount(repository.sidebar.forksCount, "forks")}</p>
        <p>{formatCount(repository.sidebar.releasesCount, "releases")}</p>
        <p>{formatCount(repository.sidebar.deploymentsCount, "deployments")}</p>
        <p>
          {formatCount(repository.sidebar.contributorsCount, "contributors")}
        </p>
      </section>
      {repository.sidebar.languages.length > 0 ? (
        <section>
          <h2 className="font-semibold text-[#1f2328]">Languages</h2>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#d0d7de]">
            {repository.sidebar.languages.map((language) => (
              <span
                aria-hidden="true"
                key={language.language}
                style={{
                  backgroundColor: language.color,
                  width: `${Math.max(language.percentage, 3)}%`,
                }}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {repository.sidebar.languages.map((language) => (
              <li className="flex items-center gap-1.5" key={language.language}>
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ backgroundColor: language.color }}
                />
                <span>{language.language}</span>
                <span className="text-[#59636e]">{language.percentage}%</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}

export function RepositoryCodeOverview({
  repository,
}: RepositoryCodeOverviewProps) {
  return (
    <div>
      <header className="border-b border-[#d0d7de] bg-[#f6f8fa] px-6 pt-5">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-[#59636e]">{repository.owner_login}</p>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-normal text-[#1f2328]">
                  {repository.name}
                </h1>
                <span className="rounded-full border border-[#d0d7de] px-2 py-0.5 text-xs font-semibold capitalize text-[#59636e]">
                  {repository.visibility}
                </span>
              </div>
            </div>
          </div>
          <RepositoryTabs repository={repository} />
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_296px] gap-8 px-6 py-6 max-lg:grid-cols-1">
        <div className="min-w-0 space-y-4">
          <RepositoryToolbar repository={repository} />
          <RepositoryFileTable repository={repository} />
          {repository.readme ? (
            <article className="rounded-md border border-[#d0d7de] bg-white">
              <h2 className="border-b border-[#d0d7de] px-4 py-3 text-sm font-semibold text-[#1f2328]">
                README.md
              </h2>
              <pre className="whitespace-pre-wrap px-4 py-4 text-sm leading-6 text-[#1f2328]">
                {repository.readme.content}
              </pre>
            </article>
          ) : null}
        </div>
        <RepositorySidebar repository={repository} />
      </div>
    </div>
  );
}
