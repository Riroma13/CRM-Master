# Tasks: SPEC-0003 — Dashboard Mission Control

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~720 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: backend + tests → PR 2: frontend infra + hooks + tests → PR 3: components + page + tests |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main (from config) or feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base Branch | Notes |
|------|------|-----------|-------------|-------|
| 1 | Backend: `tareasPendientes` in `findAll` + full test suite (13 spec scenarios) | PR 1 | `feat/SPEC-0003-dashboard` | Self-contained; no frontend deps |
| 2 | Frontend: `api.ts`, `api-types.ts`, 2 hooks, tests for api + hooks | PR 2 | PR 1 branch | Depends on PR 1 types verified |
| 3 | Frontend: 7 components + page refactor + component/integration tests | PR 3 | PR 2 branch | Depends on PR 2 hooks ready |

## Phase 1: Backend — tareasPendientes & Tests

- [x] 1.1 Add batch-load `tareasPendientes` count to `clients.service.ts findAll()` using Prisma `groupBy` to avoid N+1
- [x] 1.2 Write unit tests for `DashboardService.getMetrics()`: correct counts with seed data, zero-count edge case
- [x] 1.3 Write unit tests for `ClientsService.findAll()`: pagination, search (case-insensitive), salud/tag/estado filters, filter composition, `tareasPendientes` count per client
- [x] 1.4 Write integration tests for `GET /api/v1/admin/dashboard`: 200 superadmin, 401 no auth, 403 tenant-admin (no data leak)
- [x] 1.5 Write integration tests for `GET /api/v1/admin/clientes`: pagination, search, salud/tag filters, filter composition, `tenantId` injection ignored, 403 tenant-admin, 401 no auth

## Phase 2: Frontend — Infrastructure

- [x] 2.1 Add `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` to admin-web devDependencies; create vitest setup with jest-dom matchers
- [x] 2.2 Create `lib/api.ts`: typed fetch wrapper with `Authorization: Bearer` from env, error normalization (NetworkError, ApiError)
- [x] 2.3 Create `lib/api-types.ts`: `DashboardMetrics`, `ClienteListItem`, `ClientListResponse`, `PaginationMeta`, `ClientFilters`
- [x] 2.4 Create `hooks/use-dashboard-metrics.ts`: returns `{ data, isLoading, isError, error, refetch }` from `GET /api/v1/admin/dashboard`
- [x] 2.5 Create `hooks/use-clients.ts`: accepts `ClientFilters`, returns `{ data, pagination, isLoading, isError, error, refetch }` with 300ms debounce on search, page reset on filter change

## Phase 3: Frontend — Components

- [x] 3.1 Create `components/dashboard/health-badge.tsx`: 🟢🟡🔴 shadcn Badge with Stitch color tokens `success`/`warning`/`critical`
- [x] 3.2 Create `components/dashboard/kpi-card.tsx`: presentational card receiving icon, label, value, subtitle as props
- [x] 3.3 Create `components/dashboard/metrics-bar.tsx`: `"use client"` — 4 KPI grid with loading (skeleton), error (retry), empty (zeroes) states
- [x] 3.4 Create `components/dashboard/client-card.tsx`: `"use client"` — name, HealthBadge, tenant, tags, systems, `tareasPendientes`, last activity
- [x] 3.5 Create `components/dashboard/client-grid.tsx`: `"use client"` — responsive grid `grid-cols-1 sm:2 lg:3 xl:4` with loading/error/empty states
- [x] 3.6 Create `components/dashboard/dashboard-filters.tsx`: `"use client"` — search input (debounced 300ms) + filter chips (salud, tag), emits `ClientFilters`
- [x] 3.7 Create `components/dashboard/pagination.tsx`: `"use client"` — prev/next + page indicator, receives `PaginationMeta`, emits page change

## Phase 4: Frontend — Page Refactor & Tests

- [x] 4.1 Refactor `app/dashboard/page.tsx`: convert to `"use client"` composed page, compose `MetricsBar` + `DashboardFilters` + `ClientGrid`, remove mock arrays and inline components
- [x] 4.2 Write unit tests for `api.ts`: URL construction correct, 200/401/403/500 handling, error normalization
- [x] 4.3 Write hook tests: loading→data→error state transitions, refetch on filter change
- [x] 4.4 Write component tests: render states (normal, loading, error, empty) for each component, prop forwarding, Stitch token usage
- [x] 4.5 Write integration test: full page render with mocked fetch, filter interaction chain, pagination click
