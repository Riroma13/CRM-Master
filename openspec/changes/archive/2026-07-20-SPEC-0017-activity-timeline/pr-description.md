# SPEC-0017 — Activity Timeline Evolution

## Summary

Evoluciona el módulo `activity-timeline` existente con ingestion asíncrona via
BullMQ, deduplicación por `eventId`, pipeline de enriquecimiento post-persistencia,
búsqueda full-text via GIN index, y paginación por cursor. **Zero breaking changes**
para los 12+ módulos consumidores — `publish()` mantiene su firma.

**14 archivos planificados | 24 tests (3 suites) | 24/24 tareas | 5 PRs stacked-to-main**

## Features

- **Hybrid sync→async ingestion**: `publish()` wrapper enqueue a BullMQ, worker
  persiste. 12+ callers sin cambios.
- **Deduplication**: `eventId` UUID + `ON CONFLICT DO NOTHING` para idempotencia.
- **Event enrichment pipeline**: Interface `EventEnricher` + `EnricherRegistry`
  con 2 enrichers default (entity-name, actor-name). Post-persistencia, no bloqueante.
- **Full-text search**: `GET /api/v1/timeline/search` con GIN index `tsvector`,
  cursor-based pagination, filtros combinados.
- **Event type registry**: `EventTypeRegistry` con metadata de ownership por módulo.
- **Backward compatible**: Schema additive, API additive, contratos extendidos con
  campos opcionales.
- **Cross-tenant isolation**: 4 doorbell tests que prueban que Tenant B no puede
  ver eventos de Tenant A via ningún endpoint.
- **Backward compat verified**: 6 tests que prueban que envelopes antiguos sin
  nuevos campos siguen funcionando.

## Architecture

- Schema: 9 nuevas columnas aditivas (eventId, correlationId, causationId, visibility,
  subjectName, actorName, searchVector, enriched, enrichedAt) + 2 nuevos índices.
- Shared contracts: Envelope extendido con campos opcionales (Zod), interface
  EventEnricher, clase EventTypeRegistry.
- BullMQ: Queue `activity-timeline:ingestion` + DLQ. Worker con re-validación,
  dedup, persistencia via `forTenant()`, enrichment post-persistencia.
- Search: `search()` via raw SQL con tsquery + cursor pagination.
- API: Nuevo endpoint `GET /api/v1/timeline/search` además del existente
  `GET /api/v1/timeline`.

### Implementation (5 stacked PRs)

- PR-1 — Schema migration + shared contracts + EventTypeRegistry
- PR-2 — BullMQ setup + publish() wrapper + async worker
- PR-3 — Enricher pipeline + 2 default enrichers
- PR-4 — Full-text search + GET /api/v1/timeline/search
- PR-5 — Doorbell tests + backward compat + verify + archive

## Verification

| Metric | Value |
|--------|-------|
| Working Set Accuracy | 100% |
| Prediction Accuracy | 100% |
| Critical Discoveries | 0 |
| Major Discoveries | 0 |
| Minor Discoveries | 0 |
| Build | ✅ |
| Tests | 24/24 |
| Architecture decisions | 10 (AD-001 to AD-010) |

## Documentation

- design.md
- tasks.md
- verify-report.md
- archive-report.md
- pr-description.md

## Status

✅ Ready for merge — PR-5 (final)

---

## Related Artifacts

- [design.md](../../../../openspec/changes/SPEC-0017-activity-timeline/design.md)
- [tasks.md](../../../../openspec/changes/SPEC-0017-activity-timeline/tasks.md)
- [verify-report.md](../../../../openspec/changes/SPEC-0017-activity-timeline/verify-report.md)
- [archive-report.md](archive-report.md)
- [pr-description.md](pr-description.md)

---

## Navigation

← [archive-report.md](archive-report.md)
