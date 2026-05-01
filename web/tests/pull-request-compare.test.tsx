import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PullRequestComparePage } from "@/components/PullRequestComparePage";
import type {
  PullRequestCompareView,
  RepositoryOverview,
  RepositoryRefSummary,
} from "@/lib/api";
import {
  parseRepositoryCompareRange,
  repositoryCompareRangeHref,
  repositoryCompareSwapHref,
  repositoryCompareViewHref,
} from "@/lib/navigation";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function repositoryOverview(
  overrides: Partial<RepositoryOverview> = {},
): RepositoryOverview {
  const base: RepositoryOverview = {
    id: "repo-1",
    owner_user_id: "user-1",
    owner_organization_id: null,
    owner_login: "mona",
    name: "octo-app",
    description: "Compare test repository",
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
    latestCommit: null,
    rootEntries: [],
    files: [],
    readme: null,
    sidebar: {
      about: null,
      websiteUrl: null,
      topics: [],
      starsCount: 0,
      watchersCount: 0,
      forksCount: 0,
      releasesCount: 0,
      deploymentsCount: 0,
      contributorsCount: 1,
      languages: [],
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

function refSummary(
  shortName: string,
  overrides: Partial<RepositoryRefSummary> = {},
): RepositoryRefSummary {
  const kind = overrides.kind ?? "branch";
  return {
    name: kind === "tag" ? `refs/tags/${shortName}` : `refs/heads/${shortName}`,
    shortName,
    kind,
    href: `/mona/octo-app/tree/${encodeURIComponent(shortName)}`,
    samePathHref: `/mona/octo-app/tree/${encodeURIComponent(shortName)}`,
    active: shortName === "main",
    targetShortOid: "abc1234",
    updatedAt: "2026-04-30T00:00:00Z",
    ...overrides,
  };
}

function compareView(
  overrides: Partial<PullRequestCompareView> = {},
): PullRequestCompareView {
  const base: PullRequestCompareView = {
    repository: {
      id: "repo-1",
      ownerLogin: "mona",
      name: "octo-app",
      visibility: "public",
      defaultBranch: "main",
    },
    viewerPermission: "owner",
    base: {
      name: "refs/heads/main",
      shortName: "main",
      kind: "branch",
      oid: "baseoid",
      commitId: "commit-base",
      href: "/mona/octo-app/tree/main",
    },
    head: {
      name: "refs/heads/feature/compare",
      shortName: "feature/compare",
      kind: "branch",
      oid: "headoid",
      commitId: "commit-head",
      href: "/mona/octo-app/tree/feature%2Fcompare",
    },
    status: "ahead",
    aheadBy: 1,
    behindBy: 0,
    totalCommits: 1,
    totalFiles: 2,
    commits: [
      {
        id: "commit-head",
        oid: "headoid",
        shortOid: "headoid",
        message: "Add compare feature",
        authorLogin: "mona",
        committedAt: "2026-04-30T01:00:00Z",
        href: "/mona/octo-app/commit/headoid",
      },
    ],
    files: [
      {
        path: "README.md",
        status: "modified",
        additions: 2,
        deletions: 1,
        byteSize: 20,
        blobOid: "blob-readme",
        href: "/mona/octo-app/blob/feature%2Fcompare/README.md",
      },
      {
        path: "src/lib.rs",
        status: "added",
        additions: 1,
        deletions: 0,
        byteSize: 22,
        blobOid: "blob-lib",
        href: "/mona/octo-app/blob/feature%2Fcompare/src/lib.rs",
      },
    ],
    additions: 3,
    deletions: 1,
    defaultBranchHref: "/mona/octo-app/compare/main...main",
    pullListHref: "/mona/octo-app/pulls",
    compareHref: "/mona/octo-app/compare/main...feature%2Fcompare",
    swapHref: "/mona/octo-app/compare/feature%2Fcompare...main",
    createOptions: {
      templates: [
        {
          slug: "default",
          name: "Default",
          body: "## Summary\n\nCloses #1",
        },
      ],
      labels: [
        {
          id: "label-1",
          name: "bug",
          color: "b60205",
          description: "Something is broken",
        },
      ],
      users: [
        {
          id: "user-2",
          login: "reviewer",
          displayName: "Reviewer",
          avatarUrl: null,
        },
      ],
      milestones: [
        {
          id: "milestone-1",
          title: "MVP",
          state: "open",
        },
      ],
    },
  };
  return { ...base, ...overrides };
}

describe("PullRequestComparePage", () => {
  it("renders compare selectors, diff summary, files, commits, and concrete links", () => {
    render(
      <PullRequestComparePage
        compare={compareView()}
        refs={[refSummary("main"), refSummary("feature/compare")]}
        repository={repositoryOverview()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Comparing changes" }),
    ).toBeVisible();
    expect(screen.getByText("Ready for review")).toBeVisible();
    expect(screen.getByText(/ahead/)).toHaveTextContent("1 ahead · 0 behind");
    expect(screen.getByText("README.md")).toBeVisible();
    expect(screen.getByText("src/lib.rs")).toBeVisible();
    expect(screen.getByText("Add compare feature")).toBeVisible();

    expect(
      screen.getByRole("link", { name: "Swap base and compare refs" }),
    ).toHaveAttribute(
      "href",
      "/mona/octo-app/compare/feature%2Fcompare...main",
    );
    expect(screen.getByRole("link", { name: "Unified" })).toHaveAttribute(
      "href",
      "/mona/octo-app/compare/main...feature%2Fcompare?view=unified",
    );
    expect(screen.getByRole("link", { name: "Split" })).toHaveAttribute(
      "href",
      "/mona/octo-app/compare/main...feature%2Fcompare",
    );

    expect(
      document.querySelectorAll('a[href="#"], a:not([href])'),
    ).toHaveLength(0);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAccessibleName(/.+/);
    }
  });

  it("updates compare URLs from branch selector options", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          items: [refSummary("main"), refSummary("feature/compare")],
          total: 2,
          page: 1,
          pageSize: 100,
        }),
      })),
    );

    render(
      <PullRequestComparePage
        compare={compareView()}
        refs={[refSummary("main"), refSummary("feature/compare")]}
        repository={repositoryOverview()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Choose compare ref. Current ref feature/compare",
      }),
    );
    const picker = screen.getByRole("button", {
      name: "Choose compare ref. Current ref feature/compare",
    }).parentElement;
    expect(picker).not.toBeNull();
    expect(
      within(picker as HTMLElement).getByRole("link", {
        name: /main/,
      }),
    ).toHaveAttribute("href", "/mona/octo-app/compare/main...main");

    vi.unstubAllGlobals();
  });

  it("renders no-diff and invalid-ref recovery states", () => {
    const { rerender } = render(
      <PullRequestComparePage
        compare={compareView({
          status: "same_ref",
          head: compareView().base,
          aheadBy: 0,
          totalCommits: 0,
          totalFiles: 0,
          commits: [],
          files: [],
          additions: 0,
          deletions: 0,
        })}
        refs={[refSummary("main")]}
        repository={repositoryOverview()}
      />,
    );

    expect(
      screen.getAllByText("There isn't anything to compare")[0],
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Back to pull requests" }),
    ).toHaveAttribute("href", "/mona/octo-app/pulls");

    rerender(
      <PullRequestComparePage
        compare={null}
        error={{
          error: {
            code: "validation_failed",
            message: "comparison ref was not found",
          },
          status: 422,
        }}
        refs={[refSummary("main")]}
        repository={repositoryOverview()}
        requestedRange={{ base: "main", head: "missing" }}
      />,
    );

    expect(screen.getByText("Comparison unavailable")).toBeVisible();
    expect(screen.getByText("comparison ref was not found")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Open default comparison" }),
    ).toHaveAttribute("href", "/mona/octo-app/compare/main...main");
  });

  it("submits the create form with template body, draft state, and metadata", async () => {
    pushMock.mockClear();
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url === "/mona/octo-app/pulls/create") {
        return {
          ok: true,
          json: async () => ({ href: "/mona/octo-app/pull/42" }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          contentSha: "preview",
          html: "<p>preview</p>",
          cached: false,
        }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PullRequestComparePage
        compare={compareView()}
        refs={[refSummary("main"), refSummary("feature/compare")]}
        repository={repositoryOverview()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Create pull request" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Template")).toHaveValue("default");
    expect(screen.getByLabelText("Markdown source")).toHaveValue(
      "## Summary\n\nCloses #1",
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Open compare form" },
    });
    fireEvent.click(screen.getByLabelText("Mark as draft"));
    const reviewerCheckboxes = screen.getAllByLabelText(/reviewer/);
    fireEvent.click(reviewerCheckboxes[0]);
    fireEvent.click(reviewerCheckboxes[1]);
    fireEvent.click(screen.getByLabelText(/bug/));
    fireEvent.change(screen.getByLabelText("Milestone"), {
      target: { value: "milestone-1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create pull request" }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/mona/octo-app/pulls/create",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"title":"Open compare form"'),
        }),
      ),
    );
    const [, init] = fetchMock.mock.calls.find(
      ([url]) => url === "/mona/octo-app/pulls/create",
    ) as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      title: "Open compare form",
      body: "## Summary\n\nCloses #1",
      baseRef: "main",
      headRef: "feature/compare",
      isDraft: true,
      templateSlug: "default",
      labelIds: ["label-1"],
      assigneeUserIds: ["user-2"],
      reviewerUserIds: ["user-2"],
      milestoneId: "milestone-1",
    });
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/mona/octo-app/pull/42"),
    );

    vi.unstubAllGlobals();
  });
});

describe("compare navigation helpers", () => {
  it("parses and builds compare URLs with slash-containing refs", () => {
    expect(parseRepositoryCompareRange(["main...feature", "compare"])).toEqual({
      base: "main",
      head: "feature/compare",
    });
    expect(
      repositoryCompareRangeHref("mona", "octo-app", "main", "feature/compare"),
    ).toBe("/mona/octo-app/compare/main...feature%2Fcompare");
    expect(
      repositoryCompareSwapHref("mona", "octo-app", "main", "feature/compare"),
    ).toBe("/mona/octo-app/compare/feature%2Fcompare...main");
    expect(
      repositoryCompareViewHref(
        "mona",
        "octo-app",
        "main",
        "feature/compare",
        "unified",
      ),
    ).toBe("/mona/octo-app/compare/main...feature%2Fcompare?view=unified");
  });
});
