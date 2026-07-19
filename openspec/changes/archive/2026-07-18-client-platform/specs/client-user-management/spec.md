# client-user-management Specification

## Purpose

Admin-side lifecycle for the `ClientUser` identity: a tenant admin creates a
`ClientUser` linked to an existing `Cliente`, activates or disables it, and resets
its password. This capability owns the schema change that introduces the
`ClientUser` model, which requires an ADR per AGENTS.md rule 8.

## Requirements

### Requirement: ClientUser Model with ADR

The system MUST add a `ClientUser` Prisma model with at least
`{ id, clienteId, tenantId, email, passwordHash, isActive, createdAt, updatedAt }`.
`clienteId` MUST reference an existing `Cliente`, and `(tenantId, email)` MUST be
unique. A Prisma schema change MUST NOT ship without a referenced ADR documenting
the model and password-storage decision.

#### Scenario: Migration creates ClientUser table

- GIVEN the ADR for `ClientUser` is accepted
- WHEN the Prisma migration runs
- THEN the `ClientUser` table MUST exist with the required columns
- AND a unique constraint on `(tenant_id, email)` MUST be enforced

#### Scenario: Migration without ADR is blocked

- GIVEN no ADR references the `ClientUser` schema change
- WHEN the change attempts to ship
- THEN the process MUST block the schema change
- AND reference an ADR before proceeding

### Requirement: Admin Create ClientUser

The system MUST expose `POST /api/v1/admin/client-users` for tenant admins. It
MUST accept `{ clienteId, email, password }`, hash the password with bcrypt, and
persist a `ClientUser` scoped to the admin's tenant. The `clienteId` MUST belong
to the same tenant.

#### Scenario: Admin creates a client user

- GIVEN an admin authenticated for tenant `acme` and an existing `Cliente` in that tenant
- WHEN `POST /api/v1/admin/client-users` with `{ clienteId, email, password }`
- THEN the API MUST respond 201
- AND the persisted row MUST have a bcrypt `passwordHash` and `isActive = true`

#### Scenario: clienteId from another tenant rejected

- GIVEN a `Cliente` belonging to tenant `beta`
- WHEN an admin of tenant `acme` creates a `ClientUser` with that `clienteId`
- THEN the API MUST respond 403 or 400
- AND no `ClientUser` MUST be persisted

#### Scenario: Duplicate email within tenant rejected

- GIVEN an active `ClientUser` with `email=c@acme.com` in tenant `acme`
- WHEN an admin creates another `ClientUser` with the same email in `acme`
- THEN the API MUST respond 409
- AND the existing record MUST remain unchanged

### Requirement: Admin Disable ClientUser

`PATCH /api/v1/admin/client-users/{id}` with `{ isActive: false }` MUST disable a
`ClientUser`. A disabled user MUST NOT be able to log in or maintain an active
session.

#### Scenario: Disabled user cannot log in

- GIVEN an active `ClientUser`
- WHEN the admin disables it via PATCH
- THEN the API MUST respond 200 with `isActive = false`
- AND a subsequent login with its credentials MUST respond 403

### Requirement: Admin Reset Password

`POST /api/v1/admin/client-users/{id}/reset-password` MUST accept a new password,
rehash it with bcrypt, and invalidate all existing sessions for that user.

#### Scenario: Reset password rotates hash and ends sessions

- GIVEN a `ClientUser` with an active session
- WHEN the admin resets its password
- THEN the persisted `passwordHash` MUST change
- AND the prior session cookie MUST no longer authenticate `/api/v1/client/me`

### Requirement: passwordHash Never Exposed

The `passwordHash` field MUST NOT appear in any API response, log, or serializer
output. Every admin read path MUST use an explicit Prisma `select` that omits
`passwordHash`.

#### Scenario: Admin list excludes passwordHash

- GIVEN multiple `ClientUser` rows exist
- WHEN the admin lists client users
- THEN no item in the response MUST contain a `passwordHash` key
- AND a regression test MUST fail if the field is reintroduced