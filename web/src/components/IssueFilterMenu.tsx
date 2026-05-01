"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IssueListLabel } from "@/lib/api";

type IssueLabelOption = IssueListLabel & {
  selected: boolean;
  excluded: boolean;
  includeHref: string;
  excludeHref: string;
};

type IssueFilterMenuProps = {
  buttonLabel: string;
  labelOptions: IssueLabelOption[];
  noLabelsHref: string;
  noLabelsSelected: boolean;
};

export type IssuePickerOption = {
  id: string;
  label: string;
  description?: string | null;
  href: string;
  selected?: boolean;
  badge?: string | null;
  disabledReason?: string | null;
  excludeHref?: string | null;
};

type IssuePickerMenuProps = {
  buttonLabel: string;
  dialogLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  options: IssuePickerOption[];
  emptyMessage: string;
  noValueOption?: IssuePickerOption;
};

function labelColor(color: string) {
  const trimmed = color.trim();
  if (!trimmed) {
    return "var(--ink-4)";
  }
  if (trimmed.startsWith("var(") || trimmed.startsWith("#")) {
    return trimmed;
  }
  return `#${trimmed}`;
}

export function IssueFilterMenu({
  buttonLabel,
  labelOptions,
  noLabelsHref,
  noLabelsSelected,
}: IssueFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return labelOptions;
    }
    return labelOptions.filter((label) =>
      [label.name, label.description ?? ""].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }, [labelOptions, query]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="btn ghost"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {buttonLabel}
        <span aria-hidden="true" style={{ color: "var(--ink-4)" }}>
          ▾
        </span>
      </button>
      {open ? (
        <div
          aria-label="Labels filter"
          className="card absolute left-0 z-20 mt-2 w-[min(360px,calc(100vw-2rem))] p-3 shadow-md"
          role="dialog"
          style={{ background: "var(--surface)" }}
        >
          <label className="input w-full" htmlFor="issue-label-filter">
            <span aria-hidden="true">⌕</span>
            <input
              aria-controls="issue-label-options"
              aria-expanded={open}
              aria-label="Filter labels"
              id="issue-label-filter"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter labels"
              ref={inputRef}
              role="combobox"
              type="search"
              value={query}
            />
          </label>
          <div
            className="mt-3 max-h-72 overflow-auto"
            id="issue-label-options"
            role="listbox"
          >
            <Link
              aria-selected={noLabelsSelected}
              className={`list-row block rounded-md px-2 py-2 ${
                noLabelsSelected ? "bg-[var(--surface-2)]" : ""
              }`}
              href={noLabelsHref}
              role="option"
            >
              <span className="flex items-center justify-between gap-3">
                <span>
                  <span className="t-sm font-medium">No labels</span>
                  <span
                    className="t-xs mt-0.5 block"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Show issues without any label.
                  </span>
                </span>
                {noLabelsSelected ? (
                  <span className="chip active">On</span>
                ) : null}
              </span>
            </Link>
            {filtered.length ? (
              filtered.map((label) => (
                <Link
                  aria-selected={label.selected || label.excluded}
                  className="list-row block rounded-md px-2 py-2"
                  href={label.includeHref}
                  key={label.id}
                  onClick={(event) => {
                    if (event.altKey) {
                      event.preventDefault();
                      window.location.assign(label.excludeHref);
                    }
                  }}
                  role="option"
                  title="Alt-click to exclude this label"
                >
                  <span className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ background: labelColor(label.color) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="t-sm font-medium">{label.name}</span>
                        {label.selected ? (
                          <span className="chip active">Included</span>
                        ) : null}
                        {label.excluded ? (
                          <span className="chip err">Excluded</span>
                        ) : null}
                      </span>
                      {label.description ? (
                        <span
                          className="t-xs mt-0.5 block"
                          style={{ color: "var(--ink-3)" }}
                        >
                          {label.description}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="t-sm px-2 py-4" style={{ color: "var(--ink-3)" }}>
                No labels match this search.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function IssuePickerMenu({
  buttonLabel,
  dialogLabel,
  searchLabel,
  searchPlaceholder,
  options,
  emptyMessage,
  noValueOption,
}: IssuePickerMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return options;
    }
    return options.filter((option) =>
      [option.label, option.description ?? "", option.badge ?? ""].some(
        (value) => value.toLowerCase().includes(needle),
      ),
    );
  }, [options, query]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="btn ghost"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {buttonLabel}
        <span aria-hidden="true" style={{ color: "var(--ink-4)" }}>
          ▾
        </span>
      </button>
      {open ? (
        <div
          aria-label={dialogLabel}
          className="card absolute left-0 z-20 mt-2 w-[min(340px,calc(100vw-2rem))] p-3 shadow-md"
          role="dialog"
          style={{ background: "var(--surface)" }}
        >
          <label className="input w-full" htmlFor={`${dialogLabel}-search`}>
            <span aria-hidden="true">⌕</span>
            <input
              aria-controls={`${dialogLabel}-options`}
              aria-expanded={open}
              aria-label={searchLabel}
              id={`${dialogLabel}-search`}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              ref={inputRef}
              role="combobox"
              type="search"
              value={query}
            />
          </label>
          <div
            className="mt-3 max-h-72 overflow-auto"
            id={`${dialogLabel}-options`}
            role="listbox"
          >
            {noValueOption ? <PickerOption option={noValueOption} /> : null}
            {filtered.length ? (
              filtered.map((option) => (
                <PickerOption key={option.id} option={option} />
              ))
            ) : (
              <p className="t-sm px-2 py-4" style={{ color: "var(--ink-3)" }}>
                {emptyMessage}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PickerOption({ option }: { option: IssuePickerOption }) {
  const content = (
    <span className="flex items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="t-sm font-medium">{option.label}</span>
          {option.badge ? (
            <span className="chip soft">{option.badge}</span>
          ) : null}
          {option.selected ? (
            <span className="chip active">Selected</span>
          ) : null}
        </span>
        {option.description || option.disabledReason ? (
          <span className="t-xs mt-0.5 block" style={{ color: "var(--ink-3)" }}>
            {option.disabledReason ?? option.description}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (option.disabledReason) {
    return (
      <span
        aria-disabled="true"
        aria-selected={false}
        className="list-row block rounded-md px-2 py-2 opacity-70"
        role="option"
        tabIndex={-1}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      aria-selected={option.selected ?? false}
      className={`list-row block rounded-md px-2 py-2 ${
        option.selected ? "bg-[var(--surface-2)]" : ""
      }`}
      href={option.href}
      onClick={(event) => {
        if (event.altKey && option.excludeHref) {
          event.preventDefault();
          window.location.assign(option.excludeHref);
        }
      }}
      role="option"
      title={option.excludeHref ? "Alt-click to exclude this value" : undefined}
    >
      {content}
    </Link>
  );
}
