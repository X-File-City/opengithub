import { AppShell } from "@/components/AppShell";
import { getSessionAndShellContext } from "@/lib/server-session";

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const [{ session, shellContext }, params] = await Promise.all([
    getSessionAndShellContext(),
    searchParams,
  ]);
  const query = firstParam(params?.q)?.trim() ?? "";

  return (
    <AppShell session={session} shellContext={shellContext}>
      <section className="mx-auto max-w-[1240px] px-6 py-8">
        <div className="mb-6">
          <p className="t-label" style={{ color: "var(--ink-3)" }}>
            Search
          </p>
          <h1 className="t-h1">Search opengithub</h1>
        </div>
        <form action="/search" className="mb-6 flex max-w-2xl gap-2">
          <input
            aria-label="Search query"
            className="input flex-1"
            defaultValue={query}
            name="q"
            placeholder="Search repositories, issues, pull requests..."
            type="search"
          />
          <button className="btn primary" type="submit">
            Search
          </button>
        </form>
        <div className="card p-6">
          <p className="t-body" style={{ color: "var(--ink-2)" }}>
            {query
              ? `Search results for "${query}" will appear here when the search UI phases connect the indexed API.`
              : "Use the global jump input to start a search."}
          </p>
        </div>
      </section>
    </AppShell>
  );
}
