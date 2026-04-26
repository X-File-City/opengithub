# Audit Phase Specification

This spec defines how Phase 4 (Audit) discovery works.

## Input
- Source code of the clone.
- `prd.json`: feature list.
- `qa-report.json`: QA attempt history.
- `ralph/production-checklist.json`: standard production-readiness criteria.

## Process
1. **Parallel Scan:** Multiple specialized auditor agents scan the repository.
   - `Feature Auditor`: Compares current implementation vs `prd.json` and the target URL.
   - `Readiness Auditor`: Checks for common production gaps (logging, errors, health).
   - `Security Auditor`: Reviews auth, validation, and rate-limiting.
   - `Performance Auditor`: Looks for slow patterns (N+1, missing indexes).
2. **Gap Identification:** For each gap found, the auditor creates an entry in `ralph/harden-gap.json`.
3. **Consolidation:** The orchestrator deduplicates and prioritizes gaps.

## Gap Entry Standards
Every entry in `ralph/harden-gap.json` must follow `schemas/harden-gap.schema.json`.

### Severity Levels
- **critical**: Security vulnerability, data loss risk, or immediate crash potential.
- **high**: Essential for operation (structured logs, migrations, basic indexes).
- **medium**: Important for long-term health (graceful shutdown, rate limits, queues).
- **low**: Polish or optimization (OpenAPI docs, minor caching).

### Evidence
Evidence is MANDATORY. It must be a file path, code snippet, or a specific test failure log. 
> Example: "Evidence: app/main.py lacks any `try/except` around the database connection."

## verifier Contract
Each gap must include a `verifier` field. This is a shell command that the Phase 6 (Harden) runner will use to confirm the gap is closed.
> Example: `verifier: "grep -r 'pino' src/"`

---

_If it isn't audited, it isn't production-grade._
