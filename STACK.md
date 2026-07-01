# CRM-Master — Stack Confirmado

> Fecha: 2026-06-30
> Fuente: Ricardo

| Capa | Elección |
|---|---|
| Monorepo | Turborepo + pnpm |
| Backend | NestJS + Prisma + PostgreSQL (row-level multi-tenant) |
| Colas | BullMQ |
| Frontend | Next.js 14 + Tailwind + shadcn/ui |
| Auth | Better-Auth (organizaciones = tenants) |
| Validación / tipos | Zod |
| Infra | Docker + Caddy, mismo VPS |

## Notas

- Multi-tenancy row-level con `tenant_id` en todas las tablas de negocio.
- SDD estricto: ninguna feature sin spec en `docs/specs/`.
- TDD obligatorio: test → falla → implementa → pasa → refactoriza.
- `apps/admin-web` = Mission Control (vista del operador).
- `apps/tenant-web` = portal del cliente.
- Convencional commits, cobertura mínima 80%.
