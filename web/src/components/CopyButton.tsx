"use client";

import { useState } from "react";

type CopyButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  className,
}: CopyButtonProps) {
  const [status, setStatus] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(copiedLabel);
    } catch {
      setStatus("Copy unavailable");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className={className ?? "btn ghost sm"}
        onClick={copy}
        type="button"
      >
        {label}
      </button>
      {status ? (
        <span
          className="t-xs font-medium"
          style={{ color: "var(--ok)" }}
          role="status"
        >
          {status}
        </span>
      ) : null}
    </div>
  );
}
