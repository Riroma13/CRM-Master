# Workload Guard: secure-plugin-execution-boundary

> **Normalized result:** PASS
> **Action:** Workload Guard
> **Role:** MID / BUILDER
> **Model binding:** `openai/gpt-5.6-luna` (`.opencode/sdd-model-map.json:13-16,33-36,52-57`)
> **Persistence:** hybrid; this is the exact repository artifact and Engram carries only bounded status/evidence.

## Gate Decision

The fresh Tasks Review is PASS and the Workload Guard is therefore legal. The
change is one cohesive P0 security-containment objective, but it is not safely
reviewable or deliverable as one unit at the forecast size. The approved Tasks
Working Set contains 19 files spanning contracts, focused tests, authorization,
admission, registry state, disabled execution, HTTP wiring, deletion, and a
real Tenant A/B doorbell.

Estimated changed lines: 650–900; 19-file security remediation.
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

## Risk-Based Assessment

| Check | Result | Evidence / rationale |
| --- | --- | --- |
| Cohesive context | PASS with delivery constraint | The Design has one bounded invariant: authenticated, tenant-scoped metadata management with plugin execution disabled. The Tasks preserve one security boundary and a dependency-ordered RED → GREEN plan. |
| Single-delivery reviewability | FAIL | 650–900 changed lines materially exceeds the 400-line review budget and combines distinct review surfaces: contracts/tests, core authorization/admission/registry/disablement, and assembled HTTP/deletion/doorbell evidence. |
| Size Exception appropriate | No | Cohesion alone does not offset the high review-risk forecast. A Size Exception would concentrate security-sensitive authority, admission, execution-disablement, and integration changes into one oversized review. |
| Chained PRs | Required/recommended | Use three independently reviewable bounded slices as already specified by Tasks. This is the safer control for the High 400-line risk. |
| Scope safety | PASS | No Design or Tasks expansion is needed. Schema, infrastructure, dependencies, common auth redesign, governance, and Git operations remain excluded. |

## Approved Delivery Strategy

Isolate the work on feature branch `sec/secure-plugin-execution-boundary`.
Do not stack directly to `main`; each unit points to the preceding unit and
must remain independently reviewable:

1. **PR1 — RED tests/contracts:** focused Jest fixtures, shared contracts, and
   rollback tests/contracts. Runtime execution is not introduced.
2. **PR2 — core containment:** trusted guards, admission validation, scoped
   inactive registry state, and disabled runtime behavior. Focused unit checks
   and rollback remain bounded to these implementation files.
3. **PR3 — integration boundary:** HTTP wiring, worker deletion, and the real
   Tenant A/B doorbell using the disposable database harness. Rollback is
   bounded to integration/deletion evidence.

No branch creation, checkout, commit, push, merge, or other Git operation was
performed by this gate.

## HUMAN Gate

Because the forecast exceeds 400 changed lines, a HUMAN / MAINTAINER decision
is required before Apply. The required decision is whether to authorize the
three-slice feature-branch-chain strategy on
`sec/secure-plugin-execution-boundary` (with no Size Exception). Apply 7.1 is
not legal until that decision is explicitly recorded. Routine internal PR
boundaries do not require separate approvals after canonical gates pass, but
that does not remove this canonical Workload Guard HUMAN gate.

## Validation and Boundaries

- Consumed approved `design.md`, refined `tasks.md`, fresh PASS
  `architecture-review.md`, fresh PASS `tasks-review.md`,
  `docs/SDD-WORKFLOW.md`, and `.opencode/sdd-model-map.json`.
- `pnpm sdd:validate` — PASS before gate execution.
- No Design, Tasks, Review, production code, tests, schema, infrastructure,
  dependencies, or Git state was modified.
- This artifact is the only repository change made by Workload Guard.

## Next Action

Await the explicit HUMAN / MAINTAINER decision on the feature-branch-chain
strategy. If authorized, return to the canonical checkpoint and begin Apply
7.1 Foundation through the local MID / BUILDER executor; otherwise stop at this
gate.
