# Tasks: Client Platform & Role-Based Login Routing

## Review Workload Forecast
| Field | Value |
|---|---|
| Estimated changed lines | 1800-2500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 Foundation → PR2 Backend → PR3 Shared UI → PR4 Frontend |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units
| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | ClientUser schema+ADR, Zod DTOs, Prisma clienteId extension | PR1 | `pnpm --filter database test` | `pnpm --filter database prisma migrate dev` | packages/database prisma + packages/shared; drop migration |
| 2 | client-auth + client-user-management modules, guard, doorbell cross-client e2e | PR2 | `pnpm --filter api test:e2e -- client-isolation` | supertest cookie roundtrip (Nest TestingModule + real DB) | apps/api modules; unregister in app.module.ts |
| 3 | packages/ui 4 primitives + admin-web re-import | PR3 | `pnpm --filter ui test && pnpm --filter admin-web build` | admin-web build | packages/ui + admin-web components; restore local copies |
| 4 | tenant-web (admin) move, (client) routes+layout, /login, middleware | PR4 | `pnpm --filter tenant-web test:e2e` | Playwright /portal SSR against real tenant-web | apps/tenant-web only |

## Phase 1: Foundation (PR1)
- [ ] 1.1 RED: packages/database/prisma/__tests__/client-user.test.ts asserts ClientUser table + @@unique([tenantId,email]), FK→Cliente cascade
- [ ] 1.2 GREEN: add ClientUser model to packages/database/prisma/schema.prisma; prisma migrate dev --name add_client_users
- [ ] 1.3 Create docs/adr/NNNN-clientuser-schema.md referencing AGENTS.md rule 8 (blocks PR1 without it)
- [ ] 1.4 RED: packages/shared/src/client-auth/__tests__/schemas.test.ts — ClientLoginSchema, ClientUserResponse, MeResponse parse/reject
- [ ] 1.5 GREEN: create packages/shared/src/client-auth/{index.ts,schemas.ts,dto.ts} Zod schemas; export from packages/shared/src/index.ts
- [ ] 1.6 RED: packages/database/src/__tests__/index.test.ts — createPrismaClient({tenantId,clienteId}) injects where:{clienteId} on Cliente-linked models; single-arg unaffected
- [ ] 1.7 GREEN: widen packages/database/src/index.ts createPrismaClient({tenantId?, clienteId?}); inject clienteId on Cita,Documento-linked models
- [ ] 1.8 REFACTOR: extract shared where-injection helper; one chokepoint

## Phase 2: Backend Modules (PR2)
- [ ] 2.1 RED: apps/api/src/modules/client-auth/client-auth.service.spec.ts — valid→200+__Secure-client-session; wrong pw→401 no cookie; unknown tenant→404 no leak; deactivated→403; passwordHash absent from /me
- [ ] 2.2 GREEN: create apps/api/src/modules/client-auth/{module,service,controller,dto}.ts; bcrypt 12 rounds; Better-Auth JWT claims {sub,clienteId,tenantId,role:'client'}
- [ ] 2.3 RED: client-auth.guard.spec.ts — admin __Secure-session rejected; missing/expired→401; role≠client→403
- [ ] 2.4 GREEN: create apps/api/src/modules/client-auth/client-auth.guard.ts
- [ ] 2.5 RED: apps/api/src/modules/client-user-management/client-user-management.service.spec.ts — create 201+bcrypt+isActive=true; cross-tenant clienteId→403/400; dup email→409; disable→403 next login; reset invalidates prior cookie
- [ ] 2.6 GREEN: create apps/api/src/modules/client-user-management/{module,service,controller,dto}.ts; admin paths select exclude passwordHash
- [ ] 2.7 Modify apps/api/src/app.module.ts register ClientAuthModule + ClientUserManagementModule
- [ ] 2.8 RED: apps/api/src/test/doorbell/client-isolation.e2e-spec.ts — client A cannot read/list/mutate client B's Cita/Documento; client token rejected on admin route; admin token rejected on client route; doorbell fails build on regression
- [ ] 2.9 GREEN: extend doorbell gate real HTTP server

## Phase 3: Shared UI (PR3)
- [ ] 3.1 RED: packages/ui/src/__tests__/primitives.test.tsx — Button/Card/Badge/Layout render; non-exported name fails to compile; props backward-compatible
- [ ] 3.2 GREEN: create packages/ui/{package.json,tsconfig.json,src/{index,button,card,badge,layout}.tsx}; sideEffects:false ESM
- [ ] 3.3 RED: apps/admin-web snapshot test — 4 primitives resolve from @crm-master/ui identical DOM
- [ ] 3.4 GREEN: add @crm-master/ui:workspace:* to admin-web + tenant-web package.json; re-export primitives; remove local copies in apps/admin-web/src/components/{ui,layout}/*

## Phase 4: Frontend Routes (PR4)
- [ ] 4.1 RED: apps/tenant-web/src/middleware.spec.ts — cookie role admin→/admin, client→/portal, missing→/login; Host subdomain→tenantId
- [ ] 4.2 GREEN: create apps/tenant-web/src/middleware.ts
- [ ] 4.3 Move existing admin routes into apps/tenant-web/src/app/(admin)/; URLs unchanged (non-breaking)
- [ ] 4.4 RED: Playwright /login posts admin form→/admin, client form→/portal; /portal SSR returns only session clienteId data
- [ ] 4.5 GREEN: create apps/tenant-web/src/app/login/page.tsx (Admin/Client tabs, two forms — avoids user-enumeration)
- [ ] 4.6 GREEN: create apps/tenant-web/src/app/(client)/layout.tsx + portal/{page,profile,my-appointments,my-documents}/page.tsx (SSR + ClientAuthGuard + clienteId extension)

## Phase 5: Cleanup & Gate
- [ ] 5.1 REFACTOR: dedupe passwordHash exclusion serializer; doorbell regression fails if reintroduced
- [ ] 5.2 Gate client pages behind NEXT_PUBLIC_CLIENT_PORTAL_ENABLED (default off until SPEC-0002 + doorbell pass)
- [ ] 5.3 Update openspec/specs/data-leak-detection/spec.md with ADDED + MODIFIED delta cross-client scenarios
- [ ] 5.4 Verify conventional commits; ADR referenced in ClientUser migration PR description
