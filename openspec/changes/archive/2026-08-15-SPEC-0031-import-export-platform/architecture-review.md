# Architecture Review: SPEC-0031 — Import / Export Platform

> **Status:** PASS
> **Phase:** Fresh Architecture Review (HIGH / ARCHITECT)
> **Design reviewed:** `openspec/changes/SPEC-0031-import-export-platform/design.md`
> **Prior review preserved:** `architecture-review-pre-refinement.md`
> **Correction budget:** The sole Design Refinement was consumed. All material
> findings from AR-004, AR-005, and AR-006 are closed.

## Verdict

PASS. The refined Design closes the prior material blockers without expanding
the approved change: it fixes the single import target and its complete
contract, the per-route authorization chain, and mandatory fail-closed audit
persistence. The remaining Working Set-count observation is a non-blocking
CONDITION; the enumerated Working Set remains the exact execution boundary.

## Findings

| ID     | Status    | Topic                              | Finding                                                                                                                                                                                                                                                                                                                                                       | Required checkpoint action                                                          |
| ------ | --------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| AR-001 | PASS      | A. Scalability                     | Queued imports have explicit byte/row caps, concurrency, and a serializable target batch; current response downloads remain synchronous with an evidenced future threshold.                                                                                                                                                                                   | Preserve.                                                                           |
| AR-002 | PASS      | B. OCP                             | `clientes-csv-v1` is the sole registered target. A future target requires its own schema, authority, duplicate, transaction, retention, and test contract; generic ETL/reflection is rejected.                                                                                                                                                                | Preserve.                                                                           |
| AR-003 | PASS      | C. Ownership                       | ImportExport owns operational client transport; Tenant Clientes owns `Cliente` rules; Jobs owns async lifecycle; Audit owns append-only events; Reporting retains `ExportJob`, schedules, and downloads.                                                                                                                                                      | Preserve.                                                                           |
| AR-004 | PASS      | D. Retention                       | Upload buffers are discarded; completed jobs remove immediately; failed Jobs retain configurable, bounded age/count values (default 24h/100); durable artifacts require an ADR.                                                                                                                                                                               | Preserve.                                                                           |
| AR-005 | PASS      | E. Idempotency                     | `Idempotency-Key`/Jobs job ID handle repeated requests. Normalized case-insensitive `nombre` conflicts reject the complete batch; no merge, overwrite, or partial write path exists.                                                                                                                                                                          | Preserve.                                                                           |
| AR-006 | PASS      | F. Shared contracts                | API-local target, row, payload, actor, organization, and removal-option contracts are explicit. Tenant and actor authority are copied only from the verified identity chain.                                                                                                                                                                                  | Preserve.                                                                           |
| AR-007 | PASS      | G. Partitioning                    | No run/source table is introduced. Host-derived scoping, worker tenant recheck, and temporary-job expiry address tenant, time, and volume boundaries without a destructive migration.                                                                                                                                                                         | Preserve.                                                                           |
| AR-008 | PASS      | Authorization and tenant isolation | Every import/export route requires `IdentityOrganizationGuard` and `configuracion:read`: session → Host → tenant → organization → active membership → capability. It defines 401 for no session, 403 identity failures, 503 catalog mismatch, no anonymous export, session-derived actor, scoped worker access, and real HTTP Host/session doorbell coverage. | Preserve.                                                                           |
| AR-009 | PASS      | Audit and CSV safety               | Export audit metadata is redacted and includes actor, tenant, organization, target, outcome, and correlation ID. Required persistence precedes headers/body and fails 503 without bytes. CSV is UTF-8 RFC-4180, exact-header validated, quote-escaped, and prefixes `'=+-@` cells with `'`.                                                                   | Preserve.                                                                           |
| AR-010 | CONDITION | Exact Working Set                  | Section 5 enumerates seven created files (four primary and three secondary), while Section 9 forecasts six. The path-level Working Set is complete and authoritative; this one-file metric variance does not alter scope, contract, isolation, or a required acceptance criterion.                                                                            | MID records the enumerated Working Set as the planning boundary; do not broaden it. |

## Contract and Boundary Evidence

| Area                     | Status | Evidence                                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explicit import contract | PASS   | Design §§2, 3, 14, 16, and 18 fix `clientes-csv-v1`, UTF-8 RFC-4180 exact headers, pre-validation, reject-only duplicates, and serializable all-or-nothing writes. The legacy importer currently splits rows and writes per row (`admin-tools/csv-import.service.ts:10-52`), and is explicitly removed.                                     |
| SPEC-0028 Jobs reuse     | PASS   | Design §§2, 3, 14, and 16 use `JobsClient`, trusted context, tenant recheck, idempotency key, and bounded removal options. `jobs.contracts.ts:3-25`, `jobs-client.service.ts:31-55`, and `jobs-tenant-authority.service.ts:9-22` provide the reused boundary.                                                                               |
| Authorization            | PASS   | `identity-organization.guard.ts:43-86` proves the required session/Host/tenant/organization/membership/permission chain and its 401/403/503 semantics. `permissions.ts:3-48` defines `configuracion:read`. Design §16 binds both existing export routes and the import route to it.                                                         |
| Audit fail-closed        | PASS   | The current `AuditService.log` is best-effort and falls back to `system` (`audit.service.ts:103-130`); Design §§2, 3, 11, 14, and 16 explicitly require a new awaited persistence path, session-only actor, redacted metadata, and 503 before delivery. `ingestion.service.ts:90-167` is the append-only persistence path to reuse/extract. |
| Reporting ownership      | PASS   | Design §§1, 5, 14, and 15 exclude Reporting. `reporting.controller.ts:171-207` and `reporting/export/export.service.ts:26-147` retain reporting export jobs, queueing, files, and download lifecycle.                                                                                                                                       |
| Host isolation           | PASS   | Design §§2, 4, 11, 12, 14, and 16 require Host-derived authority and a real AppModule doorbell. `tenant-settings-isolation.spec.ts:4-6,108-155` is the bounded fixture precedent.                                                                                                                                                           |
| Existing CSV exports     | PASS   | `export.controller.ts:13-55` establishes the two preserved routes and exported client header order. Design §16 preserves both routes and adds no Reporting route.                                                                                                                                                                           |

## Working Set and Bounded Inspection

### Approved Read Order consumed

1. `apps/api/src/modules/export/export.controller.ts`
2. `apps/api/src/modules/identity/identity-organization.guard.ts` and `apps/api/src/common/auth/permissions.ts`
3. `apps/api/src/modules/admin-tools/csv-import.service.ts` and `apps/api/src/modules/tenant-clientes/tenant-clientes.service.ts`
4. `apps/api/src/modules/jobs/jobs.contracts.ts`, `jobs-client.service.ts`, and `jobs-tenant-authority.service.ts`
5. `apps/api/src/modules/audit/audit.service.ts` and `audit/ingestion/ingestion.service.ts`
6. `apps/api/test/doorbell/tenant-settings-isolation.spec.ts`

### Necessary bounded deviations

| Path                                                                                              | Reason                                                                       | Result                                                               |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `apps/api/src/modules/export/export.module.ts`                                                    | Confirm the named Working Set wiring location.                               | Exists as the narrow composition point to modify.                    |
| `apps/api/src/modules/admin-tools/admin-tools.controller.ts` and `admin-tools.module.ts`          | Confirm the obsolete direct CSV route/provider that the Working Set removes. | Route, provider, and unsafe service are present and exactly covered. |
| `apps/api/src/modules/reporting/reporting.controller.ts` and `reporting/export/export.service.ts` | Confirm the required unchanged Reporting boundary.                           | Reporting-owned export lifecycle is distinct and excluded.           |

## Validation Evidence

| Command                                                                                                                                                                                                                                                         | Result                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `pnpm sdd:validate:design -- "openspec/changes/SPEC-0031-import-export-platform/design.md"`                                                                                                                                                                     | PASS — 18 ordered sections, A–G, decision/rationale separation, and machine-checkable Working Set numbering.               |
| `pnpm sdd:validate`                                                                                                                                                                                                                                             | PASS — governance, Direct wiring, logical roles, hybrid persistence, and maintainer gates.                                 |
| `pnpm exec prettier --check "openspec/changes/SPEC-0031-import-export-platform/design.md" "openspec/changes/SPEC-0031-import-export-platform/architecture-review.md" "openspec/changes/SPEC-0031-import-export-platform/architecture-review-pre-refinement.md"` | PASS — all three active-review artifacts use Prettier code style. Re-run after this review-artifact formatting correction. |

## Canonical Next Action

**PASS → Tasks.** The MID / BUILDER may derive Tasks from this approved Design.
The Workload Guard remains mandatory after a PASS Tasks Review because the
Design forecasts 520–680 changed lines; no Apply begins without the required
HUMAN / MAINTAINER decision.
