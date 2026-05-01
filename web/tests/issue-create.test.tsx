import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IssueCreateForm } from "@/components/IssueCreateForm";
import {
  type CreatedIssue,
  createRepositoryIssueFromCookie,
  type RenderedMarkdown,
} from "@/lib/api";

const createdIssue: CreatedIssue = {
  id: "issue-1",
  repository_id: "repo-1",
  number: 12,
  title: "Ship the issue composer",
  body: "Body",
  state: "open",
  author_user_id: "user-1",
  milestone_id: null,
  locked: false,
  closed_by_user_id: null,
  closed_at: null,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
  href: "/mona/octo-app/issues/12",
};

function renderedMarkdown(html: string): RenderedMarkdown {
  return {
    contentSha: "sha",
    html,
    cached: false,
  };
}

describe("IssueCreateForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders query prefill, live controls, and no inert links", () => {
    render(
      <IssueCreateForm
        cancelHref="/mona/octo-app/issues"
        initialBody="Prefilled body"
        initialTitle="Prefilled title"
        owner="mona"
        repo="octo-app"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Create new issue" }),
    ).toBeVisible();
    expect(screen.getByLabelText(/Title/)).toHaveValue("Prefilled title");
    expect(screen.getByLabelText("Issue body")).toHaveValue("Prefilled body");
    for (const link of screen.getAllByRole("link")) {
      expect(link).not.toHaveAttribute("href", "#");
    }
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAccessibleName(/.+/);
    }
  });

  it("blocks create until the required title is present", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(
      <IssueCreateForm
        cancelHref="/mona/octo-app/issues"
        owner="mona"
        repo="octo-app"
      />,
    );

    expect(screen.getByRole("button", { name: "Create issue" })).toBeDisabled();
    fireEvent.blur(screen.getByLabelText(/Title/));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Title is required.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders Markdown preview and the empty preview state", async () => {
    const previewMarkdown = vi
      .fn()
      .mockResolvedValueOnce(
        renderedMarkdown("<p><strong>Preview</strong></p>"),
      )
      .mockResolvedValueOnce(renderedMarkdown("<p>server empty</p>"));
    render(
      <IssueCreateForm
        cancelHref="/mona/octo-app/issues"
        initialBody="**Preview**"
        owner="mona"
        previewMarkdown={previewMarkdown}
        repo="octo-app"
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
    expect(await screen.findByText("Preview")).toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: "Write" }));
    fireEvent.change(screen.getByLabelText("Issue body"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
    expect(await screen.findByText("Nothing to preview")).toBeVisible();
  });

  it("creates an issue and resets the form when Create more is checked", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(createdIssue), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    render(
      <IssueCreateForm
        cancelHref="/mona/octo-app/issues"
        initialBody="Body"
        initialTitle="Ship the issue composer"
        owner="mona"
        repo="octo-app"
      />,
    );

    fireEvent.click(screen.getByLabelText("Create more"));
    fireEvent.click(screen.getByRole("button", { name: "Create issue" }));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/mona/octo-app/issues/new/create",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "Ship the issue composer",
            body: "Body",
          }),
        }),
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Created issue #12",
    );
    expect(screen.getByLabelText(/Title/)).toHaveValue("");
    expect(screen.getByLabelText("Issue body")).toHaveValue("");
  });

  it("submits with Command+Enter and reports API errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: "validation_failed",
            message: "issue title is required",
          },
          status: 422,
        }),
        {
          status: 422,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    render(
      <IssueCreateForm
        cancelHref="/mona/octo-app/issues"
        initialBody="Body"
        initialTitle="Needs server validation"
        owner="mona"
        repo="octo-app"
      />,
    );

    fireEvent.keyDown(screen.getByLabelText("Issue body"), {
      key: "Enter",
      metaKey: true,
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "issue title is required",
    );
  });

  it("calls onCreated for normal create redirects", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(createdIssue), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    const onCreated = vi.fn();
    render(
      <IssueCreateForm
        cancelHref="/mona/octo-app/issues"
        initialTitle="Ship the issue composer"
        onCreated={onCreated}
        owner="mona"
        repo="octo-app"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create issue" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(createdIssue));
  });
});

describe("createRepositoryIssueFromCookie", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts to the Rust issue endpoint with the signed session cookie", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(createdIssue), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      createRepositoryIssueFromCookie("og_session=value", "mona", "octo-app", {
        title: "Ship",
        body: "Details",
      }),
    ).resolves.toEqual(createdIssue);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3016/api/repos/mona/octo-app/issues",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "og_session=value",
        },
        body: JSON.stringify({ title: "Ship", body: "Details" }),
      }),
    );
  });

  it("preserves API error envelopes as Error.cause", async () => {
    const envelope = {
      error: {
        code: "validation_failed",
        message: "issue title is required",
      },
      status: 422,
      details: {
        field: "title",
        reason: "issue title is required",
      },
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(envelope), {
        status: 422,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      createRepositoryIssueFromCookie("og_session=value", "mona", "octo-app", {
        title: "",
      }),
    ).rejects.toMatchObject({
      message: "issue title is required",
      cause: envelope,
    });
  });
});
