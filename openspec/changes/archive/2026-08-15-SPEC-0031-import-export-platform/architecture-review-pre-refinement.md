# Architecture Review: SPEC-0031 — Import / Export Platform

> **Status:** BLOCKED
> **Phase:** Architecture Review (HIGH / ARCHITECT)
> **Design reviewed:** `openspec/changes/SPEC-0031-import-export-platform/design.md`
> **Canonical checkpoint:** Design Refinement. This is the single permitted
> Architecture Review correction loop; a fresh Architecture Review is mandatory
> after refinement.

## Verdict

The Design has the canonical Enterprise shape and correctly preserves Reporting
ownership, defines an export-focused Working Set, and requires a Host-based
tenant-isolation doorbell. It cannot pass because the importer is described as
an adapter in this change while its resource, transport, duplicate/atomicity,
and retention decisions remain blocking. The current export authorization and
audit contracts are also not stable enough to prove the stated security and
audit requirements.

## Findings

| ID     | Status    | Topic                                           | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Required checkpoint action                                                                                                                                                                                                                                                                                 |
| ------ | --------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AR-001 | PASS      | A. Scalability                                  | The synchronous, no-persistence export boundary is evidence-based. Response-growth risk, measurement trigger, and a separately approved async/storage path are stated without inventing a queue or storage service.                                                                                                                                                                                                                                           | Preserve.                                                                                                                                                                                                                                                                                                  |
| AR-002 | PASS      | B. OCP / C. Ownership / F. Shared Contracts     | The internal domain adapter is a concrete extension point. `ImportExportModule` owns operational projections only; domain modules own mutations; `ReportingModule` retains `ExportJob`, queue, and download ownership.                                                                                                                                                                                                                                        | Preserve.                                                                                                                                                                                                                                                                                                  |
| AR-003 | PASS      | D. Retention / E. Idempotency / G. Partitioning | No artifact is persisted for current exports; future source/report retention is explicitly ADR-bound. Export is read-only and future import requires a Jobs idempotency key and domain duplicate policy.                                                                                                                                                                                                                                                      | Preserve.                                                                                                                                                                                                                                                                                                  |
| AR-004 | BLOCKED   | Import contract                                 | Design Section 18 leaves target entity/fields, transport/size/encoding/file validation, and duplicate/merge/overwrite/atomicity as **BLOCKING**. Those decisions determine validation, authorization, idempotency identity, error reporting, retention, and the Jobs payload. A deferred interface does not make an importer implementable.                                                                                                                   | In Design Refinement, either remove all importer implementation/contingent Working Set entries from this change and retain export-only scope, or obtain maintainer decisions that define one bounded importer end to end. Do not create Tasks until resolved.                                              |
| AR-005 | BLOCKED   | Security and authorization                      | The Design states that an authenticated tenant administrator consumes operational exports, but it defines neither a route authorization contract nor the required permission. Current export routes are under `/api/v1/export`; `BetterAuthGuard` permits anonymous non-`/api/v1/admin` requests, and `PermissionsGuard` permits routes with no `@Permissions` metadata. Swagger bearer metadata is documentation only.                                       | In Design Refinement, specify the concrete authentication and authorization invariant for both export routes, its controller/decorator enforcement, required failure status, and HTTP evidence. The refined contract must not rely on Swagger annotations or an assumed global guard behavior.             |
| AR-006 | BLOCKED   | Audit contract                                  | The Design requires an audit event after completed exports but Section 18 leaves both the requirement and actor source open. `AuditService.log` accepts user identity but falls back to `system`, and deliberately skips persistence when its optional queue is unavailable. The Design does not define action/resource/outcome/metadata redaction, actor source, or whether an unavailable audit sink fails the export or is an explicit accepted condition. | In Design Refinement, define the export audit event and its delivery/failure semantics without logging exported payloads. If audit is mandatory product policy, maintainer must confirm the policy and actor identity source; otherwise record the bounded non-blocking condition with owner and evidence. |
| AR-007 | CONDITION | Tenant isolation                                | The Design requires Host-derived `@TenantId()`, scoped reads, and a real AppModule doorbell that seeds two tenants and proves forged tenant selection cannot disclose data. This is the correct acceptance boundary. The current controller uses `prisma.admin` with manual `tenantId` filters, so the refinement/implementation must use the stated scoped-client invariant rather than treating existing code as proof.                                     | Preserve the listed doorbell and assert Tenant-B-session-to-Tenant-A-Host denial as well as Tenant-A output excluding seeded Tenant-B values.                                                                                                                                                              |
| AR-008 | CONDITION | CSV safety and public compatibility             | The Design mandates quote escaping and spreadsheet-formula neutralization, but the current CSV route only quotes values. The Design's open question does not state the chosen neutralized cell representation or compatibility expectation.                                                                                                                                                                                                                   | In Design Refinement, state the exact safe representation and add it to the unit/route contract; do not silently change a public CSV representation.                                                                                                                                                       |
| AR-009 | PASS      | Working Set and boundaries                      | The Working Set is bounded to the operational export module, service/contracts, tests, and pure infrastructure composition. It excludes schema/migrations, Reporting, client CRUD, app composition, and frontend. The 180–260-line export-only forecast is below Workload Guard threshold; contingent importer work is correctly forecast at zero until a revised approved Design exists.                                                                     | Preserve; no Working Set expansion in this review.                                                                                                                                                                                                                                                         |

## Contract and Evidence Review

| Area                           | Status    | Evidence                                                                                                                                                                                                                                                                           |
| ------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enterprise Design shape / A–G  | PASS      | `design.md` Sections 1–18 and A–G are present; `pnpm sdd:validate:design -- openspec/changes/SPEC-0031-import-export-platform/design.md` passed.                                                                                                                                   |
| Existing export contract       | CONDITION | `export.controller.ts:13-55` exposes only `GET /api/v1/export/clientes/csv` and `GET /api/v1/export/all/json`; preservation is explicit in Design Section 16.                                                                                                                      |
| Reporting ownership            | PASS      | `reporting.controller.ts:171-207` and `reporting/export/export.service.ts:26-147` own reporting export jobs, queueing, and protected file download. Design Sections 2, 5, and 14 exclude them.                                                                                     |
| Jobs boundary                  | CONDITION | `jobs.contracts.ts:3-25` provides `TrustedJobContext`, `JobDefinition`, and `JobsClient`; Design correctly consumes rather than duplicates it, but AR-004 prevents defining an import job.                                                                                         |
| Audit integration              | BLOCKED   | `audit.module.ts:27-80` globally exports `AuditService`; `audit.service.ts:103-130` supports redacted details but skips logging without a queue. No stable export-event contract is defined.                                                                                       |
| Authentication / authorization | BLOCKED   | `app.module.ts:31-46` installs global guards. `better-auth.guard.ts:42-64` only requires credentials for `/api/v1/admin`; `permissions.guard.ts:15-22` allows an endpoint with no permission metadata. The export controller has neither a route guard nor permission declaration. |
| Tenant isolation               | CONDITION | `prisma.service.ts:24-31` provides `forTenant`; Design mandates it. `tenant-settings-isolation.spec.ts:4-6,108-155` demonstrates the required real HTTP, Host-selected testing pattern.                                                                                            |

## Bounded Evidence and Validation

### Approved Read Order consumed

1. `apps/api/src/modules/export/export.controller.ts`
2. `apps/api/src/modules/export/export.module.ts`
3. `apps/api/src/common/prisma.service.ts`
4. `apps/api/src/modules/audit/audit.service.ts`
5. `apps/api/src/modules/jobs/jobs.contracts.ts`
6. `apps/api/src/modules/reporting/reporting.controller.ts`
7. `apps/api/src/modules/reporting/export/export.service.ts`
8. `apps/api/test/doorbell/tenant-settings-isolation.spec.ts`

### Necessary bounded deviations

| Path                                                              | Reason                                                  | Result                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `apps/api/src/modules/audit/audit.module.ts`                      | Verify AuditService availability and export contract.   | Global module exports `AuditService`; queue is optional.                |
| `apps/api/src/modules/infrastructure/infrastructure.module.ts`    | Verify composition/Reporting boundary.                  | Pure aggregation imports Audit and Export modules.                      |
| `apps/api/src/app.module.ts`                                      | Verify global authentication/tenant guard registration. | Registers BetterAuth, tenant-scope, rate-limit, and permissions guards. |
| `apps/api/src/common/guards/better-auth.guard.ts`                 | Verify actual authentication behavior of export routes. | Non-admin paths permit no credential.                                   |
| `apps/api/src/common/guards/permissions.guard.ts`                 | Verify authorization behavior without route metadata.   | No permission metadata permits the route.                               |
| `apps/api/src/modules/tenant-clientes/tenant-clientes.service.ts` | Verify local audit-call convention.                     | Calls audit with tenant/action/resource and optional actor fields.      |

### Commands

| Command                                                                                                 | Result                                                                                                               |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `pnpm sdd:validate`                                                                                     | PASS — canonical governance, local Direct wiring/model bindings, hybrid persistence, and maintainer gates validated. |
| `pnpm sdd:validate:design -- openspec/changes/SPEC-0031-import-export-platform/design.md`               | PASS — canonical 18 sections, A–G topics, decision/rationale separation, and Working Set numbering validated.        |
| `pnpm exec prettier --check "openspec/changes/SPEC-0031-import-export-platform/design.md"`              | PASS — all matched files use Prettier code style.                                                                    |
| `pnpm exec prettier --check "openspec/changes/SPEC-0031-import-export-platform/architecture-review.md"` | PASS — all matched files use Prettier code style.                                                                    |

## Blockers

1. **AR-004:** Maintainer-owned import product decisions are absent. No import implementation contract is stable.
2. **AR-005:** Export authentication and authorization are not specified or enforced by the current documented route contract.
3. **AR-006:** Export audit semantics, actor identity, and unavailable-sink behavior are unresolved.

## Canonical Next Action

**BLOCKED → Design Refinement.** The Design Refinement is the one permitted
Architecture Review correction. It must resolve the three blockers within the
Design's bounded scope, preserve Reporting ownership and tenant isolation, and
return for one fresh Architecture Review. Tasks is not a legal next action.
