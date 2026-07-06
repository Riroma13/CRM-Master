# Design: SPEC-0004 — Ficha de Cliente (Mission Control)

## Technical Approach

Extend the existing `ClientsModule` with nested endpoints for eventos and tareas, create two new modules (`EventosModule`, `TareasModule`) for service + controller logic, and build a tabbed detail page at `app/clientes/[id]/` on the frontend. All endpoints reuse `AdminAuthGuard` + `TenantScopeGuard`. No schema changes — all Prisma models exist.

## Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Eventos/Tareas placement | A) Extend ClientsController | B) Separate controllers with nested paths | B — keeps controllers focused; NestJS `@Controller('api/v1/admin/clientes/:clienteId/eventos')` handles nesting natively without ClientsModule coupling |
| GET /:id data payload | A) Cliente-only (like spec example) | B) Include sistemas + items_inventario | B — single fetch supplies Resumen, Sistemas, Inventario tabs; avoids N+1 on page load |
| Service module imports | A) ClientsModule imports EventosModule | B) All modules imported in AppModule | B — simpler DI graph, no forward-refs needed |
| Frontend data fetching | A) SWR/React Query | B) Raw fetch in useEffect | B — matches existing `useClients` pattern; no new deps |

## Data Flow

```
ClientHeader (name, salud, tags, edit button)
     │
     ▼
  page.tsx ──GET /:id──▶ ClientsService.findAndEnrich(id)
     │                      │ prisma.admin.cliente.findUnique({
     │                      │   include: { tenant, sistemas: { include: { items } } }
     │                      │ })
     ├── TabResumen ◄── notasGenerales + sistemas summary
     ├── TabSistemas ◄── sistemas[]
     ├── TabInventario ◄── sistemas[].items[]
     ├── TabBitacora  ──GET /:clienteId/eventos──▶ EventosService
     └── TabTareas    ──GET /:clienteId/tareas ──▶ TareasService
```

POST /:clienteId/eventos → validates `sistemaId` belongs to `clienteId` via Prisma query before inserting.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/modules/eventos/eventos.module.ts` | Create | Module registering EventosService + EventosController |
| `apps/api/src/modules/eventos/eventos.service.ts` | Create | Query eventos_bitacora by clienteId, create with FK validation |
| `apps/api/src/modules/eventos/eventos.controller.ts` | Create | GET/POST nested under `clientes/:clienteId/eventos` |
| `apps/api/src/modules/eventos/dto.ts` | Create | CreateEventoSchema (Zod), EventoListQuery |
| `apps/api/src/modules/tareas/tareas.module.ts` | Create | Module registering TareasService + TareasController |
| `apps/api/src/modules/tareas/tareas.service.ts` | Create | Query tareas by clienteId, create with defaults |
| `apps/api/src/modules/tareas/tareas.controller.ts` | Create | GET/POST nested under `clientes/:clienteId/tareas` |
| `apps/api/src/modules/tareas/dto.ts` | Create | CreateTareaRapidaSchema (Zod), TareaListQuery |
| `apps/api/src/modules/clients/clients.service.ts` | Modify | Refine `findOne()` to include `sistemas.items`; add `findOneOrFail()` throwing NotFoundException |
| `apps/api/src/app.module.ts` | Modify | Import EventosModule, TareasModule |
| `apps/admin-web/src/lib/api-types.ts` | Modify | Add ClienteDetail, SistemaDetail, EventoItem, TareaItem, CreateEventoInput, CreateTareaInput |
| `apps/admin-web/src/app/clientes/[id]/page.tsx` | Create | Main detail page: fetches client, renders header + tabs |
| `apps/admin-web/src/app/clientes/[id]/components/ClientHeader.tsx` | Create | Client name, salud, tags, edit button |
| `apps/admin-web/src/app/clientes/[id]/components/ClientTabs.tsx` | Create | Tab nav with URL persistence (`?tab=`) |
| `apps/admin-web/src/app/clientes/[id]/components/TabResumen.tsx` | Create | Notas generales + systems/inventory/tasks counts |
| `apps/admin-web/src/app/clientes/[id]/components/TabSistemas.tsx` | Create | Systems list with estado, tipo, acceso link |
| `apps/admin-web/src/app/clientes/[id]/components/TabInventario.tsx` | Create | Items grouped by categoria, filterable by estado |
| `apps/admin-web/src/app/clientes/[id]/components/TabBitacora.tsx` | Create | Timeline + fetch from /eventos endpoint |
| `apps/admin-web/src/app/clientes/[id]/components/TabTareas.tsx` | Create | Task list + create button with modal |
| `apps/admin-web/src/app/clientes/[id]/components/EventoForm.tsx` | Create | Modal form: sistema select, tipo, titulo, descripcion |

## Interfaces / Contracts

```ts
// GET /api/v1/admin/clientes/:id response (full detail)
interface ClienteDetail {
  id: string; nombre: string; tipoNegocio: string | null;
  contactoPrincipal: string | null; estadoRelacion: string;
  saludGeneral: string; fechaInicio: string | null;
  notasGenerales: string | null; tags: string[];
  tenant: { id: string; slug: string; name: string };
  sistemas: Array<{
    id: string; nombreSistema: string; tipo: string;
    entorno: string | null; estadoTecnico: string;
    fechaUltimoChequeo: string | null;
    items: Array<{
      id: string; categoria: string; nombre: string;
      estado: string; responsable: string | null;
    }>;
  }>;
  createdAt: string; updatedAt: string;
}
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit — Schemas | Zod validation for CreateEvento/Tarea schemas | Jest: valid/invalid payload assertions |
| Unit — Services | EventosService, TareasService with mocked PrismaService | Jest: verify query filters, FK validation, error paths |
| Integration — API | All 6 endpoints: happy path, 404, 400, pagination | supertest + seeded test DB |
| Security | Tenant admin cannot access `/admin/*` routes | supertest: request admin endpoints with tenant-scoped token → expect 403 |
| Security | Evento creation assigns correct tenant_id | Verify DB row after POST → tenant_id matches cliente's tenant |

## Migration / Rollout

No migration required. All changes are additive — new modules, new route, no DB schema changes.

## Open Questions

- [ ] Should `GET /:id` include eventos and tareas summaries inline, or rely on separate endpoints? **(Resolved: sistemas + items in /:id; eventos/tareas via separate paginated endpoints)**
- [ ] Should `PATCH /:id` enable partial updates for nested fields (tags append vs replace)? **(Resolved: replace semantics, matching Zod `.partial()` on existing schema)**
