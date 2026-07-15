# Tasks: Client Platform & Role-Based Login Routing

## Review Workload Forecast
| Field | Value |
|---|---|
| Estimated changed lines | 1800-2500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 Foundation → PR2 Backend → PR3 Shared UI → PR4 Frontend |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No (chosen: feature-branch-chain)
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units
| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | ClientUser schema+ADR, Zod DTOs, Prisma clienteId extension | PR1 | `pnpm --filter database test` | `pnpm --filter database prisma migrate dev` | packages/database prisma + packages/shared; drop migration |
| 2 | client-auth + client-user-management modules, guard, doorbell cross-client e2e | PR2 | `pnpm --filter api test:e2e -- client-isolation` | supertest cookie roundtrip (Nest TestingModule + real DB) | apps/api modules; unregister in app.module.ts |
| 3 | packages/ui 4 primitives + admin-web re-import | PR3 | `pnpm --filter ui test && pnpm --filter admin-web build` | admin-web build | packages/ui + admin-web components; restore local copies |
| 4 | tenant-web (admin) move, (client) routes+layout, /login, middleware | PR4 | `pnpm --filter tenant-web test:e2e` | Playwright /portal SSR against real tenant-web | apps/tenant-web only |

## Phase 1: Foundation (PR1) ✅ COMPLETE
- [x] 1.1 RED: packages/database/prisma/__tests__/client-user.test.ts asserts ClientUser table + @@unique([tenantId,email]), FK→Cliente cascade
- [x] 1.2 GREEN: add ClientUser model to packages/database/prisma/schema.prisma; prisma migrate dev --name add_client_users
- [x] 1.3 Create docs/adr/0001-clientuser-schema.md referencing AGENTS.md rule 8 (blocks PR1 without it)
- [x] 1.4 RED: packages/shared/src/client-auth/__tests__/schemas.test.ts — ClientLoginSchema, ClientUserResponse, MeResponse parse/reject
- [x] 1.5 GREEN: create packages/shared/src/client-auth/{index.ts,schemas.ts,dto.ts} Zod schemas; export from packages/shared/src/index.ts
- [x] 1.6 RED: packages/database/src/__tests__/index.test.ts — createPrismaClient({tenantId,clienteId}) injects where:{clienteId} on Cliente-linked models; single-arg unaffected
- [x] 1.7 GREEN: widen packages/database/src/index.ts createPrismaClient({tenantId?, clienteId?}); inject clienteId on Cita,Documento-linked models
- [x] 1.8 REFACTOR: extract shared where-injection helper via prisma-helpers.ts; one chokepoint

## Phase 2: Backend Modules (PR2) ✅ COMPLETE
- [x] 2.1 RED: apps/api/src/modules/client-auth/client-auth.service.spec.ts — 7 tests, all pass
- [x] 2.2 GREEN: client-auth {module,service,controller,dto}.ts; bcrypt 12 rounds; JWT claims {sub,clienteId,tenantId,role:'client'}
- [x] 2.3 RED: client-auth.guard.spec.ts — 7 tests, all pass
- [x] 2.4 GREEN: client-auth.guard.ts
- [x] 2.5 RED: client-user-management.service.spec.ts — 9 tests, all pass
- [x] 2.6 GREEN: client-user-management {module,service,controller,dto}.ts; select excludes passwordHash
- [x] 2.7 app.module.ts registers ClientAuthModule + ClientUserManagementModule
- [x] 2.8 RED: test/doorbell/client-isolation.e2e-spec.ts — 7 tests, all pass
- [x] 2.9 GREEN: doorbell gate real HTTP server

## Phase 3: Shared UI (PR3) ✅ COMPLETE
- [x] 3.1 RED: packages/ui/src/__tests__/primitives.test.tsx — 15 tests, all pass
- [x] 3.2 GREEN: create packages/ui/ (7 files) — Button/Card/Badge/Layout
- [x] 3.3 RED: apps/admin-web snapshot test — 3 snapshots, all match
- [x] 3.4 GREEN: both consumers wired; local copies removed from admin-web

## Phase 4: Frontend Routes (PR4) ✅ COMPLETE
- [x] 4.1 RED: middleware.spec.ts — 12 tests, all pass
- [x] 4.2 GREEN: create apps/tenant-web/src/middleware.ts (Edge, JWT cookie routing)
- [x] 4.3 Move admin into (admin)/ route group — URLs unchanged
- [x] 4.4 RED: e2e/login.spec.ts — 7 Playwright scenarios
- [x] 4.5 GREEN: login page with Admin/Client tabs, no user-enumeration
- [x] 4.6 GREEN: (client)/portal with 4 pages (dashboard, profile, appointments, documents)

## Phase 5: Cleanup & Gate ✅ COMPLETE
- [x] 5.1 REFACTOR: passwordHash exclusion via explicit select + doorbell regression test
- [x] 5.2 Gate client pages behind NEXT_PUBLIC_CLIENT_PORTAL_ENABLED
- [x] 5.3 Update data-leak-detection spec — cross-client ADDED + MODIFIED delta
- [x] 5.4 Verify conventional commits; ADR 0001 referenced in PR1 description
