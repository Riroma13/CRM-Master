# admin-dashboard Specification

## Purpose

Provide the Mission Control operator (superadmin) with aggregated cross-tenant
health metrics via a single API endpoint and render them as KPI cards in the
admin-web dashboard. This capability gives Ricardo a consolidated view of all
clients across every tenant — no such dashboard exists today.

## Requirements

### Requirement: Aggregated Metrics Endpoint

The system MUST expose `GET /api/v1/admin/dashboard` returning aggregated
cross-tenant metrics. The response SHALL include `totalClientes`, `activos`,
`conIncidencias`, `criticos`, `tareasPendientesGlobales`, `tenantsActivos`, plus
an `ultimaActualizacion` ISO timestamp. The endpoint MUST NOT accept a
`tenant_id` parameter; scoping is determined solely by the caller's role.

#### Scenario: Superadmin retrieves metrics

- GIVEN a superadmin holds a valid bearer token
- WHEN `GET /api/v1/admin/dashboard` is called with that token
- THEN the response MUST be HTTP 200 with a `metrics` object and `ultimaActualizacion`
- AND the counts MUST reflect rows across ALL tenants, not a single one

#### Scenario: Unauthenticated request rejected

- GIVEN no `Authorization` header is sent
- WHEN `GET /api/v1/admin/dashboard` is called
- THEN the response MUST be HTTP 401
- AND no metrics MUST be returned

#### Scenario: Tenant admin forbidden

- GIVEN a user with role `admin` scoped to tenant A
- WHEN that user calls `GET /api/v1/admin/dashboard`
- THEN the response MUST be HTTP 403
- AND the response MUST NOT reveal any cross-tenant metric

### Requirement: KPI Cards Rendering

The admin-web dashboard MUST render a `MetricsBar` of KPI cards populated from
the metrics endpoint. Cards MUST display active clients, clients with incidents,
critical clients, and global pending tasks. The cards MUST update from live API
data only — no hardcoded mock values.

#### Scenario: Happy path render

- GIVEN the metrics endpoint returns 200 with valid counts
- WHEN the dashboard server component mounts
- THEN four KPI cards MUST render with the live numbers
- AND each card MUST use the Stitch design tokens (no inline overrides)

#### Scenario: Loading state

- GIVEN the metrics request is in flight
- WHEN the dashboard renders before the response
- THEN each card MUST show a skeleton/spinner state
- AND the page MUST NOT flash empty zeroes

#### Scenario: Error state

- GIVEN the metrics endpoint returns 5xx or the fetch throws
- WHEN the dashboard handles the failure
- THEN the cards MUST render an error affordance with a retry action
- AND the page MUST NOT crash the full route

#### Scenario: Empty state

- GIVEN there are zero clients and zero tasks in the database
- WHEN the metrics endpoint returns all-zero counts
- THEN the cards MUST render `0` without ambiguity (not null, not blank)
- AND a friendly empty-state hint MAY be shown

### Requirement: Superadmin-Only Access Enforcement

Access to the dashboard endpoint MUST be restricted to the `superadmin` role via
an `AdminRoleGuard`. Tenant-scoped roles (`admin`, `user`) MUST NOT reach the
service handler.

#### Scenario: Guard short-circuits tenant admin

- GIVEN a tenant `admin` token
- WHEN the request reaches the admin guard
- THEN the guard MUST reject with HTTP 403 before the service executes
- AND no Prisma query against the admin (unscoped) client MUST run

### Requirement: No Cross-Tenant Leak in Metrics

The metrics computation MUST use the unscoped admin Prisma client only inside
the trusted admin service. No payload field MAY expose per-tenant breakdowns
that a tenant-scoped user could read.

#### Scenario: Metrics never include tenant identifiers

- GIVEN two tenants A and B each have clients
- WHEN the superadmin calls the dashboard endpoint
- THEN the response MUST contain only aggregate counts
- AND the response MUST NOT include any tenant id, slug, or per-tenant list