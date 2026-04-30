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
        className={
          className ??
          "inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-xs font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
        }
        onClick={copy}
        type="button"
      >
        {label}
      </button>
      {status ? (
        <span className="text-xs font-medium text-[#1a7f37]" role="status">
          {status}
        </span>
      ) : null}
    </div>
  );
}
