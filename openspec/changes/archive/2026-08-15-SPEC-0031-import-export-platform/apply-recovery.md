# Apply Recovery / Reconciliation: SPEC-0031

## Authorization and checkpoint

HUMAN / MAINTAINER explicitly authorized bounded reconciliation of the current
untrusted candidate files and approved continuation within the exact 16-path
Working Set. The canonical Workload Guard is `READY`, uses
`feature-branch-chain`, records `apply_started: false`, and names Apply 7.1 as
the next action. No prior Apply unit was inferred or reused.

## Per-file classification

| Path                                                                          | Classification                | Reconciliation result                                                                                                                                                                                              |
| ----------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api/src/modules/export/export.controller.ts`                            | `COMPLETE_OR_CORRECT`         | Preserved guarded exports/import; retained the current-compatible local capability guard after proving the global permission guard returns 403 before the identity guard can establish the required anonymous 401. |
| `apps/api/src/modules/export/export.module.ts`                                | `KEEP_AS_VALID_SPEC0031_WORK` | Queue, Jobs, identity, processor, and service wiring is within the approved contract.                                                                                                                              |
| `apps/api/src/modules/export/import-export.service.ts`                        | `COMPLETE_OR_CORRECT`         | Preserved audit-before-delivery, scoped exports, CSV parsing, enqueue, buffer clearing, and corrected malformed RFC-4180 quote handling.                                                                           |
| `apps/api/src/modules/export/clientes-csv-import.definition.ts`               | `KEEP_AS_VALID_SPEC0031_WORK` | Allowlisted target, schema, duplicate validation, and bounded retention are aligned.                                                                                                                               |
| `apps/api/src/modules/export/clientes-csv-import.processor.ts`                | `KEEP_AS_VALID_SPEC0031_WORK` | Trusted tenant recheck, full validation, serializable transaction, and reject-only duplicates are aligned.                                                                                                         |
| `apps/api/src/modules/export/import-export.contracts.ts`                      | `KEEP_AS_VALID_SPEC0031_WORK` | API-local strict target and payload contracts are aligned.                                                                                                                                                         |
| `apps/api/src/modules/audit/audit.service.ts`                                 | `KEEP_AS_VALID_SPEC0031_WORK` | Required append-only persistence path fails closed with 503 and does not use a system actor fallback.                                                                                                              |
| `apps/api/src/modules/audit/ingestion/ingestion.service.ts`                   | `KEEP_AS_VALID_SPEC0031_WORK` | Awaitable append-only persistence reuses the existing hash-chain path.                                                                                                                                             |
| `apps/api/src/modules/jobs/jobs.contracts.ts`                                 | `KEEP_AS_VALID_SPEC0031_WORK` | Trusted actor/organization context and bounded removal options are aligned.                                                                                                                                        |
| `apps/api/src/modules/jobs/jobs-client.service.ts`                            | `KEEP_AS_VALID_SPEC0031_WORK` | Approved retention options are passed to BullMQ without changing idempotent job identity.                                                                                                                          |
| `apps/api/src/modules/admin-tools/admin-tools.controller.ts`                  | `KEEP_AS_VALID_SPEC0031_WORK` | Unsafe parallel CSV route removed; unrelated Admin Tools routes preserved.                                                                                                                                         |
| `apps/api/src/modules/admin-tools/admin-tools.module.ts`                      | `KEEP_AS_VALID_SPEC0031_WORK` | Obsolete CSV provider removed; remaining composition preserved.                                                                                                                                                    |
| `apps/api/src/modules/admin-tools/csv-import.service.ts`                      | `KEEP_AS_VALID_SPEC0031_WORK` | Approved deletion prevents the unsafe partial-write importer from remaining reachable.                                                                                                                             |
| `apps/api/src/modules/export/__tests__/import-export.service.spec.ts`         | `COMPLETE_OR_CORRECT`         | Preserved candidate tests and added a fresh RED/GREEN malformed RFC-4180 regression.                                                                                                                               |
| `apps/api/src/modules/export/__tests__/clientes-csv-import.processor.spec.ts` | `KEEP_AS_VALID_SPEC0031_WORK` | Candidate tests cover target, retention, duplicate, authority, and serializable write failure behavior.                                                                                                            |
| `apps/api/test/doorbell/import-export-tenant-isolation.e2e-spec.ts`           | `COMPLETE_OR_CORRECT`         | Preserved real Host/session evidence and added cross-tenant import denial.                                                                                                                                         |

No path was classified `OUT_OF_SCOPE_OR_UNSAFE`; no deletion, restore, discard,
or other destructive Git action was performed.

## Fresh RED → GREEN → REFACTOR evidence

1. **RED:** the newly added malformed quoted-cell test failed: 3 passed, 1
   failed because the parser accepted trailing content after a closing quote.
2. **GREEN:** corrected the bounded parser state machine in
   `import-export.service.ts`; focused unit/processor tests passed: 2 suites,
   8 tests.
3. **REFACTOR:** formatted the exact Working Set code/tests only; the focused
   tests, build, lint, doorbell, and validators were rerun successfully.

The attempted direct `@RequirePermission` metadata wiring was rejected by fresh
real-HTTP evidence: the global `PermissionsGuard` runs before the route-local
identity guard and changed anonymous export from the required 401 to 403. The
final local `ExportCapabilityGuard` is therefore the smallest current-API
compatible bounded correction: it enforces the same `configuracion:read`
capability after the identity chain and preserves the approved 401/403 contract.

## Fresh validation evidence

| Command                                                                                     | Result                                                                                            |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm --filter api test -- --runInBand import-export clientes-csv-import`                   | PASS — 2 suites, 8 tests                                                                          |
| `pnpm --filter api test:e2e -- import-export-tenant-isolation.e2e-spec.ts`                  | PASS — real HTTP doorbell, 1 test; Jest reported an existing open-handle warning after completion |
| `pnpm --filter api build`                                                                   | PASS                                                                                              |
| `pnpm --filter api lint`                                                                    | PASS                                                                                              |
| `pnpm sdd:validate`                                                                         | PASS                                                                                              |
| `pnpm sdd:validate:design -- "openspec/changes/SPEC-0031-import-export-platform/design.md"` | PASS                                                                                              |
| Prettier check over all applicable Working Set paths                                        | PASS                                                                                              |

## Apply state

At reconciliation entry, the last Apply requirement proven complete was **7.5
Testing**, and the exact first incomplete canonical Apply action was **7.6 Apply
Summary**. Fresh evidence now proves **7.6 Apply Summary** complete. Therefore,
Apply is complete and the next canonical action is **Verify**. No Verify,
Archive, Health Report, Repository Ready, or maintainer Git phase was performed.

## Accepted state and boundaries

- Accepted all 16 candidate Working Set paths after the classifications above.
- Changed only the 16 Working Set paths plus this required recovery artifact and
  the nested Apply Summary artifact.
- Preserved Reporting, schema/migrations, frontend, app/infrastructure
  composition, tenant isolation, authorization, audit fail-closed ordering,
  and maintainer Git boundaries.

## Canonical handoff

The accepted final state is Apply 7.6 complete on fresh evidence. Handoff is to
**Verify**; no Verify or later phase was executed by this action.
