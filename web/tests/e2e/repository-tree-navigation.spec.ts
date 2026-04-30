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

async function createRepository(page: Page) {
  const repositoryName = `tree browser ${Date.now().toString(36)}`;
  const normalizedName = repositoryName.replaceAll(/\s+/g, "-");

  await page.goto("/new");
  await page.getByLabel("Repository name *").fill(repositoryName);
  await page.getByLabel(/Description/).fill("Tree browser Playwright smoke");
  await page
    .getByRole("combobox", { name: /Start with a template/ })
    .selectOption("rust-axum");
  await page.getByRole("button", { name: "Off" }).click();
  await page.getByRole("button", { name: "Create repository" }).click();
  await expect(page).toHaveURL(new RegExp(`/${normalizedName}$`));
  const [, owner] = new URL(page.url()).pathname.split("/");

  return { owner, repositoryName: normalizedName };
}

async function expectNoDeadControls(page: Page) {
  await expect(page.locator('a[href="#"], a:not([href])')).toHaveCount(0);
  for (const button of await page.locator("button:visible").all()) {
    await expect(button).toHaveAccessibleName(/.+/);
  }
}

test.skip(
  !databaseUrl,
  "repository tree navigation E2E needs TEST_DATABASE_URL or DATABASE_URL",
);

test("signed-in tree page supports split-pane browsing and row navigation", async ({
  page,
}) => {
  const seeded = seedSession();
  await signIn(page, seeded);
  const { owner, repositoryName } = await createRepository(page);

  await page.goto(`/${owner}/${repositoryName}/tree/main/src`);
  await expect(
    page.getByRole("region", { name: "Repository directory browser" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Repository file tree" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "src" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Parent directory" }),
  ).toHaveAttribute("href", new RegExp(`/${repositoryName}/tree/main$`));
  await expect(page.getByText("Last commit message")).toBeVisible();

  const splitter = page.getByRole("separator", { name: "Resize file tree" });
  const before = await page.locator("aside").boundingBox();
  await splitter.focus();
  await page.keyboard.press("ArrowRight");
  const after = await page.locator("aside").boundingBox();
  expect(after?.width ?? 0).toBeGreaterThan(before?.width ?? 0);

  await page.getByRole("button", { name: "Collapse file tree" }).click();
  await expect(
    page.getByRole("navigation", { name: "Repository file tree" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Expand file tree" }).click();
  await expect(
    page.getByRole("navigation", { name: "Repository file tree" }),
  ).toBeVisible();

  await page
    .locator("main")
    .getByRole("link", { name: /main\.rs/ })
    .last()
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/${repositoryName}/blob/main/src/main\\.rs$`),
  );
  await expect(
    page.getByRole("heading", { name: "src/main.rs" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Parent" }).click();
  await expect(page).toHaveURL(new RegExp(`/${repositoryName}/tree/main/src$`));
  await page.getByRole("link", { name: "Parent directory" }).click();
  await expect(page).toHaveURL(new RegExp(`/${repositoryName}/tree/main$`));
  await expectNoDeadControls(page);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-004-phase2-tree-browser.jpg",
  });
});

test("large tree directories page without layout shift and recover missing paths", async ({
  page,
}) => {
  const seeded = JSON.parse(
    execFileSync(
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
          DASHBOARD_E2E_TREE_REFS: "1",
          SESSION_COOKIE_NAME: "og_session",
        },
      },
    ).toString(),
  ) as SeededSession & { treeRepositoryHref: string };
  await signIn(page, seeded);
  const repositoryHref = seeded.treeRepositoryHref;
  const repositoryName = repositoryHref.split("/").at(-1);

  await page.goto(`${repositoryHref}/tree/feature%2Ftree-nav/docs?pageSize=30`);
  await expect(page.getByText("Showing 30 of 74 entries")).toBeVisible();
  const tableBoxBefore = await page.locator("main ul").boundingBox();
  await page.getByRole("link", { name: "Load more directory entries" }).click();
  await expect(page).toHaveURL(/page=2&pageSize=30/);
  await expect(page.getByText("Showing 30 of 74 entries")).toBeVisible();
  await expect(
    page
      .locator("main ul")
      .last()
      .getByRole("link", {
        name: /example-029\.md/,
      }),
  ).toBeVisible();
  const tableBoxAfter = await page.locator("main ul").boundingBox();
  expect(
    Math.abs((tableBoxAfter?.height ?? 0) - (tableBoxBefore?.height ?? 0)),
  ).toBeLessThanOrEqual(2);

  await page.goto(`${repositoryHref}/tree/feature%2Ftree-nav/missing/path`);
  await expect(
    page.getByRole("heading", { name: "Path unavailable" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open default branch" }).click();
  await expect(page).toHaveURL(new RegExp(`${repositoryName}/tree/main$`));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${repositoryHref}/tree/feature%2Ftree-nav/docs?pageSize=30`);
  await expect(page.getByText("Showing 30 of 74 entries")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await expectNoDeadControls(page);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-004-phase4-large-directory-mobile.jpg",
  });
});
