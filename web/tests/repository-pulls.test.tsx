import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RepositoryPullsPage } from "@/components/RepositoryPullsPage";
import type {
  PullRequestListItem,
  PullRequestListView,
  RepositoryOverview,
} from "@/lib/api";
import {
  repositoryPullRequestCompareHref,
  repositoryPullRequestDetailHref,
  repositoryPullRequestPageHref,
  repositoryPullRequestStateHref,
  repositoryPullRequestsHref,
} from "@/lib/navigation";

function repositoryOverview(
  overrides: Partial<RepositoryOverview> = {},
): RepositoryOverview {
  const base: RepositoryOverview = {
    id: "repo-1",
    owner_user_id: "user-1",
    owner_organization_id: null,
    owner_login: "mona",
    name: "octo-app",
    description: "Pull request test repository",
    visibility: "public",
    default_branch: "main",
    is_archived: false,
    created_by_user_id: "user-1",
    created_at: "2026-04-30T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
    viewerPermission: "owner",
    branchCount: 2,
    tagCount: 0,
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
      contributorsCount: 2,
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

function pullRequestItem(
  overrides: Partial<PullRequestListItem> = {},
): PullRequestListItem {
  const base: PullRequestListItem = {
    id: "pull-1",
    repositoryId: "repo-1",
    repositoryOwner: "mona",
    repositoryName: "octo-app",
    number: 17,
    title: "Add signed-in dashboard feed",
    body: "Ready for review",
    state: "open",
    isDraft: false,
    author: {
      id: "user-2",
      login: "hubot",
      displayName: "Hubot",
      avatarUrl: null,
    },
    authorRole: "write",
    labels: [
      {
        id: "label-1",
        name: "review",
        color: "var(--accent)",
        description: "Needs review",
      },
    ],
    milestone: null,
    commentCount: 4,
    linkedIssues: [
      {
        number: 12,
        state: "open",
        title: "Track dashboard work",
        href: "/mona/octo-app/issues/12",
      },
    ],
    review: {
      state: "approved",
      required: true,
      requestedReviewers: [],
      reviewerCount: 1,
    },
    checks: {
      status: "completed",
      conclusion: "success",
      totalCount: 3,
      completedCount: 3,
      failedCount: 0,
    },
    taskProgress: {
      completed: 2,
      total: 5,
    },
    headRef: "dashboard-feed",
    baseRef: "main",
    href: "/mona/octo-app/pull/17",
    checksHref: "/mona/octo-app/pull/17/checks",
    reviewsHref: "/mona/octo-app/pull/17#reviews",
    commentsHref: "/mona/octo-app/pull/17#comments",
    linkedIssuesHref: "/mona/octo-app/pull/17#linked-issues",
    createdAt: "2026-04-30T00:00:00Z",
    updatedAt: "2026-04-30T01:00:00Z",
    closedAt: null,
    mergedAt: null,
  };
  return { ...base, ...overrides };
}

function pullRequestListView(
  overrides: Partial<PullRequestListView> = {},
): PullRequestListView {
  const items = overrides.items ?? [pullRequestItem()];
  const base: PullRequestListView = {
    items,
    total: items.length,
    page: 1,
    pageSize: 30,
    openCount: items.filter((item) => item.state === "open").length,
    closedCount: items.filter((item) => item.state === "closed").length,
    mergedCount: items.filter((item) => item.state === "merged").length,
    counts: {
      open: items.filter((item) => item.state === "open").length,
      closed: items.filter((item) => item.state === "closed").length,
      merged: items.filter((item) => item.state === "merged").length,
    },
    filters: {
      query: "is:pr is:open",
      state: "open",
      labels: [],
      milestone: null,
      review: null,
      checks: null,
      sort: "updated-desc",
    },
    filterOptions: {
      labels: [],
      milestones: [],
      reviewStates: [],
      checkStates: [],
      sortOptions: [],
    },
    viewerPermission: "owner",
    repository: {
      id: "repo-1",
      ownerLogin: "mona",
      name: "octo-app",
      visibility: "public",
      defaultBranch: "main",
    },
    preferences: {
      dismissedContributorBanner: false,
      dismissedContributorBannerAt: null,
    },
  };
  return { ...base, ...overrides };
}

describe("RepositoryPullsPage", () => {
  it("renders the default open pull request list with real row metadata", () => {
    render(
      <RepositoryPullsPage
        pulls={pullRequestListView()}
        query={{ q: "is:pr is:open", state: "open" }}
        repository={repositoryOverview()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Pull requests" }),
    ).toBeVisible();
    expect(screen.getByLabelText("pull-query")).toHaveValue("is:pr is:open");
    for (const link of screen.getAllByRole("link", {
      name: "New pull request",
    })) {
      expect(link).toHaveAttribute("href", "/mona/octo-app/compare");
    }
    expect(screen.getByRole("link", { name: /Open/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const row = screen.getByRole("article");
    expect(
      within(row).getByRole("link", { name: "Add signed-in dashboard feed" }),
    ).toHaveAttribute("href", "/mona/octo-app/pull/17");
    expect(within(row).getByText("#17")).toBeVisible();
    expect(within(row).getByText("dashboard-feed")).toBeVisible();
    expect(within(row).getByText("main")).toBeVisible();
    expect(within(row).getByText("write")).toBeVisible();
    expect(
      within(row).getByRole("link", { name: "3 passing" }),
    ).toHaveAttribute("href", "/mona/octo-app/pull/17/checks");
    expect(within(row).getByRole("link", { name: "Approved" })).toHaveAttribute(
      "href",
      "/mona/octo-app/pull/17#reviews",
    );
    expect(within(row).getByRole("link", { name: "1 linked" })).toHaveAttribute(
      "href",
      "/mona/octo-app/pull/17#linked-issues",
    );
    expect(within(row).getByText("2/5 tasks")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Clear query" })).toBeNull();
  });

  it("renders empty state and concrete controls without inert links", () => {
    render(
      <RepositoryPullsPage
        pulls={pullRequestListView({ items: [], total: 0 })}
        query={{ q: "is:pr is:open missing", state: "open" }}
        repository={repositoryOverview()}
      />,
    );

    expect(
      screen.getByText("No pull requests matched this query"),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Clear query" })).toHaveAttribute(
      "href",
      "/mona/octo-app/pulls?q=is%3Apr+is%3Aopen&state=open",
    );
    for (const link of screen.getAllByRole("link", {
      name: "New pull request",
    })) {
      expect(link).toHaveAttribute("href", "/mona/octo-app/compare");
    }
    expect(
      document.querySelectorAll('a[href="#"], a:not([href])'),
    ).toHaveLength(0);
  });

  it("builds pull request list navigation hrefs", () => {
    expect(repositoryPullRequestsHref("mona", "octo-app")).toBe(
      "/mona/octo-app/pulls",
    );
    expect(
      repositoryPullRequestStateHref(
        "mona",
        "octo-app",
        { q: "is:pr is:open label:review", labels: ["review"] },
        "closed",
      ),
    ).toBe(
      "/mona/octo-app/pulls?q=is%3Apr+label%3Areview+state%3Aclosed&state=closed&labels=review",
    );
    expect(
      repositoryPullRequestPageHref(
        "mona",
        "octo-app",
        { q: "is:pr is:open", state: "open" },
        2,
      ),
    ).toBe("/mona/octo-app/pulls?q=is%3Apr+is%3Aopen&state=open&page=2");
    expect(repositoryPullRequestDetailHref("mona", "octo-app", 17)).toBe(
      "/mona/octo-app/pull/17",
    );
    expect(repositoryPullRequestCompareHref("mona", "octo-app")).toBe(
      "/mona/octo-app/compare",
    );
  });
});
