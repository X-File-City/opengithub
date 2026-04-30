type MarkdownBodyProps = {
  html: string;
  labelledBy?: string;
};

export function MarkdownBody({ html, labelledBy }: MarkdownBodyProps) {
  const attributes = labelledBy
    ? { "aria-labelledby": labelledBy, role: "region" }
    : {};

  return (
    <div
      className="markdown-body"
      {...attributes}
      // The Rust API sanitizes this HTML with an allowlist before it reaches React.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by the Rust markdown renderer.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
