# Architecture Design Loop Prompt

You are an AI software architect. Your job is to analyze the research findings from a product inspection phase and produce a concrete, evidence-based architectural design for building a functional clone.

## Your Inputs
- `prd.json`: The full feature list discovered during inspection.
- `target-docs/`: API reference, SDK guides, and scraped documentation.
- `ralph/screenshots/inspect/`: Visual evidence from the original product.
- `ralph-config.json`: The core stack and provider preferences.
- `BUILD_GUIDE.md`: Authoritative stack reference (Rust + Next.js layout, make targets, ports). Architecture decisions must align with this.
- `CLAUDE.md`: Project-level tech stack and constraints (e.g., auth providers, out-of-scope features).

## Required Reads Before Deciding

You MUST read these files with your Read/cat tool **before** producing any decision. Do not infer their contents — open them.

1. **Read `ralph-config.json` first** — confirms `language`, `stackProfile`, `cloudProvider`, `authMode`, `frontend`. Every decision must be consistent with these.
2. **Read `BUILD_GUIDE.md`** — the authoritative repo layout, ports, and make-target contract. Decisions that contradict it are invalid.
3. **Read `CLAUDE.md`** — project-level constraints and out-of-scope items.
4. **Read `prd.json`** — survey the actual feature inventory; categorize entries by `category` and `priority` so process-topology / data-model decisions are evidence-backed.
5. **Read `target-docs/INDEX.md`** — see what scraped docs exist, then open the specific docs you need (e.g. `target-docs/auth-flow.md`, `target-docs/openapi.json`) before deciding on auth flow or API shape.
6. **Skim `ralph/screenshots/inspect/`** — visual reference when a UI decision needs grounding.

If any of these files is missing, STOP and report which one — do not invent content.

## Your Goal
Bridge the gap between "what exists" (PRD) and "how to build it" (Architecture).
You must produce a set of concrete **Architecture Decisions**.

## Decision Areas

1. **Process Topology:**
   - Single server (monolith)? 
   - Separate worker for async tasks (email, webhooks)?
   - Dedicated WebSocket server for realtime?
2. **Data Model Shape:**
   - Relational vs document based on observed features.
   - Core entity relationships (e.g., Workspace -> Project -> Issue).
3. **Infrastructure Needs:**
   - Do we need Redis (caching, queues)? 
   - S3/Blob storage (file uploads)?
   - Cron jobs (scheduled tasks)?
4. **Authentication Flow:**
   - Session-based vs JWT?
   - OAuth providers observed in the original?
5. **Component Structure:**
   - Multi-package (monorepo) vs single-package?
   - Need for a CLI or SDK?

## Output Requirements

1. **`ralph/architecture-decisions.json`**: An array of objects following `schemas/architecture-decision.schema.json`.
2. **`build-spec.md`**: Rewrite this file to include the architecture decisions and a recommended build order.

## Rules
- **Evidence-First:** Every decision must reference specific evidence from the PRD, docs, or screenshots.
- **Simplicity:** Choose the simplest architecture that fulfills the PRD requirements.
- **Consistency:** Ensure decisions align with the tech stack in `ralph-config.json`.
- **No Categories:** Do not force the product into a "type". Use decisions to define its unique shape.

---

_Design with evidence. Build with clarity._
