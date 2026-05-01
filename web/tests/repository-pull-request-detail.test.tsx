import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RepositoryPullRequestDetailPage } from "@/components/RepositoryPullRequestDetailPage";
import type {
  PullRequestDetailView,
  PullRequestTimelineItem,
  RepositoryOverview,
} from "@/lib/api";

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
    metadataOptions: {
      labels: [
        {
          id: "label-1",
          name: "review",
          color: "var(--accent)",
          description: "Needs review",
        },
        {
          id: "label-2",
          name: "docs",
          color: "var(--ok)",
          description: "Documentation",
        },
      ],
      assignees: [
        {
          id: "user-3",
          login: "mira",
          displayName: "Mira",
          avatarUrl: null,
        },
        {
          id: "user-5",
          login: "jaeyun",
          displayName: "Jaeyun",
          avatarUrl: null,
        },
      ],
      milestones: [
        { id: "mile-1", title: "Review queue", state: "open" },
        { id: "mile-2", title: "Release train", state: "open" },
      ],
    },
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

function pullRequestTimeline(): PullRequestTimelineItem[] {
  return [
    {
      id: "event-opened",
      eventType: "opened",
      actor: {
        id: "user-2",
        login: "hubot",
        displayName: "Hubot",
        avatarUrl: null,
      },
      comment: null,
      metadata: {},
      createdAt: "2026-05-01T00:00:00Z",
    },
    {
      id: "event-comment-1",
      eventType: "commented",
      actor: {
        id: "user-4",
        login: "ashley",
        displayName: "Ashley",
        avatarUrl: null,
      },
      comment: {
        id: "comment-1",
        body: "Looks **ready** to review.",
        bodyHtml:
          '<div class="markdown-body"><p>Looks <strong>ready</strong> to review.</p></div>',
        isMinimized: false,
        reactions: [],
        createdAt: "2026-05-01T00:08:00Z",
        updatedAt: "2026-05-01T00:08:00Z",
      },
      metadata: { commentId: "comment-1" },
      createdAt: "2026-05-01T00:08:00Z",
    },
  ];
}

describe("RepositoryPullRequestDetailPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the pull request conversation shell and sidebar metadata", () => {
    render(
      <RepositoryPullRequestDetailPage
        pullRequest={pullRequestDetail()}
        repository={repositoryOverview()}
        timeline={pullRequestTimeline()}
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
    expect(screen.getAllByText("ashley").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("mira")).toBeVisible();
    expect(screen.getByText("Review queue")).toBeVisible();
    expect(screen.getByRole("link", { name: "#12 · open" })).toHaveAttribute(
      "href",
      "/mona/octo-app/issues/12",
    );
    expect(screen.getByText(/hubot opened this pull request/)).toBeVisible();
    expect(screen.getByText(/Looks/)).toBeVisible();
    expect(screen.getByText("ready")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Comment body" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Comment" })).toBeDisabled();
  });

  it("shows a concrete sign-in CTA for anonymous public readers", () => {
    render(
      <RepositoryPullRequestDetailPage
        pullRequest={pullRequestDetail()}
        repository={repositoryOverview()}
        timeline={pullRequestTimeline()}
        viewerAuthenticated={false}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Sign in to participate" }),
    ).toHaveAttribute("href", "/login?next=%2Fmona%2Focto-app%2Fpull%2F42");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?next=%2Fmona%2Focto-app%2Fpull%2F42",
    );
  });

  it("previews markdown and posts pull request comments", async () => {
    const createdComment: PullRequestTimelineItem = {
      id: "event-comment-2",
      eventType: "commented",
      actor: {
        id: "user-1",
        login: "mona",
        displayName: "Mona",
        avatarUrl: null,
      },
      comment: {
        id: "comment-2",
        body: "New **review** note",
        bodyHtml:
          '<div class="markdown-body"><p>New <strong>review</strong> note</p></div>',
        isMinimized: false,
        reactions: [],
        createdAt: "2026-05-01T00:12:00Z",
        updatedAt: "2026-05-01T00:12:00Z",
      },
      metadata: { commentId: "comment-2" },
      createdAt: "2026-05-01T00:12:00Z",
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/markdown/preview") {
        return {
          ok: true,
          json: async () => ({
            html: '<div class="markdown-body"><p>Preview <strong>works</strong></p></div>',
          }),
        };
      }
      if (url.endsWith("/comments")) {
        return { ok: true, json: async () => createdComment };
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <RepositoryPullRequestDetailPage
        pullRequest={pullRequestDetail()}
        repository={repositoryOverview()}
        timeline={pullRequestTimeline()}
        viewerAuthenticated={true}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Comment body" }), {
      target: { value: "New **review** note" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
    expect(await screen.findByText("Preview")).toBeVisible();
    expect(await screen.findByText("works")).toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: "Write" }));
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/mona/octo-app/pull/42/comments",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ body: "New **review** note" }),
        }),
      );
    });
    expect(await screen.findByText("Comment posted.")).toBeVisible();
    expect(
      (await screen.findAllByText("review")).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("updates reviewers, metadata, draft state, and notification subscription", async () => {
    const updatedWithReviewer = pullRequestDetail({
      requestedReviewers: [
        {
          id: "user-5",
          login: "jaeyun",
          displayName: "Jaeyun",
          avatarUrl: null,
        },
      ],
    });
    const updatedMetadata = pullRequestDetail({
      labels: [
        {
          id: "label-2",
          name: "docs",
          color: "var(--ok)",
          description: "Documentation",
        },
      ],
      assignees: [
        {
          id: "user-5",
          login: "jaeyun",
          displayName: "Jaeyun",
          avatarUrl: null,
        },
      ],
      milestone: { id: "mile-2", title: "Release train", state: "open" },
    });
    const updatedDraft = pullRequestDetail({ isDraft: true });
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/review-requests")) {
          return { ok: true, json: async () => updatedWithReviewer };
        }
        if (url.endsWith("/metadata")) {
          return { ok: true, json: async () => updatedMetadata };
        }
        if (url.endsWith("/draft")) {
          return { ok: true, json: async () => updatedDraft };
        }
        if (url.endsWith("/subscription")) {
          return {
            ok: true,
            json: async () => ({ subscribed: false, reason: "ignored" }),
          };
        }
        throw new Error(`unexpected fetch ${url} ${init?.method ?? "GET"}`);
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <RepositoryPullRequestDetailPage
        pullRequest={pullRequestDetail()}
        repository={repositoryOverview()}
        timeline={pullRequestTimeline()}
        viewerAuthenticated={true}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Request jaeyun" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/mona/octo-app/pull/42/review-requests",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ reviewerUserIds: ["user-5"] }),
        }),
      );
    });
    expect(await screen.findByText("Review requests updated.")).toBeVisible();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Assign jaeyun" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/mona/octo-app/pull/42/metadata",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            labelIds: ["label-1"],
            assigneeUserIds: ["user-3", "user-5"],
            milestoneId: "mile-1",
          }),
        }),
      );
    });
    expect(
      await screen.findByText("Pull request metadata updated."),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Convert to draft" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/mona/octo-app/pull/42/draft",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ isDraft: true }),
        }),
      );
    });
    expect(
      await screen.findByText("Pull request converted to draft."),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Unsubscribe" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/mona/octo-app/pull/42/subscription",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ subscribed: false }),
        }),
      );
    });
    expect(await screen.findByText("Unsubscribed.")).toBeVisible();
    expect(screen.getByText("Not subscribed")).toBeVisible();
  });
});
