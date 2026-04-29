# opengithub — Autonomous GitHub Clone (Rust + Next.js)

## What This Is
A four-phase autonomous system cloning **github.com** from a URL.
Phase 1: Inspect (Codex + Ever CLI) → Phase 1.5: Architecture (Codex) → Phase 2: Build (Codex) → Phase 3: QA (Codex + Ever CLI)

All loops run via `codex exec` — no Anthropic API key required.

## Tech Stack
- **Backend**: Rust 2021 (Axum + Tokio + SQLx). Workspace root `Cargo.toml`, API crate at `crates/api/`.
- **Frontend**: Next.js + TypeScript in `web/` (scaffolded by build loop on first iteration).
- **Database**: Postgres on AWS RDS. Search via Postgres + `pg_trgm` (no separate code indexer for now).
- **Auth**: Better Auth (multi-user), Google OAuth only. `authMode: "better-auth"` in `ralph-config.json`.
- **Cloud**: AWS — ECS Fargate (Rust API), RDS Postgres, S3 (git/packages/releases), SES (email), CloudFront (CDN), ECR.
- **DNS**: Cloudflare (zone `namuh.co`); production hostname `opengithub.namuh.co`.
- **Testing**: `cargo test` (Rust), Vitest + Playwright (Next.js).
- **Linting**: `cargo clippy` + `rustfmt` (Rust), Biome (Next.js).

## Commands
All commands go through `make`. The Makefile is a contract — onboarding wires up real recipes based on your stack.
- `make check` — typecheck + lint/format
- `make test` — run unit tests
- `make test-e2e` — run E2E tests (requires dev server)
- `make all` — check + test
- `make dev` — start dev server on port 3015
- `make build` — production build
- `make db-push` — push schema to database

## Quality Standards
- Strict type checking enabled (language-specific: TypeScript strict, Go vet, etc.)
- Every feature must have at least one unit test AND one E2E test
- Run `make check && make test` before every commit
- Small, focused commits — one feature per commit

## Architecture
- `Cargo.toml` — Rust workspace root.
- `crates/api/` — Axum API service (binary: `api`). All Rust code lives under `crates/`.
- `web/` — Next.js + TypeScript frontend. Scaffolded by the build loop on first iteration if absent.
- `crates/api/migrations/` — SQLx migrations (created by build loop when DB schema is needed).
- `web/tests/` — Vitest unit tests.
- `web/tests/e2e/` — Playwright E2E tests.
- `scripts/` — infrastructure provisioning (`preflight.sh` for AWS) and deployment.

## Pre-configured (DO NOT reinstall or recreate)
- **Makefile** — `make check`, `make test`, `make test-e2e`, `make all` (contract targets)
- **hack/run_silent.sh** — output formatting helper used by Makefile

## Stack Setup
- Onboarding wrote `ralph-config.json` (single source of truth for stack decisions).
- `setup-stack.sh` was **skipped** — no `rust-platform` template ships with the onboarding skill. The Rust workspace was scaffolded directly during onboarding (`Cargo.toml`, `crates/api/Cargo.toml`, `crates/api/src/main.rs`).
- `.ralph-setup-done` contains the marker `rust-platform-custom`.
- Build loop is responsible for scaffolding `web/` (Next.js + TypeScript) on its first iteration.

## Environment
- **Cloud CLI** — configure via onboarding (AWS, Vercel, GCP, Azure)
- **`.env`** — copy from `.env.example` and fill in your values

## Authentication
`authMode: "better-auth"`, `authProviders: ["google"]`.
- Better Auth runs in `web/` (TypeScript). Google OAuth only (GitHub OAuth deliberately dropped).
- Rust API trusts session cookies / bearer tokens issued by Better Auth; verify on every protected route.
- OAuth client config:
  - JS origins: `http://localhost:3015`, `https://opengithub.namuh.co`
  - Redirect URIs: `http://localhost:3015/api/auth/callback/google`, `https://opengithub.namuh.co/api/auth/callback/google`
- Auth is **P1 priority** — build it before core features.

## Out of Scope — DO NOT build
- Paywalls, billing, subscription management
- Payment processing
