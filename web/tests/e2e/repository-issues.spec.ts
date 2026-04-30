import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

type SeededSession = {
  cookieName: string;
  cookieValue: string;
};

type CreatedIssue = {
  number: number;
  title: string;
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
  "repository issues E2E needs TEST_DATABASE_URL or DATABASE_URL",
);

test("signed-in repository Issues tab renders real issues and row navigation", async ({
  page,
}) => {
  const seeded = seedSession();
  await signIn(page, seeded);
  const repositoryName = `issues repo ${Date.now().toString(36)}`;
  const normalizedName = repositoryName.replaceAll(/\s+/g, "-");

  await page.goto("/new");
  await page.getByLabel("Repository name *").fill(repositoryName);
  await page
    .getByLabel(/Description/)
    .fill("Repository for issue list smoke testing");
  await page.getByRole("button", { name: "Create repository" }).click();
  await expect(page).toHaveURL(new RegExp(`/${normalizedName}$`));

  const [, ownerLogin, repoName] = new URL(page.url()).pathname.split("/");
  const issueTitle = `Default issue list smoke ${Date.now().toString(36)}`;
  const createResponse = await page.request.post(
    `http://localhost:3016/api/repos/${ownerLogin}/${repoName}/issues`,
    {
      headers: {
        cookie: `${seeded.cookieName}=${seeded.cookieValue}`,
      },
      data: {
        title: issueTitle,
        body: "Created through the real Rust API for the repository issue list.",
      },
    },
  );
  expect(createResponse.status()).toBe(201);
  const issue = (await createResponse.json()) as CreatedIssue;

  await page.goto(`/${ownerLogin}/${repoName}/issues`);
  await expect(
    page.getByRole("heading", { exact: true, name: "Issues" }),
  ).toBeVisible();
  await expect(page.getByLabel("issue-query")).toHaveValue(
    "is:issue state:open",
  );
  await expect(page.getByRole("link", { name: /Open/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("link", { name: issueTitle })).toHaveAttribute(
    "href",
    `/${ownerLogin}/${repoName}/issues/${issue.number}`,
  );
  await expect(page.getByText(`#${issue.number}`)).toBeVisible();
  await expect(
    page.getByText(new RegExp(`${ownerLogin}/${repoName}`)),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "New issue" })).toHaveAttribute(
    "href",
    `/${ownerLogin}/${repoName}/issues/new`,
  );
  await expectNoDeadControls(page);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/issues-001-phase2-open-list.jpg",
  });

  await page.getByRole("link", { name: issueTitle }).click();
  await expect(page).toHaveURL(
    new RegExp(`/${repoName}/issues/${issue.number}$`),
  );
  await expect(
    page.getByRole("heading", { name: `Issue #${issue.number}` }),
  ).toBeVisible();
});
