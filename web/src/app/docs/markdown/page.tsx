import Link from "next/link";
import { MarkdownBody } from "@/components/MarkdownBody";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { renderMarkdown } from "@/lib/api";

const SAMPLE_MARKDOWN = `# Markdown rendering

OpenGitHub supports **CommonMark**, GFM tables, task lists, @mona mentions, #42 issue links, and fenced code blocks.

| Surface | Status |
| --- | --- |
| README.md | Supported |
| Issues and pull requests | Supported |

- [x] Sanitize HTML
- [ ] Toggle tasks when the viewer can write

\`\`\`ts
export const preview = "rendered by Rust";
\`\`\`

![Diagram](docs/diagram.png)
`;

export default async function MarkdownDocsPage() {
  const rendered = await renderMarkdown({
    markdown: SAMPLE_MARKDOWN,
    owner: "mona",
    repo: "octo-app",
    ref: "main",
    enableTaskToggles: true,
  });

  return (
    <main className="bg-[#f6f8fa]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#59636e]">Docs</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[#1f2328]">
              Markdown rendering
            </h1>
          </div>
          <Link
            className="inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
            href="/docs/get-started"
          >
            Back to docs
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <MarkdownEditor
            initialMarkdown={SAMPLE_MARKDOWN}
            initialRendered={rendered}
            owner="mona"
            repo="octo-app"
            refName="main"
          />
          <aside className="rounded-md border border-[#d0d7de] bg-white p-4">
            <h2 className="text-sm font-semibold text-[#1f2328]">
              Rendered sample
            </h2>
            <div className="mt-3">
              <MarkdownBody html={rendered.html} />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
