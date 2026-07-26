# Workload Guard: SPEC-0025 - Identity & Organization Platform

status: READY
change: SPEC-0025-identity-platform
phase: Workload Guard
artifact: `openspec/changes/SPEC-0025-identity-platform/workload-guard.md`
decision: chained-prs / stacked-to-main
next: Apply Phase 1
skill_resolution: paths-injected
blocked_by: []

## Guard Entry

The transition into Workload Guard is authorized by the clean Tasks Review:

- `tasks-review.md` is `APPROVED` with no findings.
- `architecture-review-direct-repeat-2.md` is `APPROVED`; AR-012 through AR-014
  are closed and AR-015 through AR-022 are downstream implementation conditions.
- No size exception is selected.
- The delivery decision is planning metadata only. No branch, commit, push,
  merge, release, tag, or PR operation is performed by this artifact.

The pre-Apply scope manifest must protect every completed review/planning
artifact, including `architecture-review.md`,
`architecture-review-direct.md`, `architecture-review-direct-repeat.md`,
`architecture-review-direct-repeat-2.md`, `design-refinement.md`,
`design-refinement-repeat.md`, `tasks-review.md`, `workload-guard.md`, and
ADR-0025. Their hashes must be captured before any future Apply phase.

## Workload Forecast

| Measure | Result | Evidence or assumption |
|---|---:|---|
| Estimated implementation changes | `~2,100-2,700` lines | `tasks.md`; includes schema/config, tests, provider adapter, migration/backfill, controllers, composition, queue, and five doorbells. |
| 400-line budget risk | High | The forecast exceeds the repository's review budget. |
| Product/runtime lines changed now | `0` | This Workload Guard records delivery metadata only; Apply is not executed in this planning continuation. |
| Repository count | `1` | All declared paths are in CRM-Master. |
| Workload confidence | Medium | This is a planning forecast, not an implementation diff. |

## Canonical Complexity Score

The canonical guard criteria total **12**, which is in the `>= 4` range and
recommends Chained PRs. The prior `14` value in the Tasks Review forecast was a
planning arithmetic error; the current `tasks.md` corrects it. Dirty-worktree
protection is mandatory scope evidence but is not a separate scoring criterion.

| Criterion | Applies | Points | Reason |
|---|---:|---:|---|
| More than 1,500 estimated LOC | Yes | 2 | The implementation forecast is `~2,100-2,700` lines. |
| Multiple bounded contexts | Yes | 2 | Identity, provider integration, audit, migration, and composition have distinct ownership boundaries. |
| Shared contracts modified | Yes | 2 | Shared Identity contracts, provider outcomes, permissions, and mutation events are in scope. |
| Existing consumers | Yes | 2 | Existing auth, tenant-scope, legacy guard, User projection, and module paths require compatibility. |
| Migration required | Yes | 2 | Provider/local schema hardening and report-driven backfill are required. |
| Multiple repositories/modules | Yes | 1 | One repository contains multiple independently owned application/database/shared modules. |
| Backward compatibility | Yes | 1 | Legacy User, ClientUser, provider writers, guards, and migrations remain compatible boundaries. |
| **Total** |  | **12** | **`>= 4` -> Chained PRs** |

## Delivery Decision

**Recommendation:** Chained PRs.

**Selected strategy:** `stacked-to-main`.

**Size exception:** Rejected. The implementation must be split into reviewable
units rather than accepted as one oversized change.

No branch or PR is created. The following is the delivery boundary for a later
maintainer-controlled implementation:

| Slice | Apply boundary | Planned review budget | Scope |
|---|---|---:|---|
| 1 | Phase 1A | `<=400` changed lines target | Exact provider toolchain/config, generated provider artifact, model/catalog reconciliation, and provider schema contract tests. |
| 2 | Phase 1B | `<=400` changed lines target | Local schema hardening, migration diff/constraint inventory, scoped-client operation matrix, Host/guard boundary, and shared contracts. |
| 3 | Phase 2 | `<=400` changed lines target | Typed provider adapter/context, session mapping, RBAC, cache invalidation, mutation events, and required audit outcomes. |
| 4 | Phase 3 | `<=400` changed lines target | Provider invitation bridge, HMAC/hash-only local projection, claim state machine, and pending-only cleanup. |
| 5 | Phase 4 | `<=350` changed lines target | DTOs, controllers, bounded directory/policy API, stable errors, and response redaction. |
| 6 | Phase 5A | `<=400` changed lines target | Migration preflight/backfill, fixed reports/audit artifacts, role seed, and exit-code gates. |
| 7 | Phase 5B | `<=400` changed lines target | Queue/scheduler, Core/App composition, provider ownership, five doorbells, and final scope verification. |

Each slice depends on the preceding slice and targets the immediate parent in a
stack; the final slice targets `main`. A slice that exceeds its review budget,
introduces an unplanned path, or changes the dependency boundary must stop and
recompute the Workload Guard. No size exception is implicit.

```text
Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5 -> Slice 6 -> Slice 7 -> main
provider    schema       services   invitation   API        migration  composition
foundation  boundary     + RBAC     lifecycle    boundary   + seed     + doorbells
```

There is no current PR boundary: this artifact is planning-only metadata.

## Verification Plan

- Slice 1: verify exact versions, CLI config load, generated provider artifact,
  model/table/field/catalog reconciliation, and Prisma validation.
- Slice 2: verify scope operation/raw/transaction matrix, Host trust, guard
  ordering preconditions, generated scope output, and constraint drift.
- Slice 3: verify provider context, tenant mapping, permission grammar, cache
  purge, event IDs, audit enqueue failure, and no-replay retry.
- Slice 4: verify official invitation APIs, HMAC/hash-only storage, concurrency,
  pending-only cleanup, retry/backoff, and provider-unavailable behavior.
- Slice 5: verify every route, DTO rejection, Host/session/permission boundary,
  stable errors, pagination, and secret-free responses.
- Slice 6: verify read-only preflight, canonical manifests, redacted reports,
  deterministic/idempotent backfill, quarantine rules, and exit codes.
- Slice 7: verify one queue/scheduler, Core/App graph, one Identity guard path,
  all five real tenant doorbells, and pre/post scope manifests.

## Conditions Carried Forward

- AR-015: executable guard/module order and legacy metadata isolation.
- AR-016: complete scoped operation/raw/transaction coverage.
- AR-017: exact provider/local role mapping and pre-provider-call rejection.
- AR-018: named Prisma/SQL/provider constraint drift allowlist.
- AR-019: fixed migration report, audit, quarantine, hash, and command artifacts.
- AR-020: stable event/correlation/job/retry IDs and no-replay audit retry.
- AR-021: `sdd-direct/scope-manifest/v1` schema and protected-path hashes.
- AR-022: exact package/Prisma versions, Host grammar, and trusted-proxy rules.

These are mandatory Apply/Verify acceptance evidence, not additional planning
blockers.

## Manual Boundary

This Workload Guard performs no Git operation and no runtime implementation.
Commit, Push, Merge, Release, and Tag remain manual maintainer gates. Apply is
the next workflow phase, but it is not executed by this planning-only
continuation.

## Structured Result

```yaml
status: READY
change: SPEC-0025-identity-platform
phase: Workload Guard
artifact: openspec/changes/SPEC-0025-identity-platform/workload-guard.md
decision: chained-prs / stacked-to-main
next: Apply Phase 1
evidence:
  - Tasks Review is APPROVED with no findings.
  - Canonical complexity score is 12 with high 400-line budget risk.
  - Size exception is explicitly rejected.
  - Seven bounded stacked delivery slices are recorded.
  - AR-015..AR-022 remain downstream implementation conditions.
  - No branch, PR, commit, push, merge, release, tag, or runtime Apply operation was performed.
blocked_by: []
```
