# Workload Guard: Secure Workflow Execution Boundary

> **Normalized result:** BLOCKED pending HUMAN / MAINTAINER decision before Apply
> **Gate:** Workload Guard after PASS Tasks Review
> **Persistence:** hybrid; this file is the exact Workload Guard artifact.

## Checkpoint and scope

The current checkpoint is the authoritative fresh PASS Tasks Review in
`tasks-review.md`. This bounded guard consumes the approved Design and Tasks
forecast only. It does not modify Design, Tasks, production code, Apply state,
or Git state.

## Forecast

| Field | Result |
|---|---|
| Estimated changed lines | **650–900** |
| 400-line threshold | **Exceeded** |
| Risk classification | **High** |
| Size Exception | **Not recommended** |
| Chained PRs | **Required/recommended** |
| Delivery strategy | **Feature-branch-chain** |

## Cohesive-context analysis

The change is cohesive in security intent: every unit repairs one workflow
execution boundary using the same ordered contract—canonical permission,
Host-derived tenant, Identity membership, trusted workflow context, strict
definition parsing, and safe execution. The approved Working Set and Read
Order keep this context bounded and exclude unrelated application areas.

However, the 19-file Working Set spans canonical permission metadata, Nest
module/guard wiring, workflow controllers and services, shared runtime
schemas, execution logic, unit tests, integration tests, and a real-Prisma
doorbell test. A single review/merge unit would exceed the 400-line threshold
and combine independently reviewable RED, implementation, and integration
evidence. The context is therefore cohesive enough to remain one SDD change,
but not cohesive enough for a Size Exception in one delivery unit.

## Decision recommendation

Use a **feature-branch-chain** with the task artifact's bounded delivery
sequence:

1. RED security contracts.
2. Map, trusted-context, schema, service, executor, and module implementation.
3. Route/order integration and A/B doorbell evidence.

The chain preserves the single security boundary while keeping each review
slice within a manageable context and retaining explicit rollback boundaries.
No Apply work may begin until a HUMAN / MAINTAINER explicitly approves this
above-400-line chain decision.

## Validator evidence

| Command | Exact result | Status |
|---|---|---|
| `pnpm sdd:validate` | `CRM-SDD governance validation: PASS` | PASS |

## Canonical next action

**STOP for HUMAN / MAINTAINER approval** of the recommended
feature-branch-chain. Apply 7.1 remains forbidden while that decision is
absent.
