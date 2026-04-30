import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/AppShell";
import { DeveloperTokensPage } from "@/components/DeveloperTokensPage";

describe("DeveloperTokensPage", () => {
  it("renders opengithub token workflow docs without placeholder controls", () => {
    const { container } = render(<DeveloperTokensPage />);

    expect(
      screen.getByRole("heading", { name: "Personal access tokens" }),
    ).toBeVisible();
    expect(screen.getByText("Token quickstart")).toBeVisible();
    expect(screen.getByText("repo:read")).toBeVisible();
    expect(screen.getByText("repo:write")).toBeVisible();
    expect(screen.getByText("api:read")).toBeVisible();
    expect(screen.getByText("api:write")).toBeVisible();
    expect(
      screen.getByText((content) =>
        content.includes("https://opengithub.namuh.co/api/user"),
      ),
    ).toBeVisible();
    expect(container).not.toHaveTextContent("api.github.com");
    expect(
      container.querySelectorAll('a[href="#"], a:not([href])'),
    ).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /create token/i })).toBeNull();
  });

  it("copies token command snippets", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<DeveloperTokensPage />);

    fireEvent.click(screen.getByRole("button", { name: "Copy API curl" }));

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("https://opengithub.namuh.co/api/user"),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Copied");
  });

  it("links signed-in users to developer settings from the avatar menu", () => {
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
        <DeveloperTokensPage />
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open user menu" }));
    expect(
      screen.getByRole("menuitem", { name: "Developer settings" }),
    ).toHaveAttribute("href", "/settings/tokens");
  });
});
