# Workload Guard: SPEC-0028 — Jobs & Background Processing Platform

status: READY
change: SPEC-0028-jobs-background-processing-platform
phase: Workload Guard
gate: true
executor: project-local `/sdd-direct` orchestrator
role: MID / BUILDER
artifact: `openspec/changes/SPEC-0028-jobs-background-processing-platform/workload-guard.md`
decision: chained-prs / stacked-to-main / human-approved
next: Apply 7.1 Foundation
blocked_by: []

## Gate Entry

`tasks-review.md` is `PASS` and names Workload Guard as the only legal next
action. Apply has not started. The Tasks Review conditions remain carried
forward; this gate does not reopen Tasks Review or consume another refinement
retry.

The HUMAN / MAINTAINER explicitly approved the recommended Chained PRs
strategy using `stacked-to-main`. The approval closes the above-400-line gate;
it does not authorize branch, commit, push, merge, release, or tag operations.

## Forecast

| Measure | Result | Evidence |
|---|---:|---|
| Estimated changed lines | 650–900 | `tasks.md:3-9` |
| 400-line threshold | Exceeded | `docs/SDD-WORKFLOW.md:150-156` |
| Working Set | 17 paths: 9 creates, 8 modifies | `tasks.md:17-20`; `design.md:31-55` |
| Delivery risk | High | New Redis/jobs platform plus root extraction, wiring, telemetry, and real-DB tenant doorbell |
| Schema/migration work | None | `design.md:57-62,192-198`; `tasks.md:20,41` |

## Bounded Context Analysis

The change is cohesive in intent: it introduces one API-process Jobs platform
foundation with fail-closed Redis configuration, typed contracts, lifecycle
control, tenant authority, and bounded telemetry. It is not cohesive enough for
a single size-exception delivery because the approved Working Set crosses
multiple independently reviewable boundaries:

1. **Platform foundation and ownership extraction** — new Jobs root/config/
   contracts/lifecycle plus removal of Activity Timeline root ownership while
   preserving queue identities and options.
2. **Core execution and observability** — client validation, retry/poison,
   delay/scheduler/cancel, drain/recovery, metrics redaction, and health
   readiness.
3. **Composition and tenant proof** — Infrastructure/Health wiring, existing
   registration preservation, and the real-DB cross-tenant/forged/inactive
   doorbell.

These seams correspond to the approved Apply dependencies and rollback
boundaries. The change also has high compatibility sensitivity: existing queue
registrations and Identity outbox/DLQ behavior must remain unchanged, while
tenant isolation is a critical acceptance boundary. A single review unit would
combine root ownership movement, runtime behavior, composition wiring, and
database-backed isolation evidence beyond the 400-line review budget.

## Guard Result

**Recommendation: Chained PRs.** A bounded Size Exception is not recommended.

Recommended `stacked-to-main` delivery seams, without creating branches or
performing Git operations in this gate:

| Chain unit | Apply scope | Review/rollback boundary |
|---|---|---|
| PR 1: Foundation | 7.1.1–7.1.2 | Jobs root/config/contracts/lifecycle and Activity Timeline root-ownership regression; revert platform foundation and ownership extraction only. |
| PR 2: Core and telemetry | 7.2.1–7.3.2 | Client/lifecycle behavior, retry/outage/drain tests, metrics, and health readiness; revert the bounded core/telemetry unit. |
| PR 3: Wiring and tenant proof | 7.3.3–7.5.3 | Infrastructure/Health wiring, queue-preservation assertions, real-DB doorbell, refactor, and focused regression gates; revert the integration/proof unit. |

Apply 7.6 remains the consolidated summary for the completed nested Apply
work. No branch, commit, push, merge, release, or tag is performed by this
Workload Guard.

## Carried Conditions

- **TR-004 — CONDITION:** Future domain adoption must choose and test
  conservative per-definition concurrency values before its first consumer.
- **TR-005 — CONDITION:** This forecast requires Workload Guard completion and
  explicit HUMAN / MAINTAINER approval before Apply.
- The protected-path Design-validator notice remains the previously recorded
  non-blocking condition; this gate does not reinterpret it.

## Recorded HUMAN Decision

The maintainer approved:

> **Approve Chained PRs with `stacked-to-main` delivery for the three bounded
> seams above, authorizing the workflow to proceed to Apply 7.1 only after this
> approval is recorded.**

No Size Exception was selected. The recorded decision authorizes the canonical
transition to Apply 7.1 within the approved chained-PR boundaries.

## Structured Result

```yaml
status: READY
change: SPEC-0028-jobs-background-processing-platform
action: Workload Guard
artifact: openspec/changes/SPEC-0028-jobs-background-processing-platform/workload-guard.md
role: MID
gate: true
phase: false
tasks_review: PASS
forecast_changed_lines: 650-900
threshold_lines: 400
bounded_context: cohesive-intent-but-multi-boundary
size_exception: not-recommended
chained_pr_required: true
delivery_strategy: stacked-to-main
additional_human_decision_required_before_apply: false
apply_started: false
blocked_by: []
next: Apply 7.1 Foundation
```
