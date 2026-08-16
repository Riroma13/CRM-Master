# Workload Guard: SPEC-0032 — Data Retention & Lifecycle Platform

status: BLOCKED
change: SPEC-0032-data-retention-lifecycle-platform
phase: Workload Guard
gate: true
executor: project-local `/sdd-direct` orchestrator
role: MID / BUILDER
artifact: `openspec/changes/SPEC-0032-data-retention-lifecycle-platform/workload-guard.md`
decision: pending-human
next: HUMAN / MAINTAINER decision before Apply
blocked_by:
  - HUMAN decision: approve Chained PRs or authorize a Size Exception

## Gate Entry

`tasks-review.md` is `PASS` and names Workload Guard as the only legal next
gate. Apply has not started. This gate records the bounded context analysis for
the high-workload plan; it does not reopen Design or either review and consumes
no additional correction retry.

## Forecast

| Measure | Result | Evidence |
|---|---:|---|
| Estimated changed lines | 800–1,100 | `tasks.md:7-13` |
| 400-line threshold | Exceeded | `docs/SDD-WORKFLOW.md:150-156` |
| Design Working Set | 19 paths: 12 primary, 7 secondary | `design.md:42-71` |
| Tasks Working Set | 21 exact paths: 12 creates, 9 modifies | `tasks.md:23-37`; two bounded evidence paths were added during Tasks Refinement and accepted by the fresh Tasks Review |
| Delivery risk | High | Schema/migration, lifecycle engine, owner adapters, module wiring, API, doorbell isolation, and ADR evidence cross independent ownership seams |
| Schema/migration work | Additive | `tasks.md:25-26`; migration SQL is generated and reviewed, never hand-authored |

## Bounded Context Analysis

The change is cohesive in product intent but is not a safe single review unit
above the 400-line threshold. The approved Tasks work units have independent
review and rollback seams:

1. **PR1 — schema and contract foundation**: additive Prisma models/indexes,
   migration SQL review, shared lifecycle contracts/exports, generation and
   tenant-scope freshness evidence. Runtime harness is not applicable to the
   additive schema-only unit.
2. **PR2 — lifecycle engine and owner adapters**: policy validation and
   scheduling, trusted job execution, idempotent run ledger, audit/document
   adapter registration, and cycle-free module wiring. Focused API unit tests
   provide the bounded worker proof; schedules can be disabled and the feature
   module removed without changing existing domain cleanup.
3. **PR3 — API and tenant proof**: Host-scoped endpoints, real-HTTP doorbell
   coverage for distinct tenants and forged job envelopes, ADR-0032 evidence,
   focused regression, lint, and build. API, test, and ADR evidence have an
   independent rollback boundary.

These seams map directly to the autonomous PR1/PR2/PR3 work units in `tasks.md`
and reduce the risk of tenant-isolation, legal-hold, destructive-predicate,
module-composition, and migration regressions being reviewed as one oversized
unit. No branch or PR is created by this gate.

## Guard Recommendation

**Recommendation: Chained PRs.** A bounded Size Exception is not recommended.

The repository convention is `feature-branch-chain`; the three work units have
distinct base boundaries, focused commands, runtime harnesses or explicit N/A,
finish criteria, and rollback boundaries. The recommendation is evidence only;
the branch/PR sequence remains maintainer-controlled.

## Required HUMAN / MAINTAINER Decision

Apply cannot start until the HUMAN / MAINTAINER explicitly chooses one of:

1. **Approve Chained PRs** using the three bounded work units and
   `feature-branch-chain`; or
2. **Authorize a Size Exception** for the 800–1,100-line cohesive change.

This gate performs neither branch creation nor Commit, Push, Merge, Release, or
Tag operations. No decision is inferred from the recommendation.

## Carried Conditions

- **AR-003 — CONDITION:** Product/compliance must confirm the 24-month
  run-ledger window or record a changed window in `ADR-0032` before any tenant
  policy is enabled. This remains non-blocking for the gate.
- **TR-NB-001 — CONDITION:** Apply must separately record migration-file review
  and generated-scope freshness, with no generated output hand-edited.
- The exact Tasks Working Set is authoritative for Apply; no path may be added
  or removed without a bounded, recorded deviation under the canonical workflow.

## Structured Result

```yaml
status: BLOCKED
change: SPEC-0032-data-retention-lifecycle-platform
action: Workload Guard
role: MID
gate: true
phase: false
tasks_review: PASS
forecast_changed_lines: 800-1100
threshold_lines: 400
design_working_set_paths: 19
tasks_working_set_paths: 21
tasks_working_set_creates: 12
tasks_working_set_modifies: 9
tasks_working_set_deletes: 0
bounded_context: cohesive-intent-but-multi-boundary
size_exception: pending-human
chained_pr_recommended: true
delivery_strategy: feature-branch-chain
additional_human_decision_required_before_apply: true
apply_started: false
blocked_by:
  - HUMAN decision: approve Chained PRs or authorize a Size Exception
next: HUMAN / MAINTAINER decision before Apply 7.1 Foundation
```

## Human Decision — Apply 7.1 Entry

The HUMAN / MAINTAINER explicitly approved the recommended three chained PRs
using `feature-branch-chain`. This resolves the Workload Guard with delivery
strategy `feature-branch-chain`; it is not a Size Exception. No branch or PR
operation is performed by Apply.

```yaml
decision: approved
decision_by: HUMAN / MAINTAINER
delivery_strategy: feature-branch-chain
size_exception: false
approved_slice: PR1 / Apply 7.1 Foundation
```
