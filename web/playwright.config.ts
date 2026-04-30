import { defineConfig, devices } from "@playwright/test";

const port = 3015;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: "cd .. && make dev",
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      APP_URL: `http://localhost:${port}`,
      PUBLIC_APP_URL: `http://localhost:${port}`,
      API_URL: "http://localhost:3016",
      AUTH_GOOGLE_ID: "playwright-client-id.apps.googleusercontent.com",
      AUTH_GOOGLE_SECRET: "playwright-client-secret",
      SESSION_SECRET: "playwright-session-secret-with-enough-entropy",
      SESSION_COOKIE_SECURE: "false",
    },
  },
});
