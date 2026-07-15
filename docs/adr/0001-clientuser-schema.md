# ADR 0001: ClientUser Schema

**Status:** Accepted
**Date:** 2026-07-14
**Driver:** Developer
**Reviewer:** N/A (PR1 foundation)

## Context

CRM-Master needs a client identity layer for the tenant portal end-customer (`Cliente`) self-service experience. End customers (`Cliente` entity) need to log in, view their own appointments/documents, and update their profile. The existing `User` model is for tenant admin/staff authentication — it has a `role` system (`superadmin`, `admin`, `user`) and uses Better-Auth for session management.

Two approaches were considered for adding client identity:

1. **Add a `client` role to `User.role`** — single table, single auth flow
2. **Separate `ClientUser` model** — distinct table, distinct auth flow, distinct cookie

## Decision

Adopt **approach 2**: a separate `ClientUser` model with its own authentication flow, cookie (`__Secure-client-session`), and guard.

## Rationale

### Why Not `User.role`?

- **Auth flow separation**: Better-Auth sessions for admins use `organization` membership. Client auth is email+password with bcrypt, issuing a different JWT. Mixing them in one table complicates the guard logic and increases the risk of a client token accessing admin routes.
- **Different lifecycle**: `ClientUser` is linked to `Cliente` (the end customer record), while `User` is linked to the tenant staff. They have different CRUD operations, different guards, and different serialization rules.
- **Security boundary**: A single table means a single cookie. If any code accidentally reads the wrong token type, the auth boundary is breached. Separate tables + separate cookies + separate guards enforce type safety at three levels.
- **Schema clarity**: `ClientUser` has a FK to `Cliente` with cascade delete — when a `Cliente` is deleted, the associated login is removed. `User` has no such relationship.

### Unique Constraints: `email @unique` + `@@unique([tenantId, email])`

The implementation applies **both** constraints:

- **`email @unique`** (global unique): prevents the same email from being registered in any tenant. This eliminates email collision risk entirely, simplifies the registration logic, and allows Prisma's `findUnique({ where: { email } })` for login lookups.
- **`@@unique([tenantId, email])`** (composite): kept as an extra safety net. While the global unique already guarantees no duplicates, the composite constraint reinforces the tenant-aware lookup path and provides a natural index for the `(tenantId, email)` query used during login.

**Trade-off acknowledged**: A truly cross-tenant email reuse scenario (e.g., `c@acme.com` in Tenant A and `c@beta.com` in Tenant B) is not possible with this design. This was accepted because the added complexity of allowing cross-tenant duplicates outweighs the unlikely real-world benefit in this application's domain (client identity for a B2B SaaS platform).

### `cuid()` vs `uuid()` for PK

The task spec uses `@default(cuid())` for `ClientUser.id`, while the rest of the schema uses `uuid()`. This is intentionally different to visually distinguish `ClientUser` IDs from other entity IDs in logs and error messages. Both are collision-resistant 128-bit identifiers; the choice is cosmetic.

### FK `onDelete: Cascade`

Deleting a `Cliente` cascades to delete all associated `ClientUser` records. This is correct because:
- A `ClientUser` without a `Cliente` is meaningless (there is no "orphaned client login")
- Manual cleanup is error-prone and leaks credentials
- Same pattern is already used for `Sistema -> Cliente`, `Tarea -> Sistema`, etc.

Deleting a `Tenant` also cascades to delete all `ClientUser` records, consistent with the Tenant-level cascade pattern used across the schema.

### passwordHash

- Stored as a plain `String` field (not a separate table or encrypted column)
- Hashed with **bcrypt** (12 rounds) at the application level before persisting
- Excluded from all API responses via explicit Prisma `select` (not a Prisma `@hidden` attribute, to keep the exclusion explicit and auditable)
- The spec explicitly requires that `passwordHash` never appears in any response

## Consequences

Positive:
- Clean security boundary between admin and client auth
- Backwards compatible — existing `User` model unchanged
- Prisma extension can scope `ClientUser` by `tenantId` using the same pattern as other models
- Migration follows existing schema conventions (composite index on `tenantId`)

Negative:
- Schema change requires a migration (new table)
- Registration/login flow must handle `ClientUser` separately from `User` (no shared login endpoint)
- Must remember to add `ClientUser` to the Prisma extension's scoped models array

## References

- AGENTS.md Rule 8: "Cambios de schema Prisma requieren ADR o referencia a uno existente"
- Spec: `openspec/specs/client-user-management/spec.md`
- Spec: `openspec/specs/client-auth/spec.md`
