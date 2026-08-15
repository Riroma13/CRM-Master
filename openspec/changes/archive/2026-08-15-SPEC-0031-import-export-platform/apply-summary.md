# Apply Summary: SPEC-0031 — Import / Export Platform

## Nested Apply result

```yaml
status: PASS
change: SPEC-0031-import-export-platform
phase: Apply
substep: 7.6
role: MID / BUILDER
recovery: bounded-reconciliation
working_set_paths: 16
unexpected_code_paths: []
out_of_scope_or_unsafe_paths: []
last_proven: 7.5
next: Verify
task_provenance: reconciled in apply-progress.md; 9/9 complete
```

## Completed nested work

- **7.1 Foundation:** API-local import/export contracts, Jobs trusted context,
  bounded retention, and required audit persistence are present and validated.
- **7.2 Core Engine:** registered `clientes-csv-v1` validation, duplicate
  rejection, tenant recheck, serializable batch transaction, and synchronous
  export service are present and validated.
- **7.3 Feature Implementation:** guarded CSV/JSON exports, audit-before-body,
  multipart validation/enqueue, buffer clearing, and queued client import are
  present and validated.
- **7.4 Integration:** Export module/controller wiring and Admin Tools unsafe
  importer removal are present and validated.
- **7.5 Testing:** focused unit/processor tests and the real Host/session
  tenant-isolation doorbell pass with fresh evidence.

## Evidence

| Check                             | Result                                                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused unit/processor tests      | PASS — 2 suites, 8 tests                                                                                                                                             |
| Real HTTP doorbell                | PASS — anonymous 401, valid owner export, cross-tenant export/import denial; open-handle warning after Jest completion is recorded, not caused by a failed assertion |
| API build                         | PASS                                                                                                                                                                 |
| API lint                          | PASS                                                                                                                                                                 |
| `pnpm sdd:validate`               | PASS                                                                                                                                                                 |
| Design validator                  | PASS                                                                                                                                                                 |
| Applicable Working Set formatting | PASS                                                                                                                                                                 |

## Deviations

One bounded compatibility deviation is recorded in `apply-recovery.md`: the
local capability guard remains instead of route metadata consumed by the global
permission guard, because the current guard ordering otherwise violates the
approved anonymous 401 identity outcome. Capability enforcement remains
`configuracion:read`; no security or tenant boundary is weakened.

## Fresh gate exit codes

| Command | Exit code | Classification |
| --- | ---: | --- |
| `pnpm --filter api test -- --runInBand import-export clientes-csv-import` | 0 | PASS — 2 suites, 8 tests |
| `pnpm --filter api test:e2e -- import-export-tenant-isolation.e2e-spec.ts` | 0 | PASS — 1 suite, 1 test; open-handle warning after completion |
| `pnpm --filter api build` | 0 | PASS |
| `pnpm --filter api lint` | 0 | PASS |
| `pnpm sdd:validate` | 0 | PASS |
| `git diff --check` | 0 | PASS |
| `pnpm test` | 1 | BASELINE_DEBT — unrelated API `DATABASE_URL` setup failures and tenant-web calendar-picker assertion |

## Rollback boundary

Revert only the 16 approved Working Set paths and these two Apply evidence
artifacts. Do not restore the deleted Admin Tools importer without a separate
approved safety decision, and never bypass required audit persistence.

## Handoff

Apply is complete and hands off to **Verify**. No Verify or later phase was
executed by this action. No Git lifecycle operation was performed.
