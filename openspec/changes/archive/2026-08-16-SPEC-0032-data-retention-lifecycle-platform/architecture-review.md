# Architecture Review: SPEC-0032 — Data Retention & Lifecycle Platform

> **Phase:** Architecture Review (HIGH / ARCHITECT)
> **Status:** PASS — fresh review after the sole permitted Design Refinement
> **Normalized gate:** PASS
> **Persistence:** Hybrid — this file is the exact phase artifact.

> **Review history:** The initial BLOCKED review is preserved below. This fresh
> HIGH / ARCHITECT review is the current judgment and consumes the single
> Architecture Review correction retry.

## Initial Result (preserved)

The Design has the required Enterprise shape and correctly preserves Host-derived
tenant identity, trusted Jobs envelopes, domain ownership, legal-hold intent,
and a bounded Working Set. It cannot advance to Tasks because its module wiring
and target-specific retention contract are materially under-specified and
internally inconsistent.

The canonical workflow permits exactly one next path:

`Design Refinement -> fresh Architecture Review`

Tasks, implementation, and any other lifecycle phase are not legal from this
gate result.

## A–G Review

| Topic | Verdict | Evidence / judgment |
| --- | --- | --- |
| A. Scalability | PASS | Per-tenant/target schedules, tenant/date indexes, bounded adapter batches, and single-target concurrency avoid a cross-tenant sweep and provide a 10x/100x path. |
| B. Open/Closed Principle | BLOCKING | The registry extension point is named, but the Design does not define a legal Nest registration/wiring contract for domain-owned adapters without making a composition module own providers or creating a module cycle. See AR-001. |
| C. Ownership | PASS | Lifecycle owns policies and run evidence; Audit and DocumentEngine own data mutation and their invariants. |
| D. Data Retention | BLOCKING | The shared policy permits archive/purge fields for every target although audit archival is explicitly unavailable and document trash is governed by its own expiry. See AR-002. |
| E. Idempotency | PASS | A stable scheduler ID, unique `(policyId, scheduledFor)` run key, terminal-run return, and deterministic eligible predicates cover duplicate delivery and partial progress. |
| F. Shared Contracts | BLOCKING | The proposed common input does not encode or reject the target-specific capabilities required by the stated retention policy. See AR-002. |
| G. Partitioning Strategy | PASS | Tenant/date indexes and cursor-capable owner batching are proportionate; physical partitioning is deferred pending volume evidence. |

## Findings

| ID | Classification | Finding | Required closure / owner |
| --- | --- | --- | --- |
| AR-001 | BLOCKING | Section 5 calls `LifecycleModule` a “Global composition module exporting the registry and policy service,” while the repository rule requires every Nest aggregation/composition module to contain no providers, controllers, or logic. The Design also requires AuditModule and DocumentEngineModule to register adapters with that registry, but does not define the provider token, registration direction, or cycle-free import/export boundary. | **Design Refinement:** state the concrete, cycle-free module/provider boundary and adapter registration contract. If `LifecycleModule` owns providers/controllers, classify it as a feature module rather than a composition module; keep `InfrastructureModule` pure. Prove domain modules can supply adapters without `forwardRef` or reverse ownership. |
| AR-002 | BLOCKING | `LifecyclePolicyInput` makes `archiveAfterDays?` and `purgeAfterDays` common to `audit-events` and `document-trash`, but the Design says audit archive is “not configured in v1” and documents are purged only after their owner-managed `expiresAt`. The current common contract therefore accepts configurations whose meaning/action is undefined. | **Design Refinement:** define target-discriminated policy inputs and persisted semantics, including validation errors for unsupported actions. State precisely whether document lifecycle policy controls scheduling only or its expiry window, and align the adapter result/count names with that decision. |
| AR-003 | CONDITION | The 24-month run-ledger retention window remains an explicit, non-blocking compliance/product input. It is limited to operational evidence and does not alter existing domain-data lifetimes. | Owner: product/compliance maintainer. Record confirmation or a changed policy window before tenant policies are enabled; preserve the decision in the proposed ADR. |

No `BASELINE_DEBT` finding is recorded. The existing audit raw-SQL retention implementation and cross-tenant document-trash sweep are in the approved Working Set for replacement; they are relevant design inputs, not unrelated baseline debt.

## Contracts, Security, and Tenant Isolation

| Area | Verdict | Evidence / judgment |
| --- | --- | --- |
| API tenant authority | PASS | The Design excludes `tenantId` from policy input and derives identity from `Host`; foreign/missing policy resources are indistinguishable 404s. |
| Job tenant authority | PASS | `JobsLifecycleService` validates a trusted envelope, rejects a conflicting payload `tenantId`, asserts an active tenant, and makes a tenant-scoped authority available before the handler runs. |
| Destructive-operation safety | BLOCKING | Owner adapters and hold-aware predicates are the correct boundary, but AR-002 leaves target action semantics ambiguous; destructive actions cannot be planned safely until the contract is discriminated. |
| Audit legal holds | PASS | The Design requires audit-owned selection and an explicit held/unheld test. Existing retention SQL includes `legal_hold = false`; the refinement must retain this invariant. |
| Tenant isolation evidence | PASS | The approved doorbell scope covers Host-derived policy/run isolation and a forged job `tenantId` with no mutation. |
| Failure evidence | PASS | The run ledger stores counts and a redacted failure code; policy changes and terminal runs publish through the audit boundary. |

## Working Set and Read Order Validation

The Design's 12 primary and 7 secondary paths are bounded and its four excluded
areas protect `app.module.ts`, Jobs infrastructure, generated scope outputs,
frontends, and other active changes. The declared Read Order was consumed before
additional inspection.

| Bounded evidence | Result |
| --- | --- |
| `packages/database/prisma/schema.prisma` | Existing `AuditEvent` has tenant/date indexes and row-level legal holds; `DocumentTrash` has tenant and expiry indexes. The proposed lifecycle models must participate in generated tenant scope. |
| `packages/shared/src/lifecycle/lifecycle.types.ts` | Not present, as expected: this is a Design-declared create path. Its proposed content is reviewed in Design section 16. |
| `apps/api/src/modules/jobs/jobs.contracts.ts`, `jobs-lifecycle.service.ts` | Existing contracts expose `TrustedJobContext`, typed definitions, scheduler IDs, retries, concurrency, and terminal rejection of conflicting tenant payloads. |
| Proposed lifecycle policy/runner paths | Not present, as expected: both are Design-declared create paths. |
| Audit/document retention services and their focused tests | Existing audit service uses tenant-specific hold-aware SQL; document service currently enumerates expired unrestored trash globally. The Design correctly bounds both for replacement and focused tests. |
| `audit.module.ts`, `document-engine.module.ts`, `infrastructure.module.ts` | Existing module evidence confirms the AR-001 composition/wiring blocker and the protected `app.module.ts` boundary. |
| Proposed lifecycle doorbell test | Not present, as expected: this is a Design-declared create path. |

No Working Set expansion or unlisted repository inspection was performed.

## Open Questions

Open question 18.3 is retained as CONDITION AR-003. It is explicitly
non-blocking, has a named owner, and does not normalize the current gate; the
current BLOCKED result is caused only by AR-001 and AR-002.

## Validator Result

| Validator | Result |
| --- | --- |
| `pnpm sdd:validate` | PASS — canonical governance, 14 phases, local Direct wiring, model roles, hybrid persistence, and maintainer gates validated. |
| `pnpm sdd:validate:design -- openspec/changes/SPEC-0032-data-retention-lifecycle-platform/design.md` | PASS — 18 ordered sections, ordered A–G topics, decision/rationale separation, and machine-checkable Working Set validated. |

Validator PASS confirms artifact shape and local workflow wiring; it does not
close the architectural BLOCKING findings above.

## Canonical Next Action

**Design Refinement only.** Resolve AR-001 and AR-002 within the approved
scope, preserve the Design's bounded ownership and tenant-isolation decisions,
then run one fresh HIGH / ARCHITECT Architecture Review. Under the workflow
correction budget, that is the sole permitted retry path after this initial
BLOCKED review.

---

## Fresh Architecture Review — Post-Refinement

### Status

**PASS.** The refined Design closes the two material findings from the initial
review. `LifecycleModule` is now explicitly a feature module with one-way
owner-module imports and exported named adapter tokens; target-discriminated,
strict policy inputs schedule owner-defined retention rather than defining a
generic destructive action. AR-003 remains a recorded non-blocking CONDITION.

### Finding Closure

| ID | Prior classification | Fresh verdict | Closure evidence |
| --- | --- | --- | --- |
| AR-001 | BLOCKING | Closed | Design sections 2, 3, 5, 14, and 16 define `LifecycleModule` as a feature module which imports `AuditModule` and `DocumentEngineModule`; owner modules export named adapter tokens and never import Lifecycle. `InfrastructureModule` remains a pure imports-only composition module. No `forwardRef` is required. |
| AR-002 | BLOCKING | Closed | Design sections 2, 3, 16, and 18 define strict `audit-events` and `document-trash` schedule-only discriminated inputs. Unknown action fields, `archiveAfterDays`, `purgeAfterDays`, and route/body target mismatches are 400 errors. Audit eligibility remains Audit-owned; document eligibility is `expiresAt <= now AND restoredAt IS NULL`. |
| AR-003 | CONDITION | CONDITION — non-blocking | Design sections 13, 18.3, and 17 retain the 24-month run-ledger evidence window, owner product/compliance maintainer, and required ADR-0032 confirmation or changed window before any tenant policy is enabled. It does not alter domain-data retention. |

### A–G Re-evaluation

| Topic | Verdict | Evidence / judgment |
| --- | --- | --- |
| A. Scalability | PASS | Per-tenant/target schedules, bounded owner batches, tenant/date indexes, and target/tenant concurrency prevent a cross-tenant sweep at 10× and 100×. |
| B. Open/Closed Principle | PASS | A new target adds an owner adapter/token, owner-module export, discriminated schema, registry entry, and tests; the runner remains unchanged. The module dependency direction is concrete and cycle-free. |
| C. Ownership | PASS | Lifecycle owns policy/run metadata and orchestration only. Audit and DocumentEngine retain data mutation, hold, expiry, and storage responsibilities. |
| D. Data Retention | PASS | Policies schedule only. Audit uses its existing hold-safe policy; document trash uses owner-managed expiry/restoration; the run ledger is limited by the recorded AR-003 condition. |
| E. Idempotency | PASS | Stable scheduler IDs, unique `(policyId, scheduledFor)` ledger claims, terminal-run return, and deterministic eligible predicates cover duplicate delivery and partial batches. |
| F. Shared Contracts | PASS | Shared strict Zod schemas encode the two supported targets and the named adapter boundary. The contract explicitly rejects unsupported target/action combinations. |
| G. Partitioning Strategy | PASS | Tenant/time indexes and cursor-capable batching are proportional to v1. Physical partitioning remains deferred pending volume evidence without blocking the schema or public contract. |

### Contracts, Security, and Tenant Isolation

| Area | Verdict | Evidence / judgment |
| --- | --- | --- |
| API tenant authority | PASS | `tenantId` is excluded from policy input; identity is Host-derived; foreign or missing resources remain indistinguishable 404s. |
| Job tenant authority | PASS | `JobsLifecycleService` validates `TrustedJobContext`, rejects a conflicting payload tenant ID as terminal, asserts an active tenant, and scopes authority before handler execution. |
| Destructive-operation safety | PASS | The runner dispatches only to registered owner adapters. Audit preserves `legal_hold = false`; document deletion is restricted to expired, unrestored owner trash. No generic cross-model delete is designed. |
| Failure and audit evidence | PASS | The run ledger has terminal status, one `purgedCount`, and a redacted failure code; policy changes and terminal runs publish through the audit boundary. |
| Tenant-isolation proof plan | PASS | The listed Doorbell test requires real Host-derived tenant fixtures, policy/run access isolation, and a forged job tenant payload rejected without mutation. |

### Working Set and Open Questions

The approved Working Set remains bounded at 12 primary and 7 secondary paths.
It protects `app.module.ts`, Jobs infrastructure, generated tenant-scope outputs,
frontends, and other active changes. The approved Read Order was consumed before
inspection. Expected create paths were absent, as expected. One listed primary
path, `apps/api/src/modules/infrastructure/infrastructure.module.ts`, was read
to validate AR-001; it is imports-only and remains the required pure composition
boundary. No unlisted repository path was inspected and no Working Set expansion
occurred.

Open question 18.3 remains AR-003 CONDITION only. It has a named owner,
pre-enablement evidence, and no material architecture finding remains open.

### Validators

| Validator | Result |
| --- | --- |
| `pnpm sdd:validate` | PASS — canonical governance, local Direct wiring/model roles, hybrid persistence, and maintainer gates validated. |
| `pnpm sdd:validate:design -- openspec/changes/SPEC-0032-data-retention-lifecycle-platform/design.md` | PASS — 18 ordered Design sections, A–G topics, decision/rationale separation, and Working Set structure validated. |

### Correction-Budget State

The initial BLOCKED Architecture Review consumed the one permitted Design
Refinement. This fresh review is the mandatory retry and is PASS. No further
Architecture Review correction retry is available or needed.

### Canonical Next Action

**Tasks (MID / BUILDER).** The workflow permits the `Architecture Review ->
Tasks` edge because all material findings are closed and AR-003 is explicitly
non-blocking. Do not begin Apply, implementation, or any Git lifecycle action.
