# SPEC-0018 — Audit & Compliance Platform

## Summary

Audit & Compliance Platform provides immutable append-only audit logging with
SHA-256 hash chain per tenant, compliance evaluation (GDPR, SOC2, ISO-27001),
expectation rules, row-level legal hold, GDPR cryptographic redaction, retention
engine, and export capabilities. **Independe de Activity Timeline — nunca mezcla responsabilidades.**

**25 archivos planificados | 83 tests (11 suites) | 35/35 tareas | 5 PRs stacked-to-main**

## Features

- **Immutable audit log**: SHA-256 hash chain per tenant with monotonic sequence.
  `(tenantId, sequence)` unique constraint prevents forks. Append-only enforced
  via Prisma middleware + PostgreSQL trigger + DB role separation.
- **Async ingestion via BullMQ**: Modules publish without waiting. Worker validates,
  deduplicates by eventId, computes hash chain, persists atomically.
  Malformed events → DLQ.
- **Audit API**: `GET /api/v1/audit/events` with pagination, filters, tenant scoping.
  `GET /api/v1/audit/events/:id` for single event lookup.
- **Integrity verification**: `GET /api/v1/audit/integrity` — hash chain
  verification per tenant. Verifiable from genesis through redacted events.
- **Compliance Engine**: Per-tenant evaluation. GDPR rule (auth failure detection),
  SOC2 rule (delete trail audit), `ExpectationRule` interface for missing event
  detection (login → mfa_check within 5 min).
- **Retention Engine**: Configurable retention days per tenant. Row-level purge
  respecting `legal_hold = false`. Partition management via `audit_admin` role.
- **Legal Hold**: Row-level via `AuditEventLegalHold` table. No partition-level
  hold — one tenant's hold doesn't retain other tenants' data.
- **GDPR Redaction**: Cryptographic redaction preserving the hash chain.
  Metadata overwrite with `_redacted: true`. Chain remains verifiable.
  Full erasure via formal exception process.
- **Export**: JSON + CSV exporters via pluggable `AuditExporter` interface.
- **Cross-tenant isolation**: 4 doorbell tests proving Tenant B cannot see
  Tenant A's audit events or compliance violations.

## Architecture

- **6 new Prisma models**: AuditEvent, TenantAuditState, AuditRetentionPolicy,
  AuditEventLegalHold, ComplianceViolation, ComplianceExpectationRun
- **Shared contracts**: `AuditPublisher`, `ComplianceRule`, `ExpectationRule`,
  `ComplianceContext`, `RetentionPolicy`, `AuditExporter` — all in `packages/shared/`
- **BullMQ**: Queues `audit:ingestion`, `audit:dlq`, `audit:retention`
- **Schema**: Partitioned by month. BRIN index on `occurredAt`. B-tree on
  `(tenantId, occurredAt DESC)`.
- **DB roles**: `audit_app` (INSERT+SELECT), `audit_admin` (ALL including DROP PARTITION)

### Implementation (5 stacked PRs)

- PR-1 — Schema migration + 6 Prisma models + shared contracts
- PR-2 — Append-only middleware + DB trigger + BullMQ ingestion + SHA-256 hash chain
- PR-3 — Audit API controller/service + integrity verifier + tenant isolation guard
- PR-4 — Compliance engine + retention engine + legal hold + GDPR redaction + export
- PR-5 — Module adoption (CoreModule wiring + consumer fixes) + verify + archive

## Verification

| Metric | Value |
|--------|-------|
| Working Set Accuracy | 100% |
| Verify Iterations | 2 (3 pre-existing type issues fixed) |
| Critical Discoveries | 0 |
| Major Discoveries | 0 |
| Minor Discoveries | 0 |
| Build | ✅ |
| Tests | 83/83 (11 suites) |
| Architecture decisions | 7 (AD-0014 to AD-0020) |

## Documentation

- design.md
- tasks.md
- architecture-review.md
- verify-report.md
- archive-report.md
- pr-description.md

## Status

✅ Ready for merge — PR-5 (final)

---

## Related Artifacts

- [design.md](../../../../openspec/changes/SPEC-0018-audit-platform/design.md)
- [tasks.md](../../../../openspec/changes/SPEC-0018-audit-platform/tasks.md)
- [architecture-review.md](../../../../openspec/changes/SPEC-0018-audit-platform/architecture-review.md)
- [verify-report.md](../../../../openspec/changes/SPEC-0018-audit-platform/verify-report.md)
- [archive-report.md](archive-report.md)
- [pr-description.md](pr-description.md)

---

## Navigation

← [archive-report.md](archive-report.md)
