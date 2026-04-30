import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as highlightRoute } from "@/app/highlight/render/route";
import { CodeViewer } from "@/components/CodeViewer";
import type { HighlightedFile } from "@/lib/api";

const highlighted: HighlightedFile = {
  sha: "sha",
  path: "src/repository.ts",
  language: "typescript",
  cached: false,
  lines: [
    {
      number: 1,
      text: "export function repositoryPath() {",
      tokens: [
        { text: "export", className: "tok-keyword" },
        { text: " function ", className: "tok-plain" },
        { text: "repositoryPath", className: "tok-identifier" },
        { text: "() {", className: "tok-punctuation" },
      ],
    },
    {
      number: 2,
      text: "  return true;",
      tokens: [
        { text: "  ", className: "tok-plain" },
        { text: "return", className: "tok-keyword" },
        { text: " true", className: "tok-constant" },
        { text: ";", className: "tok-punctuation" },
      ],
    },
  ],
  symbols: [{ name: "repositoryPath", kind: "function", line: 1 }],
  supportedLanguages: [
    { id: "typescript", label: "TypeScript" },
    { id: "rust", label: "Rust" },
  ],
};

describe("syntax highlighting UI", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("renders tokenized code with line anchors, comment buttons, and symbols", () => {
    render(
      <CodeViewer
        initialFile={highlighted}
        source="export function repositoryPath() {}"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "src/repository.ts" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Permalink line 1" }),
    ).toHaveAttribute("href", "#L1");
    expect(
      screen.getByRole("button", { name: "Add comment on line 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /repositoryPath/ }),
    ).toHaveAttribute("href", "#L1");
    expect(document.querySelector(".tok-keyword")?.textContent).toBe("export");
  });

  it("filters matching lines and toggles wrap mode", () => {
    render(
      <CodeViewer
        initialFile={highlighted}
        source="export function repositoryPath() {}"
      />,
    );

    fireEvent.change(screen.getByLabelText("Find"), {
      target: { value: "return" },
    });
    expect(document.querySelector('[data-line="2"]')).toHaveClass(
      "code-line-match",
    );

    const wrap = screen.getByRole("button", { name: "Wrap" });
    fireEvent.click(wrap);
    expect(wrap).toHaveAttribute("aria-pressed", "true");
  });

  it("requests fresh tokens when language override changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...highlighted,
          language: "rust",
          cached: true,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <CodeViewer
        initialFile={highlighted}
        source="export function repositoryPath() {}"
      />,
    );

    fireEvent.change(screen.getByLabelText("Language"), {
      target: { value: "rust" },
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/highlight/render",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            source: "export function repositoryPath() {}",
            path: "src/repository.ts",
            sha: "sha",
            language: "rust",
          }),
        }),
      ),
    );
    expect(await screen.findByText(/rust · cached tokens/)).toBeInTheDocument();
  });

  it("forwards same-origin highlight requests to the Rust endpoint", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(highlighted), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await highlightRoute(
      new Request("http://localhost/highlight/render", {
        method: "POST",
        body: JSON.stringify({
          source: "fn main() {}",
          path: "src/main.rs",
          language: "rust",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/highlight/render",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          source: "fn main() {}",
          path: "src/main.rs",
          sha: null,
          repositoryId: null,
          language: "rust",
        }),
      }),
    );
  });
});
