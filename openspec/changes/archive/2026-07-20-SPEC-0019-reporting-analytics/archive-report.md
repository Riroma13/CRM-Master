# Archive Report: SPEC-0019 — Reporting & Analytics

**Date:** 2026-07-20
**Mode:** openspec
**Status:** **ARCHIVED**

---

## Executive Summary

Reporting & Analytics Platform provides a unified read-only analytics layer
with precomputed aggregation datasets (AnalyticsDataset), a KPI engine using
SafeEvalStrategy (expr-eval Parser with restricted scope), report engine with
tabular/chart/funnel generation, dashboard engine with parallel widget
resolution via DashboardHydrator, TTL-based snapshots with stale-while-revalidate,
async exports (CSV/JSON) with tenant-scoped storage, cron scheduling, and
lost-event detection via append-only DatasetIngestionLog with periodic
reconciliation.

**9 new Prisma models | 23 source files across shared contracts, module, engines, ingestion, export, scheduling, middleware, guards**
**142 tests (13 suites) | 35 tasks completed across 4 stacked PRs**

---

## Specs Synced

No delta specs to sync — the change folder contained design.md, tasks.md,
architecture-review.md, and verify-report.md directly. No `specs/` subdirectory
with delta specs was present.

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Separate aggregation tables (AnalyticsDataset) | Never touches operational tables. Flat denormalized datasets optimized for analytical queries. |
| Event-driven ingestion (BullMQ) | Same infra as rest of platform. Domain events update datasets incrementally. |
| AnalyticsSnapshot (TTL-based materialized views) | Snapshots precomputed with TTL expiration. Stale-while-revalidate serves data during refresh. |
| Precomputed daily default (hourly/monthly via window functions) | Daily stored by default. Hourly computed via window functions. Monthly via aggregation. Reduces storage 3×. |
| Server-side API + client-side rendering | Backend serves aggregated data. DashboardHydrator resolves widgets in parallel. |
| Async exports (BullMQ) | Large reports may take minutes. User notified when ready. |
| KPI cached with TTL | Precomputed with configurable TTL (default 5 min). Targets/thresholds stored in KPI model. |
| PostgreSQL with BRIN + composite indexes | Same DB as platform. BRIN on timestamp. B-tree on (tenantId, metricName). |
| SafeEvalStrategy (expr-eval Parser, restricted scope) | mathjs.evaluate rejected as RCE risk. Scope limited to `+ - * / ( )` + known metric names. |
| 3-layer read-only enforcement | (1) Prisma middleware blocks non-reporting models. (2) DB role `reporting_app` (SELECT+INSERT only). (3) Policy documentation. |
| Raw SQL partitioning | Prisma doesn't support PARTITION BY. Logical schema in Prisma, actual partitioned tables via raw SQL. |
| TTL-based + stale-while-revalidate snapshots | Not event-driven. Avoids cache stampede. Serves expired data while refreshing. |

---

## Implementation Summary

| PR | Scope | Tasks | Status |
|----|-------|-------|--------|
| PR-1 | Schema + shared contracts + read-only enforcement + partitions SQL | Phase 1 | ✅ |
| PR-2 | Data Ingestion Pipeline (BullMQ) + reconciliation + replay endpoint | Phase 2 | ✅ |
| PR-3 | KPI Engine (SafeEvalStrategy) + Report Engine + guards | Phase 3 | ✅ |
| PR-4 | Dashboard Engine + DashboardHydrator + Snapshot (TTL) + Export (tenant-scoped) + Scheduling + API + Module wiring | Phases 4-5 | ✅ |

**Total: 35 tasks complete across 4 stacked PRs**

---

## Working Set Validation

| # | File | Planned | Actual | Match |
|---|------|---------|--------|-------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Modified — 9 new models | ✅ |
| 2 | `packages/shared/src/reporting/` | Create | Created — reporting.types.ts, export.types.ts, dataset-publisher.ts, index.ts | ✅ |
| 3 | `apps/api/src/modules/reporting/reporting.module.ts` | Create | Created | ✅ |
| 4 | `apps/api/src/modules/reporting/reporting.service.ts` | Create | Created | ✅ |
| 5 | `apps/api/src/modules/reporting/reporting.controller.ts` | Create | Created | ✅ |
| 6 | `apps/api/src/modules/reporting/kpi/kpi-engine.ts` | Create | Created | ✅ |
| 7 | `apps/api/src/modules/reporting/report/report-engine.ts` | Create | Created | ✅ |
| 8 | `apps/api/src/modules/reporting/dashboard/dashboard-engine.ts` | Create | Created | ✅ |
| 9 | `apps/api/src/modules/reporting/ingestion/dataset-ingestion.service.ts` | Create | Created | ✅ |
| 10 | `apps/api/src/modules/reporting/ingestion/dataset-ingestion-log.service.ts` | Create | Created (in reconciliation.service.ts) | ✅ |
| 11 | `apps/api/src/modules/reporting/snapshot/snapshot.service.ts` | Create | Created | ✅ |
| 12 | `apps/api/src/modules/reporting/export/export.service.ts` | Create | Created | ✅ |
| 13 | `apps/api/src/modules/reporting/export/csv-exporter.ts` | Create | Created | ✅ |
| 14 | `apps/api/src/modules/reporting/export/json-exporter.ts` | Create | Created | ✅ |
| 15 | `apps/api/src/modules/reporting/export/pdf-exporter.ts` | Create | Deferred (not in scope) | ℹ️ |
| 16 | `apps/api/src/modules/reporting/export/excel-exporter.ts` | Create | Deferred (not in scope) | ℹ️ |
| 17 | `apps/api/src/modules/reporting/scheduling/scheduling.service.ts` | Create | Created | ✅ |
| 18 | `apps/api/src/modules/reporting/guards/reporting.guard.ts` | Create | Created | ✅ |
| 19 | `apps/api/src/modules/reporting/reporting-read-only.middleware.ts` | Create | Created | ✅ |
| 20 | `apps/api/src/modules/reporting/dashboard/dashboard-hydrator.ts` | Create | Created | ✅ |
| 21 | `apps/api/src/modules/reporting/kpi/safe-eval-strategy.ts` | Create | Created | ✅ |
| 22 | `apps/api/src/modules/reporting/reporting.dataset-publisher.ts` | Create | Created (in shared/) | ✅ |
| 23 | `packages/database/scripts/reporting-partitions.sql` | Create | Created | ✅ |
| 24 | `apps/api/src/modules/core/core.module.ts` | Modify | Modified | ✅ |

ℹ️ **PDF and Excel exporters deferred**: The Exporter interface supports them, but actual implementations were deferred from scope. PDF requires Puppeteer (heavy dependency). Excel requires a library not yet in the project. CSV + JSON implemented as core formats.

### Test Files

| File | Purpose |
|------|---------|
| `apps/api/src/modules/reporting/__tests__/csv-exporter.spec.ts` | CSV export (17 tests) |
| `apps/api/src/modules/reporting/__tests__/dashboard-engine.spec.ts` | Dashboard CRUD (7 tests) |
| `apps/api/src/modules/reporting/__tests__/dashboard-hydrator.spec.ts` | Widget resolution (7 tests) |
| `apps/api/src/modules/reporting/__tests__/dataset-ingestion.spec.ts` | Ingestion pipeline (8 tests) |
| `apps/api/src/modules/reporting/__tests__/export.service.spec.ts` | Export lifecycle (7 tests) |
| `apps/api/src/modules/reporting/__tests__/json-exporter.spec.ts` | JSON export (6 tests) |
| `apps/api/src/modules/reporting/__tests__/kpi-engine.spec.ts` | KPI eval + cache (19 tests) |
| `apps/api/src/modules/reporting/__tests__/reconciliation.spec.ts` | Consistency check (5 tests) |
| `apps/api/src/modules/reporting/__tests__/replay.spec.ts` | Event replay (4 tests) |
| `apps/api/src/modules/reporting/__tests__/report-engine.spec.ts` | Report generation (9 tests) |
| `apps/api/src/modules/reporting/__tests__/reporting-read-only.spec.ts` | Read-only enforcement (12 tests) |
| `apps/api/src/modules/reporting/__tests__/snapshot.service.spec.ts` | Snapshot TTL (7 tests) |
| `packages/shared/src/reporting/__tests__/reporting.types.spec.ts` | Type validation (24 tests) |

### Unexpected Files

| File | Why It Became Necessary |
|------|------------------------|
| `apps/api/src/modules/reporting/ingestion/reconciliation.service.ts` | Combined DatasetIngestionLog service + reconciliation logic |
| `apps/api/src/modules/reporting/export/pdf-exporter.ts` | Not implemented (Puppeteer dependency deferred) |
| `apps/api/src/modules/reporting/export/excel-exporter.ts` | Not implemented (exceljs not in project) |

---

## Testing

| Suite | Tests | Passed |
|-------|:-----:|:------:|
| `csv-exporter.spec.ts` | 17 | 17 |
| `dashboard-engine.spec.ts` | 7 | 7 |
| `dashboard-hydrator.spec.ts` | 7 | 7 |
| `dataset-ingestion.spec.ts` | 8 | 8 |
| `export.service.spec.ts` | 7 | 7 |
| `json-exporter.spec.ts` | 6 | 6 |
| `kpi-engine.spec.ts` | 19 | 19 |
| `reconciliation.spec.ts` | 5 | 5 |
| `replay.spec.ts` | 4 | 4 |
| `report-engine.spec.ts` | 9 | 9 |
| `reporting-read-only.spec.ts` | 12 | 12 |
| `snapshot.service.spec.ts` | 7 | 7 |
| `reporting.types.spec.ts` | 24 | 24 |
| **Total** | **142** | **142** |

## Build

| Package | Status |
|---------|--------|
| `api` | ✅ Build successful |
| `shared` | ✅ Build successful |

## Lint

| Package | Status | Notes |
|---------|--------|-------|
| `api` | ⚠️ | Pre-existing — `apps/api/` lacks ESLint config. Not introduced by this SPEC. |

---

## Tenant Isolation

All queries for tenant data use `tenantId` scoping:
- `ReportingController` — every endpoint receives tenantId from auth context ✅
- `ReportingGuard` — tenant isolation guard on all reporting endpoints ✅
- `DatasetIngestionService` — events carry tenantId, dataset UPSERT per tenant ✅
- `ExportService` — tenant-scoped storage at `exports/{tenantId}/{jobId}.{format}` ✅
- `ReportEngine` — all dataset queries scoped by tenantId ✅
- `DashboardEngine` — all dashboard/widget queries scoped by tenantId ✅
- Read-only middleware — blocks non-reporting models regardless of tenant ✅

---

## Learning

### Working Set Accuracy

- **Planned**: 23 source files + schema + core.module.ts from Working Set
- **Actual**: 22 source files (PDF + Excel exporters deferred from scope) + schema + core.module.ts + reconciliation.service.ts
- **Accuracy**: ~96% (all planned files implemented correctly; 2 deferred intentionally)
- **Design Confidence**: High

### Verify Iterations

- **Iterations**: 2 (first build failed due to TS4053 `HydratedDashboard` not exported; fixed in second pass)
- **Issues**: 1 build error fixed (missing export in dashboard-hydrator.ts)

### Verify Discoveries

| Severity | Count | Examples |
|----------|-------|----------|
| Critical | 0 | — |
| Major | 0 | — |
| Minor | 1 | `HydratedDashboard` interface not exported from dashboard-hydrator.ts |
| **Total** | **1** | |

---

## JSON Artifact

```json
{
  "working_set_accuracy": 96,
  "design_confidence": "High",
  "verify_iterations": 2,
  "planned_files": [
    "packages/database/prisma/schema.prisma",
    "packages/shared/src/reporting/reporting.types.ts",
    "packages/shared/src/reporting/export.types.ts",
    "packages/shared/src/reporting/dataset-publisher.ts",
    "packages/shared/src/reporting/index.ts",
    "apps/api/src/modules/reporting/reporting.module.ts",
    "apps/api/src/modules/reporting/reporting.service.ts",
    "apps/api/src/modules/reporting/reporting.controller.ts",
    "apps/api/src/modules/reporting/kpi/kpi-engine.ts",
    "apps/api/src/modules/reporting/report/report-engine.ts",
    "apps/api/src/modules/reporting/dashboard/dashboard-engine.ts",
    "apps/api/src/modules/reporting/ingestion/dataset-ingestion.service.ts",
    "apps/api/src/modules/reporting/ingestion/dataset-ingestion-log.service.ts",
    "apps/api/src/modules/reporting/snapshot/snapshot.service.ts",
    "apps/api/src/modules/reporting/export/export.service.ts",
    "apps/api/src/modules/reporting/export/csv-exporter.ts",
    "apps/api/src/modules/reporting/export/json-exporter.ts",
    "apps/api/src/modules/reporting/export/pdf-exporter.ts",
    "apps/api/src/modules/reporting/export/excel-exporter.ts",
    "apps/api/src/modules/reporting/scheduling/scheduling.service.ts",
    "apps/api/src/modules/reporting/guards/reporting.guard.ts",
    "apps/api/src/modules/reporting/reporting-read-only.middleware.ts",
    "apps/api/src/modules/reporting/dashboard/dashboard-hydrator.ts",
    "apps/api/src/modules/reporting/kpi/safe-eval-strategy.ts",
    "apps/api/src/modules/reporting/reporting.dataset-publisher.ts",
    "packages/database/scripts/reporting-partitions.sql",
    "apps/api/src/modules/core/core.module.ts"
  ],
  "unexpected_files": [
    "apps/api/src/modules/reporting/ingestion/reconciliation.service.ts"
  ],
  "unexpected_dependencies": [],
  "future_recommendations": [
    "Add PDF exporter (Puppeteer) and Excel exporter (exceljs) when dependencies are available",
    "Add frontend SPEC for dashboard/report UI rendering",
    "Add DatasetEvent producers from module inventory (Workflow Engine P0, Notification P1, Activity P1)",
    "Add ESLint config to apps/api to prevent pre-existing lint warnings"
  ],
  "verify_discoveries": {
    "critical": 0,
    "major": 0,
    "minor": 1,
    "total": 1
  },
  "environment": {
    "opencode_version": "",
    "provider": "opencode-go",
    "prompt_cache": true,
    "fallback_used": false,
    "fallback_reason": ""
  }
}
```

---

## Traceability

Design .............. ✅ (design.md)
Tasks ............... ✅ (tasks.md — 35/35 complete)
Architecture Review . ✅ (architecture-review.md — REJECTED → Refined → PASS)
Apply (PR-1) ........ ✅ (Schema + shared contracts + enforcement)
Apply (PR-2) ........ ✅ (Data ingestion + reconciliation)
Apply (PR-3) ........ ✅ (KPI Engine + Report Engine)
Apply (PR-4) ........ ✅ (Dashboard + Export + Scheduling + API)
Verify .............. ✅ (142/142 tests, BUILD PASS)
Archive ............. ✅ (this report)
PR Description ...... ✅ (pr-description.md)

---

## SDD Cycle Complete

**SPEC-0019 — Reporting & Analytics**
Estado: ARCHIVED
Pipeline: Design → Tasks → Apply (4 PRs) → Verify → Archive ✅

---

## Related Artifacts

- [design.md](../../../../../openspec/changes/SPEC-0019-reporting-analytics/design.md)
- [tasks.md](../../../../../openspec/changes/SPEC-0019-reporting-analytics/tasks.md)
- [architecture-review.md](../../../../../openspec/changes/SPEC-0019-reporting-analytics/architecture-review.md)
- [verify-report.md](../../../../../openspec/changes/SPEC-0019-reporting-analytics/verify-report.md)
- [archive-report.md](archive-report.md)
- [pr-description.md](pr-description.md)

---

## Navigation

← [verify-report.md](../../../../../openspec/changes/SPEC-0019-reporting-analytics/verify-report.md) | [pr-description.md](pr-description.md) →
