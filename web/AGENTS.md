<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Design System — Editorial (the source of truth)

**This is NOT visually a GitHub clone. Do NOT copy GitHub's blue/green palette, Primer chrome, or chunky borders.**

The product clones GitHub's *capabilities* (repos, PRs, issues, Actions, etc.) but ships with the **Editorial** aesthetic — a calm, magazine-grade design system. Reference is `../design/project/Prototype.html` and the screen JSXs in `../design/project/og-screens-*.jsx`.

## Tokens (live in `src/app/og.css` and `og-themes.css`, imported globally)

- **Surface**: warm cream paper `--bg: #faf7f2`, surfaces `--surface`, `--surface-2`, `--surface-3`
- **Ink**: `--ink-1` (primary text) → `--ink-5` (faintest)
- **Lines**: `--line`, `--line-strong`, `--line-soft`
- **Accent**: deep rust `oklch(0.56 0.16 32)` — **single accent color**, used sparingly for active/selected state, primary CTA highlights, live dots
- **Semantic**: `--ok` (forest green), `--warn` (warm amber), `--err` (warm red), `--info` (muted blue)
- **Type**: `--display: var(--font-fraunces)`, `--sans: var(--font-inter-tight)`, `--mono: var(--font-jetbrains-mono)`
- **Sizing**: `--radius: 6px`, `--radius-lg: 10px`, `--radius-pill: 999px`
- **Shadows**: `--shadow-sm` / `--shadow-md` / `--shadow-lg` (warm, low-contrast)
- **Header height**: `--header-h: 52px`

## Type ramp (use these classes, do NOT roll your own type sizing)

- `.t-display` — Fraunces, weight 500, tight tracking, oversized hero moments
- `.t-h1` — Fraunces 36px / line 1.1
- `.t-h2` — Fraunces 24px
- `.t-h3` — Inter Tight 16px / weight 600
- `.t-body` — 14px / 1.55
- `.t-sm` — 13px
- `.t-xs` — 12px / `--ink-3`
- `.t-mono` / `.t-mono-sm` — JetBrains Mono code/IDs
- `.t-label` — JetBrains Mono UPPERCASE 10.5px (section labels, kickers)
- `.t-num` — tabular-nums for counts/stats

## Component primitives (use these, do NOT recreate)

- `.btn` (variants: `.primary` ink-on-cream, `.accent` rust, `.ghost`; sizes `.sm`/`.lg`)
- `.chip` (variants: `.active`, `.soft`, `.ok`, `.warn`, `.err`, `.info`, `.accent`)
- `.av` (avatar; sizes `.sm`/`.lg`/`.xl`)
- `.card` (subtle border + radius)
- `.input` (with focus ring `--accent-soft`)
- `.kbd` (keyboard hint pill)
- `.tabs` / `.tab.active` (underline-on-active)
- `.list-row` (hoverable row with bottom divider)
- `.palette-*` (⌘K command palette)
- `.dot.live` (pulsing accent dot)

## Layout principles

- **Generous whitespace** — never crammed; the Editorial signal is calm
- **Magazine grids** — `1fr 320px` (main + sidebar), `1240px` content max for app pages, `1100px` for landing
- **Type-first hierarchy** — Fraunces display moments anchor the page; Inter Tight body stays out of the way; mono ONLY for code, IDs, kbd hints
- **Single accent** — don't introduce new colors. Need urgency? Use `.chip.accent` or `.dot.live`. Need success? `.chip.ok` only
- **Restraint** — no gradients beyond `--accent-soft → surface-2`, no chunky borders, no harsh shadows
- **Keyboard-native** — every list item should be focusable; ⌘K palette is in `../design/project/og-shell.jsx` reference

## What NOT to do

- Do NOT use GitHub blue (`#0969da`), GitHub green (`#1f883d`), GitHub red (`#cf222e`) anywhere
- Do NOT use system sans-serif (Helvetica, Arial) — always use `--sans` / `--display` / `--mono`
- Do NOT use Material/Bootstrap-style chunky shadows
- Do NOT introduce multiple accent colors per page
- Do NOT use border-radius < 6px (except inside the Terminal theme override)
- Do NOT import Octicons or Primer

## When in doubt

Open `../design/project/og-shell.jsx`, `og-screens-1.jsx` (Landing/Login/Dashboard/Notifications), `og-screens-2.jsx` (Repo/File), `og-screens-3.jsx` (Pulls/PR detail/PR diff), `og-screens-4.jsx` (Issues/Actions). Port the visual structure into React components. The JSX is reference-quality: copy class names, copy spacing, copy hierarchy.

## Themes

`og-themes.css` ships three full themes: `body.theme-dark`, `body.theme-terminal`, `body.theme-studio`. Editorial light is the default (no class needed). Theme switching is a future feature — for now, build everything against the default Editorial light tokens.
