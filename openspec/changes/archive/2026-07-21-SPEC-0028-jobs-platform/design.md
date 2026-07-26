# Design: SPEC-0028 — Jobs & Background Processing Platform

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Estado:** Draft
> **Documento de trabajo.** No modifica el pipeline SDD.

---

## 1. Executive Summary

17 BullMQ queues spread across 5 modules with zero shared infrastructure. `BullModule.forRoot()` is hidden inside `activity-timeline.module.ts` with inline env vars. 47% of queues have no consumers. 5 DLQs accumulate dead letters forever. Phase 1 creates a dedicated jobs platform: extract `forRoot()` into a global `JobsInfraModule` with `ConfigService`, add Prisma models (`JobDefinition`, `JobRun`, `JobSchedule`) with tenant isolation, build `JobService` (enqueue/status/cancel/retry) with idempotency, implement `DlqProcessor` with exponential backoff, and register Prometheus metrics. All existing `@Processor`/`@InjectQueue` patterns continue working — zero breakage. The new module integrates cleanly via `InfrastructureModule` per composition standards.

## 2. Technical Approach

The design follows the **Incremental Platform** approach. Phase 1 delivers only shared infrastructure — no UI, no scheduling API, no module migration.

A new `apps/api/src/modules/jobs/` directory hosts three artifacts: `JobsInfraModule` (global `forRoot()` with `ConfigService`), `JobService` (persistence + BullMQ enqueue), and `DlqProcessor` (dead-letter consumer with configurable backoff).

The `InfrastructureModule` composition module imports `JobsModule`, keeping `app.module.ts` clean. Existing `BullModule.registerQueue()` calls stay in their feature modules — only `forRoot()` moves. This preserves backward compatibility while enabling the new platform.

Prisma models follow the existing multi-tenant pattern (`tenantId` on every row, `@@index([tenantId])`, `@@map()`). Shared Zod schemas live in `packages/shared/src/jobs/`, mirroring the billing types pattern at `packages/shared/src/billing/`.

Existing `bullmqQueueDepth` gauge in `metrics-registry.ts` is reused; new `bullmqJobDuration` histogram is added alongside it.

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Module location | `modules/jobs/` as infra module vs. embedded in InfrastructureModule | `modules/jobs/` as standalone module | Keeps the bounded context self-contained; InfrastructureModule imports it as one line. Follows the pattern of AuditModule, HealthModule, etc. |
| Global module | `@Global()` on JobsInfraModule vs. explicit imports everywhere | `@Global()` on JobsInfraModule | All 5 existing modules depend on `BullModule.forRoot()` having global scope. Extracting to a global module preserves compatibility without touching 5+ module files. |
| Retry strategy | BullMQ built-in retry vs. DlqProcessor-managed retry | DlqProcessor-managed | BullMQ retry on DLQ is counterintuitive (DLQ means already-retried). DlqProcessor reads from DLQ, waits exponential backoff, re-enqueues to source queue. Cleaner separation. |
| Metrics location | New metrics in JobsModule vs. reuse existing MetricsRegistry | Reuse existing `MetricsRegistry` | `bullmqQueueDepth` gauge already exists in `metrics-registry.ts`. Adding `bullmqJobDuration` histogram there keeps all Prometheus registration centralized. |
| Idempotency strategy | Database unique constraint vs. application-level check | Db unique constraint on `(tenantId, idempotencyKey)` | Atomic, no race condition. Application check would need a distributed lock. Db constraint is simpler and safer. |
| DlqProcessor queue discovery | Auto-discover via Redis `*:dlq`, Hardcoded list, Config-driven | Config-driven via `JOBS_DLQ_QUEUES` env var | No requiere Redis introspection. Default explícito: `activity-timeline:dlq,audit:dlq,kb:ingestion-dlq,reporting:dataset:dlq`. Testable y configurable por entorno. |
| JobRun.status type | Prisma enum, String with app validation | String with app-level Zod validation + DB CHECK constraint | Prisma enums requieren migraciones costosas al añadir nuevos status. String + Zod es más flexible. Se agrega CHECK constraint en migration SQL para integridad a nivel DB. |
| JobDefinition seeding | Seed migration only, First-use only, Hybrid | Hybrid: seed via migration con keys conocidas + auto-create on first `enqueue()` con defaults sensibles | Seeds cubren las queues existentes (activity-timeline, kb, audit, billing, reporting). Auto-create permite jobs ad-hoc sin modificar seeds. |

## 4. Data Flow

```
     ┌─────────────┐     enqueue()     ┌──────────────────┐
     │  JobService  │ ───────────────→  │  BullMQ Queue    │
     │  (public API)│                   │  (Redis-backed)  │
     └──────┬───────┘                   └────────┬─────────┘
            │                                    │
            │  writes JobRun                     │  consumer picks up
            ▼                                    ▼
     ┌──────────────┐                  ┌──────────────────┐
     │  PostgreSQL   │                  │  @Processor      │
     │  JobRun table │                  │  (existing)      │
     │  (scoped)     │                  └────────┬─────────┘
     └──────────────┘                            │
                                                 │  failure
                                                 ▼
                                          ┌──────────────────┐
                                          │  DLQ (Redis)     │
                                          └────────┬─────────┘
                                                   │
                                          DlqProcessor picks up
                                                   │
                                          ┌────────▼─────────┐
                                          │  DlqProcessor    │
                                          │  exponential     │
                                          │  backoff + retry │
                                          └────────┬─────────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    │                             │
                                    ▼                             ▼
                           ┌─────────────────┐         ┌─────────────────┐
                           │ re-enqueue to   │         │ mark as         │
                           │ source queue    │         │ dead_lettered   │
                           │ (attempts++)    │         │ + alert metric  │
                           └─────────────────┘         └─────────────────┘
```

**Happy path**: `JobService.enqueue()` creates a `JobRun` row (status=`queued`) + adds a BullMQ job. An existing `@Processor` picks it up, processes it, and the job completes — `JobRun` updated to `completed`.

**Error path**: Processor fails → job goes to DLQ. `DlqProcessor` picks it up, waits `backoffBase * 2^attempt`, re-enqueues to source. After `maxRetries` failures → marks `dead_lettered`, increments `deadLetterCount` counter.

**DlqProcessor queue discovery**: Configured via `JOBS_DLQ_QUEUES` env var — comma-separated list of `dlq-name:source-queue` pairs. Default: `activity-timeline:dlq:activity-timeline:ingestion,audit:dlq:audit:ingestion,kb:ingestion-dlq:kb:ingestion,reporting:dataset:dlq:reporting:dataset:ingestion`. Each entry maps a DLQ to its source queue for re-enqueue after backoff.

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `apps/api/src/modules/jobs/jobs-infra.module.ts` | Create | Global BullModule.forRoot() with ConfigService |
| 2 | `apps/api/src/modules/jobs/jobs.module.ts` | Create | Feature module wiring JobService + DlqProcessor |
| 3 | `apps/api/src/modules/jobs/job.service.ts` | Create | enqueue, getStatus, cancel, retry, list |
| 4 | `apps/api/src/modules/jobs/dlq-processor.ts` | Create | DLQ consumer with exponential backoff |
| 5 | `packages/shared/src/jobs/job.types.ts` | Create | JobStatus union, JobPayload, DTOs |
| 6 | `packages/shared/src/jobs/index.ts` | Create | Barrel export |
| 7 | `packages/database/prisma/schema.prisma` | Modify | Add JobDefinition, JobRun, JobSchedule models |
| 8 | `apps/api/src/modules/activity-timeline/activity-timeline.module.ts` | Modify | Remove BullModule.forRoot(), keep registerQueue |
| 9 | `apps/api/src/modules/infrastructure/infrastructure.module.ts` | Modify | Import JobsModule |
| 10 | `apps/api/src/modules/observability/metrics/metrics-registry.ts` | Modify | Add bullmqJobDuration histogram |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `apps/api/src/modules/jobs/job.service.spec.ts` | Create | Unit + integration tests |
| 2 | `apps/api/src/modules/jobs/dlq-processor.spec.ts` | Create | DLQ processor tests |
| 3 | `apps/api/src/modules/jobs/jobs.module.spec.ts` | Create | Module init test (all 17 queues resolve) |
| 4 | `apps/api/src/modules/jobs/jobs-isolation.spec.ts` | Create | Doorbell test for tenant isolation |
| 5 | `packages/database/prisma/migrations/` | Create | Prisma migration for new models |

### 5.3 Expected NOT to Change

- `apps/api/src/app.module.ts` — stays clean; JobsModule goes through InfrastructureModule per composition rules
- Any existing `@Processor` class — backward compatibility, no migration of processors in Phase 1
- Any existing `BullModule.registerQueue()` call — stays in its module (activity-timeline, knowledge, audit, billing, reporting)
- `packages/shared/src/billing/` — no changes to billing types
- Frontend (`apps/admin-web/`, `apps/tenant-web/`) — Phase 1 is backend-only

## 6. Read Order

1. `packages/database/prisma/schema.prisma` — Existing ExportJob/ReportExecution patterns inform JobRun design
2. `packages/shared/src/billing/billing.types.ts` — Shared types pattern to replicate for jobs
3. `apps/api/src/modules/activity-timeline/activity-timeline.module.ts` — Current forRoot() location to extract from
4. `apps/api/src/modules/billing/billing.module.ts` — registerQueue pattern to understand backward compat
5. `apps/api/src/modules/observability/metrics/metrics-registry.ts` — Existing bullmqQueueDepth to extend
6. `apps/api/src/modules/infrastructure/infrastructure.module.ts` — Where to add JobsModule import
7. `apps/api/src/modules/billing/metering/metering-cron.service.ts` — Existing processor pattern reference

## 7. Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_jobs_platform    # Create migration
pnpm --filter api test -- --testPathPattern jobs                       # Run jobs module tests
pnpm --filter api test -- --testPathPattern activity-timeline          # Verify backward compat
pnpm --filter api lint                                                 # Lint new module
pnpm turbo build                                                       # Build all packages
pnpm test                                                              # Full test suite
```

## 8. Design Confidence

**Confidence:** High

The codebase was read directly — `activity-timeline.module.ts` confirmed the exact `forRoot()` inline config, `metrics-registry.ts` confirmed the existing `bullmqQueueDepth` gauge, `billing.module.ts` confirmed the `registerQueue()` pattern. All 17 queues are accounted for in the exploration document. The Working Set covers all expected files. No unknown unknowns remain.

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 3 | Find all BullModule.registerQueue() calls, existing processor patterns, existing metrics |
| Files to read | 7 | Per Read Order above |
| Files to create | 8 | 4 production + 4 test |
| Files to modify | 4 | schema.prisma, activity-timeline.module.ts, infrastructure.module.ts, metrics-registry.ts |

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Extracting forRoot() breaks existing queues | Low | Critical | Create JobsInfraModule first, keep old import for one deploy cycle. BullMQ dedupes dual registration. |
| Orphan queues (audit:retention, reporting:export) have stale Redis jobs | Med | Low | Drain stale queues during transition via one-time drain script; document current depth. These have no processors today. |
| DlqProcessor re-queues to wrong source queue | Low | High | Config-driven via `JOBS_DLQ_QUEUES` env var. Each entry explicit: `queue-name:source-queue`. No inference. |
| Prisma migration conflicts | Low | Medium | Additive-only models — no existing tables altered. Can be merged alongside other migrations. |

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit | JobService.enqueue/getStatus/cancel/retry | Mock PrismaService + BullMQ queue. Test idempotency collision returns existing JobRun. Test cancel sets status. |
| Unit | DlqProcessor backoff logic | Pure function tests for backoff calculation (5000, 10000, 20000, 40000). Test maxRetries threshold. |
| Integration | JobService + real Prisma + real BullMQ | Spin up testcontainers Redis + Postgres. enqueue creates JobRun row + BullMQ job. Cancel removes BullMQ job. |
| Integration | Module init | Assert all 17 existing queues resolve after forRoot extraction. CoverModule on existing processors. |
| Integration | Existing @Processor tests | Full suite passes without modification (AC8). |

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `apps/api/src/modules/jobs/jobs-isolation.spec.ts` | Tenant A's `JobRun` queries return empty for Tenant B context. enqueue for T1, getStatus with T2 context returns null/404. |
| `apps/api/src/modules/jobs/jobs-isolation.spec.ts` | Idempotency key collision is scoped per tenant — same key across tenants creates separate runs. |

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0028 | Job platform architecture — warrants an ADR as it defines a new bounded context with schema changes and infrastructure decisions. | Proposed |
| ADR-0004 (reference) | Feature freeze policy — confirms template and workflow stability. | Existing |

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `JobsInfraModule` | Jobs module | Global BullMQ connection config, Redis URL from ConfigService. No business logic. |
| `JobService` | Jobs module | Enqueue, status, cancel, retry, list. Creates JobRun + BullMQ job. No knowledge of job schemas. |
| `DlqProcessor` | Jobs module | Reads DLQ queues, re-enqueues with backoff, dead-letters after maxRetries. No module-specific logic. |
| `JobRun` model | Jobs module | Execution record with tenantId. Scoped via Prisma extension. Read by admin-web (Phase 3). |
| `JobDefinition` model | Jobs module | Job type registry. Written by JobService.enqueue. Referenced by JobRun. |
| Existing `@Processor` classes | Feature modules | Continue processing jobs unchanged. Not migrated in Phase 1. |

**What JobsModule does NOT do:** Scheduling (Phase 2), admin UI (Phase 3), module migration (Phase 4), job orchestration (Phase 5).

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| Scheduling API (Phase 2) | `POST /api/v1/jobs/schedules` uses existing `JobSchedule` model + BullMQ `upsertJobScheduler()` | Days |
| Admin dashboard (Phase 3) | Consumes `JobService.list()` + `bullmqQueueDepth` metric. New controllers in admin-web. | Weeks |
| Module migration to unified DSL (Phase 4) | Each module's `@Processor` replaced with `@JobHandler(key)` decorator. Backward compat via bridge. | 1-2 weeks per module |
| Job orchestration / DAG (Phase 5) | New `JobDag` model + `OrchestratorService`. Uses existing `JobService.enqueue` for each node. | Weeks |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× | 100× | Mitigation |
|--------|-----|------|------------|
| Storage | ~2M JobRun rows/month at current volume (avg 7k/day). At 10×: ~20M rows/month. | 200M rows/month. `JobRun` table grows linearly with job volume. | Composite index on `(tenantId, status)` and `(tenantId, createdAt)` ensures query performance. Partition `JobRun` by `createdAt` quarterly at 100×. |
| Query latency | Current index strategy handles 10× — single-tenant queries filter by tenantId first. | At 100×, multi-tenant admin queries (Phase 3) may need time-based partitioning. | Add `createdAt` BRIN index on `JobRun` if cardinality is high. |
| Write throughput | ~3 writes/second at 10× (enqueue + complete). BullMQ handles this natively. | ~30 writes/second at 100×. | PostgreSQL handles 30 writes/s easily. If >300 writes/s needed, batch writes via `createMany`. |

**Decision:** No partitioning needed at Phase 1. Monitor `JobRun` table size quarterly. Add time-based partitioning when rows exceed 50M.

### B. Open/Closed Principle (OCP)

**Point of extension:** `JobService.enqueue()` accepts a generic `JobPayload` type — new job types require only a new `JobDefinition` row + a `@Processor` class in any module.

**What must change to add one more:** Register a new `JobDefinition` in the database + write a `@Processor('new-queue')` class. No changes to `JobService`, `JobsInfraModule`, or `DlqProcessor`.

**Example:** Adding a "slack notification" job in Phase 4 requires: (1) `INSERT INTO job_definitions (key='slack:notify')`, (2) create `SlackNotificationProcessor` in the notification module, (3) call `jobService.enqueue('slack:notify', payload)`. Zero changes to the job platform.

**Decision:** OCP is preserved. New job types are additive — no existing code needs modification.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| `JobDefinition` model | Jobs module | JobService, Admin dashboard (Phase 3) |
| `JobRun` model | Jobs module | JobService, Admin dashboard (Phase 3), Reporting (reads only) |
| `JobSchedule` model | Jobs module | Scheduling API (Phase 2) |
| BullMQ connection config | JobsInfraModule | All modules via global `@InjectQueue()` |
| DLQ processing | DlqProcessor | All existing DLQs (activity-timeline:dlq, audit:dlq, kb:ingestion-dlq, reporting:dataset:dlq) |

**Decision:** Jobs module owns all job-related data. Feature modules own their processor logic only.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| `JobRun` (completed) | 90 days | Export to cold storage via cron job (Phase 2) | Hard delete via GC job after 90+30 days grace |
| `JobRun` (dead_lettered) | 180 days | Manual review before deletion | Hard delete or move to archive table |
| `JobDefinition` | Indefinite | No archive needed | Manual deactivation (`active=false`) |
| `JobSchedule` | Active | No archive needed | Hard delete when schedule is removed |

**Decision:** Implement a `JobRetentionService` in Phase 2. Phase 1 just adds `createdAt` timestamps and indexes needed for future cleanup.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
|-----------|---------------|------------|----------|
| `enqueue()` | Caller retries on timeout | `@@unique([tenantId, idempotencyKey])` on JobRun | Returns existing JobRun on collision |
| `cancel()` | Concurrent cancel | Atomic `updateMany({ where: { id, status: "queued" } })` | No-op if already cancelled |
| `retry()` | Concurrent retry | Atomic status check before re-enqueue | Returns existing new JobRun if already retried |

**Decision:** Database-level unique constraint on `(tenantId, idempotencyKey)` is the primary protection. The `idempotencyKey` is optional — if not provided, idempotency is not guaranteed.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
|----------|----------|-----------|-----------|
| `JobStatus` union | `packages/shared/src/jobs/job.types.ts` | JobService, Admin dashboard (Phase 3) | JobService |
| `JobPayload` type | `packages/shared/src/jobs/job.types.ts` | JobService, External callers | External systems |
| `JobDefinitionDto` | `packages/shared/src/jobs/job.types.ts` | JobService API responses | JobService |
| `JobRunDto` | `packages/shared/src/jobs/job.types.ts` | JobService API responses | JobService |
| `JobScheduleDto` | `packages/shared/src/jobs/job.types.ts` | Scheduling API (Phase 2) | JobService |

**Decision:** All types in `packages/shared/src/jobs/` following the existing `packages/shared/src/billing/` pattern. Zod schemas for runtime validation.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
|-----------|------|----------|
| Tenant | 2000 tenants × 10k jobs/month = 20M rows/month at 100× | Index by `(tenantId, status)` — single-tenant queries are fast. No partition needed until 50M+ rows. |
| Time | Job history querying "last 7 days" becomes slow at 100× | Add `createdAt` BRIN index. Partition by `createdAt` range quarterly if needed. |
| Volume | JobRun table grows unbounded without retention | Retention policy (90 days) keeps table bounded. Partition before retention kicks in. |

**Decision:** No partitioning in Phase 1. Index strategy is sufficient for current scale. Implement quarterly time-based partitioning on `JobRun` only if >50M rows and retention is not enough.

---

## 16. Interfaces / Contracts

```typescript
// ─── JobStatus ─────────────────────────────────────────────
export type JobStatus =
  | 'queued'
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'dead_lettered';

// ─── JobPayload ────────────────────────────────────────────
export type JobPayload = Record<string, unknown>;

// ─── JobDefinitionDto ──────────────────────────────────────
export interface JobDefinitionDto {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  concurrency: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── JobRunDto ─────────────────────────────────────────────
export interface JobRunDto {
  id: string;
  tenantId: string;
  jobDefinitionId: string;
  status: JobStatus;
  payload: JobPayload;
  result?: JobPayload;
  error?: string;
  attempts: number;
  maxRetries: number;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  queueName: string;
  idempotencyKey?: string;
  createdAt: string;
}

// ─── JobScheduleDto ────────────────────────────────────────
export interface JobScheduleDto {
  id: string;
  tenantId: string;
  jobDefinitionId: string;
  cron: string;
  enabled: boolean;
  timezone: string;
  lastRunAt?: string;
  nextRunAt: string;
  createdAt: string;
}
```

```prisma
// ─── JobDefinition ────────────────────────────────────────
model JobDefinition {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  key         String
  name       String
  maxRetries  Int      @default(3) @map("max_retries")
  retryDelay  Int      @default(5000) @map("retry_delay")
  timeout     Int      @default(30000)
  concurrency Int      @default(1)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  runs JobRun[]

  @@unique([tenantId, key])
  @@index([tenantId])
  @@map("job_definitions")
}

// ─── JobRun ────────────────────────────────────────────────
model JobRun {
  id               String    @id @default(uuid())
  tenantId         String    @map("tenant_id")
  jobDefinitionId  String    @map("job_definition_id")
  status           String    @default("queued") // JobStatus enum
  payload          Json
  result           Json?
  error            String?
  attempts         Int       @default(0)
  maxRetries       Int       @default(3) @map("max_retries")
  idempotencyKey   String?   @map("idempotency_key")
  scheduledAt      DateTime  @default(now()) @map("scheduled_at")
  startedAt        DateTime? @map("started_at")
  completedAt      DateTime? @map("completed_at")
  queueName        String    @map("queue_name")
  createdAt        DateTime  @default(now()) @map("created_at")

  jobDefinition JobDefinition @relation(fields: [jobDefinitionId], references: [id])

  @@unique([tenantId, idempotencyKey])
  @@index([tenantId, status])
  @@index([tenantId, jobDefinitionId])
  @@index([createdAt])
  @@map("job_runs")

// Note: add CHECK (status IN ('queued','active','completed','failed','cancelled','dead_lettered'))
// in migration SQL for DB-level integrity. Prisma does not natively support CHECK constraints.
}

// ─── JobSchedule ───────────────────────────────────────────
model JobSchedule {
  id              String    @id @default(uuid())
  tenantId        String    @map("tenant_id")
  jobDefinitionId String    @map("job_definition_id")
  cron            String
  enabled         Boolean   @default(true)
  timezone        String    @default("UTC")
  lastRunAt       DateTime? @map("last_run_at")
  nextRunAt       DateTime  @map("next_run_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  @@unique([tenantId, jobDefinitionId])
  @@index([tenantId])
  @@index([nextRunAt, enabled])
  @@map("job_schedules")
}
```

### JobService Contract

| Method | Signature | Returns | Errors |
|--------|-----------|---------|--------|
| `enqueue` | `(tenantId, key, payload, opts?: { idempotencyKey?, delay? })` | `JobRun` | `NotFoundException` if key unknown, `ConflictException` on idempotency collision |
| `getStatus` | `(tenantId, runId)` | `{ status, attempts, timestamps }` | `NotFoundException` if not found |
| `cancel` | `(tenantId, runId)` | `void` | `ConflictException` if not in `queued\|active` state |
| `retry` | `(tenantId, runId)` | `JobRun` | `ConflictException` if not in `failed\|dead_lettered` state |
| `list` | `(tenantId, filters?: { status?, since?, until?, page?, limit? })` | `{ data: JobRun[], total, page }` | None |

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 0 | Drain orphan queues: audit:retention, reporting:export, reporting:report:generate via one-time script | Low | No rollback needed — drain is idempotent (no data loss for unprocessed jobs) |
| 1 | Create Prisma migration (additive models only) | Low | `prisma migrate down` or just ignore new tables — existing code unaffected |
| 2 | Seed `JobDefinition` rows for known job types (activity-timeline:ingestion, kb:ingestion, etc.) | Low | Remove seed rows — existing processors not affected |
| 3 | Create `JobsInfraModule` with `@Global()` + ConfigService | Low | Module not imported yet — no effect on running system |
| 4 | Create `JobsModule`, `JobService`, `DlqProcessor` | Low | Same as step 3 |
| 5 | Add `JobsModule` to `InfrastructureModule.imports` | Low | Remove the import line to roll back |
| 6 | Remove `BullModule.forRoot()` from `activity-timeline.module.ts` | Med | **Keep both** during first deploy — BullMQ dedupes dual forRoot registration. Remove old forRoot only after verifying all queues resolve. |
| 7 | Add `bullmqJobDuration` histogram to `metrics-registry.ts` | Low | New metric — no affect on existing metrics. Roll back by removing the line. |
| 8 | Deploy and verify all existing tests pass + all 17 queues resolve | Low | Tests + module init test validate this |
| 9 | Start `DlqProcessor` with `JOBS_DLQ_QUEUES` config | Low | Stop DlqProcessor — jobs remain in DLQ (no data loss) |

**Rollback plan:** Revert the `activity-timeline.module.ts` removal (restore `forRoot()`). Remove `JobsModule` from `InfrastructureModule`. The Prisma tables remain but are unused — can be dropped separately. No data migration required.

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | Should `JobDefinition` be pre-seeded with known job types or created on first enqueue? | **Resolved** | Hybrid: seed known keys via migration (activity-timeline:ingestion, kb:ingestion, etc.) + auto-create on first `enqueue()` with sensible defaults. Seed script en `packages/database/seeds/job-definitions.seed.ts`. |
| 2 | Alert mechanism for `deadLetterCount` threshold — should it emit a Prometheus `AlertEvent` row or just expose the counter? | Open | Counter is sufficient for Phase 1. AlertEvent row creation in Phase 3 with admin dashboard. |
| 3 | Concurrency config: per-queue or global? | Open | Default concurrency 5 for DlqProcessor. Per-queue overrides via env in Phase 2. |

---

> **Fin del documento.**
> Este template sigue SDD v2.1. No modifica el pipeline, los prompts ni el workflow.
> Para cambios al template, crear ADR. No modificar directamente.
