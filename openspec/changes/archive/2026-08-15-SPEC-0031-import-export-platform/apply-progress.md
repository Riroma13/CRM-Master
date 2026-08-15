# Apply Progress: SPEC-0031 — Import / Export Platform

## Reconciliation status

```yaml
status: PASS
change: SPEC-0031-import-export-platform
phase: Apply
substep: 7.6
role: MID / BUILDER
mode: Strict TDD reconciliation
authorization: one HUMAN-authorized reconciliation
working_set_paths: 16
unexpected_code_paths: []
next: Verify
```

This artifact reconciles task-level provenance from the approved Design, the
exact 16-path Tasks Working Set, `apply-recovery.md`, the prior Apply Summary,
and fresh gate execution. No production or test code was changed by this
reconciliation. `workload-guard.md`, Design, reviews, and unrelated changes
remain untouched.

## Task completion evidence

| Task | Completion evidence | Status |
| --- | --- | --- |
| 1.1 | Service tests cover guarded exports, actor/audit metadata, audit failure ordering, and CSV safety; `apply-recovery.md:37-43` records the fresh malformed RFC-4180 RED → GREEN → REFACTOR cycle; focused gate passed 2 suites/8 tests. | [x] |
| 1.2 | Processor tests cover the registered target, validation, duplicate rejection, authority, serializable failure, and retention; `apply-recovery.md:39-43` records GREEN and REFACTOR; focused gate passed 2 suites/8 tests. | [x] |
| 1.3 | The doorbell contains real Host/session and cross-tenant HTTP assertions; the fresh doorbell gate passed 1 suite/1 test with the expected open-handle warning after completion. | [x] |
| 2.1 | API-local contracts and target definition provide the sole target, strict contracts, validation, duplicate rule, and bounded retention; API build and focused tests passed. | [x] |
| 2.2 | Audit and Jobs files implement required append-only persistence and bounded removal options; API build, lint, and focused tests passed. | [x] |
| 2.3 | Service and processor implement guarded exports, audit-before-delivery, full validation/enqueue, buffer clearing, tenant recheck, and serializable batch writes; focused and doorbell gates passed. | [x] |
| 2.4 | Controller/module wiring and Admin Tools importer removal match the approved Working Set; API build, lint, focused tests, and doorbell passed. | [x] |
| 3.1 | `apply-recovery.md:42-50` records refactor completion and the bounded capability-guard compatibility deviation; focused tests remained green. | [x] |
| 3.2 | Fresh focused tests, doorbell, API build, API lint, `pnpm sdd:validate`, and `git diff --check` completed with exit code 0; broader `pnpm test` completed with exit code 1 and is BASELINE_DEBT because failures are unrelated/environment-dependent. | [x] |

## Strict TDD cycle evidence

| Task | Test layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- |
| 1.1 | Unit | N/A — existing candidate | ✅ malformed-cell failure recorded | ✅ 8/8 focused | ✅ audit/parser/authorization cases | ✅ parser correction |
| 1.2 | Unit | N/A — existing candidate | ✅ processor RED coverage recorded | ✅ 8/8 focused | ✅ validation/duplicate/rollback/retention | ✅ no behavior drift |
| 1.3 | Real HTTP | N/A — new candidate | ✅ doorbell scenarios present | ✅ 1/1 doorbell | ✅ anonymous/owner/cross-tenant | ✅ no behavior drift |
| 2.1 | Unit | N/A — new contracts | ✅ target/contract tests present | ✅ 8/8 focused | ✅ target/header/cap branches | ✅ definitions preserved |
| 2.2 | Unit | N/A — existing candidate | ✅ audit/retention cases present | ✅ 8/8 focused | ✅ failure/retention branches | ✅ build/lint green |
| 2.3 | Unit + HTTP | N/A — existing candidate | ✅ service/processor tests present | ✅ focused + doorbell | ✅ export/import/tenant paths | ✅ guard correction recorded |
| 2.4 | Integration | N/A — existing candidate | ✅ route/wiring tests present | ✅ focused/doorbell/build/lint | ✅ route removal/HTTP authority | ✅ composition preserved |
| 3.1 | Unit | N/A — reconciliation | ✅ behavior tests present | ✅ 8/8 focused | ✅ parser/authority cases | ✅ recovery evidence |
| 3.2 | Repository gates | N/A — verification task | ✅ required checks specified | ✅ exact results below | ✅ unit + HTTP layers | ✅ whitespace/broader classification |

## Fresh required gates

| Gate | Exact command | Exit code | Classification | Evidence |
| --- | --- | ---: | --- | --- |
| Focused unit/processor tests | `pnpm --filter api test -- --runInBand import-export clientes-csv-import` | 0 | PASS | 2 suites, 8 tests |
| Doorbell e2e | `pnpm --filter api test:e2e -- import-export-tenant-isolation.e2e-spec.ts` | 0 | PASS | 1 suite, 1 test; open-handle warning after completion |
| API build | `pnpm --filter api build` | 0 | PASS | Nest build completed |
| API lint | `pnpm --filter api lint` | 0 | PASS | ESLint completed |
| SDD validator | `pnpm sdd:validate` | 0 | PASS | Governance validation passed |
| Whitespace | `git diff --check` | 0 | PASS | No whitespace errors |
| Canonical broader test gate | `pnpm test` | 1 | BASELINE_DEBT | Unrelated API suites require missing `DATABASE_URL`; unrelated tenant-web calendar-picker assertion failed |

## Boundaries and deviations

- No unexpected code paths were identified.
- Tenant authority remains Host/session-derived and cross-tenant denial is
  explicitly proven by the real HTTP doorbell.
- The only bounded compatibility deviation remains the local capability guard
  documented in `apply-recovery.md:45-50`; it preserves the required 401/403
  contract and does not weaken tenant isolation or authorization.
- No Git lifecycle operation was performed.

## Work unit evidence

| Evidence | Result |
| --- | --- |
| Focused test command | Exit 0; 2 suites, 8 tests |
| Runtime harness | Doorbell exit 0; 1 real HTTP test |
| Rollback boundary | Revert only the exact 16 Working Set paths and bounded Apply evidence; do not restore the unsafe importer or bypass required audit |
