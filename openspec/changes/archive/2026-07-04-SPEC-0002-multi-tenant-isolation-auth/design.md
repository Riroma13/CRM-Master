# Design: Multi-tenant Isolation & Auth (Phase 1)

## Technical Approach

Three-layer defense, in execution order: **Middleware** (slug→tenantId DB lookup, 60s cache) → **Global Guard** (APP_GUARD, Reflector-based @Public() opt-out) → **Prisma Extension** (block $queryRaw/$executeRaw on scoped clients, warn on unscoped creation). No schema changes. No auth protocol changes (login mock stays). Each layer fails closed.

## Architecture Decisions

| # | Decision | Options Considered | Tradeoff / Rationale |
|---|----------|--------------------|-----------------------|
| 1 | **Cache tenantId in middleware Map** | Map (chosen) vs Redis vs no cache | Redis: overkill for Phase 1, adds infra dependency. Map: 60s TTL, per-process, `invalidateCache()` already exists. Latency penalty on miss: ~1ms DB query, acceptable. |
| 2 | **Guard: global APP_GUARD + @Public()** | APP_GUARD (chosen) vs per-controller @UseGuards | Per-controller: fragile — any new controller that forgets the decorator is unprotected. APP_GUARD: applies to ALL routes; explicit @Public() opt-out via Reflector for healthcheck, login, Mission Control. |
| 3 | **Block $queryRaw on scoped client only** | Block on all clients vs scoped only (chosen) | Unscoped admin client needs raw SQL for Mission Control queries. Scoped client: raw SQL bypasses tenant_id filter — must throw. Warning log on unscoped creation is defense-in-depth. |
| 4 | **Middleware injects PrismaService via NestJS DI** | `app.get(PrismaService)` vs constructor injection (chosen) | NestJS middleware with `@Injectable()` supports DI if registered as provider and applied via `consumer.apply(middleware).forRoutes()`. Already done in AppModule — just add constructor injection. |
| 5 | **Remove TenantGuard entirely** | Remove vs deprecate | No consumers found (grep: zero imports of TenantGuard). `x-tenant-id` is explicitly prohibited by ADR-0001. Safe to delete. |

## Data Flow

```
HTTP Request (Host: acme.crmmaster.com)
  │
  ▼
  TenantResolveMiddleware
  ├─ extractSlug("acme") from Host header
  ├─ Cache hit? → set req.tenantId, next()
  ├─ Cache miss? → prisma.tenant.findUnique({ slug }) → set req.tenantId, cache, next()
  └─ Slug not found → throw HttpException(404)
  │
  ▼
  TenantScopeGuard (APP_GUARD — runs on every route)
  ├─ isAdminRequest? → pass (platform routes: health, login, admin-web)
  ├─ @Public() metadata? → pass
  ├─ !req.tenantId? → throw ForbiddenException(403)
  └─ req.user.tenantId !== req.tenantId? → throw ForbiddenException
  │
  ▼
  Controller / Service
  └─ prisma = this.prisma.forTenant(req.tenantId)  ← scoped client
       └─ $queryRaw → throw ("raw SQL not allowed on scoped client")
       └─ findMany / create / update → auto-injected tenant_id
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/common/middleware/tenant-resolve.middleware.ts` | Modify | Inject PrismaService, query Tenant by slug from Host header, set `req.tenantId`. Remove TODO comment. |
| `apps/api/src/common/guards/tenant-scope.guard.ts` | Modify | Wire via `APP_GUARD` in AppModule. Add `@Public()` Reflector check. Keep `isAdminRequest` bypass. Handle missing `req.tenantId` → 403. |
| `apps/api/src/common/guards/tenant.guard.ts` | Delete | Removes `x-tenant-id` antipattern. No consumers. |
| `apps/api/src/common/decorators/public.decorator.ts` | Create | `@Public()` decorator setting metadata key `IS_PUBLIC` for Reflector. |
| `apps/api/src/app.module.ts` | Modify | Add `TenantScopeGuard` as `APP_GUARD` provider. Remove `TenantGuard` if referenced. Register `PublicDecorator` if needed. |
| `packages/database/src/index.ts` | Modify | Extend scoped client: override `$queryRaw`/`$queryRawUnsafe`/`$executeRaw` to throw. Add warning on `createPrismaClient()` without tenantId (unless env is test). |
| `apps/api/src/common/prisma.service.ts` | Modify | Add `warnOnUnscoped` log. Remove unused `forTenant()` or keep as pass-through. |
| `apps/api/test/doorbell/isolation-gate.spec.ts` | Modify | Add e2e HTTP tests: create tenants via admin client, authenticate as tenant A, attempt cross-tenant GET → 403. Add raw SQL throw assert. Keep existing unit-level Prisma extension tests. |

## Interfaces / Contracts

```typescript
// New: Public decorator metadata key
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Extended request shape (set by middleware, consumed by guard)
declare module 'express' {
  interface Request {
    tenantId?: string;       // populated by middleware
    tenantSlug?: string;     // populated by middleware
    isAdminRequest?: boolean; // set when no subdomain or reserved slug
  }
}

// Prisma extension: raw query ban (scoped client only)
client.$extends({
  client: {
    $queryRaw: () => { throw new Error('Raw SQL not allowed on tenant-scoped client'); },
    $queryRawUnsafe: () => { throw new Error('Raw SQL not allowed on tenant-scoped client'); },
    $executeRaw: () => { throw new Error('Raw SQL not allowed on tenant-scoped client'); },
  }
});
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit: Middleware | Slug extraction, reserved slugs, cache hit/miss, DB query on miss, 404 on unknown slug | NestJS TestingModule mock PrismaService. Jest unit spec. |
| Unit: Guard | @Public() bypass, isAdminRequest bypass, missing tenantId → 403, user.tenantId mismatch → 403 | NestJS Reflector mock. Jest unit spec. |
| Unit: Prisma Extension | $queryRaw/$executeRaw throw on scoped client, no throw on unscoped client, warning log on unscoped creation | Direct import of `createPrismaClient`. Jest unit. |
| E2E: Doorbell (HTTP) | Cross-tenant GET → 403, cross-tenant POST → scopes to own tenant, `GET /clientes` returns only own data | NestJS Test.createTestingModule + supertest. Real DB (test database). Import AppModule. |
| E2E: Doorbell (Prisma) | Existing 5 unit-level tests (scoped findMany, create, update, delete). Raw SQL MUST throw (replace weak `toBeDefined()` with `toThrow`). | Extend isolation-gate.spec.ts. |

**Jest config note**: Current `rootDir: "src"` excludes `test/doorbell/`. Either move doorbell into `src/` or create `jest-e2e.json` with rootDir at project root. Recommend: create `jest-e2e.json` for doorbell tests to keep them isolated from unit test runs.

## Migration / Rollout

No migration required. No schema changes. Each deliverable is an independent commit: middleware → guard → Prisma extension → doorbell tests. Revert any commit to roll back that layer.

## Open Questions

- [ ] Should the raw SQL ban include an escape hatch (e.g., `allowRaw` flag on client)? Proposal says yes for admin client but Phase 1 should keep it strict. Defer to Phase 2.
- [ ] Doorbell test needs a test database — confirm CI has `DATABASE_TEST_URL` or equivalent.
