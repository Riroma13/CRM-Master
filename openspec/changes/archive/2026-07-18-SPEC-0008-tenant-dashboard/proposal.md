# Proposal: SPEC-0008 — Dashboard del Portal del Tenant

## Intent

El admin del tenant no tiene una vista consolidada de su operación al entrar a `/admin`. El sidebar ya lista "Dashboard" pero la página no existe. Se necesita un endpoint `GET /api/v1/tenant/dashboard` con métricas scoped al tenant y una página Next.js que las renderice como KPIs + lista de eventos recientes.

## Scope

### In Scope
- Endpoint `GET /api/v1/tenant/dashboard` con métricas del tenant: total clientes, citas hoy/pendientes/semana, tareas pendientes, sistemas activos, últimos 5 eventos
- Página `apps/tenant-web/src/app/admin/page.tsx` con KPI cards y sección de eventos recientes
- Hook `useDashboard` en `apps/tenant-web/src/lib/hooks.ts`
- Protegido por `BetterAuthGuard` (admin role del tenant)
- Tests unitarios (Jest API) + tests unitarios (Vitest frontend)

### Out of Scope
- Gráficas o charts (v2)
- Exportar datos a CSV/PDF
- Notificaciones en tiempo real (WebSocket)
- Widgets configurables por el tenant
- Métricas cross-tenant (eso ya es `admin-dashboard` del superadmin)

## Capabilities

### New Capabilities
- `tenant-dashboard`: Métricas consolidadas scoped al tenant activo — endpoint API + página de visualización con KPIs y eventos recientes

### Modified Capabilities
- None

## Approach

**Backend**: Nuevo `TenantDashboardController` + `TenantDashboardService` en un módulo `TenantDashboardModule` dentro de `apps/api/src/`. El servicio usa el Prisma client scoped por `tenant_id` (inyectado por la extensión central) para contar clientes, citas, tareas, sistemas y eventos. Sin queries raw, sin bypass del scoping.

**Frontend**: Página server component en `/admin/page.tsx` que llama al endpoint via el API client existente (`apps/tenant-web/src/lib/api.ts`). Reutiliza componentes UI existentes (Card, Badge). Hook `useDashboard` para client-side fetching con estados loading/error/empty.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/modules/tenant-dashboard/` | New | Controller, service, module, DTO de respuesta |
| `apps/tenant-web/src/app/admin/page.tsx` | New | Página dashboard con KPIs + eventos recientes |
| `apps/tenant-web/src/lib/hooks.ts` | Modified | Agregar hook `useDashboard` |
| `apps/tenant-web/src/lib/api.ts` | Modified | Agregar tipo `TenantDashboardResponse` |
| `apps/api/src/app.module.ts` | Modified | Registrar `TenantDashboardModule` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Fuga de datos entre tenants | Low | Prisma extension central scoping automático + doorbell isolation gate test |
| Query lenta con muchos registros | Low | Contadores con `COUNT` + `LIMIT 5` en eventos; índices existentes en `tenant_id` |
| Endpoint expuesto sin auth | Low | `BetterAuthGuard` en el controller; test de auth obligatorio |

## Rollback Plan

Revert de los commits del módulo. La migración es additive (sin cambios de schema Prisma). La página `/admin/page.tsx` se elimina sin afectar otras rutas admin.

## Dependencies

- Extensión Prisma de tenant scoping (ya existe)
- `BetterAuthGuard` (ya existe)
- Middleware de resolución de tenant por subdominio (ya existe)
- Componentes UI: Card, Badge (ya existen en tenant-web)
- API client `apps/tenant-web/src/lib/api.ts` (ya existe)

## Success Criteria

- [ ] `GET /api/v1/tenant/dashboard` retorna 200 con métricas correctas del tenant autenticado
- [ ] `GET /api/v1/tenant/dashboard` retorna 401 sin token y 403 con token de otro tenant
- [ ] Doorbell isolation gate pasa sin fugas de datos entre tenants
- [ ] Página `/admin` renderiza 5 KPI cards con datos reales (no hardcoded)
- [ ] Estados loading, error y empty manejados en el frontend
- [ ] Tests unitarios API: mínimo 5 specs (happy path, auth, isolation, empty, error)
- [ ] Tests unitarios Vitest: mínimo 3 specs (render, loading, error)
- [ ] Lint y TypeScript sin errores
