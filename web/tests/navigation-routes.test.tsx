import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  activeRepositoryTab,
  activeSettingsSection,
  CREATE_NAV_ITEMS,
  GLOBAL_NAV_ITEMS,
  isActivePath,
  navigationHrefs,
  REPOSITORY_TABS,
  repositoryTabHref,
  SETTINGS_NAV_ITEMS,
} from "@/lib/navigation";
import { isProtectedPath } from "@/lib/protected-routes";

function routeFileForHref(href: string) {
  const segments = href.split("/").filter(Boolean);
  return join(process.cwd(), "src", "app", ...segments, "page.tsx");
}

function repositoryRouteFileForHref(href: string) {
  const [, , , ...segments] = href.split("/");
  return join(
    process.cwd(),
    "src",
    "app",
    "[owner]",
    "[repo]",
    ...segments,
    "page.tsx",
  );
}

describe("navigation route registry", () => {
  it("points every static signed-in destination at a real route file", () => {
    const missingRoutes = navigationHrefs().filter(
      (href) => !existsSync(routeFileForHref(href)),
    );

    expect(missingRoutes).toEqual([]);
  });

  it("has no inert targets and keeps signed-in destinations protected", () => {
    const items = [
      ...GLOBAL_NAV_ITEMS,
      ...CREATE_NAV_ITEMS,
      ...SETTINGS_NAV_ITEMS,
    ];

    expect(items.map((item) => item.href)).not.toContain("#");
    for (const item of items) {
      expect(item.href).toMatch(/^\//);
      expect(isProtectedPath(item.href)).toBe(item.protected);
    }
  });

  it("matches active global and settings paths deterministically", () => {
    expect(
      isActivePath("/settings/security/sessions", "/settings/security"),
    ).toBe(true);
    expect(isActivePath("/settings/security", "/settings/security")).toBe(true);
    expect(isActivePath("/settings/security", "/settings/profile")).toBe(false);
    expect(activeSettingsSection("/settings/keys")).toBe("keys");
    expect(activeSettingsSection("/settings/notifications/email")).toBe(
      "notifications",
    );
  });

  it("builds repository tab hrefs and active states without losing owner context", () => {
    const tabs = REPOSITORY_TABS.map((tab) => ({
      href: repositoryTabHref("namuh", "opengithub", tab),
      label: tab.label,
    }));

    expect(tabs).toContainEqual({
      href: "/namuh/opengithub",
      label: "Code",
    });
    expect(tabs).toContainEqual({
      href: "/namuh/opengithub/pulls",
      label: "Pull requests",
    });
    expect(tabs).toContainEqual({
      href: "/namuh/opengithub/settings",
      label: "Settings",
    });
    expect(activeRepositoryTab("/namuh/opengithub/pull/42/files")).toBe(
      "pulls",
    );
    expect(activeRepositoryTab("/namuh/opengithub/graphs/contributors")).toBe(
      "pulse",
    );
    expect(activeRepositoryTab("/namuh/opengithub/actions/runs/123")).toBe(
      "actions",
    );
    expect(activeRepositoryTab("/namuh/opengithub/issues/42")).toBe("issues");
  });

  it("points every repository tab at a concrete workspace route", () => {
    const missingRoutes = REPOSITORY_TABS.filter((tab) => tab.segment).filter(
      (tab) =>
        !existsSync(
          repositoryRouteFileForHref(
            repositoryTabHref("namuh", "opengithub", tab),
          ),
        ),
    );

    expect(missingRoutes.map((tab) => tab.label)).toEqual([]);
  });
});
