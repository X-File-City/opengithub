import { expect, test } from "@playwright/test";

test("syntax highlighting docs page supports code-viewer controls", async ({
  page,
}) => {
  await page.goto("/docs/highlight");

  await expect(
    page.getByRole("heading", { name: "Syntax highlighting" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "src/repository.ts" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { exact: true, name: "Permalink line 1" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Add comment on line 1" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /repositoryPath/ }),
  ).toBeVisible();

  await page.getByLabel("Find").fill("settings");
  await expect(page.locator(".code-line-match")).toHaveCount(1);

  await page.getByRole("button", { name: "Wrap" }).click();
  await expect(page.getByRole("button", { name: "Wrap" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByLabel("Language").selectOption("rust");
  await expect(page.getByText(/rust ·/)).toBeVisible();
  await expect(page.locator('a[href="#"], a:not([href])')).toHaveCount(0);
});
