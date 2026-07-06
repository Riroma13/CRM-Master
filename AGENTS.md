# AGENTS.md — CRM-Master

## Qué es
CRM-Master es una plataforma SaaS multi-tenant de gestión. Cada cliente
(tenant) tiene su propio portal en `{slug}.crmmaster.com` para gestionar
documentos, citas y otras funcionalidades de su negocio. Ricardo opera una
capa de supervisión interna ("Mission Control") para ver salud, inventario
y bitácora de cada tenant — modelo de datos completo en docs/DESIGN.md.

## Stack
- Monorepo: Turborepo + pnpm
- Backend: NestJS + Prisma + PostgreSQL (multi-tenant row-level, `tenant_id`
 en toda tabla con datos de cliente)
- Colas: BullMQ
- Frontend: Next.js 14 + Tailwind + shadcn/ui
 - `apps/admin-web`: vista de Ricardo (Mission Control)
 - `apps/tenant-web`: vista del cliente (acceso por subdominio)
- Auth: Better-Auth con organizaciones (1 org = 1 tenant)
- Infra: Docker + Caddy, VPS, wildcard TLS `*.crmmaster.com`

## Reglas no negociables
1. **SDD primero**: ninguna feature se implementa sin spec aprobada en
 `docs/specs/`. Usa `docs/specs/TEMPLATE.md` como base.
2. **TDD estricto**: test primero (debe fallar), implementación mínima,
 test pasa, refactor. Nunca código sin test que lo cubra.
3. **Aislamiento de tenant es crítico**: toda query a tablas con datos de
 cliente DEBE pasar por el scoping automático de `tenant_id` (Prisma
 Client Extension central). Nunca queries crudas sin scope explícito.
 Toda spec que toque datos de tenant debe incluir un test de fuga de
 datos entre tenants.
4. **Resolución de tenant**: por header `Host` (subdominio), nunca por
 parámetro de URL adivinable ni por dato del body sin verificar contra
 la sesión autenticada.
5. **Secretos**: nunca loggear ni exponer credenciales, tokens, ni el
 campo `credenciales_ref` en texto plano. Usar variables de entorno o
 gestor de secretos, nunca hardcodear.
6. **Slugs de tenant**: únicos, inmutables una vez creados, validados
 contra lista de reservados (`www`, `api`, `admin`, `app`, etc.) antes
 de permitir el alta.
7. Conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`).
8. Cambios de schema Prisma requieren ADR o referencia a uno existente.

## Comandos
- Instalar: `pnpm install`
- Tests: `pnpm test`
- Lint: `pnpm lint`
- Build: `pnpm turbo build`
- Migración: `pnpm --filter database prisma migrate dev`
- Levantar local: `docker compose up -d`

## Estructura de specs (docs/specs/NNNN-nombre.md)
- Contexto / problema que resuelve
- Contrato (input/output, entidades de datos afectadas)
- Casos de borde
- Criterios de aceptación (testables, no ambiguos)

## Entidades core (detalle completo en docs/DESIGN.md)
Tenant (Cliente) → Sistema(s) → Inventario / Bitácora / Tareas

## Asignación de modelos por tipo de tarea
El modelo a usar depende del tipo de implementación:

| Contexto | Modelo | Razón |
|---|---|---|
| `sdd-apply` código general (CRUD, endpoints, DTOs, servicios estándar) | `deepseek-v4-flash` | Barato, rápido, suficiente |
| `sdd-apply` aislamiento/seguridad (guards, scoping de tenant, auth, permisos, raw SQL, validación de frontera) | `kimi-k2.7-code` o `deepseek-v4-pro` | Precisión crítica, revisión adversarial |
| Conversación, planificación, revisión | `deepseek-v4-flash` | Razonamiento general suficiente |

**Regla**: si el cambio toca `tenant_id`, guards, auth, o validación de frontera entre tenants, usar modelo de precisión. Si es lógica de negocio estándar sin implicación de aislamiento, flash es suficiente.

## Antes de marcar una tarea como hecha
- [ ] Tests pasan (`pnpm test`)
- [ ] Lint limpio (`pnpm lint`)
- [ ] Spec correspondiente actualizada si hubo desviación del plan
- [ ] Si tocó aislamiento de tenant:
