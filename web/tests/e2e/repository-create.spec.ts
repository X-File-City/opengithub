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
    .fill(`phase-one-${Date.now().toString(36)}`);
  await page.getByLabel("Repository name *").blur();
  await expect(page.getByRole("status")).toContainText("is available");

  await page.getByRole("button", { name: "Off" }).click();
  await expect(page.getByRole("button", { name: "On" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByText("Add .gitignore").click();
  await page.getByLabel("Search gitignore templates").fill("rust");
  const gitignoreListbox = page.getByRole("listbox");
  await expect(
    gitignoreListbox.getByRole("option", { name: /Rust/ }),
  ).toBeVisible();
  await gitignoreListbox.getByRole("option", { name: /Rust/ }).click();
  await expect(
    page.getByText(/Ignore Rust build artifacts/).first(),
  ).toBeVisible();
  await expect(page.locator('a[href="#"], a:not([href])')).toHaveCount(0);
});
