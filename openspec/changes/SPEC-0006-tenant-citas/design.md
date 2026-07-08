# Design: SPEC-0006 — Tenant Citas/Calendario

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CalendarProvider | Abstract interface + LocalCalendarProvider | Permite migrar a cal.com en v2 sin reescribir |
| Booking validation | Prisma $transaction | Prevención de doble reserva atómica |
| Slot generation | En memoria desde Disponibilidad | Sin dependencias externas, rápido |
| Tenant isolation | tenant_id en Cita y Disponibilidad | Mismo patrón que el resto del sistema |
| Auth | Público (slots, booking) + BetterAuthGuard (admin) | Coherente con Better-Auth migration |

## File Changes

| File | Action |
|------|--------|
| `packages/database/prisma/schema.prisma` | Modify — add Disponibilidad + Cita models |
| `apps/api/src/modules/citas/calendar-provider.interface.ts` | Create |
| `apps/api/src/modules/citas/local-calendar-provider.ts` | Create |
| `apps/api/src/modules/citas/disponibilidad.service.ts` | Create |
| `apps/api/src/modules/citas/citas.service.ts` | Create |
| `apps/api/src/modules/citas/citas.controller.ts` | Create |
| `apps/api/src/modules/citas/citas.module.ts` | Create |
| `apps/api/src/modules/citas/dto.ts` | Create |
| `apps/api/src/app.module.ts` | Modify — import CitasModule |
| `apps/tenant-web/src/app/calendario/page.tsx` | Create |
| `apps/tenant-web/src/app/calendario/components/*.tsx` | Create (4 components) |
| `apps/tenant-web/src/app/admin/calendario/page.tsx` | Create |
| `apps/tenant-web/src/app/admin/calendario/components/*.tsx` | Create (3 components) |
| `apps/tenant-web/e2e/booking.spec.ts` | Create (Playwright tests) |
