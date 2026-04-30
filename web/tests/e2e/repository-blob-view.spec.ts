import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

type SeededSession = {
  cookieName: string;
  cookieValue: string;
  treeRepositoryHref: string;
};

function seedSession(extraEnv: Record<string, string> = {}): SeededSession {
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
        ...extraEnv,
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
  const repositoryName = `blob viewer ${Date.now().toString(36)}`;
  const normalizedName = repositoryName.replaceAll(/\s+/g, "-");

  await page.goto("/new");
  await page.getByLabel("Repository name *").fill(repositoryName);
  await page.getByLabel(/Description/).fill("Blob viewer Playwright smoke");
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
  "repository blob view E2E needs TEST_DATABASE_URL or DATABASE_URL",
);

test("signed-in blob page exposes file header actions and code line anchors", async ({
  page,
}) => {
  const seeded = seedSession();
  await signIn(page, seeded);
  const { owner, repositoryName } = await createRepository(page);

  await page.goto(`/${owner}/${repositoryName}/blob/main/src/main.rs`);
  await expect(
    page.getByRole("region", { name: "Repository file viewer" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "src/main.rs" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "#[tokio::main]" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Line 1" })).toHaveAttribute(
    "href",
    "#L1",
  );
  await expect(page.getByLabel("Raw contents of src/main.rs")).toHaveValue(
    /tokio::main/,
  );
  await expect(page.getByRole("link", { name: "Raw" })).toHaveAttribute(
    "href",
    new RegExp(`/${repositoryName}/raw/main/src/main\\.rs$`),
  );
  await expect(page.getByRole("link", { name: "Download" })).toHaveAttribute(
    "href",
    new RegExp(`/${repositoryName}/download/main/src/main\\.rs$`),
  );
  await expect(page.getByRole("link", { name: "Blame" })).toHaveAttribute(
    "href",
    new RegExp(`/${repositoryName}/blob/main/src/main\\.rs\\?view=blame$`),
  );
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-005-final-code-view.jpg",
  });

  await expect(page.getByRole("button", { name: "Symbols" })).toBeVisible();
  await page.getByRole("button", { name: "Symbols" }).click();
  await expect(
    page.getByRole("complementary", { name: "File symbols" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /main/ })).toBeVisible();
  await page.getByLabel("Filter symbols").fill("main");
  await page.getByRole("button", { name: /main/ }).click();
  await expect(page).toHaveURL(/#L4$/);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-005-final-symbol-panel.jpg",
  });

  await page.getByRole("button", { name: "Copy raw" }).click();
  await expect(page.getByRole("status")).toHaveText(/copied|unavailable/);

  await page.keyboard.press("y");
  await expect(page).toHaveURL(
    new RegExp(`/${repositoryName}/blob/[a-z0-9]+/src/main\\.rs$`),
  );
  await page.goto(`/${owner}/${repositoryName}/blob/main/src/main.rs`);

  await page.locator("body").click();
  await page.keyboard.press("b");
  await expect(page).toHaveURL(
    new RegExp(`/${repositoryName}/blob/main/src/main\\.rs\\?view=blame$`),
  );
  await expect(page.getByText("Initial commit").first()).toBeVisible();
  await expect(
    page
      .locator("tbody")
      .getByRole("link", { name: /[a-f0-9]{7} / })
      .first(),
  ).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-005-final-blame-mode.jpg",
  });

  await page.getByRole("button", { name: "Jump to line" }).click();
  await expect(page.getByRole("form", { name: "Jump to line" })).toBeVisible();
  await page.getByRole("spinbutton", { name: "Jump to line" }).fill("2");
  await page.getByRole("button", { name: "Jump", exact: true }).click();
  await expect(page).toHaveURL(/#L2$/);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-005-phase3-blame-shortcuts.jpg",
  });

  await page.keyboard.press("b");
  await expect(page).toHaveURL(
    new RegExp(`/${repositoryName}/blob/main/src/main\\.rs$`),
  );

  const rawResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/${repositoryName}/raw/main/src/main.rs`) &&
      response.status() === 200,
  );
  await page.getByRole("link", { name: "Raw" }).click();
  await rawResponse;
  await expect(page.getByText(/tokio::main/).first()).toBeVisible();
  await page.goBack();

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download" }).click();
  expect((await download).suggestedFilename()).toBe("main.rs");

  await page.getByRole("link", { name: "History" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/${repositoryName}/commits/main/src/main\\.rs$`),
  );
  await expect(
    page.getByRole("link", { name: /Initial commit/ }),
  ).toBeVisible();
  await page.goto(`/${owner}/${repositoryName}/blob/main/src/main.rs`);
  await expect(
    page.getByRole("heading", { name: "src/main.rs" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Go to file" }).click();
  await expect(page.getByLabel("Find a file")).toBeVisible();
  await page.getByLabel("Find a file").fill("Cargo");
  await page.getByRole("link", { name: /Cargo\.toml/ }).click();
  await expect(page).toHaveURL(
    new RegExp(`/${repositoryName}/blob/main/Cargo\\.toml$`),
  );
  await expect(page.getByRole("heading", { name: "Cargo.toml" })).toBeVisible();

  await expectNoDeadControls(page);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-005-phase2-blob-view.jpg",
  });
});

test("blob page handles non-renderable files, invalid paths, branch refs, and mobile layout", async ({
  page,
}) => {
  const seeded = seedSession({
    DASHBOARD_E2E_TREE_REFS: "1",
    DASHBOARD_E2E_BLOB_EDGE: "1",
  });
  await signIn(page, seeded);
  expect(seeded.treeRepositoryHref).toMatch(/^\/[^/]+\/[^/]+$/);

  const [owner, repositoryName] = seeded.treeRepositoryHref.slice(1).split("/");
  await page.goto(`${seeded.treeRepositoryHref}/blob/main/assets/app.bin`);
  await expect(
    page.getByRole("heading", { name: "assets/app.bin" }),
  ).toBeVisible();
  await expect(
    page.getByText("This binary file cannot be previewed inline."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Raw", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-005-final-binary-fallback.jpg",
  });

  await page.goto(`${seeded.treeRepositoryHref}/blob/main/logs/large.txt`);
  await expect(
    page.getByRole("heading", { name: "logs/large.txt" }),
  ).toBeVisible();
  await expect(page.getByText(/too large to render inline/)).toBeVisible();

  await page.goto(`${seeded.treeRepositoryHref}/blob/main/missing/file.rs`);
  await expect(
    page.getByRole("heading", { name: "File unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to repository" }),
  ).toHaveAttribute("href", seeded.treeRepositoryHref);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-005-final-invalid-path.jpg",
  });

  await page.goto(
    `${seeded.treeRepositoryHref}/blob/feature%2Ftree-nav/docs/guide.md`,
  );
  await expect(
    page.getByRole("heading", { name: "docs/guide.md" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "# Feature guide" }),
  ).toBeVisible();

  await page.goto(
    `${seeded.treeRepositoryHref}/blob/main/docs/symbols.md?symbols=1`,
  );
  await expect(
    page.getByRole("complementary", { name: "File symbols" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Install/ })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${seeded.treeRepositoryHref}/blob/main/src/main.rs`);
  await expect(
    page.getByRole("region", { name: "Repository file viewer" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expectNoDeadControls(page);
  await page.screenshot({
    fullPage: true,
    path: "../ralph/screenshots/build/repo-005-final-mobile.jpg",
  });

  const rawResponse = await page.request.get(
    `http://localhost:3015/${owner}/${repositoryName}/raw/main/src/main.rs`,
  );
  expect(rawResponse.status()).toBe(200);
  await expect(page.getByRole("link", { name: "History" })).toHaveAttribute(
    "href",
    new RegExp(`/${repositoryName}/commits/main/src/main\\.rs$`),
  );
});
