# Design: Client Platform & Role-Based Login Routing

## Technical Approach

`client-platform` adds a client identity layer (separate `ClientUser` model + cookie
+ guard) to the existing tenant app and exposes a `/portal` route group alongside
the moved `/admin` group, sharing a Next.js app and a multi-layer isolation
contract. Five chained PRs already landed: PR1 schema/ADR, PR2 backend, PR3
shared UI, PR4 frontend, PR5 cleanup. The design is verified-as-built and
serves as the contract the verify phase will read against.

## Architecture Decisions

| Decision | Choice | Tradeoff |
|---|---|---|
| Identity model | Separate `ClientUser` table (not `User.role='client'`) | + 3 security boundaries (table / cookie / guard); − duplicated login flow (ADR 0001) |
| Cookie + guard pair | `__Secure-client-session` JWT, `ClientAuthGuard` rejects `__Secure-session` | + type-safe at cookie layer; − two cookies to keep straight |
| `clienteId` scoping | Auto-inject via `createPrismaClient({ tenantId, clienteId })` | + impossible to forget; − couples Prisma ext to generator output |
| Route separation | Next.js route groups `(admin)/` + `(client)/` on same domain | + one app, one deploy, simpler than sub-app; − shared `Host` requires role-aware middleware |
| Portal feature flag | `NEXT_PUBLIC_CLIENT_PORTAL_ENABLED` gates `(client)/` layout | + opt-in rollout per-tenant; − extra env coordination |
| Prisma `clienteId` extension | Two-stage `$extends`, second stage blocks raw SQL | + raw SQL defense preserved; − chokepoint in `index.ts` |

## Data Flow

    Browser ──POST /api/v1/client/auth/login──> TenantResolveMiddleware
                                                  ↓
                                            ClientAuthController
                                                  ↓
                                            ClientAuthService.login()
                                                  ├── rate-limit (5/min/IP+email)
                                                  ├── bcrypt.verify(password)
                                                  ├── jwt.sign({sub, clienteId, tenantId, role:'client'})
                                                  └── res.cookie(__Secure-client-session)
    Browser ──GET /portal/*──> middleware.ts
                              ├── parseCookie → role
                              └── NextResponse.rewrite(/portal/* | /admin/*)
    SSR Portal page ──fetch /api/v1/client/me──> ClientAuthGuard
                                                  ├── reject if __Secure-session present
                                                  ├── jwt.verify
                                                  └── request.clientUserId/clienteId/tenantId
    Handler ──prisma.forTenant(tenantId).forCliente(clienteId)
        ↓
    createPrismaClient({tenantId, clienteId}) $extends
        ├── $allModels.$allOperations: inject where:{tenantId, clienteId}
        └── client-level: $queryRaw/$executeRaw → reject

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/database/prisma/schema.prisma` | Modify | + `ClientUser` model (cuid PK, FK→Cliente cascade, `@@unique([tenantId,email])`, `email @unique`) |
| `packages/database/prisma/migrations/20260714222500_add_client_users` | Create | Initial `client_users` table |
| `packages/database/prisma/migrations/20260716212500_add_client_user_fields` | Create | + `nombre`, `telefono` columns |
| `packages/database/src/index.ts` | Modify | `createPrismaClient({tenantId?, clienteId?})` — `clienteId` only injected on `CLIENTE_SCOPED_MODELS` (Cita, Documento, ClientUser, Comunicacion, Incidencia, PagoIntent, Presupuesto, Sistema, Tarea) |
| `packages/database/src/prisma-helpers.ts` | (existing) | `injectWhere/injectData/injectDataArray` reused as the chokepoint |
| `packages/shared/src/client-auth/{index,schemas,dto}.ts` | Create | Zod `ClientLoginSchema`, `ClientUserResponse` (`.omit({passwordHash:true})`), `MeResponse` |
| `apps/api/src/modules/client-auth/{module,service,controller,guard,dto/*}.ts` | Create | bcrypt 12 rounds, JWT 7d, in-memory blacklist, rate-limit 5/min, progressive delay, dummy-hash on unknown email |
| `apps/api/src/modules/client-user-management/{module,service,controller,dto/*}.ts` | Create | Admin create/disable/reset; explicit `select` excludes `passwordHash` |
| `apps/api/src/modules/core/core.module.ts` | Modify | Imports `ClientAuthModule` + `ClientUserManagementModule` |
| `packages/ui/src/{index,button,card,badge,layout,utils}.tsx` | Create | Four primitives + `cn()` util, ESM, side-effect free |
| `apps/tenant-web/src/middleware.ts` | Create | Edge middleware: `resolveTenantFromHost` + `resolveRouteByCookie` + JWT verify via `CLIENT_JWT_SECRET` |
| `apps/tenant-web/src/app/(admin)/admin/layout.tsx` | Create | `<SidebarLayout>` wrapper for admin pages |
| `apps/tenant-web/src/app/(client)/layout.tsx` | Create | `NEXT_PUBLIC_CLIENT_PORTAL_ENABLED` gate, server-side `getClientSession()`, redirect to `/login` if missing |
| `apps/tenant-web/src/app/(client)/portal/{page,my-appointments/page,my-documents/page,profile/page,profile/profile-edit-form}.tsx` | Create | 4 server-rendered portal pages, all read `__Secure-client-session` server-side and forward to `/api/v1/client/*` |
| `apps/tenant-web/src/app/login/{page,login-form}.tsx` | Create | Radix `Tabs` (admin/client) dispatches by role to `/admin` or `/portal` |
| `docs/adr/0001-clientuser-schema.md` | Create | ADR per AGENTS.md rule 8 |

## Working Set

### Primary Files (main implementation — already exist)

- `apps/api/src/modules/client-auth/client-auth.{module,service,controller,guard}.ts`
- `apps/api/src/modules/client-auth/dto/client-auth.dto.ts`
- `apps/api/src/modules/client-user-management/client-user-management.{module,service,controller}.ts`
- `apps/api/src/modules/client-user-management/dto/client-user-management.dto.ts`
- `apps/api/src/modules/core/core.module.ts` (wires the two new modules)
- `packages/database/src/index.ts` + `prisma-helpers.ts`
- `packages/database/prisma/schema.prisma` (`ClientUser` model)
- `packages/database/prisma/generators/tenant-scope/generated/tenant-models.ts` (lists `ClientUser` in `TENANT_SCOPED_MODELS` and `CLIENTE_SCOPED_MODELS`)
- `packages/shared/src/client-auth/{index,schemas,dto}.ts`
- `packages/ui/src/{index,button,card,badge,layout,utils}.tsx`
- `apps/tenant-web/src/middleware.ts`
- `apps/tenant-web/src/app/(admin)/admin/layout.tsx`
- `apps/tenant-web/src/app/(client)/layout.tsx`
- `apps/tenant-web/src/app/(client)/portal/page.tsx`
- `apps/tenant-web/src/app/(client)/portal/my-appointments/page.tsx`
- `apps/tenant-web/src/app/(client)/portal/my-documents/page.tsx`
- `apps/tenant-web/src/app/(client)/portal/profile/page.tsx` + `profile-edit-form.tsx`
- `apps/tenant-web/src/app/login/{page,login-form}.tsx`
- `apps/tenant-web/src/app/registro/page.tsx` (self-register form)
- `docs/adr/0001-clientuser-schema.md`

### Secondary Files

- `apps/api/src/common/prisma.service.ts` (`forTenant()` only — no `forCliente()` method yet; client endpoint queries use unscoped `prisma.admin.*` with `tenantId` injected via guard or DTO)
- `apps/api/src/common/guards/better-auth.guard.ts` (skips `@Public()` for client routes)
- `apps/api/src/common/decorators/public.decorator.ts` (used on client login/logout/register/me)
- `apps/admin-web/src/components/` (local `Button`/`Card`/`Badge`/`Layout` copies removed; consumers now import from `@crm-master/ui`)

### Tests

- `apps/api/src/modules/client-auth/client-auth.service.spec.ts` (7 tests: success, wrong password, deactivated, unknown email dummy-hash, rate limit, register, getMe)
- `apps/api/src/modules/client-auth/client-auth.guard.spec.ts` (7 tests: missing cookie, admin cookie rejected, bad role, expired token, blacklist)
- `apps/api/src/modules/client-user-management/client-user-management.service.spec.ts` (9 tests: create, duplicate email, cross-tenant cliente rejected, disable, reset password, passwordHash exclusion)
- `apps/api/test/doorbell/client-isolation.e2e-spec.ts` (7 e2e: cross-client read/list/update/delete on Cita + Documento, client token rejected on `/admin/client-users`, admin token rejected on `/client/me`)
- `apps/api/test/doorbell/isolation-gate.spec.ts` (existing cross-tenant doorbell, unchanged)
- `apps/api/test/e2e/register-login.spec.ts` (e2e register → login happy path)
- `packages/database/src/__tests__/index.test.ts` (clienteId injection on/off, single-arg backward compat, all read/write/upsert ops)
- `packages/database/prisma/__tests__/client-user.test.ts` (schema-level assertions: FK cascade, `@@unique`, table map)
- `packages/shared/src/client-auth/__tests__/schemas.test.ts` (Zod parse/reject cases)
- `packages/ui/src/__tests__/primitives.test.tsx` (15 tests across Button/Card/Badge/Layout)
- `apps/admin-web/src/__tests__/ui-snapshot.test.tsx` (3 snapshot tests proving visuals match the new package)
- `apps/tenant-web/src/__tests__/middleware.spec.ts` (12 tests on `resolveTenantFromHost` + `resolveRouteByCookie`)
- `apps/tenant-web/src/app/(admin)/admin/page.test.tsx` (regression after move into route group)

### Configuration

- `apps/api`: `CLIENT_JWT_SECRET` (required in production; missing → dev fallback with warning)
- `apps/tenant-web`: `CLIENT_JWT_SECRET` (Edge middleware needs same secret to verify cookie), `NEXT_PUBLIC_CLIENT_PORTAL_ENABLED=true` (gates `(client)/` layout), `NEXT_PUBLIC_API_URL` (SSR fetches)
- `packages/database/prisma/schema.prisma` generator: re-run after any new tenant/cliente-scoped model

### Expected NOT to Change

- `apps/api/src/app.module.ts` — only imports `CoreModule`; ClientAuth/ClientUserManagement are wired transitively via `core.module.ts`
- `apps/tenant-web/src/app/layout.tsx` (root layout)
- `apps/tenant-web/src/app/(admin)/admin/**` (existing admin pages — moved into the group, URLs unchanged)
- `apps/admin-web` business pages
- `packages/ui/src/layout.tsx` (Mission Control dashboard chrome — owned by `admin-web`; tenant-web uses its own `(client)/layout.tsx`)
- `CLIENTE_SCOPED_MODELS` list (no new cliente-linked models added by this change)

## Read Order

1. `docs/adr/0001-clientuser-schema.md` — motivation + table-vs-role decision
2. `packages/database/prisma/schema.prisma` lines 213-227 — `ClientUser` model
3. `packages/database/prisma/generators/tenant-scope/generated/tenant-models.ts` — `CLIENTE_SCOPED_MODELS` list
4. `packages/database/src/index.ts` — `createPrismaClient({tenantId, clienteId})` two-stage extension
5. `packages/database/src/prisma-helpers.ts` — chokepoint for `where`/`data` injection
6. `apps/api/src/modules/client-auth/client-auth.guard.ts` — `__Secure-session` rejection + JWT verify
7. `apps/api/src/modules/client-auth/client-auth.service.ts` — bcrypt, rate-limit, progressive delay, dummy-hash
8. `apps/api/src/modules/client-auth/client-auth.controller.ts` — cookie set/clear, `@Public()` use
9. `apps/api/src/modules/client-user-management/client-user-management.service.ts` — `USER_SELECT` excludes `passwordHash`
10. `apps/tenant-web/src/middleware.ts` — `resolveRouteByCookie` rewriting `/` → `/admin` or `/portal`
11. `apps/tenant-web/src/app/(client)/layout.tsx` — feature flag + SSR session fetch
12. `apps/tenant-web/src/app/login/login-form.tsx` — admin/client tab dispatch
13. `apps/api/test/doorbell/client-isolation.e2e-spec.ts` — the contract verify will execute

## Expected Commands

| Layer | Command |
|-------|---------|
| Database (clienteId ext) | `pnpm --filter database test` |
| Database (schema) | `pnpm --filter database test:prisma` (or `vitest packages/database/prisma/__tests__`) |
| Shared (Zod) | `pnpm --filter shared test` |
| API (unit) | `pnpm --filter api test` |
| API (doorbell, requires DB) | `pnpm --filter api test:e2e -- client-isolation` + `-- isolation-gate` |
| API (register/login e2e) | `pnpm --filter api test:e2e -- register-login` |
| UI package | `pnpm --filter ui test` |
| admin-web snapshot | `pnpm --filter admin-web test` |
| tenant-web middleware | `pnpm --filter tenant-web test` |
| tenant-web build | `pnpm --filter tenant-web build` |
| Migration | `pnpm --filter database prisma migrate dev` (one-time per schema change) |

## Design Confidence

**High** for the cross-client isolation contract: every ClientUser→Cliente→Cita/Documento path is gated by the
`clienteId` Prisma extension (verified by doorbell cross-client e2e), and the dual-cookie rejection in
`ClientAuthGuard` is a deterministic check (verified by guard unit tests + doorbell). **Medium** for the
`/portal` SSR data correctness today — the portal pages currently read `__Secure-client-session` server-side
and forward it to the API; the API's tenant resolution then has to inject `tenantId`. The Cita/Documento
endpoints (`/api/v1/client/appointments`, `/api/v1/client/documents`) referenced by the portal pages are
**not** part of this change and may not yet exist as client-scoped handlers — verify phase must confirm they
either (a) exist and are scoped, or (b) return 404/empty arrays without leaking. **Low** for rate-limit
state durability — the in-memory `Map` in `ClientAuthService` is per-instance and resets on restart; not a
release blocker but a known gap.

## Exploration Budget

| Area | Budget | Why |
|---|---|---|
| Backend modules (auth + user-mgmt + guard + DTOs) | Required | execution contract |
| Doorbell e2e (cross-client + isolation-gate) | Required | safety net verify must execute |
| `(client)/layout.tsx` + portal pages + login-form | Required | runtime UX path |
| `packages/ui` exports + 1 consumer (admin-web snapshot) | Required | PR3 boundary check |
| `prisma/schema.prisma` ClientUser + generators/tenant-models | Required | extension correctness |
| `app.module.ts`, `core.module.ts` (wiring) | Skim | transitive only |
| `tenant-web/src/app/(admin)/admin/**` (move target) | Spot check | URLs must be unchanged |
| `packages/shared/src/client-auth/schemas.ts` + tests | Skim | regression |
| `prisma-helpers.ts` | Skim | chokepoint, but covered by `index.test.ts` |
| Cita/Documento client API endpoints (`/api/v1/client/*`) | Verify | not in this PR; must confirm scope |

## Threat Matrix

`N/A` — this change does not introduce new routing, shell, subprocess, VCS/PR
automation, executable-file classification, or process-integration boundaries.
`tenant-web/src/middleware.ts` is Edge-runtime HTTP routing (already covered by
the existing cross-tenant `TenantResolveMiddleware`); JWT verification uses
`jsonwebtoken` with `CLIENT_JWT_SECRET`, no new shell/subprocess surface.
