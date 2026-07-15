# Delta for data-leak-detection

## ADDED Requirements

### Requirement: Cross-Client Isolation Gate

The doorbell suite MUST include e2e HTTP tests proving that one authenticated
client cannot read or mutate another client's data within the same tenant. The
scoping MUST be enforced by the `clienteId`-level Prisma extension, not by
handler-level filters. This requirement extends the existing cross-tenant doorbell
along a second isolation axis (client within tenant).

#### Scenario: Client A cannot read client B's appointment

- GIVEN clients A and B exist in the same tenant and each owns an appointment
- AND a session authenticated as client A holds a valid `__Secure-client-session`
- WHEN client A issues `GET /api/v1/client/appointments/{appointmentB-id}`
- THEN the API MUST respond 403 or 404
- AND the response body MUST NOT contain client B's appointment data

#### Scenario: Client A cannot list client B's documents

- GIVEN client A and client B are in the same tenant with separate shared documents
- WHEN client A issues `GET /api/v1/client/documents` via the client-scoped client
- THEN the response MUST contain only documents shared with client A
- AND client B's documents MUST NOT appear

#### Scenario: Cross-client mutation affects zero rows

- GIVEN an appointment owned by client B
- WHEN client A's `clienteId`-scoped client runs `updateMany({ where: { id: appointmentB.id }})`
- THEN `updateMany.count` MUST be `0`
- AND the persisted appointment MUST remain unchanged

## MODIFIED Requirements

### Requirement: E2E HTTP Cross-Tenant Isolation Gate

The system MUST include an e2e HTTP test suite (the "doorbell") that proves no
authenticated principal can read, mutate, or exfiltrate data belonging to another
tenant OR another client within the same tenant. The suite MUST run against a real
HTTP server, not a stubbed Prisma client. Tests MUST cover both the cross-tenant
axis (principal of tenant A vs resource of tenant B) and the cross-client axis
(client A vs resource of client B in the same tenant).
(Previously: gate asserted only cross-tenant isolation; cross-client isolation within a tenant was not covered.)

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

#### Scenario: Client A cannot read client B's resource within same tenant

- GIVEN clients A and B exist in the same tenant, each owning a `Cliente`-scoped resource
- AND a session authenticated as client A holds a valid `__Secure-client-session`
- WHEN client A issues a client endpoint requesting client B's resource by id
- THEN the API MUST respond 403 or 404
- AND the response body MUST NOT contain client B's data

#### Scenario: Doorbell fails the build on any isolation regression

- GIVEN a regression that allows cross-tenant OR cross-client reads
- WHEN `pnpm test` is executed
- THEN the command MUST exit non-zero
- AND the failing test output MUST name the leaked principal/tenant/client