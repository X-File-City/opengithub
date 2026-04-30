import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardOnboarding } from "@/components/DashboardOnboarding";
import type { DashboardSummary, RepositorySummary } from "@/lib/api";

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

function dashboardSummary(
  repositories: RepositorySummary[] = [],
): DashboardSummary {
  return {
    user,
    repositories: {
      items: repositories,
      total: repositories.length,
      page: 1,
      pageSize: 30,
    },
    hasRepositories: repositories.length > 0,
    recentActivity: [],
    assignedIssues: [],
    reviewRequests: [],
    dismissedHints: [],
  };
}

describe("dashboard onboarding", () => {
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

    expect(
      screen.getByRole("link", { name: "Create repository" }),
    ).toHaveAttribute("href", "/new");
    expect(
      screen.getByRole("link", { name: "Import repository" }),
    ).toHaveAttribute("href", "/new/import");
    expect(
      screen.getByRole("link", { name: "Read setup guide" }),
    ).toHaveAttribute("href", "/docs/get-started");
    expect(screen.getByRole("link", { name: "New" })).toHaveAttribute(
      "href",
      "/new",
    );
  });

  it("does not leave inert links or placeholder buttons in the empty state", () => {
    const { container } = render(
      <DashboardOnboarding summary={dashboardSummary()} />,
    );

    const hrefs = [...container.querySelectorAll("a")].map((link) =>
      link.getAttribute("href"),
    );
    expect(hrefs).not.toContain("#");
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("renders repository rows and removes first-run welcome copy when repositories exist", () => {
    render(<DashboardOnboarding summary={dashboardSummary([repository()])} />);

    expect(
      screen.queryByRole("heading", { name: "Start building on opengithub" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /mona\/octo-app/i }),
    ).toHaveAttribute("href", "/mona/octo-app");
    expect(screen.getByText("Recent activity")).toBeInTheDocument();
  });
});
