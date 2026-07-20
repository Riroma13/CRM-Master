# Health Report — 2026-07-20 (Reporting & Analytics)

> Post-archive health check after SPEC-0019 (Reporting & Analytics Platform).

---

## Summary

| Metric | Value |
|--------|-------|
| Total SPECs completed | 17 |
| Latest SPEC | SPEC-0019 (Reporting & Analytics Platform) |
| Working Set Accuracy | ~96% |
| Tests added | 142 (13 suites including read-only enforcement, KPI eval, ingestion, dashboard hydrator, export) |
| Architecture Review verdict | REJECTED → Refined → PASS |
| Build | ✅ |
| Lint | ⚠️ Pre-existing (API package lacks ESLint config) |

## Platform Health

| Component | Status | Notes |
|-----------|--------|-------|
| Platform Baseline | ✅ `sdd-v2.1-baseline` | Feature frozen |
| Enterprise Design Standard | ✅ ACTIVE | Templates aligned |
| ADR | ✅ ADR-0001 to ADR-0020 | 7 architecture decisions from SPEC-0018; SPEC-0019 adds its own architecture decisions inline |
| Feature Freeze | ✅ ACTIVE | No regressions |
| Modules | ✅ | ReportingModule in CoreModule |
| Tests | ✅ 142/142 | Read-only + KPI + dashboards + hydrator + ingestion + export + snapshots |

## New Capabilities (SPEC-0019)

- AnalyticsDataset — precomputed denormalized aggregation tables (daily default, hourly/monthly via window functions)
- Event-driven ingestion via BullMQ with append-only DatasetIngestionLog for lost event detection
- Periodic reconciliation comparing expected vs actual event counts per dataset
- Replay endpoint: `POST /datasets/{name}/replay` for window reprocessing
- KPI Engine with SafeEvalStrategy (expr-eval Parser, restricted to `+ - * / ( )` + known metric names)
- Isolated try/catch per KPI evaluation — one failure returns `status: 'error'` without blocking others
- TTL-based KPI caching with stale-while-revalidate
- Report Engine with aggregations, groupings, filters, rolling windows, funnel analysis
- Dashboard Engine with CRUD dashboards and widget types (kpi-card, chart, table, trend)
- DashboardHydrator — parallel widget resolution (Promise.all) with cache multi-get
- AnalyticsSnapshot — TTL-based materialized views with stale-while-revalidate
- Async exports (CSV/JSON) via pluggable Exporter interface with tenant-scoped storage
- Download endpoint validates tenantId from auth context
- Cron scheduling for recurring report generation
- 3-layer read-only enforcement: Prisma middleware + DB role + policy

## Architecture Decisions

| Area | Decision |
|------|----------|
| Data storage | Separate aggregation tables (AnalyticsDataset), never operational tables |
| Ingestion | Event-driven via BullMQ |
| Caching | AnalyticsSnapshot (TTL-based) + stale-while-revalidate |
| Aggregation | Precomputed daily default, hourly/monthly via window functions |
| KPI evaluation | SafeEvalStrategy (expr-eval Parser, restricted scope) |
| Read-only enforcement | 3-layer: middleware + DB role + policy |
| Partitioning | Raw SQL (Prisma has logical schema only) |
| Export | Async with tenant-scoped paths |

## Risks

| Risk | Status | Action |
|------|--------|--------|
| PDF exporter deferred | ⚠️ | Puppeteer dependency not yet in project |
| Excel exporter deferred | ⚠️ | exceljs library not yet in project |
| No DatasetEvent producers yet | ⚠️ | Modules need to implement DatasetPublisher (P0: Workflow Engine) |
| API lint pre-existing | ⚠️ | Needs ESLint config setup |
| SPEC-0004, SPEC-0013 dashboard pending | ℹ️ | Archived before dashboard normalization |

## Next Steps

- Merge PR-5 to main
- Add DatasetEvent producers from module inventory (Workflow Engine P0, Notification P1, Activity P1)
- Implement PDF (Puppeteer) and Excel (exceljs) exporters
- Resolve API lint configuration (technical debt)
- Proceed to SPEC-0004 and SPEC-0013 when prioritized
