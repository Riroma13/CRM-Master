# Tasks: SPEC-0002 — Multi-tenant Isolation & Auth

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

| Unit | Goal | PR | Est. Lines | Notes |
|------|------|----|------------|-------|
| 1 | Foundation + Core Implementation | PR 1 → main | ~250 | @Public, Prisma ext, Middleware, Guard, unit tests |
| 2 | Doorbell E2E Tests | PR 2 → main (depends PR 1) | ~100 | Cross-tenant HTTP, raw SQL throw fix |

## Phase 1: Foundation (4 tasks — spec REQ-001, REQ-002, REQ-003)

- [x] 1.1 Create `apps/api/src/common/decorators/public.decorator.ts` with @Public() decorator + `IS_PUBLIC` metadata key (design ref §Interfaces)
- [x] 1.2 Create `apps/api/jest-e2e.json` — rootDir at project root, `testRegex: "test/doorbell/.*spec\\.ts$"` (design ref §Testing Strategy)
- [x] 1.3 Write test: @Public() decorator sets metadata correctly via Reflector
- [x] 1.4 Delete `apps/api/src/common/guards/tenant.guard.ts` — confirmed zero imports (spec REQ-003, design ADR #5)

## Phase 2: Prisma Extension & Service (5 tasks — spec REQ-004, REQ-005)

- [x] 2.1 Write tests: raw SQL on scoped client throws, unscoped creation warns, scoped queries still work
- [x] 2.2 Add `$queryRaw`/`$queryRawUnsafe`/`$executeRaw` overrides in `packages/database/src/index.ts` that throw on scoped client
- [x] 2.3 Add warning log to `createPrismaClient()` when called without tenantId (skip test env via `process.env.NODE_ENV === 'test'`)
- [x] 2.4 Add `warnOnUnscoped` call in `apps/api/src/common/prisma.service.ts` on default client creation
- [x] 2.5 Remove unused `forTenant()` or keep as documented pass-through (design ref §File Changes)

## Phase 3: Middleware (3 tasks — spec REQ-001 scenarios 1-5)

- [x] 3.1 Write unit tests: slug extraction, cache hit/miss → uses cached value, DB query on miss, unknown slug → 404, reserved slug → isAdminRequest, apex/no-subdomain → isAdminRequest
- [x] 3.2 Inject PrismaService via constructor DI, add DB `tenant.findUnique({ slug })`, store result in 60s cache, throw `HttpException(404)` on unknown slug
- [x] 3.3 Verify `invalidateCache(slug)` still works with new cache implementation

## Phase 4: Guard (4 tasks — spec REQ-002 scenarios 1-5)

- [x] 4.1 Write unit tests: @Public() bypass via Reflector, isAdminRequest bypass, missing tenantId → 403, user.tenantId mismatch → 403
- [x] 4.2 Add Reflector-based @Public() check to `apps/api/src/common/guards/tenant-scope.guard.ts`
- [x] 4.3 Register `TenantScopeGuard` as `APP_GUARD` provider in `apps/api/src/app.module.ts`
- [x] 4.4 Grep codebase for stale TenantGuard imports — confirm zero remaining

## Phase 5: Doorbell E2E Tests (4 tasks — spec REQ-DATA-001 scenarios 1-3, REQ-DATA-002 scenarios 1-2)

- [x] 5.1 Fix raw SQL test: replace `expect(result).toBeDefined()` with `toThrow()` assertion on scoped client
- [x] 5.2 Add e2e HTTP test: create tenants A & B via admin client, authenticate as A, GET tenant B's resource → 403
- [x] 5.3 Add e2e HTTP test: tenant A lists /clientes — only own data returned, no cross-tenant leak
- [x] 5.4 Add e2e HTTP test: tenant A POST /clientes with cross-tenant tenantId — silently scoped to own tenant

## Implementation Order

Phase 1 (foundation) first — @Public decorator and jest-e2e config have no deps. Phase 2 (Prisma ext) is independent. Phase 3 (middleware) depends on PrismaService from Phase 2. Phase 4 (guard) depends on @Public decorator from Phase 1. Phase 5 (e2e) depends on all runtime changes deployed. STRICT TDD per task: write failing test → implement → pass → refactor. Use `opencode-go/kimi-k2.7-code` for code, `opencode-go/deepseek-v4-flash` for planning.
