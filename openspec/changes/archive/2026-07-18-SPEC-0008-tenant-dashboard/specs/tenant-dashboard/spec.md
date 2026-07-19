# tenant-dashboard Specification

## Purpose

Tenant-side counterpart of `admin-dashboard`: one scoped API endpoint rendered
as KPI cards + recent-events list on `/admin`. The sidebar lists "Dashboard"
today but the page is missing.

## Requirements

### Requirement: Scoped Dashboard Metrics Endpoint

`GET /api/v1/tenant/dashboard` MUST return metrics scoped to the caller's
tenant only. The response SHALL include `totalClientes`, `citasHoy`,
`citasPendientes`, `citasSemana`, `tareasPendientes`, `sistemasActivos`,
`ultimosEventos` (max 5), and `ultimaActualizacion` (ISO). `tenant_id` MUST
NOT be accepted in URL, query, or body — scoping from `Host` subdomain + session.

#### Scenario: Happy path returns scoped metrics

- GIVEN an admin of tenant `acme` is authenticated
- WHEN `GET /api/v1/tenant/dashboard` is called on `Host: acme.crmmaster.com`
- THEN the response MUST be HTTP 200 with all eight fields, counts scoped to `acme`

#### Scenario: Empty tenant returns zeroes, not null

- GIVEN tenant `acme` has zero clients, citas, tareas, eventos
- WHEN the admin calls the endpoint
- THEN counts MUST be `0` (not null) and `ultimosEventos` `[]`

#### Scenario: Backend error yields 500 without leaking internals

- GIVEN Prisma throws during metrics computation
- WHEN the endpoint is called
- THEN HTTP 500 with a generic message, no stack/SQL/tenant ids

### Requirement: Admin-Only Access Enforcement

The endpoint MUST be protected by `BetterAuthGuard` and restricted to the
tenant `admin` role. Unauthenticated → 401; non-admin role or cross-tenant
token → 403.

#### Scenario: Unauthenticated request rejected

- GIVEN no session/bearer token is sent
- WHEN the endpoint is called
- THEN HTTP 401 and no tenant-model query MUST execute

#### Scenario: Cross-tenant token forbidden

- GIVEN an admin token issued for tenant B
- WHEN the endpoint is called on `Host: a.crmmaster.com`
- THEN HTTP 403 with no metrics returned

### Requirement: Tenant Isolation on Dashboard Metrics

All metric queries MUST go through `prisma.forTenant(tenantId)`. Raw SQL
(`$queryRaw*` / `$executeRaw`) on scoped models MUST NOT be used. A request
on tenant A's subdomain MUST NOT return tenant B's rows.

#### Scenario: No cross-tenant leak including doorbell gate

- GIVEN tenant A has 10 clientes and tenant B has 5 clientes
- WHEN tenant A's admin calls the endpoint on `Host: a.crmmaster.com`
- THEN `totalClientes` MUST equal 10, not 15
- AND the doorbell isolation gate MUST exit green comparing A's vs B's fixtures

### Requirement: Dashboard Page Rendering

`apps/tenant-web/src/app/admin/page.tsx` MUST render five KPI cards (Clientes,
Citas Hoy, Citas Pendientes, Tareas Pendientes, Sistemas Activos) from the
live API response, plus an "Eventos Recientes" list (max 5). No hardcoded values.

#### Scenario: Happy path render

- GIVEN the endpoint returns 200 with valid metrics
- WHEN the `/admin` page mounts
- THEN five KPI cards MUST render with live numbers and events list (max 5)

#### Scenario: Empty state

- GIVEN the endpoint returns all-zero counts and `ultimosEventos: []`
- WHEN the page renders
- THEN cards MUST show `0` and a friendly empty hint for events

### Requirement: useDashboard Hook States

`useDashboard` in `apps/tenant-web/src/lib/hooks.ts` MUST expose
`{ data, loading, error, refetch }` and MUST NOT throw on fetch failure.

#### Scenario: Loading state

- GIVEN the fetch is in flight
- WHEN the hook renders
- THEN `loading` true, `data` and `error` null

#### Scenario: Error state with retry

- GIVEN the endpoint returns 5xx or the fetch throws
- WHEN the hook settles
- THEN `error` set, `data` null, `loading` false, and `refetch()` re-triggers

#### Scenario: Empty state

- GIVEN the endpoint returns 200 with all-zero metrics
- WHEN the hook settles
- THEN `data` defined, `error` null, `loading` false

## Acceptance Criteria

- 200 with 8 fields scoped to the authenticated tenant; 401/403 on auth failures.
- Doorbell isolation gate passes with zero cross-tenant leaks; no raw SQL on scoped models.
- `/admin` renders 5 KPI cards + events list from live API; `useDashboard` handles loading/error/empty.
- ≥5 API specs (happy, auth, isolation, empty, error) and ≥3 Vitest specs.
- `pnpm lint` and `tsc` clean.