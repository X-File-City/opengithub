import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

type SeededSession = {
  cookieName: string;
  cookieValue: string;
  socialSourceRepositoryHref: string;
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
  "repository code overview E2E needs TEST_DATABASE_URL or DATABASE_URL",
);

test("signed-in repository Code tab renders files, README, sidebar, and clone menu", async ({
  page,
}) => {
  const seeded = seedSession();
  await signIn(page, seeded);
  const repositoryName = `code overview ${Date.now().toString(36)}`;
  const normalizedName = repositoryName.replaceAll(/\s+/g, "-");

  await page.goto("/new");
  await page.getByLabel("Repository name *").fill(repositoryName);
  await page.getByLabel(/Description/).fill("Playwright Code tab overview");
  await page
    .getByRole("combobox", { name: /Start with a template/ })
    .selectOption("rust-axum");
  await page.getByRole("button", { name: "Off" }).click();
  await page.getByText("Add .gitignore").click();
  await page.getByLabel("Search gitignore templates").fill("rust");
  await page.getByRole("listbox").getByRole("option", { name: /Rust/ }).click();
  await page.getByRole("button", { name: "Create repository" }).click();

  await expect(page).toHaveURL(new RegExp(`/${normalizedName}$`));
  const repositoryUrl = page.url();
  await expect(
    page.getByRole("heading", { name: normalizedName }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Code" })).toHaveAttribute(
    "href",
    new RegExp(`/${normalizedName}$`),
  );
  await expect(page.getByRole("link", { name: "main" })).toHaveAttribute(
    "href",
    new RegExp(`/${normalizedName}/tree/main$`),
  );
  await expect(page.getByRole("link", { name: /Cargo\.toml/ })).toHaveAttribute(
    "href",
    new RegExp(`/${normalizedName}/blob/main/Cargo\\.toml$`),
  );
  await expect(page.getByRole("link", { name: /src/ })).toHaveAttribute(
    "href",
    new RegExp(`/${normalizedName}/tree/main/src$`),
  );
  await expect(page.getByRole("heading", { name: "README.md" })).toBeVisible();
  await expect(
    page.getByText("Playwright Code tab overview", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Watch/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Star/ })).toBeVisible();

  const starResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/${normalizedName}/actions/star`) &&
      response.request().method() === "PUT" &&
      response.status() === 200,
  );
  await page.getByRole("button", { name: /Star/ }).click();
  await expect(page.getByRole("button", { name: /Unstar/ })).toBeVisible();
  await starResponse;
  await page.reload();
  await expect(page.getByRole("button", { name: /Unstar/ })).toBeVisible();
  const watchResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/${normalizedName}/actions/watch`) &&
      response.request().method() === "PUT" &&
      response.status() === 200,
  );
  await page.getByRole("button", { name: /Watch/ }).click();
  await expect(page.getByRole("button", { name: /Unwatch/ })).toBeVisible();
  await watchResponse;
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-003-final-action-state.jpg",
  });
  await page.reload();
  await expect(page.getByRole("button", { name: /Unwatch/ })).toBeVisible();

  await page.locator("summary[aria-label^='Switch branches or tags']").click();
  await expect(page.getByText("Switch branches/tags")).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-003-final-branch-selector.jpg",
  });
  await page.locator("summary[aria-label^='Switch branches or tags']").click();
  await page.locator(`a[href$="/${normalizedName}/tree/main/src"]`).click();
  await expect(page).toHaveURL(new RegExp(`/${normalizedName}/tree/main/src$`));
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-003-final-nested-tree.jpg",
  });
  await expect(page.getByRole("link", { name: /main\.rs/ })).toHaveAttribute(
    "href",
    new RegExp(`/${normalizedName}/blob/main/src/main\\.rs$`),
  );
  await page.getByRole("link", { name: "History" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/${normalizedName}/commits/main/src$`),
  );
  await expect(
    page.getByRole("link", { name: /Initial commit/ }),
  ).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-003-final-history.jpg",
  });
  await page.goBack();
  await page.getByRole("link", { name: /main\.rs/ }).click();
  await expect(page).toHaveURL(
    new RegExp(`/${normalizedName}/blob/main/src/main\\.rs$`),
  );
  await expect(
    page.getByRole("heading", { name: "src/main.rs" }),
  ).toBeVisible();
  await expect(page.getByText(/tokio::main/)).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-003-final-blob.jpg",
  });
  await page.getByRole("link", { name: "Parent" }).click();
  await expect(page).toHaveURL(new RegExp(`/${normalizedName}/tree/main/src$`));
  await page.goto(repositoryUrl);

  await page.locator("summary").filter({ hasText: "Code" }).click();
  await expect(page.getByLabel("HTTPS")).toHaveValue(/opengithub\.namuh\.co/);
  await expect(
    page.getByRole("link", { name: "Download ZIP" }),
  ).toHaveAttribute(
    "href",
    new RegExp(`/${normalizedName}/archive/refs/heads/main\\.zip$`),
  );
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-003-final-clone-menu.jpg",
  });
  await page.locator("summary").filter({ hasText: "Code" }).click();
  await expectNoDeadControls(page);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-003-final-default-overview.jpg",
  });

  await page.goto(seeded.socialSourceRepositoryHref);
  const socialSourceName = seeded.socialSourceRepositoryHref.split("/").at(-1);
  const forkResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/actions/fork") &&
      response.request().method() === "POST" &&
      response.status() === 201,
  );
  await page.getByRole("button", { name: /Fork/ }).click();
  await forkResponse;
  await expect(page).toHaveURL(new RegExp(`/[^/]+/${socialSourceName}$`));
  await expect(page.getByRole("button", { name: /Star/ })).toBeVisible();

  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-003-phase3-header-actions.jpg",
  });
});

test("empty repository quick setup and mobile Code tab remain actionable", async ({
  page,
}) => {
  const seeded = seedSession();
  await signIn(page, seeded);
  const repositoryName = `empty code ${Date.now().toString(36)}`;
  const normalizedName = repositoryName.replaceAll(/\s+/g, "-");

  await page.goto("/new");
  await page.getByLabel("Repository name *").fill(repositoryName);
  await page.getByLabel(/Description/).fill("Empty repository guardrail");
  await page.getByRole("button", { name: "Create repository" }).click();

  await expect(page).toHaveURL(new RegExp(`/${normalizedName}$`));
  await expect(
    page.getByRole("heading", { name: "Quick setup" }),
  ).toBeVisible();
  await expect(page.getByText(/git remote add origin/)).toBeVisible();
  await page.locator("summary").filter({ hasText: "Add file" }).click();
  await expect(
    page.getByRole("link", { name: "Create new file" }),
  ).toHaveAttribute("href", new RegExp(`/${normalizedName}/new/main$`));
  await expect(
    page.getByRole("link", { name: "Upload files" }),
  ).toHaveAttribute("href", new RegExp(`/${normalizedName}/upload/main$`));
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-003-final-empty-quick-setup.jpg",
  });
  await page.locator("summary").filter({ hasText: "Add file" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: normalizedName }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Watch/ })).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(2);
  await expectNoDeadControls(page);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-003-final-mobile.jpg",
  });
});
