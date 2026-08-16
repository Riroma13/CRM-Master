# ADR-0032: Data Retention & Lifecycle Platform

**Status:** Proposed — AR-003 confirmed by HUMAN / MAINTAINER; adoption remains disabled
**Date:** 2026-08-16
**Scope:** Tenant-scoped lifecycle policy scheduling and run-ledger evidence

## Context

CRM-Master has independent audit and document cleanup operations but no shared,
tenant-scoped policy and execution ledger. The lifecycle platform adds additive
policy and run-ledger tables, Host-derived tenant API authority, deterministic
job scheduling, and owner-managed retention adapters. It does not seed policies,
backfill records, or perform generic cross-model deletion.

## Decision

Adopt a tenant-scoped lifecycle bounded context with:

- strict target-discriminated, schedule-only policy inputs;
- tenant identity derived from the resolved Host, never from request input;
- owner adapters responsible for retention eligibility, legal holds, and expiry;
- immutable operational run evidence with idempotent policy/schedule uniqueness;
- redacted terminal failures and trusted Jobs tenant-envelope validation.

The API and scheduler remain disabled for tenant adoption until the condition
below is closed. No policy seeding or backfill is part of this change.

## AR-003 condition

The v1 operational evidence window is **24 months** for lifecycle run ledger
retention, confirmed by HUMAN / MAINTAINER under AR-003. This is a reference
window only: there is no default tenant policy, no policy seeding or backfill,
and no policy is enabled or scheduled by this change. Tenant adoption remains
disabled until a later bounded activation decision.

## Consequences

The schema deployment is additive and independently reversible. Existing audit
and document cleanup remains owner-controlled. Run records provide tenant-scoped
operator evidence, while the confirmed AR-003 reference window remains an
explicit bounded governance decision rather than an inferred compliance claim.

## Evidence

- `packages/database/prisma/migrations/20260815000000_add_data_lifecycle_platform/migration.sql`
  was independently reviewed as lifecycle-only SQL and hash-matches the clean
  baseline evidence.
- `pnpm --filter database generate:scope:verify` passed; generated scope output
  was not hand-edited.
- AR-003: HUMAN / MAINTAINER confirmed the 24-month v1 reference window.
- No default policy was created; no policy was seeded, backfilled, enabled, or
  scheduled by Apply 7.3.
