import Link from "next/link";
import { RepositoryShell } from "@/components/RepositoryShell";
import type { RepositoryOverview } from "@/lib/api";

type RepositoryPlaceholderPageProps = {
  repository: RepositoryOverview;
  activePath: string;
  title: string;
  description: string;
  actions?: { href: string; label: string; primary?: boolean }[];
};

export function RepositoryPlaceholderPage({
  repository,
  activePath,
  title,
  description,
  actions = [],
}: RepositoryPlaceholderPageProps) {
  return (
    <RepositoryShell
      activePath={activePath}
      frameClassName="max-w-5xl"
      repository={repository}
    >
      <section className="card p-5">
        <div className="t-label" style={{ color: "var(--ink-3)" }}>
          {repository.owner_login} / {repository.name}
        </div>
        <h1 className="t-h2 mt-2" style={{ color: "var(--ink-1)" }}>
          {title}
        </h1>
        <p
          className="t-sm mt-2 max-w-2xl leading-6"
          style={{ color: "var(--ink-3)" }}
        >
          {description}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            className="btn"
            href={`/${repository.owner_login}/${repository.name}`}
          >
            Back to Code
          </Link>
          {actions.map((action) => (
            <Link
              className={`btn ${action.primary ? "primary" : "ghost"}`}
              href={action.href}
              key={action.href}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </RepositoryShell>
  );
}
