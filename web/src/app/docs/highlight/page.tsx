import Link from "next/link";
import { CodeViewer } from "@/components/CodeViewer";
import { highlightCode } from "@/lib/api";

const SAMPLE_SOURCE = `import { Router } from "express";

type Repository = {
  owner: string;
  name: string;
  private: boolean;
};

export function repositoryPath(repository: Repository): string {
  if (repository.private) {
    return \`/\${repository.owner}/\${repository.name}/settings/access\`;
  }

  return \`/\${repository.owner}/\${repository.name}\`;
}
`;

export default async function HighlightDocsPage() {
  const highlighted = await highlightCode({
    source: SAMPLE_SOURCE,
    path: "src/repository.ts",
    language: "typescript",
  });

  return (
    <main style={{ background: "var(--bg)" }}>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="t-label" style={{ color: "var(--ink-3)" }}>
              Docs
            </p>
            <h1 className="t-h1 mt-1" style={{ color: "var(--ink-1)" }}>
              Syntax highlighting
            </h1>
          </div>
          <Link className="btn ghost" href="/docs/get-started">
            Back to docs
          </Link>
        </div>
        <CodeViewer initialFile={highlighted} source={SAMPLE_SOURCE} />
      </div>
    </main>
  );
}
