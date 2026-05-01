"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type PullRequestReviewOption = {
  value: string;
  label: string;
  description: string;
  href: string;
  active: boolean;
};

type PullRequestReviewMenuProps = {
  activeLabel: string;
  options: PullRequestReviewOption[];
};

export function PullRequestReviewMenu({
  activeLabel,
  options,
}: PullRequestReviewMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLAnchorElement>(null);
  const menuId = "pull-request-review-filter-menu";

  useEffect(() => {
    if (open) {
      firstOptionRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        className="btn ghost"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        Reviews{activeLabel ? `: ${activeLabel}` : ""}
        <span aria-hidden="true" style={{ color: "var(--ink-4)" }}>
          ▾
        </span>
      </button>
      {open ? (
        <div
          aria-label="Pull request reviews filter"
          className="card absolute left-0 z-20 mt-2 w-[min(380px,calc(100vw-2rem))] p-3 shadow-md"
          id={menuId}
          role="menu"
          style={{ background: "var(--surface)" }}
        >
          <div className="t-label px-2 pb-1" style={{ color: "var(--ink-3)" }}>
            Reviews
          </div>
          {options.map((option, index) => (
            <Link
              aria-checked={option.active}
              aria-describedby={`pull-review-${option.value}-description`}
              className={`list-row flex items-start gap-3 rounded-md px-2 py-2 ${
                option.active ? "bg-[var(--surface-2)]" : ""
              }`}
              href={option.href}
              key={option.value}
              ref={index === 0 ? firstOptionRef : undefined}
              role="menuitemradio"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border"
                style={{
                  borderColor: option.active
                    ? "var(--accent)"
                    : "var(--line-strong)",
                  color: option.active ? "var(--accent)" : "transparent",
                }}
              >
                •
              </span>
              <span className="min-w-0 flex-1">
                <span className="t-sm font-medium">{option.label}</span>
                <span
                  className="t-xs mt-0.5 block"
                  id={`pull-review-${option.value}-description`}
                  style={{ color: "var(--ink-3)" }}
                >
                  {option.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
