# Proposal: SPEC-0004 — Ficha de Cliente (Mission Control)

## Intent

Ricardo needs to drill from the dashboard into a single client's full detail — systems, inventory, timeline, tasks — and operate (create events, tasks, edit fields). No such view exists today.

## Scope

### In Scope
- 6 API endpoints (GET/PATCH clientes/:id, GET/POST eventos, GET/POST tareas)
- 5 frontend tabs: Resumen, Sistemas, Inventario, Bitácora, Tareas
- URL-based tab persistence (`?tab=resumen`)
- Read/write: edit client fields, create eventos_bitacora, create tareas
- Tests: unit + integration + security (data leak)

### Out of Scope
- Individual sistema detail view (separate route)
- Task Kanban (v1.5), file attachments on events (v2), advanced filters

## Capabilities

### New Capabilities
- `admin-client-detail`: Full client detail API (GET/PATCH `:id` + nested evento/tarea endpoints)
- `admin-client-detail-ui`: Tabbed detail page at `/clientes/[id]/` with 5 tab partials

### Modified Capabilities
- `admin-clients-list`: Update `ClienteCardDto` to include `ultimaActividad` (already present in impl, align spec)
- `admin-dashboard`: Add navigation from client card → detail page (UI-only, no spec change)

## Approach

1. **API**: Extend `ClientsController` with `:id/eventos` and `:id/tareas` routes. New `EventosBitacoraModule` and `TareasModule` — each with service + DTOs. Use existing `AdminAuthGuard` + `TenantScopeGuard`.
2. **Eventos**: Service queries `eventos_bitacora` via admin Prisma client, filtered by `sistema.clienteId = :id`. sistemaId required (schema FK).
3. **Tareas**: Service queries `tareas` via admin Prisma client, filtered by `clienteId = :id`.
4. **Frontend**: New route group `app/clientes/[id]/` with layout + tab components. Client data fetched in page, tabs receive sliced data as props. EventoForm as client component modal.

## Affected Areas

| Area | Impact |
|------|--------|
| `apps/api/src/modules/clients/` | Extend controller + service |
| `apps/api/src/modules/eventos/` | New module |
| `apps/api/src/modules/tareas/` | New module |
| `apps/admin-web/src/app/clientes/[id]/` | New route + 8 components |
| `openspec/specs/admin-clients-list/spec.md` | Minor update to Deuda Técnica |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Evento FK requires sistemaId (non-nullable) | High | CreateEventoSchema validates UUID; UI lets user pick from client's sistemas |
| SPEC-0003 not yet deployed — missing navigation | Medium | Detail page is independently testable via direct URL |
| Tab data volume on Resumen (5 tabs = 5 API calls) | Low | Client can batch or parallel-fetch on mount |

## Rollback Plan

Revert commits for eventos/tareas modules and frontend routes. Restore `clients.controller.ts` to previous state. All changes are additive — no migration rollback needed.

## Dependencies

- SPEC-0003 dashboard (client cards as nav entry point)
- Guards from SPEC-0002 (AdminAuthGuard, TenantScopeGuard)
- Prisma models already exist — no schema changes

## Success Criteria

- [ ] 6 endpoints return correct data + proper error codes
- [ ] 5 tabs render with live API data (not mock)
- [ ] Event creation assigns correct tenant_id via cliente FK chain
- [ ] Cross-tenant leak test: tenant admin cannot read data via `/admin/*`
- [ ] `pnpm test` passes, `pnpm lint` clean
