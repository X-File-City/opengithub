import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarketingHome } from "@/components/MarketingHome";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("marketing home", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("renders the Editorial public navigation and auth actions", () => {
    render(<MarketingHome />);

    expect(
      screen.getByRole("heading", {
        name: /a calmer place for code to live/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "opengithub home" }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.queryByText(/primer/i)).not.toBeInTheDocument();
  });

  it("opens mega navigation, closes on Escape, and exposes real links", () => {
    render(<MarketingHome />);

    fireEvent.click(screen.getByRole("button", { name: "Product" }));
    const menu = screen.getByRole("menu", { name: "Product menu" });

    expect(
      within(menu).getByRole("menuitem", { name: /Repositories/i }),
    ).toHaveAttribute("href", "/explore");
    expect(
      within(menu).getByRole("menuitem", { name: /Pull requests/i }),
    ).toHaveAttribute("href", "/pulls");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen.queryByRole("menu", { name: "Product menu" }),
    ).not.toBeInTheDocument();
  });

  it("routes header search and empty search through the real search page", () => {
    render(<MarketingHome />);

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "state:open owner:ashley" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Search opengithub" }));
    expect(push).toHaveBeenCalledWith(
      "/search?q=state%3Aopen%20owner%3Aashley",
    );

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Search opengithub" }));
    expect(push).toHaveBeenCalledWith("/search");
  });

  it("keeps footer links and CTAs navigable without placeholders", () => {
    render(<MarketingHome />);

    expect(
      screen.getByRole("link", { name: "Start with Google" }),
    ).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "API" })).toHaveAttribute(
      "href",
      "/docs/api",
    );
    expect(screen.getByRole("link", { name: "Git" })).toHaveAttribute(
      "href",
      "/docs/git",
    );
    expect(document.body.innerHTML).not.toContain('href="#"');
  });
});
