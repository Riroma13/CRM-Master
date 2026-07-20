# ADR-0013: Activity Timeline Evolution — Async Ingestion, Event Type Registry, and Event Enrichment

- **Número ADR:** ADR-0013
- **Fecha:** 2026-07-20
- **Autor:** @gentle-ai
- **Estado:** `accepted`

---

## 1. Contexto

El módulo `activity-timeline` existe actualmente con un modelo Prisma `ActivityEvent`, endpoint `GET /api/v1/timeline`, servicio `publish()` síncrono, contratos compartidos en `packages/shared/src/activity-timeline/`, y 12+ módulos consumidores que inyectan `ActivityTimelineService` y llaman `this.activityTimeline.publish(envelope)`.

El módulo actual es funcional pero carece de:
- Ingestion asíncrona (hoy `publish()` escribe directamente en DB)
- Deduplicación por `eventId`
- Enriquecimiento post-persistencia
- Búsqueda full-text
- Paginación por cursor
- Registro gobernado de tipos de evento
- Visibilidad granular por evento

Este ADR documenta las decisiones arquitectónicas para evolucionar el módulo hacia una arquitectura híbrida sync→async, manteniendo backward compatibility absoluta con los 12+ consumidores existentes.

---

## 2. Decisiones

### 2.1 Append-only Event Storage

> **Decidimos** mantener la misma tabla `activity_events` en PostgreSQL con almacenamiento append-only (sin updates ni deletes), **porque** evolucionamos el módulo existente sin reemplazarlo, la misma base de datos ya está en producción, y no introducimos nuevas dependencias externas, **aceptando que** la tabla crecerá monótonamente y requerirá particionado mensual a escala (v2).

- Los eventos son inmutables una vez persistidos.
- El enriquecimiento post-persistencia actualiza columnas de metadatos (`subjectName`, `actorName`, `enriched`, `enrichedAt`, `searchVector`), pero no muta el evento original.
- Estrategia de particionado futuro: partición mensual por `createdAt`, particiones >12 meses archivadas.

### 2.2 Async Ingestion Evolution (Current Sync → Future Async)

> **Decidimos** implementar un modelo híbrido donde `publish()` mantiene su firma síncrona actual `(envelope: ActivityEventEnvelope): Promise<void>` pero internamente encola en BullMQ y retorna inmediatamente, **porque** los 12+ callers no deben cambiar su código, y la async ingestion permite deduplicación, enrichment, y mejor resiliencia, **aceptando que** los callers pierden la garantía de persistencia inmediata (el worker persiste asíncronamente).

Fases:
1. **PR-1 (actual):** Contratos compartidos, interfaces, ADR. Sin cambios de comportamiento.
2. **PR-2 (schema + BullMQ):** Migración de schema, dependencias BullMQ, worker de ingestion.
3. **PR-3 (enrichment):** EventEnricher pipeline.
4. **PR-4 (search API):** Full-text search + cursor pagination.
5. **PR-5 (tests + docs):** Doorbell tests, deprecation docs.

Flag de deprecación: `publish()` se marca como `@deprecated` en post-MVP. Se introduce `publishAsync()` que retorna `Promise<{ eventId: string }>`. Cada caller migra individualmente. En MVP+6, `publish()` se elimina.

### 2.3 EventTypeRegistry con Module Ownership

> **Decidimos** implementar un `EventTypeRegistry` (in-memory, inyectado vía DI) que permite a cada módulo registrar sus tipos de evento con metadata de ownership (module, description, category, since), **porque** reemplaza la dependencia exclusiva de un Zod enum estático por un patrón extensible donde cada módulo es dueño de sus tipos, **aceptando que** el registry es in-memory (se pierde en restart) y no tiene persistencia.

- Zod enum (`EventType`) se mantiene como validación base. El registry añade metadata de ownership.
- La validación Zod valida el string; el registry consulta quién es el dueño.
- Nuevos tipos de evento solo requieren: (a) añadir al Zod enum, (b) registrar en el registry.

### 2.4 EventEnricher Pipeline Pattern

> **Decidimos** implementar un pipeline de enriquecimiento post-persistencia mediante la interfaz `EventEnricher`, donde cada enriquecedor es un provider NestJS plugable registrado en un `EnricherRegistry`, **porque** el enriquecimiento no debe bloquear la ingestion (el evento ya está persistido), y el patrón pipeline permite composición y aislamiento de fallos, **aceptando que** los eventos pueden quedar sin enriquecer si un enricher falla permanentemente.

- El enrichment corre después de la persistencia (post-persist).
- Cada enricher implementa `{ name: string; enrich(event): Promise<ActivityEventEnvelope> }`.
- El pipeline itera sobre enriquecedores registrados. Fallos aislados: si un enricher falla, se loggea y se continúa con el siguiente.
- `enriched` flag + `enrichedAt` timestamp permiten identificar eventos no enriquecidos.

### 2.5 Search Strategy (GIN → Elasticsearch)

> **Decidimos** usar PostgreSQL GIN index sobre una columna `searchVector` (tsvector) para full-text search en MVP, con un plan deferred para migrar a Elasticsearch si el throughput excede 50K writes/s, **porque** GIN index es nativo de PostgreSQL, no requiere nueva infraestructura, y la migración a Elasticsearch es un cambio de implementación del search backend que no afecta el API de consulta, **aceptando que** GIN index tiene write amplification conocida (~1.2–2×) que puede degradar writes a alta concurrencia.

- `searchVector` se actualiza vía DB trigger (tsvector_update_trigger) concatenando `eventType`, `actor`, `subjectName`, `actorName`, y extracción JSONB-to-text de `payload`.
- El API de consulta (`SearchIndex` interface) abstrae el backend. Elasticsearch implementaría la misma interfaz.
- Migración deferred: se activa cuando monitoreo detecta >50K writes/s o latencia de búsqueda >500ms.

---

## 3. Consecuencias

### Positivas

- **Backward compatibilidad total:** Los 12+ módulos consumidores no cambian su código. El contrato `publish()` mantiene firma y semántica superficialmente idéntica.
- **Extensibilidad gobernada:** Nuevos tipos de evento se registran con metadata de ownership. Nuevos enriquecedores se implementan via interfaz sin tocar ingestion ni queries.
- **Resiliencia:** La ingestion asíncrona desacopla los publishers del almacenamiento. DLQ para eventos inválidos. Enriquecimiento no bloqueante.
- **Search sin infraestructura nueva:** GIN index en PostgreSQL existente. Elasticsearch es una evolución futura sin cambios de API.

### Negativas

- **Pérdida de garantía síncrona:** Los callers de `publish()` ya no tienen garantía de que el evento esté persistido al retornar. Se requiere auditoría de los 12+ callers para detectar dependencias de persistencia inmediata.
- **Complejidad operativa:** BullMQ añade dependencia de Redis, worker queue, DLQ, monitoreo. El equipo debe aprender a operar la cola.
- **GIN index write amplification:** A alta concurrencia (>50K writes/s), el GIN index puede degradar writes. Medir en staging.

---

## 4. Alternativas Consideradas

### Alternativa A: Renombrar módulo a `activity`

- **Descripción:** Renombrar el módulo y el path de API de `activity-timeline` a `activity`.
- **Pros:** Nombre más corto, más genérico.
- **Contras:** Breaking change para 12+ consumidores que importan `ActivityTimelineService`. Breaking change para API clients existentes en producción. Sin beneficio técnico.
- **Por qué se descartó:** Condición #1 del Architecture Review. No romper 12+ consumidores.

### Alternativa B: Event Store externo (EventStoreDB, Kafka)

- **Descripción:** Usar un event store dedicado separado de PostgreSQL.
- **Pros:** Event sourcing nativo, mejor rendimiento en escritura secuencial, particionado nativo.
- **Contras:** Nueva infraestructura, nueva dependencia externa, complejidad operativa adicional, migración de datos desde tabla existente.
- **Por qué se descartó:** Evolución, no reemplazo. Sin nueva dependencia externa en MVP. La tabla `activity_events` existente tiene datos que migrar.

### Alternativa C: Elasticsearch desde MVP

- **Descripción:** Implementar búsqueda full-text en Elasticsearch desde el inicio, sin GIN index intermedio.
- **Pros:** Full-text search superior, escalabilidad horizontal, aggregaciones nativas.
- **Contras:** Nueva dependencia de infraestructura, coste operativo, curva de aprendizaje. El volumen actual no lo justifica.
- **Por qué se descartó:** Condición #5 del AR. GIN index para MVP. Elasticsearch como plan deferred.

---

## 5. Mitigaciones

- [x] Auditoría de los 12+ callers de `publish()` para detectar dependencias de persistencia síncrona (pre-MVP).
- [ ] Medir throughput de GIN index en staging antes de activar full-text search en producción.
- [ ] Implementar health check de BullMQ queue (latency de processing, DLQ size).
- [ ] Documentar migración de `publish()` a `publishAsync()` con timeline post-MVP.

---

## 6. Impacto

- **Backend:** `activity-timeline` module: service, controller, worker, enrichers. Shared contracts: envelope, registry, enricher interface. Schema: nuevas columnas aditivas en `activity_events`.
- **Base de datos:** Nuevas columnas nullable/con default en `activity_events`. Nuevos índices (unique en `event_id`, GIN en `search_vector`).
- **Infraestructura:** BullMQ requiere Redis. Worker requiere registro en NestJS module.
- **Seguridad:** Columna `visibility` para control de acceso a nivel de evento. `forTenant()` scoping via Prisma Client Extension central.
- **Operaciones:** Monitoreo de cola BullMQ, DLQ, latency de enrichment, tamaño de tabla.

---

## 7. Referencias

- SPEC-0017: Activity Timeline Evolution (openspec)
- ADR-0004: SDD Feature Freeze Policy
- Architecture Review `architecture-review.md` — Verdict REJECTED → Refined per 6 conditions
- `packages/shared/src/activity-timeline/` — contratos compartidos
- `apps/api/src/modules/activity-timeline/` — módulo existente
