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
import { POST as createRepositoryRoute } from "@/app/new/repositories/route";
import { RepositoryCreateForm } from "@/components/RepositoryCreateForm";
import type { CreatedRepository, RepositoryCreationOptions } from "@/lib/api";
import {
  createRepositoryFromCookie,
  getRepositoryCreationOptionsFromCookie,
  repositoryNameAvailabilityPath,
} from "@/lib/api";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

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

function createdRepository(): CreatedRepository {
  return {
    id: "repo-1",
    owner_user_id: "user-1",
    owner_organization_id: null,
    owner_login: "mona",
    name: "my-new-repo",
    description: "Created through the form",
    visibility: "public",
    default_branch: "main",
    is_archived: false,
    created_by_user_id: "user-1",
    created_at: "2026-04-30T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
    href: "/mona/my-new-repo",
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  routerPush.mockReset();
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

  it("creates repositories with the signed session cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(createdRepository()), {
        status: 201,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("API_URL", "http://api.local");

    await expect(
      createRepositoryFromCookie("og_session=value", {
        ownerType: "user",
        ownerId: "user-1",
        name: "my new repo",
        description: "Created through the form",
        visibility: "public",
        defaultBranch: "main",
      }),
    ).resolves.toMatchObject({ href: "/mona/my-new-repo" });
    expect(fetchMock).toHaveBeenCalledWith("http://api.local/api/repos", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "og_session=value",
      },
      body: JSON.stringify({
        ownerType: "user",
        ownerId: "user-1",
        name: "my new repo",
        description: "Created through the form",
        visibility: "public",
        defaultBranch: "main",
      }),
      cache: "no-store",
    });
  });

  it("proxies repository creation and preserves API error envelopes", async () => {
    const successFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(createdRepository()), {
        status: 201,
      }),
    );
    vi.stubGlobal("fetch", successFetch);
    vi.stubEnv("API_URL", "http://api.local");
    const successRequest = new Request(
      "http://localhost:3015/new/repositories",
      {
        method: "POST",
        headers: {
          cookie: "og_session=value",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ownerType: "user",
          ownerId: "user-1",
          name: "my new repo",
          description: "Created through the form",
          visibility: "public",
          defaultBranch: "main",
        }),
      },
    ) as NextRequest;

    const successResponse = await createRepositoryRoute(successRequest);
    expect(successResponse.status).toBe(201);
    await expect(successResponse.json()).resolves.toMatchObject({
      href: "/mona/my-new-repo",
    });

    const conflictFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "conflict",
            message: "A repository with this name already exists.",
          },
          status: 409,
        }),
        { status: 409 },
      ),
    );
    vi.stubGlobal("fetch", conflictFetch);
    const conflictRequest = new Request(
      "http://localhost:3015/new/repositories",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ownerType: "user",
          ownerId: "user-1",
          name: "my-new-repo",
          visibility: "public",
        }),
      },
    ) as NextRequest;

    const conflictResponse = await createRepositoryRoute(conflictRequest);
    expect(conflictResponse.status).toBe(409);
    await expect(conflictResponse.json()).resolves.toMatchObject({
      error: { code: "conflict" },
      status: 409,
    });
  });
});

describe("RepositoryCreateForm", () => {
  it("renders GitHub-style owner, name, configuration, and submit controls", () => {
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

  it("submits repository creation and redirects without clearing selected fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(createdRepository()), {
        status: 201,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<RepositoryCreateForm options={creationOptions()} />);

    fireEvent.change(screen.getByLabelText("Repository name *"), {
      target: { value: "my new repo" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "Created through the form" },
    });
    fireEvent.change(
      screen.getByRole("combobox", { name: /Choose visibility/ }),
      {
        target: { value: "private" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Create repository" }));

    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith("/mona/my-new-repo"),
    );
    expect(fetchMock).toHaveBeenCalledWith("/new/repositories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ownerType: "user",
        ownerId: "user-1",
        name: "my new repo",
        description: "Created through the form",
        visibility: "private",
        defaultBranch: "main",
      }),
    });
  });

  it("keeps form values and shows inline conflict errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "conflict",
            message: "A repository with this name already exists.",
          },
          status: 409,
        }),
        { status: 409 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<RepositoryCreateForm options={creationOptions()} />);

    fireEvent.change(screen.getByLabelText("Repository name *"), {
      target: { value: "my-new-repo" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "Keep me" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create repository" }));

    await waitFor(() =>
      expect(
        screen.getByText("A repository with this name already exists."),
      ).toBeVisible(),
    );
    expect(screen.getByLabelText("Repository name *")).toHaveValue(
      "my-new-repo",
    );
    expect(screen.getByLabelText(/Description/)).toHaveValue("Keep me");
    expect(routerPush).not.toHaveBeenCalled();
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
