import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import { googleStartUrl, sanitizeNextPath } from "@/lib/api";

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
