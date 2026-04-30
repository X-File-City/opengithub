import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

type SeededSession = {
  cookieName: string;
  cookieValue: string;
};

function seedSession(marker: string): SeededSession {
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
        SEARCH_E2E_MARKER: marker,
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

async function expectNoDeadControls(page: Page) {
  await expect(page.locator('a[href="#"], a:not([href])')).toHaveCount(0);
  for (const button of await page.locator("button:visible").all()) {
    await expect(button).toHaveAccessibleName(/.+/);
  }
}

test.skip(!databaseUrl, "search E2E needs TEST_DATABASE_URL or DATABASE_URL");

test("repository and people search render indexed results", async ({
  page,
}) => {
  const marker = `phase2-${Date.now()}`;
  const seeded = seedSession(marker);
  await signIn(page, seeded);

  await page.goto(`/search?q=${marker}&type=repositories`);
  await expect(
    page.getByRole("heading", { name: "Search opengithub" }),
  ).toBeVisible();
  await expect(page.getByText(/1 repositories results/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: new RegExp(marker) }),
  ).toHaveAttribute("href", /\/dash-.+\/search-.+/);

  await page.getByRole("link", { name: "Users" }).click();
  await expect(page).toHaveURL(new RegExp(`/search\\?q=${marker}&type=users$`));
  await expect(page.getByText(/1 users results/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Dashboard Tester/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Organizations" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/search\\?q=${marker}&type=organizations$`),
  );
  await expect(page.getByText(/1 organizations results/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Search Organization/ }),
  ).toHaveAttribute("href", /\/orgs\/search-org-/);

  await page.goto(`/search?q=no-result-${marker}&type=repositories`);
  await expect(page.getByText(/Nothing matched/)).toBeVisible();
  await expect(page.getByText("owner:", { exact: true })).toBeVisible();
  await expectNoDeadControls(page);

  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/search-001-phase2-results.jpg",
  });
});

test("code and commit search link to repository files and commits", async ({
  page,
}) => {
  const marker = `phase3-${Date.now()}`;
  const seeded = seedSession(marker);
  await signIn(page, seeded);

  await page.goto(`/search?q=${marker}&type=code`);
  await expect(page.getByText(/1 code results/)).toBeVisible();
  const codeResult = page.getByRole("link", {
    name: /src\/search_phase_three\.rs/,
  });
  await expect(codeResult).toHaveAttribute(
    "href",
    /\/blob\/main\/src\/search_phase_three\.rs#L1/,
  );
  await expect(page.getByText(new RegExp(`pub fn ${marker}`))).toBeVisible();
  await codeResult.click();
  await expect(page).toHaveURL(/\/blob\/main\/src\/search_phase_three\.rs/);
  await expect(
    page
      .locator("span")
      .filter({ hasText: new RegExp(`pub fn ${marker}`) })
      .first(),
  ).toBeVisible();

  await page.goto(`/search?q=${marker}&type=commits`);
  await expect(page.getByText(/1 commits results/)).toBeVisible();
  const commitResult = page.getByRole("link", {
    name: new RegExp(`Add ${marker} code search fixture`),
  });
  await expect(commitResult).toHaveAttribute("href", /\/commit\//);
  await expect(page.getByText(/Commit result for/)).toBeVisible();

  await expectNoDeadControls(page);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/search-001-phase3-code-results.jpg",
  });
});
