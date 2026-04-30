import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/components/AppShell";
import type { AppShellContext, AuthSession } from "@/lib/api";
import { isProtectedPath } from "@/lib/protected-routes";

const user = {
  id: "user-1",
  email: "mona@example.com",
  display_name: "Mona Lisa",
  avatar_url: null,
};

const session: AuthSession = {
  authenticated: true,
  user,
};

const shellContext: AppShellContext = {
  user,
  unreadNotificationCount: 7,
  recentRepositories: [
    {
      id: "repo-1",
      ownerLogin: "mona",
      name: "editorial",
      visibility: "private",
      href: "/mona/editorial",
      updatedAt: "2026-05-01T00:00:00Z",
      lastVisitedAt: null,
    },
  ],
  organizations: [
    {
      id: "org-1",
      slug: "namuh",
      displayName: "Namuh",
      role: "owner",
      href: "/namuh",
    },
  ],
  teams: [
    {
      id: "team-1",
      organizationId: "org-1",
      organizationSlug: "namuh",
      slug: "platform",
      name: "Platform",
      role: "maintainer",
      href: "/orgs/namuh/teams/platform",
    },
  ],
  quickLinks: [],
};

function renderShell() {
  render(
    <AppShell session={session} shellContext={shellContext}>
      <p>Signed-in content</p>
    </AppShell>,
  );
}

describe("AppShell desktop header", () => {
  it("renders working global navigation, notifications, and search controls", () => {
    renderShell();

    expect(screen.getByRole("banner")).toHaveClass("app-shell-header");
    expect(
      screen.getByRole("link", { name: "opengithub dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Pull requests" })).toHaveAttribute(
      "href",
      "/pulls",
    );
    expect(screen.getByRole("link", { name: "Issues" })).toHaveAttribute(
      "href",
      "/issues",
    );
    expect(
      screen.getByRole("link", { name: "7 unread notifications" }),
    ).toHaveAttribute("href", "/notifications");

    const search = screen.getByRole("search");
    expect(search).toHaveAttribute("action", "/search");
    expect(
      screen.getByRole("searchbox", { name: "Search or jump to" }),
    ).toHaveAttribute("name", "q");
  });

  it("opens the global menu with recent repositories, teams, and real links", () => {
    const { container } = render(
      <AppShell session={session} shellContext={shellContext}>
        <p>Signed-in content</p>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Global menu" }));

    expect(screen.getByRole("button", { name: "Global menu" })).toHaveClass(
      "app-shell-icon-button",
    );
    expect(screen.getByRole("menuitem", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(
      screen.getByRole("menuitem", { name: "mona/editorial" }),
    ).toHaveAttribute("href", "/mona/editorial");
    expect(screen.getByRole("menuitem", { name: "Namuh" })).toHaveAttribute(
      "href",
      "/namuh",
    );
    expect(
      screen.getByRole("menuitem", { name: "namuh/Platform" }),
    ).toHaveAttribute("href", "/orgs/namuh/teams/platform");
    expect(screen.getByRole("menu")).toHaveClass("app-shell-menu");
    expect(
      container.querySelectorAll('a[href="#"], a:not([href])'),
    ).toHaveLength(0);
  });

  it("renders the mobile drawer with recent repositories and closes from Escape", () => {
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Global menu" }));

    expect(screen.getByRole("dialog", { name: "Global menu" })).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Global menu" })).toHaveClass(
      "app-shell-drawer",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(
      screen.getByRole("link", { name: /mona\/editorial/ }),
    ).toHaveAttribute("href", "/mona/editorial");
    expect(
      screen.getByRole("link", { name: /namuh\/Platform/ }),
    ).toHaveAttribute("href", "/orgs/namuh/teams/platform");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Global menu" }),
    ).not.toBeInTheDocument();
  });

  it("opens create and avatar menus with concrete actions", () => {
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Create new" }));
    expect(
      screen.getByRole("menuitem", { name: "New repository" }),
    ).toHaveAttribute("href", "/new");
    expect(
      screen.getByRole("menuitem", { name: "Import repository" }),
    ).toHaveAttribute("href", "/new/import");

    fireEvent.click(screen.getByRole("button", { name: "Open user menu" }));
    expect(
      screen.getByRole("menuitem", { name: "Your profile" }),
    ).toHaveAttribute("href", "/settings/profile");
    expect(
      screen.getByRole("menuitem", { name: "Developer settings" }),
    ).toHaveAttribute("href", "/settings/tokens");
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toHaveAttribute(
      "href",
      "/logout",
    );
  });

  it("protects every signed-in header destination", () => {
    for (const path of [
      "/issues",
      "/pulls",
      "/notifications",
      "/search",
      "/explore",
      "/settings/profile",
    ]) {
      expect(isProtectedPath(path)).toBe(true);
    }
  });
});
