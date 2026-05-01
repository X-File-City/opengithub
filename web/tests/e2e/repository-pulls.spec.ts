import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

type SeededSession = {
  cookieName: string;
  cookieValue: string;
};

type CreatedPullRequest = {
  number?: number;
  title: string;
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

async function expectNoDeadControls(page: Page) {
  await expect(page.locator('a[href="#"], a:not([href])')).toHaveCount(0);
  for (const button of await page.locator("button:visible").all()) {
    await expect(button).toHaveAccessibleName(/.+/);
  }
}

test.skip(
  !databaseUrl,
  "repository pulls E2E needs TEST_DATABASE_URL or DATABASE_URL",
);

test("signed-in repository Pull requests tab renders real PRs and concrete navigation", async ({
  page,
}) => {
  const seeded = seedSession();
  await signIn(page, seeded);
  const repositoryName = `pulls repo ${Date.now().toString(36)}`;
  const normalizedName = repositoryName.replaceAll(/\s+/g, "-");

  await page.goto("/new");
  await page.getByLabel("Repository name *").fill(repositoryName);
  await page
    .getByLabel(/Description/)
    .fill("Repository for pull request list smoke testing");
  await page.getByRole("button", { name: "Create repository" }).click();
  await expect(page).toHaveURL(new RegExp(`/${normalizedName}$`));

  const [, ownerLogin, repoName] = new URL(page.url()).pathname.split("/");
  const pullTitle = `Default pull list smoke ${Date.now().toString(36)}`;
  const closedPullTitle = `Closed pull list smoke ${Date.now().toString(36)}`;
  const createResponse = await page.request.post(
    `http://localhost:3016/api/repos/${ownerLogin}/${repoName}/pulls`,
    {
      headers: {
        cookie: `${seeded.cookieName}=${seeded.cookieValue}`,
      },
      data: {
        title: pullTitle,
        body: "Created through the real Rust API for the repository pull list.",
        headRef: "feature/pull-list-smoke",
        baseRef: "main",
      },
    },
  );
  expect(createResponse.status()).toBe(201);
  const pull = (await createResponse.json()) as CreatedPullRequest;
  const closedCreateResponse = await page.request.post(
    `http://localhost:3016/api/repos/${ownerLogin}/${repoName}/pulls`,
    {
      headers: {
        cookie: `${seeded.cookieName}=${seeded.cookieValue}`,
      },
      data: {
        title: closedPullTitle,
        body: "Closed through the real Rust API for the pull list filters.",
        headRef: "feature/pull-list-closed",
        baseRef: "main",
      },
    },
  );
  expect(closedCreateResponse.status()).toBe(201);
  const closedPull = (await closedCreateResponse.json()) as CreatedPullRequest;
  const closedNumber = closedPull.number ?? closedPull.pull_request?.number;
  expect(closedNumber).toBeTruthy();
  const closeResponse = await page.request.patch(
    `http://localhost:3016/api/repos/${ownerLogin}/${repoName}/pulls/${closedNumber}`,
    {
      headers: {
        cookie: `${seeded.cookieName}=${seeded.cookieValue}`,
      },
      data: {
        state: "closed",
      },
    },
  );
  expect(closeResponse.status()).toBe(200);

  await page.goto(`/${ownerLogin}/${repoName}/pulls`);
  await expect(
    page.getByRole("heading", { exact: true, name: "Pull requests" }),
  ).toBeVisible();
  await expect(page.getByLabel("pull-query")).toHaveValue("is:pr is:open");
  await expect(page.getByRole("link", { name: /Open/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const pullLink = page.getByRole("link", { name: pullTitle });
  await expect(pullLink).toHaveAttribute(
    "href",
    new RegExp(`/${ownerLogin}/${repoName}/pull/\\d+$`),
  );
  const pullHref = await pullLink.getAttribute("href");
  const pullNumber = pullHref?.split("/").pop() ?? String(pull.number ?? 1);
  await expect(page.getByText(`#${pullNumber}`)).toBeVisible();
  await expect(page.getByText("feature/pull-list-smoke")).toBeVisible();
  await expect(page.getByText("main")).toBeVisible();
  await expect(page.getByRole("button", { name: "Labels" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "New pull request" }).first(),
  ).toHaveAttribute("href", `/${ownerLogin}/${repoName}/compare`);

  await page.getByLabel("pull-query").fill(`is:pr is:open ${pullTitle}`);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=is%3Apr\+is%3Aopen/);
  await expect(page.getByRole("link", { name: pullTitle })).toBeVisible();

  await page.goto(
    `/${ownerLogin}/${repoName}/pulls?q=is%3Apr%20state%3Aclosed&state=closed`,
  );
  await expect(page).toHaveURL(/state=closed/);
  await expect(page.getByRole("link", { name: closedPullTitle })).toBeVisible();
  await expect(page.getByText(pullTitle)).toHaveCount(0);

  await page.getByRole("button", { name: /Sort by/ }).click();
  await page.getByRole("menuitemradio", { name: /Newest/ }).click();
  await expect(page).toHaveURL(/sort=created-desc/);

  await page.getByRole("button", { name: "Labels" }).click();
  await page.getByRole("option", { name: /bug/ }).click();
  await expect(page).toHaveURL(/labels=bug/);
  await expect(
    page.getByText("No pull requests matched this query"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clear query" }).click();
  await expect(page.getByLabel("pull-query")).toHaveValue("is:pr is:open");

  await expectNoDeadControls(page);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/prs-001-phase3-filtered-empty.jpg",
  });

  await pullLink.click();
  await expect(page).toHaveURL(new RegExp(`/${repoName}/pull/${pullNumber}$`));
  await expect(
    page.getByRole("heading", { name: `Pull request #${pullNumber}` }),
  ).toBeVisible();

  await page.goto(`/${ownerLogin}/${repoName}/compare`);
  await expect(
    page.getByRole("heading", { name: "Compare changes" }),
  ).toBeVisible();
});
