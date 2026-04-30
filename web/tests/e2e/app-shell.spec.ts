import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

type SeededDashboard = {
  cookieName: string;
  cookieValue: string;
  firstRepositoryHref: string;
};

function seedDashboard(): SeededDashboard {
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

async function expectNoDeadControls(page: Page) {
  await expect(page.locator('a[href="#"], a:not([href])')).toHaveCount(0);
  for (const button of await page.locator("button:visible").all()) {
    await expect(button).toHaveAccessibleName(/.+/);
    await expect(button).not.toBeDisabled();
  }
}

test.skip(
  !databaseUrl,
  "app shell E2E needs TEST_DATABASE_URL or DATABASE_URL",
);

test("signed-in desktop header menus, links, search, and sign-out work", async ({
  page,
}) => {
  const seeded = seedDashboard();
  await signIn(page, seeded);

  await page.goto("/dashboard");

  await expect(
    page.getByRole("link", { name: "opengithub dashboard" }),
  ).toHaveAttribute("href", "/dashboard");
  await expect(
    page.getByRole("link", { name: "Pull requests" }),
  ).toHaveAttribute("href", "/pulls");
  await expect(page.getByRole("link", { name: "Issues" })).toHaveAttribute(
    "href",
    "/issues",
  );
  await expectNoDeadControls(page);

  await page.getByRole("button", { name: "Global menu" }).click();
  await expect(
    page.getByRole("menuitem", { name: "Dashboard" }),
  ).toHaveAttribute("href", "/dashboard");
  const recentRepository = page.getByRole("menuitem", {
    name: seeded.firstRepositoryHref.slice(1),
  });
  await expect(recentRepository).toHaveAttribute(
    "href",
    seeded.firstRepositoryHref,
  );

  await page.getByRole("button", { name: "Create new" }).click();
  await expect(
    page.getByRole("menuitem", { name: "New repository" }),
  ).toHaveAttribute("href", "/new");
  await expect(
    page.getByRole("menuitem", { name: "Import repository" }),
  ).toHaveAttribute("href", "/new/import");

  await page.getByRole("searchbox", { name: "Search or jump to" }).fill("rust");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=rust$/);
  await expect(
    page.getByRole("heading", { name: "Search opengithub" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Open user menu" }).click();
  await expect(
    page.getByRole("menuitem", { name: "Your profile" }),
  ).toHaveAttribute("href", "/settings/profile");
  await expect(
    page.getByRole("menuitem", { name: "Developer settings" }),
  ).toHaveAttribute("href", "/settings/tokens");
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/layout-001-phase2-desktop-header.jpg",
  });

  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL("http://localhost:3015/");
});
