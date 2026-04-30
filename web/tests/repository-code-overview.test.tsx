import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RepositoryCodeOverview } from "@/components/RepositoryCodeOverview";
import type { RepositoryOverview } from "@/lib/api";

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
    files: [],
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
    cloneUrls: {
      https: "https://opengithub.namuh.co/mona/octo-app.git",
      git: "git@opengithub.namuh.co:mona/octo-app.git",
      zip: "/mona/octo-app/archive/refs/heads/main.zip",
    },
  };
  return { ...base, ...overrides };
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
    expect(screen.getByRole("link", { name: "main" })).toHaveAttribute(
      "href",
      "/mona/octo-app/tree/main",
    );
    expect(screen.getByRole("link", { name: "Go to file" })).toHaveAttribute(
      "href",
      "/mona/octo-app/find/main",
    );
    expect(screen.getByRole("link", { name: "Add file" })).toHaveAttribute(
      "href",
      "/mona/octo-app/new/main",
    );
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
});
