import { test as setup } from "@playwright/test";

const authStatePath = "playwright/.auth/anonymous.json";

setup("prepare anonymous auth state", async ({ page }) => {
  // Keep the default setup deterministic and local. A real authenticated
  // browser state requires a Postgres-backed session plus a signed Rust cookie,
  // so QA should create it through Google OAuth or a test DB bootstrap flow.
  await page.goto("/login");
  await page.context().storageState({ path: authStatePath });
});
