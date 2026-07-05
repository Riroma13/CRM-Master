# Archive Report — SPEC-0002-multi-tenant-isolation-auth

**Archived:** 2026-07-04
**Mode:** hybrid (Engram + filesystem)
**Archive type:** intentional-with-warnings (partial — PR 1 / Phases 1-4 only)

## Summary

PR 1 (Phases 1-4) of SPEC-0002 — Multi-tenant Isolation & Auth has been archived.
PR 2 (Phase 5 — Doorbell E2E tests) remains as pending work.

## What Was Delivered (PR 1 — Phases 1-4)

### Phase 1: Foundation
- `@Public()` decorator with `IS_PUBLIC` metadata key created + tested
- `apps/api/jest-e2e.json` created for doorbell test isolation
- `TenantGuard` (x-tenant-id antipattern) deleted — zero stale imports

### Phase 2: Prisma Extension & Service
- `$queryRaw`/`$queryRawUnsafe`/`$executeRaw` overridden on scoped client — throws on raw SQL
- Warning log on `createPrismaClient()` without tenantId (skipped in test env)
- `warnOnUnscoped` integrated into `PrismaService` default client creation
- `forTenant()` kept as documented pass-through

### Phase 3: Middleware
- PrismaService injected via constructor DI
- DB `tenant.findUnique({ slug })` lookup on cache miss
- 60s in-memory per-entry cache with `invalidateCache()` preserved
- `HttpException(404)` on unknown slug

### Phase 4: Guard
- `TenantScopeGuard` registered as `APP_GUARD` via `app.module.ts`
- Reflector-based `@Public()` opt-out check
- `isAdminRequest` bypass for platform routes

### Testing
- 4 test suites, 33 tests written, ALL PASSING
- Coverage: middleware unit, guard unit, Prisma extension unit, decorator unit

## Specs Synced (New Capabilities — No Existing Specs)

| Domain | Action | Details |
|--------|--------|---------|
| `tenant-isolation` | Created | 6 requirements, 15 scenarios — Host-header resolution, global guard, x-tenant-id removal, raw SQL block, scoped client, edge cases |
| `data-leak-detection` | Created | 5 requirements, 9 scenarios — E2E HTTP cross-tenant gate, raw SQL runtime block, scoped client unit test, deploy pre-condition |

## Source of Truth Updated

The following main specs now reflect the delivered behavior:
- `openspec/specs/tenant-isolation/spec.md`
- `openspec/specs/data-leak-detection/spec.md`

## Archive Contents

- `exploration.md` ✅
- `proposal.md` ✅
- `specs/tenant-isolation/spec.md` ✅
- `specs/data-leak-detection/spec.md` ✅
- `design.md` ✅
- `tasks.md` ✅ (16/20 tasks complete — 4 deferred to PR 2)
- `archive-report.md` ✅ (this file)

## Engram Artifact Lineage

| Artifact | Observation ID |
|----------|---------------|
| `sdd/SPEC-0002-multi-tenant-isolation-auth/explore` | #4 |
| `sdd/SPEC-0002-multi-tenant-isolation-auth/proposal` | #7 |
| `sdd/SPEC-0002-multi-tenant-isolation-auth/spec` | #8 |
| `sdd/SPEC-0002-multi-tenant-isolation-auth/design` | #10 |
| `sdd/SPEC-0002-multi-tenant-isolation-auth/tasks` | #11 |
| `sdd/SPEC-0002-multi-tenant-isolation-auth/apply-progress` | #12 |
| `sdd/SPEC-0002-multi-tenant-isolation-auth/verify-report` | #14 |
| `sdd/SPEC-0002-multi-tenant-isolation-auth/archive-report` | (this save) |

## Archival Notes

### Intentional Partial Archive
This archive covers PR 1 only (Phases 1-4). Phase 5 tasks (5.1-5.4) remain unchecked in the archived `tasks.md` by design — they are the scope of PR 2. The verify-report confirms 0 CRITICAL findings, 5 WARNING findings (all non-blocking, acknowledged), and 33/33 in-scope tests passing.

### Verification Findings Carried Forward
- WARNING: REQ-001 apex/no-subdomain spec vs design tension (403 vs admin bypass)
- WARNING: REQ-004 unscoped admin raw SQL not gated by opt-in
- WARNING: Missing Express Request type augmentation for tenantId/tenantSlug/isAdminRequest
- WARNING: Scoped query filtering not unit-tested in PR 1
- WARNING: Pre-existing build/lint pipeline issues (turbo.json, eslint)

## What Remains (PR 2 — Phase 5)

- [ ] 5.1 Fix raw SQL test: replace `expect(result).toBeDefined()` with `toThrow()` assertion on scoped client
- [ ] 5.2 Add e2e HTTP test: create tenants A & B, authenticate as A, GET tenant B's resource → 403
- [ ] 5.3 Add e2e HTTP test: tenant A lists /clientes — only own data, no cross-tenant leak
- [ ] 5.4 Add e2e HTTP test: tenant A POST /clientes with cross-tenant tenantId — scoped to own tenant

## SDD Cycle Status

**PR 1 (Phases 1-4):** ✅ Complete — Planned, Specified, Designed, Implemented, Verified, Archived
**PR 2 (Phase 5):** 🔲 Pending — Ready for implementation
