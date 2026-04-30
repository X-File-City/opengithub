import Link from "next/link";

type RepositoryUnavailablePageProps = {
  owner: string;
  repo: string;
};

export function RepositoryUnavailablePage({
  owner,
  repo,
}: RepositoryUnavailablePageProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <div
        className="rounded-md border p-5"
        style={{
          borderColor: "var(--line)",
          background: "var(--surface)",
        }}
      >
        <p className="t-sm" style={{ color: "var(--ink-3)" }}>
          {owner}
        </p>
        <h1
          className="mt-1 text-2xl font-semibold tracking-normal"
          style={{ color: "var(--ink-1)" }}
        >
          {repo}
        </h1>
        <p
          className="mt-2 t-sm leading-6"
          role="status"
          style={{ color: "var(--ink-3)" }}
        >
          Repository metadata is unavailable in this session. Known repository
          routes still resolve to explicit pages instead of missing-route
          responses.
        </p>
        <Link className="btn mt-4" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
