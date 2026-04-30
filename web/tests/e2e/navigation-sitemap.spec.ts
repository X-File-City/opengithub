import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

type SeededNavigation = {
  cookieName: string;
  cookieValue: string;
  firstRepositoryHref: string;
};

function seedNavigation(): SeededNavigation {
  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL or DATABASE_URL is required");
  }

  const output = execFileSync(
    "cargo",
    [
      "run",
      "--quiet",
      "-p",
      "opengithub-api",
      "--example",
      "dashboard_e2e_seed",
    ],
    {
      cwd: "..",
      env: {
        ...process.env,
        DASHBOARD_E2E_EMPTY: "0",
        SESSION_COOKIE_NAME: "og_session",
      },
    },
  ).toString();
  return JSON.parse(output) as SeededNavigation;
}

async function signIn(page: Page, seeded: SeededNavigation) {
  await page.context().addCookies([
    {
      name: seeded.cookieName,
      value: seeded.cookieValue,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
}

async function expectConcretePage(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), path).toBeLessThan(400);
  await expect(page.locator("h1, h2").first()).toBeVisible();
  await expect(page.getByText(/^404$/)).toHaveCount(0);
  await expect(page.getByText(/This page could not be found/i)).toHaveCount(0);
  await expectNoDeadControls(page);
  await expectNoHorizontalOverflow(page);
}

async function expectNoDeadControls(page: Page) {
  await expect(page.locator('a[href="#"], a:not([href])')).toHaveCount(0);
  for (const button of await page.locator("button:visible").all()) {
    await expect(button).toHaveAccessibleName(/.+/);
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(horizontalOverflow).toBe(false);
}

test.skip(
  !databaseUrl,
  "navigation sitemap E2E needs TEST_DATABASE_URL or DATABASE_URL",
);

test("signed-in global sitemap routes render concrete pages without dead controls", async ({
  page,
}) => {
  const seeded = seedNavigation();
  await signIn(page, seeded);

  for (const path of [
    "/dashboard",
    "/issues",
    "/pulls",
    "/notifications",
    "/search?q=router&type=repositories",
    "/explore",
    "/codespaces",
    "/new",
    "/new/import",
    "/organizations/new",
    "/settings/profile",
    "/settings/security",
    "/settings/tokens",
  ]) {
    await expectConcretePage(page, path);
  }

  await page.goto("/codespaces");
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/nav-001-phase5-global-placeholder.jpg",
  });
});

test("repository workspace and settings sitemap preserve owner/repo context", async ({
  page,
}) => {
  const seeded = seedNavigation();
  await signIn(page, seeded);
  const repoHref = seeded.firstRepositoryHref;

  for (const suffix of [
    "",
    "/issues",
    "/pulls",
    "/actions",
    "/projects",
    "/wiki",
    "/security",
    "/pulse",
    "/settings",
    "/settings/access",
    "/settings/branches",
    "/settings/actions",
    "/settings/hooks",
    "/settings/pages",
    "/settings/secrets",
    "/settings/tags",
    "/settings/security",
  ]) {
    await expectConcretePage(page, `${repoHref}${suffix}`);
  }

  await page.goto(`${repoHref}/pulls`);
  await expect(
    page.getByRole("navigation", { name: "Repository" }).getByRole("link", {
      name: "Pull requests",
    }),
  ).toHaveAttribute("aria-current", "page");
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/nav-001-phase5-repository-tabs.jpg",
  });

  await page.goto(`${repoHref}/settings/branches`);
  await expect(
    page
      .getByRole("navigation", { name: "Repository settings navigation" })
      .getByRole("link", { name: "Branches" }),
  ).toHaveAttribute("aria-current", "page");
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/nav-001-phase5-repository-settings.jpg",
  });
});

test("profile, organization, search, and mobile navigation stay concrete", async ({
  page,
}) => {
  const seeded = seedNavigation();
  await signIn(page, seeded);

  for (const path of [
    "/mona?tab=repositories",
    "/mona?tab=stars",
    "/orgs/namuh?tab=people",
    "/orgs/namuh/projects",
    "/orgs/namuh/settings",
    "/orgs/namuh/teams/platform",
    "/search?q=router&type=code",
    "/search?q=router&type=users",
  ]) {
    await expectConcretePage(page, path);
  }

  await page.goto("/settings/profile");
  await expect(page.getByRole("link", { name: "Profile" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/nav-001-phase5-personal-settings.jpg",
  });

  await page.goto("/orgs/namuh?tab=teams");
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/nav-001-phase5-profile-org.jpg",
  });

  await page.goto("/search?q=router&type=users");
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/nav-001-phase5-search-tabs.jpg",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Global menu" }).click();
  await expect(page.getByRole("dialog", { name: "Global menu" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/nav-001-phase5-mobile-navigation.jpg",
  });
});
