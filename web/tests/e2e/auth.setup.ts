import { test as setup } from "@playwright/test";

setup("prepare anonymous auth state", async ({ page }) => {
  await page.goto("/login");
  await page
    .context()
    .storageState({ path: "playwright/.auth/anonymous.json" });
});
