# ADR-0006 — Universal Search Engine Architecture

- **Número ADR:** ADR-0006
- **Fecha:** 2026-07-19
- **Autor:** Sistema
- **Estado:** Proposed

---

## 1. Contexto

CRM-Master necesita un buscador global que indexe todas las entidades del CRM
(clientes, sistemas, documentos, incidencias, tareas, presupuestos, etc.) y
permita búsqueda typeahead con resultados agrupados desde un único punto de
entrada (`Ctrl+K`).

La solución debe:
- Soportar búsqueda full-text con ranking por relevancia.
- Ser multi-tenant con aislamiento completo entre tenants.
- Estar preparada para migrar a búsqueda semántica (embeddings, pgvector)
  sin rediseñar el módulo de búsqueda.
- Permitir añadir nuevos tipos de entidad sin modificar el motor de búsqueda.

## 2. Decisión

> **Decidimos** implementar un motor de búsqueda basado en PostgreSQL tsvector,
> con una abstracción `SearchEngine` que desacopla el servicio de búsqueda del
> motor concreto, **porque** tsvector proporciona búsqueda full-text, ranking
> y tolerancia tipográfica sin añadir infraestructura nueva (Elasticsearch,
> MeiliSearch, etc.), **aceptando que** para volúmenes superiores a 1M
> documentos por tenant será necesario evaluar una migración a pgvector o
> Elasticsearch.

### Abstracción SearchEngine

```typescript
interface SearchEngine {
  index(input: IndexSearchInput): Promise<void>;
  search(query: SearchQuery): Promise<SearchResultItem[]>;
  remove(entityType: string, entityId: string, tenantId: string): Promise<void>;
}
```

SearchService depende únicamente de esta interfaz.
- `TsVectorSearchEngine` (v1) — implementación con tsvector + GIN.
- `PgVectorSearchEngine` (futuro) — implementación con pgvector + búsqueda híbrida.

### Event-driven Indexing

Los módulos de dominio NO importan SearchModule. Publican eventos de dominio
(`EntityCreated`, `EntityUpdated`, `EntityDeleted`) que SearchModule consume
y decide si indexa.

### SearchModule como único propietario del índice

SearchModule es el único responsable de:
- Indexación, reindexación y eliminación de entradas.
- Estrategia de búsqueda y formato del índice.
- Decidir qué eventos de dominio se traducen en operaciones sobre el índice.

## 3. Consecuencias

### Positivas

- SearchService no depende de un motor concreto — migrar a pgvector requiere
  solo una nueva implementación de `SearchEngine`.
- El dominio no conoce SearchModule — añadir una entidad al índice no requiere
  modificar el buscador.
- Zero infraestructura nueva (PostgreSQL ya está en producción).

### Negativas

- tsvector no soporta búsqueda semántica. Cuando se necesite, habrá que migrar
  a pgvector o Elasticsearch manteniendo la misma interfaz `SearchEngine`.
- tsvector requiere triggers SQL o raw queries para poblar el campo tsvector
  (Prisma no lo soporta nativamente).
- Rendimiento de tsvector puede degradarse con >500K documentos por tenant.

## 4. Alternativas consideradas

### Alternativa A: Elasticsearch

- **Descripción:** Cluster Elasticsearch dedicado como motor de búsqueda.
- **Pros:** Escalabilidad horizontal, búsqueda semántica nativa, análisis
  de texto multilenguaje.
- **Contras:** Infraestructura nueva (cluster, networking, monitoreo).
  Sobredimensionado para la fase actual del producto.
- **Por qué se descartó:** Para el volumen esperado (<500K docs/tenant),
  tsvector es suficiente. Elasticsearch se evaluará en v2.

### Alternativa B: MeiliSearch

- **Descripción:** Motor de búsqueda embebido con zero configuración.
- **Pros:** Súper rápido (<50ms), typo tolerance nativa, fácil de operar.
- **Contras:** Sin búsqueda semántica, sin modelo de datos relacional,
  no escala multi-tenant sin instancias separadas.
- **Por qué se descartó:** No escalaría multi-tenant sin añadir complejidad
  operativa.

### Alternativa C: Búsqueda directa sobre tablas de dominio (sin índice)

- **Descripción:** Ejecutar `WHERE nombre ILIKE '%term%'` en cada tabla de
  dominio.
- **Pros:** Zero infraestructura, datos siempre actualizados.
- **Contras:** Sin ranking, sin tolerancia tipográfica, queries lentas en
  tablas grandes, sin agrupación de resultados.
- **Por qué se descartó:** No cumple los requisitos de rendimiento ni de UX.

## 5. Mitigaciones

- [ ] Si tsvector supera 500ms en queries, evaluar migración a pgvector.
- [ ] La columna `embedding vector(1536)?` ya está prevista en el schema para
      facilitar la migración futura.
- [ ] Monitorear tamaño de `search_entries` por tenant vía métrica de
      administración.

## 6. Impacto

- **Backend:** Nuevo módulo `SearchModule` con `SearchEngine` abstraction.
  12+ módulos de dominio modificados para publicar eventos.
- **Base de datos:** Nueva tabla `search_entries` con tsvector, índices GIN,
  y columna preparada para pgvector.
- **Frontend:** Nuevo componente `CommandPalette` con `Ctrl+K`.
- **Infraestructura:** Sin cambios.

## 7. Referencias

- `openspec/changes/SPEC-0010-universal-search/design.md` — Design APPROVED.
- `openspec/changes/SPEC-0010-universal-search/tasks.md` — Implementation tasks.
- ADR-0004: SDD Feature Freeze.
- ADR-0005: Global Activity Timeline (Publisher / Event Bus).
