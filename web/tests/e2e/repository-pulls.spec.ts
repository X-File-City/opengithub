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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  await page.getByRole("button", { name: "Author" }).click();
  await expect(
    page.getByRole("combobox", { name: "Filter authors" }),
  ).toBeFocused();
  await page
    .getByRole("option", { name: new RegExp(escapeRegExp(ownerLogin)) })
    .first()
    .click();
  await expect(page).toHaveURL(/author=/);
  await expect(page.getByRole("link", { name: pullTitle })).toBeVisible();
  await expect(
    page.getByTitle(new RegExp(`Remove author:${escapeRegExp(ownerLogin)}`)),
  ).toBeVisible();
  await page
    .getByRole("link", {
      name: new RegExp(`author:${escapeRegExp(ownerLogin)}`),
    })
    .click();
  await expect(page).not.toHaveURL(/author=/);
  await page.getByRole("button", { name: "Assignee" }).click();
  await expect(
    page.getByRole("combobox", { name: "Filter assignees" }),
  ).toBeFocused();
  await page.getByRole("option", { name: /No assignee/ }).click();
  await expect(page).toHaveURL(/noAssignee=true/);
  await expect(page.getByRole("link", { name: pullTitle })).toBeVisible();
  await page.getByRole("link", { name: "no:assignee" }).click();
  await expect(page).not.toHaveURL(/noAssignee=true/);
  await expect(page.getByRole("button", { name: "Labels" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "New pull request" }).first(),
  ).toHaveAttribute("href", `/${ownerLogin}/${repoName}/compare`);
  await expect(
    page.getByRole("region", { name: "Contributor guidance" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Compare changes" }),
  ).toHaveAttribute("href", `/${ownerLogin}/${repoName}/compare`);
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(
    page.getByRole("region", { name: "Contributor guidance" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Contributor guidance" }),
  ).toHaveCount(0);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/prs-001-phase4-banner-dismissed.jpg",
  });

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
  await expect(
    page.getByRole("menu", { name: "Sort pull requests" }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitemradio", { name: /Newest/ }),
  ).toHaveAttribute("href", /sort=created-desc/);
  await expect(
    page.getByRole("menuitemradio", { name: /Least recently updated/ }),
  ).toHaveAttribute("href", /sort=updated-asc/);
  await expect(
    page.getByRole("menuitemradio", { name: /Best match/ }),
  ).toHaveAttribute("href", /sort=best-match/);
  await expect(
    page.getByRole("menuitemradio", { name: /Most rocket/ }),
  ).toHaveAttribute("href", /sort=reactions-rocket-desc/);
  await page.getByRole("menuitemradio", { name: /Most rocket/ }).click();
  await expect(page).toHaveURL(/sort=reactions-rocket-desc/);
  await expect(page.getByRole("link", { name: closedPullTitle })).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/prs-002-phase4-sort-menu.jpg",
  });
  await page.goto(
    `/${ownerLogin}/${repoName}/pulls?q=is%3Apr%20state%3Aclosed&state=closed&sort=best-match`,
  );
  await expect(page).toHaveURL(/sort=best-match/);
  await expect(
    page.getByRole("alert").filter({
      hasText: "best match sort requires a search term",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clear invalid query" }).click();

  await page.getByRole("button", { name: "Labels" }).click();
  await page.getByRole("option", { name: /bug/ }).click();
  await expect(page).toHaveURL(/labels=bug/);
  await expect(
    page.getByText("No pull requests matched this query"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clear query" }).click();
  await expect(page.getByLabel("pull-query")).toHaveValue("is:pr is:open");

  await page.getByRole("button", { name: "Projects" }).click();
  await expect(
    page.getByRole("combobox", { name: "Filter projects" }),
  ).toBeFocused();
  await expect(
    page.getByRole("option", { name: /No repository projects/ }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Milestones" }).click();
  await expect(
    page.getByRole("combobox", { name: "Filter pull request milestones" }),
  ).toBeFocused();
  await page.getByRole("option", { name: /No milestone/ }).click();
  await expect(page).toHaveURL(/noMilestone=true/);
  await expect(page.getByRole("link", { name: pullTitle })).toBeVisible();
  await expect(page.getByRole("link", { name: "no:milestone" })).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/prs-002-phase2-metadata-filters.jpg",
  });

  await page.getByRole("button", { name: "Reviews" }).click();
  await expect(
    page.getByRole("menuitemradio", { name: /No reviews/ }),
  ).toBeFocused();
  await expect(
    page.getByRole("menuitemradio", { name: /Review required/ }),
  ).toHaveAttribute("href", /review=required/);
  await expect(
    page.getByRole("menuitemradio", { name: /Approved review/ }),
  ).toHaveAttribute("href", /review=approved/);
  await expect(
    page.getByRole("menuitemradio", { name: /Changes requested/ }),
  ).toHaveAttribute("href", /review=changes_requested/);
  await expect(
    page.getByRole("menuitemradio", { name: /Reviewed by you/ }),
  ).toHaveAttribute("href", /review=reviewed_by_me/);
  await expect(
    page.getByRole("menuitemradio", { name: /Not reviewed by you/ }),
  ).toHaveAttribute("href", /review=not_reviewed_by_me/);
  await expect(
    page
      .getByRole("menuitemradio", { name: /Awaiting review from you/ })
      .filter({ hasText: "Pull requests directly awaiting your review." }),
  ).toHaveAttribute("href", /review=review_requested/);
  await expect(
    page.getByRole("menuitemradio", {
      name: /Awaiting review from you or your team/,
    }),
  ).toHaveAttribute("href", /review=team_review_requested/);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/prs-002-phase3-review-menu.jpg",
  });
  await page.getByRole("menuitemradio", { name: /No reviews/ }).click();
  await expect(page).toHaveURL(/review=none/);
  await expect(page.getByRole("link", { name: pullTitle })).toBeVisible();

  await expectNoDeadControls(page);
  await expect(
    page.getByRole("link", { name: /No checks|passing|failed|checks/ }),
  ).toHaveAttribute(
    "href",
    new RegExp(`/${ownerLogin}/${repoName}/pull/\\d+/checks`),
  );
  await expect(
    page.getByRole("link", { exact: true, name: "No review" }),
  ).toHaveAttribute(
    "href",
    new RegExp(`/${ownerLogin}/${repoName}/pull/\\d+#reviews`),
  );
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/prs-002-phase1-people-filters.jpg",
  });
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/prs-001-phase5-final-desktop.jpg",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/${ownerLogin}/${repoName}/pulls`);
  await expect(
    page.getByRole("heading", { exact: true, name: "Pull requests" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/prs-001-phase5-final-mobile.jpg",
  });
  await page.setViewportSize({ width: 1280, height: 720 });

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
