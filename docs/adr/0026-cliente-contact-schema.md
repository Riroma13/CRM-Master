# ADR-0026: Store Cliente Business Contact Fields

## Status

Accepted for `tenant-admin-mvp-review-gaps`.

## Context

Tenant administrators need to persist optional email and phone details for a
business `Cliente`. These values describe the business relationship and are not
credentials or login identity. The existing `ClientUser` model owns client
portal authentication and must remain unchanged.

## Decision

Add nullable `email` and `telefono` columns to `Cliente`, mapped to the existing
`clientes` table. The tenant-clientes API continues to apply the Host-derived
tenant identity and existing ownership filters; blank optional values may remain
null. No uniqueness constraint is introduced because these are business contact
details, not account identifiers.

## Alternatives Rejected

- Reusing `ClientUser.email` or `ClientUser.telefono` would couple business
  contact data to authentication identity and could alter login constraints.
- Storing contacts in JSON would remove schema-level clarity and validation for
  two stable, first-class fields.
- A separate contacts relation would add unnecessary lifecycle and query
  complexity for this bounded MVP requirement.

## Compatibility and Migration

The migration is additive and nullable, so existing rows remain valid and old
application versions can continue to read and write records without supplying
the fields. Prisma Client is regenerated after the schema change. Tenant
scoping remains unchanged because `tenantId` and all existing ownership checks
are preserved.

## Consequences

Cliente create/edit responses can round-trip optional business email and phone
values. Authentication behavior, ClientUser identity, and cross-tenant
authorization are unaffected. Future contact types should receive a separate
design decision rather than expanding this migration implicitly.

## Rollback

If the UI/API usage must be reverted, deploy the previous application code and
leave the nullable columns in place; this avoids data loss and is backward
compatible. Removing the columns would be a separate destructive migration
requiring explicit review and a data-retention decision.
