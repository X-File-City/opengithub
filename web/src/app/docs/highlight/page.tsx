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
    <main className="bg-[#f6f8fa]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#59636e]">Docs</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[#1f2328]">
              Syntax highlighting
            </h1>
          </div>
          <Link
            className="inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
            href="/docs/get-started"
          >
            Back to docs
          </Link>
        </div>
        <CodeViewer initialFile={highlighted} source={SAMPLE_SOURCE} />
      </div>
    </main>
  );
}
