# Workload Guard: Secure Default-Deny Tenant Authentication Boundary

> **Normalized result:** BLOCKED pending HUMAN / MAINTAINER strategy authorization before Apply
> **Gate:** Workload Guard after final fresh PASS Tasks Review
> **Persistence:** hybrid; this file is the exact Workload Guard artifact.

## Checkpoint and scope

The authoritative checkpoint is the final fresh PASS Tasks Review in
`tasks-review.md`, with TR-007, TR-008, and TR-009 all PASS. This bounded guard
consumed the approved Tasks Working Set/Read Order, the final Tasks artifact,
the final fresh review, the approved Design, `docs/SDD-WORKFLOW.md`, and the
local model map. It performs only the required above-400-line context analysis.
It does not modify Design, Tasks, production code, tests, Apply state, or Git
state; no agent was invoked.

## Forecast

| Field | Result |
|---|---|
| Estimated changed lines | **450–650** |
| 400-line threshold | **Exceeded** |
| Risk classification | **High** |
| Size Exception | **Not recommended** |
| Canonical Workload Guard outcome | **Chained PRs** |
| Project delivery convention | `feature-branch-chain` |
| Delivery branch boundary | `sec/secure-default-deny-tenant-auth-boundary` |
| Main branch | **Never** |
| HUMAN decision required before Apply | **Yes** |

## Bounded cohesive-context analysis

The change is cohesive at the security-intent level: all planned work closes
one default-deny tenant authentication boundary and preserves the same ordered
contract—Host-derived tenant context, authenticated/classified actor, existing
membership or route-owner authority, permission/scope checks, and no-effect
denial. The approved Working Set and Read Order keep the change bounded to the
named API decorators, guards, controllers, focused tests, and HTTP doorbells;
they exclude schema changes, token tenant-binding remediation, webhook opening,
and unrelated production areas.

It is not cohesive enough for a Size Exception as one delivery unit. The
450–650-line high-risk forecast crosses multiple independently reviewable
seams: (1) RED security matrix and authority proofs, (2) metadata/global guard
and classified controller hand-offs, and (3) bounded REFACTOR plus real-HTTP
Tenant A/B and public-contract acceptance. The Working Set crosses shared
authentication metadata, global guards, client/identity/public API controller
boundaries, unit tests, and disposable-DB/Redis doorbells. Combining those
seams in one above-budget review would obscure security regressions and weaken
rollback isolation, while splitting them preserves the single security
boundary and the approved dependency order.

Therefore the change remains one cohesive SDD change, but requires **Chained
PRs**, not a Size Exception.

## Recommendation and bounded chain boundary

Authorize the project convention `feature-branch-chain`, isolated on
`sec/secure-default-deny-tenant-auth-boundary`; never target `main` during this
change. The Tasks artifact defines the bounded sequence:

1. Unit 1: RED matrix and authority tests.
2. PR #1: GREEN metadata, guards, and controllers.
3. PR #2: bounded REFACTOR and acceptance evidence.

The exact focused tests, real-HTTP doorbells, validator commands, disposable
runtime requirements, and per-unit rollback file sets remain those recorded in
`tasks.md:21-33`. Rollback is maintainer-only and is not executed here.

## Validator evidence

| Command | Exact result | Status |
|---|---|---|
| `pnpm sdd:validate` (pre-gate) | `CRM-SDD governance validation: PASS` | PASS |
| `pnpm sdd:validate` (handoff) | `CRM-SDD governance validation: PASS` | PASS |

## Canonical next action

**STOP for HUMAN / MAINTAINER strategy authorization** of either the
recommended **Chained PRs** outcome or an explicitly approved **Size Exception**.
Because the forecast exceeds 400 lines, Apply 7.1 is forbidden until that
decision is recorded. No Apply phase or Git lifecycle operation is performed by
this gate.

## Structured Result

```yaml
status: BLOCKED
change: secure-default-deny-tenant-auth-boundary
action: Workload Guard
artifacts:
  - openspec/changes/secure-default-deny-tenant-auth-boundary/workload-guard.md
role: MID
evidence:
  - Final fresh Tasks Review PASS: TR-007, TR-008, and TR-009 all PASS
  - Forecast: 450–650 changed lines; high risk; exceeds the 400-line threshold
  - Approved Working Set/Read Order remains bounded to the named auth boundary files and tests
  - Cohesive security intent, but three independently reviewable RED/GREEN/REFACTOR and HTTP acceptance seams
  - Canonical outcome recommendation: Chained PRs
  - Delivery convention: feature-branch-chain on sec/secure-default-deny-tenant-auth-boundary; never main
  - `pnpm sdd:validate` pre-gate: PASS
  - `pnpm sdd:validate` handoff: PASS
blocked_by:
  - HUMAN / MAINTAINER strategy authorization before Apply
next: HUMAN strategy authorization for Chained PRs or Size Exception; do not start Apply 7.1
```
