import { expect, test } from "@playwright/test";

test("anonymous dashboard requests redirect to the login card", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login\?next=\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to opengithub" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue with Google" }),
  ).toBeVisible();
});

test("login page renders only the Google OAuth option and callback errors", async ({
  page,
}) => {
  await page.goto("/login?error=oauth_failed&next=/dashboard");

  await expect(
    page.getByText("Google sign-in could not be completed"),
  ).toBeVisible();
  await expect(
    page.getByText("Google sign-in could not be completed"),
  ).toContainText("Google sign-in could not be completed");
  await expect(
    page.getByRole("link", { name: "Continue with Google" }),
  ).toHaveAttribute(
    "href",
    "http://localhost:3016/api/auth/google/start?next=%2Fdashboard",
  );
  await expect(page.getByLabel(/email/i)).toHaveCount(0);
  await expect(page.getByLabel(/password/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /sign in/i })).toHaveCount(0);
});

test("OAuth start redirects to Google with a sanitized next path", async ({
  request,
}) => {
  const response = await request.get(
    "http://localhost:3016/api/auth/google/start?next=https://evil.example/path",
    { maxRedirects: 0 },
  );

  expect(response.status()).toBe(302);
  const location = response.headers().location;
  expect(location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
  expect(location).toContain("client_id=");
  expect(location).toContain("scope=openid+email+profile");
  expect(location).not.toContain("evil.example");
});

test("callback and logout failures return users to safe pages", async ({
  page,
}) => {
  await page.goto(
    "http://localhost:3016/api/auth/google/callback?error=access_denied",
  );
  await expect(page).toHaveURL(
    "http://localhost:3015/login?error=oauth_failed",
  );
  await expect(
    page.getByText("Google sign-in could not be completed"),
  ).toBeVisible();
  await expect(
    page.getByText("Google sign-in could not be completed"),
  ).toContainText("Google sign-in could not be completed");

  await page.goto("/logout");
  await expect(page).toHaveURL("http://localhost:3015/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});
