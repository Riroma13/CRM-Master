# Tasks: SPEC-0005 — Better-Auth Migration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Schema + backfill → PR 2: Guard + auth → PR 3: Tests + cleanup |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

## Phase 1: Investigación y setup base (PR 1)

- [x] 1.1 Confirmar versión de better-auth (v1.6.23) y zod compatibilidad (v3 OK, better-auth usa su propio zod@4 internamente)
- [x] 1.2 Instalar @better-auth/prisma-adapter
- [x] 1.3 Agregar tablas Better-Auth al schema Prisma (ba_users, ba_sessions, ba_accounts, ba_verifications, ba_organizations, ba_members, ba_invitations)
- [x] 1.4 Crear auth.ts con configuración básica de Better-Auth

## Phase 2: Modelo de datos y linking (PR 1)

- [ ] 2.1 Agregar campo `betterAuthUserId` a `User`, `betterAuthOrganizationId` a `Tenant`
- [ ] 2.2 Crear `auth-client.provider.ts` — factory provider que instancia Better-Auth con PrismaService
- [ ] 2.3 Script de backfill: crear ba_organization por cada Tenant existente
- [ ] 2.4 Script de backfill: crear ba_user + ba_member por cada User existente

## Phase 3: Guard y reemplazo de auth (PR 2)

- [ ] 3.1 Implementar `BetterAuthGuard` (reemplaza AdminAuthGuard) con mismo contrato request.user
- [ ] 3.2 Decidir y documentar manejo de superadmin en rutas /tenant/* (design.md punto 4)
- [ ] 3.3 Actualizar TenantScopeGuard si necesita ajustes
- [ ] 3.4 Eliminar SessionService y AdminAuthGuard viejos SOLO después de que BetterAuthGuard esté verde
- [ ] 3.5 Actualizar AuthService.login() para usar auth.api.signInEmail()
- [ ] 3.6 Registrar BetterAuthGuard como APP_GUARD en app.module.ts

## Phase 4: Tests — red de seguridad (PR 3)

- [ ] 4.1 Actualizar isolation-http.spec.ts: seed ba_organizations + ba_users + ba_members, usar signInEmail real
- [ ] 4.2 Actualizar isolation-gate.spec.ts: extender seed con ba_organizations vinculados
- [ ] 4.3 Correr TODA la suite (pnpm test + jest-e2e --runInBand) y confirmar 0 regresiones
- [ ] 4.4 Agregar test nuevo: login real vía Better-Auth (happy path) para superadmin y tenant-admin

## Phase 5: Cleanup y documentación (PR 3)

- [ ] 5.1 Actualizar STACK.md si algo difiere del plan original
- [ ] 5.2 Documentar en docs/architecture/adr/ la decisión de migración
- [ ] 5.3 Verificar que no queden referencias residuales a SessionService/AdminAuthGuard (grep -rn)
