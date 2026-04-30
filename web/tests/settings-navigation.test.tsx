import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RepositorySettingsShell } from "@/components/RepositorySettingsShell";
import {
  SettingsPlaceholderContent,
  SettingsShell,
} from "@/components/SettingsShell";
import type { AuthSession, RepositoryOverview } from "@/lib/api";
import {
  activeRepositorySettingsSection,
  activeSettingsSection,
  REPOSITORY_SETTINGS_NAV_ITEMS,
  repositorySettingsHref,
  SETTINGS_NAV_ITEMS,
} from "@/lib/navigation";
import { isProtectedPath } from "@/lib/protected-routes";

const session: AuthSession = {
  authenticated: true,
  user: {
    id: "user-1",
    email: "mona@example.com",
    display_name: "Mona Lisa",
    avatar_url: null,
  },
};

function repositoryOverview(): RepositoryOverview {
  return {
    id: "repo-1",
    owner_user_id: "user-1",
    owner_organization_id: null,
    owner_login: "mona",
    name: "octo-app",
    description: "A repository for settings navigation",
    visibility: "private",
    default_branch: "main",
    is_archived: false,
    created_by_user_id: "user-1",
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
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
      contributorsCount: 0,
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

describe("settings navigation shells", () => {
  it("renders the personal settings sidebar with protected concrete destinations", () => {
    const { container } = render(
      <SettingsShell activeSection="emails" session={session} title="Emails">
        <SettingsPlaceholderContent
          actions={[
            { href: "/settings/notifications", label: "Notifications" },
          ]}
          message="Email preferences are not built yet."
        />
      </SettingsShell>,
    );

    const nav = screen.getByRole("navigation", {
      name: "Settings navigation",
    });
    for (const item of SETTINGS_NAV_ITEMS) {
      expect(
        within(nav).getByRole("link", { name: item.label }),
      ).toHaveAttribute("href", item.href);
      expect(isProtectedPath(item.href)).toBe(true);
    }
    expect(within(nav).getByRole("link", { name: "Emails" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      container.querySelectorAll('a[href="#"], a:not([href])'),
    ).toHaveLength(0);
  });

  it("keeps active section matching deterministic for nested settings paths", () => {
    expect(activeSettingsSection("/settings/security/sessions")).toBe(
      "security",
    );
    expect(activeSettingsSection("/settings/tokens")).toBe("tokens");
    expect(
      activeRepositorySettingsSection("/mona/octo-app/settings/actions"),
    ).toBe("actions");
    expect(activeRepositorySettingsSection("/mona/octo-app/settings")).toBe(
      "general",
    );
  });

  it("renders repository settings links with owner and repo preserved", () => {
    const repository = repositoryOverview();
    render(
      <RepositorySettingsShell
        activeSection="branches"
        repository={repository}
        title="Branches"
      >
        <SettingsPlaceholderContent message="Branch rules are not built yet." />
      </RepositorySettingsShell>,
    );

    const nav = screen.getByRole("navigation", {
      name: "Repository settings navigation",
    });
    for (const item of REPOSITORY_SETTINGS_NAV_ITEMS) {
      expect(
        within(nav).getByRole("link", { name: item.label }),
      ).toHaveAttribute(
        "href",
        repositorySettingsHref("mona", "octo-app", item),
      );
      expect(
        isProtectedPath(repositorySettingsHref("mona", "octo-app", item)),
      ).toBe(true);
    }
    expect(within(nav).getByRole("link", { name: "Branches" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Code" })).toHaveAttribute(
      "href",
      "/mona/octo-app",
    );
  });

  it("does not leak uncontrolled form state across settings sections", () => {
    const { rerender } = render(
      <SettingsShell activeSection="profile" session={session} title="Profile">
        <label>
          Display name
          <input name="display_name" defaultValue="Mona" />
        </label>
      </SettingsShell>,
    );

    expect(screen.getByDisplayValue("Mona")).toBeVisible();

    rerender(
      <SettingsShell activeSection="emails" session={session} title="Emails">
        <label>
          Primary email
          <input name="email" defaultValue="mona@example.com" />
        </label>
      </SettingsShell>,
    );

    expect(
      screen.queryByRole("textbox", { name: "Display name" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Primary email" }),
    ).toHaveAttribute("name", "email");
  });
});
