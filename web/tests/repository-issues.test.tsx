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
  repositoryIssueExcludeAuthorHref,
  repositoryIssueExcludeLabelHref,
  repositoryIssueNoLabelsHref,
  repositoryIssueNoMetadataHref,
  repositoryIssueSetMilestoneHref,
  repositoryIssueSetUserFilterHref,
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
      author: null,
      excludedAuthor: null,
      labels: [],
      excludedLabels: [],
      noLabels: false,
      milestone: null,
      noMilestone: false,
      assignee: null,
      noAssignee: false,
      project: null,
      issueType: null,
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
      users: [
        {
          id: "user-1",
          login: "mona",
          displayName: "Mona",
          avatarUrl: null,
        },
        {
          id: "user-2",
          login: "hubot",
          displayName: "Hubot",
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
      projects: [],
      issueTypes: [],
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
    expect(screen.getByRole("button", { name: /Milestones/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Author/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Projects/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Assignees/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Types/ })).toBeVisible();

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
        { q: "is:issue state:open sort:updated-desc", state: "open" },
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
    expect(
      repositoryIssueSetUserFilterHref(
        "mona",
        "octo-app",
        { q: "is:issue state:open", state: "open", page: 2 },
        "author",
        "mona",
      ),
    ).toBe(
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+author%3Amona&state=open&author=mona",
    );
    expect(
      repositoryIssueExcludeAuthorHref(
        "mona",
        "octo-app",
        { q: "is:issue state:open author:mona", author: "mona" },
        "hubot",
      ),
    ).toBe(
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+-author%3Ahubot&excludedAuthor=hubot",
    );
    expect(
      repositoryIssueSetMilestoneHref(
        "mona",
        "octo-app",
        { q: "is:issue state:open no:milestone", noMilestone: true },
        "Phase 3",
      ),
    ).toBe(
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+milestone%3A%22Phase+3%22&milestone=Phase+3",
    );
    expect(
      repositoryIssueNoMetadataHref(
        "mona",
        "octo-app",
        { q: "is:issue state:open assignee:hubot", assignee: "hubot" },
        "assignee",
      ),
    ).toBe(
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+no%3Aassignee&noAssignee=true",
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

  it("opens people and metadata menus with URL-backed options and honest empty states", async () => {
    render(
      <RepositoryIssuesPage
        issues={issueListView()}
        query={{ q: "is:issue state:open", state: "open" }}
        repository={repositoryOverview()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Author/ }));
    const authorSearch = screen.getByRole("combobox", {
      name: "Filter authors",
    });
    await waitFor(() => expect(authorSearch).toHaveFocus());
    expect(screen.getByRole("dialog", { name: "Author filter" })).toBeVisible();
    expect(screen.getByRole("option", { name: /mona/ })).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+author%3Amona&state=open&author=mona&sort=updated-desc",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Author filter" }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Milestones/ }));
    const milestoneSearch = screen.getByRole("combobox", {
      name: "Filter milestones",
    });
    await waitFor(() => expect(milestoneSearch).toHaveFocus());
    expect(
      screen.getByRole("option", { name: /No milestone/ }),
    ).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+no%3Amilestone&state=open&noMilestone=true&sort=updated-desc",
    );
    expect(screen.getByRole("option", { name: /MVP/ })).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+milestone%3AMVP&state=open&milestone=MVP&sort=updated-desc",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Milestones filter" }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Assignees/ }));
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Filter assignees" }),
      ).toHaveFocus(),
    );
    expect(screen.getByRole("option", { name: /No assignee/ })).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+no%3Aassignee&state=open&noAssignee=true&sort=updated-desc",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Assignees filter" }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Projects/ }));
    expect(
      screen.getByRole("option", { name: /No repository projects/ }),
    ).toHaveAttribute("aria-disabled", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Projects filter" }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Types/ }));
    expect(
      screen.getByRole("option", { name: /No issue types/ }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("opens the sort menu with checked radio choices that preserve filters", async () => {
    render(
      <RepositoryIssuesPage
        issues={issueListView({
          filters: {
            ...issueListView().filters,
            labels: ["bug"],
            sort: "comments-desc",
          },
        })}
        query={{ labels: ["bug"], q: "is:issue state:open", state: "open" }}
        repository={repositoryOverview()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Sort by/ }));
    await waitFor(() =>
      expect(screen.getByRole("menu", { name: "Sort issues" })).toBeVisible(),
    );

    expect(
      screen.getByRole("menuitemradio", { name: /Most commented/ }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("menuitemradio", { name: /Least commented/ }),
    ).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen&state=open&labels=bug&sort=comments-asc",
    );
    expect(
      screen.getByRole("menuitemradio", { name: /Best match/ }),
    ).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen&state=open&labels=bug&sort=best-match",
    );
  });

  it("keeps every issue filter menu accessible, closable, and query preserving", async () => {
    render(
      <RepositoryIssuesPage
        issues={issueListView({
          filters: {
            ...issueListView().filters,
            labels: ["bug"],
            excludedLabels: ["documentation"],
            sort: "updated-desc",
          },
        })}
        query={{
          labels: ["bug"],
          excludedLabels: ["documentation"],
          q: "is:issue state:open label:bug -label:documentation",
          state: "open",
          sort: "updated-desc",
          page: 4,
        }}
        repository={repositoryOverview()}
      />,
    );

    const labelsButton = screen.getByRole("button", { name: /Labels/ });
    expect(labelsButton).toHaveAttribute("aria-haspopup", "dialog");
    expect(labelsButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(labelsButton);
    const labelDialog = screen.getByRole("dialog", { name: "Labels filter" });
    expect(labelsButton).toHaveAttribute(
      "aria-controls",
      "issue-label-filter-dialog",
    );
    expect(labelDialog).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Filter labels" }),
    ).toHaveFocus();
    expect(screen.getByRole("listbox")).toHaveAttribute(
      "id",
      "issue-label-options",
    );
    expect(screen.getByRole("option", { name: /bug/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("option", { name: /documentation/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: /bug/ })).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+label%3Abug&state=open&labels=bug&excludedLabels=documentation&sort=updated-desc",
    );
    fireEvent.pointerDown(document.body);
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Labels filter" }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Author/ }));
    const authorSearch = screen.getByRole("combobox", {
      name: "Filter authors",
    });
    await waitFor(() => expect(authorSearch).toHaveFocus());
    expect(authorSearch).toHaveAttribute("id", "author-filter-search");
    expect(authorSearch).toHaveAttribute(
      "aria-controls",
      "author-filter-options",
    );
    fireEvent.change(authorSearch, { target: { value: "hub" } });
    expect(screen.getByRole("option", { name: /hubot/ })).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen+author%3Ahubot&state=open&author=hubot&labels=bug&excludedLabels=documentation&sort=updated-desc",
    );
    expect(
      screen.queryByRole("option", { name: /^Mona/ }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Author filter" }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Projects/ }));
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Filter projects" }),
      ).toHaveFocus(),
    );
    expect(
      screen.getByRole("option", { name: /No repository projects/ }),
    ).toHaveAttribute("aria-disabled", "true");
    fireEvent.keyDown(document, { key: "Escape" });

    fireEvent.click(screen.getByRole("button", { name: /Types/ }));
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Filter types" }),
      ).toHaveFocus(),
    );
    expect(
      screen.getByRole("option", { name: /No issue types/ }),
    ).toHaveAttribute("aria-disabled", "true");
    fireEvent.keyDown(document, { key: "Escape" });

    const sortButton = screen.getByRole("button", { name: /Sort by/ });
    fireEvent.click(sortButton);
    expect(sortButton).toHaveAttribute("aria-controls", "issue-sort-menu");
    await waitFor(() =>
      expect(
        screen.getByRole("menuitemradio", { name: /Recently updated/ }),
      ).toHaveFocus(),
    );
    expect(
      screen.getByRole("menuitemradio", { name: /Least recently updated/ }),
    ).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen&state=open&labels=bug&excludedLabels=documentation&sort=updated-asc",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("menu", { name: "Sort issues" }),
      ).not.toBeInTheDocument(),
    );

    expect(
      document.querySelectorAll('a[href="#"], a:not([href])'),
    ).toHaveLength(0);
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
            author: null,
            excludedAuthor: null,
            labels: ["missing"],
            excludedLabels: ["wontfix"],
            noLabels: false,
            milestone: null,
            noMilestone: false,
            assignee: "hubot",
            noAssignee: false,
            project: null,
            issueType: null,
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
    expect(
      screen.getByRole("button", { name: /Sort by: Oldest/ }),
    ).toBeVisible();
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

  it("preserves invalid advanced query text and keeps filter controls usable", () => {
    render(
      <RepositoryIssuesPage
        issues={issueListView({
          items: [],
          total: 0,
          filters: {
            ...issueListView().filters,
            query: "is:issue state:merged label:bug",
            labels: ["bug"],
          },
        })}
        query={{ q: "is:issue state:merged label:bug", labels: ["bug"] }}
        repository={repositoryOverview()}
        validationError={{
          error: {
            code: "validation_failed",
            message:
              "invalid issue filter: state filter must be open or closed",
          },
          status: 422,
          details: {
            field: "q",
            reason: "invalid issue filter: state filter must be open or closed",
          },
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "state filter must be open or closed",
    );
    expect(screen.getByLabelText("issue-query")).toHaveValue(
      "is:issue state:merged label:bug",
    );
    expect(
      screen.getByRole("link", { name: "Clear invalid query" }),
    ).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Aopen&state=open",
    );
    expect(screen.getByRole("button", { name: /Labels/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Author/ })).toBeVisible();
    expect(screen.getByTitle("Remove label:bug")).toHaveAttribute(
      "href",
      "/mona/octo-app/issues?q=is%3Aissue+state%3Amerged&state=open&sort=updated-desc",
    );
    expect(
      document.querySelectorAll('a[href="#"], a:not([href])'),
    ).toHaveLength(0);
  });
});
