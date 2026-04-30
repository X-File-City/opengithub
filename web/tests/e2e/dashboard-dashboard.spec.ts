import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

type SeededDashboard = {
  cookieName: string;
  cookieValue: string;
  firstRepositoryHref: string;
  secondRepositoryHref: string;
};

function seedDashboard(): SeededDashboard {
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
      env: { ...process.env, SESSION_COOKIE_NAME: "og_session" },
    },
  ).toString();
  return JSON.parse(output) as SeededDashboard;
}

async function signIn(page: Page, seeded: SeededDashboard) {
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
  "dashboard signed-in E2E needs TEST_DATABASE_URL or DATABASE_URL",
);

test("signed-in dashboard filters top repositories and navigates rows", async ({
  page,
}) => {
  const seeded = seedDashboard();
  await signIn(page, seeded);

  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Top repositories" }),
  ).toBeVisible();
  const newRepositoryLink = page.getByRole("link", {
    exact: true,
    name: "New",
  });
  await expect(newRepositoryLink).toHaveAttribute("href", "/new");
  await expect(page.getByText("Rust")).toBeVisible();
  await expect(page.getByText("TypeScript")).toBeVisible();

  const topRepositories = page.getByRole("complementary", {
    name: "Top repositories",
  });
  await page.getByLabel("Find a repository").fill("infra");
  const filteredRepository = topRepositories.getByRole("link", {
    name: /infra-/,
  });
  await expect(filteredRepository).toBeVisible();
  await expect(
    topRepositories.getByRole("link", { name: /alpha-/ }),
  ).toHaveCount(0);

  await filteredRepository.click();
  await expect(page).toHaveURL(new RegExp(`${seeded.secondRepositoryHref}$`));

  await page.goto("/dashboard");
  await newRepositoryLink.click();
  await expect(page).toHaveURL(/\/new$/);
});
