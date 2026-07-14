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

### `@@unique([tenantId, email])` Design

- **Why composite unique instead of `email` unique alone**: A client email MUST be unique within a tenant (a tenant cannot have two clients with the same email), but the same email COULD exist in different tenants (e.g., `c@acme.com` and `c@beta.com` are different people). A single `@unique` on `email` would prevent cross-tenant reuse.
- **Why not `@unique` on `email` alone + manual tenant check**: Prisma's `findUnique` is optimized for unique constraints. Using `@@unique([tenantId, email])` enables efficient lookup by `(tenantId, email)` in the login flow (the exact query the auth endpoint needs).

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
