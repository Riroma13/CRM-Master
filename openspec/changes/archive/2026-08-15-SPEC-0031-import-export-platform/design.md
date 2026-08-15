# Design: SPEC-0031 — Import / Export Platform

> **Status:** Refined after BLOCKED Architecture Review. **Next gate:** fresh Architecture Review.
> This is the single permitted Design Refinement. It owns operational client import/export only; Reporting `ExportJob`, schedules, and download lifecycle remain Reporting-owned.

## 1. Executive Summary

This change replaces the controller-owned operational exports and the unsafe Admin Tools client CSV import with one explicit `clientes-csv-v1` target. It requires authenticated organization membership, `configuracion:read`, Host-derived tenant authority, synchronous mandatory audit persistence before an export is delivered, and Jobs-backed imports. The import validates the complete CSV before any write, rejects duplicates explicitly, rolls back the target batch on every failed write, and removes temporary job payloads on completion.

## 2. Technical Approach

`ImportExportModule` owns the two existing export routes and the new, registered client CSV import route. `IdentityOrganizationGuard` is applied per route, obtaining the session, Host tenant, tenant organization, active membership, and the existing permission metadata; neither request data nor a job payload supplies tenant or actor authority.

The sole importer accepts UTF-8 RFC-4180 CSV with the exported header order: `nombre,tipo_negocio,estado_relacion,salud,tags,creado`. The request parses and validates all rows, discards the upload buffer, then enqueues normalized rows through SPEC-0028 `JobsClient`. The worker revalidates the trusted tenant, validates every row and duplicate rule before a serializable target-batch transaction, and writes only `Cliente` fields represented by the contract. This is not a generic ETL or arbitrary-table path.

Exports remain synchronous because they are existing response downloads. The service creates an export correlation ID, durably persists the mandatory audit event, and only then writes response headers/body. Import job payloads are temporary Redis artifacts: completed jobs are removed immediately; failed jobs retain at most 100 records and at most 24 hours, with both limits configurable through the bounded import-job configuration.

## 3. Architecture Decisions

| Decision             | Options                                                 | Chosen                                                                      | Rationale                                                                                                              |
| -------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Import target        | arbitrary model; deferred importer; explicit client CSV | `clientes-csv-v1` only                                                      | Existing CSV export, Admin Tools client import, and `Cliente` model provide the only end-to-end evidence.              |
| Mutation             | row writes; target-batch transaction                    | serializable target-batch transaction                                       | Validation completes before mutation and any failed write rolls back all rows.                                         |
| Duplicate rule       | infer/merge; create; reject                             | case-insensitive `nombre` conflict → reject whole batch                     | Existing client service rejects that identity; no merge/overwrite semantics are evidenced.                             |
| Async work           | new queue; direct write; Jobs                           | SPEC-0028 Jobs definition/client                                            | Reuses trusted context, schema validation, idempotency, queue lifecycle, and tenant recheck.                           |
| Export authorization | Swagger/global guards; identity chain                   | `IdentityOrganizationGuard` + `@RequirePermission('configuracion', 'read')` | This existing capability is owner-only in the current role map and the guard proves session-to-organization authority. |
| Export audit         | best-effort enqueue; required persistence               | required synchronous audit persistence                                      | `AuditService.log` can skip an unavailable queue; an artifact cannot be delivered on that path.                        |

## 4. Data Flow

```text
session + Host -> IdentityOrganizationGuard -> tenant/org/membership/permission
                         -> ImportExportService -> scoped read -> required audit persist -> response

multipart CSV -> parse + full validation -> JobsClient(envelope, trusted tenant)
             -> client-import worker -> tenant recheck -> serializable transaction -> result
```

Missing session returns `401 IDENTITY_SESSION_REQUIRED`; missing Host tenant, membership, organization match, or capability returns the guard's `403` identity code; catalog mismatch is `503 IDENTITY_CATALOG_MISMATCH`. Invalid upload/header/row returns 400 before enqueue. A duplicate is 409 before enqueue or a terminal job failure before writes. Audit persistence/enqueue failure returns 503 and no export bytes are sent.

## 5. Working Set

### 5.1 Primary Files

| #   | File                                                            | Action | Reason                                                                                       |
| --- | --------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| 1   | `apps/api/src/modules/export/export.controller.ts`              | Modify | Add identity guard/capability, actor extraction, and client import endpoint.                 |
| 2   | `apps/api/src/modules/export/export.module.ts`                  | Modify | Wire import/export, Jobs, Audit, queue, and worker providers.                                |
| 3   | `apps/api/src/modules/export/import-export.service.ts`          | Create | Own safe export, required audit-before-delivery, parsing, and enqueue.                       |
| 4   | `apps/api/src/modules/export/clientes-csv-import.definition.ts` | Create | Register the sole schema, queue definition, validation, duplicate, and transaction contract. |
| 5   | `apps/api/src/modules/export/clientes-csv-import.processor.ts`  | Create | Revalidate trusted tenant and execute the target batch.                                      |
| 6   | `apps/api/src/modules/export/import-export.contracts.ts`        | Create | Define target keys, request/result, retention, and redacted audit metadata.                  |
| 7   | `apps/api/src/modules/audit/audit.service.ts`                   | Modify | Add required persistence API; never fall back to `system` for exports.                       |
| 8   | `apps/api/src/modules/audit/ingestion/ingestion.service.ts`     | Modify | Extract/reuse append-only persistence so required audit can await it.                        |
| 9   | `apps/api/src/modules/jobs/jobs.contracts.ts`                   | Modify | Allow bounded per-job removal options.                                                       |
| 10  | `apps/api/src/modules/jobs/jobs-client.service.ts`              | Modify | Pass approved retention options to BullMQ.                                                   |

### 5.2 Secondary Files

| #   | File                                                                          | Action | Reason                                                                          |
| --- | ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| 1   | `apps/api/src/modules/admin-tools/admin-tools.controller.ts`                  | Modify | Remove the parallel unsafe CSV import route.                                    |
| 2   | `apps/api/src/modules/admin-tools/admin-tools.module.ts`                      | Modify | Remove its obsolete CSV provider.                                               |
| 3   | `apps/api/src/modules/admin-tools/csv-import.service.ts`                      | Delete | Prevent raw splitting, per-row partial writes, and implicit duplicate behavior. |
| 4   | `apps/api/src/modules/export/__tests__/import-export.service.spec.ts`         | Create | RED/GREEN export, audit, parser, authorization-contract tests.                  |
| 5   | `apps/api/src/modules/export/__tests__/clientes-csv-import.processor.spec.ts` | Create | RED/GREEN validation, duplicate, rollback, and retention tests.                 |
| 6   | `apps/api/test/doorbell/import-export-tenant-isolation.e2e-spec.ts`           | Create | Real Host/session/org/capability and cross-tenant HTTP evidence.                |

### 5.3 Expected NOT to Change

- `packages/database/prisma/schema.prisma` and migrations — serializable target batches avoid a schema change; any durable import-run model needs an ADR and new Design.
- `apps/api/src/modules/reporting/` — Reporting owns reporting exports.
- `apps/api/src/app.module.ts` and `apps/api/src/modules/infrastructure/infrastructure.module.ts` — existing composition imports Export and global Audit/Jobs boundaries.
- `apps/tenant-web/` — no UI or navigation is in scope.

## 6. Read Order

1. `export.controller.ts` — preserve the two public exports and replace only the unsafe import path.
2. `identity-organization.guard.ts` and `permissions.ts` — apply the exact authority chain and capability.
3. `admin-tools/csv-import.service.ts` and `tenant-clientes.service.ts` — preserve the evidenced client fields and duplicate rule, not its unsafe mechanics.
4. `jobs.contracts.ts`, `jobs-client.service.ts`, and `jobs-tenant-authority.service.ts` — use canonical job authority and idempotency.
5. `audit.service.ts` and `ingestion.service.ts` — preserve append-only audit semantics while making delivery fail-closed.
6. `tenant-settings-isolation.spec.ts` — follow the real HTTP Host/session fixture pattern.

## 7. Expected Commands

```bash
pnpm --filter api test -- --runInBand import-export clientes-csv-import
pnpm --filter api test:e2e -- import-export-tenant-isolation.e2e-spec.ts
pnpm --filter api build
pnpm --filter api lint
pnpm exec prettier --check "openspec/changes/SPEC-0031-import-export-platform/design.md"
```

## 8. Design Confidence

**Confidence: High.** The client target, headers, duplicate identity, multipart precedent, identity codes, Jobs contract, queue removal behavior, and audit persistence path are current repository evidence. Import limits/retention are explicit bounded configuration rather than inferred product behavior.

## 9. Exploration Budget

**Workload forecast:** 520–680 changed lines. This exceeds 400 lines; after a PASS Tasks Review, Workload Guard requires bounded analysis and a HUMAN / MAINTAINER decision before Apply.

| Resource        | Budget | Notes                                                            |
| --------------- | -----: | ---------------------------------------------------------------- |
| Repo searches   |      8 | Only target, guard, audit, Jobs, and test references.            |
| Files to read   |     20 | Read Order plus direct tests/configuration.                      |
| Files to create |      6 | Service, target definition/processor/contracts, and three tests. |
| Files to modify |      8 | Routes, wiring, audit, Jobs, and removal of old import path.     |

## 10. Risks

| Risk                             | Probability | Impact   | Mitigation                                                                                                            |
| -------------------------------- | ----------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| Cross-tenant disclosure/mutation | Low         | Critical | Identity guard plus Host authority, scoped client, worker tenant recheck, and doorbell.                               |
| CSV injection/parse ambiguity    | Med         | High     | Export prefixes `'=+-@` cells with `'`; import accepts the exact header/parser contract and validates before enqueue. |
| Concurrent duplicate             | Med         | High     | Serializable batch; serialization/write conflict rolls back and is terminal, never partial.                           |
| Audit unavailable                | Med         | Critical | Required persistence failure is 503 before response delivery.                                                         |
| Temporary PII retention          | Low         | High     | Buffer is discarded; completed jobs removed; failed jobs age/count bounded and configurable.                          |

## 11. Testing Strategy

| Layer       | Focus                                                             | Approach                                                                                       |
| ----------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Unit        | CSV quoting/formula representation; exact header/row validation   | RED tests for accepted and rejected values.                                                    |
| Unit        | required audit and response ordering                              | audit failure asserts no response payload; actor is identity session only.                     |
| Integration | importer batch                                                    | seed duplicate/write failure; assert pre-validation/no mutation and transaction rollback.      |
| Doorbell    | session → Host → tenant → org → membership → `configuracion:read` | real AppModule HTTP checks 401, 403 codes, valid owner, and Tenant-B session on Tenant-A Host. |
| Regression  | reporting/client ownership                                        | focused reporting suite and absence of Admin Tools CSV route/provider.                         |

## 12. Doorbell Tests

| Test file                                                           | What it proves                                                                                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/test/doorbell/import-export-tenant-isolation.e2e-spec.ts` | Anonymous export is 401; wrong Host/org/membership/capability is 403; Tenant B cannot export/import Tenant A; forged body/file tenant value cannot select another tenant. |

## 13. Required ADRs

| ADR                             | Reason                                                                                                           | Status   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| None                            | No schema, storage service, topology, or persistent import-run model is introduced.                              | N/A      |
| Existing audit retention policy | Audit records retain according to each tenant's `AuditRetentionPolicy` and legal hold; no global default exists. | Existing |

## 14. Boundaries

| Boundary                   | Owner                     | Purpose                                                                        |
| -------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| `clientes-csv-v1` registry | ImportExportModule        | Sole allowlisted target; no arbitrary table/model key.                         |
| Client mutation            | import processor          | Validates and atomically creates clients; no merge/update.                     |
| Authority                  | IdentityOrganizationGuard | Session, Host tenant, org, membership, capability; no client tenant authority. |
| Async lifecycle            | JobsModule                | Queue, idempotency, tenant recheck, and temporary job cleanup.                 |
| Audit persistence          | AuditModule               | Append-only export audit before delivery; no payload content.                  |
| Reporting export lifecycle | ReportingModule           | Excluded reporting `ExportJob` behavior.                                       |

## 15. Extensibility

One additional target requires a new registered key, explicit schema/header, capability, duplicate rule, transaction boundary, idempotency identity, retention settings, and tests. It cannot reuse a generic importer. Heavyweight export generation may add an Export JobDefinition through Jobs only after a size/SLO trigger and an approved Design; Reporting remains separate.

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor         | 10×               | 100×                  | Mitigation                                                         |
| -------------- | ----------------- | --------------------- | ------------------------------------------------------------------ |
| Import rows    | worker latency    | queue/memory pressure | configurable byte/row caps; Jobs concurrency; batch transaction.   |
| Export body    | longer response   | timeout risk          | measure first; later Jobs-backed generation needs Design approval. |
| Temporary jobs | bounded Redis use | bounded Redis use     | immediate completion removal; failed age/count removal.            |

**Decision:** imports are queued; existing exports stay synchronous.

**Rationale:** validated writes are heavyweight; current export size has no async trigger.

**Alternative:** add durable files or a generic worker now; rejected.

**Future impact:** an evidenced export threshold can add a Jobs definition without changing Reporting.

### B. Open/Closed Principle (OCP)

**Point of extension:** the registered target definition.

**What must change to add one more:** its complete contract and tests.

**Decision:** explicit registry, not reflection or tables.

**Rationale:** validation, privacy, duplicates, and transactions are domain-specific.

**Alternative:** generic ETL; rejected.

**Future impact:** additions are deliberate and reviewable.

### C. Ownership

| Data / Capability      | Owner                  | Consumers                 |
| ---------------------- | ---------------------- | ------------------------- |
| operational client CSV | ImportExportModule     | authorized tenant members |
| `Cliente` records      | Tenant Clientes domain | import processor          |
| audit event            | AuditModule            | audit consumers           |
| reporting exports      | ReportingModule        | reporting callers         |

**Decision:** transport is platform-owned; Client data rules remain domain-bounded.

**Rationale:** prevents an alternate generic write path.

**Alternative:** platform owns tables; rejected.

**Future impact:** targets remain independently governed.

### D. Data Retention

| Data                 | Lifetime                       | Archive               | Deletion                                           |
| -------------------- | ------------------------------ | --------------------- | -------------------------------------------------- |
| upload buffer        | request only                   | none                  | discarded after validation/enqueue failure/success |
| completed import job | immediate                      | none                  | `removeOnComplete: true`                           |
| failed import job    | configured, default 24h/100    | none                  | BullMQ age and count removal                       |
| export audit         | tenant audit policy/legal hold | existing audit export | existing retention engine                          |

**Decision:** no source-file storage; only bounded temporary queue payloads.

**Rationale:** existing Jobs use removal options; no import storage policy exists.

**Alternative:** persistent files/reports; rejected pending ADR.

**Future impact:** durable artifacts need a retention ADR.

### E. Idempotency

| Operation     | Duplicate risk | Protection                                  | Fallback                       |
| ------------- | -------------- | ------------------------------------------- | ------------------------------ |
| export        | none           | read-only correlation                       | repeat response/audit          |
| client import | high           | request idempotency key + Jobs job ID       | same job; no second batch      |
| client row    | high           | normalized case-insensitive `nombre` reject | 409/terminal failure, no merge |

**Decision:** idempotency is request-keyed and duplicate handling is reject-only.

**Rationale:** the existing client service uses `nombre` conflict detection.

**Alternative:** silent update/merge; rejected.

**Future impact:** another target defines its own identity.

### F. Shared Contracts

| Contract            | Location                                    | Consumers                    | Producers          |
| ------------------- | ------------------------------------------- | ---------------------------- | ------------------ |
| client CSV v1       | `modules/export/import-export.contracts.ts` | controller, processor, tests | ImportExportModule |
| trusted job context | `modules/jobs/jobs.contracts.ts`            | processor                    | JobsModule         |

**Decision:** contracts remain API-local.

**Rationale:** no second frontend/API consumer is evidenced.

**Alternative:** publish shared package; deferred.

**Future impact:** promote only with a real second consumer.

### G. Partitioning Strategy

| Dimension | Risk                 | Strategy                                             |
| --------- | -------------------- | ---------------------------------------------------- |
| Tenant    | disclosure           | Host-derived scoped reads/writes and worker recheck. |
| Time      | temporary queue data | age-based removal.                                   |
| Volume    | large batches        | byte/row caps and queue concurrency.                 |

**Decision:** no new table/partition.

**Rationale:** imports do not persist run/source records.

**Alternative:** run tables partitioned by tenant/time; deferred with ADR.

**Future impact:** a durable run store needs indexes and retention at first migration.

## 16. Interfaces / Contracts

```typescript
export const IMPORT_TARGETS = ['clientes-csv-v1'] as const;
export type ImportTarget = (typeof IMPORT_TARGETS)[number];

export interface ClienteCsvRow {
  nombre: string;
  tipoNegocio?: string;
  estadoRelacion: string;
  saludGeneral: string;
  tags: string[];
  created?: string; // accepted for compatibility; never controls createdAt
}

export interface ClienteCsvImportPayload {
  target: 'clientes-csv-v1';
  rows: ClienteCsvRow[];
  actorId: string; // copied only from identitySession.userId
  organizationId: string; // copied only from verified membership
}

export interface ImportRetentionOptions {
  removeOnComplete: true;
  removeOnFail: { age: number; count: number }; // defaults: 86400 seconds, 100
}
```

`POST /api/v1/export/import/clientes/csv` consumes multipart `file`, requires `Idempotency-Key`, and returns `202 { jobId, correlationId, target }` only after full validation and enqueue. File tenant/actor fields are rejected. Both `GET /api/v1/export/clientes/csv` and `GET /api/v1/export/all/json` require the same guard/capability and emit `{ actorId, tenantId, organizationId, target, outcome, correlationId }` audit metadata with no exported values. Required audit failure is 503; no anonymous export is permitted.

## 17. Migration Strategy

| Step | Description                                                                                           | Risk                             | Rollback                                                                                                                |
| ---- | ----------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1    | Add guarded export service, required audit persistence, target definition, and bounded queue options. | unavailable audit blocks exports | restore only after audit service health is recovered; do not bypass audit.                                              |
| 2    | Move client import to queued target and remove Admin Tools direct importer.                           | public route migration           | retain documented replacement route; rollback removes the new route and restores only after a separate safety decision. |
| 3    | Deploy backend and run doorbell/queue tests.                                                          | cross-tenant or partial write    | halt deployment on any failed guard/rollback test.                                                                      |

No database migration or frontend flag is planned. Import byte/row and failed-job retention values are environment-backed bounded configuration with the documented defaults.

## 18. Open Questions

| #   | Question                          | Status   | Resolution                                                                                        |
| --- | --------------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| 1   | First import target and fields?   | Resolved | `clientes-csv-v1`, exact existing export headers, and only mapped `Cliente` fields.               |
| 2   | Duplicate and atomicity behavior? | Resolved | Reject normalized duplicate `nombre`; validate before a serializable all-or-nothing target batch. |
| 3   | Tenant authorization and actor?   | Resolved | Identity guard session/Host/org/membership/capability; actor only `identitySession.userId`.       |
| 4   | Audit failure behavior?           | Resolved | Required audit persistence failure is 503 before artifact delivery.                               |
| 5   | Temporary artifact retention?     | Resolved | No files; completion immediate removal; failed Jobs default 24h/100 and configurable age/count.   |

---

> **End of document.** It does not modify the SDD pipeline, prompts, or workflow.
