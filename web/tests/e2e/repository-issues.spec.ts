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

type CurrentUser = {
  id: string;
  username: string | null;
  email: string;
};

type CreatedRepository = {
  owner_login: string;
  name: string;
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

test("signed-in repository Issues filters update URL, results, and empty states", async ({
  page,
}) => {
  const seeded = seedSession();
  await signIn(page, seeded);
  const repositoryName = `issues filters ${Date.now().toString(36)}`;
  const cookie = `${seeded.cookieName}=${seeded.cookieValue}`;
  const currentUserResponse = await page.request.get(
    "http://localhost:3016/api/auth/current-user",
    { headers: { cookie } },
  );
  expect(currentUserResponse.status()).toBe(200);
  const currentUser = (await currentUserResponse.json()) as CurrentUser;
  const repositoryResponse = await page.request.post(
    "http://localhost:3016/api/repos",
    {
      headers: { cookie },
      data: {
        ownerType: "user",
        ownerId: currentUser.id,
        name: repositoryName,
        visibility: "public",
        initializeReadme: false,
      },
    },
  );
  expect(repositoryResponse.status()).toBe(201);
  const repository = (await repositoryResponse.json()) as CreatedRepository;
  const ownerLogin = repository.owner_login;
  const repoName = repository.name;
  const openTitle = `Filter target issue ${Date.now().toString(36)}`;
  const closedTitle = `Closed target issue ${Date.now().toString(36)}`;
  const openResponse = await page.request.post(
    `http://localhost:3016/api/repos/${ownerLogin}/${repoName}/issues`,
    {
      headers: { cookie },
      data: {
        title: openTitle,
        body: "Repository issue filter smoke body",
      },
    },
  );
  expect(openResponse.status()).toBe(201);
  const closedResponse = await page.request.post(
    `http://localhost:3016/api/repos/${ownerLogin}/${repoName}/issues`,
    {
      headers: { cookie },
      data: {
        title: closedTitle,
        body: "Closed state filter smoke body",
      },
    },
  );
  expect(closedResponse.status()).toBe(201);
  const closedIssue = (await closedResponse.json()) as CreatedIssue;
  const closeResponse = await page.request.patch(
    `http://localhost:3016/api/repos/${ownerLogin}/${repoName}/issues/${closedIssue.number}`,
    {
      headers: { cookie },
      data: { state: "closed" },
    },
  );
  expect(closeResponse.status()).toBe(200);

  await page.goto(`/${ownerLogin}/${repoName}/issues`);
  await page.getByLabel("issue-query").fill("target issue");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=target\+issue/);
  await expect(page.getByRole("link", { name: openTitle })).toBeVisible();
  await expect(page.getByRole("link", { name: closedTitle })).toHaveCount(0);

  await page.getByRole("link", { name: /Closed/ }).click();
  await expect(page).toHaveURL(/state=closed/);
  await expect(page.getByRole("link", { name: closedTitle })).toBeVisible();

  await page.getByLabel("issue-query").fill("no matching issue text");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("No issues matched this query")).toBeVisible();
  await page.getByRole("link", { name: "Clear query" }).click();
  await expect(page).toHaveURL(/q=is%3Aissue\+state%3Aopen/);
  await expect(page.getByRole("link", { name: openTitle })).toBeVisible();
  await expectNoDeadControls(page);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/issues-001-phase3-filtered-empty.jpg",
  });
});
