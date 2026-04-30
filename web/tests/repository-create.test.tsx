import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as nameAvailabilityRoute } from "@/app/new/name-availability/route";
import { RepositoryCreateForm } from "@/components/RepositoryCreateForm";
import type { RepositoryCreationOptions } from "@/lib/api";
import {
  getRepositoryCreationOptionsFromCookie,
  repositoryNameAvailabilityPath,
} from "@/lib/api";

function creationOptions(): RepositoryCreationOptions {
  return {
    owners: [
      {
        ownerType: "user",
        id: "user-1",
        login: "mona",
        displayName: "Mona",
        avatarUrl: null,
      },
      {
        ownerType: "organization",
        id: "org-1",
        login: "octo-org",
        displayName: "Octo Org",
        avatarUrl: null,
      },
    ],
    templates: [
      {
        slug: "blank",
        displayName: "No template",
        description: "Start from an empty repository.",
      },
      {
        slug: "rust-axum",
        displayName: "Rust Axum service",
        description: "Starter layout for a Rust HTTP service.",
      },
    ],
    gitignoreTemplates: [
      {
        slug: "node",
        displayName: "Node",
        description: "Ignore Node.js dependencies.",
      },
      {
        slug: "rust",
        displayName: "Rust",
        description: "Ignore Rust build artifacts.",
      },
    ],
    licenseTemplates: [
      {
        slug: "mit",
        displayName: "MIT License",
        description: "A short and permissive license.",
      },
    ],
    suggestedName: "silver-train",
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("repository creation API helpers", () => {
  it("loads creation options with the signed session cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(creationOptions()), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("API_URL", "http://api.local");

    const options =
      await getRepositoryCreationOptionsFromCookie("og_session=value");

    expect(options?.owners[0]).toMatchObject({ login: "mona" });
    expect(options?.suggestedName).toBe("silver-train");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.local/api/repos/creation-options",
      {
        headers: { cookie: "og_session=value" },
        cache: "no-store",
      },
    );
  });

  it("builds the name availability query path", () => {
    expect(
      repositoryNameAvailabilityPath({
        ownerType: "organization",
        ownerId: "org-1",
        name: "my new repo",
      }),
    ).toBe(
      "/api/repos/name-availability?ownerType=organization&ownerId=org-1&name=my+new+repo",
    );
  });

  it("proxies name availability through the same-origin route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ownerType: "user",
          ownerId: "user-1",
          ownerLogin: "mona",
          requestedName: "my repo",
          normalizedName: "my-repo",
          available: true,
          reason: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("API_URL", "http://api.local");

    const request = new Request(
      "http://localhost:3015/new/name-availability?ownerType=user&ownerId=user-1&name=my%20repo",
      { headers: { cookie: "og_session=value" } },
    ) as NextRequest;
    Object.defineProperty(request, "nextUrl", {
      value: new URL(request.url),
    });

    const response = await nameAvailabilityRoute(request);
    await expect(response.json()).resolves.toMatchObject({
      normalizedName: "my-repo",
      available: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.local/api/repos/name-availability?ownerType=user&ownerId=user-1&name=my+repo",
      {
        headers: { cookie: "og_session=value" },
        cache: "no-store",
      },
    );
  });
});

describe("RepositoryCreateForm", () => {
  it("renders GitHub-style owner, name, configuration, and disabled submit controls", () => {
    render(<RepositoryCreateForm options={creationOptions()} />);

    expect(
      screen.getByRole("heading", { name: "Create a new repository" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Owner *")).toHaveValue("user:user-1");
    expect(screen.getByLabelText("Repository name *")).toBeVisible();
    expect(screen.getByLabelText(/Description/)).toHaveAttribute(
      "maxlength",
      "350",
    );
    expect(
      screen.getByRole("combobox", { name: /Choose visibility/ }),
    ).toHaveValue("public");
    expect(
      screen.getByRole("combobox", { name: /Start with a template/ }),
    ).toHaveValue("blank");
    expect(
      screen.getByRole("button", { name: "Create repository" }),
    ).toBeDisabled();
    expect(screen.queryByRole("link", { name: "#" })).not.toBeInTheDocument();
  });

  it("normalizes spaces, fills suggested names, and reports availability", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ownerType: "user",
          ownerId: "user-1",
          ownerLogin: "mona",
          requestedName: "silver-train",
          normalizedName: "silver-train",
          available: true,
          reason: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<RepositoryCreateForm options={creationOptions()} />);

    fireEvent.change(screen.getByLabelText("Repository name *"), {
      target: { value: "my new repo" },
    });
    expect(screen.getByText(/normalized to/)).toHaveTextContent("my-new-repo");

    fireEvent.click(screen.getByRole("button", { name: "silver-train" }));
    await waitFor(() =>
      expect(screen.getByText("silver-train is available.")).toBeVisible(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/new/name-availability?ownerType=user&ownerId=user-1&name=silver-train",
    );
  });

  it("opens gitignore selector, filters options, and toggles README", () => {
    render(<RepositoryCreateForm options={creationOptions()} />);

    fireEvent.click(screen.getByRole("button", { name: "Off" }));
    expect(screen.getByRole("button", { name: "On" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByText("Add .gitignore"));
    fireEvent.change(screen.getByLabelText("Search gitignore templates"), {
      target: { value: "rust" },
    });
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByRole("option", { name: /Rust/ })).toBeVisible();
    expect(within(listbox).queryByRole("option", { name: /Node/ })).toBeNull();
    fireEvent.click(within(listbox).getByRole("option", { name: /Rust/ }));
    expect(screen.getAllByText("Rust").length).toBeGreaterThan(0);
  });
});
