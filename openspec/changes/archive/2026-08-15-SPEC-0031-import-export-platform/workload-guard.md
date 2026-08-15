# Workload Guard: SPEC-0031 — Import / Export Platform

status: READY
change: SPEC-0031-import-export-platform
phase: Workload Guard
gate: true
executor: project-local `/sdd-direct` orchestrator
role: MID / BUILDER
artifact: `openspec/changes/SPEC-0031-import-export-platform/workload-guard.md`
decision: chained-prs / human-approved
next: Apply 7.1 Foundation
blocked_by: []

## Gate Entry

`tasks-review.md` is `PASS` and names Workload Guard as the only legal next
gate. Apply has not started. This gate carries the non-blocking Working Set
count condition from Architecture Review and Tasks Review; it does not reopen
either review or consume another correction retry.

## Forecast

| Measure                 |                                    Result | Evidence                                                                                                                                                     |
| ----------------------- | ----------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Estimated changed lines |                                   520–680 | `design.md:101`; `tasks.md:3-8`                                                                                                                              |
| 400-line threshold      |                                  Exceeded | `docs/SDD-WORKFLOW.md:150-156`                                                                                                                               |
| Working Set             | 16 paths: 7 creates, 8 modifies, 1 delete | `design.md:42-68`; `tasks.md:16-18`                                                                                                                          |
| Delivery risk           |                                      High | Crosses export, identity authorization, audit persistence, Jobs retention, importer transaction, legacy-route removal, and real-HTTP tenant proof boundaries |
| Schema/migration work   |                                      None | `design.md:69-74,136-142`; `tasks.md:42-46`                                                                                                                  |

## Bounded Context Analysis

The change is cohesive in product intent but is not a safe single review unit
above the 400-line threshold. The approved Working Set crosses independently
reviewable ownership and rollback seams:

1. **Export contract and security foundation** — API-local contracts, guarded
   export service/controller wiring, identity capability enforcement, and
   required fail-closed audit persistence.
2. **Import execution and legacy-route migration** — the allowlisted
   `clientes-csv-v1` definition/processor, Jobs retention options, serializable
   all-or-nothing writes, and removal of the unsafe Admin Tools importer.
3. **Integration and tenant proof** — module composition, real AppModule
   session/Host/org/membership/capability doorbell, regression/refactor checks,
   and the final build/lint/validator evidence.

These seams map to the approved Tasks work units and have distinct rollback
boundaries. Combining them in one review increases the risk of authorization,
audit fail-closed, partial-write, or cross-tenant regressions. No branch or PR
is created by this gate.

## Guard Recommendation

**Recommendation: Chained PRs.** A bounded Size Exception is not recommended.

Recommended delivery remains the repository convention `feature-branch-chain`,
with the three bounded review seams above. The branch/PR sequence remains
maintainer-controlled; no Git lifecycle operation is performed by this gate.

## Recorded HUMAN / MAINTAINER Decision

The HUMAN / MAINTAINER approved the recommended Chained PR strategy using the
repository `feature-branch-chain` convention and authorized the workflow to
proceed to Apply 7.1 within the exact 16-path Working Set. No Size Exception was
selected. This approval authorizes workflow execution only; it does not
authorize branch creation, Commit, Push, Merge, Release, or Tag operations.

## Carried Conditions

- **AR-010 / TR-007 — CONDITION:** The enumerated 16-path Working Set is
  authoritative; the Design's forecast create count differs by one. Do not
  broaden or normalize the path list during Apply.
- The Design's 520–680-line forecast remains the controlling Workload Guard
  estimate until new approved evidence changes it.
- Reporting ownership, schema/migration exclusions, tenant isolation, and
  maintainer Git boundaries remain unchanged.

## Structured Result

```yaml
status: READY
change: SPEC-0031-import-export-platform
action: Workload Guard
role: MID
gate: true
phase: false
tasks_review: PASS
forecast_changed_lines: 520-680
threshold_lines: 400
working_set_paths: 16
working_set_creates: 7
working_set_modifies: 8
working_set_deletes: 1
bounded_context: cohesive-intent-but-multi-boundary
size_exception: not-recommended
chained_pr_recommended: true
delivery_strategy: feature-branch-chain
additional_human_decision_required_before_apply: false
apply_started: false
blocked_by: []
next: Apply 7.1 Foundation
```
