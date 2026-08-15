# Tasks: SPEC-0031 — Import / Export Platform

## Review Workload Forecast

Estimated changed lines: **520–680**. High; chained PRs recommended. `Decision needed before apply: Yes`
`Chained PRs recommended: Yes`
`Chain strategy: feature-branch-chain`
`400-line budget risk: High`

| Unit | Goal                                           | Focused command                                                            | Runtime harness               | Rollback boundary                                                        |
| ---- | ---------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| 1    | contracts, audit, Jobs retention               | `pnpm --filter api test -- --runInBand import-export`                      | N/A: unit boundary            | revert listed foundation files                                           |
| 2    | import/export behavior and Admin Tools removal | same                                                                       | N/A: service/processor tests  | remove replacement routes safely; never restore unsafe importer silently |
| 3    | HTTP tenant doorbell and gates                 | `pnpm --filter api test:e2e -- import-export-tenant-isolation.e2e-spec.ts` | real AppModule + Host/session | revert endpoint wiring/tests                                             |

## Exact Working Set (authoritative)

`apps/api/src/modules/export/export.controller.ts` (M), `apps/api/src/modules/export/export.module.ts` (M), `apps/api/src/modules/export/import-export.service.ts` (C), `apps/api/src/modules/export/clientes-csv-import.definition.ts` (C), `apps/api/src/modules/export/clientes-csv-import.processor.ts` (C), `apps/api/src/modules/export/import-export.contracts.ts` (C), `apps/api/src/modules/audit/audit.service.ts` (M), `apps/api/src/modules/audit/ingestion/ingestion.service.ts` (M), `apps/api/src/modules/jobs/jobs.contracts.ts` (M), `apps/api/src/modules/jobs/jobs-client.service.ts` (M), `apps/api/src/modules/admin-tools/admin-tools.controller.ts` (M), `apps/api/src/modules/admin-tools/admin-tools.module.ts` (M), `apps/api/src/modules/admin-tools/csv-import.service.ts` (D), `apps/api/src/modules/export/__tests__/import-export.service.spec.ts` (C), `apps/api/src/modules/export/__tests__/clientes-csv-import.processor.spec.ts` (C), `apps/api/test/doorbell/import-export-tenant-isolation.e2e-spec.ts` (C). No other path is permitted; the enumerated paths override the Design forecast count.

## Read Order

1. `apps/api/src/modules/export/export.controller.ts`; 2. `apps/api/src/modules/identity/identity-organization.guard.ts`, `apps/api/src/common/auth/permissions.ts`; 3. `apps/api/src/modules/admin-tools/csv-import.service.ts`, `apps/api/src/modules/tenant-clientes/tenant-clientes.service.ts`; 4. `apps/api/src/modules/jobs/jobs.contracts.ts`, `apps/api/src/modules/jobs/jobs-client.service.ts`, `apps/api/src/modules/jobs/jobs-tenant-authority.service.ts`; 5. `apps/api/src/modules/audit/audit.service.ts`, `apps/api/src/modules/audit/ingestion/ingestion.service.ts`; 6. `apps/api/test/doorbell/tenant-settings-isolation.spec.ts`.

## Phase 1 — RED: contracts, security, and boundaries

- [x] 1.1 RED: service tests prove both existing exports require session/Host/org/active membership/`configuracion:read`, actor is session-derived, audit metadata is redacted, audit failure is 503 before headers/body, and CSV quotes plus prefixes `'=+-@`.
- [x] 1.2 RED: processor tests prove only `clientes-csv-v1`, exact UTF-8 RFC-4180 header/row validation, byte/row caps, forged tenant/actor rejection, full pre-validation, case-insensitive `nombre` duplicate rejection, serializable all-or-nothing writes, and bounded retention.
- [x] 1.3 RED: doorbell tests prove anonymous 401, identity failures 403, catalog mismatch 503, valid owner success, Tenant-B session on Tenant-A Host denial, and forged body/file tenant denial.

## Phase 2 — GREEN: implementation in dependency order

- [x] 2.1 Add API-local contracts/registered target, validation, duplicate, transaction, idempotency, and configurable `removeOnComplete`/failed age-count defaults.
- [x] 2.2 Extract awaitable append-only audit persistence; add required audit API with no `system` fallback, and pass bounded removal options through JobsClient (SPEC-0028 reuse).
- [x] 2.3 Implement guarded synchronous exports (audit-before-delivery), multipart full validation, buffer discard, Idempotency-Key enqueue, and worker tenant recheck plus serializable batch.
- [x] 2.4 Wire module/controller; remove Admin Tools route/provider/service; preserve Reporting, schema/migrations, app/infrastructure composition, and frontend unchanged.

## Phase 3 — REFACTOR and verification

- [x] 3.1 Refactor only after GREEN: deduplicate target/authority/CSV safety code, preserve exact contracts and fail-closed ordering, and document rollback as endpoint removal without audit bypass or unsafe importer restoration.
- [x] 3.2 Run focused unit, real HTTP doorbell, build, lint, and applicable whitespace checks; confirm no partial writes, no temporary source-file storage, completed-job removal, failed-job bounds, and Reporting ownership.

## Acceptance / exclusions

Acceptance requires all RED tests GREEN, exact CSV contract, reject-only duplicates, atomic batch, Jobs reuse, bounded retention, required audit, and real Host/session tenant evidence. Exclude generic ETL/arbitrary targets, merge/update, durable import tables/files, schema/migrations/ADR, Reporting `ExportJob`/schedules/downloads, UI/navigation, and unrelated files.

Expected commands: `pnpm --filter api test -- --runInBand import-export clientes-csv-import`; `pnpm --filter api test:e2e -- import-export-tenant-isolation.e2e-spec.ts`; `pnpm --filter api build`; `pnpm --filter api lint`; `pnpm sdd:validate`; `pnpm sdd:validate:design -- "openspec/changes/SPEC-0031-import-export-platform/design.md"`; `pnpm exec prettier --check "openspec/changes/SPEC-0031-import-export-platform/tasks.md"`.

Task-level completion and strict-TDD provenance are reconciled in
`apply-progress.md`; fresh gate exit codes and classifications are recorded
there. The pre-Apply Workload Guard remains preserved as historical checkpoint
evidence; canonical Apply handoff is Verify.
