import { expect, type Page, test } from "@playwright/test";

async function expectNoDeadLinksOrButtons(page: Page) {
  const deadLinks = await page.locator('a[href="#"], a:not([href])').count();
  expect(deadLinks).toBe(0);

  for (const button of await page.locator("button").all()) {
    await expect(button).toHaveAccessibleName(/.+/);
    await expect(button).not.toBeDisabled();
  }
}

test("dashboard onboarding protected CTAs preserve their intended destinations", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expectNoDeadLinksOrButtons(page);

  await page.goto("/new");
  await expect(page).toHaveURL(/\/login\?next=%2Fnew$/);

  await page.goto("/new/import");
  await expect(page).toHaveURL(/\/login\?next=%2Fnew%2Fimport$/);
});

test("setup guide destination is reachable and links back into repository creation", async ({
  page,
}) => {
  await page.goto("/docs/get-started");

  await expect(
    page.getByRole("heading", {
      name: "Get started with your first repository",
    }),
  ).toBeVisible();
  const createRepository = page.getByRole("link", {
    name: "Create repository",
  });
  await expect(createRepository).toHaveAttribute("href", "/new");
  await expectNoDeadLinksOrButtons(page);

  await createRepository.click();
  await expect(page).toHaveURL(/\/login\?next=%2Fnew$/);
});

test("repository overview destination remains navigable from dashboard rows", async ({
  page,
}) => {
  await page.goto("/mona/octo-app");

  await expect(page.getByRole("heading", { name: "octo-app" })).toBeVisible();
  await expect(
    page.getByText("Repository metadata is unavailable in this session."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to dashboard" }),
  ).toHaveAttribute("href", "/dashboard");
  await expectNoDeadLinksOrButtons(page);
});
