# SPEC-0019 — Reporting & Analytics

## Summary

Reporting & Analytics Platform provides a unified read-only analytics layer
with precomputed aggregation datasets, KPI engine (SafeEvalStrategy via
expr-eval Parser with restricted scope), report engine, dashboard engine
with parallel widget resolution (DashboardHydrator), TTL-based snapshots
with stale-while-revalidate, async export (CSV/JSON) with tenant-scoped
storage, cron scheduling, and lost-event detection via append-only
DatasetIngestionLog with periodic reconciliation.

**24 archivos planificados | 142 tests (13 suites) | 35 tareas | 4 PRs stacked-to-main**

## Features

- **AnalyticsDataset**: Precomputed denormalized aggregation tables, daily by
  default. Hourly computed via window functions, monthly via aggregation.
  Partitioned by RANGE (window_start) via raw SQL.
- **Event-driven Ingestion via BullMQ**: DatasetIngestionLog (append-only)
  records every event. Periodic reconciliation detects lost events. Replay
  endpoint for window reprocessing.
- **KPI Engine**: SafeEvalStrategy using expr-eval Parser with restricted scope
  (`+ - * / ( )` + known metric names). Isolated try/catch per KPI — one
  failure doesn't break others. TTL cache with stale-while-revalidate.
  Targets, thresholds, status (on_target/warning/critical/error/no_data).
- **Report Engine**: Tabular reports with groupings, filters, time-series,
  rolling windows, funnel analysis. Async via BullMQ.
- **Dashboard Engine**: CRUD dashboards with widgets (kpi-card, line-chart,
  bar-chart, pie-chart, table, trend). DashboardHydrator resolves all widgets
  in parallel (Promise.all) with cache multi-get.
- **Snapshots**: TTL-based materialized views. Stale-while-revalidate serves
  expired data while background refresh completes. No event-driven invalidation.
- **Async Exports**: CSV and JSON via pluggable Exporter interface. Tenant-scoped
  storage at `exports/{tenantId}/{jobId}.{format}`. Download endpoint validates
  tenantId from auth context.
- **Cron Scheduling**: Recurring report generation via SchedulingService.
- **3-layer Read-only Enforcement**: Prisma middleware blocks non-reporting
  models. DB role `reporting_app` (SELECT+INSERT only). Policy documentation.
- **Tenant Isolation**: ReportingGuard on all endpoints. All queries scoped
  by tenantId.

## Architecture

- **9 new Prisma models**: AnalyticsDataset, AnalyticsSnapshot, Kpi, Dashboard,
  DashboardWidget, ReportDefinition, ReportExecution, ExportJob,
  DatasetIngestionLog
- **Shared contracts**: KpiDefinition, DatasetEvent, DatasetPublisher,
  KpiEvaluationStrategy, Exporter, ExportContext, DashboardHydrator
- **BullMQ**: Queues `reporting:dataset:ingestion`, `reporting:dataset:dlq`,
  `reporting:report:generate`, `reporting:export`, `reporting:schedule`
- **Raw SQL partitioning**: `reporting-partitions.sql` — PARTITION BY RANGE
- **Module**: ReportingModule in apps/api/src/modules/reporting/

### Implementation (4 stacked PRs)

- PR-1 — Schema migration + 9 Prisma models + shared contracts + read-only
  middleware + partitions SQL + guard
- PR-2 — BullMQ ingestion pipeline + DatasetIngestionLog + reconciliation +
  replay endpoint
- PR-3 — KPI Engine (SafeEvalStrategy) + Report Engine + formula evaluation
  with isolated try/catch
- PR-4 — Dashboard Engine + DashboardHydrator + Snapshot service + Export
  service + CSV/JSON exporters + Scheduling + API controller + Module wiring

## Verification

| Metric | Value |
|--------|-------|
| Working Set Accuracy | ~96% |
| Verify Iterations | 2 (1 minor build fix) |
| Critical Discoveries | 0 |
| Major Discoveries | 0 |
| Minor Discoveries | 1 (HydratedDashboard export) |
| Build | ✅ |
| Tests | 142/142 (13 suites) |
| Architecture Review | REJECTED → Refined → PASS |

## Documentation

- design.md
- tasks.md
- architecture-review.md
- verify-report.md
- archive-report.md
- pr-description.md

## Status

✅ Ready for merge — PR-5 (final)

---

## Related Artifacts

- [design.md](../../../../openspec/changes/SPEC-0019-reporting-analytics/design.md)
- [tasks.md](../../../../openspec/changes/SPEC-0019-reporting-analytics/tasks.md)
- [architecture-review.md](../../../../openspec/changes/SPEC-0019-reporting-analytics/architecture-review.md)
- [verify-report.md](../../../../openspec/changes/SPEC-0019-reporting-analytics/verify-report.md)
- [archive-report.md](archive-report.md)
- [pr-description.md](pr-description.md)

---

## Navigation

← [archive-report.md](archive-report.md)
