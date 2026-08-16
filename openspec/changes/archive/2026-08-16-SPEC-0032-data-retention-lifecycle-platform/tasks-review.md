# Tasks Review: SPEC-0032 — Data Retention & Lifecycle Platform

status: PASS
change: SPEC-0032-data-retention-lifecycle-platform
phase: Tasks Review
artifact: `openspec/changes/SPEC-0032-data-retention-lifecycle-platform/tasks-review.md`
normalized_gate: PASS
decision: Tasks accepted
next: Workload Guard

## Verdict

**PASS.** This is the one fresh Tasks Review after the sole permitted Tasks
Refinement. The refined `tasks.md` closes TR-001–TR-005 and satisfies the
downstream criterion for TR-NB-001. The approved Design and fresh PASS
Architecture Review remain unchanged. Workload Guard may now run; Apply may
not begin before that gate.

## Preserved Provenance

The prior Tasks Review remains represented by its preserved `BLOCKED` result and
findings TR-001–TR-005 plus condition TR-NB-001. The sole permitted Tasks
Refinement consumed that correction budget and produced the current refined
Tasks artifact. No second refinement is available or required.

## Required Checks

| Check | Result | Evidence |
|---|---|---|
| Design authority and dependency order | PASS | Schema/contracts and migration precede engine, adapters/wiring, API, doorbell, and acceptance; no implementation or Git action is authorized by review. |
| Task completeness and Design coverage | PASS | All Design Working Set paths, migration evidence, ADR evidence, tests, owner boundaries, and acceptance work are assigned. |
| Strict RED → GREEN → REFACTOR | PASS | Tasks 1.1–1.3, 2.1–2.9, and 3.1–3.6 provide separately observable failing proof, implementation, and cleanup/regression checkpoints. |
| Exact Working Set and exclusions | PASS | Every path has an explicit action, including `packages/database/prisma/migrations/20260815000000_add_data_lifecycle_platform/migration.sql` and `docs/architecture/adr/ADR-0032-data-retention-lifecycle-platform.md`; exclusions and generated-output protections are explicit. |
| Workload forecast | PASS | High forecast is recorded with feature-branch-chain and autonomous PR1/PR2/PR3 base, finish, focused command, runtime harness, and rollback boundaries. |
| Acceptance criteria and rollback | PASS | 3.7 independently reviews migration SQL, records ADR-0032 AR-003 confirmation/window evidence before enablement, and work units define bounded rollback. |
| Migration and generation evidence | PASS | Migration review is separate from `pnpm --filter database generate` / `generate:scope:verify`; no generated output is hand-edited. TR-NB-001 is closed as non-blocking. |
| Security and tenant isolation | PASS | Host authority, trusted-job forgery rejection, foreign 404 masking, hold-safe predicates, and real-HTTP/database doorbell evidence are explicit. |
| Scope and exclusions | PASS | `app.module.ts`, `apps/api/src/modules/jobs/*`, frontends, generated outputs, unrelated changes, and Git lifecycle operations remain excluded. |

## Finding Closure

| ID | Prior result | Fresh verdict | Closure evidence |
|---|---|---|---|
| TR-001 | BLOCKING | Closed | Distinct RED/GREEN/REFACTOR tasks cover schema, policy, runner, adapters, controller, and doorbell behavior with checkpoints. |
| TR-002 | BLOCKING | Closed | Exact migration path and proposed ADR-0032 path are in the Working Set and tasks; migration review and pre-enable ADR evidence are assigned. |
| TR-003 | BLOCKING | Closed | Working Set lists every create/modify/review path and preserves all Design exclusions. |
| TR-004 | BLOCKING | Closed | PR1/PR2/PR3 use exact feature-branch-chain bases and include focused commands, runtime harnesses or justified N/A, finish criteria, and rollback boundaries. |
| TR-005 | BLOCKING | Closed | Task 3.7 requires ADR-0032 confirmation or changed 24-month window before enabling any tenant policy; AR-003 remains non-blocking. |
| TR-NB-001 | CONDITION | Closed as non-blocking | Tasks 1.2/1.3 and 3.7 separately record migration SQL review, generated-scope freshness, and no hand edits. |

## Tenant-Isolation Evidence

PASS. The plan derives policy tenancy from `Host`, excludes `tenantId` from
policy input, revalidates trusted job envelopes, rejects forged tenant payloads
without mutation, masks foreign resources as 404, scopes adapters to the owner
tenant, and proves the boundary with
`apps/api/test/doorbell/data-lifecycle-isolation.e2e-spec.ts` using distinct
Hosts and a forged job envelope.

## Correction-Budget State

**EXHAUSTED — correctly consumed.** The initial Tasks Review was BLOCKED; the
sole permitted Tasks Refinement was consumed; this mandatory fresh review is
PASS. No further Tasks correction retry exists. This is not a blocker because
all material findings are closed or explicitly non-blocking.

## Validators

| Validator | Result |
|---|---|
| `pnpm sdd:validate` | PASS — canonical workflow, local Direct wiring, logical roles, hybrid persistence, and maintainer gates validated. |
| `pnpm sdd:validate:design -- openspec/changes/SPEC-0032-data-retention-lifecycle-platform/design.md` | PASS — canonical Design shape, A–G topics, and Working Set structure validated. |
| Tasks-specific validator | NOT AVAILABLE — no project-local Tasks validator is defined. Manual bounded Tasks Review completed against the canonical checks above. |

## Structured Result

```yaml
status: PASS
change: SPEC-0032-data-retention-lifecycle-platform
phase: Tasks Review
normalized_gate: PASS
findings:
  blocking: []
  condition: []
  closed: [TR-001, TR-002, TR-003, TR-004, TR-005, TR-NB-001]
evidence:
  - Fresh Architecture Review is PASS; Design and Architecture Review were preserved.
  - Refined Tasks provide strict RED/GREEN/REFACTOR checkpoints and exact paths.
  - Migration review, generated-scope verification, ADR-0032, and AR-003 pre-enable evidence are separate checkpoints.
  - High-workload PR1/PR2/PR3 boundaries and tenant-isolation doorbell evidence are explicit.
correction_budget:
  state: exhausted
  permitted_tasks_refinement: 1
  consumed: 1
  fresh_review: completed
validators:
  - pnpm sdd:validate: PASS
  - pnpm sdd:validate:design -- openspec/changes/SPEC-0032-data-retention-lifecycle-platform/design.md: PASS
  - tasks-specific: unavailable
next_action: Workload Guard; do not invoke Apply before the guard and required maintainer decision for the high forecast.
```
