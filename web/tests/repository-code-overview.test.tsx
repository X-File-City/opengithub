import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RepositoryCodeOverview } from "@/components/RepositoryCodeOverview";
import {
  RepositoryBlobViewPage,
  RepositoryCommitHistoryView,
  RepositoryTreeView,
} from "@/components/RepositoryPathViews";
import type {
  RepositoryBlobView,
  RepositoryOverview,
  RepositoryPathOverview,
} from "@/lib/api";

function repositoryOverview(
  overrides: Partial<RepositoryOverview> = {},
): RepositoryOverview {
  const base: RepositoryOverview = {
    id: "repo-1",
    owner_user_id: "user-1",
    owner_organization_id: null,
    owner_login: "mona",
    name: "octo-app",
    description: "A repository for testing the Code tab",
    visibility: "public",
    default_branch: "main",
    is_archived: false,
    created_by_user_id: "user-1",
    created_at: "2026-04-30T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
    viewerPermission: "owner",
    branchCount: 2,
    tagCount: 1,
    defaultBranchRef: null,
    latestCommit: {
      oid: "abcdef1234567890",
      shortOid: "abcdef1",
      message: "Initial commit",
      href: "/mona/octo-app/commit/abcdef1234567890",
      committedAt: "2026-04-30T00:00:00Z",
    },
    rootEntries: [
      {
        kind: "folder",
        name: "src",
        path: "src",
        href: "/mona/octo-app/tree/main/src",
        byteSize: null,
        latestCommitMessage: "Initial commit",
        latestCommitHref: "/mona/octo-app/commit/abcdef1234567890",
        updatedAt: "2026-04-30T00:00:00Z",
      },
      {
        kind: "file",
        name: "README.md",
        path: "README.md",
        href: "/mona/octo-app/blob/main/README.md",
        byteSize: 42,
        latestCommitMessage: "Initial commit",
        latestCommitHref: "/mona/octo-app/commit/abcdef1234567890",
        updatedAt: "2026-04-30T00:00:00Z",
      },
    ],
    files: [
      {
        id: "file-1",
        repositoryId: "repo-1",
        commitId: "commit-1",
        path: "README.md",
        content: "# octo-app\n\nHello from the README.",
        oid: "readme-oid",
        byteSize: 42,
        createdAt: "2026-04-30T00:00:00Z",
      },
      {
        id: "file-2",
        repositoryId: "repo-1",
        commitId: "commit-1",
        path: "src/index.ts",
        content: "export const answer = 42;\n",
        oid: "index-oid",
        byteSize: 26,
        createdAt: "2026-04-30T00:00:00Z",
      },
    ],
    readme: {
      id: "file-1",
      repositoryId: "repo-1",
      commitId: "commit-1",
      path: "README.md",
      content: "# octo-app\n\nHello from the README.",
      oid: "readme-oid",
      byteSize: 42,
      createdAt: "2026-04-30T00:00:00Z",
    },
    sidebar: {
      about: "A repository for testing the Code tab",
      websiteUrl: null,
      topics: [],
      starsCount: 3,
      watchersCount: 2,
      forksCount: 1,
      releasesCount: 0,
      deploymentsCount: 0,
      contributorsCount: 1,
      languages: [
        {
          language: "TypeScript",
          color: "#3178c6",
          byteCount: 1200,
          percentage: 80,
        },
        {
          language: "Rust",
          color: "#dea584",
          byteCount: 300,
          percentage: 20,
        },
      ],
    },
    viewerState: {
      starred: false,
      watching: false,
      forkedRepositoryHref: null,
    },
    cloneUrls: {
      https: "https://opengithub.namuh.co/mona/octo-app.git",
      git: "git@opengithub.namuh.co:mona/octo-app.git",
      zip: "/mona/octo-app/archive/refs/heads/main.zip",
    },
  };
  return { ...base, ...overrides };
}

afterEach(() => {
  vi.restoreAllMocks();
});

function pathOverview(): RepositoryPathOverview {
  const repository = repositoryOverview();
  return {
    ...repository,
    refName: "main",
    resolvedRef: {
      kind: "branch",
      shortName: "main",
      qualifiedName: "refs/heads/main",
      targetOid: "abcdef1234567890",
      recoveryHref: "/mona/octo-app/tree/main",
    },
    defaultBranchHref: "/mona/octo-app/tree/main",
    recoveryHref: "/mona/octo-app/tree/main/src",
    page: 1,
    pageSize: 1,
    hasMore: false,
    path: "src",
    pathName: "src",
    breadcrumbs: [
      {
        name: "octo-app",
        path: "",
        href: "/mona/octo-app/tree/main",
      },
      {
        name: "src",
        path: "src",
        href: "/mona/octo-app/tree/main/src",
      },
    ],
    parentHref: "/mona/octo-app/tree/main",
    entries: [
      {
        kind: "file",
        name: "index.ts",
        path: "src/index.ts",
        href: "/mona/octo-app/blob/main/src/index.ts",
        byteSize: 31,
        latestCommitMessage: "Initial commit",
        latestCommitHref: "/mona/octo-app/commit/abcdef1234567890",
        updatedAt: "2026-04-30T00:00:00Z",
      },
    ],
    readme: {
      id: "file-2",
      repositoryId: "repo-1",
      commitId: "commit-1",
      path: "src/README.md",
      content: "# src docs",
      oid: "src-readme",
      byteSize: 10,
      createdAt: "2026-04-30T00:00:00Z",
    },
    historyHref: "/mona/octo-app/commits/main/src",
  };
}

function blobView(): RepositoryBlobView {
  const repository = repositoryOverview();
  return {
    ...repository,
    refName: "main",
    resolvedRef: {
      kind: "branch",
      shortName: "main",
      qualifiedName: "refs/heads/main",
      targetOid: "abcdef1234567890",
      recoveryHref: "/mona/octo-app/tree/main",
    },
    defaultBranchHref: "/mona/octo-app/tree/main",
    recoveryHref: "/mona/octo-app/tree/main/src",
    path: "src/index.ts",
    pathName: "index.ts",
    breadcrumbs: [
      {
        name: "octo-app",
        path: "",
        href: "/mona/octo-app/tree/main",
      },
      {
        name: "src",
        path: "src",
        href: "/mona/octo-app/tree/main/src",
      },
      {
        name: "index.ts",
        path: "src/index.ts",
        href: "/mona/octo-app/tree/main/src/index.ts",
      },
    ],
    parentHref: "/mona/octo-app/tree/main/src",
    file: {
      id: "file-3",
      repositoryId: "repo-1",
      commitId: "commit-1",
      path: "src/index.ts",
      content: "export const answer = 42;\n",
      oid: "index-oid",
      byteSize: 26,
      createdAt: "2026-04-30T00:00:00Z",
    },
    language: "TypeScript",
    isBinary: false,
    isLarge: false,
    historyHref: "/mona/octo-app/commits/main/src/index.ts",
    rawHref: "/mona/octo-app/src/index.ts?raw=1",
    downloadHref: "/mona/octo-app/src/index.ts?download=1",
  };
}

describe("RepositoryCodeOverview", () => {
  it("renders the repository Code tab workspace with working navigation", () => {
    render(<RepositoryCodeOverview repository={repositoryOverview()} />);

    expect(screen.getByRole("heading", { name: "octo-app" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Code" })).toHaveAttribute(
      "href",
      "/mona/octo-app",
    );
    expect(screen.getByRole("link", { name: "Issues" })).toHaveAttribute(
      "href",
      "/mona/octo-app/issues",
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/mona/octo-app/settings",
    );
    expect(screen.getByLabelText(/Current branch main/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Go to file" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Create new file" }),
    ).toHaveAttribute("href", "/mona/octo-app/new/main");
    expect(screen.getByRole("link", { name: "Upload files" })).toHaveAttribute(
      "href",
      "/mona/octo-app/upload/main",
    );
    expect(screen.getByRole("button", { name: /Watch/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Fork/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Star/ })).toBeVisible();
    expect(screen.getByRole("link", { name: /src/ })).toHaveAttribute(
      "href",
      "/mona/octo-app/tree/main/src",
    );
    expect(screen.getByRole("link", { name: /README\.md/ })).toHaveAttribute(
      "href",
      "/mona/octo-app/blob/main/README.md",
    );
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute(
      "href",
      "/mona/octo-app/commits/main",
    );
    expect(screen.getByText(/# octo-app/)).toBeVisible();
  });

  it("exposes clone commands and sidebar metadata without dead links", () => {
    const { container } = render(
      <RepositoryCodeOverview repository={repositoryOverview()} />,
    );

    expect(
      screen.getByText("A repository for testing the Code tab"),
    ).toBeVisible();
    expect(screen.getByText("3 stars")).toBeVisible();
    expect(screen.getByText("2 watching")).toBeVisible();
    expect(screen.getByText("1 forks")).toBeVisible();
    expect(screen.getByText("TypeScript")).toBeVisible();
    expect(screen.getAllByDisplayValue(/octo-app\.git$/)).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Copy" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Download ZIP" })).toHaveAttribute(
      "href",
      "/mona/octo-app/archive/refs/heads/main.zip",
    );
    expect(
      container.querySelectorAll('a[href="#"], a:not([href])'),
    ).toHaveLength(0);
    for (const button of container.querySelectorAll("button")) {
      expect(button).toHaveAccessibleName();
    }
  });

  it("searches files from the Go to file combobox and opens the selected result", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              path: "src/index.ts",
              name: "index.ts",
              kind: "file",
              href: "/mona/octo-app/blob/main/src/index.ts",
              byteSize: 26,
              language: "TypeScript",
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(<RepositoryCodeOverview repository={repositoryOverview()} />);

    fireEvent.click(screen.getByRole("button", { name: "Go to file" }));
    fireEvent.change(screen.getByLabelText("Find a file"), {
      target: { value: "index" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /src\/index\.ts/ }),
      ).toHaveAttribute("href", "/mona/octo-app/blob/main/src/index.ts");
    });
  });

  it("renders quick setup for empty repositories", () => {
    render(
      <RepositoryCodeOverview
        repository={repositoryOverview({
          rootEntries: [],
          files: [],
          readme: null,
          latestCommit: null,
        })}
      />,
    );

    expect(screen.getByRole("heading", { name: "Quick setup" })).toBeVisible();
    expect(screen.getByText(/git remote add origin/)).toBeVisible();
  });

  it("hides settings when the viewer cannot administer the repository", () => {
    render(
      <RepositoryCodeOverview
        repository={repositoryOverview({ viewerPermission: "read" })}
      />,
    );

    const repositoryNav = screen.getByRole("navigation", {
      name: "Repository",
    });
    expect(
      within(repositoryNav).queryByRole("link", { name: "Settings" }),
    ).toBeNull();
  });

  it("optimistically toggles the star control through a same-origin route", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = String(input);
        expect(url).toBe("/mona/octo-app/actions/star");
        expect(init?.method).toBe("PUT");
        return new Response(
          JSON.stringify({
            starred: true,
            watching: false,
            starsCount: 4,
            watchersCount: 2,
            forksCount: 1,
            forkedRepositoryHref: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      });

    render(<RepositoryCodeOverview repository={repositoryOverview()} />);

    fireEvent.click(screen.getByRole("button", { name: /Star/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Unstar/ })).toHaveTextContent(
        "4",
      );
    });

    expect(fetchMock).toHaveBeenCalledWith("/mona/octo-app/actions/star", {
      method: "PUT",
    });
  });

  it("optimistically toggles the watch control through a same-origin route", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = String(input);
        expect(url).toBe("/mona/octo-app/actions/watch");
        expect(init?.method).toBe("PUT");
        return new Response(
          JSON.stringify({
            starred: false,
            watching: true,
            starsCount: 3,
            watchersCount: 3,
            forksCount: 1,
            forkedRepositoryHref: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      });

    render(<RepositoryCodeOverview repository={repositoryOverview()} />);

    fireEvent.click(screen.getByRole("button", { name: /Watch/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Unwatch/ })).toHaveTextContent(
        "3",
      );
    });

    expect(fetchMock).toHaveBeenCalledWith("/mona/octo-app/actions/watch", {
      method: "PUT",
    });
  });

  it("rolls back optimistic state and shows feedback when an action fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "forbidden" }, status: 403 }),
        {
          status: 403,
        },
      ),
    );

    render(<RepositoryCodeOverview repository={repositoryOverview()} />);
    fireEvent.click(screen.getByRole("button", { name: /Star/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Star/ })).toBeVisible();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Repository action could not be saved.",
      );
    });
  });

  it("renders nested tree navigation with breadcrumbs and history links", () => {
    render(<RepositoryTreeView overview={pathOverview()} />);

    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Parent directory" }),
    ).toHaveAttribute("href", "/mona/octo-app/tree/main");
    expect(screen.getByRole("link", { name: /index\.ts/ })).toHaveAttribute(
      "href",
      "/mona/octo-app/blob/main/src/index.ts",
    );
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute(
      "href",
      "/mona/octo-app/commits/main/src",
    );
    expect(screen.getByText("# src docs")).toBeVisible();
  });

  it("renders blob previews with raw, download, parent, and history actions", () => {
    render(<RepositoryBlobViewPage blob={blobView()} />);

    expect(screen.getByRole("heading", { name: "src/index.ts" })).toBeVisible();
    expect(screen.getByText("export const answer = 42;")).toBeVisible();
    expect(screen.getByRole("link", { name: "Parent" })).toHaveAttribute(
      "href",
      "/mona/octo-app/tree/main/src",
    );
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute(
      "href",
      "/mona/octo-app/commits/main/src/index.ts",
    );
    expect(screen.getByRole("link", { name: "Raw" })).toHaveAttribute(
      "href",
      "/mona/octo-app/src/index.ts?raw=1",
    );
  });

  it("renders commit history rows with commit destinations", () => {
    render(
      <RepositoryCommitHistoryView
        history={{
          items: [
            {
              oid: "abcdef1234567890",
              shortOid: "abcdef1",
              message: "Initial commit",
              href: "/mona/octo-app/commit/abcdef1234567890",
              committedAt: "2026-04-30T00:00:00Z",
              authorLogin: "mona",
            },
          ],
          total: 1,
          page: 1,
          pageSize: 30,
        }}
        owner="mona"
        path="src/index.ts"
        refName="main"
        repo="octo-app"
      />,
    );

    expect(
      screen.getByRole("link", { name: /Initial commit/ }),
    ).toHaveAttribute("href", "/mona/octo-app/commit/abcdef1234567890");
    expect(screen.getByText("abcdef1")).toBeVisible();
  });
});
