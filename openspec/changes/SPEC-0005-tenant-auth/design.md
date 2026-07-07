# Design: SPEC-0005 — Better-Auth Migration

## Technical Approach

Replace the in-memory `SessionService` with Better-Auth backed by PostgreSQL via `prismaAdapter`. A new `BetterAuthGuard` replaces `AdminAuthGuard` maintaining the same `request.user` contract (`{ id, email, name, role, tenantId }`). The guard validates sessions via `auth.api.getSession()`, then resolves `role` and `tenantId` from our legacy `User`/`Tenant` models using explicit linking fields. `AuthService.login()` calls `auth.api.signInEmail()` instead of `SessionService.createSession()`. After all tests pass, remove `SessionService` and `AdminAuthGuard`.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| **Better-Auth ↔ NestJS DI** | (a) Standalone singleton `new PrismaClient()` (current `auth.ts`), (b) Factory provider wrapping PrismaService | **(b) Factory provider** | Shares Prisma connection pool; mockable in tests; consistent with DI patterns |
| **User linking** | (a) Match by email, (b) Explicit FK fields | **(b) Explicit FK** — `User.betterAuthUserId`, `Tenant.betterAuthOrganizationId` | Email can change; FK ensures referential integrity; backfill script writes both |
| **Role resolution** | (a) Store role in org metadata, (b) Use legacy `User.role` | **(b) Legacy `User.role`** | Keeps auth system (Better-Auth) decoupled from business logic (roles); org metadata is for org config, not authN roles |
| **TenantId for tenant-admin** | (a) From legacy `User.tenantId`, (b) From `organization.slug` → `Tenant.slug` | **(b) Org slug mapping** | Tenant-admin's scope is defined by their org membership, not by legacy association; ensures new users (no legacy record) work correctly |
| **Admin route enforcement** | (a) Same guard for all routes, (b) Conditional: superadmin only for `/api/v1/admin/*` | **(b) Conditional** | Mirrors current `AdminAuthGuard` boundary; non-admin route auth is out of scope (SPEC-0006+); prevents regression |
| **Test session creation** | (a) Direct token injection, (b) Real `auth.api.signInEmail()` | **(b) Real signInEmail** | End-to-end validation of auth pipeline; tests already use real DB |

## Data Flow

```
Request ──→ TenantResolveMiddleware ──→ BetterAuthGuard ──→ TenantScopeGuard ──→ Controller
                │                            │                     │
                │ sets tenantId              │ validates session   │ checks role
                │ req.isAdminRequest         │ sets req.user       │ enforces tenant boundary
                v                            v                     v
          PrismaService              auth.api.getSession()    PrismaService.forTenant()
                                     (Better-Auth DB)
```

**BetterAuthGuard flow**:
1. Skip if `@Public()` route
2. Skip non-admin routes (pass-through, no user populated — existing behavior)
3. On `/api/v1/admin/*`: extract `Bearer` token, pass headers to `auth.api.getSession()`
4. No valid session → 401
5. Look up legacy `User` by `betterAuthUserId` (session.user.id) from `ba_users`
6. If `legacyUser.role === 'superadmin'` → allow, populate `req.user` with `{ id, email, name, role: 'superadmin', tenantId: legacyUser.tenantId }`
7. If not superadmin → 403 (admin routes require superadmin — same as current guard)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/database/prisma/schema.prisma` | Modify | Add `betterAuthUserId` to `User`, `betterAuthOrganizationId` to `Tenant` |
| `apps/api/src/common/auth-client.provider.ts` | Create | NestJS provider: instantiates `betterAuth()` with `PrismaService.$client` |
| `apps/api/src/common/auth.ts` | Modify | Convert to factory `createAuth(prisma: PrismaClient)` accepting client parameter |
| `apps/api/src/common/guards/better-auth.guard.ts` | Create | New guard: validates Better-Auth sessions, populates `request.user` |
| `apps/api/src/app.module.ts` | Modify | Replace `AdminAuthGuard` with `BetterAuthGuard` in `APP_GUARD` |
| `apps/api/src/modules/auth/auth.module.ts` | Modify | Add `AuthClientProvider`, export it; keep `SessionService` temporarily |
| `apps/api/src/modules/auth/auth.service.ts` | Modify | Replace `sessionService.createSession()` with `authClient.signInEmail()` |
| `apps/api/src/modules/auth/auth.controller.ts` | Modify | Wire Better-Auth sign-in response to existing `AuthResponseDto` shape |
| `apps/api/src/modules/auth/session.service.ts` | Delete | Remove after `BetterAuthGuard` is green and tests pass |
| `apps/api/src/common/guards/admin-auth.guard.ts` | Delete | Remove after `BetterAuthGuard` is green and tests pass |
| `apps/api/src/common/guards/tenant-scope.guard.ts` | Modify | `request.user` shape unchanged — no logic change needed, verify contract |
| `apps/api/test/doorbell/isolation-http.spec.ts` | Modify | Replace `sessionService.createSession()` with Better-Auth signIn + seed `ba_users`/`ba_organizations`/`ba_members` |
| `apps/api/test/doorbell/isolation-gate.spec.ts` | Modify | Extend seed to create `ba_organizations` linked to test tenants |

## Interfaces / Contracts

**`request.user` (unchanged)**:
```ts
interface RequestUser {
  id: string;       // from ba_users.id
  email: string;    // from ba_users.email
  name: string | null;
  role: 'superadmin' | 'tenant-admin';
  tenantId: string; // from legacy Tenant.id (superadmin) or org→Tenant mapping (tenant-admin)
}
```

**AuthClientProvider interface**:
```ts
class AuthClient {
  constructor(prisma: PrismaService);
  readonly handler: ReturnType<typeof betterAuth>; // Express/Node compatible
  signInEmail(body: { email: string; password: string }): Promise<BetterAuthSession>;
  getSession(headers: Headers): Promise<BetterAuthSession | null>;
}
```

**Schema additions**:
```prisma
model User {
  // ... existing fields ...
  betterAuthUserId String? @unique @map("better_auth_user_id")
  // Links to ba_users.id — null for users pending migration
}

model Tenant {
  // ... existing fields ...
  betterAuthOrganizationId String? @unique @map("better_auth_org_id")
  // Links to ba_organizations.id — null for tenants pending migration
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `BetterAuthGuard.canActivate()` — public, admin, missing-token, expired, wrong-role | Mock `AuthClient.getSession()` |
| Unit | `AuthService.login()` with `AuthClient.signInEmail()` — success, wrong password, inactive tenant | Mock Better-Auth responses |
| Integration | Doorbell HTTP: superadmin cross-tenant GET/POST, non-superadmin 403 | Use real `auth.api.signInEmail()` with seeded `ba_users` + `ba_organizations` |
| Gate | Doorbell isolation-gate: scoped client CRUD isolation | Extend seed with `ba_organizations` linked to test tenants; verify no data leaks |

**Doorbell test migration plan**:
1. Seed `ba_organizations` (one per test tenant, slug = `{tenant-slug}`)
2. Seed `ba_users` (one per test user)
3. Seed `ba_members` (link ba_user → ba_organization, role = `admin` for tenant-admin tests)
4. Update legacy `User.betterAuthUserId` and `Tenant.betterAuthOrganizationId`
5. Replace `createSuperadminToken()` → helper that calls `authClient.signInEmail()` and returns `session.token`

## Migration / Rollout

**Backfill script** (idempotent, run once per env):
1. For each active `Tenant`: create `ba_organization` (slug = tenant.slug, name = tenant.name), set `Tenant.betterAuthOrganizationId`
2. For each `User`: create `ba_user` (email, name), set `User.betterAuthUserId`
3. Create `ba_member` linking `ba_user` → `ba_organization` with role = `admin`
4. For superadmin users: skip member creation (org-less), so guard detects superadmin via legacy `User.role`

**Rollback**: `SessionService` and `AdminAuthGuard` are removed ONLY after all doorbell tests pass with Better-Auth. Keeping both in code until the cutover allows instant rollback by reverting `app.module.ts` guard registration.

## Open Questions

- [ ] Better-Auth v1 `auth.api.getSession()` exact return shape with org plugin — verify `activeOrganizationId` field exists in session response
- [ ] Password hashing: Better-Auth's `emailAndPassword` uses its own hashing — backfill script must set `ba_accounts.password` with compatible hash or trigger password reset for existing users
- [ ] Can existing users who know their password sign in through Better-Auth, or does the backfill need to also create `ba_account` rows with pre-hashed passwords?
