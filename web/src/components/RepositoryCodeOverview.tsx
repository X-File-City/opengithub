import Link from "next/link";
import { RepositoryCodeToolbar } from "@/components/RepositoryCodeToolbar";
import { RepositoryFileTable } from "@/components/RepositoryFileTable";
import { RepositoryHeaderActions } from "@/components/RepositoryHeaderActions";
import { RepositoryQuickSetup } from "@/components/RepositoryQuickSetup";
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
      className="tabs mt-5 flex gap-1 overflow-x-auto border-b text-sm"
      style={{ borderColor: "var(--line)" }}
    >
      {tabs.map(([label, href]) => (
        <Link
          className={`tab shrink-0 border-b-2 px-3 py-3 font-medium ${
            label === "Code" ? "active" : ""
          }`}
          href={href}
          key={label}
          style={
            label === "Code"
              ? { borderColor: "var(--accent)", color: "var(--ink-1)" }
              : { borderColor: "transparent", color: "var(--ink-3)" }
          }
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
        <h2 className="font-semibold" style={{ color: "var(--ink-1)" }}>
          About
        </h2>
        <p className="mt-3 leading-6" style={{ color: "var(--ink-1)" }}>
          {repository.sidebar.about ??
            "No description, website, or topics provided."}
        </p>
        {repository.sidebar.websiteUrl ? (
          <Link
            className="mt-2 block hover:underline"
            href={repository.sidebar.websiteUrl}
            style={{ color: "var(--accent)" }}
          >
            {repository.sidebar.websiteUrl}
          </Link>
        ) : null}
        {repository.sidebar.topics.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {repository.sidebar.topics.map((topic) => (
              <Link
                className="chip accent"
                href={`/topics/${encodeURIComponent(topic)}`}
                key={topic}
              >
                {topic}
              </Link>
            ))}
          </div>
        ) : null}
      </section>
      <section className="space-y-2" style={{ color: "var(--ink-3)" }}>
        <p>{formatCount(repository.sidebar.starsCount, "stars")}</p>
        <p>{formatCount(repository.sidebar.watchersCount, "watching")}</p>
        <p>{formatCount(repository.sidebar.forksCount, "forks")}</p>
        <Link
          className="block hover:underline"
          href={`${base}/releases`}
          style={{ color: "var(--ink-3)" }}
        >
          {formatCount(repository.sidebar.releasesCount, "releases")}
        </Link>
        <Link
          className="block hover:underline"
          href={`${base}/deployments`}
          style={{ color: "var(--ink-3)" }}
        >
          {formatCount(repository.sidebar.deploymentsCount, "deployments")}
        </Link>
        <p>
          {formatCount(repository.sidebar.contributorsCount, "contributors")}
        </p>
      </section>
      {repository.sidebar.languages.length > 0 ? (
        <section>
          <h2 className="font-semibold" style={{ color: "var(--ink-1)" }}>
            Languages
          </h2>
          <div
            className="mt-3 flex h-2 overflow-hidden rounded-full"
            style={{ background: "var(--line)" }}
          >
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
                <span style={{ color: "var(--ink-3)" }}>
                  {language.percentage}%
                </span>
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
      <header
        className="border-b px-6 pt-5"
        style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="t-sm" style={{ color: "var(--ink-3)" }}>
                {repository.owner_login}
              </p>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                <h1
                  className="truncate text-xl font-semibold tracking-normal"
                  style={{ color: "var(--ink-1)" }}
                >
                  {repository.name}
                </h1>
                <span className="chip soft capitalize">
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
            emptyState={<RepositoryQuickSetup repository={repository} />}
            entries={repository.rootEntries}
            historyHref={`/${repository.owner_login}/${repository.name}/commits/${repository.default_branch}`}
            latestCommit={repository.latestCommit}
          />
          {repository.readme ? (
            <article
              className="rounded-md"
              style={{
                border: "1px solid var(--line)",
                background: "var(--surface)",
              }}
            >
              <h2
                className="border-b px-4 py-3 t-sm font-semibold"
                style={{ borderColor: "var(--line)", color: "var(--ink-1)" }}
              >
                README.md
              </h2>
              <pre
                className="whitespace-pre-wrap px-4 py-4 t-sm leading-6"
                style={{ color: "var(--ink-1)" }}
              >
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
