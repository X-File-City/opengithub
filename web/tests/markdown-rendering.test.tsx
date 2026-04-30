import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as previewRoute } from "@/app/markdown/preview/route";
import { MarkdownBody } from "@/components/MarkdownBody";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import type { RenderedMarkdown } from "@/lib/api";

const rendered: RenderedMarkdown = {
  contentSha: "sha",
  html: '<div class="markdown-body"><h1 id="hello"><a class="anchor" href="#hello">#</a>Hello</h1><p>Rendered by Rust</p></div>',
  cached: false,
};

describe("markdown rendering UI", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("renders sanitized html inside the markdown body container", () => {
    render(<MarkdownBody html={rendered.html} />);

    expect(screen.getByRole("heading", { name: "#Hello" })).toBeInTheDocument();
    expect(screen.getByText("Rendered by Rust")).toBeInTheDocument();
  });

  it("edits markdown and refreshes preview through the same-origin route", async () => {
    const previewMarkdown = vi.fn().mockResolvedValue({
      ...rendered,
      html: '<div class="markdown-body"><p>Preview updated</p></div>',
    });

    render(
      <MarkdownEditor
        initialMarkdown="# Hello"
        initialRendered={rendered}
        owner="mona"
        previewMarkdown={previewMarkdown}
        repo="octo-app"
        refName="main"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(screen.getByLabelText("Markdown source")).toHaveValue(
      "# Hello\n**bold**",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Preview" }));

    await waitFor(() =>
      expect(previewMarkdown).toHaveBeenCalledWith("# Hello\n**bold**"),
    );
    expect(await screen.findByText("Preview updated")).toBeInTheDocument();
  });

  it("forwards preview requests to the Rust markdown endpoint", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(rendered), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await previewRoute(
      new Request("http://localhost/markdown/preview", {
        method: "POST",
        body: JSON.stringify({
          markdown: "# Hello",
          owner: "mona",
          repo: "octo-app",
          ref: "main",
          enableTaskToggles: true,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/markdown/render",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          markdown: "# Hello",
          repositoryId: null,
          owner: "mona",
          repo: "octo-app",
          ref: "main",
          enableTaskToggles: true,
        }),
      }),
    );
  });
});
