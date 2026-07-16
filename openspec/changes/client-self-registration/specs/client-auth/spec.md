# Delta for client-auth — Client Self-Registration

## ADDED Requirements

### Requirement: Client Registration Endpoint

The system MUST expose `POST /api/v1/client/auth/register` as a public
(no-auth) endpoint. It MUST accept
`{ nombre: string, email: string, password: string, businessName?: string }`,
resolve `tenantId` from the request `Host` subdomain (NEVER from the body),
validate input, hash the password with bcrypt, and atomically create a
`Cliente` + `ClientUser` pair within a single transaction. On success it MUST
respond `201` with `{ clientUser: { id, nombre, email } }` and MUST NOT echo
`passwordHash`. The created `ClientUser` MUST be auto-activated
(`isActive = true`). `ClientUser.nombre` MUST be the requester's personal
`nombre`; `Cliente.nombre` MUST be `businessName` when provided, otherwise
fall back to `nombre`.

#### Scenario: Valid registration creates records and returns 201

- GIVEN tenant `acme` resolves from `Host: acme.crmmaster.com`
- WHEN `POST /api/v1/client/auth/register` with valid `nombre`, `email`, `password` (>=8 chars)
- THEN the API MUST respond `201` with `{ clientUser: { id, nombre, email } }`
- AND a `Cliente` and a `ClientUser` MUST exist, both scoped to tenant `acme`, in a single transaction

#### Scenario: Registered user can log in immediately

- GIVEN a successful registration just completed
- WHEN `POST /api/v1/client/auth/login` with the same `email`/`password`
- THEN the API MUST respond `200` with a session cookie (auto-activation confirmed)

#### Scenario: Missing or invalid Host header returns 403

- GIVEN the request has no resolvable tenant `Host` header
- WHEN `POST /api/v1/client/auth/register` is called
- THEN the API MUST respond `403`
- AND MUST NOT create any `Cliente` or `ClientUser`

#### Scenario: Missing required fields return 400

- GIVEN a resolvable tenant host
- WHEN the body omits `nombre`, `email`, or `password`
- THEN the API MUST respond `400` with validation errors
- AND MUST NOT perform any database write

#### Scenario: Weak password returns 400

- GIVEN a valid tenant and email
- WHEN `password` has fewer than 8 characters
- THEN the API MUST respond `400`
- AND MUST NOT hash or store the password

#### Scenario: Invalid email format returns 400

- GIVEN a valid tenant
- WHEN `email` is not a valid email format
- THEN the API MUST respond `400`

### Requirement: Registration Email Uniqueness

Registration MUST enforce email uniqueness. A duplicate email within the
SAME tenant MUST respond `409`. A duplicate email in a DIFFERENT tenant MUST
respond `409` (the existing global `ClientUser.email @unique` constraint is
the current system boundary; design phase MUST decide whether to keep the
global constraint or relax to per-tenant uniqueness).

#### Scenario: Duplicate email same tenant returns 409

- GIVEN a `ClientUser` with `email=x@y.com` exists in tenant `acme`
- WHEN registering `x@y.com` on `Host: acme.crmmaster.com`
- THEN the API MUST respond `409`
- AND MUST NOT create a second `ClientUser`

#### Scenario: Duplicate email different tenant returns 409

- GIVEN `x@y.com` exists in tenant `acme` only
- WHEN registering `x@y.com` on `Host: beta.crmmaster.com`
- THEN the API MUST respond `409` (global unique constraint)
- AND MUST NOT create records in tenant `beta`

### Requirement: Registration Rate Limiting

The registration endpoint MUST reuse the existing `ClientAuthService`
rate-limit infrastructure keyed by IP+email, capped at 5 attempts per 60s
window, with progressive delay for abuse. When exceeded it MUST respond
`429`. Rate-limit state MUST be shared with the login pool.

#### Scenario: Sixth attempt within the window returns 429

- GIVEN 5 registration attempts from one IP+email within 60s
- WHEN a 6th attempt is made
- THEN the API MUST respond `429`

### Requirement: Registration Password Hashing

The system MUST hash `password` with bcrypt before persistence. Plaintext
passwords MUST NEVER be stored, logged, or returned in any response.

#### Scenario: Password is never stored in plaintext

- GIVEN a successful registration
- WHEN the persisted `ClientUser` is inspected
- THEN `passwordHash` MUST be a bcrypt hash, not the raw password
- AND the `201` response MUST NOT contain `passwordHash`

### Requirement: Registration Tenant Isolation

`tenantId` MUST originate exclusively from the resolved `Host` subdomain and
MUST be applied to both created records via the central Prisma tenant-scope
extension. A request against tenant A MUST NOT create records in tenant B.

#### Scenario: Registration cannot cross tenants

- GIVEN a request on `Host: acme.crmmaster.com`
- WHEN registration completes
- THEN both created records MUST have `tenantId = acme`
- AND no record MUST exist in any other tenant

### Requirement: Registration Frontend Wiring

The existing `/registro` page MUST call `POST /api/v1/client/auth/register`,
mapping the form's personal-name field to `nombre` and the business-name
field to `businessName`. On a `201` response it MUST redirect to
`/login?registered=true`.

#### Scenario: Successful registration redirects to login

- GIVEN the user submits a valid registration form on `/registro`
- WHEN the API responds `201`
- THEN the page MUST redirect to `/login?registered=true`

## MODIFIED Requirements

### Requirement: Client Login Endpoint

The system MUST expose `POST /api/v1/client/auth/login` accepting
`{ email, password }`. The endpoint MUST resolve the tenant from the `Host`
subdomain, look up the `ClientUser` by `(tenantId, email)`, bcrypt-verify the
password, and on success issue a Better-Auth JWT written to the HttpOnly
cookie `__Secure-client-session`. The JWT claims MUST include
`{ sub, clienteId, tenantId, role: 'client' }`. A `ClientUser` created via
self-registration MUST be immediately loggable because registration sets
`isActive = true`.

(Previously: login did not reference registration-produced users; now registration
auto-activates so registered users log in without an admin step)

#### Scenario: Valid credentials return session cookie

- GIVEN an active `ClientUser` for tenant `acme` with a known password
- WHEN `POST /api/v1/client/auth/login` with that email and password on `Host: acme.crmmaster.com`
- THEN the API MUST respond 200
- AND MUST set `__Secure-client-session` HttpOnly, Secure cookie containing a JWT with `role: 'client'`

#### Scenario: Wrong password returns 401

- GIVEN an active `ClientUser` exists
- WHEN login is attempted with an incorrect password
- THEN the API MUST respond 401
- AND MUST NOT set any session cookie

#### Scenario: Unknown tenant subdomain returns 404

- GIVEN no tenant resolves for the request `Host`
- WHEN `POST /api/v1/client/auth/login` is called
- THEN the API MUST respond 404
- AND MUST NOT leak whether the email exists

#### Scenario: Deactivated ClientUser returns 403

- GIVEN a `ClientUser` with `isActive = false`
- WHEN login is attempted with valid credentials
- THEN the API MUST respond 403
- AND MUST NOT issue a session cookie