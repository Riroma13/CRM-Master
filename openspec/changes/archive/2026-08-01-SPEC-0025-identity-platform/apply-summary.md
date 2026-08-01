# Apply Summary

> **SPEC:** SPEC-0025
> **Fecha:** 2026-07-30

## Executive Summary

SPEC-0025 adds the tenant-bound Identity organization and membership platform, fail-closed authorization, append-only audit intent, and BullMQ-backed delivery recovery. Phases 1–5 are complete; Phase 5 is `PASS_WITH_CONDITIONS`. The implementation preserves Better Auth canonical session resolution, tenant isolation, existing physical Prisma mappings, and the repository's composition boundaries.

## Phases Completed

| Phase | Focus | Files Created | Files Modified | WSA |
|-------|-------|:-------------:|:--------------:|:---:|
| 1 | Foundation | Recorded in cumulative apply-progress | Recorded in cumulative apply-progress | Recorded evidence |
| 2 | Core Engine | Recorded in cumulative apply-progress | Recorded in cumulative apply-progress | Recorded evidence |
| 3 | Pipeline | Recorded in cumulative apply-progress | Recorded in cumulative apply-progress | Recorded evidence |
| 4 | Integration | Recorded in cumulative apply-progress | Recorded in cumulative apply-progress | Recorded evidence |
| 5 | Testing | 0 production files; 0 test-only files beyond bounded harness correction | 2 test harnesses | Focused evidence complete |
| **Total** | | **Cumulative implementation** | **Cumulative implementation** | **See apply-progress** |

## Overall Metrics

| Metric | Value |
|--------|-------|
| Working Set Accuracy | Cumulative evidence preserved; no unrelated changes removed |
| Unexpected Files | Preserved and documented; not silently deleted |
| Unexpected Dependencies | None identified for SPEC-0025 |
| Total Files Created | Cumulative implementation files and migrations; see apply-progress |
| Total Files Modified | Cumulative implementation files; see apply-progress |
| Build Success | API build PASS |
| Tests | R5 2/2; R7 4/4; Group A 4 suites/57 tests |

## Implemented Scope

- Identity organization/membership model with active-organization enforcement, invitation and authorization behavior, identity audit outbox, and cross-tenant protection.
- Host-derived tenant authority remains immutable; protected Identity routes fail closed for missing context, session, membership, organization equality, or RBAC permission.
- Invitation acceptance remains token-authorized and explicitly outside the organization guard; bootstrap, health, public, webhook, and non-Identity routes remain excluded.

## Final Architecture

`TenantResolveMiddleware` establishes `hostTenantId`; Better Auth resolves the canonical session; the route-level `IdentityOrganizationGuard` verifies organization membership and RBAC; Identity atomically records mutation, authorization history, and audit outbox intent. Identity is composed through `CoreModule`; `app.module.ts` and the pure `tenant.module.ts` remain unchanged. Audit ingestion owns delivery disposition and DLQ behavior, while BullMQ owns retries.

## Key Files / Modules Added or Changed

- `apps/api/src/modules/identity/` — organization guard, authorization engine, repositories, processors, dispatcher, controller, module, and tests.
- `apps/api/src/common/middleware/tenant-resolve.middleware.ts`, `apps/api/src/common/guards/better-auth.guard.ts`, and `apps/api/src/common/auth-client.provider.ts` — Host/session boundary corrections.
- `apps/api/src/modules/core/core.module.ts` and audit ingestion/module files — composition and audit wiring.
- `packages/database/prisma/schema.prisma`, identity migrations, `packages/database/src/audit-append-only.extension.ts`, and generated tenant-scope artifacts.
- `docs/adr/0025-identity-platform.md` — schema and migration decision record.

## Prisma Schema and Migration Changes

The SPEC-0025 migration adds identity tables, indexes, and Better Auth compatibility columns. The migration was corrected for quoted `"createdAt"` and applied only to isolated `crm_test`; identity tables and compatibility columns were verified. `_prisma_migrations` was not falsified or manually edited. The logical `User → LegacyUser` rename preserves unchanged physical mappings (`users` and `ba_users`) and required no SQL migration or physical table rename.

## Tenant-Isolation and Authorization Guarantees

All Identity reads, claims, completions, and outbox operations retain tenant predicates/scoping. Tenant A cannot read, claim, or complete tenant B state. Host/session/organization/membership/RBAC mismatches deny without leakage; the verified organization mismatch is HTTP 403 `IDENTITY_ORGANIZATION_MISMATCH`.

## Better Auth Integration Outcome

The canonical Better Auth Prisma adapter and default session resolution are preserved. Session `ipAddress`/`userAgent` alignment and the raw bearer fixture correction are complete. The Prisma delegate collision is resolved as `prisma.user → ba_users` and `prisma.legacyUser → users`. No guard fallback, `modelName` workaround, or policy weakening was introduced.

## BullMQ Compatibility Corrections

Active queue identities are colon-free. Activity Timeline now uses the corrected Redis URL. Persisted-job state was verified empty, so no persisted-job migration was required. BullMQ remains the sole retry owner; audit ingestion retains its existing retry policy and terminal DLQ disposition.

## Audit and Reporting Prisma Extension Migration

The global Audit append-only extension prevents mutation of audit history. Reporting uses a dedicated read-only Prisma client while preserving tenant scoping and raw-SQL blocking. The migration retains the logical `User → LegacyUser` rename with unchanged physical mappings and no SQL migration for that logical rename.

## Test Evidence

- R5 PASS 2/2, including organization mismatch HTTP 403 `IDENTITY_ORGANIZATION_MISMATCH`.
- R7 PASS 4/4.
- Focused Group A harness: PASS, 4 suites / 57 tests.
- API build: PASS.
- Tenant isolation: PASS.
- `git diff --check`: PASS.
- `Full historical API suite: CONDITION`.
- `SPEC-0025 regression gates: PASS`.

## Acceptance Criteria Summary

| Phase | Criteria | Status |
|-------|----------|--------|
| 1 | Foundation, catalog/contracts, schema, ADR, migration safety | ✅ |
| 2 | Core engine, scoped repositories, leases, provider boundary | ✅ |
| 3 | Authorization state machine, RBAC, recovery, idempotency | ✅ |
| 4 | Route guard, exclusions, Core wiring, audit/DLQ integration | ✅ |
| 5 | Proof gates and bounded test-harness correction | ✅ with conditions |
| 6 | Apply Summary | ✅ |

## Documented Conditions

- `Full historical API suite: CONDITION` — 11 historical database-dependent suites require `DATABASE_URL`; cleanup failures cascade from those initialization failures. This is unrelated to SPEC-0025.
- API lint remains a condition because of the pre-existing API ESLint gap.
- Migration baseline/reproducibility debt remains a follow-up; migration history was not normalized.
- Unexpected exploration artifacts are preserved and were not silently deleted.

## Unresolved Non-Blocking Follow-Ups

- **Test Environment Isolation and DATABASE_URL Provisioning** — provide isolated database configuration for the historical database-dependent suite and its cleanup paths.
- Resolve the pre-existing API ESLint configuration gap.
- Address migration baseline/reproducibility debt through a separately approved change.

## Architecture Decisions Applied

- Host authority remains at the existing middleware boundary; Identity is composed through `CoreModule`.
- Authorization history and audit intent are append-only; BullMQ exclusively owns delivery retry.
- Better Auth retains canonical adapter/session behavior; legacy logical naming changes do not rename physical tables.
- Audit and Reporting use explicit Prisma extension/client boundaries without weakening tenant or raw-SQL protections.

## Risks

| Risk | Status |
|------|--------|
| Historical suite cannot initialize without `DATABASE_URL` | Documented condition; unrelated |
| Pre-existing API ESLint gap | Documented condition |
| Migration baseline/reproducibility debt | Non-blocking follow-up |

## Exact Verify Entry Criteria

Verify may begin only after this summary and task `6.1` are persisted and re-read, with Phase 5 retained as `PASS_WITH_CONDITIONS`; no additional Phase 5 reruns are required. Verify must consume this summary and cumulative apply-progress, preserve the documented conditions, and must not upgrade `Full historical API suite: CONDITION` or claim migration-history normalization, production deployment, or prior Verify completion.

## Overall Apply Verdict

**PASS_WITH_CONDITIONS**

✅ Apply Summary complete. Ready for Verify entry after canonical workflow transition; Verify has not started.
