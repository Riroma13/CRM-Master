# Proposal: SPEC-0002 — Multi-tenant Isolation & Auth (Phase 1)

## Intent

CRM-Master has **zero** tenant data isolation and **zero** auth enforcement today. All services use the unscoped `admin` Prisma client. Guards exist but aren't wired. The mock login accepts any email with password `"password"`. This change locks down the isolation layer so Phase 2 (Better-Auth) and Phase 3 (frontend auth) build on a secure foundation.

## Scope

### In Scope
- TenantResolveMiddleware: DB lookup by Host header slug, populate `tenantId`
- TenantScopeGuard: wire globally via `APP_GUARD`, remove old `x-tenant-id` guard
- Prisma extension: block `$queryRaw`/`$executeRaw`, warn on unscoped creation
- Doorbell gate: e2e HTTP-level cross-tenant isolation tests + raw SQL gate
- Consolidate to one guard file (remove TenantGuard)

### Out of Scope (deferred to Phases 2 & 3)
- Better-Auth org integration, password hashing, JWT, real login
- Session management, /me, refresh, logout
- Frontend login pages or protected routes
- Invite/password reset flows
- Caddy wildcard TLS setup

## Capabilities

### New Capabilities
- `tenant-isolation`: Middleware resolves slug→tenantId, guard enforces scope per route, Prisma extension bans raw SQL and requires tenant scoping
- `data-leak-detection`: Doorbell gate at e2e HTTP level — cross-tenant reads fail, raw SQL throws

### Modified Capabilities
None — no existing `openspec/specs/` to modify

## Approach

Three-layer defense, independently testable:

1. **Middleware** — Inject PrismaService into TenantResolveMiddleware, query Tenant by slug from Host header, cache result 60s, set `tenantId` on request
2. **Guards** — Delete TenantGuard (x-tenant-id antipattern). Wire TenantScopeGuard via `APP_GUARD`. Use Reflector for public route opt-out
3. **Prisma extension** — Override `$queryRaw`/`$executeRaw` to throw unless explicitly allowed. Override `$use` to log warning on unscoped client creation. Scoping for tenant models (User, Cliente, Sistema, etc.) already works — verified by doorbell tests

**Doorbell**: Extend `isolation-gate.spec.ts` to e2e HTTP: create tenants A & B, authenticate as A, GET B's resource → 403. Test raw SQL calls throw.

## Affected Areas

| Area | Impact | Change |
|------|--------|--------|
| apps/api/src/common/middleware/tenant-resolve.middleware.ts | Modified | Inject PrismaService, DB lookup |
| apps/api/src/common/guards/tenant.guard.ts | Removed | x-tenant-id antipattern |
| apps/api/src/common/guards/tenant-scope.guard.ts | Modified | Global APP_GUARD + Reflector |
| apps/api/src/common/prisma.service.ts | Modified | Remove unused forTenant() |
| packages/database/src/index.ts | Modified | Block raw queries, warn unscoped |
| apps/api/test/doorbell/isolation-gate.spec.ts | Modified | e2e cross-tenant HTTP tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Middleware DB lookup adds latency | Low | 60s in-memory cache |
| Removing x-tenant-id guard breaks consumers | Med | Audit all route registrations first |
| Global guard breaks public routes | Low | Reflector + @Public() decorator |
| Raw SQL block breaks legitimate queries | Low | Audit codebase — none found in tenant path |

## Rollback Plan

Each deliverable is a single commit. Revert commit to roll back. No schema changes = no data migration risk.

## Dependencies

None — uses existing PrismaService, NestJS Reflector, in-memory cache

## Success Criteria

- [ ] Doorbell e2e: tenant A cannot read tenant B's data via HTTP
- [ ] Doorbell: raw SQL throws at runtime
- [ ] Guard globally wired: out-of-scope requests return 403
- [ ] Existing AuthService/ClientsService tests still pass
