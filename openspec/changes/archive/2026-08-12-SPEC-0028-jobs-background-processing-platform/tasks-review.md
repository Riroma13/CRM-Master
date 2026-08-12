# Tasks Review: SPEC-0028 — Jobs & Background Processing Platform

status: PASS
change: SPEC-0028-jobs-background-processing-platform
phase: Tasks Review
executor: MID / BUILDER — `sdd-direct-tasks-review`
model_binding: `openai/gpt-5.6-luna` (`.opencode/sdd-model-map.json:13-16,34-35,56-57`)
artifact: `openspec/changes/SPEC-0028-jobs-background-processing-platform/tasks-review.md`
decision: tasks-review-pass
next: Workload Guard only

## Review provenance and correction history

The prior fresh Tasks Review was **BLOCKED** and required the single permitted
Tasks Refinement. TR-001 (omitted Activity Timeline Redis test), TR-002 (missing
explicit REFACTOR), and TR-003 (missing integration-wiring RED) were corrected
in refined `tasks.md`. Prior conditions TR-004 (future consumer concurrency) and
TR-005 (>400 forecast) remain non-blocking below. This is the one fresh review
after refinement; no second Tasks Refinement is available.

## Fresh bounded review

Consumed refined `tasks.md`, approved `design.md`, prior `tasks-review.md`, and
PASS `architecture-review.md` before the declared Read Order. The nine entries
were then read in order: Activity Timeline module and queue constants,
Infrastructure module, Identity module and dispatcher, Prisma service,
notification reminders, metrics and health controller, and Identity doorbell.
No implementation, Design/tasks edit, Workload Guard, Apply, Verify, Archive, or
Git operation was performed.

## Findings

| ID | Normalized status | Finding | Evidence / owner |
|---|---|---|---|
| TR-001 | PASS — closed | Exact Working Set is complete: 9 creates and 8 modifies, including the Activity Timeline Redis regression test, tied to 7.1.1 and its rollback boundary. | `tasks.md:17-20`; `design.md:31-55` |
| TR-002 | PASS — closed | Explicit RED→GREEN→REFACTOR coverage exists; REFACTOR follows implementation and precedes checkpoint evidence. | `tasks.md:25-38`; `design.md:104-115` |
| TR-003 | PASS — closed | Integration wiring has RED assertions before 7.4.1 GREEN, covering Jobs readiness and preservation of existing queue registration/options. | `tasks.md:30-35`; `design.md:43-45,104-110` |
| TR-004 | CONDITION | Per-definition concurrency remains open only for a future domain adoption; that adoption must choose and test conservative values. | Owner: future domain-adoption Design/owner; `architecture-review.md:35,44,70`; `design.md:200-204` |
| TR-005 | CONDITION | 650–900 forecast is above the 400-line threshold; chain choice is not final authorization in Tasks. | Owner: Workload Guard + HUMAN / MAINTAINER; `tasks.md:3-9`; `docs/SDD-WORKFLOW.md:145-158` |

## Completeness checks

| Check | Result | Evidence |
|---|---|---|
| Exact Working Set | PASS | All 17 Design paths are listed: 9 creates / 8 modifies; Activity Timeline Redis regression test included. |
| Declared Read Order | PASS | `tasks.md:22-23` reproduces the Design’s nine-entry order. |
| Dependency/order | PASS | Foundation → client/lifecycle → telemetry → wiring → doorbell → refactor/checkpoint is ordered; wiring RED precedes GREEN. |
| RED-first threat coverage | PASS | Forged/foreign/inactive context, retry/poison, delay/scheduler, cancellation, lifecycle, telemetry/redaction, root/wiring, and doorbell cases have explicit RED tasks; N/A threat rows remain omitted. |
| Acceptance criteria | PASS | `tasks.md:40-41` covers contracts, outage, shutdown, status/cancel, redaction, queue/Identity preservation, commands, and migration exclusion. |
| Tenant isolation proof | PASS | Real-DB doorbell, active-tenant revalidation, scoped `PrismaService.forTenant`, forged/cross-tenant denial, and scoped reload are explicit. |
| Exclusions | PASS | Identity behavior, notifications, unrelated domains, `app.module.ts`, schema/migrations, generic persistence, producer migration, and standalone worker remain excluded. |
| Forecast / condition ownership | CONDITION | 650–900, High, and decision-needed are consistent; downstream guard/HUMAN owns bounded analysis and approval. |

## Validator evidence

| Command | Exact result | Classification |
|---|---|---|
| `pnpm sdd:validate` | `CRM-SDD governance validation: PASS` — canonical files/classifications, 14 phases, Apply 7.1–7.6, local Direct wiring, model bindings, hybrid persistence, and maintainer gates valid. | PASS |
| `pnpm sdd:validate:design -- "openspec/changes/SPEC-0028-jobs-background-processing-platform/design.md"` | `Enterprise Design validation: FAIL (openspec/changes/SPEC-0028-jobs-background-processing-platform/design.md)`; `SPEC-0028 is protected and is not read by this validator`; `ELIFECYCLE Command failed with exit code 1.` | CONDITION — expected protected Design-validator notice; separate from Tasks findings. |

No downstream execution command was run.

## Canonical next action

**PASS. Workload Guard is the only legal next gate.** The 650–900 forecast is
above 400, so Workload Guard must perform bounded context analysis and obtain a
HUMAN / MAINTAINER decision before Apply. Apply is not authorized by this review.

## Structured result

```yaml
status: PASS
change: SPEC-0028-jobs-background-processing-platform
phase: Tasks Review
artifact: openspec/changes/SPEC-0028-jobs-background-processing-platform/tasks-review.md
findings:
  - TR-001: PASS — closed
  - TR-002: PASS — closed
  - TR-003: PASS — closed
  - TR-004: CONDITION
  - TR-005: CONDITION
evidence:
  - Exact Working Set verified: 17 paths (9 creates, 8 modifies).
  - Declared nine-entry Read Order verified.
  - RED→GREEN→REFACTOR and integration wiring RED-before-GREEN verified.
  - Tenant isolation doorbell and scoped execution proof verified.
  - pnpm sdd:validate: PASS.
  - Protected SPEC-0028 Design validator notice preserved as separate CONDITION.
next_action: Workload Guard only; bounded context analysis and HUMAN decision required before Apply.
```
