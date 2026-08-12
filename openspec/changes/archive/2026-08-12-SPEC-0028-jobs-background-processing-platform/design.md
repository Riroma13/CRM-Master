# Design: SPEC-0028 — Jobs & Background Processing Platform

> **Status:** Draft — Design Refinement complete. **Next gate:** fresh Architecture Review only; the one Design Refinement retry is consumed.

## 1. Executive Summary
Create a small, API-process BullMQ platform that centralizes the single Redis root, typed domain enqueueing, shutdown, tenant revalidation, and queue telemetry. Existing feature processors, queue identities/options, domain state, DLQs, and Identity’s audit outbox remain authoritative. This corrects the recovered but unapproved 2026-07-21 design: no generic `JobDefinition`/`JobRun`/`JobSchedule` schema, direct `new Queue`, shared payload authority, or platform-owned feature DLQ retry is introduced.

## 2. Technical Approach
`JobsModule` owns `BullModule.forRoot()` using the existing `REDIS_URL` source and exports an internal `JobsClient`. Domains submit a registered definition plus server-derived context; the client validates data, applies the definition’s queue/options, and exposes BullMQ-free results. A worker validates the envelope again, verifies the tenant is active, creates `PrismaService.forTenant(tenantId)`, and invokes the domain handler. Invalid/foreign/inactive authority is terminal and fail-closed.

Delivery is at-least-once. BullMQ retry/backoff is definition-owned; a handler must reload scoped state and use its existing unique/upsert/claim protection. Delayed work uses `delay`; recurring work uses stable BullMQ scheduler IDs. Pending jobs may be removed; active jobs report `active` and are never force-cancelled. The API process pauses/drains workers at shutdown; stalled work is recovered after restart. No standalone worker, coordinated multi-process drain, cross-region failover, exactly-once, business compensation, or atomic PostgreSQL+Redis enqueue is guaranteed.

## 3. Architecture Decisions
| Decision | Options | Chosen | Rationale |
|---|---|---|---|
| Root/config | feature root; platform root | `JobsModule` root from `REDIS_URL` | Current root is Activity Timeline; one root avoids divergent connections without renaming feature queues. |
| Contract/location | `packages/shared`; `modules/jobs` | internal `apps/api/src/modules/jobs/jobs.contracts.ts` | No frontend/external consumer exists; prevents a premature shared public contract. |
| Persistence/outbox | generic models/outbox; feature state | no generic persistence/outbox | PostgreSQL and Redis cannot commit atomically. Identity already persists and leases audit intent before enqueue; retain it. |
| DLQ/retry | central processor; feature ownership | definitions retry; feature DLQs unchanged | Existing DLQs encode feature semantics; central ownership would conflict with Identity delivery behavior. |
| Topology | worker service; API process | API process | Processors already run in API; split only after measured saturation/drain evidence. |

## 4. Data Flow
```text
trusted request/system context -> JobsClient -> Redis queue -> worker envelope validation
        |                                      -> active-tenant check -> forTenant() -> domain handler
        +-- domain DB transaction/outbox (when durability is required)          | failure
                                                                      BullMQ retry -> existing feature DLQ
```
`tenantId`, actor and correlation data are trusted only when derived from Host/session or a trusted system trigger. Payload `tenantId`, queue name, handler key, attempts, and delay are untrusted input; definitions—not callers—supply queue policy. Before effects, reload the target through the scoped client; missing, inactive, or cross-tenant records terminate without retry. Emit redacted structured logs and queue metrics; only a domain explicitly requesting an existing audit/activity integration emits it.

## 5. Working Set
### 5.1 Primary Files
| File | Action | Reason |
|---|---|---|
| `apps/api/src/modules/jobs/jobs.module.ts` | Create | global BullMQ root and exported platform providers. |
| `apps/api/src/modules/jobs/jobs-redis.config.ts` | Create | fail-closed `REDIS_URL` connection factory. |
| `apps/api/src/modules/jobs/jobs.contracts.ts` | Create | definition, trusted context, status and cancellation contracts. |
| `apps/api/src/modules/jobs/jobs-client.service.ts` | Create | validated enqueue/delay/scheduler/cancel adapter. |
| `apps/api/src/modules/jobs/jobs-tenant-authority.service.ts` | Create | active-tenant revalidation before handler execution. |
| `apps/api/src/modules/jobs/jobs-lifecycle.service.ts` | Create | worker pause/close, Redis probe and queue metrics. |
| `apps/api/src/modules/activity-timeline/activity-timeline.module.ts` | Modify | remove its `BullModule.forRoot`; retain registrations/options. |
| `apps/api/src/modules/activity-timeline/activity-timeline-queue.constants.ts` | Modify | retain queue identities; remove local connection ownership. |
| `apps/api/src/modules/infrastructure/infrastructure.module.ts` | Modify | import `JobsModule` alphabetically as infrastructure feature. |
| `apps/api/src/modules/health/health.module.ts` | Modify | import jobs health provider. |
| `apps/api/src/modules/health/health.controller.ts` | Modify | report Redis/job readiness rather than `unknown`. |
| `apps/api/src/modules/observability/metrics/metrics-registry.ts` | Modify | add job duration, failures, active-work and queue-depth metrics; never payload labels. |
| `apps/api/src/modules/observability/__tests__/metrics-registry.spec.ts` | Modify | RED metrics labels and redaction coverage. |

### 5.2 Secondary Files
| File | Action | Reason |
|---|---|---|
| `apps/api/src/modules/activity-timeline/__tests__/activity-timeline-redis-connection.spec.ts` | Modify | RED proof that the platform is the only root/config owner. |
| `apps/api/src/modules/jobs/__tests__/jobs-client.spec.ts` | Create | validation, trusted-context precedence, idempotency job IDs, delay/scheduler/cancel semantics. |
| `apps/api/src/modules/jobs/__tests__/jobs-lifecycle.spec.ts` | Create | retry/poison classification, Redis outage, drain/recovery and bounded concurrency. |
| `apps/api/test/doorbell/jobs-tenant-isolation.e2e-spec.ts` | Create | real DB proof of cross-tenant denial and forged-context fail-closed behavior. |

### 5.3 Expected NOT to Change
- `apps/api/src/modules/identity/identity.module.ts` — preserve existing registrations and queue names.
- `apps/api/src/modules/identity/identity-audit-dispatcher.service.ts` — preserve lease, `DELIVERED`-after-enqueue, and Identity-owned DLQ semantics.
- `apps/api/src/modules/notifications/notification-reminders.service.ts` — existing `@Cron`/in-memory MVP behavior is not silently redesigned; it is a future consumer of the scheduler contract.
- `apps/api/src/modules/knowledge/knowledge.module.ts`, `apps/api/src/modules/reporting/reporting.module.ts`, `apps/api/src/modules/billing/billing.module.ts`, `apps/api/src/modules/audit/audit.module.ts` — retain registrations, processors, scheduler and DLQ ownership.
- `apps/api/src/app.module.ts`, `packages/database/prisma/schema.prisma`, `packages/database/prisma/migrations/` — composition and schema remain unchanged.

## 6. Read Order
1. `apps/api/src/modules/activity-timeline/activity-timeline.module.ts` — locate the sole current root.
2. `apps/api/src/modules/activity-timeline/activity-timeline-queue.constants.ts` — preserve actual Redis and queue identity behavior.
3. `apps/api/src/modules/infrastructure/infrastructure.module.ts` — wire the feature without touching `AppModule`.
4. `apps/api/src/modules/identity/identity.module.ts` — protect existing queue registration.
5. `apps/api/src/modules/identity/identity-audit-dispatcher.service.ts` — preserve outbox lease/delivery boundary.
6. `apps/api/src/common/prisma.service.ts` — use the scoped-client mechanism.
7. `apps/api/src/modules/notifications/notification-reminders.service.ts` — confirm scheduler is out of scope.
8. `apps/api/src/modules/observability/metrics/metrics-registry.ts` and `apps/api/src/modules/health/health.controller.ts` — integrate only existing telemetry/health points.
9. `apps/api/test/doorbell/identity-isolation.e2e-spec.ts` — follow real tenant test setup.

## 7. Expected Commands
```bash
pnpm --filter api test -- --runInBand jobs                         # RED/GREEN unit tests
pnpm --filter api test:e2e -- jobs-tenant-isolation.e2e-spec.ts    # doorbell
pnpm --filter api build && pnpm --filter api lint                  # build/lint
pnpm --filter @crm-master/database generate && pnpm --filter @crm-master/database generate:scope:verify # generation
pnpm test && pnpm lint                                             # required regression gates
```
Schema/migration: N/A—no Prisma change; therefore do not run `db:migrate`. Configuration: validate deployment `REDIS_URL`; no new secret or flag is added.

## 8. Design Confidence
**Confidence: High.** The named root, registrations, scoped Prisma, Identity outbox, scheduler, health placeholder and metrics registry were read. Runtime concurrency values remain definition-specific and must be conservative/configured before the first consumer is migrated.

## 9. Exploration Budget
| Resource | Budget | Notes |
|---|---:|---|
| Searches | 12 | named queue, tenant and test references only |
| Reads | 25 | Working Set/read order only |
| Creates | 9 | six platform files, two unit tests, and one doorbell test |
| Modifies | 8 | exact primary/secondary files |

## 10. Risks
| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Root extraction disrupts queues | Med | High | preserve names/options; module-init regression tests; rollback root ownership only. |
| Redis outage or poison job | Med | High | enqueue returns contextual error; retry only classified transient failures; terminal failures stay feature-owned DLQ. |
| Tenant leakage/replay | Low | Critical | trusted-context-only envelope, execution-time active check, scoped reload and doorbell tests. |
| Shutdown duplicates work | Med | Med | pause/drain deadline, close connection, idempotent handlers, stalled-job recovery test. |

## 11. Testing Strategy
| Layer | Focus | Approach |
|---|---|---|
| Unit | schemas, forged fields, deterministic job IDs, retry/backoff/poison, status/cancel | mocks; RED before code |
| Integration | root registration, Redis failure, scheduler/delay, drain/restart, telemetry/health | Nest/BullMQ test connection |
| Doorbell | tenant A cannot execute/read B; inactive/forged tenant is terminal | real DB and scoped Prisma |
| Regression | Identity outbox and existing queue identities/options | existing Identity/feature suites unchanged |

## 12. Doorbell Tests
| Test file | What it proves |
|---|---|
| `apps/api/test/doorbell/jobs-tenant-isolation.e2e-spec.ts` | A job envelope naming tenant B or an inactive tenant cannot invoke a B-scoped effect from A/trusted A context. |

## 13. Required ADRs
| ADR | Reason | Status |
|---|---|---|
| None | No schema, topology, retention-policy, or public-contract change. | N/A |

## 14. Boundaries
| Boundary | Owner | Purpose / excludes |
|---|---|---|
| Redis root/lifecycle | JobsModule | connection, drain, probe; not domain workflow. |
| queue definitions/handlers | domain module | payload schema, idempotency, retry and effects; not global config. |
| durable intent/DLQ | existing domain | Identity outbox and feature DLQs remain owned; no consolidation. |
| metrics/health | Observability/Health | aggregates/redacted labels; no payload persistence. |

## 15. Extensibility
A future domain adds a local definition/handler and injects `JobsClient`; it never constructs `Queue`. A future worker service consumes the same contract only after an ADR and measured capacity evidence. Notification reminder migration is separately designed because it changes reminder durability.

## Architecture Review Preparation (MANDATORY)
### A. Scalability
| Factor | 10× | 100× | Mitigation |
|---|---|---|---|
| Throughput/memory | more active jobs | API contention | per-definition concurrency, gauges, then worker-service ADR |
| Storage | Redis transient backlog | retention pressure | existing `removeOn*`; domains own durable records |
**Decision:** no partitioning now. **Rationale:** no generic table. **Alternative:** tenant queues/worker service. **Future impact:** metrics trigger a later split.

### B. Open/Closed Principle (OCP)
**Point of extension:** a domain-local definition/handler. **Decision:** typed internal registry. **Rationale:** add a consumer without changing root. **Alternative:** direct queue injection. **Future impact:** preserves feature ownership.

### C. Ownership
| Data / capability | Owner | Consumers |
|---|---|---|
| transport/lifecycle | JobsModule | domains |
| effects/idempotency/DLQ | each feature | JobsModule invokes only |
**Decision:** no generic job data; existing domain state is authoritative. **Rationale:** platform transport/lifecycle must not duplicate domain ownership. **Alternative:** recovered generic models. **Future impact:** a future durable abstraction needs ADR.

### D. Data Retention
| Data | Lifetime | Archive | Deletion |
|---|---|---|---|
| BullMQ terminal records | existing queue options | none | `removeOn*` |
| domain audit/state | existing feature policy | existing | existing |
**Decision:** no new retention data. **Rationale:** no schema. **Alternative:** JobRun. **Future impact:** revisit only with a product query need.

### E. Idempotency
| Operation | Duplicate risk | Protection | Fallback |
|---|---|---|---|
| enqueue/execute | Redis retry/stall | stable job ID plus domain unique/upsert/claim | safe no-op/reload |
**Decision:** at-least-once. **Rationale:** distributed boundary. **Alternative:** exactly-once. **Future impact:** handlers remain replay-safe.

### F. Shared Contracts
| Contract | Location | Consumers | Producers |
|---|---|---|---|
| job definition/context | `apps/api/src/modules/jobs/jobs.contracts.ts` | API domains | JobsModule |
**Decision:** API-internal contract. **Rationale:** no cross-package consumer. **Alternative:** `packages/shared`. **Future impact:** promote only with a real second runtime.

### G. Partitioning Strategy
| Dimension | Risk | Strategy |
|---|---|---|
| Tenant/time/volume | no new relational data | N/A; existing domains retain indexes/retention |
**Decision:** no platform partition. **Rationale:** no platform table. **Alternative:** generic JobRun. **Future impact:** ADR before persistence.

## 16. Interfaces / Contracts
```ts
export interface TrustedJobContext { tenantId: string; correlationId?: string; idempotencyKey: string }
export interface JobDefinition<T> {
  key: string; queueName: string; schema: z.ZodType<T>; attempts: number;
  backoff: { type: 'exponential'; delay: number }; concurrency: number;
  handle(context: TrustedJobContext, data: T): Promise<void>;
}
export interface JobsClient {
  enqueue<T>(definition: JobDefinition<T>, context: TrustedJobContext, data: unknown, options?: { delay?: number }): Promise<{ id: string }>;
  schedule<T>(definition: JobDefinition<T>, schedulerId: string, pattern: string, context: TrustedJobContext, data: unknown): Promise<void>;
  cancel(queueName: string, id: string): Promise<'cancelled' | 'active' | 'missing'>;
}
```
JobsClient must not accept caller-supplied queue/options. Validation failure is terminal; transient infrastructure errors are surfaced to the domain without secrets. Status reflects BullMQ only, not a generic business lifecycle.

## 17. Migration Strategy
| Step | Description | Compatibility / rollback |
|---|---|---|
| 1 | Deploy code with platform root and no producer migration; verify `REDIS_URL`, health, metrics. | Existing queue names/options/processors unchanged; revert code restores Activity Timeline root. |
| 2 | Remove Activity Timeline root after module-init/queue regression tests. | Redis jobs remain on identical queues; redeploy prior code if readiness fails. |
| 3 | Later, separately approved domain adoption. | No dual-send; retain domain outbox/DLQ; disable that consumer definition and drain/retry per domain rollback. |
No database migration/backfill, feature flag, or deployment flag is required: this foundation is behavior-preserving. A feature flag would not make root duplication safe and is therefore N/A. Deployment order is config validation → code rollout → readiness/metrics → traffic; rollback is code rollback plus normal Redis recovery, never deletion of queues or domain records.

## 18. Open Questions
| # | Question | Status | Resolution |
|---:|---|---|---|
| 1 | Per-definition concurrency defaults | Open, non-blocking | Architecture Review must require conservative values before any domain adoption. |
| 2 | Standalone worker threshold | Resolved | ADR only after metrics show API contention or drain failures. |

### Brief Traceability and Threat Matrix
| # | Requested question | Design evidence / acceptance proof |
|---:|---|---|
| 1 | Existing primitives/ownership | §§2–3,14; root and feature regression tests |
| 2 | Trusted/untrusted context | §§2,4,16; forged-context RED |
| 3 | Execution-time revalidation | §§2,4; inactive/foreign doorbell RED |
| 4 | At-least-once/idempotency | §§2,16; replay/unit RED |
| 5 | Retry/poison/DLQ | §§2–3,11; retry/DLQ RED |
| 6 | Delay/scheduling | §§2,16; scheduler/delay RED |
| 7 | Concurrency/resources | §§2,10, AR-A; bounded-concurrency RED |
| 8 | Cancellation/status | §§2,16; pending/active/missing RED |
| 9 | Observability/audit/activity | §§4–5,11,14; metrics/redaction RED |
| 10 | No BullMQ domain coupling | §§3,15–16; adapter unit RED |
| 11 | DB/enqueue/outbox | §§2–3,17; Identity regression RED |
| 12 | Absent guarantees | §2; review assertion |
| 13 | Migration/config/rollback | §§7,17; rollout checklist |
| 14 | Shutdown/recovery/topology | §§2,10–11; drain/restart RED |
| 15 | Operational boundaries/tests | §§10–12; `pnpm test` gate |

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no file classification/execution | none | none |
| Git repository selection | N/A — no Git command | none | none |
| Commit state | N/A — no commit | none | none |
| Push state | N/A — no push | none | none |
| PR commands | N/A — no PR automation | none | none |
| Process integration | Applicable — API hosts workers | pause/drain/close; failure leaves replay-safe work | lifecycle shutdown and stalled recovery |
