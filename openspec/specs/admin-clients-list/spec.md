# admin-clients-list Specification

## Purpose

Expose a paginated, cross-tenant list of clients for the Mission Control
superadmin, with search, filter, and pagination. Render the list as a
responsive card grid in admin-web with loading, error, and empty states. This
capability is the operator's "Mapa de Clientes".

## Requirements

### Requirement: Cross-Tenant Clients Endpoint

The system MUST expose `GET /api/v1/admin/clientes` returning a paginated list
of clients across ALL tenants. Each item MUST include `id`, `nombre`,
`tenant` (`id`, `slug`, `name`), `saludGeneral`, `estadoRelacion`, `tags`,
`sistemas` (id, nombreSistema, tipo, estadoTecnico), `ultimaActividad`,
`tareasPendientes`, `createdAt`. The response MUST include a `pagination` object
(`page`, `limit`, `total`, `totalPages`). Default ordering MUST be
`ultimaActividad` descending.

#### Scenario: Superadmin lists all clients

- GIVEN a superadmin holds a valid bearer token
- WHEN `GET /api/v1/admin/clientes?page=1&limit=20` is called
- THEN the response MUST be HTTP 200 with `data` and `pagination`
- AND the data MUST contain clients from every tenant, ordered by most recent activity

#### Scenario: Custom page size respected

- GIVEN the database has 25 clients
- WHEN `GET /api/v1/admin/clientes?limit=10&page=3` is called
- THEN the response MUST return exactly 5 items
- AND `pagination.totalPages` MUST equal 3

#### Scenario: Invalid pagination params rejected

- GIVEN `limit` is set to 0 or negative, or `page` to 0
- WHEN the request is validated against the Zod schema
- THEN the response MUST be HTTP 400 with a validation error
- AND no Prisma query MUST run

### Requirement: Search by Client Name

The endpoint MUST accept a `search` query param and filter clients by
case-insensitive partial match on `nombre`.

#### Scenario: Name substring matches

- GIVEN clients named "Asesoría García" and "García Consulting"
- WHEN `GET /api/v1/admin/clientes?search=garcia` is called
- THEN both clients MUST appear in the result
- AND the match MUST be case-insensitive

#### Scenario: No match yields empty data

- GIVEN no client name contains "zzz"
- WHEN `GET /api/v1/admin/clientes?search=zzz` is called
- THEN `data` MUST be an empty array
- AND `pagination.total` MUST equal 0

### Requirement: Filter by Salud, Estado, and Tag

The endpoint MUST accept `salud`, `estado`, and `tag` query params. `salud`
filters `saludGeneral` (`🟢`, `🟡`, `🔴`). `estado` filters `estadoRelacion`.
`tag` filters using the PostgreSQL array `has` operator on `tags`.

#### Scenario: Filter by salud

- GIVEN clients with mixed `saludGeneral` values
- WHEN `GET /api/v1/admin/clientes?salud=🔴` is called
- THEN only clients with `saludGeneral = "🔴"` MUST appear
- AND clients with other salud values MUST NOT appear

#### Scenario: Filter by tag

- GIVEN client A has tags `["fiscal", "VPS"]` and client B has `["contable"]`
- WHEN `GET /api/v1/admin/clientes?tag=fiscal` is called
- THEN only client A MUST appear
- AND client B MUST NOT appear

#### Scenario: Filters compose

- GIVEN a client has `saludGeneral = "🟡"` and tag `factura`
- WHEN `GET /api/v1/admin/clientes?salud=🟡&tag=factura&search=gar` is called
- THEN all three filters MUST be AND-combined
- AND only matching clients MUST be returned

### Requirement: Superadmin-Only Cross-Tenant Access

Cross-tenant listing MUST be restricted to the `superadmin` role via
`AdminRoleGuard`. Tenant `admin` and `user` roles MUST NOT access this endpoint.

#### Scenario: Tenant admin forbidden

- GIVEN a tenant `admin` token
- WHEN `GET /api/v1/admin/clientes` is called with it
- THEN the response MUST be HTTP 403
- AND the response body MUST NOT list any client

#### Scenario: Unauthenticated rejected

- GIVEN no `Authorization` header
- WHEN `GET /api/v1/admin/clientes` is called
- THEN the response MUST be HTTP 401

### Requirement: Cross-Tenant Leak Prevention

The endpoint MUST use the unscoped admin Prisma client exclusively inside the
trusted admin service and MUST NOT allow filter injection of `tenantId`.

#### Scenario: tenantId filter injection ignored

- GIVEN a request body or query string includes `tenantId=tenant-a`
- WHEN the request is processed
- THEN the handler MUST NOT use that value for filtering
- AND the result MUST still span all tenants

### Requirement: Responsive Card Grid UI

admin-web MUST render the client list as a `ClientGrid` of `ClientCard`
components: 3-4 columns on desktop, 2 on tablet, 1 on mobile. Each card MUST
show client name, `HealthBadge`, tenant name, tags, systems summary, and last
activity. Cards MUST use the `DashboardFilters` (search + filter chips) and
`Pagination` shared components.

#### Scenario: Grid responsive layout

- GIVEN a viewport wider than 1024px
- WHEN the dashboard renders the grid
- THEN it MUST display 3-4 cards per row
- AND on a 375px viewport it MUST collapse to 1 card per row

#### Scenario: Filter wired to query params

- GIVEN the user types "garcia" in the search box
- WHEN the search is submitted
- THEN the API MUST be called with `search=garcia` in the query string
- AND the grid MUST refresh with the filtered result

#### Scenario: Loading state

- GIVEN the clients request is in flight
- WHEN the grid renders before the response
- THEN card skeletons MUST appear (no empty grid flash)

#### Scenario: Error state

- GIVEN the clients endpoint returns 5xx
- WHEN the grid handles the failure
- THEN an error banner with a retry action MUST appear
- AND the previous data MUST NOT silently persist

#### Scenario: Empty state

- GIVEN the filtered result set is empty
- WHEN the grid renders
- THEN a friendly empty-state message MUST appear
- AND the empty state MUST distinguish "no data" from a loading or error state