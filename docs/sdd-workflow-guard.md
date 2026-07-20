# SDD Workflow Guard — v2.1

> **Centralized transition validator for the SDD orchestrator.**
> Do NOT duplicate these rules in individual skills or phase prompts.
> The orchestrator is the sole enforcer.

---

## Official Workflow

```
Design
→ Architecture Review
→ Design Refinement (if required)
→ Tasks
→ Tasks Review
→ Tasks Refinement (if required)
→ Apply
→ Verify
→ Archive
→ Health Report
→ Repository Ready
→ Commit
→ Push
```

---

## Transition Table

| Current phase | Allowed next phases | Forbidden next phases |
|---------------|-------------------|----------------------|
| — (start) | Design | Architecture Review, Tasks, Apply, Verify, Archive |
| Design | Architecture Review | Tasks, Apply, Verify, Archive |
| Architecture Review | Design Refinement, Tasks | Apply, Verify, Archive |
| Design Refinement | Architecture Review | Tasks, Apply, Verify, Archive |
| Tasks | Tasks Review | Apply, Verify, Archive |
| Tasks Review | Tasks Refinement, Apply | Verify, Archive |
| Tasks Refinement | Tasks Review | Apply, Verify, Archive |
| Apply | Verify | Archive, Health Report, Commit, Push |
| Verify | Archive | Health Report, Commit, Push |
| Archive | Health Report | Commit, Push |
| Health Report | Repository Ready | Commit, Push |
| Repository Ready | Commit | Push |
| Commit | Push | — |
| Push | — (end) | — |

---

## Conditional Transitions

### Architecture Review → Design Refinement

If the Architecture Review verdict is `REJECTED` or `APPROVED WITH CONDITIONS`,
the next phase MUST be **Design Refinement**.

If the verdict is `APPROVED`, the next phase is **Tasks** (skip Design Refinement).

### Tasks Review → Tasks Refinement

If the Tasks Review produces conditions or corrections,
the next phase MUST be **Tasks Refinement**.

If the review is clean (no conditions), the next phase is **Apply**.

### Tasks Refinement → Tasks Review

After refinement, the review must run again.
Only after a clean review can the workflow proceed to Apply.

---

## Guard Rules

### Rule 1 — Validate Before Delegation

Before invoking any sub-agent for the next phase, the orchestrator MUST:

1. Identify the current phase (from artifact store or session state).
2. Look up the current phase in the Transition Table.
3. If the requested next phase is in **Forbidden**, BLOCK the transition:
   - Do NOT invoke the sub-agent.
   - Explain which phase is expected next.
   - Wait for user confirmation.
4. If the requested next phase is in **Allowed**, proceed normally.

### Rule 2 — Conditional Check

If the transition is conditional (Architecture Review → Design Refinement,
Tasks Review → Tasks Refinement), check the condition BEFORE delegating:

- Architecture Review: read the verdict from the review output.
  - `REJECTED` or `APPROVED WITH CONDITIONS` → Design Refinement required.
  - `APPROVED` → proceed to Tasks.
- Tasks Review: read the review output.
  - If conditions exist → Tasks Refinement required.
  - If clean → proceed to Apply.

### Rule 3 — No Skipping

Every phase in the workflow MUST be visited at least once.
Skipping from Design to Apply, or from Tasks to Verify, is ALWAYS invalid.

Exception: Design Refinement and Tasks Refinement may be skipped
when the respective review produces no conditions.

### Rule 4 — No Re-entrance Without Condition

A phase cannot be re-entered unless the preceding review demands it:

- Architecture Review → Design Refinement (re-enters refinement)
- Tasks Review → Tasks Refinement (re-enters refinement)
- Design Refinement → Architecture Review (re-enters review)
- Tasks Refinement → Tasks Review (re-enters review)

Direct re-entrance (e.g., Design → Design) is ALWAYS invalid.

---

## Quick Reference

```
Start ──→ Design ──→ ArchReview ──→ DesignRefine ──→ Tasks ──→ TasksReview ──→ TasksRefine ──→ Apply ──→ Verify ──→ Archive
            │            │              │               │            │               │              │         │          │
            │            │              │               │            │               │              │         │          │
            ▼            ▼              ▼               ▼            ▼               ▼              ▼         ▼          ▼
         ArchReview   Tasks       ArchReview       TasksReview   Apply         TasksReview      Verify    Archive   HealthReport
                      (if APPROVED)                (if clean)                   (if clean)
```

---

## File location

This guard is the SINGLE source of truth for SDD workflow transitions.
All orchestrator instances MUST read this file at session start
and validate every transition against it.

Do not create additional workflow guard files.
Do not embed transition rules in individual skills.
