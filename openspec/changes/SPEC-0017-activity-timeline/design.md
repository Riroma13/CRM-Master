# Design Refinement: SPEC-0017 — Activity Timeline

> **Version template:** 1.0 (Refined per Architecture Review)
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Platform Baseline:** sdd-v2.1-baseline
> **Estado:** Approved (pending Architecture Review sign-off)
> **Reference:** Architecture Review `architecture-review.md` — Verdict REJECTED → Refined per 6 conditions

---

## 1. Executive Summary

CRM-Master ya dispone de un módulo `activity-timeline` con modelo Prisma `ActivityEvent`, controller en `GET /api/v1/timeline`, servicio `publish()` síncrono, contratos compartidos en `packages/shared/src/activity-timeline/`, y 12+ módulos consumidores que inyectan `ActivityTimelineService` y llaman `this.activityTimeline.publish(envelope)`.

El módulo actual es funcional pero carece de: (a) ingestion asíncrona, (b) deduplicación por `eventId`, (c) enriquecimiento post-persistencia, (d) búsqueda full-text, (e) paginación por cursor, (f) registro gobernado de tipos de evento, y (g) visibilidad granular por evento.

Este diseño **evoluciona** el módulo existente — no lo reemplaza. Mantiene el nombre `activity-timeline`, la misma tabla `activity_events`, el mismo path `/api/v1/timeline`, y compatibilidad backward para los 12+ consumidores actuales. Todos los cambios son aditivos: nuevas columnas, nuevo path async, nuevos endpoints; cero cambios breaking sobre el schema o contratos existentes.

---

## 2. Technical Approach

Se añaden tres paths paralelos sobre el módulo existente:

1. **Sync publish (existente)** — `publish()` se mantiene idéntico en firma y comportamiento. Internamente encola en BullMQ y retorna inmediatamente. Los 12+ callers no cambian.

2. **Async ingestion (nuevo)** — BullMQ worker recibe eventos de la cola `activity-timeline:ingestion`, los valida, deduplica por `eventId`, persiste en `activity_events`. Eventos inválidos van a DLQ.

3. **Event enrichment (nuevo)** — Pipeline de middleware post-persistencia que enriquece eventos con datos contextuales (nombre de entidad, nombre de actor legible). No bloquea la ingestion. Los enriquecedores son plugables via `EventEnricher` interface.

4. **Timeline query (extendido)** — El endpoint existente `GET /api/v1/timeline` sigue funcionando con page-based pagination como antes. Se añade `GET /api/v1/timeline/search` con cursor-based pagination y full-text search. Ambos endpoints pasan por el mismo scoping de tenant.

```
┌─────────────────────────────────────────────────────────┐
│                   Existing Callers (12+)                 │
│  auth, client-auth, clients, citas, documentos, ...      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  publish(envelope) — existing method, UNCHANGED signature │
│  (internally: enqueue to BullMQ, return immediately)      │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│              BullMQ: activity-timeline:ingestion          │
├──────────────────────────────────────────────────────────┤
│  [Validate schema] ──→ DLQ (if invalid)                  │
│  [Deduplicate by eventId]                                │
│  [Persist] ──→ activity_events (append-only)             │
│  [Enrich] ──→ EventEnricher pipeline (post-persistence)  │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│              Timeline Query Layer                         │
│  GET /api/v1/timeline         (page-based, backward-compat)│
│  GET /api/v1/timeline/search  (cursor-based, full-text)   │
│  Both scoped by forTenant()                                │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Module identity | Rename to `activity`, Keep `activity-timeline` | **Keep `activity-timeline`** | Condición #1 del AR. No romper 12+ consumidores. El nombre es un detalle de implementación. |
| Event storage | Relational (append-only), Event store, Document DB | **Relational append-only (PostgreSQL) — misma tabla `activity_events`** | Evolución, no reemplazo. Misma base que el resto del plataforma. Sin nuevas dependencias externas. |
| Ingestion | Síncrono (current), Asíncrono (BullMQ), Híbrido | **Híbrido: sync publish() wrapper → BullMQ async** | Condición #6 del AR. Los 12+ callers no cambian. El wrapper encola y retorna. BullMQ worker persiste. |
| ID strategy | `Int @id` (current), `String @id` (UUID), `Int + UUID` | **Keep `Int @id @default(autoincrement())` + ADD `eventId String @unique`** | Condición #2 del AR. Sin breaking change. `eventId` para dedup externo, `id` para clustering interno. |
| Deduplication | eventId unique, IdempotencyKey, Haystack | **eventId unique constraint** | `eventId` es único global. `ON CONFLICT (event_id) DO NOTHING` para idempotencia. |
| Event ordering | Por `createdAt` (current), Por `occurredAt`, Por correlationId chain | **Por `createdAt` descendente (default), `correlationId` + `causationId` para árbol causal** | `createdAt` mantiene compatibilidad con API existente. `correlationId` + `causationId` son nuevos campos opcionales. |
| Pagination | Page-based (current), Cursor-based, Ambos | **Ambos: page-based default, cursor-based opt-in** | Page-based mantiene backward compat. Cursor-based es nuevo parámetro opcional para clients que necesiten consistencia. |
| Visibility | None (current), Column-level, Row-level | **Columna `visibility` + query filter** | Cada evento tiene nivel de visibilidad. El API filtra por rol del solicitante. |
| Search | None (current), PostgreSQL full-text (GIN), Elasticsearch | **PostgreSQL GIN index en `searchVector` + plan deferred para Elasticsearch** | Condición #5 del AR. GIN index para MVP. Elasticsearch como extensión futura sin cambiar queries. |
| Enrichment | None (current), Inline en ingestion, Post-persistence | **Post-persistence (EventEnricher pipeline)** | Condición #3 del AR. El evento crudo se persiste primero. Luego se enriquece asíncronamente. El enrichment es opcional y no bloquea. |
| Event type governance | Zod enum estricto (current), Open string, Registry pattern | **Registry pattern: `EventTypeRegistry` con ownership por módulo** | Condición #4 del AR. Zod enum se mantiene como validación base. Registry añade registro explícito con metadata de ownership. |
| Tenant scoping | Manual `WHERE tenantId = ?` en cada query (current), Prisma Client Extension `forTenant()` | **`forTenant()` de la Prisma Client Extension central** | Condición #3 del AR. El scoping automático vive en la extensión central. El servicio de timeline usa `this.prisma.withTenant(tenantId).activityEvent.findMany()`. |

---

## 4. Data Flow

```
Sync publish (existing callers, unchanged signature):

Module → activityTimelineService.publish(envelope)
       │
       ├── Validate envelope (Zod — existing ActivityEventEnvelopeSchema)
       │     ├── INVALID → log warning, return (same as current behavior)
       │     └── VALID → continue
       │
       ├── Enqueue to BullMQ queue "activity-timeline:ingestion"
       │     └── Return void (existing callers don't await persistence)
       │
       └── (The old direct DB write path is removed; all writes go through queue)

Async ingestion (BullMQ worker — new):

BullMQ worker picks up event from "activity-timeline:ingestion"
       │
       ├── Validate envelope (re-validate for safety)
       │     ├── INVALID → DLQ, log error
       │     └── VALID → continue
       │
       ├── Deduplicate: INSERT INTO activity_events ... ON CONFLICT (event_id) DO NOTHING
       │     ├── DUPLICATE → ack, no-op
       │     └── NEW → continue
       │
       ├── Run EventEnricher pipeline (async, non-blocking, post-persistence)
       │     ├── Enricher A: resolve entity name → populate subjectName
       │     ├── Enricher B: resolve actor display name → populate actorName
       │     └── ...
       │
       └── Update searchVector (GIN tsvector) — triggered by DB trigger or app-level

Query timeline (backward compatible — existing endpoint unchanged):

Client → GET /api/v1/timeline?tenantId=xxx&page=1&limit=50
       │
       └── Same behavior as current: page-based pagination, filters by tenantId mandatory
           Internally uses forTenant() scoping via Prisma Client Extension

Query timeline search (new endpoint):

Client → GET /api/v1/timeline/search?q=factura&cursor=xxx
       │
       ├── Filter by tenantId via forTenant() (mandatory, automatic)
       ├── Full-text search on searchVector (ts_query)
       ├── Apply cursor-based pagination (by id + createdAt)
       ├── Enrich response with subjectName, actorName (if enriched)
       └── Return paginated results with nextCursor
```

---

## 5. Working Set

### 5.1 Primary Files (evolution of existing module)

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify (additive) | ADD columns: `eventId`, `correlationId`, `causationId`, `visibility`, `subjectName`, `actorName`, `searchVector`, `enriched`, `enrichedAt`. ADD GIN index. Keep existing columns + indexes intact. |
| 2 | `packages/shared/src/activity-timeline/event-envelope.ts` | Modify (extend) | ADD fields: `eventId`, `correlationId`, `causationId`, `visibility`. Keep existing fields unchanged. |
| 3 | `packages/shared/src/activity-timeline/index.ts` | Modify | ADD exports for new contracts. |
| 4 | `packages/shared/src/activity-timeline/event-enricher.ts` | Create | `EventEnricher` interface + `EnricherRegistry`. |
| 5 | `packages/shared/src/activity-timeline/event-type-registry.ts` | Create | `EventTypeRegistry` with module ownership metadata. |
| 6 | `apps/api/src/modules/activity-timeline/activity-timeline.service.ts` | Modify | Keep existing `publish()` signature. Change implementation to enqueue to BullMQ. Add `getTimelineSearch()` for cursor-based + full-text. |
| 7 | `apps/api/src/modules/activity-timeline/activity-timeline.controller.ts` | Modify | ADD endpoint `GET /api/v1/timeline/search`. Keep existing `GET /api/v1/timeline` unchanged. |
| 8 | `apps/api/src/modules/activity-timeline/activity-timeline.module.ts` | Modify | ADD BullMQ worker, EnricherRegistry provider, EventTypeRegistry provider. |
| 9 | `apps/api/src/modules/activity-timeline/dto.ts` | Modify | Extend `TimelineQuerySchema` with cursor params. ADD `SearchQuerySchema`. Keep existing `PaginatedResult`. |
| 10 | `apps/api/src/modules/activity-timeline/activity-timeline.worker.ts` | Create | BullMQ worker for async ingestion. |
| 11 | `apps/api/src/modules/activity-timeline/activity-timeline.gateway.ts` | Create | (Optional) WebSocket gateway for real-time event push. |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 12 | `apps/api/src/modules/activity-timeline/enrichment/entity-name-enricher.ts` | Create | Default enricher: resolve entity name from entityType + entityId. |
| 13 | `apps/api/src/modules/activity-timeline/enrichment/actor-name-enricher.ts` | Create | Default enricher: resolve actor display name. |
| 14 | `apps/api/src/modules/core/core.module.ts` | No change | ActivityTimelineModule ya está importado. |

### 5.3 Expected NOT to Change

- Los 12+ módulos consumidores (auth, client-auth, clients, citas, documentos, eventos, notifications, tenant-automations, tenant-incidencias, tenant-pagos, tenant-presupuestos, tenant-sistemas) — NO cambian su código. Siguen inyectando `ActivityTimelineService` y llamando `publish()`.
- Frontend — SPEC separada.
- Proveedores externos — el timeline no los toca.

---

## 6. Read Order

1. `packages/shared/src/activity-timeline/event-envelope.ts` — contrato base actual
2. `packages/shared/src/activity-timeline/event-types.ts` — tipos de evento actuales
3. `packages/shared/src/activity-timeline/index.ts` — exports actuales
4. `apps/api/src/modules/activity-timeline/dto.ts` — DTOs actuales
5. `apps/api/src/modules/activity-timeline/activity-timeline.service.ts` — servicio actual
6. `apps/api/src/modules/activity-timeline/activity-timeline.controller.ts` — controller actual
7. `apps/api/src/modules/activity-timeline/activity-timeline.module.ts` — módulo actual
8. `packages/database/prisma/schema.prisma` — modelo `ActivityEvent` actual (~line 565)
9. `packages/shared/src/activity-timeline/event-enricher.ts` — nueva interface (crear)
10. `packages/shared/src/activity-timeline/event-type-registry.ts` — nuevo registro (crear)
11. `apps/api/src/modules/activity-timeline/activity-timeline.worker.ts` — nueva worker (crear)

---

## 7. Expected Commands

```bash
# Additive migration: new columns only, no drops
pnpm --filter database prisma migrate dev --name add_activity_timeline_fields
pnpm --filter database generate

# Verify no existing tests break
pnpm --filter api test activity-timeline
pnpm test

# Build
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** High

El diseño es evolutivo, no sustitutivo. Todos los cambios son aditivos:
- Schema: nuevas columnas opcionales, nuevas columnas con defaults. Cero cambios en columnas existentes.
- API: nuevo endpoint `/search`. Endpoint existente `/timeline` sin cambios de firma ni comportamiento.
- Contratos: Zod schema extendido con campos opcionales. Schemas existentes siguen válidos.
- Servicio: `publish()` mantiene firma `(envelope: ActivityEventEnvelope): Promise<void>`. Implementación cambia a encolar en BullMQ.
- 12+ consumidores: sin cambios.

El patrón híbrido sync→async con wrapper BullMQ está validado en SPEC-0011/12/15/16. La deduplicación por `eventId` + `ON CONFLICT DO NOTHING` es probada. La búsqueda full-text con GIN index es PostgreSQL nativo. El tenant scoping via `forTenant()` es la extensión central ya existente.

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 3 | Verificar todos los callers de `publish()`, patrones `forTenant()`, naming de enums |
| Files to read | 8 | Schema actual, shared contracts, service, controller, dto, module |
| Files to create | 5 | event-enricher, event-type-registry, worker, 2 default enrichers |
| Files to modify | 7 | schema.prisma, event-envelope, index, service, controller, module, dto |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| `publish()` cambia de síncrono a asíncrono y algún caller espera persistencia inmediata | Media | Alto | Auditoría de los 12+ callers. Si alguno lee el evento inmediatamente después de publish(), se mantiene el path síncrono como flag de opt-in o se documenta el cambio de semántica. |
| Volumen de eventos (100M/día) satura GIN index writes | Media | Alto | Condición #5 del AR. GIN index es eficiente para writes append-only pero hay write amplification conocida. Se mide throughput en staging. Plan deferred a Elasticsearch si >50K writes/s. |
| BullMQ worker no da abasto con el volumen | Baja | Medio | Múltiples workers paralelos. Si la cola crece, escalar workers horizontalmente. Backpressure natural de BullMQ. |
| Enricher falla y el evento queda sin enriquecer permanentemente | Baja | Medio | Enrichment es post-persistence. El evento ya está persistido con `enriched=false`. Reintento con backoff exponencial. Si agota retries, queda como no-enriquecido (el evento sigue siendo consultable). |
| Migración de schema con datos existentes | Baja | Medio | Nuevas columnas nullable o con default. No hay migración de datos. Rollback: `DROP COLUMN` de las columnas nuevas. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — publish wrapper | Que encola en BullMQ correctamente, que validación Zod funciona | Jest |
| Unit — Ingestion worker | Validation, deduplication, DLQ routing | Jest |
| Unit — Enricher pipeline | Pipeline execution, failure isolation | Jest |
| Integration — Existing API | `GET /api/v1/timeline` backward compat: page-based pagination, todos los filtros existentes | supertest |
| Integration — Search API | `GET /api/v1/timeline/search`: cursor-based pagination, full-text search, filtros | supertest |
| Integration — Tenant scoping | `forTenant()` aplica automáticamente `tenantId` en todas las queries | supertest + Prisma mock |
| Doorbell (ver #12) | Cross-tenant isolation, visibility scoping | E2E |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `activity-timeline-cross-tenant-isolation.spec.ts` | Tenant A cannot see Tenant B's activity events via BOTH endpoints (existing `/timeline` and new `/timeline/search`). |
| `activity-timeline-visibility-scoping.spec.ts` | User without required role cannot see `visibility=private` or `visibility=internal` events. |
| `activity-timeline-migration-backward-compat.spec.ts` | All 12+ consumer patterns still work with the modified `publish()` signature. Existing Zod schemas still accept old envelopes. |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0013 | Evolución del módulo activity-timeline: modelo híbrido sync→async, deduplicación por eventId, tenant scoping via forTenant(), event type registry, GIN index + plan Elasticsearch deferred. | Proposed (actualizar ADR-0013 del diseño original) |

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `ActivityEvent` (storage) | ActivityTimelineModule | Almacenamiento append-only inmutable. Tabla `activity_events` existente. |
| `publish()` (service) | ActivityTimelineModule | Interfaz de publicación. Firma existente sin cambios. 12+ callers. |
| `EventIngestion` (worker) | ActivityTimelineModule | BullMQ worker: validación, deduplicación, persistencia. |
| `EventEnricher` | ActivityTimelineModule | Pipeline de enriquecimiento plugable post-persistence. |
| `EventTypeRegistry` | ActivityTimelineModule | Registro de tipos de evento con ownership por módulo. |
| `TimelineAPI` | ActivityTimelineModule | Endpoints de consulta: `/timeline` (existente, backward compat), `/timeline/search` (nuevo). |
| `forTenant()` | Prisma Client Extension central | Scoping automático de `tenantId`. No es responsabilidad del timeline. |
| Event production | Respective consumer modules | Cada módulo publica sus propios eventos via `publish()`. Sin cambios. |

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| Elasticsearch backend | Implementar `SearchIndex` alternativa. El API de consulta no cambia — solo cambia el backend de búsqueda. | Weeks |
| New event enricher | Implementar `EventEnricher` interface + registrar en `EnricherRegistry`. Sin cambios en ingestion ni queries. | Days |
| New event type | Registrar en `EventTypeRegistry` con ownership metadata. Sin cambios de schema (eventType es string). | Days |
| Webhook event forwarding | `EventEnricher` que re-publica eventos a webhooks externos. | Weeks |
| Event retention per tenant | Campo `retentionDays` en config de tenant. Worker de purge periódico. | Days |
| Real-time event push | WebSocket gateway (opcional) que emite eventos a clients suscritos. | Weeks |
| Event backfill from existing modules | Campaña separada para publicar eventos históricos de módulos existentes. | Weeks |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× (10M eventos/día) | 100× (100M eventos/día) | Mitigation |
|--------|---------------------|------------------------|------------|
| Storage | ~50 GB/día | ~500 GB/día | Keep existing table. ADD partition strategy si es necesario en v2. |
| Write throughput | ~10K/s | ~50K/s | BullMQ workers paralelos. Append-only sin locks. |
| Query latency (page-based) | <50ms | <200ms | Keep existing 6 composite indexes. |
| Query latency (full-text) | <100ms | <500ms | GIN index en `searchVector`. Si degrada >500ms, activar plan Elasticsearch. |
| GIN index write amplification | ~1.2× write cost | ~2× write cost | Medir en staging. Si >50K writes/s, migrar a Elasticsearch. |

**Decisión:** El módulo actual escala sin cambios hasta ~10M eventos/día. Para 100M/día, se requiere: (a) partición mensual, (b) Elasticsearch para búsqueda full-text, (c) workers BullMQ paralelos. La migración a Elasticsearch es un cambio de implementación del search backend, no del API ni de los contratos.

### B. Open/Closed Principle (OCP)

**Point of extension:** `EventEnricher`, `EventTypeRegistry`, `SearchIndex`.

**What must change to add a new enricher:** Implementar `EventEnricher` interface + registrar en `EnricherRegistry`. Cero cambios en ingestion, queries, o contratos existentes.

**What must change to add a new search backend:** Implementar `SearchIndex` interface. Cero cambios en el API de consulta o en los controladores.

**What must change to register a new event type:** Llamar `EventTypeRegistry.register(eventType, metadata)` en el módulo owner. Sin cambios en schema ni en validación base.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| Activity events (storage) | ActivityTimelineModule | Timeline API, Audit |
| `publish()` (contract) | ActivityTimelineModule | 12+ consumer modules |
| Event enrichment | ActivityTimelineModule | Timeline API |
| Event type registry | ActivityTimelineModule | All modules (registration + query) |
| Event production | Respective consumer modules | ActivityTimelineModule (via publish) |
| Tenant scoping | Prisma Client Extension (shared) | ActivityTimelineModule (consumer) |

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| Activity events (current) | Indefinido (no hay política actual) | — | — |
| Activity events (post-MVP) | 12 meses (default) | Partition detach mensual (v2) | Drop partition >12 meses (v2) |
| DLQ events | 90 días | — | Eliminar >90 días |
| Search indexes | Rebuild desde eventos | — | Rebuild on demand |

**Nota:** Retention policy es nueva. Los eventos existentes no se eliminan. Eventos nuevos con fecha >12 meses se archivan en v2.

### E. Idempotency

| Operation | Duplicate risk | Protection |
|-----------|---------------|------------|
| `publish()` (sync wrapper) | Alta (retry del caller) | Deduplicación en el worker via `eventId` UUID + `ON CONFLICT (event_id) DO NOTHING` |
| `enrich()` | Baja | Check `enrichedAt` antes de ejecutar. Idempotente. |
| `query()` | Ninguna | Read-only |
| BullMQ enqueue | Media (worker crash after ack) | `eventId` dedup protege contra duplicados en persistencia |

### F. Shared Contracts

| Contract | Location | Consumers |
|----------|----------|-----------|
| `ActivityEventEnvelope` (extendido) | `packages/shared/src/activity-timeline/event-envelope.ts` | Publisher, Ingestion, API |
| `EventEnricher` | `packages/shared/src/activity-timeline/event-enricher.ts` | EnricherRegistry, Enrichers |
| `EventTypeRegistry` | `packages/shared/src/activity-timeline/event-type-registry.ts` | All modules (register + query) |
| `ActivityEventRow` (extendido) | `apps/api/src/modules/activity-timeline/dto.ts` | API responses |

### G. Partitioning Strategy

**MVP (SPEC-0017):** Sin partición. La tabla `activity_events` se mantiene sin cambios estructurales. Las nuevas columnas son aditivas.

**v2 (post-MVP):** Partición mensual por `createdAt`. Cada partición contiene eventos del mes + índices asociados. Particiones >12 meses se desprenden (detach) y archivan. El API puede consultar archivos con parámetro `includeArchived`.

**Razón:** No añadir complejidad de particionado en MVP. La tabla actual tiene volumen manejable. La partición se añade cuando el volumen lo requiera.

---

## 16. Interfaces / Contracts

```typescript
// ─── Extended Envelope (backward compatible) ──────
// packages/shared/src/activity-timeline/event-envelope.ts

// Existing fields (unchanged):
//   eventType, tenantId, clienteId?, entityType, entityId?,
//   actor, sourceModule, severity, category, payload

// New optional fields (added, not required):
export const ActivityEventEnvelopeSchema = z.object({
  // ... existing fields intact ...

  // NEW FIELDS (all optional — backward compatible):
  eventId: z.string().uuid().optional(),
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
  visibility: z.enum(['public', 'internal', 'private', 'tenant-only']).default('tenant-only'),
  subjectName: z.string().optional(),   // resolved by enricher
  actorName: z.string().optional(),     // resolved by enricher
  occurredAt: z.string().datetime().optional(),  // business timestamp
});

// ─── Event Enricher Interface ────────────────────
// packages/shared/src/activity-timeline/event-enricher.ts

export interface EventEnricher {
  readonly name: string;
  readonly description: string;
  enrich(event: PersistedActivityEvent): Promise<PersistedActivityEvent>;
}

export class EnricherRegistry {
  private enrichers: Map<string, EventEnricher> = new Map();

  register(enricher: EventEnricher): void { /* ... */ }
  get(name: string): EventEnricher | undefined { /* ... */ }
  getAll(): EventEnricher[] { /* ... */ }
}

// ─── Event Type Registry ──────────────────────────
// packages/shared/src/activity-timeline/event-type-registry.ts

export interface EventTypeMetadata {
  eventType: string;
  module: string;               // owner module name
  description: string;
  category: string;             // from existing Category enum
  severity: string;             // from existing Severity enum
  since: string;                // date added (ISO)
  deprecated?: boolean;
  deprecationMessage?: string;
}

export class EventTypeRegistry {
  private types: Map<string, EventTypeMetadata> = new Map();

  register(metadata: EventTypeMetadata): void { /* ... */ }
  get(eventType: string): EventTypeMetadata | undefined { /* ... */ }
  getAll(): EventTypeMetadata[] { /* ... */ }
  getByModule(moduleName: string): EventTypeMetadata[] { /* ... */ }
  isRegistered(eventType: string): boolean { /* ... */ }
}

// ─── Extended Query DTOs ──────────────────────────
// apps/api/src/modules/activity-timeline/dto.ts

// Existing TimelineQuerySchema (unchanged):
//   tenantId, clienteId?, entityType?, entityId?, actor?,
//   sourceModule?, severity?, category?, eventType?,
//   dateFrom?, dateTo?, page?, limit?

// ADD cursor-based query schema:
export const SearchQuerySchema = z.object({
  tenantId: z.string(),
  q: z.string().optional(),                    // full-text search query
  eventType: z.string().optional(),
  severity: Severity.optional(),
  category: Category.optional(),
  sourceModule: z.string().optional(),
  clienteId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actor: z.string().optional(),
  correlationId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  visibility: z.enum(['public', 'internal', 'private', 'tenant-only']).optional(),
  cursor: z.string().optional(),               // cursor string (base64-encoded id+createdAt)
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

// ADD cursor-based result:
export interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor?: string;
  total?: number;    // optional, expensive to compute
}
```

```prisma
// ─── ActivityEvent (EVOLVED — additive changes only) ───
// packages/database/prisma/schema.prisma

model ActivityEvent {
  // EXISTING columns (unchanged):
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

  // NEW columns (additive, nullable or with defaults):
  eventId       String?  @unique @map("event_id")        // UUID for dedup
  correlationId String?  @map("correlation_id")          // correlation chain
  causationId   String?  @map("causation_id")            // causal parent
  visibility    String   @default("tenant-only")          // access control
  subjectName   String?  @map("subject_name")            // enriched: entity display name
  actorName     String?  @map("actor_name")              // enriched: actor display name
  searchVector  Unsupported("tsvector")? @map("search_vector")  // full-text search
  enriched      Boolean  @default(false)
  enrichedAt    DateTime? @map("enriched_at")

  // EXISTING relation (unchanged):
  tenant Tenant @relation(fields: [tenantId], references: [id])

  // EXISTING indexes (unchanged — 6 composite indexes):
  @@index([tenantId, createdAt(sort: Desc)], map: "timeline_tenant_created")
  @@index([tenantId, clienteId, createdAt(sort: Desc)], map: "timeline_cliente")
  @@index([tenantId, entityType, entityId, createdAt(sort: Desc)], map: "timeline_entity")
  @@index([tenantId, eventType, createdAt(sort: Desc)], map: "timeline_event_type")
  @@index([tenantId, sourceModule, createdAt(sort: Desc)], map: "timeline_source_module")
  @@index([tenantId, severity, createdAt(sort: Desc)], map: "timeline_severity")

  // NEW indexes (additive):
  @@index([tenantId, correlationId], map: "timeline_correlation")
  @@index([searchVector], type: Gin, map: "timeline_search_vector")

  @@map("activity_events")
}
```

---

## 17. Migration Strategy

**Principio rector:** Zero-breaking para los 12+ consumidores existentes. Todos los cambios de schema son aditivos (nuevas columnas nullable o con default). Todos los cambios de API son aditivos (nuevos endpoints, nuevos parámetros opcionales).

### Phase 1: Schema migration (additive)

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | ADD columns `eventId`, `correlationId`, `causationId`, `visibility`, `subjectName`, `actorName`, `searchVector`, `enriched`, `enrichedAt` al modelo `ActivityEvent`. Todas nullable o con default. | Bajo | `ALTER TABLE activity_events DROP COLUMN ...` |
| 2 | ADD unique index on `event_id` | Bajo | `DROP INDEX ...` |
| 3 | ADD GIN index on `search_vector` | Medio | `DROP INDEX ...` |
| 4 | Run migration, generate Prisma client | Bajo | `prisma migrate down` |

### Phase 2: publish() wrapper

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 5 | Modify `publish()` to enqueue to BullMQ instead of direct DB write. Keep same signature `(envelope): Promise<void>`. | Medio | Revertir implementación al código anterior. La cola BullMQ puede drenarse. |
| 6 | Deploy. Observar logs de los 12+ callers. Si algún caller espera persistencia inmediata, detectar en logs. | Medio | Rollback inmediato del cambio de publish(). |

### Phase 3: Async worker

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 7 | Implement BullMQ worker `activity-timeline:ingestion` | Bajo | Desactivar worker. Eventos en cola se acumulan. |
| 8 | Deploy worker. | Bajo | Detener worker, drenar cola. |

### Phase 4: Enrichment pipeline

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 9 | Create `EventEnricher` interface + `EnricherRegistry` | Bajo | No desplegar enrichers aún. |
| 10 | Implement default enrichers (entity-name, actor-name) | Bajo | Desregistrar del registry. |
| 11 | Wire enricher pipeline in worker | Bajo | Desactivar pipeline flag. |

### Phase 5: New API endpoint

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 12 | Implement `GET /api/v1/timeline/search` with cursor pagination + full-text | Bajo | No desplegar controller. Endpoint existente sigue funcionando. |
| 13 | Add `SearchQuerySchema` + `CursorPaginatedResult` to dto.ts | Bajo | No usar hasta desplegar controller. |

### Phase 6: Event type registry

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 14 | Create `EventTypeRegistry` | Bajo | No usar hasta registrar tipos. |
| 15 | Register existing 20 known event types with module ownership | Bajo | Registry es in-memory, restart lo vacía. |
| 16 | Document registration process for new event types | Bajo | Documentación. |

### Deprecation Plan (post-MVP)

| Step | Timeline | Description |
|------|----------|-------------|
| 1 | MVP+1 | Marcar `publish()` como `@deprecated` en JSDoc. Añadir `publishAsync()` que retorna `Promise<{ eventId: string }>`. |
| 2 | MVP+3 | Migrar cada uno de los 12+ callers de `publish()` a `publishAsync()` individualmente. Un módulo por PR. |
| 3 | MVP+6 | Eliminar `publish()` wrapper síncrono. Solo `publishAsync()` permanece. |
| 4 | MVP+6 | Hacer `eventId` requerido en el envelope (breaking change documentado). |

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿Algún caller de los 12+ lee el evento inmediatamente después de publish() esperando persistencia síncrona? | Open | Auditoría requerida antes de desplegar Phase 2. Si existe, ese caller se migra a un path síncrono temporal. |
| 2 | ¿GIN index write amplification es aceptable para el volumen actual (~X eventos/día)? | Open | Medir en staging antes de activar Phase 5. Si >50K writes/s, activar plan Elasticsearch deferred. |
| 3 | ¿Se requiere WebSocket para push en tiempo real en MVP? | Open | Doorbell existente no lo pide. Se documenta como extensión futura. |
| 4 | ¿Los eventos históricos existentes en `activity_events` se backfillan con `eventId`? | Open | No en MVP. Los eventos existentes tienen `eventId = NULL`. Solo los nuevos eventos tienen UUID. |
| 5 | ¿Política de retention configurable por tenant en MVP? | Open | No en MVP. Default 12 meses para todos. Configurable por tenant en v2. |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Refinado por Architecture Review — condiciones resueltas.
