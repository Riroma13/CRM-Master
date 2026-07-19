# Design: SPEC-0009 — Global Activity Feed (ActivityTimeline)

## Technical Approach

Create an `ActivityTimeline` bounded context that decouples event production from event consumption. Every domain module publishes typed events; the timeline stores them in a dedicated `activity_events` table. Consumers query the timeline through a single `GET /api/v1/timeline` endpoint with filter parameters.

The model is a thin append-only log. Events are immutable once written. No updates, no deletes — only inserts and reads. This guarantees audit integrity and avoids coupling between producers and consumers.

```
[Domain Module] ──publish()──→ [ActivityTimeline Service] ──insert──→ [activity_events]
                                                                          ↓
[Consumer] ──GET /api/v1/timeline──→ [ActivityTimeline Controller] ──query──→ [activity_events]
                                            │
                                     filters: tenantId, clienteId, userId,
                                     sistemaId, incidenciaId, documentoId,
                                     category, severity, dateFrom, dateTo,
                                     sourceModule, entityType
```

## Architecture Decisions

| Decision | Choice | Tradeoff |
|----------|--------|----------|
| Storage model | Dedicated `activity_events` table (not event sourcing, not mixed into domain tables) | + append-only log, + cross-entity queries, + no schema coupling; − eventual consistency if publish fails |
| Event format | JSON column with typed schema envelope | + extensible without migration, + any future event fits; − no FK enforcement on payload fields |
| Publication model | Synchronous `ActivityTimelineService.publish()` called by domain services | + simple, + immediate consistency, + no message broker dependency; − couples domain to timeline (use `@Injectable()` and DI) |
| Query interface | Single endpoint with query-parameter filters | + simple, + cacheable (ETag), − pagination required for large tenants |
| Access control | Scoped by `tenantId` (Prisma extension), optionally by `clienteId` | + reuses existing multi-tenant pattern, + doorbell testable |
| Event identity | Dual: auto-increment `id` (ordering) + optional `eventId` UUID (idempotency) | + `eventId` enables `ON CONFLICT DO NOTHING` for retry safety; − extra `UNIQUE` constraint on `eventId` |
| Retention policy | 12 months online → 12–24 months cold archive → deleted after 24 months | + predictable table size; − cold archive requires separate query path |
| Partitioning | Range partitioning by month on `created_at` (`PARTITION BY RANGE`) | + each partition stays manageable; − requires cron/pg_partman for maintenance |
| Index strategy | Primary key: `(id, created_at)` via partition. Secondary: `(tenantId, created_at DESC)`, `(tenantId, clienteId, created_at DESC)`, `(tenantId, entityType, entityId, created_at DESC)` | + covers all timeline queries with 3 indexes; − no partial indexes on low-selectivity columns |
| Event contract location | `packages/shared/src/activity-timeline/` — single source of truth for both producers and consumers | + zero duplication; + versioned with the package; − producers must depend on `@crm-master/shared` |
| Idempotency | Optional `eventId` UUID → `INSERT ... ON CONFLICT (eventId) DO NOTHING` | + safe retry; − `UNIQUE` index on `eventId` has write overhead |
| OCP compliance | Timeline does not know its producers. Any envelope passing the `EventEnvelope` type is accepted unconditionally. | + truly open; − producers can send invalid `eventType` values (mitigation: runtime validation + registry check) |

## Data Flow

```
POST /api/v1/admin/clientes     POST /api/v1/admin/incidencias     (any domain endpoint)
      │                                │
      ▼                                ▼
ClientsService.create()          IncidenciasService.create()
      │                                │
      ├── domain logic                 ├── domain logic
      ├── prisma.cliente.create()      ├── prisma.incidencia.create()
      └── activityTimeline.publish({   └── activityTimeline.publish({
            eventType: 'cliente.creado',      eventType: 'incidencia.creada',
            tenantId, clienteId,               tenantId, clienteId,
            actor, sourceModule,               actor, sourceModule,
            severity: 'info',                  severity: 'warning',
            payload: { nombre, slug }          payload: { titulo, prioridad }
          })                                    })
                │                                   │
                └───────────┬───────────────────────┘
                            ▼
              ActivityTimelineService.publish()
                            │
                            ▼
              INSERT INTO activity_events
              (tenantId, clienteId?, entityType, entityId,
               eventType, actor, sourceModule, severity,
               category, payload, createdAt)

              ▼
    GET /api/v1/timeline?tenantId=X&clienteId=Y
              │
              ▼
          ┌── Timeline global ─────────────────────────┐
          │  GET /api/v1/timeline?tenantId=X            │
          ├── Timeline por cliente ─────────────────────┤
          │  GET /api/v1/timeline?tenantId=X&clienteId=Y│
          ├── Timeline por usuario ─────────────────────┤
          │  GET /api/v1/timeline?tenantId=X&actor=Z    │
          ├── Timeline por sistema ─────────────────────┤
          │  GET /api/v1/timeline?tenantId=X&entityType=│
          │    sistema&entityId=S                       │
          ├── Timeline por incidencia ──────────────────┤
          │  GET /api/v1/timeline?tenantId=X&entityType=│
          │    incidencia&entityId=I                    │
          └── Timeline por documento ───────────────────┘
             GET /api/v1/timeline?tenantId=X&entityType=
               documento&entityId=D
```

## Working Set

### Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add `ActivityEvent` model |
| 2 | `apps/api/src/modules/activity-timeline/activity-timeline.module.ts` | Create | Module registration |
| 3 | `apps/api/src/modules/activity-timeline/activity-timeline.service.ts` | Create | `publish()` + query methods |
| 4 | `apps/api/src/modules/activity-timeline/activity-timeline.controller.ts` | Create | `GET /api/v1/timeline` |
| 5 | `apps/api/src/modules/activity-timeline/dto.ts` | Create | Event envelope types + filter DTOs |
| 6 | `apps/api/src/modules/activity-timeline/event-types.ts` | Create | Typed event type registry (extensible) |

### Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 7 | `apps/api/src/modules/core/core.module.ts` | Modify | Import `ActivityTimelineModule` |
| 8 | `apps/api/src/modules/clients/clients.service.ts` | Modify | Publish `cliente.creado`, `cliente.actualizado` |
| 9 | `apps/api/src/modules/eventos/eventos.service.ts` | Modify | Publish `evento.creado` |
| 10 | `apps/api/src/modules/sistemas/sistemas.service.ts` | Modify | Publish `sistema.añadido`, `sistema.modificado` |
| 11 | `apps/api/src/modules/documentos/documentos.service.ts` | Modify | Publish `documento.generado`, `documento.firmado` |
| 12 | `apps/api/src/modules/presupuestos/presupuestos.service.ts` | Modify | Publish `presupuesto.enviado`, `presupuesto.aceptado` |
| 13 | `apps/api/src/modules/incidencias/incidencias.service.ts` | Modify | Publish `incidencia.creada`, `incidencia.resuelta` |
| 14 | `apps/api/src/modules/pagos/pagos.service.ts` | Modify | Publish `pago.recibido` |
| 15 | `apps/api/src/modules/automations/automations.service.ts` | Modify | Publish `automatizacion.ejecutada` |
| 16 | `apps/api/src/modules/email/email.service.ts` | Modify | Publish `email.enviado` |
| 17 | `apps/api/src/modules/auth/auth.service.ts` | Modify | Publish `login.realizado`, `password.cambiado` |
| 18 | `apps/api/src/modules/citas/citas.service.ts` | Modify | Publish `reserva.creada` |
| 19 | `apps/api/src/modules/encuestas/encuestas.service.ts` | Modify | Publish `encuesta.respondida` |
| 20 | `apps/api/src/modules/client-auth/client-auth.service.ts` | Modify | Publish `usuario.registrado` |

### Tests

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Service | `publish()` stores correct envelope, filters work, pagination | Jest + mocked Prisma |
| Unit — Event types | Schema validation for every known `eventType` | Zod parse/reject |
| Integration — API | `GET /api/v1/timeline` with each filter combination | supertest |
| Doorbell | Tenant A cannot see Tenant B's events | Prisma scoping + E2E |
| Doorbell | Cross-client isolation within same tenant | clienteId filter test |

### Configuration

- None (uses existing `DATABASE_URL`, no new env vars)
- New migration: `prisma migrate dev --name add_activity_events`

### Expected NOT to Change

- `apps/api/src/app.module.ts` — `ActivityTimelineModule` goes through `CoreModule`
- `apps/api/src/modules/tenant/` — no tenant-specific changes
- `apps/tenant-web/` — frontend is a separate PR
- Existing `EventoBitacora` model and service — the new timeline supplements, not replaces it
- Existing `AuditModule` — different concern (security audit vs functional activity)

## Read Order

1. `packages/database/prisma/schema.prisma` — understand existing models and naming conventions
2. `apps/api/src/modules/activity-timeline/dto.ts` (first draft) — define envelope before implementing
3. `apps/api/src/modules/activity-timeline/event-types.ts` (first draft) — register known event types
4. `apps/api/src/modules/activity-timeline/activity-timeline.service.ts` — core `publish()` + query methods
5. `apps/api/src/modules/activity-timeline/activity-timeline.controller.ts` — filters and pagination
6. `apps/api/src/modules/activity-timeline/activity-timeline.module.ts` — wire it
7. One domain service (e.g. `clients.service.ts`) — add `publish()` call as pattern reference
8. Remaining domain services — add `publish()` calls following the same pattern

## Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_activity_events
pnpm --filter api test -- activity-timeline
pnpm --filter api test:e2e -- timeline
pnpm --filter api lint
pnpm turbo build --filter=api
```

## Design Confidence

**High** for the timeline storage and query layer — it is a well-understood CRUD pattern on an append-only log with Prisma. **High** for the event publication pattern — each domain service adds a single `activityTimeline.publish()` call with no state changes. **Medium** for the complete list of event types — some domain modules may have additional events not covered in this design (e.g. sub-resource creation). Mitigation: the event type registry is extensible; new types are added without schema changes.

## Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 5 | Schema pattern, domain service patterns, doorbell patterns |
| Files to read | 12 | Schema + 1 domain module to establish pattern + remaining domain modules (glance) |
| Files to create | 4 | Module, service, controller, DTO |
| Files to modify | 14 | Schema + core.module.ts + 12 domain services to add publish() calls |
| New DB migration | 1 | `add_activity_events` |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Event publication fails silently | Baja | `publish()` wraps Prisma in try/catch, logs warning, never fails the domain operation |
| Table grows too large | Media | Index on `(tenantId, createdAt DESC)` covers 90% of queries; consider TTL archival after 90 days in v2 |
| Event type naming inconsistency | Media | `event-types.ts` registry enforces dot-notation convention (`modulo.accion`) with Zod enum |
| Domain teams forget to publish | Baja | All new module templates should include the publish() call; verify phase checks coverage |
| Event payload leaks PII | Media | `payload` is JSON typed per event type; review each publish() call during code review |

## Estrategia de Testing

| Capa | Cobertura | Método |
|------|-----------|--------|
| Unit — Service | `publish()` creates correct row, filters return correct events, pagination works | Jest + mocked `PrismaService.$transaction` |
| Unit — Event Types | Zod schema validates every registered event type with valid + invalid payloads | Jest parameterized |
| Integration — API | Every filter parameter tested individually and in combination | supertest + seed DB |
| Doorbell — Cross-tenant | Tenant A's events invisible to Tenant B | E2E with 2 tenants |
| Doorbell — Cross-client | Cliente A's events invisible to Cliente B within same tenant | E2E with 2 clientes |
| Regression — Known events | All 20+ event types from the registry are covered by at least one integration test | CI gate |

## Doorbell Tests

| Test | What it proves |
|------|---------------|
| `timeline-cross-tenant-isolation.spec.ts` | Tenant A's timeline does not include Tenant B's events |
| `timeline-cross-client-isolation.spec.ts` | Cliente A's events do not appear when filtering by Cliente B |

Both follow the existing doorbell pattern (`apps/api/test/doorbell/`).

## ADR necesarios

| ADR | Reason |
|-----|--------|
| ADR-0005 | Document the ActivityTimeline bounded context decision, storage model choice, and event type naming convention. Required by AGENTS.md rule 8 (schema change). |

## Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `ActivityTimelineService.publish()` | ActivityTimeline | The only way to write to the timeline |
| `GET /api/v1/timeline` | ActivityTimeline | The only way to read from the timeline |
| `event-types.ts` | ActivityTimeline | The only registry of valid event types |
| `activity_events` table | ActivityTimeline | Single source of truth for the timeline |
| Domain services | Domain modules | Call `publish()` but never query the timeline directly |

No domain module imports `ActivityTimelineService` — wait, they DO import it to call `publish()`. This is a unidirectional dependency: domain → timeline. The timeline never imports domain modules.

## Extensibilidad futura

| Feature | How it fits | Effort |
|---------|-------------|--------|
| New event type | Add entry to `event-types.ts` + call `publish()` in domain service | Minutes |
| New filter parameter | Add optional query param to `dto.ts` + `WHERE` clause in service | Minutes |
| Real-time (WebSocket) | Subscribe to `activity_events` via PostgreSQL `LISTEN/NOTIFY` or a trigger | Days |
| Event archival (TTL) | Cron job or scheduled task to move events older than N days to a cold table | Days |
| Cross-tenant analytics | Separate pipeline reads events into a warehouse (out of scope for v1) | Weeks |
| Activity aggregation | Materialized view grouping events by hour/day for trend charts | Days |
| Undo/revert from event | Each event carries `entityType` + `entityId` + optional `previousState` | Weeks |
| Frontend timeline UI | Separate PR consuming `GET /api/v1/timeline` with infinite scroll | Days |

## Interfaces / Contracts

```typescript
// ─── Event Envelope ────────────────────────────────────

interface ActivityEvent {
  id: number;                       // auto-increment, append-only order
  tenantId: string;
  clienteId?: string;
  entityType: string;               // 'cliente' | 'sistema' | 'documento' | 'incidencia' | ...
  entityId?: string;                // UUID of the entity
  eventType: string;                // 'cliente.creado' | 'incidencia.resuelta' | ...
  actor: string;                    // email or system identifier
  sourceModule: string;             // 'clientes' | 'incidencias' | 'documentos' | ...
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;                 // 'crm' | 'scheduling' | 'communication' | 'automation' | 'auth'
  payload: Record<string, unknown>; // event-specific data
  createdAt: Date;
}

// ─── Query Filters ───────────────────────────────────

interface TimelineQuery {
  tenantId: string;                  // required (from guard/scope)
  clienteId?: string;
  entityType?: string;
  entityId?: string;
  actor?: string;
  sourceModule?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  category?: string;
  eventType?: string;
  dateFrom?: string;                 // ISO
  dateTo?: string;                   // ISO
  page?: number;                     // default 1
  limit?: number;                    // default 50, max 100
}
```

```prisma
// ─── Prisma Model ─────────────────────────────────────

model ActivityEvent {
  id           Int      @id @default(autoincrement())
  tenantId     String   @map("tenant_id")
  clienteId    String?  @map("cliente_id")
  entityType   String   @map("entity_type")
  entityId     String?  @map("entity_id")
  eventType    String   @map("event_type")
  actor        String
  sourceModule String   @map("source_module")
  severity     String   @default("info")
  category     String
  payload      Json     @default("{}")
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([tenantId, createdAt(sort: Desc)], map: "timeline_tenant_created")
  @@index([tenantId, clienteId, createdAt(sort: Desc)], map: "timeline_cliente")
  @@index([tenantId, entityType, entityId, createdAt(sort: Desc)], map: "timeline_entity")
  @@index([tenantId, eventType, createdAt(sort: Desc)], map: "timeline_event_type")
  @@index([tenantId, sourceModule, createdAt(sort: Desc)], map: "timeline_source_module")
  @@index([tenantId, severity, createdAt(sort: Desc)], map: "timeline_severity")
  @@map("activity_events")
}
```

## Publisher Pattern (example)

Every domain service that creates a notable event adds a single `publish()` call:

```typescript
// Before: clients.service.ts — create()
const cliente = await this.prisma.admin.cliente.create({ data: dto });

// After: clients.service.ts — create()
const cliente = await this.prisma.admin.cliente.create({ data: dto });
await this.activityTimeline.publish({
  eventType: 'cliente.creado',
  tenantId: tenantId,
  clienteId: cliente.id,
  entityType: 'cliente',
  entityId: cliente.id,
  actor: dto.createdBy ?? 'system',
  sourceModule: 'clientes',
  severity: 'info',
  category: 'crm',
  payload: { nombre: cliente.nombre, slug: cliente.slug },
});
```

The `publish()` call is always after the domain operation succeeds, always non-blocking (try/catch with log), and never modifies the domain operation's result.

## Migration / Rollout

1. Create migration: `prisma migrate dev --name add_activity_events`
2. Deploy `ActivityTimelineModule` + schema (no domain changes)
3. Add `publish()` calls to domain services one module at a time — each is additive and independently deployable
4. No downtime. Rollback = revert commits; data in `activity_events` is append-only, no destructive rollback needed.

## Design Review Outcomes

| Pregunta | Respuesta | Documentado en |
|----------|-----------|----------------|
| ¿Patrón Publisher/Event Bus? | ✅ Sí. ARQ-0005 documenta el patrón completo. Contrato compartido en `packages/shared/`. | ADR-0005 |
| ¿Particionado/índices? | ✅ Partición por rango mensual en `created_at`. 3 índices compuestos: `(tenantId, created_at)`, `(tenantId, clienteId, created_at)`, `(tenantId, entityType, entityId, created_at)`. | §Architecture Decisions (nueva fila) |
| ¿Quién publica y quién no? | ✅ Solo operaciones con significado de negocio (creación, cambio de estado, acción de usuario, interacción). NO publican lecturas, cambios internos, ni operaciones batch. | ADR-0005 §Decisión |
| ¿Política de retención? | ✅ 12 meses online → 12-24 cold archive → eliminado tras 24 meses. | §Architecture Decisions (nueva fila) |
| ¿OCP para nuevos publishers? | ✅ Sí. El timeline acepta cualquier `envelope` que cumpla el contrato. No conoce sus productores. Añadir publisher = solo llamar a `publish()`. | ADR-0005 §Open/Closed Principle |
| ¿Idempotencia? | ✅ `eventId` UUID opcional → `ON CONFLICT DO NOTHING`. Doble publicación con mismo `eventId` es ignorada silenciosamente. | §Architecture Decisions (nueva fila) |
| ¿Contrato compartido? | ✅ `packages/shared/src/activity-timeline/event-envelope.ts` es la ÚNICA fuente de tipos para productores y consumidores. | ADR-0005 §Contrato del evento |

## Open Questions

- [ ] Should `publish()` be async (fire-and-forget) or synchronous? **Resolved: synchronous** — simpler, consistent, and the Prisma insert is fast (<5ms). Async adds complexity without demonstrated need.
- [ ] Do we need an `updatedAt` on `ActivityEvent`? **Resolved: No** — events are immutable. `createdAt` is sufficient.
- [ ] Should events be soft-deletable? **Resolved: No** — audit integrity requires immutability. If an event was published in error, a compensating event (e.g. `cliente.creado.reverted`) should be published instead.
- [ ] TTL for old events? **Resolved: 12 months online, 12-24 cold archive, deleted after 24 months** — see Architecture Decisions retention policy row.
