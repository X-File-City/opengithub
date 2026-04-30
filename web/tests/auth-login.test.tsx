import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import { AppShell } from "@/components/AppShell";
import {
  getSessionFromCookie,
  googleStartUrl,
  sanitizeNextPath,
} from "@/lib/api";
import {
  isProtectedPath,
  loginRedirectUrl,
  preservedNextPath,
} from "@/lib/protected-routes";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

describe("login page", () => {
  it("builds a Google OAuth start URL with the requested next path", () => {
    expect(googleStartUrl("/dashboard")).toBe(
      "http://localhost:3016/api/auth/google/start?next=%2Fdashboard",
    );
  });

  it("normalizes unsafe next paths before OAuth", () => {
    expect(sanitizeNextPath("https://evil.example/dashboard")).toBe(
      "/dashboard",
    );
    expect(sanitizeNextPath("//evil.example/dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("/\\evil")).toBe("/dashboard");
    expect(
      sanitizeNextPath("/dashboard\r\nLocation: https://evil.example"),
    ).toBe("/dashboard");
    expect(sanitizeNextPath("/repos/acme/widget")).toBe("/repos/acme/widget");
  });

  it("renders only the Google login action and no password fields", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/dashboard" }),
      }),
    );

    const button = screen.getByRole("link", { name: /continue with google/i });
    expect(button).toHaveAttribute(
      "href",
      "http://localhost:3016/api/auth/google/start?next=%2Fdashboard",
    );
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/continue with apple/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/passkey/i)).not.toBeInTheDocument();
  });

  it("shows the callback failure inline", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({ error: "oauth_failed" }),
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Google sign-in could not be completed",
    );
  });
});

describe("protected app routes", () => {
  it("matches authenticated app paths without capturing public pages", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/dashboard/activity")).toBe(true);
    expect(isProtectedPath("/new")).toBe(true);
    expect(isProtectedPath("/settings/profile")).toBe(true);
    expect(isProtectedPath("/octo/hello/settings/hooks")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/octo/hello")).toBe(false);
  });

  it("preserves protected destinations in the login redirect", () => {
    const request = {
      url: "http://localhost:3015/dashboard?tab=activity",
      nextUrl: new URL("http://localhost:3015/dashboard?tab=activity"),
    };

    expect(preservedNextPath(request)).toBe("/dashboard?tab=activity");
    expect(loginRedirectUrl(request).toString()).toBe(
      "http://localhost:3015/login?next=%2Fdashboard%3Ftab%3Dactivity",
    );
  });

  it("treats session API fetch failures as anonymous", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("connect refused")),
    );

    await expect(getSessionFromCookie("__Host-session=value")).resolves.toEqual(
      {
        authenticated: false,
        user: null,
      },
    );

    vi.unstubAllGlobals();
  });
});

describe("app shell", () => {
  it("renders the signed-in avatar menu and sign-out affordance", () => {
    render(
      <AppShell
        session={{
          authenticated: true,
          user: {
            id: "user-1",
            email: "mona@example.com",
            display_name: "Mona Lisa",
            avatar_url: null,
          },
        }}
      >
        <p>Dashboard content</p>
      </AppShell>,
    );

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    expect(screen.getAllByText("Mona Lisa")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Sign out" })).toHaveAttribute(
      "href",
      "/logout",
    );
  });

  it("renders a sign-in CTA for anonymous public shells", () => {
    render(
      <AppShell session={{ authenticated: false, user: null }}>
        <p>Public content</p>
      </AppShell>,
    );

    expect(screen.getByText("Public content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
