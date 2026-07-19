# Proposal: SPEC-0006 — Tenant Citas/Calendario

## Intent

Permitir que los clientes finales de los tenants agenden citas a través del
portal (tenant-web), con selección de fecha/hora, confirmación automática y
gestión de disponibilidad por parte del admin del tenant.

## Scope

### In Scope
- Modelos Prisma: `Disponibilidad` + `Cita`
- Interfaz `CalendarProvider` + implementación `LocalCalendarProvider`
- 6 endpoints: slots (público), booking (público), CRUD citas (admin), CRUD disponibilidad (admin)
- Slots configurables por tenant, prevención de doble reserva, fechas bloqueadas
- UI tenant-web: calendario público + panel admin
- Playwright E2E tests (primer spec con browser E2E)

### Out of Scope
- Recordatorios BullMQ (spec separada), Google Calendar (v2), videollamadas (v2)
- Zona horaria automática, recurrencia avanzada, cancelaciones con motivo

## Approach
Motor propio sobre PostgreSQL con interfaz abstracta `CalendarProvider`.
Patrón `tenant_id` igual que el resto del sistema. Booking con transacción
para prevenir doble reserva. Slots generados desde configuración de
disponibilidad.

## Risks
| Risk | Mitigation |
|------|------------|
| Doble reserva por concurrencia | Transacción Prisma + validación dentro de $transaction |
| Slots mal calculados (timezone, DST) | Tests de unidad extensivos en generación de slots |

## Rollback
Revert commits del módulo citas. Migración Prisma hacia adelante (additive).
