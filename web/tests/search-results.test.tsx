import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchResultsPage } from "@/components/SearchResultsPage";
import {
  type GlobalSearchResult,
  globalSearchPath,
  type ListEnvelope,
} from "@/lib/api";

function result(
  overrides: Partial<GlobalSearchResult> = {},
): GlobalSearchResult {
  return {
    document: {
      id: overrides.document?.id ?? "doc-1",
      repository_id: overrides.document?.repository_id ?? null,
      owner_user_id: overrides.document?.owner_user_id ?? "user-1",
      owner_organization_id: overrides.document?.owner_organization_id ?? null,
      kind: overrides.document?.kind ?? "repository",
      resource_id: overrides.document?.resource_id ?? "repo-1",
      title: overrides.document?.title ?? "editorial-search",
      body: overrides.document?.body ?? "A calm repository search surface",
      path: overrides.document?.path ?? null,
      language: overrides.document?.language ?? null,
      branch: overrides.document?.branch ?? null,
      visibility: overrides.document?.visibility ?? "public",
      metadata: overrides.document?.metadata ?? {},
      indexed_at: overrides.document?.indexed_at ?? "2026-05-01T00:00:00Z",
      created_at: overrides.document?.created_at ?? "2026-05-01T00:00:00Z",
      updated_at: overrides.document?.updated_at ?? "2026-05-01T00:00:00Z",
    },
    rank: overrides.rank ?? 1,
    type: overrides.type ?? "repositories",
    href: overrides.href ?? "/mona/editorial-search",
    title: overrides.title ?? "editorial-search",
    summary: overrides.summary ?? "A calm repository search surface",
    owner_login: overrides.owner_login ?? "mona",
    repository_name: overrides.repository_name ?? "editorial-search",
    display_name: overrides.display_name ?? null,
    avatar_url: overrides.avatar_url ?? null,
    visibility: overrides.visibility ?? "public",
    updated_at: overrides.updated_at ?? "2026-05-01T00:00:00Z",
  };
}

function envelope(
  items: GlobalSearchResult[],
): ListEnvelope<GlobalSearchResult> {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 30,
  };
}

describe("SearchResultsPage", () => {
  it("renders repository, user, and organization results with real links", () => {
    render(
      <SearchResultsPage
        activeType="repositories"
        query="editorial"
        results={envelope([
          result(),
          result({
            document: {
              ...result().document,
              id: "doc-2",
              kind: "user",
              resource_id: "mona",
              title: "Mona Lisa",
            },
            type: "users",
            href: "/mona",
            title: "Mona Lisa",
            display_name: "Mona Lisa",
            owner_login: "mona",
            repository_name: null,
            summary: "Maintainer focused on review tools",
          }),
          result({
            document: {
              ...result().document,
              id: "doc-3",
              kind: "organization",
              resource_id: "namuh",
              title: "Namuh Labs",
            },
            type: "organizations",
            href: "/orgs/namuh",
            title: "Namuh Labs",
            display_name: "Namuh Labs",
            owner_login: "namuh",
            repository_name: null,
            summary: "Research and product engineering",
          }),
        ])}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Search opengithub" }),
    ).toBeVisible();
    expect(screen.getByText("3 repositories results")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /editorial-search/ }),
    ).toHaveAttribute("href", "/mona/editorial-search");
    expect(screen.getByRole("link", { name: /Mona Lisa/ })).toHaveAttribute(
      "href",
      "/mona",
    );
    expect(screen.getByRole("link", { name: /Namuh Labs/ })).toHaveAttribute(
      "href",
      "/orgs/namuh",
    );
    expect(
      document.querySelectorAll('a[href="#"], a:not([href])'),
    ).toHaveLength(0);
  });

  it("renders no-results syntax tips and preserves query in tabs", () => {
    render(
      <SearchResultsPage
        activeType="users"
        query="missing-person"
        results={{ items: [], total: 0, page: 1, pageSize: 30 }}
      />,
    );

    expect(screen.getByText('Nothing matched "missing-person".')).toBeVisible();
    expect(screen.getByText("owner:")).toBeVisible();
    expect(screen.getByRole("link", { name: "Repositories" })).toHaveAttribute(
      "href",
      "/search?q=missing-person&type=repositories",
    );
  });

  it("renders validation errors without leaking internals", () => {
    render(
      <SearchResultsPage
        activeType="repositories"
        query="x"
        results={{
          error: {
            code: "validation_failed",
            message:
              "search query must contain at least two non-whitespace characters",
          },
          status: 422,
        }}
      />,
    );

    expect(screen.getByText("Search unavailable")).toBeVisible();
    expect(screen.getByText(/Short searches need/)).toBeVisible();
    expect(screen.queryByText(/DATABASE_URL|stack trace|panic/i)).toBeNull();
  });

  it("builds the API search path with UI type names", () => {
    expect(
      globalSearchPath({
        query: "router guards",
        type: "repositories",
        page: 2,
        pageSize: 30,
      }),
    ).toBe("/api/search?q=router+guards&type=repositories&page=2&pageSize=30");
  });
});
