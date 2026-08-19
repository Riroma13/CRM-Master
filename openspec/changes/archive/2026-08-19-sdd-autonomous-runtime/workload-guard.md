# Workload Guard: sdd-autonomous-runtime

> **Normalized result:** BLOCKED pending HUMAN / MAINTAINER decision before Apply
> **Gate:** Workload Guard after PASS Tasks Review
> **Persistence:** hybrid; this file is the exact Workload Guard artifact.

## Checkpoint and scope

The authoritative checkpoint is the fresh PASS Tasks Review in
`tasks-review.md`. This bounded guard consumes the approved Design, Tasks, and
Tasks Review only. It does not modify implementation files, generated runtime
state, or Git state.

## Forecast

| Field | Result |
|---|---|
| Estimated changed lines | **900–1,300** |
| 400-line threshold | **Exceeded** |
| Risk classification | **High** |
| Size Exception | **Not recommended** |
| Chained PRs | **Required/recommended** |
| Delivery strategy | **force-chained / stacked-to-main** |

## Cohesive-context analysis

The change is one cohesive, product-neutral SDD runtime boundary: deterministic
state, recovery, routing, Direct/Resume wiring, evidence, and tests share one
approved contract. It is not suitable for a Size Exception because the forecast
contains three independently reviewable and rollback-capable slices:

| Unit | Boundary | Focused evidence | Rollback |
|---|---|---|---|
| PR1 | Contract/runtime foundation | `node --test scripts/sdd-runtime.test.mjs` | Remove runtime/unit changes |
| PR2 | Direct/Resume/map/validator wiring | `pnpm sdd:validate && pnpm test:sdd-resume` | Revert wiring; retain PR1 |
| PR3 | Integration/E2E/docs/regression | Runtime integration/E2E commands | Disable autonomous loop; retain artifacts and cold recovery |

The slices are separable, based sequentially, have focused checks, and remain
inside the approved Working Set. No branch, PR, or other Git mutation is
created by this guard.

## Decision boundary

`openspec/config.yaml` proves the configured `force-chained` / `stacked-to-main`
delivery strategy. However, the current canonical workflow's Workload Guard
rule requires an explicit HUMAN decision before Apply when the forecast exceeds
400 lines. The target AC-11 standing-policy behavior is part of the runtime
being designed; it is not yet an executable replacement for the current gate.
This migration must not simulate that future behavior or weaken the current
governance before fresh Verify.

**Recommendation:** approve the three-slice chained delivery; no Size Exception
is requested. Apply 7.1 remains forbidden until the HUMAN decision is recorded.

## Validator evidence

| Command | Exact result | Status |
|---|---|---|
| `pnpm sdd:validate` | `CRM-SDD governance validation: PASS` | PASS |
| `pnpm sdd:validate:design -- openspec/changes/sdd-autonomous-runtime/design.md` | `Enterprise Design validation: PASS` | PASS |

## Structured result

```yaml
status: BLOCKED
change: sdd-autonomous-runtime
phase: Workload Guard
artifact: openspec/changes/sdd-autonomous-runtime/workload-guard.md
decision: chained-prs / stacked-to-main / HUMAN_REQUIRED
human_required: true
blocker:
  class: HUMAN_RISK_ACCEPTANCE
  reason: current workflow requires HUMAN approval for an above-400-line Apply delivery
  resume_phase: Apply 7.1
next: HUMAN approval of the bounded three-slice chained delivery
blocked_by:
  - forecast exceeds the 400-line review budget
  - current Workload Guard requires HUMAN decision before Apply
```
