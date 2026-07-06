# Tasks: SPEC-0004 — Ficha de Cliente

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1100 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Backend → PR 2: Frontend → PR 3: Tests |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main (from config) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base | Notes |
|------|------|-----------|------|-------|
| 1 | Backend: EventosModule + TareasModule + ClientsService extend (~400 lines) | PR 1 | `feat/SPEC-0004-ficha-cliente` | Tracker branch |
| 2 | Frontend: types + page + 8 components (~500 lines) | PR 2 | PR 1 branch | Depends on backend types |
| 3 | Tests: backend integration + security + frontend (~300 lines) | PR 3 | PR 2 branch | Depends on all code ready |

## Phase 1: Foundation — DTOs / Types

- [x] 1.1 Create `eventos/dto.ts`: CreateEventoSchema (Zod), EventoListQuery
- [x] 1.2 Create `tareas/dto.ts`: CreateTareaRapidaSchema (Zod), TareaListQuery
- [x] 1.3 Extend `api-types.ts`: ClienteDetail, SistemaDetail, EventoItem, TareaItem, CreateEventoInput, CreateTareaInput

## Phase 2: Backend — EventosModule + TareasModule

- [x] 2.1 Create `eventos/eventos.module.ts`
- [x] 2.2 Create `eventos/eventos.service.ts`: query by clienteId, FK validation (sistemaId belongs to cliente)
- [x] 2.3 Create `eventos/eventos.controller.ts`: GET/POST under /clientes/:clienteId/eventos
- [x] 2.4 Create `tareas/tareas.module.ts`
- [x] 2.5 Create `tareas/tareas.service.ts`: query by clienteId, create with defaults
- [x] 2.6 Create `tareas/tareas.controller.ts`: GET/POST under /clientes/:clienteId/tareas
- [x] 2.7 Modify `clients.service.ts`: findOne() include sistemas.items, add findOneOrFail()
- [x] 2.8 Modify `app.module.ts`: import EventosModule, TareasModule

## Phase 3: Frontend — Page + Components

- [ ] 3.1 Create `app/clientes/[id]/page.tsx`: fetch client, render header + tabs
- [ ] 3.2 Create `components/ClientHeader.tsx`: name, salud, tags, edit
- [ ] 3.3 Create `components/ClientTabs.tsx`: tab nav with ?tab= persistence
- [ ] 3.4 Create `components/TabResumen.tsx`: notas + últimos eventos + indicadores
- [ ] 3.5 Create `components/TabSistemas.tsx`: sistemas list with estado, tipo, acceso link
- [ ] 3.6 Create `components/TabInventario.tsx`: items grouped by categoria, filter by estado
- [ ] 3.7 Create `components/TabBitacora.tsx`: vertical timeline, fetch from /eventos
- [ ] 3.8 Create `components/TabTareas.tsx`: task list + create button
- [ ] 3.9 Create `components/EventoForm.tsx`: modal form with sistema select, tipo, titulo, descripcion

## Phase 4: Tests — Backend

- [ ] 4.1 Unit: Zod schema validation (partial update, empty title reject, default priority)
- [ ] 4.2 Unit: EventosService + TareasService mocked (query filters, FK validation, errors)
- [ ] 4.3 Integration: GET /:id (200 + datos, 404), PATCH /:id (200 + updated, 404)
- [ ] 4.4 Integration: GET/POST /:id/eventos (200 paginated, 201 created, 400 invalid)
- [ ] 4.5 Integration: GET/POST /:id/tareas (200 filtered, 201 created, 400 invalid)
- [ ] 4.6 Security: tenant admin 403 on all endpoints, evento tenant_id matches cliente tenant

## Phase 5: Tests — Frontend

- [ ] 5.1 Component: loading/error/empty/data states for each component
- [ ] 5.2 Component: EventoForm modal lifecycle (open, submit valid/invalid, close)
- [ ] 5.3 Integration: full page render with mocked fetch, tab switching, event creation flow
