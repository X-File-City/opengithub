import { common, createLowlight } from "lowlight";

type HighlightTextNode = {
  type: "text";
  value: string;
};

export type HighlightElementNode = {
  type: "element";
  tagName: string;
  properties?: {
    className?: string[];
  };
  children?: HighlightNode[];
};

export type HighlightNode = HighlightTextNode | HighlightElementNode;

const lowlight = createLowlight(common);

const LANGUAGE_ALIASES: Record<string, string> = {
  CSS: "css",
  HTML: "xml",
  JavaScript: "javascript",
  JSON: "json",
  Markdown: "markdown",
  Python: "python",
  Rust: "rust",
  SQL: "sql",
  TypeScript: "typescript",
  YAML: "yaml",
};

export function highlightCodeLine(
  line: string,
  language: string | null,
): HighlightNode[] {
  const highlighterLanguage = language ? LANGUAGE_ALIASES[language] : null;
  if (!highlighterLanguage || !lowlight.registered(highlighterLanguage)) {
    return [{ type: "text", value: line }];
  }
  try {
    return lowlight.highlight(highlighterLanguage, line)
      .children as HighlightNode[];
  } catch {
    return [{ type: "text", value: line }];
  }
}
