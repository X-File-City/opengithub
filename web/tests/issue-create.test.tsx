import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IssueCreateForm } from "@/components/IssueCreateForm";
import { IssueTemplateChooser } from "@/components/IssueTemplateChooser";
import {
  type CreatedIssue,
  createRepositoryIssueFromCookie,
  getRepositoryIssueTemplatesFromCookie,
  type IssueTemplate,
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

const bugTemplate: IssueTemplate = {
  id: "template-1",
  repositoryId: "repo-1",
  slug: "bug-report",
  name: "Bug report",
  description: "Report a reproducible defect.",
  titlePrefill: "[Bug]: ",
  body: "### Expected behavior\n\n### Actual behavior\n",
  issueType: "bug",
  defaultLabelIds: ["label-1"],
  defaultAssigneeUserIds: ["user-2"],
  createdAt: "2026-05-01T00:00:00Z",
  updatedAt: "2026-05-01T00:00:00Z",
};

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
            labelIds: [],
            assigneeUserIds: [],
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

  it("submits template defaults with the created issue", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(createdIssue), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    render(
      <IssueCreateForm
        cancelHref="/mona/octo-app/issues"
        defaultAssigneeUserIds={["user-2"]}
        defaultLabelIds={["label-1"]}
        initialBody="Template body"
        initialTitle="[Bug]: "
        owner="mona"
        repo="octo-app"
        templateName="Bug report"
      />,
    );

    expect(screen.getByText(/Using the Bug report template/)).toBeVisible();
    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "[Bug]: broken preview" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create issue" }));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/mona/octo-app/issues/new/create",
        expect.objectContaining({
          body: JSON.stringify({
            title: "[Bug]: broken preview",
            body: "Template body",
            labelIds: ["label-1"],
            assigneeUserIds: ["user-2"],
          }),
        }),
      ),
    );
  });
});

describe("IssueTemplateChooser", () => {
  it("renders template cards, blank issue, and no inert controls", () => {
    render(
      <IssueTemplateChooser
        cancelHref="/mona/octo-app/issues"
        newIssueHref="/mona/octo-app/issues/new"
        owner="mona"
        repo="octo-app"
        templates={[bugTemplate]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Create new issue" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Bug report" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute(
      "href",
      "/mona/octo-app/issues/new?template=bug-report",
    );
    expect(
      screen.getByRole("link", { name: "Open blank issue" }),
    ).toHaveAttribute("href", "/mona/octo-app/issues/new?template=blank");
    for (const link of screen.getAllByRole("link")) {
      expect(link).not.toHaveAttribute("href", "#");
    }
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

  it("fetches repository issue templates with the signed session cookie", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [bugTemplate] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      getRepositoryIssueTemplatesFromCookie(
        "og_session=value",
        "mona",
        "octo-app",
      ),
    ).resolves.toEqual([bugTemplate]);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3016/api/repos/mona/octo-app/issues/templates",
      expect.objectContaining({
        headers: {
          cookie: "og_session=value",
        },
      }),
    );
  });
});
