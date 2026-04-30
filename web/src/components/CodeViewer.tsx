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
      className="overflow-hidden rounded-md"
      style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
      >
        <div>
          <h2
            className="t-sm font-semibold"
            id="code-viewer-title"
            style={{ color: "var(--ink-1)" }}
          >
            {file.path}
          </h2>
          <p className="mt-1 t-xs" style={{ color: "var(--ink-3)" }}>
            {file.lines.length} lines · {file.language} ·{" "}
            {file.cached ? "cached tokens" : "fresh tokens"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label
            className="t-xs font-medium"
            htmlFor="find"
            style={{ color: "var(--ink-3)" }}
          >
            Find
          </label>
          <input
            className="input h-8 w-44 px-2 t-sm"
            id="find"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search file"
            value={query}
          />
          <label
            className="t-xs font-medium"
            htmlFor="language"
            style={{ color: "var(--ink-3)" }}
          >
            Language
          </label>
          <select
            className="input h-8 px-2 t-sm"
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
            className="btn h-8 px-3 t-sm font-semibold"
            onClick={() => setWrap((current) => !current)}
            type="button"
          >
            Wrap
          </button>
        </div>
      </div>
      {error ? (
        <div
          className="border-b px-4 py-2 t-sm"
          style={{
            borderColor: "var(--line)",
            background:
              "var(--warn-soft, color-mix(in oklch, var(--warn) 12%, var(--surface)))",
            color: "var(--warn)",
          }}
        >
          {error}
        </div>
      ) : null}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_240px]">
        <pre
          className={`code-viewer min-h-[420px] overflow-auto text-[12px] leading-5 ${wrap ? "code-viewer-wrap" : ""}`}
          style={{ background: "var(--surface)", fontFamily: "var(--mono)" }}
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
        <aside
          className="border-t p-4 lg:border-t-0 lg:border-l"
          style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
        >
          <h3 className="t-sm font-semibold" style={{ color: "var(--ink-1)" }}>
            Symbols
          </h3>
          <div className="mt-3 space-y-1">
            {file.symbols.length > 0 ? (
              file.symbols.map((symbol) => (
                <a
                  className="flex items-center justify-between rounded-md px-2 py-1 t-sm hover:bg-[var(--surface)]"
                  href={`#L${symbol.line}`}
                  key={`${symbol.kind}-${symbol.name}-${symbol.line}`}
                  style={{ color: "var(--accent)" }}
                >
                  <span className="truncate">{symbol.name}</span>
                  <span
                    className="ml-2 shrink-0 t-xs"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {symbol.kind}
                  </span>
                </a>
              ))
            ) : (
              <p className="t-sm" style={{ color: "var(--ink-3)" }}>
                No symbols detected.
              </p>
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
