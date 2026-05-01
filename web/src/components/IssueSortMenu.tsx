"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type IssueSortOption = {
  value: string;
  label: string;
  group: "Sort by" | "Order";
  description: string;
  shortcut: string;
  href: string;
  active: boolean;
};

type IssueSortMenuProps = {
  activeLabel: string;
  options: IssueSortOption[];
};

export function IssueSortMenu({ activeLabel, options }: IssueSortMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLAnchorElement>(null);
  const menuId = "issue-sort-menu";

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

  const grouped = options.reduce<
    Record<IssueSortOption["group"], IssueSortOption[]>
  >(
    (groups, option) => {
      groups[option.group].push(option);
      return groups;
    },
    { "Sort by": [], Order: [] },
  );

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
        Sort by: {activeLabel}
        <span aria-hidden="true" style={{ color: "var(--ink-4)" }}>
          ▾
        </span>
      </button>
      {open ? (
        <div
          aria-label="Sort issues"
          className="card absolute right-0 z-20 mt-2 w-[min(360px,calc(100vw-2rem))] p-3 shadow-md"
          id={menuId}
          role="menu"
          style={{ background: "var(--surface)" }}
        >
          {(["Sort by", "Order"] as const).map((group) =>
            grouped[group].length ? (
              <div key={group}>
                <div
                  className="t-label px-2 pb-1 pt-2"
                  style={{ color: "var(--ink-3)" }}
                >
                  {group}
                </div>
                {grouped[group].map((option, index) => (
                  <Link
                    aria-checked={option.active}
                    aria-describedby={`issue-sort-${option.value}-description`}
                    className={`list-row flex items-start gap-3 rounded-md px-2 py-2 ${
                      option.active ? "bg-[var(--surface-2)]" : ""
                    }`}
                    href={option.href}
                    key={option.value}
                    ref={
                      index === 0 && group === "Sort by"
                        ? firstOptionRef
                        : undefined
                    }
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
                      <span className="flex items-center justify-between gap-3">
                        <span className="t-sm font-medium">{option.label}</span>
                        <span className="kbd">{option.shortcut}</span>
                      </span>
                      <span
                        className="t-xs mt-0.5 block"
                        id={`issue-sort-${option.value}-description`}
                        style={{ color: "var(--ink-3)" }}
                      >
                        {option.description}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
