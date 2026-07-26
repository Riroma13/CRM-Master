## Exploration: SPEC-0028 — Jobs & Background Processing Platform

### Current State

CRM-Master has **BullMQ ^5.0.0** with `@nestjs/bullmq ^11.0.0` as its queue infrastructure. **17 queues are registered** across 5 feature modules, but there is **zero shared infrastructure** — each module configures its own queues, defines its own job schemas, and manages its own retry/dead-letter handling.

#### BullMQ Configuration

`BullModule.forRoot()` is called **only once**, in `activity-timeline.module.ts`, with inline Redis connection params (host/port/password from env vars). This works because `@nestjs/bullmq` registers config globally, but the setup is hidden inside a non-obvious feature module — it's not a deliberate architectural foundation.

#### Queue Inventory

| Queue Name | Module | Processor? | Type | Active Consumers |
|---|---|---|---|---|
| `activity-timeline:ingestion` | activity-timeline | ✅ processor | Queue | 1 worker |
| `activity-timeline:dlq` | activity-timeline | ❌ | DLQ | **none** |
| `kb:ingestion` | knowledge | ✅ ingestion.service | Queue | 1 worker |
| `kb:reindex` | knowledge | ✅ ingestion.service | Queue | 1 worker (concurrency: 1) |
| `kb:garbage-collector` | knowledge | ✅ gc.service | Scheduled | 1 worker |
| `kb:ingestion-dlq` | knowledge | ❌ | DLQ | **none** |
| `audit:ingestion` | audit | ✅ ingestion.service | Queue | 1 worker |
| `audit:dlq` | audit | ❌ | DLQ | **none** |
| `audit:retention` | audit | ❌ | Queue | **none** (registered, no processor) |
| `billing:metering` | billing | ✅ metering-cron.service | Cron-triggered | 1 worker |
| `billing:invoice` | billing | ✅ invoice-cron.service | Cron-triggered | 1 worker |
| `billing:stripe-webhooks` | billing | ✅ stripe-webhook.processor | Queue | 1 worker |
| `reporting:dataset:ingestion` | reporting | ✅ dataset-ingestion.service | Queue | 1 worker |
| `reporting:dataset:dlq` | reporting | ❌ | DLQ | **none** |
| `reporting:report:generate` | reporting | ❌ | Queue | **none** (registered, no processor) |
| `reporting:export` | reporting | ❌ | Queue | **none** (registered, no processor) |
| `reporting:schedule` | reporting | ❌ | Queue | **none** (scheduling only, no processor) |

**8 of 17 queues (47%) have no active consumers.** DLQs accumulate jobs forever. `audit:retention`, `reporting:report:generate`, and `reporting:export` are registered but queue jobs to nowhere.

### Existing Cron/Schedule Patterns

Two distinct patterns coexist:

**Pattern 1: BullMQ Job Scheduler (modern, ~3 uses)**
- `MeteringCronRegistrar` — `upsertJobScheduler()` with `0 * * * *` on `billing:metering` queue
- `GarbageCollectorScheduler` (in knowledge.module) — `upsertJobScheduler()` with `0 0 * * *` on `kb:garbage-collector`
- `SchedulingService` (reporting) — user-configured cron expressions via `upsertJobScheduler()` on `reporting:schedule`

**Pattern 2: @nestjs/schedule decorator (legacy, 1 use)**
- `NotificationRemindersService` — `@Cron(CronExpression.EVERY_5_MINUTES)` for appointment reminders

No centralized cron registry, no UI for managing schedules, no persistent schedule state in the database.

### Existing Processor Pattern (shared across all modules)

All 9 active processors follow an identical pattern:

```typescript
@Processor('queue-name')
@Injectable()
export class SomeService extends WorkerHost {
  async process(job: Job<Data, any, string>): Promise<Result> {
    // 1. Zod schema validation
    // 2. DLQ on invalid
    // 3. Business logic
    // 4. DLQ on failure (some modules)
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`Job ${job?.id} failed: ${error.message}`);
  }
}
```

#### Job Schemas (Zod, per-module)
- `AuditIngestionEventSchema` — audit module
- `IngestionJobSchema` / `ReindexJobSchema` — knowledge module
- `DatasetEventSchema` — reporting module
- `StripeWebhookJobData` interface — billing module
- No shared job types between modules

#### DLQ Pattern (5 queues)
Each module that validates jobs sends invalid/failed jobs to its own DLQ. **No DLQ has a processor** — dead letters accumulate forever with no retry, reprocess, or alert.

#### Retry Configuration (per-queue, hardcoded)
| Queue | Attempts | Backoff |
|---|---|---|
| activity-timeline:ingestion | 3 | exponential 1s |
| kb:ingestion | 3 | exponential 1s |
| kb:reindex | 2 | exponential 2s |
| audit:ingestion | 5 (custom retry loop) | exponential 2s |
| billing:metering | 2 | exponential 5s |
| billing:invoice | 3 | exponential 10s |
| billing:stripe-webhooks | 3 | exponential 2s |
| reporting:dataset:ingestion | 3 | exponential 1s |
| reporting:export | 2 | exponential 2s |
| reporting:report:generate | 2 | exponential 2s |

No centralized retry policy, no configurable retry per job type.

### Existing Job Persistence Models (in Prisma)

Only **two models** track job state in the database:
- `ExportJob` (reporting module) — generic status, file path, error tracking
- `ReportExecution` (reporting module) — execution status, result, error

No centralized `JobRun`, `JobDefinition`, `JobSchedule`, or `JobWorker` model. No job history beyond these two specific cases.

### Affected Areas

- **`apps/api/src/modules/jobs/`** — does not exist yet (new module would be created)
- **`packages/shared/src/jobs/`** — does not exist yet (shared types for job DSL)
- **`packages/database/prisma/schema.prisma`** — new models needed (JobRun, JobDefinition, JobSchedule)
- **`apps/api/src/modules/activity-timeline/activity-timeline.module.ts`** — relocate `BullModule.forRoot()` to shared infrastructure
- **`apps/api/src/modules/audit/`** — existing queues to migrate/consume
- **`apps/api/src/modules/knowledge/`** — existing queues to migrate/consume
- **`apps/api/src/modules/billing/`** — existing queues to migrate/consume
- **`apps/api/src/modules/reporting/`** — existing orphan queues to consume via job platform
- **`apps/api/src/modules/notifications/`** — legacy `@Cron` to migrate
- **`apps/api/src/app.module.ts`** — no BullMQ config today; would add job infrastructure module
- **`apps/admin-web/`** — new admin dashboard for job monitoring

### Approaches

1. **Incremental Platform (recommended)** — Create a dedicated `JobsModule` with shared infrastructure (`JobService`, `JobRegistry`, DSL types, Prisma models), then migrate existing modules one at a time.
   - Pros: Low risk, backward compatible, each module sees clear migration path
   - Cons: Takes longer to get full platform benefits; dual-running infrastructure during migration
   - Effort: High (but can be phased)

2. **Backend-only Job Infrastructure** — Add shared job config, job run model, and DLQ processor layer without touching existing per-module processor patterns. No UI, no scheduling API.
   - Pros: Faster to deliver, fixes DLQ gap immediately
   - Cons: Does not address dashboard, scheduling, orchestration — solves only infra gap
   - Effort: Medium

3. **Full Platform (Design-before-migrate)** — Build the complete platform first (DSL, dashboard, scheduling API, retry engine, orchestration), then force-migrate all modules to use it.
   - Pros: Clean break, uniform system from day one
   - Cons: High risk, long feedback loop, breaks existing functionality during migration
   - Effort: Very High

### Recommendation

**Approach 1 (Incremental Platform).** SPEC-0028 should deliver in phases:

**Phase 1 — Shared Infrastructure**
- Extract `BullModule.forRoot()` into a dedicated `JobsInfraModule` with proper config (env vars, connection pooling)
- Create Prisma models: `JobDefinition`, `JobRun`, `JobSchedule` with tenant isolation
- Create shared Zod schemas in `packages/shared/src/jobs/` for job DSL
- Build `JobService` with: `enqueue()`, `getStatus()`, `cancel()`, `retry()`
- Implement `DlqProcessor` service that auto-retries DLQ jobs with configurable policy
- Add `bullmqQueueDepth` and `bullmqJobDuration` metrics to observability

**Phase 2 — Scheduling API**
- Build `POST /api/v1/jobs/schedules` (CRUD for cron-based schedules)
- Migrate `MeteringCronRegistrar` and `GarbageCollectorScheduler` to use the scheduling API
- Migrate `NotificationRemindersService` from `@nestjs/schedule` to BullMQ JobScheduler
- Build `GET /api/v1/jobs/schedules` and `GET /api/v1/jobs/runs` for visibility

**Phase 3 — Admin Dashboard (admin-web)**
- Job queue list with depth, throughput, error rate
- Job run history with search, filter, detail view
- Schedule management UI (create/edit/pause/delete cron schedules)
- Manual job trigger, retry, cancel actions
- DLQ management (view dead letters, retry, discard)

**Phase 4 — Migration of existing modules**
- Activity Timeline — adopt unified job DSL
- Knowledge — adopt unified job DSL
- Audit — adopt unified job DSL; wire `audit:retention` processor
- Billing — adopt unified job DSL
- Reporting — wire processors for `reporting:export`, `reporting:report:generate`

**Phase 5 — Job Orchestration (optional, future)**
- Job chaining / DAG execution
- Fan-out/fan-in patterns
- Conditional branching

### Key Architectural Considerations

1. **BullMQ.forRoot placement** — Must move to a proper `JobsInfraModule` imported at the app level. Connection config should come from `ConfigService`, not inline env vars.
2. **Tenant isolation** — Jobs operate on tenant data. `JobRun` model needs `tenantId` and scoping via Prisma extension. Cross-tenant job execution must be prevented.
3. **Idempotency** — Webhook processors already show the pattern (dedup by eventId). Job platform must support idempotency keys for at-least-once delivery.
4. **DLQ strategy** — Today's DLQs are write-only. A unified DLQ processor should auto-retry with exponential backoff, then alert on persistent failures after N retries.
5. **Retention** — Job run history needs TTL-based cleanup. Prisma models should include `expiresAt` or be cleaned by a periodic GC job.
6. **Concurrency** — Per-tenant concurrency limits (automation module already does this in-memory). The platform should enforce tenant-level concurrency at the queue level.
7. **Backward compatibility** — Existing `@Processor` and `@InjectQueue` patterns must continue working. The platform should be opt-in, not break existing modules.

### Risks

- **Risk 1**: Extracting `BullModule.forRoot()` could break existing modules if not done carefully (they currently rely on the implicit global config). Solution: create the infra module first, then remove forRoot from activity-timeline module.
- **Risk 2**: `reporting:report:generate`, `reporting:export`, and `audit:retention` queues have no processors — jobs may be accumulating in Redis. Before migration, check and drain these queues.
- **Risk 3**: Two cron patterns exist. The `@nestjs/schedule` pattern in notifications must be migrated carefully to avoid missed reminders during cutover.
- **Risk 4**: Per-module retry configs vary widely. Unified retry policy must accommodate the most sensitive case (stripe-webhooks: 3 attempts, 2s backoff) while not over-retrying where not needed.
- **Risk 5**: Admin dashboard must not expose cross-tenant job data. API scoping by tenant is critical.

### Ready for Proposal

Yes. The exploration found a clear, phased approach. The orchestrator should proceed to `sdd-propose` with the following brief:
- Change name: `SPEC-0028-jobs-platform`
- Scope: Incremental platform (5 phases), starting with shared infra and DLQ handling
- The platform baseline already lists BullMQ as an architectural component — this is a product feature, not infrastructure change (no ADR required per se, but an ADR for the job platform architecture is advisable)
