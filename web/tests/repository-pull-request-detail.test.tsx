import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RepositoryPullRequestDetailPage } from "@/components/RepositoryPullRequestDetailPage";
import type { PullRequestDetailView, RepositoryOverview } from "@/lib/api";

function repositoryOverview(): RepositoryOverview {
  return {
    id: "repo-1",
    owner_user_id: "user-1",
    owner_organization_id: null,
    owner_login: "mona",
    name: "octo-app",
    description: "Pull request detail test repository",
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
}

function pullRequestDetail(
  overrides: Partial<PullRequestDetailView> = {},
): PullRequestDetailView {
  const base: PullRequestDetailView = {
    id: "pull-1",
    issueId: "issue-1",
    repository: {
      id: "repo-1",
      ownerLogin: "mona",
      name: "octo-app",
      visibility: "public",
      defaultBranch: "main",
    },
    number: 42,
    title: "Split repository routes",
    body: "Routes are split by resource.",
    bodyHtml: "<p>Routes are split by resource.</p>",
    state: "open",
    isDraft: false,
    author: {
      id: "user-2",
      login: "hubot",
      displayName: "Hubot",
      avatarUrl: null,
    },
    authorRole: "owner",
    headRef: "hubot/split-routes",
    baseRef: "main",
    labels: [
      {
        id: "label-1",
        name: "review",
        color: "var(--accent)",
        description: "Needs review",
      },
    ],
    milestone: { id: "mile-1", title: "Review queue", state: "open" },
    assignees: [
      {
        id: "user-3",
        login: "mira",
        displayName: "Mira",
        avatarUrl: null,
      },
    ],
    requestedReviewers: [],
    latestReviews: [
      {
        reviewer: {
          id: "user-4",
          login: "ashley",
          displayName: "Ashley",
          avatarUrl: null,
        },
        state: "approved",
        submittedAt: "2026-05-01T00:05:00Z",
      },
    ],
    linkedIssues: [
      {
        number: 12,
        state: "open",
        title: "Track route work",
        href: "/mona/octo-app/issues/12",
      },
    ],
    participants: [
      {
        id: "user-2",
        login: "hubot",
        displayName: "Hubot",
        avatarUrl: null,
      },
      {
        id: "user-4",
        login: "ashley",
        displayName: "Ashley",
        avatarUrl: null,
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
      totalCount: 4,
      completedCount: 4,
      failedCount: 0,
    },
    taskProgress: { completed: 2, total: 3 },
    stats: {
      commits: 8,
      files: 6,
      additions: 120,
      deletions: 32,
      comments: 3,
    },
    subscription: { subscribed: true, reason: "participating" },
    metadataOptions: { labels: [], assignees: [], milestones: [] },
    href: "/mona/octo-app/pull/42",
    commitsHref: "/mona/octo-app/pull/42/commits",
    checksHref: "/mona/octo-app/pull/42/checks",
    filesHref: "/mona/octo-app/pull/42/files",
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:10:00Z",
    closedAt: null,
    mergedAt: null,
    viewerPermission: "owner",
  };
  return { ...base, ...overrides };
}

describe("RepositoryPullRequestDetailPage", () => {
  it("renders the pull request conversation shell and sidebar metadata", () => {
    render(
      <RepositoryPullRequestDetailPage
        pullRequest={pullRequestDetail()}
        repository={repositoryOverview()}
        viewerAuthenticated={true}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /Split repository routes/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText(/wants to merge/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Files changed/ })).toHaveAttribute(
      "href",
      "/mona/octo-app/pull/42/files",
    );
    expect(screen.getByText("Routes are split by resource.")).toBeVisible();
    expect(screen.getByText("ashley")).toBeVisible();
    expect(screen.getByText("mira")).toBeVisible();
    expect(screen.getByText("Review queue")).toBeVisible();
    expect(screen.getByRole("link", { name: "#12 · open" })).toHaveAttribute(
      "href",
      "/mona/octo-app/issues/12",
    );
  });

  it("shows a concrete sign-in CTA for anonymous public readers", () => {
    render(
      <RepositoryPullRequestDetailPage
        pullRequest={pullRequestDetail()}
        repository={repositoryOverview()}
        viewerAuthenticated={false}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Sign in to participate" }),
    ).toHaveAttribute("href", "/login?next=%2Fmona%2Focto-app%2Fpull%2F42");
  });
});
