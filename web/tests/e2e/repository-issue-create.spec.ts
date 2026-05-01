import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

type SeededDashboard = {
  cookieName: string;
  cookieValue: string;
  firstRepositoryHref: string;
};

function seedRepository(): SeededDashboard {
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
  }
}

test.skip(
  !databaseUrl,
  "repository issue creation E2E needs TEST_DATABASE_URL or DATABASE_URL",
);

test("signed-in user creates a generic repository issue", async ({ page }) => {
  const seeded = seedRepository();
  await signIn(page, seeded);

  await page.goto(
    `${seeded.firstRepositoryHref}/issues/new?title=Prefilled%20issue&body=Initial%20body`,
  );

  await expect(
    page.getByRole("heading", { name: "Create new issue" }),
  ).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("Prefilled issue");
  await expect(page.getByRole("textbox", { name: "Issue body" })).toHaveValue(
    "Initial body",
  );
  await expect(
    page.getByRole("link", { name: "Cancel" }).first(),
  ).toHaveAttribute("href", `${seeded.firstRepositoryHref}/issues`);
  await expectNoDeadControls(page);

  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.getByText("Initial body")).toBeVisible();
  await page.getByRole("tab", { name: "Write" }).click();

  await page.getByLabel("Title").fill("Generic issue from Playwright");
  await page
    .getByRole("textbox", { name: "Issue body" })
    .fill("Created through the Phase 1 issue composer.");
  await page.getByLabel("Create more").check();
  await page.getByRole("button", { name: "Create issue" }).click();

  await expect(page.getByRole("status")).toContainText("Created issue #");
  await expect(page.getByLabel("Title")).toHaveValue("");
  await expect(page.getByRole("textbox", { name: "Issue body" })).toHaveValue(
    "",
  );

  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/issues-003-phase1-generic-create.jpg",
  });
});
