import { expect, test } from "@playwright/test";

test("markdown docs page renders sample and live preview", async ({ page }) => {
  await page.goto("/docs/markdown");

  await expect(
    page.getByRole("heading", { name: "Markdown rendering" }).first(),
  ).toBeVisible();
  await expect(page.getByText("Rendered sample")).toBeVisible();
  await expect(page.getByRole("cell", { name: "README.md" })).toBeVisible();
  await expect(page.getByRole("button", { name: "B" })).toBeVisible();

  await page.getByRole("button", { name: "B" }).click();
  await expect(page.getByLabel("Markdown source")).toHaveValue(
    /[\s\S]*\*\*bold\*\*/,
  );

  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(
    page
      .getByLabel("Markdown editor", { exact: true })
      .getByText('export const preview = "rendered by Rust";'),
  ).toBeVisible();
  await expect(page.locator('a[href="#"], a:not([href])')).toHaveCount(0);
});
