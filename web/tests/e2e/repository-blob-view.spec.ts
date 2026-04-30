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
  await expect(page.getByRole("link", { name: "Symbols" })).toHaveAttribute(
    "href",
    new RegExp(`/${repositoryName}/blob/main/src/main\\.rs\\?symbols=1$`),
  );

  await page.getByRole("button", { name: "Copy raw" }).click();
  await expect(page.getByRole("status")).toHaveText(/copied|unavailable/);

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
