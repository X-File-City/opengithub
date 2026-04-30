import Link from "next/link";

type RepositoryPlaceholderPageProps = {
  owner: string;
  repo: string;
  title: string;
  description: string;
};

export function RepositoryPlaceholderPage({
  owner,
  repo,
  title,
  description,
}: RepositoryPlaceholderPageProps) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-8">
      <div className="card p-5">
        <p className="t-sm" style={{ color: "var(--ink-3)" }}>
          {owner} / {repo}
        </p>
        <h1 className="t-h2 mt-1" style={{ color: "var(--ink-1)" }}>
          {title}
        </h1>
        <p
          className="t-sm mt-2 max-w-2xl leading-6"
          style={{ color: "var(--ink-3)" }}
        >
          {description}
        </p>
        <Link className="btn mt-4" href={`/${owner}/${repo}`}>
          Back to Code
        </Link>
      </div>
    </section>
  );
}
