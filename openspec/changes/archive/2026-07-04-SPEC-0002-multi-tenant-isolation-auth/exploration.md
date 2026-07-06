## Exploration: SPEC-0002 — Autenticación multi-tenant y aislamiento

### Current State

CRM-Master has a partially-built auth system that is **not functional** for multi-tenant isolation. Key facts:

**Auth implementation**: Custom mock auth — `better-auth` is listed as a dependency (`^1.0.0`) in `apps/api/package.json` but is **never imported anywhere** in the codebase. The login flow in `auth.service.ts` uses a hardcoded password check (`dto.password !== 'password'`) and generates random hex tokens (`sess_${randomBytes(32).toString('hex')}`). No JWT, no session validation middleware, no password hashing.

**Tenant resolution**: The `TenantResolveMiddleware` (`apps/api/src/common/middleware/tenant-resolve.middleware.ts`) extracts a slug from the Host header but **never queries the database** — it has a TODO comment: "Esto se reemplazará con inyección de PrismaService cuando esté disponible". The cache is checked but only populated by the incomplete path. The middleware sets `tenantSlug` on the request but not `tenantId`.

**Guards**: Two guard files exist but **neither is actually applied** to any controller route — `@UseGuards()` is imported but never used as a decorator. `TenantGuard` uses `x-tenant-id` header (inconsistent with the ADR's subdomain decision), and `TenantScopeGuard` checks `request.tenantId` but that field is never populated by the middleware.

**Prisma Client Extension** (`packages/database/src/index.ts`): The `createPrismaClient(tenantId?)` function returns an unscoped `PrismaClient` when no tenantId is given, and a scoped one when tenantId is provided. It scopes models: User, Cliente, Sistema, ItemInventario, EventoBitacora, Tarea. No blocking of `$queryRaw` or `$executeRaw`. No warning for unscoped queries.

**Service layer**: ALL services (`auth.service.ts`, `clients.service.ts`, `dashboard.service.ts`, `tenants.service.ts`) use `this.prisma.admin.*` — the unscoped admin client. **No service uses tenant-scoped queries**.

**Frontend apps**: Both `admin-web` and `tenant-web` have zero auth middleware — no login page, no session check, no protected routes. The admin-web dashboard uses mock data.

**Doorbell test**: `apps/api/test/doorbell/isolation-gate.spec.ts` tests the Prisma Extension scoping (5 tests) but is a unit-level test of the extension, not an e2e HTTP test. The raw SQL test is weak — it just checks `expect(result).toBeDefined()`. Missing: cross-tenant token test, middleware discrepancy test, cache poisoning test.

**Prisma schema**: No password field on User. No Better-Auth tables (session, account, verification, organization, member). No Invitation table. Missing `lastLoginAt` on User.

### Affected Areas

- `packages/database/prisma/schema.prisma` — User model missing password, lastLoginAt; no session/invitation models
- `packages/database/src/index.ts` — Prisma extension missing raw query blocking, missing unscoped warnings
- `apps/api/src/common/middleware/tenant-resolve.middleware.ts` — Incomplete: no DB lookup, no proper cache, no cache invalidation
- `apps/api/src/common/guards/tenant.guard.ts` — Uses wrong header (x-tenant-id), never applied
- `apps/api/src/common/guards/tenant-scope.guard.ts` — Depends on unpopulated request.tenantId, never applied
- `apps/api/src/common/prisma.service.ts` — Always creates unscoped client; forTenant() exists but unused
- `apps/api/src/modules/auth/auth.service.ts` — Mock password, no Better-Auth, no JWT, no refresh
- `apps/api/src/modules/auth/auth.controller.ts` — Missing /me route, logout is stub, no refresh
- `apps/api/src/modules/auth/auth.module.ts` — Missing JwtModule, BetterAuthModule, PassportModule
- `apps/api/src/modules/clients/clients.service.ts` — Uses unscoped admin client, no tenant isolation
- `apps/api/src/modules/tenants/tenants.service.ts` — Creates users without password, no Better-Auth org provisioning
- `apps/api/test/doorbell/isolation-gate.spec.ts` — Weak raw SQL test, missing cross-tenant session test
- `apps/admin-web/src/**/*` — No auth middleware, no login page, no protected routes
- `apps/tenant-web/src/**/*` — No auth middleware, no login page, no protected routes
- `apps/api/package.json` — better-auth dependency unused
- `docs/specs/SPEC-0002-multi-tenant-isolation-auth.md` — Proposed, needs update after exploration findings
- `docs/specs/SPEC-0001-tenant-onboarding.md` — Proposed, depends on auth being functional

### Approaches

1. **Full spec implementation** — Implement all items in SPEC-0002 as specified
   - Pros: Covers all gaps comprehensively, aligns with ADR-0001
   - Cons: Large surface area for a single change
   - Effort: High (multiple sub-tasks: schema changes, middleware, guards, Prisma extension, endpoints, tests)

2. **Phased approach — isolation first, Better-Auth second**
   - Phase 1: Fix middleware (DB lookup), wire guards, add raw query blocking to Prisma extension, strengthen doorbell tests
   - Phase 2: Better-Auth integration with organizations, JWT, password hashing, real login
   - Phase 3: Session management (refresh, logout, /me), frontend auth
   - Pros: Each phase is independently verifiable, isolation is the highest priority
   - Cons: Better-Auth integration may require restructuring Phase 1 work
   - Effort: Medium per phase

3. **Minimal viable auth** — Skip Better-Auth, implement proper password auth with JWT and bcrypt, focus on tenant isolation middleware/guards
   - Pros: Fastest path to a working auth system, avoids Better-Auth learning curve and API uncertainty
   - Cons: Deviates from the stack decision, would need migration to Better-Auth later
   - Effort: Medium

### Recommendation

Approach 2 (Phased — isolation first, Better-Auth second). Rationale:

1. **Tenant isolation is the highest risk**: Currently any service can read/write any tenant's data because all use the unscoped admin client. Fixing middleware, guards, and Prisma extension should be first.
2. **Better-Auth integration is complex**: The dependency exists but the API for organizations is untested in this codebase. Integrating it requires understanding Better-Auth's session management, org model, and how it maps to the existing Tenant/User schema. This is better done as a focused second phase.
3. **The doorbell test needs strengthening**: Without a strong raw SQL gate and e2e cross-tenant tests, the isolation guarantee is weak.

Phase 1 scope: Complete TenantResolveMiddleware (DB lookup, proper cache), wire TenantScopeGuard to all routes, add raw query blocking to Prisma extension, add unscoped query warnings, strengthen doorbell tests, add e2e cross-tenant tests.
Phase 2 scope: Better-Auth integration (org creation during tenant onboarding, org-based login, password hashing/verification), JWT session with tenantId in payload.
Phase 3 scope: Session management, frontend auth, /me endpoint, password reset, invite flow.

### Risks

- **CRITICAL — No data isolation currently**: All services use unscoped admin client. A user hitting any tenant endpoint through admin-web can read ALL tenants' data.
- **CRITICAL — No auth enforcement**: Guards exist but are not applied. Any request hitting the API bypasses all auth checks.
- **HIGH — Better-Auth API uncertainty**: The `^1.0.0` version's organizations API may not work as expected. The spec assumes Better-Auth supports orgs natively but this hasn't been validated.
- **HIGH — Mock password in production path**: If deployed now, anyone who knows any user's email can log in with password "password".
- **MEDIUM — Middleware path relies on unpopulated request fields**: Auth service reads `(this.req as any).tenantSlug` but middleware sets it inconsistently.
- **MEDIUM — Two guards with different approaches**: Creates confusion about which is the canonical guard.
- **MEDIUM — Caddy wildcard routing not provisioned**: The subdomain-based tenant resolution depends on `*.crmmaster.com` routing, which requires infra setup.
- **LOW — Reserved slugs duplicated**: Defined in both middleware (`tenant-resolve.middleware.ts:4-8`) and tenant DTO (`dto.ts:3-8`) — maintenance risk.

### Ready for Proposal

Yes. The exploration is thorough and the phased approach provides a clear path forward. The orchestrator should present the phased approach to Ricardo for approval before proceeding to sdd-propose, specifically asking:
1. Does he want Better-Auth or a simpler JWT approach?
2. Priority order for the phases (isolation vs auth vs frontend)?
3. Whether the doorbell test should be e2e (HTTP level) or stay as unit-level (Prisma extension only)?
