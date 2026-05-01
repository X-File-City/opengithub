import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RepositoryIssuesPage } from "@/components/RepositoryIssuesPage";
import type {
  IssueListItem,
  IssueListView,
  RepositoryOverview,
} from "@/lib/api";
import {
  repositoryIssueAddLabelHref,
  repositoryIssueClearFilterHref,
  repositoryIssueDetailHref,
  repositoryIssueExcludeLabelHref,
  repositoryIssueNoLabelsHref,
  repositoryIssueSortHref,
  repositoryIssueStateHref,
  repositoryIssuesHref,
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
    description: "Issue tracker test repository",
    visibility: "public",
    default_branch: "main",
    is_archived: false,
    created_by_user_id: "user-1",
    created_at: "2026-04-30T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
    viewerPermission: "owner",
    branchCount: 1,
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

function issueItem(overrides: Partial<IssueListItem> = {}): IssueListItem {
  const base: IssueListItem = {
    id: "issue-1",
    repositoryId: "repo-1",
    repositoryOwner: "mona",
    repositoryName: "octo-app",
    number: 42,
    title: "Fix `runner` queue backoff",
    body: "Investigate retry windows",
    state: "open",
    author: {
      id: "user-1",
      login: "mona",
      displayName: "Mona",
      avatarUrl: null,
    },
    labels: [
      {
        id: "label-1",
        name: "bug",
        color: "var(--err)",
        description: "Something is not working",
      },
    ],
    milestone: {
      id: "milestone-1",
      title: "MVP",
      state: "open",
    },
    assignees: [
      {
        id: "user-2",
        login: "hubot",
        displayName: "Hubot",
        avatarUrl: null,
      },
    ],
    commentCount: 3,
    linkedPullRequest: null,
    href: "/mona/octo-app/issues/42",
    locked: false,
    createdAt: "2026-04-30T00:00:00Z",
    updatedAt: "2026-04-30T01:00:00Z",
    closedAt: null,
  };
  return { ...base, ...overrides };
}

function issueListView(overrides: Partial<IssueListView> = {}): IssueListView {
  const items = overrides.items ?? [issueItem()];
  const base: IssueListView = {
    items,
    total: items.length,
    page: 1,
    pageSize: 30,
    openCount: items.filter((item) => item.state === "open").length,
    closedCount: items.filter((item) => item.state === "closed").length,
    counts: {
      open: items.filter((item) => item.state === "open").length,
      closed: items.filter((item) => item.state === "closed").length,
    },
    filters: {
      query: "is:issue state:open",
      state: "open",
      labels: [],
      excludedLabels: [],
      noLabels: false,
      milestone: null,
      assignee: null,
      sort: "updated-desc",
    },
    filterOptions: {
      labels: [
        {
          id: "label-1",
          name: "bug",
          color: "var(--err)",
          description: "Something is not working",
        },
        {
          id: "label-2",
          name: "documentation",
          color: "var(--info)",
          description: "Improvements or additions to documentation",
        },
      ],
    },
    viewerPermission: "owner",
    repository: {
      id: "repo-1",
      ownerLogin: "mona",
      name: "octo-app",
      visibility: "public",
    },
    preferences: {
      dismissedContributorBanner: false,
      dismissedContributorBannerAt: null,
    },
  };
  return { ...base, ...overrides };
}

describe("RepositoryIssuesPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the default open issue list with real row metadata", () => {
    render(
      <RepositoryIssuesPage
        issues={issueListView()}
        query={{ q: "is:issue state:open", state: "open" }}
        repository={repositoryOverview()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Issues" })).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Contributor guidance" }),
    ).toBeVisible();
    expect(screen.getByLabelText("issue-query")).toHaveValue(
      "is:issue state:open",
    );
    expect(screen.getByRole("link", { name: /New issue/ })).toHaveAttribute(
      "href",
      "/mona/octo-app/issues/new",
    );
    expect(screen.getByRole("button", { name: /Labels/ })).toBeVisible();
    expect(screen.getByRole("link", { name: /Milestones/ })).toHaveAttribute(
      "href",
      "/mona/octo-app/milestones",
    );

    const row = screen.getByRole("article");
    expect(within(row).getByRole("link", { name: /Fix/ })).toHaveAttribute(
      "href",
      "/mona/octo-app/issues/42",
    );
    expect(within(row).getByText("runner")).toBeVisible();
    expect(within(row).getByText("bug")).toHaveAttribute(
      "title",
      "Something is not working",
    );
    expect(within(row).getByText("MVP")).toBeVisible();
    expect(within(row).getByText("@hubot")).toBeVisible();
    expect(within(row).getByText("3")).toBeVisible();
    expect(within(row).getByText("#42")).toBeVisible();
  });

  it("dismisses the contributor banner through the preferences endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          dismissedContributorBanner: true,
          dismissedContributorBannerAt: "2026-05-01T00:00:00Z",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(
      <RepositoryIssuesPage
        issues={issueListView()}
        query={{ q: "is:issue state:open", state: "open" }}
        repository={repositoryOverview()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/mona/octo-app/issues/preferences",
        expect.objectContaining({
          body: JSON.stringify({ dismissedContributorBanner: true }),
          method: "PATCH",
        }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Contributor guidance" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("keeps the contributor banner visible when persistence fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 502 }),
    );

    render(
      <RepositoryIssuesPage
        issues={issueListView()}
        query={{ q: "is:issue state:open", state: "open" }}
        repository={repositoryOverview()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() =>
      expect(
        screen.getByText("This preference could not be saved. Try again."),
      ).toBeVisible(),
    );
    expect(
      screen.getByRole("region", { name: "Contributor guidance" }),
    ).toBeVisible();
  });

  it("does not render the contributor banner after dismissal persists", () => {
    render(
      <RepositoryIssuesPage
        issues={issueListView({
          preferences: {
            dismissedContributorBanner: true,
            dismissedContributorBannerAt: "2026-05-01T00:00:00Z",
          },
        })}
        query={{ q: "is:issue state:open", state: "open" }}
        repository={repositoryOverview()}
      />,
    );

    expect(
      screen.queryByRole("region", { name: "Contributor guidance" }),
    ).not.toBeInTheDocument();
  });

  it("builds issue list hrefs without inert targets", () => {
    expect(repositoryIssueDetailHref("mona", "octo-app", 7)).toBe(
      "/mona/octo-app/issues/7",
    );
    expect(
      repositoryIssuesHref("mona", "octo-app", {
        q: "is:issue state:open",
        state: "open",
        labels: ["bug"],
        page: 2,
      }),
    ).toBe(
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen&state=open&labels=bug&page=2",
    );
    expect(
      repositoryIssueStateHref(
        "mona",
        "octo-app",
        { q: "is:issue label:bug needs triage", labels: ["bug"], page: 3 },
        "closed",
      ),
    ).toBe(
      "/mona/octo-app/issues?q=is%3Aissue+label%3Abug+needs+triage+state%3Aclosed&state=closed&labels=bug",
    );
    expect(
      repositoryIssueSortHref(
        "mona",
        "octo-app",
        { q: "is:issue state:open", state: "open" },
        "created-asc",
      ),
    ).toBe(
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen&state=open&sort=created-asc",
    );
    expect(
      repositoryIssueClearFilterHref(
        "mona",
        "octo-app",
        {
          q: "is:issue state:open",
          labels: ["bug", "docs"],
          milestone: "MVP",
        },
        "labels",
        "bug",
      ),
    ).toBe(
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen&labels=docs&milestone=MVP",
    );
    expect(
      repositoryIssueAddLabelHref(
        "mona",
        "octo-app",
        { q: "is:issue state:open", state: "open", page: 3 },
        "good first issue",
      ),
    ).toBe(
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+label%3A%22good+first+issue%22&state=open&labels=good+first+issue",
    );
    expect(
      repositoryIssueExcludeLabelHref(
        "mona",
        "octo-app",
        {
          q: "is:issue state:open label:bug",
          labels: ["bug"],
          state: "open",
        },
        "bug",
      ),
    ).toBe(
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+-label%3Abug&state=open&excludedLabels=bug",
    );
    expect(
      repositoryIssueNoLabelsHref("mona", "octo-app", {
        q: "is:issue state:open label:bug -label:docs",
        labels: ["bug"],
        excludedLabels: ["docs"],
        state: "open",
      }),
    ).toBe(
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+no%3Alabel&state=open&noLabels=true",
    );
  });

  it("opens the label filter menu, focuses search, narrows options, and exposes label actions", async () => {
    render(
      <RepositoryIssuesPage
        issues={issueListView()}
        query={{ q: "is:issue state:open", state: "open" }}
        repository={repositoryOverview()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Labels/ }));
    const search = screen.getByRole("combobox", { name: "Filter labels" });
    await waitFor(() => expect(search).toHaveFocus());
    expect(screen.getByRole("dialog", { name: "Labels filter" })).toBeVisible();
    expect(screen.getByRole("option", { name: /No labels/ })).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+no%3Alabel&state=open&noLabels=true&sort=updated-desc",
    );

    fireEvent.change(search, { target: { value: "doc" } });
    expect(
      screen.getByRole("option", { name: /documentation/ }),
    ).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+label%3Adocumentation&state=open&labels=documentation&sort=updated-desc",
    );
    expect(
      screen.queryByRole("option", { name: /bug/ }),
    ).not.toBeInTheDocument();
  });

  it("renders filtered controls, closed state, and clear-query affordance", () => {
    render(
      <RepositoryIssuesPage
        issues={issueListView({
          items: [],
          total: 0,
          openCount: 4,
          closedCount: 2,
          counts: { open: 4, closed: 2 },
          filters: {
            query: "is:issue state:closed label:missing",
            state: "closed",
            labels: ["missing"],
            excludedLabels: ["wontfix"],
            noLabels: false,
            milestone: null,
            assignee: "hubot",
            sort: "created-asc",
          },
        })}
        query={{ q: "is:issue state:closed label:missing", state: "closed" }}
        repository={repositoryOverview()}
      />,
    );

    expect(screen.getByRole("link", { name: /Closed/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("No issues matched this query")).toBeVisible();
    expect(screen.getByRole("link", { name: "Oldest" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByTitle("Remove label:missing")).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aclosed&state=closed&excludedLabels=wontfix&assignee=hubot&sort=created-asc",
    );
    expect(screen.getByTitle("Remove assignee:hubot")).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aclosed+label%3Amissing&state=closed&labels=missing&excludedLabels=wontfix&sort=created-asc",
    );
    expect(screen.getByTitle("Remove -label:wontfix")).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aclosed+label%3Amissing&state=closed&labels=missing&assignee=hubot&sort=created-asc",
    );
    expect(screen.getByRole("link", { name: "Clear query" })).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen&state=open",
    );
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(
      document.querySelectorAll('a[href="#"], a:not([href])'),
    ).toHaveLength(0);
  });
});
