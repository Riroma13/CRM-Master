# Architecture Review — SPEC-0018: Audit & Compliance Platform

**Verdict: REJECTED**

## Blocking Issues

| # | Finding | Effort |
|---|---------|--------|
| 🔴 #1 | **Hash chain fork on concurrent events** — Two BullMQ workers for the same tenant read `prevHash = lastEvent.hash` concurrently, producing a fork. Core integrity violated. | High |
| 🔴 #2 | **No append-only enforcement** — No Prisma middleware, DB trigger, or RLS prevents `UPDATE`/`DELETE` on `audit_events`. | Medium |
| 🔴 #3 | **Partition legal hold cross-contamination** — Holding one tenant's partition retains ALL tenants' data in that partition. GDPR violation. | High |
| 🔴 #4 | **GDPR deletion breaks hash chain** — Dropping a partition creates a permanent gap. Chain cannot be verified. | High |

## High Severity

| # | Finding | Effort |
|---|---------|--------|
| 🟡 #5 | No boundary rule: Activity Timeline vs Audit Platform — module authors don't know where to publish | Medium |
| 🟡 #6 | Genesis hash inconsistency (`"0000..."` vs `sha256`) | Low |
| 🟡 #7 | BRIN vs B-tree contradiction — BRIN on tenantId is ineffective | Medium |
| 🟡 #8 | Cold cache hash lookup is expensive — no `tenant_audit_state` table | Medium |
| 🟡 #9 | Compliance rules lack data access contract — cannot evaluate cross-system rules | Medium |
| 🟡 #10 | Tenant isolation gap in compliance batch evaluation | Medium |
| 🟡 #11 | Compliance rules cannot detect MISSING events | High |
| 🟡 #12 | No adoption analysis for 9+ modules | Medium |
| 🟡 #13 | ComplianceViolation FK orphaned on partition drop | Medium |

## Conditions for re-submission

1. Fix hash chain race (per-tenant serialization, `tenant_audit_state` table, or tenant-sharded queues)
2. Implement append-only enforcement (Prisma middleware + DB trigger + doorbell test)
3. Replace partition-level legal hold with row-level legal hold
4. Document GDPR deletion strategy that preserves hash chain integrity
5. Define Activity Timeline vs Audit Platform boundary decision rule
6. Add `tenant_audit_state` table for O(1) hash lookup
7. Add ComplianceContext for cross-system rule evaluation
8. Produce module adoption inventory before Apply
