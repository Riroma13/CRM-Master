# ADR 0025: Identity Platform

**Status:** Accepted
**Date:** 2026-07-28
**Driver:** Identity Platform Foundation
**Reviewer:** Approved Design and Tasks Review

## Context

SPEC-0025 needs durable tenant-bound authorization recovery and an audit outbox,
while Better Auth's organization catalog must be compatible before Identity
routes or workers can activate. Existing rows and indexes must survive the
additive migration without importing recovery-only history.

## Decision

1. Add tenant-scoped `IdentityAuthorizationOperation` and
   `IdentityAuditOutbox` models. Authorization state is append-only and
   terminal rows remain available for provenance.
2. Add the Better Auth catalog fields required by the Identity preflight:
   non-null unique organization slugs, invitation expiry and inviter FK, and
   nullable active organization on sessions.
3. Enforce the active pending-operation boundary with a PostgreSQL partial
   unique index on `(tenant_id, subject_id)` for `PENDING` and `PURGING` rows.
4. Fail closed with `IDENTITY_CATALOG_MISMATCH`; diagnostics contain only
   table, column, and compatibility issue, and activation stays disabled.
5. Rename the logical Prisma legacy model `User` to `LegacyUser` while
   preserving every field, relation, index, and `@@map("users")`. The Better
   Auth logical model remains `user` with `@@map("ba_users")`; no SQL migration
   or physical table rename is required. Legacy callers use
   `prisma.admin.legacyUser`, while Better Auth continues its default `user`
   resolution with no `modelName` override.

## Rationale

The Identity data is tenant-owned and must be scoped by `tenant_id`. Append-only
history preserves recovery and audit evidence, while the partial index prevents
concurrent pending/purging operations without preventing a new mutation after a
terminal result. The catalog preflight makes provider drift a deployment-safe
failure rather than a runtime authorization bypass. The logical rename removes
Prisma's case-insensitive delegate collision without changing the durable
catalog. Rollback is limited to the source and generated-client boundary; no
database schema or migration history is altered.

## Consequences

- The migration is additive and backfills existing organization slugs and
  invitation expiry before applying non-null constraints.
- Existing nullable Better Auth fields become compatible with the approved
  Identity contract; incompatible data causes migration failure before
  activation.
- Identity routes and workers require a successful preflight and are not wired
  by this Foundation unit.

## Rollback

Disable Identity activation and revert only the additive ADR, contracts,
configuration, schema, and migration files from this work unit. Preserve all
existing rows and indexes; do not import the recovery migration or alter
`c1a2f90`.

## References

- `openspec/changes/SPEC-0025-identity-platform/design.md`
- `openspec/changes/SPEC-0025-identity-platform/tasks.md`
