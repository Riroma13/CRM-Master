# SDD Platform — Future Prompt Proposals

> **Document type:** Informational
> **Status:** PENDING_REVIEW
> **Last updated:** 2026-07-18

This document stores future prompt ideas for the SDD platform.

They are **not approved** and **not scheduled**.

Each requires historical evidence via the review trigger defined in
`docs/roadmaps/future-roadmap.md` before any implementation can be considered.

---

## Prompt A — SDD Benchmark

| Field | Value |
|-------|-------|
| Status | **PENDING_REVIEW** |
| Trigger | Historical evidence required (≥20% recurrence) |
| Implementation | None |

**Goal:**

Using archived JSON artifacts, compare historical implementations and quantify
the impact of SDD.

**Output:**

- Average implementation duration
- Average Working Set Accuracy
- Average Verify Iterations
- Exploration reduction over time
- Files modified trend
- Reads trend
- Searches trend

**Constraints:**

Output only Markdown. Do not modify the workflow. Do not modify archives.
Read-only command.

---

## Prompt B — Hot File Trend

| Field | Value |
|-------|-------|
| Status | **PENDING_REVIEW** |
| Trigger | Historical evidence required (≥20% recurrence) |
| Implementation | None |

**Goal:**

Implement historical Hot File Trend analysis. Read archived implementations
and git history.

**Output:**

- Top hot files by period
- Trend (improving / worsening)
- New hotspots
- Removed hotspots
- Files whose modification frequency is decreasing after architectural refactors

**Constraints:**

No workflow changes. Read-only.

---

## Prompt C — Design Drift

| Field | Value |
|-------|-------|
| Status | **PENDING_REVIEW** |
| Trigger | Historical evidence required (≥20% recurrence) |
| Implementation | None |

**Goal:**

Implement Design Drift analysis by comparing Design prediction vs Archive
implementation.

**Measure:**

- Files
- Tests
- Commands
- Dependencies
- Confidence

**Output:**

Drift percentages per category.

**Constraints:**

No workflow changes. Read-only.

---

## Prompt D — Architectural Debt Index

| Field | Value |
|-------|-------|
| Status | **PENDING_REVIEW** |
| Trigger | Historical evidence required (≥20% recurrence) |
| Implementation | None |

**Goal:**

Implement an Architectural Debt Index that combines:

- Hot files
- ADR coverage
- TODO density
- Module aggregation
- Cross-boundary dependencies

**Output:**

A single debt score with contributor explanation. Historical trend required.

**Constraints:**

Read-only.

---

## Prompt E — Review Cost

| Field | Value |
|-------|-------|
| Status | **PENDING_REVIEW** |
| Trigger | Historical evidence required (≥20% recurrence) |
| Implementation | None |

**Goal:**

Implement Review Cost estimation. For every archived implementation calculate:

- Changed files
- Changed lines
- Tests
- Architectural impact
- Complexity

**Output:**

Review Cost classification: Low / Medium / High. Historical evolution.

**Constraints:**

Read-only.

---

## Prompt F — Knowledge Map

| Field | Value |
|-------|-------|
| Status | **PENDING_REVIEW** |
| Trigger | Historical evidence required (≥20% recurrence) |
| Implementation | None |

**Goal:**

Generate a Knowledge Map from the repository. Discover:

- Modules
- Services
- Repositories
- Frontend components
- Prisma models
- Tests

**Output:**

A dependency graph in Markdown.

**Constraints:**

No workflow changes. No code generation.

---

## Prompt G — Living Architecture

| Field | Value |
|-------|-------|
| Status | **PENDING_REVIEW** |
| Trigger | Historical evidence required (≥20% recurrence) |
| Implementation | None |

**Goal:**

Implement Living Architecture documentation that automatically generates an
Architecture Overview using:

- ADR
- OpenSpec
- Navigation Registry
- Aggregators
- Prisma schema
- Application modules

**Output:**

Markdown only. Generated document must always reflect the current repository.

**Constraints:**

No workflow changes.

---

## Important Notice

All prompts listed in this document are **proposals only**.

Nothing in this document authorizes automatic modifications to the SDD platform,
its workflow, prompts, agents, or commands. Each prompt requires:

1. Review trigger activation (≥40 implementations or PRs)
2. Historical metrics collection via `/sdd-metrics`
3. Pattern identification (≥20% recurrence)
4. ADR proposal and acceptance
5. Human-approved implementation

---

## References

- `docs/roadmaps/future-roadmap.md` — review triggers and procedure
- ADR-0004: SDD Feature Freeze
- `docs/architecture/sdd-infrastructure.md` §5 — Platform Stability Policy
