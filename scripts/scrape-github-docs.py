#!/usr/bin/env python3
"""GitHub-specific doc rescue.

GitHub's llms.txt advertises /api/pagelist/* endpoints (URL inventories) instead
of doc pages, which trips the generic scraper's coverage gate. This script
reads the English public pagelist that the generic scraper already saved, then
fetches every doc URL it lists as actual content.

Run AFTER scripts/scrape-docs.py has written target-docs/api/pagelist/.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import importlib.util
spec = importlib.util.spec_from_file_location("scrape_docs", ROOT / "scripts" / "scrape-docs.py")
sd = importlib.util.module_from_spec(spec)
sys.modules["scrape_docs"] = sd
spec.loader.exec_module(sd)

OUT_DIR = ROOT / "target-docs"
PAGELIST = OUT_DIR / "api" / "pagelist" / "en" / "free-pro-team_latest.md"
DOC_BASE = "https://docs.github.com"
CONCURRENCY = 16
MAX_PAGES = 4000
MIN_PAGES = 20


def load_pagelist() -> list[str]:
    if not PAGELIST.exists():
        print(f"ERROR: {PAGELIST} not found. Run scripts/scrape-docs.py first.", file=sys.stderr)
        sys.exit(1)
    text = PAGELIST.read_text(encoding="utf-8")
    paths: list[str] = []
    for token in text.split():
        if token.startswith("/en/") or token == "/en":
            paths.append(token)
    seen: set[str] = set()
    unique: list[str] = []
    for p in paths:
        if p not in seen:
            seen.add(p)
            unique.append(p)
    return unique


def main() -> int:
    paths = load_pagelist()
    print(f"[scrape-github-docs] pagelist paths: {len(paths)}")
    urls = [f"{DOC_BASE}{p}" for p in paths]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("api/pagelist/**/*.md"):
        old.unlink()
    for d in sorted(OUT_DIR.glob("api/pagelist/**"), reverse=True):
        if d.is_dir():
            try:
                d.rmdir()
            except OSError:
                pass

    print(f"[scrape-github-docs] fetching {len(urls)} pages with concurrency={CONCURRENCY}")
    successes, failures = sd.fetch_many(urls[:MAX_PAGES], CONCURRENCY)
    print(f"[scrape-github-docs] fetched: ok={len(successes)} fail={len(failures)}")

    pages: list[sd.FetchedPage] = []
    for url, html, fetcher_name in successes:
        md = sd.html_to_markdown(html, url)
        if not md or len(md) < sd.MIN_MARKDOWN_CHARS:
            failures.append((url, "extracted markdown too short or empty"))
            continue
        try:
            page = sd.write_page(OUT_DIR, url, md, fetcher=fetcher_name)
        except ValueError as exc:
            failures.append((url, f"write refused: {exc}"))
            continue
        pages.append(page)

    sd.write_index(OUT_DIR, pages)
    ok, summary = sd.coverage_check(pages, MIN_PAGES, openapi_path=None)
    summary["discovery"] = "github-pagelist-rescue"
    summary["failure_count"] = len(failures)
    (OUT_DIR / "coverage.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"[scrape-github-docs] pages saved: {len(pages)}")
    print(f"[scrape-github-docs] coverage:    passed={summary['passed']}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
