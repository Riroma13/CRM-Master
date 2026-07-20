# Tasks: SPEC-0019 — Reporting & Analytics

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Estimated lines: 2000-3000. Config `force-chained`.

| Unit | Goal | Likely PR | Focused test cmd | Rollback |
|------|------|-----------|-----------------|----------|
| 1 | Schema + contracts + enforcement | PR 1 | `pnpm test reporting-types` | Drop tables + middleware |
| 2 | Ingestion pipeline + event log `[sdd-apply-pro]` | PR 2 | `pnpm test reporting-ingestion` | Remove workers + log tables |
| 3 | KPI Engine + SafeEval `[sdd-apply-pro]` | PR 3 | `pnpm test reporting-kpi` | Remove engine |
| 4 | Report + Dashboard + Hydrator | PR 4 | `pnpm test reporting-dashboard` | Remove engines |
| 5 | Export + Scheduling + API | PR 5 | `pnpm test reporting-export` | Remove controller |

## Phase 1: Foundation

- [ ] 1.1 Add 9 models to `schema.prisma` (AnalyticsDataset, AnalyticsSnapshot, Kpi, Dashboard, DashboardWidget, ReportDefinition, ReportExecution, ExportJob, DatasetIngestionLog) — all with tenantId + @@index([tenantId])
- [ ] 1.2 Create `packages/shared/src/reporting/`: types (KpiDefinition, DatasetEvent, Dashboard, etc.), DatasetPublisher, KpiEvaluationStrategy, Exporter, ExportContext, DashboardHydrator interfaces
- [ ] 1.3 Generate migration: `pnpm --filter database prisma migrate dev --name add_reporting_tables`
- [ ] 1.4 Create `reporting-read-only.middleware.ts` — blocks non-reporting models `[sdd-apply-pro]`
- [ ] 1.5 Create `reporting.guard.ts` — tenant isolation for reporting endpoints `[sdd-apply-pro]`
- [ ] 1.6 Create `reporting-partitions.sql` — raw SQL PARTITION BY RANGE (window_start)
- [ ] 1.7 RED→GREEN: `reporting-types.spec.ts`, `reporting-read-only.spec.ts`

## Phase 2: Data Ingestion `[sdd-apply-pro]`

- [ ] 2.1 Create `dataset-ingestion-log.service.ts` — append-only log, idempotency by eventId
- [ ] 2.2 Create `dataset-ingestion.service.ts` — BullMQ consumer, UPSERT to dataset, log ingest
- [ ] 2.3 Create `reporting.dataset-publisher.ts` — DatasetPublisher for module events
- [ ] 2.4 Add replay endpoint: `POST /datasets/{name}/replay` — reprocess from log
- [ ] 2.5 RED→GREEN: `reporting-ingestion.spec.ts`, `reporting-replay.spec.ts`

## Phase 3: KPI Engine `[sdd-apply-pro]`

- [ ] 3.1 Create `safe-eval-strategy.ts` — expr-eval Parser, scope limited to `+ - * / ( )` + metric names. Isolated try/catch per eval
- [ ] 3.2 Create `kpi-engine.ts` — formula eval, target/threshold, TTL cache, stale-while-revalidate
- [ ] 3.3 RED→GREEN: `reporting-kpi.spec.ts` — eval, error isolation, cache, cross-tenant

## Phase 4: Report + Dashboard

- [x] 4.1 Create `report-engine.ts` — aggregations, groupings, filters, rolling windows, funnel
- [x] 4.2 Create `dashboard-hydrator.ts` — parallel widget resolution, cache multi-get, batch dataset queries
- [x] 4.3 Create `dashboard-engine.ts` — layout + widget orchestration via Hydrator
- [x] 4.4 Create `snapshot.service.ts` — TTL-based snapshot with stale-while-revalidate
- [x] 4.5 RED→GREEN: `reporting-report.spec.ts`, `reporting-dashboard.spec.ts`, `dashboard-hydrator.spec.ts`, `dashboard-engine.spec.ts`, `snapshot.service.spec.ts`

## Phase 5: Export + Scheduling + API + Module

- [ ] 5.1 Create `export.service.ts` — async, tenant-scoped path `exports/{tenantId}/{jobId}.{format}`
- [ ] 5.2 Create exporters: `pdf-exporter.ts`, `csv-exporter.ts`, `json-exporter.ts`
- [ ] 5.3 Create `scheduling.service.ts` — cron for recurring reports
- [ ] 5.4 Create `reporting.controller.ts` + `reporting.service.ts` — CRUD dashboards, KPI query, report, export, download
- [ ] 5.5 Create `reporting.module.ts` — NestJS module with providers, controllers, guards, middleware
- [ ] 5.6 Wire `ReportingModule` in `CoreModule`
- [ ] 5.7 RED→GREEN: `reporting-api.spec.ts`, `reporting-export.spec.ts`, `reporting-cross-tenant-isolation.spec.ts`, `reporting-dataset-isolation.spec.ts`
