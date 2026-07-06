# data-leak-detection Specification

## Purpose

Provide an automated, deploy-blocking test gate ("doorbell") that proves no
tenant can read, mutate, or exfiltrate another tenant's data. This capability is
the verification layer that backs the `tenant-isolation` capability: if a future
change reintroduces a leak, the doorbell MUST fail the build before it reaches
production.

## Requirements

### Requirement: E2E HTTP Cross-Tenant Isolation Gate

The system MUST include an e2e HTTP test that authenticates as a user of tenant
A, then attempts to read a resource owned by tenant B, and asserts the request
is denied. The test MUST run against a real HTTP server, not a stubbed Prisma
client.

#### Scenario: Tenant A cannot read tenant B's resource

- GIVEN tenants A and B exist and each owns at least one `Cliente`
- AND a user authenticated for tenant A holds a valid session token
- WHEN the user issues `GET /clientes/{clienteB-id}` against the API
- THEN the API MUST respond with HTTP 403
- AND the response body MUST NOT contain tenant B's `Cliente` data

#### Scenario: Tenant A cannot list tenant B's resources

- GIVEN authenticated user for tenant A
- WHEN the user issues `GET /clientes` against the API
- THEN the response MUST contain only tenant A's clients
- AND the response MUST NOT include any `Cliente` belonging to tenant B

#### Scenario: Tenant A cannot create resource under tenant B

- GIVEN authenticated user for tenant A
- WHEN the user issues `POST /clientes` with body attempting to set `tenantId: tenantB-id`
- THEN the API MUST respond with HTTP 403 or silently scope the record to tenant A
- AND the persisted record MUST have `tenant_id` equal to tenant A's id

### Requirement: Raw SQL Runtime Block

The system MUST include a test proving that any invocation of `$queryRaw`,
`$queryRawUnsafe`, or `$executeRaw` on a tenant-scoped Prisma client throws at
runtime.

#### Scenario: Raw SELECT throws on scoped client

- GIVEN a scoped Prisma client for tenant A
- WHEN the client invokes `prisma.$queryRawUnsafe('SELECT * FROM clientes')`
- THEN the invocation MUST throw before executing the SQL
- AND the test MUST assert that the error message indicates the raw-query ban

#### Scenario: Raw UPDATE throws on scoped client

- GIVEN a scoped Prisma client for tenant A
- WHEN the client invokes `prisma.$executeRaw('UPDATE clientes SET nombre = x')`
- THEN the invocation MUST throw
- AND no row in the database MUST be mutated

### Requirement: Data Leak Between Tenants via Scoped Client

The system MUST include a unit-level test proving that the scoped Prisma client
cannot return rows belonging to another tenant, covering read, create, update,
and delete operations.

#### Scenario: Scoped findMany excludes other tenant rows

- GIVEN tenant A has a `Cliente` named `Cliente-Secreto-A`
- WHEN `prismaB.cliente.findMany()` runs
- THEN the result MUST be an empty array (or contain only tenant B's rows)
- AND `Cliente-Secreto-A` MUST NOT appear in the result

#### Scenario: Scoped create assigns correct tenant id

- GIVEN scoped clients for tenants A and B
- WHEN `prismaA.cliente.create({ data: { nombre: 'X' }})` runs
- THEN the persisted row MUST have `tenant_id` equal to tenant A's id
- AND querying via `prismaB` MUST NOT return that record

### Requirement: Doorbell Runs as Deploy Pre-Condition

The doorbell test suite MUST be wired into the default `pnpm test` command and
MUST fail the build when any isolation assertion fails. It MUST NOT be skippable
via a normal test-run flag.

#### Scenario: Build fails when isolation assertion fails

- GIVEN a regression that allows cross-tenant reads
- WHEN `pnpm test` is executed
- THEN the command MUST exit non-zero
- AND the failing test output MUST name the leaked tenant

#### Scenario: Build passes when isolation holds

- GIVEN all isolation assertions pass
- WHEN `pnpm test` is executed
- THEN the command MUST exit zero
- AND the doorbell suite MUST appear in the test report as passed