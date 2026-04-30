import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

type SeededDashboard = {
  cookieName: string;
  cookieValue: string;
  firstRepositoryHref: string;
  secondRepositoryHref: string;
};

function seedDashboard({
  empty = false,
}: {
  empty?: boolean;
} = {}): SeededDashboard {
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
        DASHBOARD_E2E_EMPTY: empty ? "1" : "0",
        SESSION_COOKIE_NAME: "og_session",
      },
    },
  ).toString();
  return JSON.parse(output) as SeededDashboard;
}

async function signIn(page: Page, seeded: SeededDashboard) {
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

async function expectNoDeadDashboardControls(page: Page) {
  await expect(page.locator('a[href="#"], a:not([href])')).toHaveCount(0);

  for (const button of await page.locator("button").all()) {
    await expect(button).toHaveAccessibleName(/.+/);
    await expect(button).not.toBeDisabled();
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
}

async function boundingBoxFor(locator: ReturnType<Page["locator"]>) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  if (!box) {
    throw new Error("expected element to have a bounding box");
  }

  return box;
}

test.skip(
  !databaseUrl,
  "dashboard signed-in E2E needs TEST_DATABASE_URL or DATABASE_URL",
);

test("signed-in dashboard filters top repositories and navigates rows", async ({
  page,
}) => {
  const seeded = seedDashboard();
  await signIn(page, seeded);

  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Top repositories" }),
  ).toBeVisible();
  const newRepositoryLink = page.getByRole("link", {
    exact: true,
    name: "New",
  });
  await expect(newRepositoryLink).toHaveAttribute("href", "/new");
  await expect(page.getByText("Rust")).toBeVisible();
  await expect(page.getByText("TypeScript")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recent activity" }),
  ).toBeVisible();
  const recentActivity = page.locator(
    'section[aria-labelledby="recent-activity-heading"]',
  );
  await expect(
    recentActivity.getByRole("link", { name: "Wire dashboard activity feed" }),
  ).toBeVisible();
  await expect(
    recentActivity.getByRole("link", { name: "Fix dashboard setup workflow" }),
  ).toBeVisible();
  await expect(
    recentActivity.getByRole("link", { name: "Add signed-in dashboard feed" }),
  ).toBeVisible();

  const topRepositories = page.getByRole("complementary", {
    name: "Top repositories",
  });
  await page.getByLabel("Find a repository").fill("infra");
  const filteredRepository = topRepositories.getByRole("link", {
    name: /infra-/,
  });
  await expect(filteredRepository).toBeVisible();
  await expect(
    topRepositories.getByRole("link", { name: /alpha-/ }),
  ).toHaveCount(0);

  await filteredRepository.click();
  await expect(page).toHaveURL(new RegExp(`${seeded.secondRepositoryHref}$`));

  await page.goto("/dashboard");
  await newRepositoryLink.click();
  await expect(page).toHaveURL(/\/new$/);
});

test("signed-in dashboard has no dead controls on empty and non-empty states", async ({
  page,
}) => {
  const emptySeed = seedDashboard({ empty: true });
  await signIn(page, emptySeed);
  await page.goto("/dashboard");

  await expect(
    page.getByText("You do not have any repositories yet."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create repository" }).first(),
  ).toHaveAttribute("href", "/new");
  await expect(
    page.getByRole("link", { name: "Import repository" }).first(),
  ).toHaveAttribute("href", "/new/import");
  await expect(
    page.getByRole("link", { name: "Read setup guide" }).first(),
  ).toHaveAttribute("href", "/docs/get-started");
  await expectNoDeadDashboardControls(page);

  const seeded = seedDashboard();
  await page.context().clearCookies();
  await signIn(page, seeded);
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Recent activity" }),
  ).toBeVisible();
  await expectNoDeadDashboardControls(page);
});

test("signed-in dashboard stacks without horizontal scroll on mobile", async ({
  page,
}) => {
  const seeded = seedDashboard();
  await signIn(page, seeded);

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Top repositories" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recent activity" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const sidebar = await boundingBoxFor(
    page.getByRole("complementary", { name: "Top repositories" }),
  );
  const feed = await boundingBoxFor(
    page.locator('section[aria-labelledby="recent-activity-heading"]'),
  );
  expect(feed.y).toBeGreaterThan(sidebar.y + sidebar.height - 1);

  await page.getByLabel("Find a repository").fill("infra");
  await expect(
    page
      .getByRole("complementary", { name: "Top repositories" })
      .getByRole("link", { name: /infra-/ }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("signed-in dashboard keeps the sidebar and feed aligned on desktop", async ({
  page,
}) => {
  const seeded = seedDashboard();
  await signIn(page, seeded);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard");

  await expectNoHorizontalOverflow(page);
  const sidebar = await boundingBoxFor(
    page.getByRole("complementary", { name: "Top repositories" }),
  );
  const feed = await boundingBoxFor(
    page.locator('section[aria-labelledby="recent-activity-heading"]'),
  );
  expect(sidebar.width).toBeGreaterThanOrEqual(290);
  expect(sidebar.width).toBeLessThanOrEqual(306);
  expect(feed.x).toBeGreaterThan(sidebar.x + sidebar.width);
  expect(feed.width).toBeLessThanOrEqual(720);
});
