# Tasks: SPEC-0018 — Audit & Compliance Platform

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

Estimated lines: 1500-2000. Config `force-chained`.

| Unit | Goal | PR | Focused test | Rollback |
|------|------|-----|-------------|----------|
| 1 | Schema + contracts | PR 1 | `pnpm test audit-types` | Drop audit tables |
| 2 | Append-only + ingestion | PR 2 | `pnpm test audit-append-only` | Remove middleware + trigger + roles |
| 3 | Audit API + compliance | PR 3 | `pnpm test audit-compliance` | Remove controller + engine |
| 4 | Retention + redaction | PR 4 | `pnpm test audit-retention` | Remove redaction + retention |
| 5 | Module adoption (P0-P3) | PR 5 | `pnpm test audit-adoption` | Per-module revert |

## Phase 1: Foundation

- [ ] 1.1 Add 6 models to `schema.prisma`: AuditEvent, TenantAuditState, AuditRetentionPolicy, AuditEventLegalHold, ComplianceViolation, ComplianceExpectationRun
- [ ] 1.2 Create `packages/shared/src/audit/`: `audit.types.ts`, `audit-publisher.ts`, `compliance.types.ts`, `retention.types.ts`, `index.ts`
- [ ] 1.3 Generate migration: `pnpm --filter database prisma migrate dev --name add_audit_tables`
- [ ] 1.4 RED→GREEN: `audit.types.spec.ts`

## Phase 2: Append-Only `[sdd-apply-pro]`

- [ ] 2.1 Create `audit-append-only.middleware.ts` (blocks UPDATE/DELETE on AuditEvent, bypass `__internalRedact`)
- [ ] 2.2 Create `audit-db-roles.sql` (roles `audit_app` INS+SELECT, `audit_admin` ALL; trigger `block_audit_event_mutation()`)
- [ ] 2.3 RED→GREEN: `audit-append-only.spec.ts` — fail via ORM, trigger, roles

## Phase 3: Ingestion + Hash Chain `[sdd-apply-pro]`

- [ ] 3.1 Create `ingestion.service.ts` — BullMQ consumer, schema validation, dedup by eventId, DLQ
- [ ] 3.2 Implement `computeGenesisHash()` + SHA-256 chain
- [ ] 3.3 Atomic INSERT + `tenant_audit_state` update with `ON CONFLICT DO NOTHING` + retry
- [ ] 3.4 Create `AuditModule` + `AuditService` + register middleware
- [ ] 3.5 RED→GREEN: `audit-sequence-fork-prevention.spec.ts` — concurrent inserts

## Phase 4: Audit API

- [ ] 4.1 Create `audit.controller.ts` (GET /audit/events, GET /audit/events/:id) with pagination + filters
- [ ] 4.2 Create `audit.service.ts` — tenant-scoped, mandatory tenantId
- [ ] 4.3 Create `integrity-verifier.ts` — hash chain verification per tenant `[sdd-apply-pro]`
- [ ] 4.4 Create `audit.guard.ts` — tenant isolation on endpoints `[sdd-apply-pro]`
- [ ] 4.5 RED→GREEN: `audit-cross-tenant-isolation.spec.ts`

## Phase 5: Compliance Engine `[sdd-apply-pro]`

- [ ] 5.1 Create `compliance-engine.ts` — per-tenant evaluation
- [ ] 5.2 Create `compliance-rule-registry.ts` + `gdpr-rule.ts` + `soc2-rule.ts` (stubs)
- [ ] 5.3 Create `expectation-rules/login-mfa-rule.ts` — detect missing mfa_check
- [ ] 5.4 RED→GREEN: `compliance-engine.spec.ts`

## Phase 6: Retention + Redaction `[sdd-apply-pro]`

- [ ] 6.1 Create `retention-engine.ts` — partition drop via raw SQL, purge respecting legal_hold
- [ ] 6.2 Create `legal-hold.service.ts` — bulk set/release via AuditEventLegalHold
- [ ] 6.3 Create `redaction.service.ts` — raw SQL UPDATE via `__internalRedact`, hash recalc
- [ ] 6.4 Create `export.service.ts` + `json-exporter.ts` + `csv-exporter.ts`
- [ ] 6.5 RED→GREEN: `audit-redaction-chain-verification.spec.ts`

## Phase 7: Module Adoption

- [ ] 7.1 Wire `AuditModule` in `CoreModule`
- [ ] 7.2 P0: Auth (login, logout, authenticate, authorize, deny) via AuditPublisher
- [ ] 7.3 P0: Role/Permission (assign, revoke, create, delete — dual-publish)
- [ ] 7.4 P1-P3: User + API + Document + Config + Integration modules
- [ ] 7.5 Write migration docs per step