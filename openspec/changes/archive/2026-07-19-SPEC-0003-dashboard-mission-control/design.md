# Design: SPEC-0003 — Dashboard Mission Control

## Technical Approach

Refactor the monolithic mock-data dashboard into a composable component tree
wired to live API endpoints (`/api/v1/admin/dashboard`,
`/api/v1/admin/clientes`). Create a typed fetch wrapper (`lib/api.ts`) with
React hooks for data fetching and state management inside client component
boundaries. Preserve Stitch design tokens and shadcn/ui conventions.

**Backend**: Services and controllers exist — need a minor addition
(`tareasPendientes` in `findAll` response) and full test coverage.
No new API endpoints.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Component render model | Pure server components, pure client, mixed | **Page as async server component + Client Component islands** (DashboardFilters, ClientGrid, MetricsBar) | The page shell renders static layout + initial data fetch on the server. Interactivity (filters, search, pagination) delegates to client boundaries. Best UX without compromising on spec's server-component pattern. |
| API client | SWR, TanStack Query, raw fetch+state | **Typed fetch wrapper + client hooks** | No extra deps. Two endpoints, no cache invalidation complexity. Easy to swap for SWR later. |
| Token source | Better-Auth SDK, env var, middleware proxy | **`NEXT_PUBLIC_API_TOKEN` env var** (dev) | Better-Auth client not installed in admin-web. Auth integration out of scope for SPEC-0003. API client accepts token param — pluggable for production. |
| State management | Context, Zustand, prop drilling | **Hook-local state + props** | Two data sources (metrics, clients) with no cross-dependency. Context/Zustand overkill. |
| Testing framework | vitest + @testing-library/react | **vitest + @testing-library/react** (add to devDeps) | Vitest configured. @testing-library/react needs explicit install. |

## Data Flow

```
NEXT_PUBLIC_API_TOKEN ──→ lib/api.ts (fetch wrapper)
                               │
            ┌──────────────────┼──────────────────┐
            ▼                                     ▼
  useDashboardMetrics()                   useClients(filters)
   GET /admin/dashboard                    GET /admin/clientes?{params}
            │                                     │
            ▼                                     ▼
       MetricsBar                            ClientGrid
       ┌───┴───┐                         ┌─────┼─────┐
    KpiCard×4                         ClientCard×N   Pagination
                                       ┌──┴──┐
                                   HealthBadge
```

`DashboardFilters` updates local state → `useClients` re-fetches → grid
refreshes with debounce. Initial load fetches both metrics and clients
in parallel at the page level.

## Component Architecture (Server + Client Islands)

```
app/dashboard/page.tsx               ← async Server Component
  └── MetricsBar (client)            ← fetch + render 4 KPI cards
  └── DashboardFilters (client)      ← search input + filter chips
  └── ClientGrid (client)            ← responsive card grid
       └── ClientCard (client)       ← individual card
            └── HealthBadge (client) ← 🟢🟡🔴 badge
       └── Pagination (client)       ← prev/next + page indicator
```

- `page.tsx` is an **async server component** that provides the shell layout
  and optional initial data (as a future optimization via
  `fetch()` in server component).
- Each leaf is a **client component** (`"use client"`) scoped to where
  interactivity or live data is needed.
- No client boundary at page level — only at interactive islands.
  This matches the spec's "server component mounts" language and
  gives us the smallest client JS bundle.

## Backend Changes

### Files to modify

| File | Change | Rationale |
|------|--------|-----------|
| `apps/api/src/modules/clients/clients.service.ts` | Add `tareasPendientes` count to `findAll` response | Spec requires it per `ClienteListItem`. Current response omits it. |

### `tareasPendientes` addition in `findAll`

Current `findAll` maps client data without counting non-completed tasks.
Add a `tareasPendientes` count per client:

```typescript
// In findAll, within data.map():
const tareasPendientes = await this.prisma.admin.tarea.count({
  where: { clienteId: c.id, estado: { not: 'Hecho' } },
});

return {
  // ... existing fields ...
  tareasPendientes,
};
```

To avoid N+1, batch-load `tareasPendientes` counts with a single query:

```typescript
// After fetching data, batch-load tarea counts per clienteId
const clienteIds = data.map((c: any) => c.id);
const tareaCounts = await this.prisma.admin.tarea.groupBy({
  by: ['clienteId'],
  where: { clienteId: { in: clienteIds }, estado: { not: 'Hecho' } },
  _count: { id: true },
});
const countMap = Object.fromEntries(
  tareaCounts.map((t: any) => [t.clienteId, t._count.id]),
);
```

No other backend changes needed. Controllers, guards, and DTOs already
work for superadmin cross-tenant access.

## Frontend Files

| File | Action | Description |
|------|--------|-------------|
| `apps/admin-web/src/lib/api.ts` | Create | Typed fetch wrapper: `api.get<T>(path, params?)` with `Authorization: Bearer {token}` from env. Error normalization (NetworkError, ApiError). |
| `apps/admin-web/src/lib/api-types.ts` | Create | TypeScript interfaces: `DashboardMetrics`, `ClienteListItem`, `ClientListResponse`, `PaginationMeta`, `ClientFilters`. Mirrors backend response shapes exactly. |
| `apps/admin-web/src/hooks/use-dashboard-metrics.ts` | Create | Custom hook. Returns `{ data, isLoading, isError, error, refetch }`. Fetches `GET /api/v1/admin/dashboard`. Loading skeleton for initial fetch, error state with retry. |
| `apps/admin-web/src/hooks/use-clients.ts` | Create | Custom hook. Accepts `ClientFilters`, returns `{ data, pagination, isLoading, isError, error, refetch }`. Reactive to filter changes, debounced search (300ms), resets page to 1 on filter change. |
| `apps/admin-web/src/components/dashboard/metrics-bar.tsx` | Create | Client component `"use client"`. Grid container for 4 KPI cards. Handles loading (skeleton), error (retry), empty (shows zeroes). |
| `apps/admin-web/src/components/dashboard/kpi-card.tsx` | Create | Presentational. Icon, label, value, subtitle. Receives metric props, no mock data. |
| `apps/admin-web/src/components/dashboard/client-card.tsx` | Create | Client component. Receives `ClienteListItem` props. Shows tenant name, HealthBadge, systems count, tags, last activity, pending tasks. |
| `apps/admin-web/src/components/dashboard/client-grid.tsx` | Create | Client component `"use client"`. Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. Handles loading (card skeletons), error banner, empty state. |
| `apps/admin-web/src/components/dashboard/health-badge.tsx` | Create | Client component. Renders salud indicator: `🟢` = `variant="success"`, `🟡` = `variant="warning"`, `🔴` = `variant="critical"`. Uses shadcn Badge with Stitch color tokens. |
| `apps/admin-web/src/components/dashboard/dashboard-filters.tsx` | Create | Client component `"use client"`. Search input + filter dropdowns (salud, estado, tag). Debounced search (300ms). Emits `ClientFilters` on change. |
| `apps/admin-web/src/components/dashboard/pagination.tsx` | Create | Client component. Page controls: prev/next, page indicator. Receives `PaginationMeta`, emits page change. |
| `apps/admin-web/src/app/dashboard/page.tsx` | Modify | Convert from all-client mock-data page to **async server component** shell. Compose `MetricsBar` + `DashboardFilters` + `ClientGrid`. Remove mock arrays and inline components. ~50 lines. |

## Interfaces / Contracts

```typescript
// lib/api-types.ts — mirrors backend response shapes

interface DashboardMetrics {
  metrics: {
    totalClientes: number;
    activos: number;
    conIncidencias: number;
    criticos: number;
    tareasPendientesGlobales: number;
    tenantsActivos: number;
  };
  ultimaActualizacion: string;
}

interface ClienteListItem {
  id: string;
  nombre: string;
  tenant: { id: string; slug: string; name: string };
  saludGeneral: '🟢' | '🟡' | '🔴';
  estadoRelacion: string;
  tags: string[];
  sistemas: Array<{
    id: string;
    nombreSistema: string;
    tipo: string;
    estadoTecnico: string;
  }>;
  ultimaActividad: string;
  tareasPendientes: number;
  createdAt: string;
}

interface ClientFilters {
  page?: number;
  limit?: number;
  search?: string;
  salud?: '🟢' | '🟡' | '🔴';
  estado?: string;
  tag?: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ClientListResponse {
  data: ClienteListItem[];
  pagination: PaginationMeta;
}
```

## Testing Strategy

### Backend Tests

| Layer | What | Approach |
|-------|------|----------|
| Unit — DashboardService | `getMetrics()` returns correct counts with known seed data, handles 0-count edge case | Instantiate service with real PrismaService backed by test database. Seed controlled data, assert metric values. |
| Unit — ClientsService | `findAll()` returns paginated results, `findAll(search)` filters by name, `findAll(salud)` respects salud filter, `findAll(tag)` filters by tag, `findAll(search+salud+tag)` composes filters | Seed clients across 2 tenants with known attributes. Assert pagination, filtering, and composition. |
| Unit — ClientsService | `findAll()` includes `tareasPendientes` count per client | Seed a client with 3 tasks (1 "Hecho", 2 pending). Assert `tareasPendientes: 2`. |
| Integration — Dashboard | `GET /api/v1/admin/dashboard` with superadmin token → 200 + correct metrics | Supertest against NestJS app + test DB. Assert shape and values. |
| Integration — Dashboard | `GET /api/v1/admin/dashboard` without token → 401 | Assert error shape. |
| Integration — Dashboard | `GET /api/v1/admin/dashboard` with tenant-admin token → 403 | Assert error shape and that no data leaked. |
| Integration — Clients | `GET /api/v1/admin/clientes` with superadmin → 200 + full list | Assert pagination structure and cross-tenant data. |
| Integration — Clients | `GET /api/v1/admin/clientes?search=garcia` → filtered | Assert case-insensitive partial match. |
| Integration — Clients | `GET /api/v1/admin/clientes?salud=🔴` → only criticals | Assert correct filter. |
| Integration — Clients | `GET /api/v1/admin/clientes?tag=fiscal` → filtered by tag | Assert tag filter. |
| Integration — Clients | `GET /api/v1/admin/clientes?search=x&limit=20&page=1` multiple filters | Assert composition. |
| Integration — Clients | `GET /api/v1/admin/clientes` with tenant-admin → 403 | Assert cross-tenant isolation. |
| Security | `tenantId` filter injection in query params → ignored, returns all tenants | Assert superadmin still sees cross-tenant data. |

### Frontend Tests

| Layer | What | Approach |
|-------|------|----------|
| Unit — API client | `api.get` builds correct URL, handles 200/401/403/500, normalizes errors | Mock `global.fetch` with vitest. Assert URL construction and error shapes. |
| Unit — Hooks | Loading → data → error state transitions, refetch on filter change | `@testing-library/react` render hook + assert state transitions. |
| Unit — Components | Render states (normal, loading, error, empty), Stitch token usage, prop forwarding | `@testing-library/react` render + screen queries. |
| Integration — Page | Full render with mocked fetch, filter interaction chain, pagination click | Mock fetch at module level, simulate user typing/searching, assert API calls and DOM updates. |

**Prerequisites**: Add `@testing-library/react`, `@testing-library/jest-dom`,
and `jsdom` to `apps/admin-web/devDependencies`. Configure `vitest` setup
file with `@testing-library/jest-dom` matchers.

## Open Questions

- [ ] **Auth token in production**: `NEXT_PUBLIC_API_TOKEN` env var is
  dev-only. Production needs Better-Auth client SDK integration. Out of
  SPEC-0003 scope — tracked separately.
- [ ] **`@testing-library/react` not in package.json**: In lock file but
  not declared. Needs explicit install in apply phase.
