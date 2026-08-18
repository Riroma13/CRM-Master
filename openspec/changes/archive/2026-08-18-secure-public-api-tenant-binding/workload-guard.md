# Workload Guard: secure-public-api-tenant-binding

status: BLOCKED
change: secure-public-api-tenant-binding
phase: Workload Guard
gate: true
executor: project-local `/sdd-direct` orchestrator
role: MID / BUILDER
artifact: `openspec/changes/secure-public-api-tenant-binding/workload-guard.md`
decision: pending-human
next: HUMAN / MAINTAINER decision before Apply
blocked_by:
  - HUMAN decision: approve Chained PRs or authorize a Size Exception

## Gate Entry

The fresh Phase 5 Tasks Review is **PASS** and names Workload Guard as the only
legal next gate. The refined Tasks artifact forecasts 420–560 changed lines,
which exceeds the canonical 400-line threshold. Apply has not started. This gate
records bounded context analysis only; it does not reopen Design or either
review, consume another correction retry, or create branches or pull requests.

## Forecast

| Measure | Result | Evidence |
|---|---:|---|
| Estimated changed lines | 420–560 | `tasks.md:7-18` |
| 400-line threshold | Exceeded | `docs/SDD-WORKFLOW.md:150-156` |
| Tasks Working Set | 13 paths: 10 primary, 3 conditional secondary | `tasks.md:20-43` |
| Primary creates | 1 | `tasks.md:33` |
| Primary modifications | 9 | `tasks.md:24-32` |
| Conditional modifications | 3, only when RED evidence requires them | `tasks.md:35-39` |
| Delivery risk | High | `tasks.md:7-18`; security boundary spans guard, controllers, regression suites, and real HTTP evidence |

## Bounded Context Analysis

The change is cohesive in security intent but is not a safe single review unit
above the 400-line threshold. The approved Tasks work units have independent
review, verification, and rollback seams:

1. **Unit 1 — guard authority:** `token-auth.guard.ts` and its focused guard
   tests. Finish evidence is persisted-key tenant authority, Host/selector
   conflict denial, authentication-status coverage, and no-overwrite behavior.
2. **Unit 2 — controller and regression boundary:** both v1 controllers and
   their controller, cross-tenant, full-flow, and scope suites. Finish evidence
   is trusted authority on all four handlers, A-scoped resource lookup,
   document null-to-404 before mapping, and preserved 401/403 contracts.
3. **Unit 3 — real HTTP and compatibility proof:** the new A/B doorbell plus
   conditional default-deny, Host-middleware, or token-service evidence only
   when a named RED failure requires it. Finish evidence is the no-disclosure
   and no-mutation HTTP matrix, lint, build, validators, and bounded scope
   evidence.

These seams map directly to the refined Tasks work units and reduce the risk of
tenant-authority, Host/selector, resource-status, and no-disclosure regressions
being reviewed as one oversized unit. The conditional secondary paths remain
RED-justified and cannot be added speculatively. No branch or pull request is
created by this gate.

## Guard Recommendation

**Recommendation: Chained PRs.** A Size Exception is not recommended because
the three bounded units have distinct ownership, focused verification, finish
criteria, and rollback boundaries despite their shared security objective.

The project convention is `feature-branch-chain`; that convention is not itself
a Workload Guard outcome. The canonical gate outcome remains **Chained PRs** or
**Size Exception**, and the delivery strategy remains maintainer-controlled.

## Required HUMAN / MAINTAINER Decision

Apply cannot start until the HUMAN / MAINTAINER explicitly chooses one of:

1. **Approve Chained PRs** using the three bounded work units and
   `feature-branch-chain`; or
2. **Authorize a Size Exception** for the cohesive 420–560-line change.

No decision is inferred from this recommendation. This gate performs neither
branch creation nor Commit, Push, Merge, Release, or Tag operations.

## Structured Result

```yaml
status: BLOCKED
change: secure-public-api-tenant-binding
action: Workload Guard
role: MID
gate: true
phase: false
tasks_review: PASS
forecast_changed_lines: 420-560
threshold_lines: 400
tasks_working_set_paths: 13
tasks_working_set_primary_creates: 1
tasks_working_set_primary_modifies: 9
tasks_working_set_conditional_modifies: 3
bounded_context: cohesive-intent-but-multi-boundary
size_exception: pending-human
chained_pr_recommended: true
delivery_strategy: pending-human
additional_human_decision_required_before_apply: true
apply_started: false
blocked_by:
  - HUMAN decision: approve Chained PRs or authorize a Size Exception
next: HUMAN / MAINTAINER decision before Apply 7.1 Foundation
```

---

## HUMAN Decision — Apply 7.1 Entry

The HUMAN / MAINTAINER approved **Chained PRs** for this change, using the
three bounded work units and the repository's `feature-branch-chain`
convention. This is not a Size Exception. The decision is recorded after the
bounded Workload Guard analysis; no branch or pull request operation is
performed by Apply.

The standing policy also authorizes mechanical Chained PR approval for future
Workload Guard results when the forecast exceeds the threshold, chain
boundaries are safely separable, Chained PRs are recommended, and no material
architecture, product, security, production, database, or destructive-action
decision is introduced. HUMAN intervention remains required for those material
exceptions.

```yaml
status: PASS
decision: approved
decision_by: HUMAN / MAINTAINER
delivery_strategy: feature-branch-chain
size_exception: false
approved_slice: Apply 7.1 Foundation
apply_started: false
next: Apply 7.1 Foundation
```
