import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

type SeededSession = {
  cookieName: string;
  cookieValue: string;
};

function seedSession(): SeededSession {
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
        DASHBOARD_E2E_EMPTY: "1",
        SESSION_COOKIE_NAME: "og_session",
      },
    },
  ).toString();
  return JSON.parse(output) as SeededSession;
}

async function signIn(page: Page, seeded: SeededSession) {
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

async function expectNoDeadImportControls(page: Page) {
  await expect(page.locator('a[href="#"], a:not([href])')).toHaveCount(0);

  for (const button of await page.locator("button:visible").all()) {
    await expect(button).toHaveAccessibleName(/.+/);
  }
}

test.skip(
  !databaseUrl,
  "repository import E2E needs TEST_DATABASE_URL or DATABASE_URL",
);

test("signed-in import wizard validates source URLs and queues imports", async ({
  page,
}) => {
  const seeded = seedSession();
  await signIn(page, seeded);

  await page.goto("/new/import");
  await expectNoDeadImportControls(page);
  await expect(
    page.getByRole("heading", { name: "Import your project to opengithub" }),
  ).toBeVisible();
  await expect(page.getByLabel("Source repository URL *")).toBeVisible();
  await expect(
    page.getByText("Optional credentials for private sources"),
  ).toBeVisible();
  await expect(page.getByLabel("Repository name *")).toBeVisible();
  await expect(page.getByLabel("Public")).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Begin import" }),
  ).toBeDisabled();

  await page
    .getByLabel("Source repository URL *")
    .fill("https://127.0.0.1/repo.git");
  await page
    .getByLabel("Repository name *")
    .fill(`bad-import-${Date.now().toString(36)}`);
  await page.getByRole("button", { name: "Begin import" }).click();
  await expect(
    page.getByText(/host is not allowed|invalid import source/i),
  ).toBeVisible();
  await expect(page.getByLabel("Source repository URL *")).toBeFocused();
  await expect(page).toHaveURL(/\/new\/import$/);

  const repositoryName = `queued-import-${Date.now().toString(36)}`;
  await page
    .getByLabel("Source repository URL *")
    .fill("https://github.com/octocat/Hello-World.git");
  await page.getByLabel("Repository name *").fill(repositoryName);
  await page.getByLabel("Private").check();
  await page.getByRole("button", { name: "Begin import" }).click();

  await expect(page).toHaveURL(/\/new\/import\/[0-9a-f-]+$/);
  await expect(
    page.getByText(/Queued|Importing|Imported|Failed/),
  ).toBeVisible();
  await expect(page.getByText(/Repository import/)).toBeVisible();
  await expect(page.getByText(/github\.com/)).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: new RegExp(`Preparing .*/${repositoryName}`),
    }),
  ).toBeVisible();
  await expectNoDeadImportControls(page);

  await page.setViewportSize({ width: 390, height: 844 });
  const viewportWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
