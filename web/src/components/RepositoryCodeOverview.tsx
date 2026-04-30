import Link from "next/link";
import { RepositoryCodeToolbar } from "@/components/RepositoryCodeToolbar";
import { RepositoryFileTable } from "@/components/RepositoryFileTable";
import { RepositoryHeaderActions } from "@/components/RepositoryHeaderActions";
import type { RepositoryOverview } from "@/lib/api";

type RepositoryCodeOverviewProps = {
  repository: RepositoryOverview;
};

function formatCount(value: number, label: string) {
  return `${new Intl.NumberFormat("en").format(value)} ${label}`;
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

function RepositorySidebar({ repository }: RepositoryCodeOverviewProps) {
  const base = `/${repository.owner_login}/${repository.name}`;

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
        {repository.sidebar.topics.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {repository.sidebar.topics.map((topic) => (
              <Link
                className="rounded-full bg-[#ddf4ff] px-2.5 py-1 text-xs font-semibold text-[#0969da] hover:bg-[#b6e3ff]"
                href={`/topics/${encodeURIComponent(topic)}`}
                key={topic}
              >
                {topic}
              </Link>
            ))}
          </div>
        ) : null}
      </section>
      <section className="space-y-2 text-[#59636e]">
        <p>{formatCount(repository.sidebar.starsCount, "stars")}</p>
        <p>{formatCount(repository.sidebar.watchersCount, "watching")}</p>
        <p>{formatCount(repository.sidebar.forksCount, "forks")}</p>
        <Link className="block hover:text-[#0969da]" href={`${base}/releases`}>
          {formatCount(repository.sidebar.releasesCount, "releases")}
        </Link>
        <Link
          className="block hover:text-[#0969da]"
          href={`${base}/deployments`}
        >
          {formatCount(repository.sidebar.deploymentsCount, "deployments")}
        </Link>
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
            <RepositoryHeaderActions repository={repository} />
          </div>
          <RepositoryTabs repository={repository} />
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_296px] gap-8 px-6 py-6 max-lg:grid-cols-1">
        <div className="min-w-0 space-y-4">
          <RepositoryCodeToolbar repository={repository} />
          <RepositoryFileTable
            emptyState={
              <div className="rounded-md border border-[#d0d7de] bg-white p-6">
                <h2 className="text-base font-semibold text-[#1f2328]">
                  Quick setup
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#59636e]">
                  This repository is ready. Push an existing project or create a
                  new file to start the default branch.
                </p>
                <div className="mt-4 rounded-md bg-[#f6f8fa] p-3 font-mono text-xs text-[#1f2328]">
                  <p>git remote add origin {repository.cloneUrls.https}</p>
                  <p>git branch -M {repository.default_branch}</p>
                  <p>git push -u origin {repository.default_branch}</p>
                </div>
              </div>
            }
            entries={repository.rootEntries}
            historyHref={`/${repository.owner_login}/${repository.name}/commits/${repository.default_branch}`}
            latestCommit={repository.latestCommit}
          />
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
