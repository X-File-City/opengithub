"use client";

import { useMemo, useState, useTransition } from "react";
import type { HighlightedFile, HighlightedLine } from "@/lib/api";

type CodeViewerProps = {
  initialFile: HighlightedFile;
  source: string;
};

export function CodeViewer({ initialFile, source }: CodeViewerProps) {
  const [file, setFile] = useState(initialFile);
  const [wrap, setWrap] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const matchingLines = useMemo(() => {
    if (!query.trim()) {
      return new Set<number>();
    }
    const normalized = query.trim().toLowerCase();
    return new Set(
      file.lines
        .filter((line) => line.text.toLowerCase().includes(normalized))
        .map((line) => line.number),
    );
  }, [file.lines, query]);

  function changeLanguage(language: string) {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/highlight/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source,
          path: file.path,
          sha: file.sha,
          language,
        }),
      });
      if (!response.ok) {
        setError("Language override failed");
        return;
      }
      setFile((await response.json()) as HighlightedFile);
    });
  }

  return (
    <section
      aria-labelledby="code-viewer-title"
      className="overflow-hidden rounded-md border border-[#d0d7de] bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-[#d0d7de] border-b bg-[#f6f8fa] px-4 py-3">
        <div>
          <h2
            className="text-sm font-semibold text-[#1f2328]"
            id="code-viewer-title"
          >
            {file.path}
          </h2>
          <p className="mt-1 text-xs text-[#59636e]">
            {file.lines.length} lines · {file.language} ·{" "}
            {file.cached ? "cached tokens" : "fresh tokens"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-[#59636e]" htmlFor="find">
            Find
          </label>
          <input
            className="h-8 w-44 rounded-md border border-[#d0d7de] bg-white px-2 text-sm text-[#1f2328]"
            id="find"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search file"
            value={query}
          />
          <label
            className="text-xs font-medium text-[#59636e]"
            htmlFor="language"
          >
            Language
          </label>
          <select
            className="h-8 rounded-md border border-[#d0d7de] bg-white px-2 text-sm text-[#1f2328]"
            disabled={isPending}
            id="language"
            onChange={(event) => changeLanguage(event.target.value)}
            value={file.language}
          >
            {file.supportedLanguages.map((language) => (
              <option key={language.id} value={language.id}>
                {language.label}
              </option>
            ))}
          </select>
          <button
            aria-pressed={wrap}
            className="h-8 rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#1f2328] hover:bg-[#f3f4f6]"
            onClick={() => setWrap((current) => !current)}
            type="button"
          >
            Wrap
          </button>
        </div>
      </div>
      {error ? (
        <div className="border-[#d0d7de] border-b bg-[#fff8c5] px-4 py-2 text-sm text-[#7d4e00]">
          {error}
        </div>
      ) : null}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_240px]">
        <pre
          className={`code-viewer min-h-[420px] overflow-auto bg-[#ffffff] text-[12px] leading-5 ${wrap ? "code-viewer-wrap" : ""}`}
        >
          {file.lines.map((line) => (
            <div
              className={`code-line group ${matchingLines.has(line.number) ? "code-line-match" : ""}`}
              data-line={line.number}
              key={line.number}
            >
              <a
                aria-label={`Permalink line ${line.number}`}
                className="line-number"
                href={`#L${line.number}`}
                id={`L${line.number}`}
              >
                {line.number}
              </a>
              <button
                aria-label={`Add comment on line ${line.number}`}
                className="line-comment"
                type="button"
              >
                +
              </button>
              <code className="line-code">{renderLineTokens(line)}</code>
            </div>
          ))}
        </pre>
        <aside className="border-[#d0d7de] border-t bg-[#f6f8fa] p-4 lg:border-t-0 lg:border-l">
          <h3 className="text-sm font-semibold text-[#1f2328]">Symbols</h3>
          <div className="mt-3 space-y-1">
            {file.symbols.length > 0 ? (
              file.symbols.map((symbol) => (
                <a
                  className="flex items-center justify-between rounded-md px-2 py-1 text-sm text-[#0969da] hover:bg-white"
                  href={`#L${symbol.line}`}
                  key={`${symbol.kind}-${symbol.name}-${symbol.line}`}
                >
                  <span className="truncate">{symbol.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-[#59636e]">
                    {symbol.kind}
                  </span>
                </a>
              ))
            ) : (
              <p className="text-sm text-[#59636e]">No symbols detected.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function renderLineTokens(line: HighlightedLine) {
  let offset = 0;
  return line.tokens.map((token) => {
    const key = `${line.number}-${token.className}-${offset}`;
    offset += token.text.length;
    return (
      <span className={token.className} key={key}>
        {token.text}
      </span>
    );
  });
}
