# Archive Report: Secure Default-Deny Tenant Authentication Boundary

> **Change:** `secure-default-deny-tenant-auth-boundary`
> **Action:** Archive
> **Role:** LOW / OPERATOR-EVIDENCE
> **Normalized result:** PASS
> **Archived at:** `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/`
> **Persistence:** hybrid; this repository artifact is the exact archive record.

## Boundary and provenance

This archive consumes the approved Design, the fresh PASS Architecture Review, the final PASS Tasks Review, the HUMAN-authorized Workload Guard, the Apply 7.5 evidence, the Apply Summary, the Direct Fix evidence, and the fresh PASS Verify Report from the active change directory. No Design, Architecture Review, Tasks, Tasks Review, Workload Guard, Apply, production source/test, or Verify artifact was modified. No Git lifecycle operation was performed. The change folder was relocated intact to the canonical archive location.

## Verify Evidence Gate

| Check | Result |
|---|---|---|
| `verify-report.md` status | PASS |
| CRITICAL issues | None |
| CONDITION findings | AR-06 (deferred API-token scope) and AR-07/G (deferred webhook contracts) — explicitly documented as non-blocking in `verify-report.md:30-31,44-45` and `architecture-review.md:88,97-98,103-104` |
| Verify correction budget | Single Direct Fix consumed; V-001 and V-002 closed |

## Task Completion Gate

The `tasks.md` artifact retains unchecked phase checkboxes (`- [ ]`). This is stale-checkbox condition, not incomplete work. The reconciliation evidence:

| Stale item | Proof of completion |
|---|---|
| 1.1 RED matrix | `apply-7.5-testing.md:31-55` documents the complete executed matrix; `verify-report.md:46-66` confirms 2 suites / 23 passed / 0 skipped / 0 unseeded |
| 1.2 Host/actor separation | `verify-report.md:38` confirms `TenantResolveMiddleware` owns immutable `hostTenantId` |
| 1.3 No-`lector` and route classification | `verify-report.md:41` confirms `PermissionsGuard` requires a principal; classifications verified |
| 1.4 Public metadata scope boundary | `verify-report.md:39-40` confirms public metadata does not bypass scope/permissions |
| 2.1 GREEN implementation | `apply-summary.md:47-54` documents 7.1-7.4 RED/GREEN/REFACTOR evidence; 9 production files modified |
| 2.2 REFACTOR | `apply-summary.md:52-53,73` documents bounded REFACTOR without production change |
| 2.3 Acceptance gates | `apply-summary.md:121-133` and `verify-report.md:48-66` document all gates passed |
| 2.4 Rollback boundaries | `apply-summary.md:111-118` and `tasks.md:23-33` document maintainer-only rollback; not executed |

Reconciliation authorized by: explicit archive instruction consuming PASS `verify-report.md` and `apply-summary.md` as completion proof. The archived `tasks.md` retains its original checkbox state as historical planning evidence; the archive report records the reconciliation.

## Delta Spec Sync

No delta specs were produced by this change. The change directory contained no `specs/` subdirectory. No main spec merge was required. This was a control-flow security boundary correction with no schema, no new bounded context, and no retained data (`design.md:143,208-221`).

## Archived evidence

### Preserved exact evidence paths (original → archived)

| Original path | Archived path |
|---|---|
| `openspec/changes/secure-default-deny-tenant-auth-boundary/design.md` | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/design.md` |
| `openspec/changes/secure-default-deny-tenant-auth-boundary/architecture-review.md` | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/architecture-review.md` |
| `openspec/changes/secure-default-deny-tenant-auth-boundary/tasks.md` | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/tasks.md` |
| `openspec/changes/secure-default-deny-tenant-auth-boundary/tasks-review.md` | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/tasks-review.md` |
| `openspec/changes/secure-default-deny-tenant-auth-boundary/workload-guard.md` | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/workload-guard.md` |
| `openspec/changes/secure-default-deny-tenant-auth-boundary/apply-7.5-testing.md` | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/apply-7.5-testing.md` |
| `openspec/changes/secure-default-deny-tenant-auth-boundary/apply-summary.md` | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/apply-summary.md` |
| `openspec/changes/secure-default-deny-tenant-auth-boundary/verify-direct-fix.md` | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/verify-direct-fix.md` |
| `openspec/changes/secure-default-deny-tenant-auth-boundary/verify-report.md` | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/verify-report.md` |

### Historical blocked Verify / Direct Fix evidence preserved

- Initial BLOCKED Verify (V-001: `@Public()` short-circuited `TenantScopeGuard`; V-002: disposable PostgreSQL/Redis unavailable) is preserved in `verify-report.md:25-32`.
- The single permitted Direct Fix (`verify-direct-fix.md`) closed V-001 by making `TenantScopeGuard` continue to enforce Host scope for authenticated principals even on `@Public()` metadata, and closed V-002 by provisioning/disposing `pgvector/pgvector:pg16` at `localhost:55433` and `redis:7-alpine` at `localhost:56379`.

## Archived security contract summary

The archived evidence retains the complete P0 default-deny tenant authentication boundary contract:

| Contract element | Evidence location |
|---|---|
| Default-deny auth | `verify-report.md:38`; `design.md:8-16,28-39` |
| Host/actor separation | `verify-report.md:38`; `design.md:145-149,194-206` |
| No anonymous `lector` | `verify-report.md:41`; `design.md:8,50` |
| Explicit `@Public()` allow-list only | `verify-report.md:40-41`; `design.md:147-149` |
| Public scope enforcement for authenticated principals | `verify-report.md:39-40`; `verify-direct-fix.md:24-27` |
| Exact webhook behavior (communications + observability) | `verify-report.md:44`; `tasks.md:49-51`; `design.md:155-157` |
| Deferred API-token scope | `verify-report.md:45`; `design.md:157,301` |
| Tenant A/B isolation | `verify-report.md:42-43`; `apply-7.5-testing.md:33,42,55` |
| 22 security scenarios / 23 tests / 0 skipped / 0 unseeded | `verify-report.md:46-47,56`; `apply-summary.md:61,144-147` |

## Archived gates

| Gate | Result | Evidence |
|---|---|---|
| Architecture Review (fresh after AR-01) | PASS | `architecture-review.md:63-117` |
| Tasks Review (final after HUMAN corrections) | PASS | `tasks-review.md:274-341` |
| Workload Guard | BLOCKED → HUMAN authorized Chained PRs | `workload-guard.md:1-105` |
| Apply 7.1–7.6 | PASS | `apply-summary.md:1-170` |
| Real HTTP doorbells | PASS — 2 suites / 23 passed / 0 skipped / 0 unseeded | `verify-report.md:46-47,56` |
| Focused auth/guard/client tests | PASS — 4 suites / 43 passed | `verify-report.md:57` |
| API-token tests | PASS — 1 suite / 7 passed | `verify-report.md:58` |
| API typecheck | PASS | `verify-report.md:59` |
| API lint | PASS | `verify-report.md:60` |
| API build | PASS | `verify-report.md:61` |
| Database scope gate | PASS — 97 models | `verify-report.md:62` |
| SDD validator | PASS | `verify-report.md:63` |
| Design validator | PASS | `verify-report.md:64` |
| Diff check | PASS | `verify-report.md:65` |
| Verify (fresh after Direct Fix) | PASS | `verify-report.md:1-143` |

## Working Set metrics (archived)

| Metric | Result |
|---|---|
| Approved production files modified | 9 |
| Approved test files changed | 5 |
| Total implementation files changed | 14 |
| Bounded deviation files | 0 |
| New dependencies | 0 |
| Schema/migration files changed | 0 |
| Security scenarios executed | 22 |
| Tests passed / skipped / unseeded | 23 / 0 / 0 |
| Git lifecycle operations | 0 |

## Bounded learning record

The canonical bounded learning record is persisted to Engram under:
- **project:** `crm-master`
- **topic_key:** `sdd/secure-default-deny-tenant-auth-boundary/archive-report`
- **type:** `architecture`

Key durable facts for future sessions:
1. `@Public()` metadata bypasses only the global authentication boundary (Better Auth/Tenant Scope), NOT tenant scope, permissions, resource checks, or webhook signature verification. `TenantScopeGuard` enforces Host scope for any authenticated principal regardless of `@Public()` metadata.
2. Disposable test infrastructure for this change: `pgvector/pgvector:pg16` database `doorbell` on `localhost:55433`, `redis:7-alpine` on `localhost:56379`. Serial `--runInBand` required (concurrent invocation exceeds disposable PostgreSQL connection capacity).
3. API-token scope (body/query/path `tenantId`) remains explicitly deferred — no Host/query remediation was performed.
4. Unsigned/unregistered webhook/callback candidates remain default-denied; opening them requires a separately designed signed/stateful contract.
5. Identity export uses `identity-session` classification and a legacy-user-free fixture; `IdentityOrganizationGuard` owns Host/organization comparison.

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. The active changes directory no longer contains this change.

## Canonical next action

**Health Report — LOW / OPERATOR-EVIDENCE.** Produce the bounded repository health report.

```yaml
status: PASS
change: secure-default-deny-tenant-auth-boundary
action: Archive
role: LOW / OPERATOR-EVIDENCE
artifact: openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/archive-report.md
archived_from: openspec/changes/secure-default-deny-tenant-auth-boundary/
archived_to: openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/
artifacts_preserved: 9
delta_specs_synced: 0
verify_gate: PASS
task_reconciliation: stale checkboxes reconciled via apply-summary/verify-report proof
validators:
  sdd_validate: PASS
  design_validate: PASS
next: Health Report — LOW / OPERATOR-EVIDENCE
```
