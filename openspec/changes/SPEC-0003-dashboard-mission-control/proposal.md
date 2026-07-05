# Proposal: SPEC-0003 — Dashboard Mission Control

## Intent

Ricardo needs a consolidated cross-tenant health view. No dashboard exists today — data is scattered across silos. This change delivers Mission Control: metrics, client cards with health status, filters, and search.

## Scope

### In Scope
- Backend (done — needs tests): `GET /api/v1/admin/dashboard` + `GET /api/v1/admin/clientes` with filters
- Frontend: refactor mock-data page into component tree, wire live API, add loading/error/empty states
- Tests: backend unit + integration + cross-tenant leak security
- Responsive grid: 3-4 cols desktop, 2 tablet, 1 mobile

### Out of Scope
- Client detail view (SPEC-0004), inventory (v1.5), full timeline, alerts (v2), tenant-web

## Capabilities

### New Capabilities
- `admin-dashboard`: Metrics endpoint + KPI cards UI
- `admin-clients-list`: Cross-tenant client listing with search, filter, pagination

### Modified Capabilities
- None — existing specs (`tenant-isolation`, `data-leak-detection`) unchanged

## Approach

1. **Backend tests**: Unit + integration for dashboard + clients services. Security tests: tenant admin cannot access `/admin/*`, superadmin can.
2. **Frontend API client**: `lib/api.ts` fetch wrapper. Typed hooks for metrics + client list.
3. **Component refactor**: Split `dashboard/page.tsx` into `MetricsBar`, `ClientCard`, `ClientGrid`, `DashboardFilters`, `HealthBadge`, `Pagination` — preserve Stitch tokens.
4. **Wire real data**: Replace mock KPI/client data. Attach filter/search to query params on API calls.

## Affected Areas

| Area | Impact |
|------|--------|
| `apps/api/src/modules/dashboard/` | Tests |
| `apps/api/src/modules/clients/` | Tests |
| `apps/admin-web/src/lib/` | New (`api.ts`) |
| `apps/admin-web/src/app/dashboard/` | Major refactor |

## Risks

| Risk | Mitigation |
|------|------------|
| E2E test DB state | Test transactions per suite |
| API shape mismatch | Verify types before wiring |
| UI regression on refactor | Visual check — layout unchanged |

## Rollback Plan

Revert frontend commit. Backend is test-only additions — no rollback needed.

## Dependencies

Prisma schema exists. Guards implemented in SPEC-0002. Jest + supertest configured.

## Success Criteria

- [ ] `pnpm test` passes, `pnpm lint` clean
- [ ] Dashboard renders live data (no mock)
- [ ] Cross-tenant leak test passes
- [ ] Filter/search correctly passes query params
- [ ] Coverage ≥ 80% for changed modules
