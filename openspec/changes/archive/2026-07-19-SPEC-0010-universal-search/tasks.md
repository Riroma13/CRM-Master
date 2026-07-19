# Tasks: SPEC-0010 — Universal Search 2.0

> **Basado en:** Design APPROVED (Architecture Review PASSED)
> **SDD v2.1 — Enterprise Design Standard**
> **Fecha:** 2026-07-19

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650–850 |
| 400-line budget risk | **High** |
| Chained PRs recommended | **Yes** |
| Suggested split | PR1 Foundation → PR2 Search Engine → PR3 Integration → PR4 Frontend |
| Delivery strategy | `stacked-to-main` |
| Chain strategy | `stacked-to-main` (cada PR apunta al anterior) |

---

## Phase 1: Infrastructure — Schema, Shared Contracts, ADR

**Objetivo:** Crear la base de datos, los contratos compartidos y el ADR que documenta la decisión arquitectónica.

**Dependencias:** Ninguna.

**Riesgo:** Bajo. Los cambios son aditivos. No afectan a ningún módulo existente.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 1.1 | ADR-0006: Search Engine Decision | `docs/architecture/adr/0006-search-engine.md` | ADR creado con estado Proposed, documentando tsvector vs Elasticsearch vs MeiliSearch, la abstracción SearchEngine y la preparación para pgvector | Documental |
| 1.2 | Add `SearchEntry` Prisma model | `packages/database/prisma/schema.prisma` | Modelo `SearchEntry` con campos: `id`, `tenantId`, `clienteId?`, `entityType`, `entityId`, `title`, `description?`, `tags`, `searchVector?`, `embedding?`, `payload`, `createdAt`, `updatedAt`. Unique constraint en `(entityType, entityId, tenantId)`. Índices GIN en `(tenantId, searchVector)` y `(tenantId, title)`. Columna `embedding vector(1536)?` nullable. | Schema |
| 1.3 | Create migration | `packages/database/prisma/migrations/` | `prisma migrate dev --name add_search_entries` genera migración. `prisma validate` pasa. | DB |
| 1.4 | Create shared contracts | `packages/shared/src/search/search-entry.ts` | `SearchEngine` interface (`index`, `search`, `remove`). `IndexSearchInput`, `SearchQuery`, `SearchResultItem`, `SearchGroup`, `SearchResponse`. `DomainEntityEvent` interface. | Shared |
| 1.5 | Create shared re-export | `packages/shared/src/search/index.ts`, `packages/shared/src/index.ts` | `packages/shared/src/index.ts` exporta `./search`. `tsc --noEmit` pasa. | Shared |

**Expected Commands:**
```bash
pnpm --filter database prisma migrate dev --name add_search_entries
pnpm --filter database generate
pnpm --filter shared build
```

**Acceptance Criteria:**
- [ ] `prisma validate` pasa
- [ ] Migración creada y revisable
- [ ] `tsc --noEmit` en `packages/shared` sin errores
- [ ] Todos los contratos del Design están tipados

---

## Phase 2: Search Engine — TsVectorSearchEngine

**Objetivo:** Implementar la abstracción `SearchEngine` y su implementación concreta `TsVectorSearchEngine`. SearchService no depende de PostgreSQL directamente.

**Dependencias:** Phase 1 (schema + contracts)

**Riesgo:** Medio. tsvector requiere triggers SQL o raw queries (Prisma no lo soporta nativamente). La implementación debe decidir entre trigger o query manual.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 2.1 | Implement `TsVectorSearchEngine` | `apps/api/src/modules/search/engines/tsvector-engine.ts` | Implementa `SearchEngine.index()` con `INSERT ... ON CONFLICT DO UPDATE`, `SearchEngine.search()` con `to_tsquery` + `ts_rank` + `similarity()` y filtro obligatorio por `tenantId`, `SearchEngine.remove()` con `DELETE WHERE entityType + entityId + tenantId`. | Engine |
| 2.2 | Implement `SearchEngine` interface + DI registration | `apps/api/src/modules/search/engines/index.ts`, `search.module.ts` | `TsVectorSearchEngine` registrado como provider de `SearchEngine` en el módulo NestJS. `SearchService` inyecta `SearchEngine`. | Engine |
| 2.3 | SearchEngine unit tests | `apps/api/src/modules/search/engines/tsvector-engine.spec.ts` | Test con mocked Prisma: `index()` inserta correctamente, `search()` filtra por tenant y query, `remove()` elimina, `UPSERT` no duplica. | Testing |

**Expected Commands:**
```bash
pnpm --filter api test tsvector-engine
pnpm --filter api lint
```

**Acceptance Criteria:**
- [ ] `SearchEngine` interface completamente implementada
- [ ] `TsVectorSearchEngine` maneja ts_query, ts_rank, similarity
- [ ] Tests de unidad pasan (mínimo 5)
- [ ] Ninguna referencia a tsvector fuera del engine directory

---

## Phase 3: Search Module — Service, Controller, Event Handlers

**Objetivo:** Implementar `SearchService`, `SearchController`, DTOs y los event handlers que conectan los eventos de dominio con el SearchEngine.

**Dependencias:** Phase 2 (SearchEngine)

**Riesgo:** Medio. El event bus (NestJS EventEmitter) debe estar correctamente configurado. Los handlers no deben bloquear el flujo del dominio.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 3.1 | Implement `SearchService` | `apps/api/src/modules/search/search.service.ts` | Inyecta `SearchEngine`. Expone `search(query)`, `index(input)`, `remove(entityType, entityId, tenantId)`. Los errores del engine se loguean como warning sin propagarse al llamante. | Service |
| 3.2 | Implement `SearchController` | `apps/api/src/modules/search/search.controller.ts` | `GET /api/v1/search?q=&type=&page=&limit=`. Filtro obligatorio por `tenantId` (desde guard o middleware). Ratelimit por IP. Respuesta en formato `SearchResponse`. | Controller |
| 3.3 | Implement DTOs | `apps/api/src/modules/search/dto.ts` | `SearchQuerySchema` (Zod): `q` string requerido, `type` string opcional, `page` number default 1, `limit` number default 20 max 50. Validación y sanitización de query. | DTO |
| 3.4 | Implement event handlers | `apps/api/src/modules/search/search.event-handlers.ts` | `@OnEvent(EntityCreated)`: resuelve datos de la entidad y llama a `searchService.index()`. `@OnEvent(EntityUpdated)`: re-indexa. `@OnEvent(EntityDeleted)`: llama a `searchService.remove()`. Todos los handlers envuelven errores en try/catch. | Event |
| 3.5 | Wire module | `apps/api/src/modules/search/search.module.ts`, `apps/api/src/modules/core/core.module.ts` | `SearchModule` registra `SearchService`, `SearchController`, `TsVectorSearchEngine`, event handlers. `CoreModule` importa `SearchModule`. | Wiring |
| 3.6 | SearchService unit tests | `apps/api/src/modules/search/search.service.spec.ts` | Test con mocked `SearchEngine`: `search()` delega en el engine, `index()` delega, errores no se propagan. | Testing |

**Expected Commands:**
```bash
pnpm --filter api test search
pnpm --filter api lint
pnpm turbo build --filter=api
```

**Acceptance Criteria:**
- [ ] `GET /api/v1/search?q=test&tenantId=X` devuelve 200 con resultados
- [ ] `GET /api/v1/search` sin `q` devuelve 400
- [ ] `GET /api/v1/search` sin `tenantId` devuelve 403
- [ ] Event handlers se ejecutan y no bloquean el dominio
- [ ] `pnpm turbo build --filter=api` pasa

---

## Phase 4: Domain Events — Publicación desde módulos de negocio

**Objetivo:** Cada módulo de dominio publica eventos cuando ocurre una operación relevante. El SearchModule los consume sin que el dominio lo sepa.

**Dependencias:** Phase 3 (event handlers listos para recibir eventos)

**Riesgo:** Medio. Cada módulo de dominio debe modificarse para importar el EventBus y publicar el evento correspondiente. Son ~12 módulos. Hay que asegurar que ningún publish quede fuera de try/catch.

### Tasks

| # | Task | Module | Events to publish | Files |
|---|------|--------|-------------------|-------|
| 4.1 | EventBus setup | `packages/shared/src/search/event-bus.ts` | Definir `EventBus` service (wrapper de NestJS EventEmitter) con métodos `publish(event)` síncronos. | Create |
| 4.2 | Publicar eventos desde clientes | `clients/clients.service.ts` | `cliente.creado`, `cliente.actualizado`, `cliente.eliminado` | Modify |
| 4.3 | Publicar eventos desde sistemas | `sistemas/sistemas.service.ts` | `sistema.añadido`, `sistema.modificado`, `sistema.eliminado` | Modify |
| 4.4 | Publicar eventos desde documentos | `documentos/documentos.service.ts` | `documento.generado`, `documento.eliminado` | Modify |
| 4.5 | Publicar eventos desde incidencias | `incidencias/incidencias.service.ts` | `incidencia.creada`, `incidencia.resuelta`, `incidencia.eliminada` | Modify |
| 4.6 | Publicar eventos desde tareas | `tareas/tareas.service.ts` | `tarea.creada`, `tarea.completada`, `tarea.eliminada` | Modify |
| 4.7 | Publicar eventos desde presupuestos | `presupuestos/presupuestos.service.ts` | `presupuesto.enviado`, `presupuesto.aceptado`, `presupuesto.eliminado` | Modify |
| 4.8 | Publicar eventos desde pagos | `pagos/pagos.service.ts` | `pago.recibido` | Modify |
| 4.9 | Publicar eventos desde contactos/usuarios | `client-auth/client-auth.service.ts`, `auth/auth.service.ts` | `usuario.registrado`, `usuario.actualizado` | Modify |
| 4.10 | Publicar eventos desde ActivityTimeline | `activity-timeline/activity-timeline.service.ts` | `actividad.registrada` (eventos recientes buscables) | Modify |

**Expected Commands:**
```bash
pnpm --filter api test
pnpm --filter api lint
pnpm turbo build --filter=api
```

**Acceptance Criteria:**
- [ ] Todos los módulos de dominio publican eventos sin conocer SearchModule
- [ ] Cada publicación está dentro de try/catch (nunca rompe la operación de dominio)
- [ ] La suite completa de tests de api sigue pasando
- [ ] Los eventos incluyen `entityType`, `entityId`, `tenantId` y datos relevantes

---

## Phase 5: Frontend — CommandPalette + Ctrl+K

**Objetivo:** Implementar la interfaz de usuario del buscador global con `Ctrl+K`, typeahead, resultados agrupados y navegación por teclado.

**Dependencias:** Phase 3 (endpoint `/api/v1/search` funcional)

**Riesgo:** Bajo. cmdk es una librería madura. La integración con el layout es limpia.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 5.1 | Create `CommandPalette` component | `apps/tenant-web/src/components/search/command-palette.tsx` | Componente `CommandPalette` con `cmdk`. Abre con `Ctrl+K`. Input de búsqueda con debounce 300ms. Resultados agrupados por `entityType`. Keyboard-first (flechas, Enter, Escape). | Component |
| 5.2 | Create `useSearch` hook | `apps/tenant-web/src/hooks/use-search.ts` | Hook `useSearch(query, filters)` con debounce, estados `loading/results/empty/error`, llamada a `GET /api/v1/search`. | Hook |
| 5.3 | Add frontend types | `apps/tenant-web/src/lib/api-types.ts` | Tipos `SearchResult`, `SearchGroup`, `SearchResponse` (importados o replicados de `packages/shared/`). | Types |
| 5.4 | Mount CommandPalette in layout | `apps/tenant-web/src/components/layout/sidebar-layout.tsx` | `CommandPalette` montado a nivel de layout. Disponible globalmente. | Layout |
| 5.5 | Component tests | `apps/tenant-web/src/components/search/command-palette.test.tsx` | Render, Ctrl+K open/close, keyboard navigation, selección, resultados vacíos. | Testing |
| 5.6 | Hook tests | `apps/tenant-web/src/hooks/use-search.test.ts` | Debounce, loading state, results, empty, error, refetch. | Testing |

**Expected Commands:**
```bash
pnpm --filter tenant-web test search
pnpm --filter tenant-web lint
pnpm turbo build --filter=tenant-web
```

**Acceptance Criteria:**
- [ ] `Ctrl+K` abre y cierra la palette
- [ ] Typeahead muestra resultados en <500ms
- [ ] Navegación por teclado (flechas + Enter) funciona
- [ ] Escape cierra la palette
- [ ] Resultados se agrupan por tipo de entidad
- [ ] `pnpm turbo build --filter=tenant-web` pasa

---

## Phase 6: Testing — Doorbell, Integration, Regression

**Objetivo:** Completar la cobertura de tests de integración, doorbell (aislamiento multi-tenant) y regresión del registry de eventos.

**Dependencias:** Phases 1–5

**Riesgo:** Medio. Los doorbell tests requieren base de datos real. Si no hay DB disponible, se skippean.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 6.1 | Integration tests — Search API | `apps/api/test/integration/search.spec.ts` | Happy path: resultados encontrados. Empty query: 400. Sin resultados: 200 con array vacío. Filtro por `type`. Paginación. | Testing |
| 6.2 | Doorbell test — cross-tenant isolation | `apps/api/test/doorbell/search-cross-tenant-isolation.spec.ts` | Tenant A indexa datos. Tenant B busca: 0 resultados de A. | Testing |
| 6.3 | Doorbell test — cross-client isolation | `apps/api/test/doorbell/search-cross-client-isolation.spec.ts` | Cliente A indexa datos. Cliente B busca: 0 resultados de A dentro del mismo tenant. | Testing |
| 6.4 | Regression — event registry coverage | `apps/api/test/doorbell/search-event-registry.spec.ts` | Verifica que cada `entityType` esperado tiene al menos un test que lo cubre. | Testing |
| 6.5 | Full suite verification | Todas las suites | `pnpm test` completo, `pnpm lint`, `pnpm turbo build` | Verification |

**Expected Commands:**
```bash
pnpm --filter api test search
pnpm --filter api test:e2e -- search
pnpm --filter api lint
pnpm test
pnpm turbo build
```

**Acceptance Criteria:**
- [ ] Tests de integración cubren happy path + errores + edge cases
- [ ] Doorbell tests prueban aislamiento cross-tenant y cross-client
- [ ] Regression test verifica cobertura del registry
- [ ] Suite completa pasa (excluyendo fallos pre-existentes conocidos)

---

## Verify Readiness

### What Verify will check

| Area | Check |
|------|-------|
| **Working Set Accuracy** | ¿Todos los archivos del Working Set se crearon/modificaron? ¿Hay archivos fuera del Working Set? |
| **Architecture Compliance** | ¿SearchService depende de SearchEngine? ¿Ningún dominio conoce SearchModule? |
| **Spec Compliance** | ¿Ctrl+K funciona? ¿Resultados agrupados? ¿Multi-tenant aislado? |
| **Design Coherence** | ¿Se respetaron las decisiones arquitectónicas (event-driven, ownership)? |
| **Testing** | ¿Hay tests unitarios, de integración y doorbell? ¿El registry de eventos está cubierto? |

### Doorbell Tests Expected

| Test | File |
|------|------|
| Cross-tenant isolation | `apps/api/test/doorbell/search-cross-tenant-isolation.spec.ts` |
| Cross-client isolation | `apps/api/test/doorbell/search-cross-client-isolation.spec.ts` |
| Event registry coverage | `apps/api/test/doorbell/search-event-registry.spec.ts` |

### Possible Regressions

| Regresión | Causa posible | Mitigación |
|-----------|---------------|------------|
| Rendimiento de queries existentes | Índices GIN pesados en escritura | Los índices se crean en tabla nueva, no afectan tablas existentes |
| EventBus acopla módulos | Todos los módulos importan EventBus | EventBus es un servicio genérico, no específico de búsqueda |
| tsvector trigger en cada UPDATE | Trigger sin condición en campos de texto | Implementar trigger condicional en Apply |

### Metrics for Archive

| Metric | Expected source |
|--------|----------------|
| Working Set Accuracy | Design → Apply (comparación de archivos) |
| Verify Iterations | Número de ciclos Verify/Fix |
| Verify Discoveries | Issues encontrados durante Verify (Critical/Major/Minor) |
| Prediction Accuracy | Comparación de archivos, tests, comandos y dependencias predichos vs reales |
| Unexpected Files | Archivos creados fuera del Working Set |

---

## Resumen

| Métrica | Valor |
|---------|-------|
| **Fases** | 6 |
| **Tareas totales** | 26 |
| **Distribución** | Shared: 3 tareas / Backend: 17 tareas / Frontend: 6 tareas |
| **Riesgo principal** | EventBus debe estar correctamente configurado para no bloquear el dominio |
| **Riesgo secundario** | tsvector trigger SQL requiere decisión técnica durante Apply |
| **Design respetado** | ✅ Íntegramente. Ninguna decisión arquitectónica modificada. |
