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

async function expectNoDeadControls(page: Page) {
  await expect(page.locator('a[href="#"], a:not([href])')).toHaveCount(0);
  for (const button of await page.locator("button:visible").all()) {
    await expect(button).toHaveAccessibleName(/.+/);
  }
}

test.skip(
  !databaseUrl,
  "pull request compare E2E needs TEST_DATABASE_URL or DATABASE_URL",
);

test("signed-in repository compare page redirects, renders selectors, and recovers invalid refs", async ({
  page,
}) => {
  const seeded = seedSession();
  await signIn(page, seeded);
  const repositoryName = `compare repo ${Date.now().toString(36)}`;
  const normalizedName = repositoryName.replaceAll(/\s+/g, "-");

  await page.goto("/new");
  await page.getByLabel("Repository name *").fill(repositoryName);
  await page
    .getByLabel(/Description/)
    .fill("Repository for pull request compare smoke testing");
  await page.getByRole("button", { name: "Off" }).click();
  await page.getByRole("button", { name: "Create repository" }).click();
  await expect(page).toHaveURL(new RegExp(`/${normalizedName}$`));

  const [, ownerLogin, repoName] = new URL(page.url()).pathname.split("/");
  await page.goto(`/${ownerLogin}/${repoName}/compare`);
  await expect(page).toHaveURL(
    new RegExp(`/${ownerLogin}/${repoName}/compare/main\\.\\.\\.main$`),
  );
  await expect(
    page.getByRole("heading", { name: "Comparing changes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choose base ref. Current ref main" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choose compare ref. Current ref main" }),
  ).toBeVisible();
  await expect(
    page.getByText("There isn't anything to compare").first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Unified" })).toHaveAttribute(
    "href",
    `/${ownerLogin}/${repoName}/compare/main...main?view=unified`,
  );
  await page.getByRole("link", { name: "Unified" }).click();
  await expect(page).toHaveURL(/view=unified/);
  await expect(page.getByRole("link", { name: "Unified" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page
    .getByRole("button", { name: "Choose compare ref. Current ref main" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Search head branches and tags" }),
  ).toBeFocused();
  await expect(
    page.getByRole("link", { name: /main/ }).first(),
  ).toHaveAttribute(
    "href",
    `/${ownerLogin}/${repoName}/compare/main...main?view=unified`,
  );
  await page.keyboard.press("Escape");

  await page.goto(`/${ownerLogin}/${repoName}/compare/main...missing`);
  await expect(page.getByText("Comparison unavailable")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open default comparison" }),
  ).toHaveAttribute("href", `/${ownerLogin}/${repoName}/compare/main...main`);
  await page.getByRole("link", { name: "Open default comparison" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/${ownerLogin}/${repoName}/compare/main\\.\\.\\.main$`),
  );

  await expectNoDeadControls(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(
    page.getByRole("heading", { name: "Comparing changes" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/prs-003-phase2-compare-page.jpg",
  });
});
