# Design: SPEC-0032 — Data Retention & Lifecycle Platform

> **Status:** Refined after initial BLOCKED Architecture Review; pending one fresh Architecture Review
> **Persistence:** Hybrid — this file is the exact artifact; Engram stores bounded status under `sdd/SPEC-0032-data-retention-lifecycle-platform/design`.

## 1. Executive Summary

Retention currently exists as independent audit and document cleanup code, with no shared policy lifecycle, execution ledger, schedule, or operator-visible outcome. This change creates a tenant-scoped Lifecycle feature module that owns policy scheduling, immutable run records, and retry-safe orchestration. Domain adapters retain ownership of their data and perform only their declared purge action; the platform never performs generic cross-model deletion. This bounded refinement closes AR-001 and AR-002: feature-module wiring is cycle-free, and policies schedule target-owned retention rather than redefining target retention windows. AR-003 remains a non-blocking 24-month operational-evidence condition owned by product/compliance.

## 2. Technical Approach

`DataLifecyclePolicy` configures one target (`audit-events` or `document-trash`) for one tenant, a schedule, and an enabled state; it never stores archive or purge durations. The policy service schedules a deterministic BullMQ job through the existing Jobs client; the worker revalidates the trusted tenant envelope, loads the policy, and dispatches to a registered domain adapter.

`LifecycleModule` is a feature module, not a composition module: it imports `AuditModule` and `DocumentEngineModule`, owns its controller/services/registry, and injects their exported adapter tokens. Domain modules never import `LifecycleModule`; each provides and exports its own adapter token, so no `forwardRef` or reverse ownership is needed. The audit adapter delegates to the hold-safe audit policy already owned by Audit; the document adapter purges only its owner-managed expired, unrestored trash. A transactionally created `DataLifecycleRun` records start, terminal status, one `purgedCount`, and a redacted failure code. Policy changes and terminal runs publish audit events through the existing audit boundary. No UI, historical backfill, physical partition management, or generic record deletion is included.

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
| --- | --- | --- | --- |
| Ownership and wiring | Generic ORM deleter; domain modules import Lifecycle; Lifecycle feature imports owner modules | Lifecycle feature imports `AuditModule`/`DocumentEngineModule` and injects their exported adapter tokens | Keeps providers/controllers in a feature module, preserves domain ownership, and forms one-way `Lifecycle -> domain` Nest imports with no `forwardRef`. |
| Execution | Request-time cron; BullMQ scheduler | Existing Jobs client and worker | Reuses tenant validation, retries, shutdown, and deterministic scheduler IDs. |
| Evidence | Logs only; run ledger | Tenant-scoped `DataLifecycleRun` | Provides queryable, idempotent operational evidence without retaining payloads. |
| Target semantics | Shared archive/purge fields; target-discriminated schedules | Discriminated schedule-only policies; owner adapters define eligibility | Audit has no v1 archive action and uses its existing hold-safe retention policy; document trash uses only `expiresAt`/`restoredAt`. Unsupported action fields are rejected. |
| Holds | Global policy flag; target-specific holds | Existing audit row holds; no document hold in v1 | Does not weaken the established audit protection or invent document legal semantics. |

## 4. Data Flow

```text
Tenant admin (Host-resolved) -> Lifecycle API -> Policy service -> DataLifecyclePolicy
                                                   |                 |
                                                   +-> Jobs scheduler +-> lifecycle-run job
                                                                         |
JobsLifecycleService -> tenant revalidation -> Runner -> owner adapter -> owner data
                                                  |                         |
                                                  +-> DataLifecycleRun <---+
                                                           |
                                                     AuditPublisher
```

Invalid schedules, a route/body target mismatch, or unsupported `archiveAfterDays`/`purgeAfterDays` fields return 400. A disabled, missing, or foreign-tenant policy is terminal/no-op and creates no destructive action. Adapter failures mark the run failed and use the existing bounded job retry; a repeated delivery with the same `policyId:scheduledAt` run key returns the prior terminal run.

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add tenant-scoped lifecycle policy and run-ledger models, indexes, and uniqueness. |
| 2 | `packages/shared/src/lifecycle/lifecycle.types.ts` | Create | Define target, schedule, policy, adapter, and run contracts plus Zod input schemas. |
| 3 | `packages/shared/src/lifecycle/index.ts` | Create | Export the lifecycle public contract. |
| 4 | `packages/shared/src/index.ts` | Modify | Re-export lifecycle contracts from the workspace boundary. |
| 5 | `apps/api/src/modules/lifecycle/lifecycle.module.ts` | Create | Lifecycle feature module: imports owner modules and owns controller, policy service, runner, and registry providers. |
| 6 | `apps/api/src/modules/lifecycle/lifecycle-policy.service.ts` | Create | Validate, persist, enable/disable, and schedule policies. |
| 7 | `apps/api/src/modules/lifecycle/lifecycle-runner.processor.ts` | Create | Execute trusted jobs, create/finalize run records, and dispatch adapters. |
| 8 | `apps/api/src/modules/lifecycle/lifecycle.controller.ts` | Create | Host-scoped admin endpoints for policy CRUD and run history. |
| 9 | `apps/api/src/modules/lifecycle/lifecycle-job.definition.ts` | Create | Typed queue definition and deterministic idempotency/scheduler keys. |
| 10 | `apps/api/src/modules/audit/retention/retention-engine.ts` | Modify | Become the registered audit adapter; make one retention cutoff/action unambiguous and hold-safe. |
| 11 | `apps/api/src/modules/document-engine/retention/retention-service.ts` | Modify | Become the registered document-trash adapter and return structured counts. |
| 12 | `apps/api/src/modules/infrastructure/infrastructure.module.ts` | Modify | Compose LifecycleModule without modifying `app.module.ts`. |

### 5.2 Secondary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `apps/api/src/modules/audit/audit.module.ts` | Modify | Provide and export the audit adapter token; it does not import LifecycleModule. |
| 2 | `apps/api/src/modules/document-engine/document-engine.module.ts` | Modify | Provide and export the document-trash adapter token; it does not import LifecycleModule. |
| 3 | `apps/api/src/modules/lifecycle/__tests__/lifecycle-policy.service.spec.ts` | Create | RED/GREEN coverage for validation, scheduling, and tenancy. |
| 4 | `apps/api/src/modules/lifecycle/__tests__/lifecycle-runner.processor.spec.ts` | Create | RED/GREEN coverage for idempotency, failures, and adapter dispatch. |
| 5 | `apps/api/src/modules/audit/__tests__/retention-engine.spec.ts` | Modify | Prove held audit events are never selected and duplicate runs do not double-purge. |
| 6 | `apps/api/src/modules/document-engine/retention/__tests__/retention-service.spec.ts` | Modify | Prove only expired, unrestored tenant trash is processed. |
| 7 | `apps/api/test/doorbell/data-lifecycle-isolation.e2e-spec.ts` | Create | Prove Host-derived tenant isolation across API, jobs, policies, and runs. |

### 5.3 Expected NOT to Change

- `apps/api/src/app.module.ts` — composition stays through `InfrastructureModule`.
- `apps/api/src/modules/jobs/*` — consume the established Jobs contracts; do not alter platform infrastructure.
- `packages/database/prisma/generators/tenant-scope/*` — generated outputs are produced by the existing generator, not hand-edited.
- Frontend applications and other active OpenSpec changes — API/platform scope only.

## 6. Read Order

1. `packages/database/prisma/schema.prisma` — establish model ownership and generated tenant scope.
2. `packages/shared/src/lifecycle/lifecycle.types.ts` — consume discriminated schedule-only policies and the two exported adapter tokens first.
3. `apps/api/src/modules/jobs/jobs.contracts.ts` and `jobs-lifecycle.service.ts` — use trusted execution and idempotency conventions.
4. `apps/api/src/modules/lifecycle/lifecycle-policy.service.ts` — understand policy-to-scheduler flow.
5. `apps/api/src/modules/lifecycle/lifecycle-runner.processor.ts` — understand run-ledger and dispatch flow.
6. Audit and document retention services plus owner modules — implement only their adapter responsibilities and exported-token boundary.
7. Corresponding unit and doorbell tests — preserve RED → GREEN → REFACTOR evidence.

## 7. Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_data_lifecycle_platform
pnpm --filter database generate
pnpm --filter api test -- lifecycle
pnpm --filter api test -- retention
pnpm --filter api test:e2e -- data-lifecycle-isolation
pnpm --filter api lint
pnpm --filter api build
```

## 8. Design Confidence

**Confidence:** High

The concrete owners, existing Jobs contract, audit retention policy/holds, document-trash expiry, composition boundary, and Jest conventions were inspected. The new module has one bounded cross-domain responsibility: orchestration, never data ownership.

## 9. Exploration Budget

| Resource | Budget | Notes |
| --- | --- | --- |
| Repo searches | 8 | Only lifecycle, audit, documents, Jobs, tenancy, and tests. |
| Files to read | 24 | Read Order plus directly affected modules/tests. |
| Files to create | 9 | Contracts/tokens, module/services/processor/controller/job definition, three tests. |
| Files to modify | 8 | Schema, exports, composition, adapter registration, and focused tests. |

## 10. Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Duplicate scheduler delivery purges twice | Med | High | Unique run key, transaction, terminal-run return, and idempotent adapter predicates. |
| Policy bypasses legal hold | Low | High | Audit adapter owns SQL predicate; RED test seeds held and unheld rows. |
| Forged job tenant data reaches another tenant | Low | High | Jobs lifecycle rejects conflicting payload tenant IDs; doorbell test uses a forged envelope. |
| Target policy redefines owner retention | Low | High | Strict discriminated schedule-only inputs reject action-duration fields; adapters read owner-owned audit policy or document expiry. |
| Adapter registration creates a module cycle | Low | High | Lifecycle feature imports owner modules; owner modules export tokens and never import LifecycleModule; test the module graph without `forwardRef`. |

## 11. Testing Strategy

| Layer | Focus | Approach |
| --- | --- | --- |
| Unit | Discriminated schedule-only policy, target allowlist, scheduler key | Jest with Jobs client and Prisma mocks; assert unsupported duration/action fields are 400-equivalent validation failures. |
| Unit | Run claim/finalization and duplicate delivery | Jest with transactional repository mocks. |
| Unit | Module registration and audit/document adapters | Compile `LifecycleModule` with both exported tokens; seed held/unheld audit rows and expired/restored trash. |
| Integration | Host-scoped policy API and persisted run history | Supertest with tenant resolution. |
| Doorbell | Cross-tenant policy/job/run access | Real HTTP and distinct tenant fixtures. |
| Regression | Audit append-only and Jobs lifecycle | Run focused existing suites. |

## 12. Doorbell Tests

| Test file | What it proves |
| --- | --- |
| `apps/api/test/doorbell/data-lifecycle-isolation.e2e-spec.ts` | Tenant A cannot create, read, schedule, or observe Tenant B policy/run data; a forged `tenantId` job payload is terminally rejected with no mutation. |
| `apps/api/src/modules/audit/__tests__/retention-engine.spec.ts` | Held audit rows survive a lifecycle run while eligible rows are processed. |
| `apps/api/src/modules/document-engine/retention/__tests__/retention-service.spec.ts` | A restored or unexpired trash record is not removed. |

## 13. Required ADRs

| ADR | Reason | Status |
| --- | --- | --- |
| `docs/architecture/adr/ADR-0032-data-retention-lifecycle-platform.md` | New data-policy bounded context, Prisma schema change, lifecycle ownership, and retention/privacy decision. | Proposed |
| `docs/architecture/adr/0009-document-platform.md` | Existing document retention/storage ownership. | Consulted |

## 14. Boundaries

| Boundary | Owner | Purpose |
| --- | --- | --- |
| Policy, run ledger, registry | LifecycleModule (feature) | Configure schedules, evidence, and dispatch; imports owner modules and never direct-deletes domain rows. |
| Adapter registration | AuditModule / DocumentEngineModule | Provide/export their named adapter token; never import LifecycleModule. |
| Audit lifecycle action and holds | AuditModule | Select/process audit records while preserving holds and append-only rules. |
| Document-trash lifecycle action | DocumentEngineModule | Remove only expired, unrestored trash and perform storage cleanup. |
| Queue validation/lifecycle | JobsModule | Trusted tenant context, retries, and worker shutdown. |

## 15. Extensibility

| Future feature | How it fits | Effort |
| --- | --- | --- |
| Knowledge-query-log retention | Implement and register a target adapter with its Zod config. | Days |
| S3 archival | Add an audit-owned archive adapter/action after a storage ADR. | Weeks |
| Legal holds for documents | Add document-owned hold semantics before exposing a held document target. | Weeks |

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× | 100× | Mitigation |
| --- | --- | --- | --- |
| Policies/runs | Indexed tenant reads | High run volume | Unique run key, paginated history, bounded target batches. |
| Purge work | More rows/job | Long-running jobs | Per-policy schedules, adapter batch limits, queue concurrency one per target/tenant. |

**Decision:** Schedule per tenant/target and batch inside the owner adapter.

**Rationale:** It isolates retries and avoids a cross-tenant destructive batch.

**Alternative:** One global sweep job; rejected because failure and tenancy evidence become ambiguous.

**Future impact:** Sharding schedulers needs no policy-schema redesign.

### B. Open/Closed Principle (OCP)

**Point of extension:** A domain implements `LifecycleTargetAdapter`, provides/exports a named token, and `LifecycleModule` imports that owner module and injects the token into its registry.

**What must change to add one more:** Add its adapter/token, owner-module export, discriminated Zod policy, registry constructor entry, and tests; the runner is unchanged.

**Decision:** Registry-based target dispatch.

**Rationale:** New lifecycle behavior stays with its data owner.

**Alternative:** Central switch/raw SQL; rejected as it couples policy code to every schema.

**Future impact:** A target can add archive support without changing other targets.

### C. Ownership

| Data / Capability | Owner | Consumers |
| --- | --- | --- |
| Lifecycle policies and runs | LifecycleModule | Admin API, runner, audit evidence |
| Audit rows/holds | AuditModule | Audit adapter |
| Document trash/storage | DocumentEngineModule | Document adapter |

**Decision:** Orchestration owns metadata; domains own mutations.

**Rationale:** The platform cannot know each domain's retention invariant.

**Alternative:** Move all retention into LifecycleModule; rejected for unsafe ownership transfer.

**Future impact:** Domain teams can evolve their own data lifecycle safely.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
| --- | --- | --- | --- |
| Policy | Until disabled/deleted by tenant admin | None | Explicit delete after schedules are removed; it stores schedule/target only. |
| Run ledger | 24 months | None | Scheduled purge after evidence window. |
| Audit events | Existing `AuditRetentionPolicy` | Not configured in v1 | Owner adapter purges only according to its existing policy, never if held. |
| Document trash | Owner-managed `expiresAt` | None | Owner adapter purges only expired, unrestored trash; lifecycle policy controls schedule, not expiry. |

**Decision:** Policies are target-discriminated scheduling controls; preserve existing target lifetimes and retain minimal operational evidence for 24 months.

**Rationale:** A platform must prove enforcement without silently redefining regulated data retention.

**Alternative:** Uniform global lifetime; rejected because domain/legal rules differ.

**Future impact:** Per-target archival can be added only through a new target-specific action contract and ADR.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
| --- | --- | --- | --- |
| Policy schedule | Repeated update | Stable `lifecycle:<policyId>` scheduler ID | Upsert replaces schedule. |
| Run execution | BullMQ retry/delivery | Unique `(policyId, scheduledFor)` run key | Return terminal run/no re-mutation. |
| Domain purge | Crash after partial batch | Deterministic eligible predicate and batches | Retry processes only remaining eligible rows. |

**Decision:** Ledger claim precedes adapter execution.

**Rationale:** It makes duplicate work observable and bounded.

**Alternative:** Queue job ID only; rejected because job retention removes operational evidence.

**Future impact:** Manual runs use a distinct idempotency key.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
| --- | --- | --- | --- |
| `LifecyclePolicyInput`, named adapter tokens, `LifecycleTargetAdapter`, `LifecycleRunResult` | `packages/shared/src/lifecycle/` | API, runner, owner modules | LifecycleModule/domain adapters |

**Decision:** Shared Zod schemas and TypeScript interfaces define the boundary.

**Rationale:** API, worker, and domain adapters validate the same target-specific shape, while named exported tokens make Nest registration explicit and one-way.

**Alternative:** DTOs duplicated per module; rejected for drift risk.

**Future impact:** Frontend clients can consume the same policy/read models later.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
| --- | --- | --- |
| Tenant | Cross-tenant execution | Tenant ID is indexed and comes only from Host/trusted job context. |
| Time | Run-ledger growth | Index `(tenantId, startedAt DESC)` and purge after 24 months. |
| Volume | Large owner tables | Owner adapters batch by stable indexed date/id cursors; no new partitioning in v1. |

**Decision:** No new partitions; prepare date-indexed run evidence and cursor-capable adapters.

**Rationale:** Current targets already have date indexes and a new partition strategy would be speculative infrastructure expansion.

**Alternative:** Partition all lifecycle tables now; rejected until volume evidence warrants it.

**Future impact:** Run tables and audit policy actions can be partitioned later without a public-contract change.

## 16. Interfaces / Contracts

```typescript
export const LifecycleTargetSchema = z.enum(['audit-events', 'document-trash']);
export type LifecycleTarget = z.infer<typeof LifecycleTargetSchema>;

const LifecycleScheduleSchema = z.object({
  schedule: string;
  enabled: boolean;
}).strict();
export const AuditEventsLifecyclePolicySchema = LifecycleScheduleSchema.extend({ target: z.literal('audit-events') });
export const DocumentTrashLifecyclePolicySchema = LifecycleScheduleSchema.extend({ target: z.literal('document-trash') });
export const LifecyclePolicyInputSchema = z.discriminatedUnion('target', [
  AuditEventsLifecyclePolicySchema, DocumentTrashLifecyclePolicySchema,
]);
export type LifecyclePolicyInput = z.infer<typeof LifecyclePolicyInputSchema>;

export const AUDIT_LIFECYCLE_TARGET_ADAPTER = Symbol('AUDIT_LIFECYCLE_TARGET_ADAPTER');
export const DOCUMENT_TRASH_LIFECYCLE_TARGET_ADAPTER = Symbol('DOCUMENT_TRASH_LIFECYCLE_TARGET_ADAPTER');
export interface LifecycleTargetAdapter {
  readonly target: LifecycleTarget;
  execute(context: TrustedJobContext, policy: LifecyclePolicyInput): Promise<{ purgedCount: number }>;
}
```

```prisma
model DataLifecyclePolicy {
  id String @id @default(uuid())
  tenantId String @map("tenant_id")
  target String
  schedule String
  enabled Boolean @default(true)
  @@unique([tenantId, target])
  @@index([tenantId, enabled])
  @@map("data_lifecycle_policies")
}
model DataLifecycleRun {
  id String @id @default(uuid())
  tenantId String @map("tenant_id")
  policyId String @map("policy_id")
  scheduledFor DateTime @map("scheduled_for")
  status String
  purgedCount Int @default(0) @map("purged_count")
  failureCode String? @map("failure_code")
  @@unique([policyId, scheduledFor])
  @@index([tenantId, scheduledFor(sort: Desc)])
  @@map("data_lifecycle_runs")
}
```

`PUT /api/v1/lifecycle/policies/:target` accepts the matching strict discriminated policy without `tenantId`; tenant identity is resolved from `Host`. `archiveAfterDays`, `purgeAfterDays`, unknown action fields, and a route/body target mismatch are 400 validation errors. Audit policy schedules execution only; its adapter reads the existing `AuditRetentionPolicy` and exposes no v1 archive action. Document-trash policy schedules execution only; its adapter uses `expiresAt <= now AND restoredAt IS NULL`. `GET /api/v1/lifecycle/policies/:target/runs` returns only that tenant's paginated ledger with `purgedCount`. Unauthenticated/unauthorized access follows existing guards, and foreign/missing resources are indistinguishable 404s.

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
| --- | --- | --- | --- |
| 1 | Add nullable-safe tables/indexes and generate tenant scope output. | Low | Drop empty new tables/migration before adoption. |
| 2 | Deploy module with no policies; adapters are inert. | Low | Disable/remove module; existing domain cleanup remains unchanged. |
| 3 | Create policies per tenant, then enable schedules after focused checks. | Med | Disable policy and remove scheduler; completed runs remain evidence. |

No automatic backfill or policy seeding occurs. Schema deployment precedes backend deployment; old code ignores additive tables. The ADR records the privacy/retention decision before Apply.

## 18. Open Questions

| # | Question | Status | Resolution |
| --- | --- | --- | --- |
| 1 | Should audit cold-storage archival be enabled now? | Resolved | No. It remains not configured until storage, retrieval, and legal evidence receive a separate ADR. |
| 2 | Should document legal holds be a lifecycle target capability? | Resolved | No. Exclude it until DocumentEngine owns a legal-hold model and release semantics. |
| 3 | Does the 24-month run-ledger window meet product/compliance policy? | Open — CONDITION AR-003, non-blocking | Owner: product/compliance maintainer. Evidence: record confirmation or changed window in `ADR-0032` before any tenant policy is enabled; it remains operational evidence only. |
| 4 | AR-001/AR-002 refinement status | Resolved | AR-001: LifecycleModule is a feature module with one-way owner-module imports and exported named adapter tokens. AR-002: strict target-discriminated policies schedule only; owner adapters define retention eligibility and return `purgedCount`. Prior BLOCKED review remains in `architecture-review.md`; one fresh review is mandatory. |
