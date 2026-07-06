# tenant-isolation Specification

## Purpose

Enforce that every API request is bound to exactly one tenant, resolved from the
`Host` header subdomain, and that every Prisma query against tenant-owned models
is automatically scoped by `tenant_id`. This capability is the isolation
backbone of CRM-Master; without it any user can read any tenant's data.

## Requirements

### Requirement: Tenant Resolution by Host Header

The system MUST resolve the active tenant from the `Host` request header
subdomain. The system MUST NOT accept a tenant identifier via URL parameter,
request body, or custom header (`x-tenant-id`).

#### Scenario: Valid subdomain resolves to tenant

- GIVEN a tenant exists with slug `acme`
- WHEN a request arrives with `Host: acme.crmmaster.com`
- THEN the middleware MUST set `request.tenantId` to that tenant's database id
- AND the request MUST continue processing normally

#### Scenario: Unknown subdomain yields 404

- GIVEN no tenant exists with slug `ghost`
- WHEN a request arrives with `Host: ghost.crmmaster.com`
- THEN the middleware MUST short-circuit with HTTP 404
- AND no downstream handler MUST be invoked

#### Scenario: Reserved slug rejected

- GIVEN the slug `www` is in the reserved list
- WHEN a request arrives with `Host: www.crmmaster.com`
- THEN the middleware MUST NOT resolve it as a tenant
- AND the request MUST be treated as a non-tenant (platform) route

#### Scenario: Apex / no subdomain on tenant route

- GIVEN a request reaches a tenant-scoped route
- WHEN the `Host` header has no subdomain (e.g. `crmmaster.com`)
- THEN the global guard MUST reject the request with HTTP 403
- AND the request MUST NOT reach any service handler

#### Scenario: Resolution cache hit

- GIVEN slug `acme` was resolved in the last 60 seconds
- WHEN a subsequent request arrives with `Host: acme.crmmaster.com`
- THEN the middleware MUST use the cached `tenantId` without issuing a DB query
- AND the response latency SHOULD be lower than a cache-miss request

### Requirement: Global Tenant Scope Guard

The system MUST enforce tenant scoping on every route via a global
`APP_GUARD`. Routes that intentionally bypass tenant scope MUST be marked with a
`@Public()` decorator and reflected via `Reflector`.

#### Scenario: Protected route without tenant context

- GIVEN a route is not decorated `@Public()`
- WHEN a request arrives without a resolved `tenantId` on the request object
- THEN the guard MUST reject with HTTP 403
- AND no service handler MUST execute

#### Scenario: Protected route with valid tenant context

- GIVEN a route is not decorated `@Public()`
- WHEN a request arrives with a resolved `tenantId`
- THEN the guard MUST allow the request through to the handler
- AND the handler MUST receive the scoped Prisma client

#### Scenario: Public route bypasses guard

- GIVEN the healthcheck route is decorated `@Public()`
- WHEN a request arrives without a tenant subdomain
- THEN the guard MUST NOT block the request
- AND the healthcheck MUST return HTTP 200

### Requirement: Removal of x-tenant-id Header Resolution

The system MUST NOT resolve the tenant from an `x-tenant-id` request header. The
existing `TenantGuard` that reads this header MUST be removed.

#### Scenario: x-tenant-id header is ignored

- GIVEN a request sends `x-tenant-id: tenant-b-id` for tenant A's subdomain
- WHEN the request is processed
- THEN the effective tenant MUST be the one from the `Host` subdomain
- AND the `x-tenant-id` header value MUST have no effect on scoping

### Requirement: Prisma Extension Blocks Raw SQL on Scoped Models

The Prisma client extension MUST throw at runtime when `$queryRaw` or
`$queryRawUnsafe` or `$executeRaw` is invoked on a tenant-scoped client, because
raw queries bypass the `tenant_id` extension.

#### Scenario: Raw query on scoped client throws

- GIVEN a scoped Prisma client for tenant A
- WHEN `prisma.$queryRawUnsafe('SELECT * FROM clientes')` is called
- THEN the call MUST throw an error mentioning the raw-query ban
- AND no rows MUST be returned to the caller

#### Scenario: Raw query on unscoped admin client allowed only via explicit opt-in

- GIVEN the unscoped admin Prisma client
- WHEN a raw query is invoked without an explicit allow flag
- THEN the call MUST throw
- AND an operator MAY whitelist a specific raw query via a documented opt-in

### Requirement: Scoped Prisma Client by Tenant

The `createPrismaClient(tenantId?)` factory MUST return a client scoped to the
given `tenantId` for tenant-owned models (User, Cliente, Sistema, ItemInventario,
EventoBitacora, Tarea). Creating an unscoped client outside of trusted admin
paths MUST emit a warning.

#### Scenario: Scoped client only sees own tenant rows

- GIVEN tenant A and tenant B each have one `Cliente`
- WHEN `prismaA.cliente.findMany()` is called
- THEN the result MUST contain only tenant A's client
- AND the result MUST NOT contain tenant B's client

#### Scenario: Unscoped client creation warns

- GIVEN the codebase runs in non-test environment
- WHEN `createPrismaClient()` is called without a `tenantId`
- THEN the factory MUST emit a warning log
- AND the returned client MUST remain unscoped (for admin paths only)

#### Scenario: Cross-tenant update affects zero rows

- GIVEN a `Cliente` belongs to tenant A
- WHEN tenant B's scoped client runs `updateMany({ where: { id: clienteA.id }})` with new data
- THEN `updateMany.count` MUST be `0`
- AND the persisted record MUST remain unchanged

#### Scenario: Cross-tenant delete affects zero rows

- GIVEN a `Cliente` belongs to tenant A
- WHEN tenant B's scoped client runs `deleteMany({ where: { id: clienteA.id }})`
- THEN `deleteMany.count` MUST be `0`
- AND the record MUST remain present in tenant A