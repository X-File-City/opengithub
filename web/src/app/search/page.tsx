import { AppShell } from "@/components/AppShell";
import { QueryTabNavigation } from "@/components/QueryTabNavigation";
import {
  activeSearchType,
  SEARCH_TABS,
  searchTypeHref,
} from "@/lib/navigation";
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
  const activeType = activeSearchType(firstParam(params?.type));
  const activeTypeLabel =
    SEARCH_TABS.find((tab) => tab.value === activeType)?.label ??
    "Repositories";

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
          <input name="type" type="hidden" value={activeType} />
          <button className="btn primary" type="submit">
            Search
          </button>
        </form>
        <QueryTabNavigation
          activeValue={activeType}
          ariaLabel="Search result types"
          hrefForTab={(value) => searchTypeHref(value, query)}
          tabs={SEARCH_TABS}
        />
        <div className="card p-6">
          <p className="t-label" style={{ color: "var(--ink-3)" }}>
            {activeTypeLabel}
          </p>
          <p className="t-body" style={{ color: "var(--ink-2)" }}>
            {query
              ? `${activeTypeLabel} results for "${query}" will appear here when the search UI phases connect the indexed API.`
              : "Use the global jump input to start a search."}
          </p>
        </div>
      </section>
    </AppShell>
  );
}
