import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as dismissHintRoute } from "@/app/dashboard/onboarding/hints/[hintKey]/route";
import { DashboardOnboarding } from "@/components/DashboardOnboarding";
import type {
  DashboardActivityItem,
  DashboardHintDismissal,
  DashboardIssueSummary,
  DashboardReviewRequest,
  DashboardSummary,
  DashboardTopRepository,
  RepositorySummary,
} from "@/lib/api";

const user = {
  id: "user-1",
  email: "mona@example.com",
  display_name: "Mona",
  avatar_url: null,
};

function repository(overrides: Partial<RepositorySummary> = {}) {
  return {
    id: "repo-1",
    owner_user_id: "user-1",
    owner_organization_id: null,
    owner_login: "mona",
    name: "octo-app",
    description: "Repository collaboration workspace",
    visibility: "public",
    default_branch: "main",
    is_archived: false,
    created_by_user_id: "user-1",
    created_at: "2026-04-30T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
    ...overrides,
  } satisfies RepositorySummary;
}

function topRepository(
  overrides: Partial<DashboardTopRepository> = {},
): DashboardTopRepository {
  return {
    ownerLogin: "mona",
    name: "octo-app",
    visibility: "public",
    primaryLanguage: "TypeScript",
    primaryLanguageColor: "#3178c6",
    updatedAt: "2026-04-30T00:00:00Z",
    lastVisitedAt: null,
    href: "/mona/octo-app",
    ...overrides,
  };
}

function dismissedHint(hintKey: string): DashboardHintDismissal {
  return {
    id: `dismissal-${hintKey}`,
    userId: "user-1",
    hintKey,
    dismissedAt: "2026-04-30T00:00:00Z",
  };
}

function activity(
  overrides: Partial<DashboardActivityItem> = {},
): DashboardActivityItem {
  return {
    id: "activity-1",
    kind: "issue",
    title: "Triage repository import failures",
    number: 7,
    state: "open",
    repositoryName: "mona/octo-app",
    repositoryHref: "/mona/octo-app",
    href: "/mona/octo-app/issues/7",
    occurredAt: "2026-04-30T12:30:00Z",
    description: "Issue #7 is open",
    actorLogin: "mona",
    actorAvatarUrl: null,
    ...overrides,
  };
}

function assignedIssue(
  overrides: Partial<DashboardIssueSummary> = {},
): DashboardIssueSummary {
  return {
    id: "assigned-issue-1",
    title: "Fix failing setup workflow",
    repositoryName: "mona/octo-app",
    number: 11,
    href: "/mona/octo-app/issues/11",
    updatedAt: "2026-04-30T11:00:00Z",
    ...overrides,
  };
}

function reviewRequest(
  overrides: Partial<DashboardReviewRequest> = {},
): DashboardReviewRequest {
  return {
    id: "review-request-1",
    title: "Add dashboard activity feed",
    repositoryName: "mona/octo-app",
    number: 12,
    href: "/mona/octo-app/pull/12",
    updatedAt: "2026-04-30T10:00:00Z",
    ...overrides,
  };
}

function dashboardSummary({
  repositories = [],
  topRepositories,
  recentActivity = [],
  assignedIssues = [],
  reviewRequests = [],
  dismissedHints = [],
}: {
  repositories?: RepositorySummary[];
  topRepositories?: DashboardTopRepository[];
  recentActivity?: DashboardActivityItem[];
  assignedIssues?: DashboardIssueSummary[];
  reviewRequests?: DashboardReviewRequest[];
  dismissedHints?: DashboardHintDismissal[];
} = {}): DashboardSummary {
  const sidebarRepositories =
    topRepositories ??
    repositories.map((item) =>
      topRepository({
        ownerLogin: item.owner_login,
        name: item.name,
        visibility: item.visibility,
        primaryLanguage: null,
        primaryLanguageColor: null,
        updatedAt: item.updated_at,
        href: `/${item.owner_login}/${item.name}`,
      }),
    );

  return {
    user,
    repositories: {
      items: repositories,
      total: repositories.length,
      page: 1,
      pageSize: 30,
    },
    topRepositories: {
      items: sidebarRepositories,
      total: sidebarRepositories.length,
      page: 1,
      pageSize: 30,
    },
    hasRepositories: repositories.length > 0,
    recentActivity,
    assignedIssues,
    reviewRequests,
    dismissedHints,
  };
}

describe("dashboard API types", () => {
  it("keeps the sidebar top repository contract camel-cased", () => {
    const summary = dashboardSummary({
      repositories: [repository()],
      topRepositories: [
        topRepository({ lastVisitedAt: "2026-04-30T12:00:00Z" }),
      ],
    });

    expect(summary.topRepositories.items[0]).toEqual({
      ownerLogin: "mona",
      name: "octo-app",
      visibility: "public",
      primaryLanguage: "TypeScript",
      primaryLanguageColor: "#3178c6",
      updatedAt: "2026-04-30T00:00:00Z",
      lastVisitedAt: "2026-04-30T12:00:00Z",
      href: "/mona/octo-app",
    });
  });
});

describe("dashboard onboarding", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("renders the zero-repository empty state with working CTAs", () => {
    render(<DashboardOnboarding summary={dashboardSummary()} />);

    expect(
      screen.getByRole("heading", { name: "Start building on opengithub" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Find a repository")).toHaveAttribute(
      "type",
      "search",
    );
    expect(
      screen.getByText("You do not have any repositories yet."),
    ).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", {
      name: "Create repository",
    })) {
      expect(link).toHaveAttribute("href", "/new");
    }
    for (const link of screen.getAllByRole("link", {
      name: "Import repository",
    })) {
      expect(link).toHaveAttribute("href", "/new/import");
    }
    for (const link of screen.getAllByRole("link", {
      name: "Read setup guide",
    })) {
      expect(link).toHaveAttribute("href", "/docs/get-started");
    }
    expect(screen.getByRole("link", { name: "New" })).toHaveAttribute(
      "href",
      "/new",
    );
    expect(screen.getAllByRole("button", { name: "Dismiss" })).toHaveLength(3);
  });

  it("does not leave inert links or unnamed buttons in the empty state", () => {
    const { container } = render(
      <DashboardOnboarding summary={dashboardSummary()} />,
    );

    const hrefs = [...container.querySelectorAll("a")].map((link) =>
      link.getAttribute("href"),
    );
    expect(hrefs).not.toContain("#");
    for (const button of container.querySelectorAll("button")) {
      expect(button).toHaveTextContent(/dismiss/i);
    }
  });

  it("persists dismissed hints through the dashboard proxy route", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<DashboardOnboarding summary={dashboardSummary()} />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Dismiss" })[0] as HTMLElement,
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/dashboard/onboarding/hints/create-repository",
        { method: "POST" },
      ),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Hint dismissed.");
    expect(
      screen.queryByRole("heading", { name: "Create your first repository" }),
    ).not.toBeInTheDocument();
  });

  it("shows an error and keeps the hint when dismissal fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 500 })),
    );

    render(<DashboardOnboarding summary={dashboardSummary()} />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Dismiss" })[0] as HTMLElement,
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "This hint could not be dismissed. Try again.",
      ),
    );
    expect(
      screen.getByRole("heading", { name: "Create your first repository" }),
    ).toBeInTheDocument();
  });

  it("forwards hint dismissal through the Next.js route with the session cookie", async () => {
    vi.stubEnv("API_URL", "http://api.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ hintKey: "read-guide" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await dismissHintRoute(
      {
        headers: new Headers({ cookie: "__Host-session=signed" }),
      } as NextRequest,
      {
        params: Promise.resolve({ hintKey: "read-guide" }),
      },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.example.test/api/dashboard/onboarding/hints/read-guide",
      {
        method: "POST",
        headers: { cookie: "__Host-session=signed" },
        cache: "no-store",
      },
    );
    await expect(response.json()).resolves.toEqual({ hintKey: "read-guide" });
  });

  it("honors previously dismissed hints from the dashboard API", () => {
    render(
      <DashboardOnboarding
        summary={dashboardSummary({
          dismissedHints: [dismissedHint("create-repository")],
        })}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: "Create your first repository" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Import an existing project" }),
    ).toBeInTheDocument();
  });

  it("renders repository rows and removes first-run welcome copy when repositories exist", () => {
    render(
      <DashboardOnboarding
        summary={dashboardSummary({
          repositories: [repository()],
          topRepositories: [topRepository()],
        })}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: "Start building on opengithub" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /mona\/octo-app.*public/i }),
    ).toHaveAttribute("href", "/mona/octo-app");
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Updated Apr 30")).toBeInTheDocument();
    expect(screen.getByText("public")).toBeInTheDocument();
    expect(screen.getByText("Recent activity")).toBeInTheDocument();
    expect(screen.getByText("Assigned issues")).toBeInTheDocument();
    expect(screen.getByText("Review requests")).toBeInTheDocument();
  });

  it("renders recent activity empty-state actions when there are no qualifying issue or pull request updates", () => {
    render(
      <DashboardOnboarding
        summary={dashboardSummary({
          repositories: [repository()],
          topRepositories: [topRepository()],
        })}
      />,
    );

    expect(
      screen.getByText("There is no recent activity involving you."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Create repository" })[0],
    ).toHaveAttribute("href", "/new");
    expect(
      screen.getByRole("link", { name: "Explore repositories" }),
    ).toHaveAttribute("href", "/explore");
  });

  it("renders the non-empty activity feed from dashboard API rows", () => {
    render(
      <DashboardOnboarding
        summary={dashboardSummary({
          repositories: [repository()],
          topRepositories: [topRepository()],
          recentActivity: [
            activity({
              kind: "issue",
              title: "Wire dashboard feed",
              number: 9,
              href: "/mona/octo-app/issues/9",
              description: "commented on issue #9",
            }),
            activity({
              id: "activity-2",
              kind: "pull_request",
              title: "Ship dashboard rail",
              number: 12,
              href: "/mona/octo-app/pull/12",
              description: "opened pull request #12",
            }),
          ],
          assignedIssues: [assignedIssue()],
          reviewRequests: [reviewRequest()],
        })}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: "Start building on opengithub" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recent activity" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Wire dashboard feed" }),
    ).toHaveAttribute("href", "/mona/octo-app/issues/9");
    expect(screen.getByText("commented on issue #9")).toBeInTheDocument();
    expect(screen.getByText("#9")).toBeInTheDocument();
    expect(screen.getAllByText("open").length).toBeGreaterThan(0);
    expect(screen.getAllByText("mona").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Ship dashboard rail" }),
    ).toHaveAttribute("href", "/mona/octo-app/pull/12");
    expect(
      screen.getByRole("link", { name: "Fix failing setup workflow" }),
    ).toHaveAttribute("href", "/mona/octo-app/issues/11");
    expect(
      screen.getByText(/mona\/octo-app #11 .* Assigned Apr 30/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Add dashboard activity feed" }),
    ).toHaveAttribute("href", "/mona/octo-app/pull/12");
    expect(
      screen.getByText(/mona\/octo-app #12 .* Review requested Apr 30/i),
    ).toBeInTheDocument();
  });

  it("filters top repositories client-side without changing the New destination", () => {
    render(
      <DashboardOnboarding
        summary={dashboardSummary({
          repositories: [repository()],
          topRepositories: [
            topRepository({
              ownerLogin: "mona",
              name: "octo-app",
              href: "/mona/octo-app",
              primaryLanguage: "TypeScript",
              primaryLanguageColor: "#3178c6",
            }),
            topRepository({
              ownerLogin: "octo-org",
              name: "infra",
              href: "/octo-org/infra",
              visibility: "private",
              primaryLanguage: "Rust",
              primaryLanguageColor: "#dea584",
            }),
          ],
        })}
      />,
    );

    const filter = screen.getByLabelText("Find a repository");
    fireEvent.change(filter, { target: { value: "infra" } });

    expect(
      screen.queryByRole("link", { name: /mona\/octo-app.*public/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /octo-org\/infra.*private/i }),
    ).toHaveAttribute("href", "/octo-org/infra");
    expect(screen.getByText("Rust")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New" })).toHaveAttribute(
      "href",
      "/new",
    );
  });

  it("shows an empty filter result without hiding the sidebar controls", () => {
    render(
      <DashboardOnboarding
        summary={dashboardSummary({
          repositories: [repository()],
          topRepositories: [topRepository()],
        })}
      />,
    );

    fireEvent.change(screen.getByLabelText("Find a repository"), {
      target: { value: "does-not-exist" },
    });

    expect(
      screen.getByText("No repositories match your filter."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New" })).toHaveAttribute(
      "href",
      "/new",
    );
  });
});
