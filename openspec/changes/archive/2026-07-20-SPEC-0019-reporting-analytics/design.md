# Design: SPEC-0019 — Reporting & Analytics

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Platform Baseline:** sdd-v2.1-baseline
> **Estado:** Design Refinement — Architecture Review resolved

---

## 1. Executive Summary

CRM-Master carece de una plataforma unificada de reporting y analytics.
Los KPIs de negocio se calculan ad-hoc consultando tablas operacionales,
los dashboards no existen, y la capacidad de hacer análisis de tendencias,
embudos o comparaciones requiere ingeniería manual cada vez.

**Reporting & Analytics** es una plataforma read-only que nunca posee datos
de negocio. Consume eventos, proyecciones y read models generados por otras
plataformas (Workflow, Notification, Activity Timeline, Audit, Communication,
Document, Integration, Automation, CRM Core). Proporciona dashboards,
reportes tabulares, KPIs configurables (evaluados con `SafeEvalStrategy`
mediante `expr-eval` Parser de scope restringido), exportaciones asíncronas
(con almacenamiento tenant-aislado en `exports/{tenantId}/{jobId}.{format}`),
un motor de agregaciones OLAP-style con caching via snapshots TTL-based y
stale-while-revalidate, y detección de eventos perdidos mediante un log
append-only con reconciliación periódica.

El impacto esperado es eliminar las consultas analíticas sobre tablas
operacionales, proporcionar una fuente única de métricas de negocio, y
permitir a los tenants crear dashboards y reportes sin escribir código.

---

## 2. Technical Approach

El Reporting & Analytics Platform se organiza en ocho capas:

1. **Data Ingestion Pipeline** — consumidores asíncronos (BullMQ) que
   reciben eventos de dominio y actualizan `AnalyticsDataset` (tablas de
   agregación). Nunca consulta tablas operacionales directamente. Cada
   evento recibido se registra en `DatasetIngestionLog` (append-only) para
   detección de eventos perdidos y reconciliación periódica.

2. **Analytics Dataset** — tablas planas desnormalizadas que almacenan
   agregaciones precomputadas por día (granularidad default). Hourly se
   computa mediante window functions sobre daily. Monthly se computa
   mediante agregación sobre daily. Particionadas por `RANGE (window_start)`
   mediante raw SQL (la definición lógica en Prisma no incluye `PARTITION BY`).
   Son la única fuente para queries analíticas.

3. **KPI Engine** — calcula KPIs configurables desde datasets mediante
   `SafeEvalStrategy` (expr-eval `Parser` con scope restringido a solo
   `+ - * / ( )` y nombres de métricas conocidos de `AnalyticsDataset`).
   Cada KPI se evalúa con try/catch aislado — un KPI fallido retorna
   `status: 'error'` sin afectar a los demás. Soporta targets, thresholds,
   alertas y evolución histórica. Los KPIs se cachean con TTL configurable.
   `RestrictedScriptStrategy` disponible en el futuro con aprobación explícita.

4. **Report Engine** — genera reportes tabulares con agrupaciones, filtros,
   time-series, rolling windows, funnel analysis y exportación asíncrona.

5. **Dashboard Engine** — renderiza dashboards con widgets (KPI cards,
   charts, tablas, trend lines). Usa `DashboardHydrator` que resuelve todos
   los widgets en paralelo (Promise.all) con cache multi-get, eliminando
   el patrón N+1 de resolución secuencial de widgets.

6. **Scheduling & Export** — programa reportes recurrentes (cron), genera
   exportaciones en PDF/Excel/CSV/JSON con almacenamiento en
   `exports/{tenantId}/{jobId}.{format}`, y las entrega por email o webhook
   mediante endpoint controlado que valida tenantId del contexto auth.

7. **Snapshot & Cache** — genera `AnalyticsSnapshot` con TTL-based
   expiration. Implementa stale-while-revalidate: sirve snapshot expirado
   mientras se refresca en background. Sin invalidación por evento.

8. **DashboardHydrator** — capa de resolución batch de widgets. Dado un
   layout de dashboard, orquesta todas las queries de datos en paralelo con
   cache multi-get, y batch de queries a datasets cuando todos son cache MISS.

```
Data Sources (SPEC-0011-0018, CRM Core) — via DatasetPublisher
       │
       ▼
Data Ingestion Pipeline (BullMQ) → DatasetIngestionLog (append-only)
       │
       ▼
AnalyticsDataset (aggregation tables, PARTITION BY RANGE, daily default)
       │
       ├──→ KPI Engine (SafeEvalStrategy) ──→ KPI (cached, with targets & thresholds)
       │
       ├──→ Report Engine ──→ Report (tabular, charts, exports)
       │
       ├──→ Dashboard Engine ──→ DashboardHydrator ──→ Dashboard (widgets resolved in parallel)
       │
       └──→ Snapshot & Cache (TTL-based, stale-while-revalidate) ──→ AnalyticsSnapshot
                │
                ▼
         Scheduling & Export (cron, exports/{tenantId}/{jobId}.{format})
```

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Data storage | Operational tables, Separate aggregation tables, Data warehouse, OLAP cube | **Separate aggregation tables (AnalyticsDataset)** | Nunca toca tablas operacionales. Datasets planos desnormalizados optimizados para queries analíticas. |
| Ingestion | Direct query, CDC stream, Event-driven, Batch ETL | **Event-driven (BullMQ)** | Misma infraestructura que el resto del plataforma. Los eventos de dominio actualizan datasets incrementalmente. |
| Caching | Materialized views, Redis, In-memory, Query cache | **AnalyticsSnapshot (materialized views)** | Los snapshots son precomputados con TTL-based expiration. Redis para KPI cache. Stale-while-revalidate para servir datos durante refresh. |
| Aggregation | On-query, Precomputed, Hybrid | **Precomputed (daily default, hourly/monthly via window functions)** | Almacenar solo daily por defecto. Hourly se computa desde daily con window functions. Monthly desde daily con agregación. Otras granularidades solo bajo demanda. |
| Dashboard rendering | Server-side, Client-side, SSR | **Server-side API + client-side rendering** | El backend sirve datos agregados via API. DashboardHydrator resuelve widgets en paralelo. El frontend renderiza widgets. Sin SSR complejo. |
| Export generation | Síncrono, Asíncrono (BullMQ), Híbrido | **Asíncrono (BullMQ)** | Reportes grandes pueden tomar minutos. El usuario recibe una notificación cuando el export está listo. Almacenamiento en `exports/{tenantId}/{jobId}.{format}`. |
| KPI storage | Stored in DB, Computed on query, Cached with TTL | **Cached with TTL** | Los KPIs se precalculan con TTL configurable (default 5 min). Targets y thresholds se guardan en `KPI` model. |
| Time-series storage | Separate time-series DB, PostgreSQL with BRIN, Columnar | **PostgreSQL with BRIN + composite indexes** | Misma base que el plataforma. BRIN en `timestamp` para time-series. B-tree en `(tenantId, metricName)`. |
| KPI evaluation | mathjs.evaluate, expr-eval, Custom DSL, Fixed formulas | **SafeEvalStrategy (expr-eval Parser with restricted scope)** | `mathjs.evaluate` es RCE. expr-eval `Parser` con scope limitado a `+ - * / ( )` y nombres de métrica conocidos. Cada KPI con try/catch aislado. |
| Read-only enforcement | None, Prisma middleware, DB triggers, Separate DB role | **3-layer enforcement** | (1) Prisma middleware: bloquea queries a modelos fuera del allowlist reporting. (2) DB role `reporting_app`: solo SELECT + INSERT en tablas reporting. (3) Política explícita en documentación. Mismo patrón que SPEC-0018. |
| Partitioning implementation | Prisma schema, Raw SQL migrations, Hybrid | **Raw SQL migrations** | Prisma no soporta `PARTITION BY`. El schema Prisma es la definición lógica únicamente. Las tablas reales se crean via `CREATE TABLE ... PARTITION BY RANGE (window_start)`. Gestión de particiones fuera de Prisma. |
| Snapshot invalidation | Event-driven, TTL-based, Hybrid | **TTL-based + stale-while-revalidate** | Los snapshots expiran por TTL configurable, no por evento. Stale-while-revalidate: sirve dato expirado mientras se refresca en background. Evita cache stampede. |
| Storage granularity | Hourly + daily + monthly pre-stored, Daily only + compute on demand | **Daily default, hourly/monthly computed** | Almacenar daily por defecto. Hourly via window functions. Monthly via aggregation. Otras granularidades solo bajo demanda. Reduce amplificación de almacenamiento 3×. |

---

## 4. Data Flow

```
Ingest event → update dataset:

Module event (via BullMQ)
       │
       ├── Log event to DatasetIngestionLog (append-only)
       ├── Identify affected AnalyticsDataset
       ├── Update aggregation: increment counters, update rolling windows
       ├── Update last timestamp
       └── Acknowledge

Query KPI:

Client → GET /api/v1/reporting/kpis?tenantId=X&name=Y
       │
       ├── Check cache (TTL valid)
       │     ├── HIT → return cached
       │     └── MISS → compute from AnalyticsDataset
       │
       ├── Evaluate formula via SafeEvalStrategy (expr-eval Parser)
       │     └── try/catch aislado por KPI → status: 'error' on failure
       ├── Compare with target/threshold
       ├── Store in cache with TTL
       └── Return KPI value + target + status

Generate report:

Client → POST /api/v1/reporting/reports/generate
       │
       ├── Create ReportExecution (PENDING)
       ├── Queue in BullMQ (reporting:generate)
       └── Return executionId

Worker picks up report generation
       │
       ├── Load ReportDefinition
       ├── Query AnalyticsDataset(s)
       ├── Apply aggregations, filters, groupings
       ├── Generate output (tabular, chart data)
       ├── Update ReportExecution (COMPLETED)
       └── Notify user via SPEC-0016 (Notification Center)

Export dashboard:

Client → POST /api/v1/reporting/export
       │
       ├── Create ExportJob (PENDING)
       ├── Queue in BullMQ (reporting:export)
       └── Return jobId

Worker:
       ├── Query dashboard KPIs + charts
       ├── Render format (PDF/Excel/CSV/JSON)
       ├── Store export file at exports/{tenantId}/{jobId}.{format}
       └── Update ExportJob (COMPLETED)

Download export:

Client → GET /api/v1/reporting/exports/{jobId}/download
       │
       ├── Load ExportJob
       ├── Validate tenantId from auth context matches ExportJob.tenantId
       ├── Stream file from exports/{tenantId}/{jobId}.{format}
       └── Return file with Content-Disposition header

Reconciliation (periodic cron):

Scheduler → Check AnalyticsDataset per tenant per window
       │
       ├── Query DatasetIngestionLog: count events received per window
       ├── Query AnalyticsDataset: count actual aggregated records
       ├── Compare: expected vs actual
       ├── If mismatch → log alert → optional auto-replay
       └── Update reconciliation status

Replay lost events:

Client → POST /api/v1/reporting/datasets/{name}/replay?from=...&to=...
       │
       ├── Validate authorization (admin only)
       ├── Query DatasetIngestionLog for events in window with status='received'
       ├── Re-process each event (idempotent UPSERT)
       └── Return replayed event count
```

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add AnalyticsDataset, AnalyticsSnapshot, KPI, ReportDefinition, Dashboard, DashboardWidget, ReportExecution, ExportJob, DatasetIngestionLog models |
| 2 | `packages/shared/src/reporting/` | Create | Types: KPI, ReportDefinition, Dashboard, Widget, Dataset, Snapshot, Export, DatasetPublisher, KpiEvaluationStrategy, ExportContext, DashboardHydrator |
| 3 | `packages/shared/src/reporting/index.ts` | Create | Re-export |
| 4 | `apps/api/src/modules/reporting/reporting.module.ts` | Create | NestJS module |
| 5 | `apps/api/src/modules/reporting/reporting.service.ts` | Create | Core engine |
| 6 | `apps/api/src/modules/reporting/reporting.controller.ts` | Create | REST API |
| 7 | `apps/api/src/modules/reporting/kpi/kpi-engine.ts` | Create | KPI calculation with SafeEvalStrategy |
| 8 | `apps/api/src/modules/reporting/report/report-engine.ts` | Create | Report generation |
| 9 | `apps/api/src/modules/reporting/dashboard/dashboard-engine.ts` | Create | Dashboard layout + data |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 10 | `apps/api/src/modules/reporting/ingestion/dataset-ingestion.service.ts` | Create | BullMQ consumer for dataset updates |
| 11 | `apps/api/src/modules/reporting/ingestion/dataset-ingestion-log.service.ts` | Create | Append-only event log + reconciliation |
| 12 | `apps/api/src/modules/reporting/snapshot/snapshot.service.ts` | Create | Materialized view management with TTL-based expiration |
| 13 | `apps/api/src/modules/reporting/export/export.service.ts` | Create | Async export generation with tenant-scoped storage |
| 14 | `apps/api/src/modules/reporting/export/pdf-exporter.ts` | Create | PDF format |
| 15 | `apps/api/src/modules/reporting/export/excel-exporter.ts` | Create | Excel format |
| 16 | `apps/api/src/modules/reporting/export/csv-exporter.ts` | Create | CSV format |
| 17 | `apps/api/src/modules/reporting/scheduling/scheduling.service.ts` | Create | Cron scheduling |
| 18 | `apps/api/src/modules/reporting/guards/reporting.guard.ts` | Create | Tenant isolation |
| 19 | `apps/api/src/modules/reporting/reporting-read-only.middleware.ts` | Create | Prisma middleware: block queries to non-reporting models |
| 20 | `apps/api/src/modules/reporting/dashboard/dashboard-hydrator.ts` | Create | Batch widget data resolution |
| 21 | `apps/api/src/modules/reporting/kpi/safe-eval-strategy.ts` | Create | expr-eval Parser restricted scope |
| 22 | `apps/api/src/modules/reporting/reporting.dataset-publisher.ts` | Create | DatasetPublisher interface implementation |
| 23 | `packages/database/scripts/reporting-partitions.sql` | Create | Raw SQL partition management |
| 24 | `apps/api/src/modules/core/core.module.ts` | Modify | Import ReportingModule |

### 5.3 Expected NOT to Change

- Cualquier módulo de negocio (Workflow, Notification, Activity, Audit, Communication, Document, Integration, Automation) — el reporting consume sus eventos, no los modifica
- Frontend — SPEC separada
- Tablas operacionales — el reporting nunca las consulta

---

## 6. Read Order

1. `packages/shared/src/reporting/` — tipos base y contratos
2. `packages/database/prisma/schema.prisma` — modelos existentes + nuevos
3. `packages/database/scripts/reporting-partitions.sql` — raw SQL partitioning
4. `apps/api/src/modules/reporting/ingestion/dataset-ingestion.service.ts` — ingestion
5. `apps/api/src/modules/reporting/ingestion/dataset-ingestion-log.service.ts` — event log
6. `apps/api/src/modules/reporting/kpi/kpi-engine.ts` — KPI calculation
7. `apps/api/src/modules/reporting/report/report-engine.ts` — report generation
8. `apps/api/src/modules/reporting/dashboard/dashboard-engine.ts` — dashboards
9. `apps/api/src/modules/reporting/dashboard/dashboard-hydrator.ts` — batch widget resolution
10. `apps/api/src/modules/reporting/reporting.controller.ts` — API

---

## 7. Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_reporting_tables
pnpm --filter database generate
pnpm --filter database prisma migrate dev --name add_reporting_partitions --create-only
# Edit the generated migration SQL to include PARTITION BY RANGE
pnpm --filter api test reporting
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** High

El patrón de datasets desnormalizados alimentados por eventos asíncronos
es la arquitectura estándar de sistemas de reporting (similar a Metabase,
Grafana, o un data mart ligero). La ingestion event-driven sigue el mismo
patrón que SPEC-0017 y SPEC-0018. Los KPIs cacheados con TTL evitan
cálculos redundantes. Las exportaciones asíncronas siguen el patrón de
SPEC-0016 (generación batch). Las mejoras del Architecture Review
(safe evaluation, read-only enforcement, lost event detection, TTL-based
snapshots, batch widget resolution) fortalecen la seguridad y robustez
sin alterar la arquitectura.

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 4 | Patrones de publicación de eventos en módulos existentes |
| Files to read | 6 | Schema, shared contracts, módulos existentes |
| Files to create | 22 | Module, service, controller, engines, ingestion, export, scheduling, guards, middleware, hydrator, strategy, SQL script |
| Files to modify | 2 | schema.prisma, core.module.ts |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Datasets se desincronizan con fuentes de datos | Media | Alto | Refresh incremental programado + validación periódica de consistencia. DatasetIngestionLog con reconciliación expected vs actual. Alertas si un dataset no se actualiza en >1 hora. Replay endpoint para reprocesar ventanas. |
| KPI cache TTL demasiado largo muestra datos obsoletos | Baja | Medio | TTL configurable por KPI (default 5 min). Forzar refresh manual vía API. Stale-while-revalidate sirve datos mientras refresca. |
| Exportaciones grandes agotan memoria del worker | Baja | Alto | Streaming exports. Límite de filas por export (default 100K). Chunking para datasets grandes. |
| Dashboard con muchos widgets degrada rendimiento | Baja | Medio | DashboardHydrator resuelve widgets en paralelo. Cache individual por widget con multi-get. Límite de widgets por dashboard. |
| Evento perdido por fallo de BullMQ o worker no detectado | Baja | Alto | DatasetIngestionLog append-only registra cada evento. Reconciliación periódica compara expected vs actual counts. Replay endpoint permite reprocesar ventanas temporales. |
| KPI formula maliciosa a pesar de restricciones | Baja | Alto | SafeEvalStrategy limita scope a operadores `+ - * / ( )` y nombres de métrica conocidos. No permite strings, objects, funciones, ni acceso a prototipos. Cada KPI con try/catch aislado. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — KPI Engine | Formula evaluation via SafeEvalStrategy, target comparison, threshold alerts, TTL cache, error isolation | Jest |
| Unit — Report Engine | Aggregation, grouping, filtering, rolling windows, funnel | Jest |
| Unit — Export | PDF/CSV/JSON generation, async lifecycle, ExportContext validation | Jest |
| Unit — DashboardHydrator | Parallel widget resolution, cache multi-get, batch dataset queries | Jest |
| Unit — Read-only middleware | Blocked vs allowed models, error on update/delete | Jest |
| Integration — API | CRUD dashboards, KPI query, report generation, export, download endpoint | supertest |
| Integration — Ingestion | BullMQ → dataset update → DatasetIngestionLog → reconciliation | Jest + BullMQ mock |
| Integration — Replay | Rollback and replay events from DatasetIngestionLog | Jest |
| Doorbell | Tenant A dashboards/KPIs no visibles para Tenant B | E2E |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `reporting-cross-tenant-isolation.spec.ts` | Tenant A cannot see Tenant B's dashboards, KPIs, reports, or exports |
| `reporting-dataset-isolation.spec.ts` | Tenant A's event ingestion does not affect Tenant B's datasets |
| `reporting-read-only.spec.ts` | Reporting Prisma middleware blocks queries to non-allowlisted models |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0015 | Documentar la arquitectura del Reporting & Analytics Platform, datasets desnormalizados, KPI engine, y la separación de tablas operacionales. | Proposed |

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `AnalyticsDataset` | ReportingModule | Agregaciones precomputadas, nunca datos operacionales |
| `KpiEngine` | ReportingModule | Cálculo de KPIs con SafeEvalStrategy y caching |
| `ReportEngine` | ReportingModule | Generación de reportes |
| `DashboardEngine` | ReportingModule | Layout + data de dashboards |
| `DashboardHydrator` | ReportingModule | Resolución batch de widgets en paralelo |
| `DatasetIngestionLog` | ReportingModule | Log append-only de eventos recibidos para reconciliación |
| `ReportingReadOnlyMiddleware` | ReportingModule | Prisma middleware bloquea queries a modelos no reporting |
| Data production | Respective modules | Emiten eventos que el reporting consume via DatasetPublisher |
| Operational data | Respective modules | Nunca consultados por el reporting |

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| New report type | Implementar `ReportTypeRenderer` + registrar | Days |
| New widget type | Implementar `WidgetRenderer` + registrar en dashboard engine | Days |
| New export format | Implementar `Exporter` interface + registrar | Days |
| New KPI formula | Configurable via `KPI.formula` (expresión evaluable via SafeEvalStrategy). Sin código nuevo. | Hours |
| Restricted script KPI | Implementar `RestrictedScriptStrategy` con sandbox más potente (aprobación explícita requerida) | Days |
| Custom aggregation engine | Implementar `AggregationStrategy` + registrar | Weeks |
| Direct SQL dataset | Implementar `DatasetProvider` que ejecuta SQL sobre datasets (nunca tablas operacionales) | Days |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× (100 tenants) | 100× (1000 tenants) | Mitigation |
|--------|-------------------|---------------------|------------|
| AnalyticsDataset storage | ~10 GB | ~100 GB | Partición por RANGE (window_start). Archive >12 meses. Solo daily por defecto. |
| KPI queries | <10ms (cached) | <20ms | Cached with TTL. Redis si escala. SafeEvalStrategy overhead insignificante. |
| Report generation | <5s | <30s | Async via BullMQ. Workers escalan horizontalmente. |
| Dashboard loading | <500ms | <2s | DashboardHydrator con Promise.all + cache multi-get. Lazy loading. |
| Export generation | <30s | <5min | Chunking + streaming. Notificación async al completar. |

**Decision:** El reporting escala horizontalmente con workers estateless. Los KPIs cacheados evitan carga en datasets. Las exportaciones asíncronas evitan timeouts. El cuello de botella es el refresh de datasets — mitigado con refresh incremental y reconciliación periódica via DatasetIngestionLog. La granularidad daily default reduce el almacenamiento 3× frente a hourly+daily+monthly.

### B. Open/Closed Principle (OCP)

**Point of extension:** `ReportTypeRenderer`, `WidgetRenderer`, `Exporter`, `AggregationStrategy`, `KpiEvaluationStrategy`.

**What must change to add a new report type:** Implementar `ReportTypeRenderer` interface + registrar. Cero cambios en report engine.

**What must change to add a new export format:** Implementar `Exporter` interface + registrar. Cero cambios en export service.

**What must change to add a new widget:** Implementar `WidgetRenderer` interface + registrar en dashboard engine. Cero cambios.

**What must change to add a new KPI evaluation strategy:** Implementar `KpiEvaluationStrategy` interface + registrar en KPI engine. Cero cambios en KPI engine.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| AnalyticsDataset | ReportingModule | KPI Engine, Report Engine, Dashboard Engine |
| KPI definitions | ReportingModule | KPI Engine, Dashboard |
| Dashboard layouts | ReportingModule | Dashboard Engine |
| Report definitions | ReportingModule | Report Engine |
| DatasetIngestionLog | ReportingModule | Reconciliation, Replay |
| Read-only enforcement | ReportingModule | All reporting operations |
| Operational data | Respective modules | Never consumed directly |

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| AnalyticsDataset (daily) | 12 meses | Archive mensual | Drop >12 meses |
| AnalyticsDataset (monthly) | 3 años | Archive anual | Drop >3 años |
| AnalyticsDataset (hourly) | Computed on demand from daily | — | No almacenado directamente |
| AnalyticsDataset (custom) | Según requisito del reporte | — | Drop cuando el reporte se elimina |
| KPI cache | TTL configurable (default 5 min) | — | Expira por TTL |
| Report executions | 90 días | — | Eliminar >90 días |
| Export files | 7 días | — | Eliminar >7 días |
| DatasetIngestionLog | 90 días | — | Eliminar >90 días |

**Granularity degradation policy:** La API degrada automáticamente la granularidad solicitada según la ventana de datos disponible. Sub-monthly (hourly, daily) solo está disponible para los últimos 12 meses. Para datos más antiguos, la API retorna automáticamente granularidad monthly. El cliente recibe un header `X-Granularity-Degraded: true` cuando esto ocurre.

### E. Idempotency

| Operation | Duplicate risk | Protection |
|-----------|---------------|------------|
| `dataset.ingest()` | Alta (retry del worker) | Dataset update es UPSERT por (tenantId, metricName, timestamp). DatasetIngestionLog registra cada recepción con idempotency key. |
| `kpi.compute()` | Baja | Reemplaza valor anterior. Idempotente por naturaleza. |
| `report.generate()` | Media | ReportExecution ID unique. Duplicado crea segunda ejecución. |
| `export.create()` | Media | ExportJob ID unique. Misma protección. |
| `replay.events()` | Alta | Re-procesa eventos que son UPSERT idempotente. DatasetIngestionLog evita doble conteo. |

### F. Shared Contracts

| Contract | Location | Consumers |
|----------|----------|-----------|
| `KpiDefinition` | `packages/shared/src/reporting/` | KPI Engine, Dashboard |
| `ReportDefinition` | `packages/shared/src/reporting/` | Report Engine |
| `Dashboard` | `packages/shared/src/reporting/` | Dashboard Engine |
| `DatasetEvent` | `packages/shared/src/reporting/` | Data Ingestion |
| `DatasetPublisher` | `packages/shared/src/reporting/` | Respective modules (Workflow, Notification, Activity, Audit, Communication, Document, Integration) |
| `KpiEvaluationStrategy` | `packages/shared/src/reporting/` | KPI Engine |
| `ExportContext` | `packages/shared/src/reporting/` | Exporter implementations |
| `DashboardHydrator` | `packages/shared/src/reporting/` | Dashboard Engine |

### G. Partitioning Strategy

**Decision:** Las tablas de reporting se particionan mediante raw SQL. El schema Prisma contiene solo la definición lógica de las tablas — sin `PARTITION BY`. Las tablas reales se crean en migraciones SQL manuales.

`AnalyticsDataset` se particiona por `RANGE (window_start)`:
- Particiones mensuales: `analytics_datasets_2024_01`, `analytics_datasets_2024_02`, etc.
- Cada partición cubre un mes de datos.
- `AnalyticsSnapshot` y `ReportExecution` siguen el mismo patrón de partición por mes.

**Archivo de migración:** `packages/database/scripts/reporting-partitions.sql`

Este script contiene:
- `CREATE TABLE analytics_datasets (...) PARTITION BY RANGE (window_start)`
- Comandos `CREATE TABLE analytics_datasets_YYYY_MM PARTITION OF analytics_datasets FOR VALUES FROM (...) TO (...)`
- `CREATE TABLE analytics_snapshots (...) PARTITION BY RANGE (window_start)`
- Comandos `CREATE TABLE analytics_snapshots_YYYY_MM PARTITION OF analytics_snapshots FOR VALUES FROM (...) TO (...)` (si aplica)
- `CREATE TABLE report_executions (...) PARTITION BY RANGE (created_at)` (si aplica)

**Gestión de particiones:** Las operaciones `CREATE`, `ATTACH`, `DETACH` y `DROP` de particiones se realizan fuera de Prisma, mediante scripts SQL programados (cron mensual). No se gestionan via Prisma migrations. El pipeline de particiones es responsabilidad del `SchedulingService`.

**Tamaño de partición esperado:** ~10 GB por tenant por mes en el pico. Las particiones antiguas (>12 meses) se detach y archivean a almacenamiento de bajo costo. Las particiones >3 años se dropean.

---

## 16. Interfaces / Contracts

```typescript
// ─── Core Types ────────────────────────────────────

export type MetricAggregation = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct' | 'percentile';

export type TimeGranularity = 'hour' | 'day' | 'week' | 'month';

export type KpiStatus = 'on_target' | 'warning' | 'critical' | 'no_data' | 'error';

export type WidgetType = 'kpi-card' | 'line-chart' | 'bar-chart' | 'pie-chart' | 'table' | 'trend';

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';

// ─── KPI Evaluation Strategy ───────────────────────

export type AllowedOperator = '+' | '-' | '*' | '/' | '(' | ')';

export interface KpiEvaluationStrategy {
  readonly name: string;
  evaluate(
    formula: string,
    metrics: Record<string, number>,
  ): number;
}

/**
 * SafeEvalStrategy — default strategy.
 * Uses expr-eval Parser with restricted scope.
 * Allowed: + - * / ( ) and known metric names from AnalyticsDataset.
 * NOT allowed: function calls, string literals, object access, prototype access.
 * Each evaluation MUST be wrapped in try/catch by the caller.
 */
export class SafeEvalStrategy implements KpiEvaluationStrategy {
  readonly name = 'safe-eval';
  evaluate(formula: string, metrics: Record<string, number>): number {
    // Implementation: const parser = new Parser();
    // const expr = parser.parse(sanitizeFormula(formula));
    // return expr.evaluate(metrics);
  }
}

/**
 * RestrictedScriptStrategy — future strategy for advanced formulas.
 * Requires explicit tenant-level approval and admin review.
 * Runs in a sandboxed environment with additional operators and functions.
 */
export class RestrictedScriptStrategy implements KpiEvaluationStrategy {
  readonly name = 'restricted-script';
  evaluate(formula: string, metrics: Record<string, number>): number {
    throw new Error('Not implemented — requires explicit approval');
  }
}

// ─── AnalyticsDataset ───────────────────────────────

export interface DatasetEvent {
  tenantId: string;
  datasetName: string;
  metricName: string;
  value: number;
  timestamp: string;
  dimensions?: Record<string, string>;
}

export interface AnalyticsDataset {
  tenantId: string;
  datasetName: string;
  metricName: string;
  granularity: TimeGranularity;
  windowStart: string;
  value: number;
  dimensions: Record<string, string>;
  updatedAt: string;
}

// ─── Dataset Publisher ──────────────────────────────

export interface DatasetPublisher {
  publish(event: DatasetEvent): Promise<void>;
}

// ─── Dataset Ingestion Log ──────────────────────────

export interface DatasetIngestionLogEntry {
  id: string;
  tenantId: string;
  datasetName: string;
  eventId: string;
  metricName: string;
  value: number;
  timestamp: string;
  status: 'received' | 'processed' | 'failed';
  error?: string;
  receivedAt: string;
}

// ─── KPI ────────────────────────────────────────────

export interface KpiDefinition {
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  formula: string;             // e.g. "total_workflows / total_tenants * 100"
  target?: number;
  upperThreshold?: number;
  lowerThreshold?: number;
  unit?: string;
  ttl: number;                 // cache TTL in seconds
  evaluationStrategy: string;  // 'safe-eval' | 'restricted-script'
}

export interface KpiValue {
  name: string;
  value: number;
  target?: number;
  status: KpiStatus;
  timestamp: string;
  history: Array<{ timestamp: string; value: number }>;
  error?: string;              // populated when status === 'error'
}

// ─── Report ─────────────────────────────────────────

export interface ReportDefinition {
  id: string;
  tenantId: string;
  name: string;
  datasetName: string;
  dimensions: string[];
  metrics: Array<{ name: string; aggregation: MetricAggregation }>;
  filters?: Array<{ field: string; operator: string; value: unknown }>;
  dateRange?: { from: string; to: string };
  granularity?: TimeGranularity;
  schedule?: string;           // cron expression
}

export interface ReportExecution {
  id: string;
  tenantId: string;
  reportId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// ─── Dashboard ──────────────────────────────────────

export interface Dashboard {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  shared: boolean;
  roles?: string[];
}

export interface DashboardWidget {
  id: string;
  tenantId: string;
  dashboardId: string;
  type: WidgetType;
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
  kpiName?: string;
  datasetName?: string;
}

export interface DashboardLayout {
  columns: number;
  gap: number;
}

export interface DashboardHydrator {
  hydrate(
    dashboard: Dashboard,
    context: { tenantId: string; userId: string },
  ): Promise<Record<string, unknown>>;
}

// ─── Export ─────────────────────────────────────────

export interface ExportContext {
  tenantId: string;
  userId: string;
  format: ExportFormat;
  options: Record<string, unknown>;
  correlationId: string;
}

export interface Exporter {
  readonly format: ExportFormat;
  export(data: unknown, context: ExportContext): Promise<Buffer>;
  contentType: string;
}
```

```prisma
// ═══════════════════════════════════════════════════════
// Reporting & Analytics — Read-Only Middleware
//
// Este archivo contiene SOLO los modelos del reporting.
// Un Prisma middleware bloquea cualquier operación sobre
// modelos FUERA del allowlist:
//
//   ['AnalyticsDataset', 'AnalyticsSnapshot', 'KPI',
//    'Dashboard', 'DashboardWidget', 'ReportDefinition',
//    'ReportExecution', 'ExportJob', 'DatasetIngestionLog']
//
// Cualquier query a un modelo no listado lanza error.
// Ver reporting-read-only.middleware.ts (mismo patrón que
// SPEC-0018 audit-append-only.middleware.ts).
//
// Además, una DB role separada `reporting_app` concede solo
// SELECT + INSERT en estas tablas. Las migraciones se ejecutan
// con un role con más permisos; en producción el reporting
// se conecta con `reporting_app`.
//
// Logical definition only — las tablas reales se crean con
// PARTITION BY RANGE (window_start) via raw SQL en
// packages/database/scripts/reporting-partitions.sql.
// ═══════════════════════════════════════════════════════

// ─── AnalyticsDataset ──────────────────────────────
// Logical definition only. Actual table:
//   CREATE TABLE analytics_datasets (...) PARTITION BY RANGE (window_start);
model AnalyticsDataset {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  datasetName String   @map("dataset_name")
  metricName  String   @map("metric_name")
  granularity String   // day (default), week, month
  windowStart DateTime @map("window_start")
  value       Float
  dimensions  Json     @default("{}")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, datasetName, metricName, granularity, windowStart])
  @@index([tenantId, datasetName, granularity, windowStart(sort: Desc)])
  @@index([tenantId, metricName, windowStart(sort: Desc)])
  @@map("analytics_datasets")
}

// ─── AnalyticsSnapshot (materialized view metadata) ─
// Logical definition only. Actual table:
//   CREATE TABLE analytics_snapshots (...) PARTITION BY RANGE (window_start);
// TTL-based expiration — no event-driven invalidation.
// Stale-while-revalidate: serve expired while refreshing.
model AnalyticsSnapshot {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  name        String
  datasetName String   @map("dataset_name")
  granularity String
  windowStart DateTime @map("window_start")
  windowEnd   DateTime @map("window_end")
  data        Json
  ttl         Int      @default(300)   // seconds
  expiresAt   DateTime @map("expires_at")
  createdAt   DateTime @default(now()) @map("created_at")
  refreshedAt DateTime? @map("refreshed_at")

  @@index([tenantId, name, expiresAt])
  @@map("analytics_snapshots")
}

// ─── KPI ───────────────────────────────────────────
model Kpi {
  id                 String   @id @default(uuid())
  tenantId           String   @map("tenant_id")
  name               String
  displayName        String    @map("display_name")
  formula            String
  target             Float?
  upperThreshold     Float?    @map("upper_threshold")
  lowerThreshold     Float?    @map("lower_threshold")
  unit               String?
  ttl                Int       @default(300)
  evaluationStrategy String    @default("safe-eval") @map("evaluation_strategy")
  cachedValue        Float?    @map("cached_value")
  cachedStatus       String?   @map("cached_status")
  cachedAt           DateTime? @map("cached_at")
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  @@unique([tenantId, name])
  @@map("kpis")
}

// ─── Dashboard ─────────────────────────────────────
model Dashboard {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  name        String
  description String?
  layout      Json     @default("{\"columns\":12,\"gap\":16}")
  shared      Boolean  @default(false)
  roles       String[]
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  widgets DashboardWidget[]

  @@index([tenantId])
  @@map("dashboards")
}

// ─── DashboardWidget ───────────────────────────────
model DashboardWidget {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  dashboardId String   @map("dashboard_id")
  type        String   // kpi-card | line-chart | bar-chart | pie-chart | table | trend
  title       String
  config      Json     @default("{}")
  position    Json     // { x, y, w, h }
  kpiName     String?  @map("kpi_name")
  datasetName String?  @map("dataset_name")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  dashboard Dashboard @relation(fields: [dashboardId], references: [id], onDelete: Cascade)

  @@index([dashboardId])
  @@index([tenantId])
  @@map("dashboard_widgets")
}

// ─── ReportDefinition ──────────────────────────────
model ReportDefinition {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  name        String
  datasetName String   @map("dataset_name")
  dimensions  String[]
  metrics     Json     // Array<{ name, aggregation }>
  filters     Json?
  dateRange   Json?
  granularity String?
  schedule    String?  // cron expression
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  executions ReportExecution[]

  @@index([tenantId])
  @@map("report_definitions")
}

// ─── ReportExecution ───────────────────────────────
model ReportExecution {
  id          String    @id @default(uuid())
  tenantId    String    @map("tenant_id")
  reportId    String    @map("report_id")
  status      String    @default("pending") // pending | running | completed | failed
  result      Json?
  error       String?
  createdAt   DateTime  @default(now()) @map("created_at")
  startedAt   DateTime? @map("started_at")
  completedAt DateTime? @map("completed_at")

  report ReportDefinition @relation(fields: [reportId], references: [id], onDelete: Cascade)

  @@index([reportId, createdAt(sort: Desc)])
  @@index([tenantId])
  @@map("report_executions")
}

// ─── ExportJob ─────────────────────────────────────
model ExportJob {
  id          String    @id @default(uuid())
  tenantId    String    @map("tenant_id")
  type        String    // dashboard | report | kpi
  format      String    // pdf | excel | csv | json
  status      String    @default("pending") // pending | processing | completed | failed
  config      Json?     // export configuration
  filePath    String?   @map("file_path")  // exports/{tenantId}/{jobId}.{format}
  error       String?
  createdAt   DateTime  @default(now()) @map("created_at")
  completedAt DateTime? @map("completed_at")

  @@index([tenantId, status])
  @@map("export_jobs")
}

// ─── DatasetIngestionLog (append-only) ─────────────
model DatasetIngestionLog {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  datasetName String   @map("dataset_name")
  eventId     String   @map("event_id")
  metricName  String   @map("metric_name")
  value       Float
  timestamp   DateTime
  status      String   @default("received") // received | processed | failed
  error       String?
  receivedAt  DateTime @default(now()) @map("received_at")

  @@unique([eventId])
  @@index([tenantId, datasetName, status, timestamp(sort: Desc)])
  @@index([tenantId, datasetName, timestamp(sort: Desc)])
  @@map("dataset_ingestion_log")
}
```

---

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Add reporting tables + migration (logical schema) | Bajo | `DROP TABLE` (sin datos aún) |
| 2 | Create raw SQL partition migration: `packages/database/scripts/reporting-partitions.sql` | Bajo | DROP partitions |
| 3 | Create shared contracts + types incluyendo DatasetPublisher, KpiEvaluationStrategy, ExportContext, DashboardHydrator | Bajo | Revertir commit |
| 4 | Implement ReportingReadOnlyMiddleware + DB role `reporting_app` | Bajo | Quitar middleware, no afecta otras queries |
| 5 | Implement DatasetIngestionLog + reconciliation + replay endpoint | Bajo | Sin datos, no hay impacto |
| 6 | Implement Data Ingestion Pipeline (BullMQ consumers from existing modules) | Bajo | Desactivar workers. Datasets no actualizados. |
| 7 | Implement KPI Engine con SafeEvalStrategy + first KPIs | Bajo | Sin KPIs configurados, no hay impacto. |
| 8 | Implement Report Engine + first report | Bajo | Sin reportes configurados, no hay impacto. |
| 9 | Implement Dashboard Engine + DashboardHydrator | Bajo | Sin dashboards, no hay impacto. |
| 10 | Implement Scheduling + Export con ExportContext y tenant-scoped paths | Bajo | Sin schedules configurados, no hay impacto. |
| 11 | Wire ReportingModule en CoreModule | Bajo | Quitar del imports |

### DatasetEvent Producer Inventory

| Module | Event Type | Metrics Produced | Priority | Implementation Order |
|--------|-----------|-----------------|----------|---------------------|
| Workflow Engine (SPEC-0015) | `workflow.created`, `workflow.completed`, `workflow.failed` | workflows_created, workflows_completed, workflows_failed, avg_completion_time | P0 | 1 |
| Notification Center (SPEC-0016) | `notification.sent`, `notification.delivered` | notifications_sent, notifications_delivered, delivery_rate | P1 | 2 |
| Activity Timeline (SPEC-0017) | `activity.event` | events_count, events_by_type | P1 | 3 |
| Communication Platform (SPEC-0012) | `message.sent`, `message.failed` | messages_sent, messages_failed, messages_delivered | P2 | 4 |
| Document Platform (SPEC-0013) | `document.created`, `document.signed` | documents_created, documents_signed | P2 | 5 |
| Integration Platform (SPEC-0014) | `integration.executed`, `integration.failed` | integrations_executed, integrations_failed | P3 | 6 |

Cada módulo debe implementar `DatasetPublisher` (de `packages/shared/src/reporting/`) y emitir `DatasetEvent`s mediante BullMQ al topic `reporting:ingest`. El orden de implementación sigue las prioridades: P0 antes del MVP, P1-P3 post-MVP incremental.

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿Se necesita un motor de fórmulas para KPIs (expr-eval, mathjs) o fórmulas fijas? | **Resolved** | `expr-eval` Parser con scope restringido (`SafeEvalStrategy`). `mathjs.evaluate` rechazado por riesgo de RCE. Estrategia futura `RestrictedScriptStrategy` con sandbox más potente requiere aprobación explícita. |
| 2 | ¿Los datasets se alimentan de eventos de dominio o de queries programadas? | **Resolved** | Event-driven para métricas en tiempo real (conteos, sumas). Queries programadas para snapshots diarios. Ambos canales pasan por DatasetIngestionLog para detección de pérdidas. |
| 3 | ¿Soporte para drill-through a tablas operacionales desde un reporte? | Open | Recomendación: no en MVP. Los reportes muestran datos agregados. Drill-through requiere acceso controlado a tablas operacionales. |
| 4 | ¿Export a PDF requiere un motor de renderizado (Puppeteer, jsPDF)? | **Resolved** | Puppeteer para dashboards completos (renderiza la URL y exporta como PDF). jsPDF para reportes tabulares simples (solo datos, sin layout visual). Ambos formatos soportados via Exporter interface con ExportContext. |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Architecture Review conditions resolved.
