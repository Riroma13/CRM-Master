# Design: SPEC-0010 — Universal Search 2.0

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Estado:** Draft
> **Documento de trabajo.** No modifica el pipeline SDD.

---

## 1. Executive Summary

CRM-Master carece de un buscador unificado. Actualmente el usuario debe navegar
por menús y módulos para encontrar clientes, sistemas, documentos o incidencias.
Cada búsqueda requiere cambiar de contexto, cargar páginas y aplicar filtros
manualmente. En un CRM con decenas de entidades, esto representa cientos de
clicks perdidos cada día.

**Universal Search 2.0** implementa un motor de búsqueda global accesible desde
cualquier pantalla mediante `Ctrl+K`. Indexa todas las entidades del CRM en un
único índice de búsqueda y devuelve resultados agrupados por categoría en
milisegundos. La arquitectura sigue el patrón **Indexer → Search Engine** que
desacopla la publicación de entidades del motor de búsqueda, permitiendo añadir
nuevos tipos de entidad sin modificar el buscador.

El impacto esperado es reducir el tiempo de localización de información de
~30 segundos (navegación) a ~3 segundos (tecleo + selección), eliminar la
carga cognitiva de recordar dónde está cada función, y sentar las bases para
futuras capacidades de IA (búsqueda semántica, RAG, copiloto).

---

## 2. Technical Approach

El sistema se compone de cuatro capas:

1. **Domain Events** — cada módulo de dominio publica eventos de negocio
   (`EntityCreated`, `EntityUpdated`, `EntityDeleted`) cuando ocurre una
   operación relevante. El dominio no sabe que existe un buscador.

2. **Search Engine Abstraction** — interfaz `SearchEngine` que define las
   operaciones `index()`, `search()`, `remove()`. SearchService depende
   únicamente de esta interfaz, no de un motor concreto. La implementación
   inicial es `TsVectorSearchEngine` (PostgreSQL tsvector + GIN). Una futura
   `PgVectorSearchEngine` (pgvector) puede reemplazarla sin modificar
   SearchService.

3. **Search Index** — tabla `search_entries` donde el SearchModule almacena
   los documentos de búsqueda. Es responsabilidad exclusiva del SearchModule.

4. **Search Controller** — endpoint `GET /api/v1/search?q=<query>` que recibe
   la consulta, delega en SearchService y devuelve resultados agrupados.

La implementación inicial usa PostgreSQL `tsvector` + `tsquery` con índices
GIN. SearchService no conoce este detalle: solo conoce `SearchEngine`.

La arquitectura permite migrar de tsvector a pgvector (u otro motor) sin
modificar SearchService, SearchController, ni el contrato público.

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Search engine | PostgreSQL tsvector, Elasticsearch, MeiliSearch, Algolia | **PostgreSQL tsvector** | Zero new infrastructure, same DB, GIN indexes, suficiente para ~500K documentos por tenant. Elasticsearch sería más potente pero añade un cluster entero. |
| Index storage | Tabla dedicada `search_entries`, vista materializada, índice GIN directo sobre tablas | **Tabla dedicada `search_entries`** | Desacopla el índice del esquema de dominio. Las tablas de dominio pueden cambiar sin afectar la búsqueda. |
| Index update strategy | Síncrono (domain → SearchService directo), asíncrono (evento), cola | **Event-driven: domain → DomainEvent → SearchModule → SearchEngine** | El dominio publica eventos de negocio. SearchModule los consume y decide si indexa. El dominio no importa SearchModule. SearchModule es el único propietario del índice (ver OCP y Ownership en Architecture Review). |
| SearchEngine abstraction | Interfaz común, implementación fija, sin abstracción | **Interfaz `SearchEngine` con `TsVectorSearchEngine` (v1) y `PgVectorSearchEngine` (futuro)** | SearchService depende de `SearchEngine`, no de tsvector. Migrar a búsqueda semántica no requiere modificar SearchService. El contrato público permanece estable. |
| Search endpoint | Unificado (`/api/v1/search`), por tipo (`/api/v1/search/:entityType`) | **Unificado con filtro `type`** | Un solo punto de entrada, el frontend filtra por categoría. |
| Ranking | ts_rank, ts_rank_cd, popularidad, personalizado | **ts_rank + weight boosting** | `A` en título = 1.0, `B` en tags = 0.5, `C` en descripción = 0.3. Sin personalización en v1 (se añade en v2 con IA). |
| Typo tolerance | `similarity()`, `pg_trgm`, `levenshtein()` | **pg_trgm + similarity()** | Índice GIN trigram en `search_vector`. Tolerancia a errores tipográficos sin depender de correctores externos. |
| Multi-tenant isolation | Fila `tenant_id` en search_entries, esquema por tenant, BD separada | **Fila `tenant_id` en search_entries** | Misma estrategia que el resto del CRM. El middleware `TenantResolveMiddleware` inyecta `tenantId`, y el SearchController lo aplica como filtro obligatorio. |
| Future vector search | Columna `embedding vector(1536)` separada, tabla paralela | **Columna nullable `embedding` en search_entries** | Cero migración cuando se active. La columna existe pero no se usa hasta que se implemente el pipeline de embeddings. |
| Keyboard UX | `Ctrl+K` vía `cmdk` (Radix), `kbar`, `react-select` | **`cmdk` (Radix UI)** | nativa keyboard-first, soporta grupos, filtros, acciones. Es el estándar de facto para buscadores tipo command palette. |

---

## 4. Data Flow

```
User presses Ctrl+K
       │
       ▼
  [CommandPalette] ──fetch /api/v1/search?q=term&tenantId=X──▶
       │                                                        │
       │                                                        ▼
       │                                           SearchController.search()
       │                                                        │
       │                                              normalize(query)
       │                                              to_tsquery('term:*')
       │                                                        │
       │                                                        ▼
       │                                           SELECT * FROM search_entries
       │                                           WHERE tenant_id = X
       │                                             AND search_vector @@ query
       │                                             OR similarity(title, query) > 0.3
       │                                           ORDER BY ts_rank DESC, created_at DESC
       │                                           LIMIT 20
       │                                                        │
       │                                                        ▼
       │                                           JSON response grouped by entity_type:
       │                                           { grupos: [{ tipo, results: [...] }] }
       │                                                        │
       ◄─────────────────────────────────────────────────────────┘
       │
       ▼
  [Results grouped by category]
       │
       ├── Clientes (3) ──────► /admin/clientes/:id
       ├── Incidencias (2) ───► /admin/incidencias/:id
       ├── Documentos (5) ────► /admin/documentos/:id
       └── Tareas (1) ────────► /admin/tareas/:id

  User selects result → navigate instantly
```

**Indexation flow** (event-driven, not direct):

```
DomainService.create()
       │
       ├── domain logic
       ├── prisma.entity.create()
       └── eventBus.publish(new EntityCreatedEvent('cliente', {
              entityId: cliente.id,
              tenantId: cliente.tenantId,
              data: { nombre, tipoNegocio, tags, email, telefono }
           }))

       El dominio NO conoce SearchModule. NO importa SearchService.
       Solo publica un evento de dominio.

       ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

SearchModule (event consumer)
       │
       ├── @OnEvent(EntityCreatedEvent)
       ├── decide qué indexar y cómo
       └── searchEngine.index({
              entityType: 'cliente',
              entityId: cliente.id,
              title: data.nombre,
              description: `${data.tipoNegocio} — ${data.tags.join(', ')}`,
              tags: data.tags,
              tenantId,
              payload: { email: data.email, telefono: data.telefono }
           })
              │
              ▼
         TsVectorSearchEngine.index()
              │
              ▼
         INSERT INTO search_entries ...
         ON CONFLICT (entity_type, entity_id, tenant_id) DO UPDATE
```

**El dominio desconoce completamente el índice.** SearchModule es el único
responsable de decidir qué se indexa, cuándo y cómo.

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add `SearchEntry` model con tsvector, GIN index, embedding column nullable |
| 2 | `packages/shared/src/search/search-entry.ts` | Create | Shared `SearchEntry` type, `IndexSearchInput`, `SearchResult` contracts |
| 3 | `packages/shared/src/search/index.ts` | Create | Re-export |
| 4 | `apps/api/src/modules/search/search.module.ts` | Create | NestJS module |
| 5 | `apps/api/src/modules/search/search.service.ts` | Create | `index()`, `remove()`, `search()`, `reindex()` |
| 6 | `apps/api/src/modules/search/search.controller.ts` | Create | `GET /api/v1/search` |
| 7 | `apps/api/src/modules/search/dto.ts` | Create | `SearchQuery` (Zod), `SearchResult` DTO |
| 8 | `apps/tenant-web/src/components/search/command-palette.tsx` | Create | `Ctrl+K` palette UI with cmdk |
| 9 | `apps/tenant-web/src/hooks/use-search.ts` | Create | Debounced fetch hook |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 10 | `apps/tenant-web/src/components/layout/sidebar-layout.tsx` | Modify | Mount CommandPalette globally |
| 11 | `apps/tenant-web/src/lib/api-types.ts` | Modify | Add `SearchResult`, `SearchGroup` types |
| 12 | `apps/api/src/modules/core/core.module.ts` | Modify | Import `SearchModule` |
| 13 | `apps/api/src/modules/search/search.service.spec.ts` | Create | Unit tests |
| 14 | `apps/tenant-web/src/hooks/use-search.test.ts` | Create | Hook tests |
| 15 | `apps/tenant-web/src/components/search/command-palette.test.tsx` | Create | Component tests |

### 5.3 Expected NOT to Change

- `app.module.ts` — pasa por `CoreModule`
- `apps/api/src/modules/activity-timeline/` — independiente
- `apps/api/src/modules/tenant/` — no hay cambios de tenant
- Existing domain services — el buscador NO modifica cómo funcionan. Solo publican eventos de dominio. No importan SearchModule, SearchService ni ningún tipo del buscador.
- Frontend navigation — no cambia rutas ni sidebar
- Backend auth — reutiliza guards existentes

---

## 6. Read Order

1. `docs/SDD-WORKFLOW.md` — recordar el pipeline
2. `docs/templates/design-enterprise-template.md` — recordar la estructura
3. `packages/database/prisma/schema.prisma` — entender naming y modelos existentes
4. `packages/shared/src/` — ver patrón de contratos compartidos (activity-timeline)
5. `apps/api/src/modules/search/search.service.ts` (borrador) — definir el core
6. `apps/api/src/modules/search/search.controller.ts` (borrador) — endpoint
7. `apps/tenant-web/src/components/search/command-palette.tsx` — UI
8. `apps/tenant-web/src/hooks/use-search.ts` — hook de datos

---

## 7. Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_search_entries
pnpm --filter database generate
pnpm --filter api test search
pnpm --filter tenant-web test search
pnpm --filter api lint
pnpm turbo build --filter=api --filter=tenant-web
```

---

## 8. Design Confidence

**Confidence:** High

El patrón Indexer → Search Engine es una variante del patrón Publisher →
ActivityTimeline ya implementado en SPEC-0009. El equipo conoce el patrón,
la infraestructura de tsvector está bien documentada, y el frontend cmdk es
una librería madura. La única incertidumbre es el rendimiento de tsvector
con >1M documentos por tenant, mitigado por los índices GIN y la
particionabilidad del modelo.

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 6 | Patrones de shared, cmdk examples, tsvector syntax |
| Files to read | 10 | Schema, shared contracts, existing services, search UI patterns |
| Files to create | 9 | Module, service, controller, DTO, shared types, frontend component, hook, tests (3) |
| Files to modify | 3 | schema.prisma, core.module.ts, sidebar-layout.tsx |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| tsvector rendimiento bajo con >500K docs | Media | Alto | Particionar por mes o tenant. Índice GIN parcial. Migrar a Elasticsearch en v2 si es necesario. |
| Ctrl+K conflictos con shortcuts del navegador | Baja | Medio | El componente cmdk captura el evento antes de que llegue al browser. Documentado. |
| Indexación lenta en operaciones batch | Media | Medio | `index()` acepta arrays. Transacción propia no bloqueante. |
| Resultados irrelevantes por ts_rank mal calibrado | Media | Alto | Ajuste de weights por tipo de entidad. Tests de ranking en CI. |
| Embedding column nunca se usa | Baja | Bajo | Cuesta cero mantenerla. Se activa cuando se implemente pipeline de IA. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Service | `index()` inserta correctamente, `search()` filtra por tenant y query, `remove()` elimina | Jest + mocked Prisma |
| Unit — Search Query | Normalización de queries, empty query, caracteres especiales, unicode | Jest parameterized |
| Integration — API | `GET /api/v1/search?q=` con resultados, sin resultados, filtro por tipo, paginación | supertest |
| Integration — Ranking | Documentos con match exacto aparecen antes que fuzzy | supertest + seed |
| Component — Palette | Render, open/close con Ctrl+K, keyboard navigation, selección | Vitest + Testing Library |
| Hook — useSearch | Debounce, loading, results, empty, error | Vitest |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `apps/api/test/doorbell/search-cross-tenant-isolation.spec.ts` | Tenant A no puede ver resultados de búsqueda de Tenant B |
| `apps/api/test/doorbell/search-cross-client-isolation.spec.ts` | Cliente A no puede ver documentos de Cliente B dentro del mismo tenant |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0006 | Documentar la decisión de motor de búsqueda (tsvector vs Elasticsearch vs MeiliSearch), estrategia de indexación, y preparación para vector search. | Proposed |

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `SearchEngine` abstraction | SearchModule | Única interfaz para operaciones de búsqueda. SearchService no conoce el motor concreto. |
| `SearchService.index()` | SearchModule | Única forma de añadir documentos al índice (invocada por event handlers internos) |
| `SearchService.search()` | SearchModule | Única forma de consultar el índice |
| `SearchEntry` schema | SearchModule | Único modelo de datos de búsqueda |
| `search_entries` table | SearchModule | Almacenamiento físico del índice |
| Domain events (`EntityCreated`, etc.) | Domain Modules | Los dominios publican eventos. No importan SearchModule y desconocen que existe un índice. |
| Search consumer (event handler) | SearchModule | Suscribe eventos de dominio y decide qué indexar. Es el único punto de entrada al índice. |

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| New entity type | Añadir event handler en SearchModule que reaccione al evento de dominio. El dominio solo publica su evento estándar. SearchModule decide qué indexar. | Hours |
| Vector search (embeddings) | Poblar columna `embedding` existente, añadir `cosine_distance` al ORDER BY | Days |
| Semantic search | Reemplazar `ts_query` por consulta vectorial. Mismo endpoint, mismo contrato | Days (cuando haya embeddings) |
| RAG / Copilot | El search endpoint se convierte en el `retriever` del pipeline RAG. Mismo contrato. | Weeks |
| Personalised ranking | Añadir columna `user_id` + peso por interacción del usuario | Days |
| Filters UI | El endpoint ya acepta `type`, `dateFrom`, `dateTo`. Solo falta UI. | Hours |
| Multi-tenant global search (superadmin) | Same endpoint, omitir tenantId filter. Ya soportado por la arquitectura. | Hours |

---

## Architecture Review (MANDATORY)

### A. Scalability

| Factor | 10× (500K docs/tenant) | 100× (5M docs/tenant) | Mitigation |
|--------|----------------------|-----------------------|------------|
| Storage | ~2GB / tenant (JSON + tsvector) | ~20GB / tenant | Partición mensual. Compresión TOAST en payload y search_vector. |
| Query latency | <50ms (GIN index) | <200ms (GIN index) | Índice parcial por tenant. Limitar resultados a 20. |
| Write throughput | <5ms por indexación | <15ms por indexación | Indexación síncrona aceptable. Para batch: `createMany()`. |
| Re-index | <1s por entidad | <5s por entidad | `REINDEX CONCURRENTLY` si es necesario. |

**Decision:** PostgreSQL tsvector escala hasta ~1M documentos por tenant con
GIN indexing sin degradación significativa. Para volúmenes superiores, se
particiona por tenant o se migra a Elasticsearch. El contrato del SearchService
es el mismo independientemente del motor subyacente.

### B. Open/Closed Principle (OCP)

**Point of extension:** `SearchModule` event handlers.

**What must change to add one more entity type:**
1. El dominio ya publica `EntityCreated`/`EntityUpdated`/`EntityDeleted`.
2. SearchModule añade un handler para ese tipo de evento.
3. El dominio no se modifica. No importa SearchModule.

**Decision:** OCP cumplido. El dominio no conoce SearchModule. SearchModule
decide qué indexar basándose en eventos de dominio. Añadir una nueva entidad
al índice no requiere modificar el dominio, solo añadir un handler en
SearchModule.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| `search_entries` table | **SearchModule** (único propietario) | SearchController (reads). Nadie más escribe directamente. |
| Search index data | **SearchModule** | SearchService decide formato, contenido y estrategia. |
| Indexación y re-indexación | **SearchModule** | Vía event handlers internos. El dominio no participa. |
| Domain events | **Domain Modules** | Publican eventos de negocio. Desconocen que existe un índice. |
| Search UI (CommandPalette) | Frontend (Search) | Layout (mount), User (interaction) |

**Decision:** SearchModule es el **único propietario** del índice. Los módulos
de dominio publican eventos sin saber que serán indexados. SearchModule decide
qué indexar, cuándo y cómo. No existe ownership distribuido.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| search_entries | Misma que la entidad original | Cuando la entidad se archiva, se elimina del índice vía `remove()` | `remove(entityId, entityType)` |
| Orphaned entries | No deberían existir | Re-index periodyc cleanup verificando existencia de la entidad original | Job semanal de limpieza |

**Decision:** La vida útil de una entrada de búsqueda está ligada a la vida
útil de la entidad que representa. Cuando se elimina la entidad, el dominio
debe llamar a `remove()`. Un job de limpieza semanal recoge huérfanos.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
|-----------|---------------|------------|----------|
| `Domain event publication` | Media (NestJS EventEmitter puede emitir el mismo evento múltiples veces) | El event handler en SearchModule es idempotente: `UPSERT` en el motor. | Si el mismo evento se procesa dos veces, el índice se actualiza sin duplicar entradas. |
| `SearchEngine.index()` | Alta (re-indexación, reintentos desde el handler) | `UPSERT` on `(entityType, entityId, tenantId)` | `ON CONFLICT DO UPDATE` actualiza el documento existente. No hay duplicados. |
| `SearchEngine.remove()` | Baja | `DELETE WHERE entityType = X AND entityId = Y` es idempotente por naturaleza | Segunda ejecución no afecta. |

**Decision:** La idempotencia se maneja dentro de SearchModule, no en el dominio.
El dominio publica eventos sin saber si serán procesados una o varias veces.
SearchModule garantiza que la operación sobre el índice es idempotente mediante
`UPSERT` y `DELETE` sin efectos secundarios.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
|----------|----------|-----------|-----------|
| `IndexSearchInput` | `packages/shared/src/search/search-entry.ts` | SearchService | Domain services |
| `SearchResult` | `packages/shared/src/search/search-entry.ts` | SearchController | Frontend |

**Decision:** Contrato compartido en `packages/shared/`. Frontend y backend
importan los mismos tipos. Sin duplicación.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
|-----------|------|----------|
| Tenant | Medio (algunos tenants pueden tener muchos más datos) | `tenant_id` en todas las queries. Índice parcial por tenant si es necesario. |
| Time | Bajo (search entries no envejecen como activity events) | No requiere partición temporal. Se eliminan cuando se elimina la entidad. |
| Volume | Medio (>1M entradas por tenant degrada tsvector) | Migrar a Elasticsearch o particionar por tenant en v2. El contrato no cambia. |

**Decision:** No se particiona en v1. Si un tenant supera 1M de entradas, se
evalúa migrar el motor manteniendo el mismo contrato. La columna `embedding`
ya está prevista para la migración a búsqueda híbrida.

---

## 16. Interfaces / Contracts

```typescript
// ─── packages/shared/src/search/search-entry.ts ──────────

// ─── SearchEngine interface (the abstraction) ────────────
// SearchService depends ONLY on this interface.
// TsVectorSearchEngine implements it for v1.
// PgVectorSearchEngine will implement it for v2 (vector/hybrid search).

export interface SearchEngine {
  index(input: IndexSearchInput): Promise<void>;
  search(query: SearchQuery): Promise<SearchResultItem[]>;
  remove(entityType: string, entityId: string, tenantId: string): Promise<void>;
}

export interface IndexSearchInput {
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  tags?: string[];
  tenantId: string;
  clienteId?: string;
  payload?: Record<string, unknown>;
}

// ─── Domain Events (published by domain modules) ─────────
// SearchModule consumes these. Domain modules do NOT import SearchModule.

export interface DomainEntityEvent {
  eventType: 'created' | 'updated' | 'deleted';
  entityType: string;         // 'cliente' | 'sistema' | 'documento' | ...
  entityId: string;
  tenantId: string;
  clienteId?: string;
  data: Record<string, unknown>;     // datos relevantes para indexación
  occurredAt: string;
}

// ─── Search Query ────────────────────────────────────────
export interface SearchQuery {
  q: string;
  type?: string;              // filtrar por entityType
  tenantId: string;           // obligatorio (multi-tenant)
  page?: number;
  limit?: number;
}

// ─── Search Results ──────────────────────────────────────
export interface SearchResultItem {
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  tags?: string[];
  matchField?: 'title' | 'description' | 'tags' | 'fuzzy';
  score: number;
  payload?: Record<string, unknown>;
  url: string;                 // ruta de navegación directa
  createdAt: string;
}

export interface SearchGroup {
  entityType: string;
  label: string;              // 'Clientes', 'Incidencias', ...
  icon: string;               // nombre del icono lucide-react
  results: SearchResultItem[];
}

export interface SearchResponse {
  groups: SearchGroup[];
  total: number;
  query: string;
}
```

```prisma
// ─── packages/database/prisma/schema.prisma ────────────

model SearchEntry {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  clienteId   String?  @map("cliente_id")
  entityType  String   @map("entity_type")
  entityId    String   @map("entity_id")
  title       String
  description String?
  tags        String[]
  searchVector String?  @map("search_vector") @db.Text // tsvector (gestionado por trigger o Prisma raw)
  embedding   Unsupported("vector(1536)")? // para futura búsqueda semántica — no usar hasta v2
  payload     Json     @default("{}")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([entityType, entityId, tenantId])
  @@index([tenantId, entityType])
  @@index([tenantId, searchVector], type: Gin)
  @@index([tenantId, title], type: Gin)  // pg_trgm GIN para fuzzy search
  @@map("search_entries")
}
```

---

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Add `SearchEntry` model, migration, GIN indexes | Bajo | `prisma migrate down` |
| 2 | Create `SearchModule` (service, controller, DTO) | Bajo | Revertir commit del módulo |
| 3 | Add event handlers in SearchModule for each domain event type | Bajo | Los handlers son internos de SearchModule. El dominio no se modifica. |
| 4 | Create frontend CommandPalette + useSearch hook | Bajo | Ocultar componente |
| 5 | Mount CommandPalette in layout | Bajo | Eliminar del layout |
| 6 | Backfill: re-index existente entidades via script | Medio | Revertir script |

**Order:** Schema → Backend → Frontend → Backfill. Sin downtime.

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿Mantener tsvector via trigger SQL o calcular en Prisma? | Open | Recomendación: trigger SQL dentro de SearchModule. El dominio no sabe que existe search_vector. SearchEngine (TsVectorSearchEngine) gestiona el trigger internamente. |
| 2 | ¿Incluir resultados del ActivityTimeline en la búsqueda? | Open | Recomendación: sí. `activity_events` es una entidad más. El timeline ya tiene `eventType`, `titulo`, `descripcion`. Se indexa como entidad `actividad`. |
| 3 | ¿Paginación infinita o paginación clásica? | Open | Recomendación: paginación clásica (20 resultados, `load more`). Infinita es más compleja y no aporta valor en un buscador typeahead. |
| 4 | ¿Re-index manual o automático? | Open | Recomendación: automático al crear/actualizar entidad. Script manual para backfill initial. |

---

> **Fin del documento.**
> Este Design sigue el Enterprise Design Standard SDD v2.1.
> Siguiente fase: Tasks → Apply → Verify → Archive.

---

## Architecture Status

| Campo | Valor |
|-------|-------|
| **Architecture Status** | **APPROVED** |
| **Architecture Review** | **PASSED** |
| **SearchEngine abstraction** | ✅ Adoptada. SearchService depende de `SearchEngine`, no del motor concreto. |
| **Event-driven indexing** | ✅ Adoptado. Dominio publica eventos. SearchModule consume. |
| **SearchModule ownership** | ✅ Definido como único propietario del índice. |
| **Evolución futura** | 📝 pgvector, Hybrid Search, RAG, Partitioning — documentados pero fuera del alcance de SPEC-0010. Se evaluarán en SPECs futuras con evidencia de métricas. |

**El Design queda listo para Tasks.**
