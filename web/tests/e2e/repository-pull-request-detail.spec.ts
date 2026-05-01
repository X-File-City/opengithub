import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

type SeededSession = {
  cookieName: string;
  cookieValue: string;
};

type CreatedPullRequest = {
  number?: number;
  pull_request?: {
    number?: number;
  };
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

test.skip(
  !databaseUrl,
  "repository pull request detail E2E needs TEST_DATABASE_URL or DATABASE_URL",
);

test("signed-in user opens the pull request detail conversation shell", async ({
  page,
}) => {
  const seeded = seedSession();
  await signIn(page, seeded);
  const repositoryName = `detail repo ${Date.now().toString(36)}`;
  const normalizedName = repositoryName.replaceAll(/\s+/g, "-");

  await page.goto("/new");
  await page.getByLabel("Repository name *").fill(repositoryName);
  await page
    .getByLabel(/Description/)
    .fill("Repository for pull request detail smoke testing");
  await page.getByRole("button", { name: "Create repository" }).click();
  await expect(page).toHaveURL(new RegExp(`/${normalizedName}$`));

  const [, ownerLogin, repoName] = new URL(page.url()).pathname.split("/");
  const pullTitle = `Detail read smoke ${Date.now().toString(36)}`;
  const createResponse = await page.request.post(
    `http://localhost:3016/api/repos/${ownerLogin}/${repoName}/pulls`,
    {
      headers: {
        cookie: `${seeded.cookieName}=${seeded.cookieValue}`,
      },
      data: {
        title: pullTitle,
        body: "Renders the **pull request detail** conversation shell.",
        headRef: "feature/detail-read",
        baseRef: "main",
        isDraft: true,
      },
    },
  );
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as CreatedPullRequest;
  const pullNumber = created.number ?? created.pull_request?.number;
  expect(pullNumber).toBeTruthy();

  await page.goto(`/${ownerLogin}/${repoName}/pull/${pullNumber}`);
  await expect(
    page.getByRole("heading", { name: new RegExp(pullTitle) }),
  ).toBeVisible();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await expect(page.getByText(/wants to merge/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Conversation/ }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("link", { name: "Files changed" }),
  ).toHaveAttribute(
    "href",
    `/${ownerLogin}/${repoName}/pull/${pullNumber}/files`,
  );
  await expect(
    page.getByRole("heading", { name: "Merge readiness" }),
  ).toBeVisible();
  await expect(page.getByText("No review requests")).toBeVisible();
  await expect(page.locator('a[href="#"], a:not([href])')).toHaveCount(0);

  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/prs-004-phase1-detail-read.jpg",
  });
});
