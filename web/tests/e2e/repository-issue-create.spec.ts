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
        ISSUE_TEMPLATE_E2E: "1",
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
    `${seeded.firstRepositoryHref}/issues/new?template=blank&title=Prefilled%20issue&body=Initial%20body`,
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

test("signed-in user chooses an issue template before composing", async ({
  page,
}) => {
  const seeded = seedRepository();
  await signIn(page, seeded);

  await page.goto(`${seeded.firstRepositoryHref}/issues/new`);

  await expect(
    page.getByRole("heading", { name: "Create new issue" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bug report" })).toBeVisible();
  await expect(page.getByText("1 default label")).toBeVisible();
  await expect(page.getByText("1 assignee")).toBeVisible();
  await expectNoDeadControls(page);

  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/template=bug-report/);
  await expect(page.getByLabel("Title")).toHaveValue("[Bug]: ");
  await expect(page.getByText("1 default label")).toBeVisible();
  await expect(page.getByText("1 default assignee")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Issue body" })).toHaveValue(
    /Expected behavior/,
  );
  await expect(page.getByPlaceholder("1. Open...")).toBeVisible();

  await page.getByLabel("Title").fill("[Bug]: template chooser works");
  await expect(
    page.getByRole("button", { name: "Create issue" }),
  ).toBeDisabled();
  await page.getByPlaceholder("1. Open...").focus();
  await page.getByPlaceholder("1. Open...").blur();
  await expect(page.getByText("Reproduction steps is required.")).toBeVisible();
  await page
    .getByPlaceholder("1. Open...")
    .fill("1. Open the issue form\n2. Submit the issue template");
  await page.getByPlaceholder("Chrome on macOS").fill("Chrome on macOS");
  await page.getByRole("tab", { name: "Preview" }).first().click();
  await expect(page.getByText("Open the issue form")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Issue body" })
    .fill("### Expected behavior\n\nThe selected template preloads.");
  await page.locator("#issue-attachments").setInputFiles({
    name: "console.log",
    mimeType: "text/plain",
    buffer: Buffer.from("browser smoke log"),
  });
  await expect(page.getByText("console.log")).toBeVisible();
  await page.getByLabel("Create more").check();
  await page.getByRole("button", { name: "Create issue" }).click();
  await expect(page.getByRole("status")).toContainText("Created issue #");

  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/issues-003-phase4-side-effects.jpg",
  });
});

test("final issue creation sweep covers redirect, cancel, required fields, and mobile", async ({
  browser,
  page,
}) => {
  const seeded = seedRepository();
  await signIn(page, seeded);

  await page.goto(`${seeded.firstRepositoryHref}/issues/new?template=blank`);
  await expect(
    page.getByRole("heading", { name: "Create new issue" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Cancel" }).first(),
  ).toHaveAttribute("href", `${seeded.firstRepositoryHref}/issues`);
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.getByText("Nothing to preview")).toBeVisible();
  await page.getByRole("tab", { name: "Write" }).click();
  await page.getByRole("button", { name: "Bold" }).click();
  await expect(page.getByRole("textbox", { name: "Issue body" })).toHaveValue(
    "**bold**",
  );
  await page.getByLabel("Title").fill("Final redirect issue");
  await page.getByRole("button", { name: "Create issue" }).click();
  await expect(page).toHaveURL(/\/issues\/\d+$/);
  await expect(page.getByRole("heading", { name: /Issue #\d+/ })).toBeVisible();

  await page.goto(`${seeded.firstRepositoryHref}/issues/new`);
  await page.getByRole("link", { name: "Get started" }).click();
  await page.getByLabel("Title").fill("[Bug]: required field guardrail");
  await expect(
    page.getByRole("button", { name: "Create issue" }),
  ).toBeDisabled();
  await page.getByPlaceholder("1. Open...").focus();
  await page.getByPlaceholder("1. Open...").blur();
  await expect(page.getByText("Reproduction steps is required.")).toBeVisible();
  await expectNoDeadControls(page);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/issues-003-phase5-final-desktop.jpg",
  });

  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await signIn(mobilePage, seeded);
  await mobilePage.goto(
    `${seeded.firstRepositoryHref}/issues/new?template=blank&title=Mobile%20issue&body=Mobile%20body`,
  );
  await expect(
    mobilePage.getByRole("heading", { name: "Create new issue" }),
  ).toBeVisible();
  await expect(mobilePage.getByLabel("Title")).toHaveValue("Mobile issue");
  const mobileOverflow = await mobilePage.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(mobileOverflow).toBe(false);
  await expectNoDeadControls(mobilePage);
  await mobilePage.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/issues-003-phase5-final-mobile.jpg",
  });
  await mobilePage.close();
});
