import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as readImportRoute } from "@/app/new/imports/[importId]/route";
import { POST as createImportRoute } from "@/app/new/imports/route";
import {
  importNameFromUrl,
  RepositoryImportForm,
} from "@/components/RepositoryImportForm";
import { RepositoryImportStatusPanel } from "@/components/RepositoryImportStatusPanel";
import type {
  RepositoryCreationOptions,
  RepositoryImportStatus,
} from "@/lib/api";
import {
  createRepositoryImportFromCookie,
  getRepositoryImportFromCookie,
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
    templates: [],
    gitignoreTemplates: [],
    licenseTemplates: [],
    suggestedName: "silver-train",
  };
}

function repositoryImport(
  overrides: Partial<RepositoryImportStatus> = {},
): RepositoryImportStatus {
  return {
    id: "import-1",
    repositoryId: "repo-1",
    requestedByUserId: "user-1",
    source: {
      url: "https://github.com/octocat/Hello-World.git",
      host: "github.com",
      path: "/octocat/Hello-World.git",
    },
    status: "queued",
    progressMessage: "Repository import has been queued.",
    errorCode: null,
    errorMessage: null,
    jobLeaseId: "job-1",
    repositoryHref: "/mona/hello-world",
    statusHref: "/new/import/import-1",
    createdAt: "2026-04-30T00:00:00Z",
    updatedAt: "2026-04-30T00:00:00Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  routerPush.mockReset();
});

describe("repository import API helpers", () => {
  it("creates imports with the signed session cookie and redacted response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(repositoryImport()), {
        status: 201,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("API_URL", "http://api.local");

    await expect(
      createRepositoryImportFromCookie("og_session=value", {
        sourceUrl: "https://github.com/octocat/Hello-World.git",
        sourceUsername: "octocat",
        sourceToken: "secret-token",
        sourcePassword: null,
        ownerType: "user",
        ownerId: "user-1",
        name: "hello-world",
        description: "Imported from GitHub",
        visibility: "private",
      }),
    ).resolves.toMatchObject({
      statusHref: "/new/import/import-1",
      repositoryHref: "/mona/hello-world",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.local/api/repos/imports",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "og_session=value",
        },
        body: JSON.stringify({
          sourceUrl: "https://github.com/octocat/Hello-World.git",
          sourceUsername: "octocat",
          sourceToken: "secret-token",
          sourcePassword: null,
          ownerType: "user",
          ownerId: "user-1",
          name: "hello-world",
          description: "Imported from GitHub",
          visibility: "private",
        }),
        cache: "no-store",
      },
    );
  });

  it("reads an import status with the signed session cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(repositoryImport({ status: "imported" })), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("API_URL", "http://api.local");

    await expect(
      getRepositoryImportFromCookie("og_session=value", "import-1"),
    ).resolves.toMatchObject({ status: "imported" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.local/api/repos/imports/import-1",
      {
        headers: { cookie: "og_session=value" },
        cache: "no-store",
      },
    );
  });

  it("proxies create/read routes and preserves API errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(repositoryImport()), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: "validation_failed",
              message: "import source host is not allowed",
            },
            status: 422,
          }),
          { status: 422 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(repositoryImport({ status: "importing" })),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("API_URL", "http://api.local");

    const successRequest = new Request("http://localhost:3015/new/imports", {
      method: "POST",
      headers: {
        cookie: "og_session=value",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sourceUrl: "https://github.com/octocat/Hello-World.git",
        ownerType: "user",
        ownerId: "user-1",
        name: "hello-world",
        visibility: "public",
      }),
    }) as NextRequest;

    const successResponse = await createImportRoute(successRequest);
    expect(successResponse.status).toBe(201);
    await expect(successResponse.json()).resolves.toMatchObject({
      statusHref: "/new/import/import-1",
    });

    const failureRequest = new Request("http://localhost:3015/new/imports", {
      method: "POST",
      headers: {
        cookie: "og_session=value",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sourceUrl: "https://127.0.0.1/repo.git",
        ownerType: "user",
        ownerId: "user-1",
        name: "repo",
        visibility: "public",
      }),
    }) as NextRequest;
    const failureResponse = await createImportRoute(failureRequest);
    expect(failureResponse.status).toBe(422);
    await expect(failureResponse.json()).resolves.toMatchObject({
      error: { message: "import source host is not allowed" },
    });

    const readRequest = new Request(
      "http://localhost:3015/new/imports/import-1",
      { headers: { cookie: "og_session=value" } },
    ) as NextRequest;
    const readResponse = await readImportRoute(readRequest, {
      params: Promise.resolve({ importId: "import-1" }),
    });
    await expect(readResponse.json()).resolves.toMatchObject({
      status: "importing",
    });
  });
});

describe("RepositoryImportForm", () => {
  it("renders all required wizard controls without inert links", () => {
    const { container } = render(
      <RepositoryImportForm options={creationOptions()} />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Import your project to opengithub",
      }),
    ).toBeVisible();
    expect(screen.getByLabelText("Source repository URL *")).toBeVisible();
    expect(
      screen.getByText("Optional credentials for private sources"),
    ).toBeVisible();
    expect(screen.getByLabelText("Owner *")).toHaveValue("user:user-1");
    expect(screen.getByLabelText("Repository name *")).toBeVisible();
    expect(screen.getByLabelText("Public")).toBeChecked();
    expect(screen.getByRole("button", { name: "Begin import" })).toBeDisabled();
    expect(
      container.querySelectorAll('a[href="#"], a:not([href])'),
    ).toHaveLength(0);
  });

  it("derives destination names from Git URLs", () => {
    expect(
      importNameFromUrl("https://github.com/octocat/Hello-World.git"),
    ).toBe("Hello-World");
    expect(importNameFromUrl("git@example.com:octocat/space repo.git")).toBe(
      "space repo",
    );
  });

  it("submits normalized payloads and redirects to the status page", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(repositoryImport()), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<RepositoryImportForm options={creationOptions()} />);

    fireEvent.change(screen.getByLabelText("Source repository URL *"), {
      target: { value: "https://github.com/octocat/Hello-World.git" },
    });
    fireEvent.blur(screen.getByLabelText("Source repository URL *"));
    expect(screen.getByLabelText("Repository name *")).toHaveValue(
      "Hello-World",
    );
    fireEvent.change(screen.getByLabelText("Repository name *"), {
      target: { value: "hello world!!" },
    });
    fireEvent.click(
      screen.getByText("Optional credentials for private sources"),
    );
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "octocat" },
    });
    fireEvent.change(screen.getByLabelText("Access token"), {
      target: { value: "secret-token" },
    });
    fireEvent.click(screen.getByLabelText("Private"));
    fireEvent.click(screen.getByRole("button", { name: "Begin import" }));

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/new/import/import-1");
    });
    expect(fetchMock).toHaveBeenCalledWith("/new/imports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceUrl: "https://github.com/octocat/Hello-World.git",
        sourceUsername: "octocat",
        sourceToken: "secret-token",
        sourcePassword: null,
        ownerType: "user",
        ownerId: "user-1",
        name: "hello-world",
        description: "Imported from https://github.com/octocat/Hello-World.git",
        visibility: "private",
      }),
    });
  });

  it("shows validation errors inline without leaving the page", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "validation_failed",
            message: "import source host is not allowed",
          },
          status: 422,
        }),
        { status: 422 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<RepositoryImportForm options={creationOptions()} />);

    fireEvent.change(screen.getByLabelText("Source repository URL *"), {
      target: { value: "https://127.0.0.1/repo.git" },
    });
    fireEvent.change(screen.getByLabelText("Repository name *"), {
      target: { value: "repo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Begin import" }));

    await expect(
      screen.findByText("import source host is not allowed"),
    ).resolves.toBeVisible();
    await waitFor(() => {
      expect(screen.getByLabelText("Source repository URL *")).toHaveFocus();
    });
    expect(routerPush).not.toHaveBeenCalled();
  });
});

describe("RepositoryImportStatusPanel", () => {
  it("renders queued progress and polls through the same-origin route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(
          repositoryImport({
            status: "imported",
            progressMessage:
              "Repository import completed. The default branch is ready.",
          }),
        ),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = render(
      <RepositoryImportStatusPanel
        initialImport={repositoryImport()}
        pollIntervalMs={10}
      />,
    );

    expect(screen.getByText("Queued")).toBeVisible();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(
      screen.getByRole("link", { name: "Start another import" }),
    ).toHaveAttribute("href", "/new/import");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/new/imports/import-1", {
        cache: "no-store",
      });
    });
    expect(screen.getByText("Imported")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "View repository" }),
    ).toHaveAttribute("href", "/mona/hello-world");
    unmount();
  });

  it("renders failed import callouts without exposing credentials", () => {
    render(
      <RepositoryImportStatusPanel
        initialImport={repositoryImport({
          status: "failed",
          errorCode: "unreachable_source",
          errorMessage: "The source repository could not be reached.",
        })}
      />,
    );

    expect(screen.getByText("Failed")).toBeVisible();
    expect(
      screen.getByText("The source repository could not be reached."),
    ).toBeVisible();
    expect(screen.queryByText(/secret-token/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Start another import" }),
    ).toHaveAttribute("href", "/new/import");
  });

  it("truncates long source and destination labels without losing full titles", () => {
    const longSource =
      "very-long-hostname.example.com/some/deeply/nested/repository/path/with-a-long-name.git";
    const longDestination =
      "/mona/a-very-long-imported-repository-name-that-should-not-overflow";
    render(
      <RepositoryImportStatusPanel
        initialImport={repositoryImport({
          source: {
            url: `https://${longSource}`,
            host: "very-long-hostname.example.com",
            path: "some/deeply/nested/repository/path/with-a-long-name.git",
          },
          repositoryHref: longDestination,
        })}
      />,
    );

    expect(screen.getByText(longSource)).toHaveAttribute("title", longSource);
    expect(screen.getByText(longDestination)).toHaveAttribute(
      "title",
      longDestination,
    );
  });
});
