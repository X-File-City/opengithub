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

async function expectNoDeadRepositoryCreateControls(page: Page) {
  await expect(page.locator('a[href="#"], a:not([href])')).toHaveCount(0);

  for (const button of await page.locator("button:visible").all()) {
    await expect(button).toHaveAccessibleName(/.+/);
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
}

test.skip(
  !databaseUrl,
  "repository create E2E needs TEST_DATABASE_URL or DATABASE_URL",
);

test("signed-in repository creation options render and check availability", async ({
  page,
}) => {
  const seeded = seedSession();
  await signIn(page, seeded);

  await page.goto("/new");
  await expectNoDeadRepositoryCreateControls(page);

  await expect(
    page.getByRole("heading", { name: "Create a new repository" }),
  ).toBeVisible();
  await expect(page.getByLabel("Owner *")).toHaveValue(/.+/);
  await expect(page.getByLabel("Repository name *")).toBeVisible();
  await expect(page.getByLabel(/Description/)).toHaveAttribute(
    "maxlength",
    "350",
  );
  await expect(
    page.getByRole("combobox", { name: /Choose visibility/ }),
  ).toHaveValue("public");
  await expect(
    page.getByRole("combobox", { name: /Start with a template/ }),
  ).toContainText("No template");
  await expect(
    page.getByRole("button", { name: "Create repository" }),
  ).toBeDisabled();

  await page
    .getByLabel("Repository name *")
    .fill(`phase one!! ${Date.now().toString(36)}`);
  await expect(page.getByText(/normalized to/)).toContainText("phase-one-");
  await page.getByLabel("Repository name *").blur();
  await expect(page.getByText(/is available\./)).toBeVisible();

  await page.getByRole("button", { name: "Off" }).click();
  await expect(page.getByRole("button", { name: "On" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByText("Add .gitignore").click();
  await expect(page.getByLabel("Search gitignore templates")).toBeFocused();
  await page.getByLabel("Search gitignore templates").fill("rust");
  const gitignoreListbox = page.getByRole("listbox");
  await expect(
    gitignoreListbox.getByRole("option", { name: /Rust/ }),
  ).toBeVisible();
  await gitignoreListbox.getByRole("option", { name: /Rust/ }).click();
  await expect(
    page.getByText(/Ignore Rust build artifacts/).first(),
  ).toBeVisible();
  await expectNoDeadRepositoryCreateControls(page);
});

test("signed-in repository creation submits, redirects, and reports duplicates", async ({
  page,
}) => {
  const seeded = seedSession();
  await signIn(page, seeded);
  const repositoryName = `playwright repo ${Date.now().toString(36)}`;

  await page.goto("/new");
  await page.getByLabel("Repository name *").fill(repositoryName);
  await page
    .getByLabel(/Description/)
    .fill("Created by the Playwright submit flow");
  await page
    .getByRole("combobox", { name: /Choose visibility/ })
    .selectOption("private");
  await page
    .getByRole("combobox", { name: /Start with a template/ })
    .selectOption("rust-axum");
  await page.getByRole("button", { name: "Off" }).click();
  await page.getByText("Add .gitignore").click();
  await page.getByLabel("Search gitignore templates").fill("rust");
  await page.getByRole("listbox").getByRole("option", { name: /Rust/ }).click();
  await page.getByRole("combobox", { name: /Add license/ }).selectOption("mit");
  await page.getByRole("button", { name: "Create repository" }).click();

  const normalizedName = repositoryName.replaceAll(/\s+/g, "-");
  await expect(page).toHaveURL(new RegExp(`/${normalizedName}$`));
  await expect(
    page.getByRole("heading", { name: normalizedName }),
  ).toBeVisible();
  await expect(page.getByText("private")).toBeVisible();
  await expect(page.getByText("Default branch")).toBeVisible();
  await expect(
    page
      .locator("p")
      .filter({ hasText: "Created by the Playwright submit flow" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /README\.md/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /\.gitignore/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /LICENSE/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Cargo\.toml/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "README.md" })).toBeVisible();
  await expect(
    page.getByText("Generated from a repository template."),
  ).toBeVisible();

  await page.goto("/new");
  await page.getByLabel("Repository name *").fill(repositoryName);
  await page.getByRole("button", { name: "Create repository" }).click();
  await expect(page.getByText(/already exists|duplicate/i)).toBeVisible();
  await expect(page.getByLabel("Repository name *")).toHaveValue(
    repositoryName,
  );

  const recoveredRepositoryName = `recovered repo ${Date.now().toString(36)}`;
  const recoveredNormalizedName = recoveredRepositoryName.replaceAll(
    /\s+/g,
    "-",
  );
  await page.getByLabel("Repository name *").fill(recoveredRepositoryName);
  await page.getByLabel("Repository name *").blur();
  await expect(
    page.getByText(`${recoveredNormalizedName} is available.`),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create repository" }).click();
  await expect(page).toHaveURL(new RegExp(`/${recoveredNormalizedName}$`));
});

test("repository creation form is keyboard-accessible and mobile-safe", async ({
  page,
}) => {
  const seeded = seedSession();
  await signIn(page, seeded);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/new");

  await expectNoHorizontalOverflow(page);
  await page.getByLabel("Repository name *").fill("mobile repo!");
  await expect(page.getByText(/normalized to/)).toContainText("mobile-repo");
  await page.getByLabel(/Description/).fill("x".repeat(350));
  await expect(page.getByText("350")).toBeVisible();

  const gitignoreSummary = page.locator("summary").filter({
    hasText: "Add .gitignore",
  });
  await gitignoreSummary.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Search gitignore templates")).toBeFocused();
  await page.keyboard.type("node");
  await expect(
    page.getByRole("listbox").getByRole("option", { name: /Node/ }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(/Ignore Node\.js dependencies/).first(),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
