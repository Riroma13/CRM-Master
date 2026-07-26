# Proposal: SPEC-0028 — Jobs & Background Processing Platform

## Intent

CRM-Master has 17 BullMQ queues across 5 modules with zero shared infrastructure. 47% of queues have no active consumers. DLQs accumulate jobs forever with no processor. BullModule.forRoot() is buried inside activity-timeline. Two cron patterns coexist (BullMQ JobScheduler + @nestjs/schedule). This proposal introduces a shared job platform: unified infrastructure, job persistence, DLQ handling, and standardized retry — delivered incrementally across 5 phases. Phase 1 builds the foundation without breaking any existing module.

## Scope

### Phase 1 — Foundation (this proposal)
- Move `BullModule.forRoot()` into a dedicated `JobsInfraModule` with ConfigService
- New Prisma models: `JobDefinition`, `JobRun`, `JobSchedule`
- `JobService`: enqueue, status, cancel, retry
- `DlqProcessor` — configurable retry policy for dead-letter queues
- Prometheus metrics: `bullmqJobDuration`, `bullmqQueueDepth`
- Shared Zod schemas in `packages/shared/src/jobs/`
- Backward compat: existing `@Processor` / `@InjectQueue` patterns continue working

### Out of Scope for Phase 1
- Scheduling API (POST/GET/DELETE /api/v1/jobs/schedules) — Phase 2
- Admin dashboard UI — Phase 3
- Module migration to unified DSL — Phase 4
- Job orchestration (DAG, fan-out/fan-in) — Phase 5

## Capabilities

### New Capabilities
- `jobs-infrastructure`: Shared BullMQ infra module with ConfigService, connection pooling, and global config
- `job-definitions`: `JobDefinition` Prisma model — canonical job type registry with schema, retry policy, TTL
- `job-runs`: `JobRun` Prisma model with tenantId scoping, status tracking, error capture, idempotency keys
- `dlq-processor`: Dead-letter queue consumer with configurable retry, exponential backoff, and alert threshold

### Modified Capabilities
None — existing module behavior is unchanged. Backward compatible by design.

## Approach

**Incremental Platform** (Approach 1 from exploration). Phase 1 delivers shared infrastructure only:

1. Create `apps/api/src/modules/jobs/` with `JobsInfraModule`, `JobService`, `DlqProcessor`
2. Extract `BullModule.forRoot()` from activity-timeline into `JobsInfraModule`
3. Add Prisma models with tenant scoping (via existing Prisma extension)
4. Add shared Zod schemas to `packages/shared/src/jobs/`
5. Wire `DlqProcessor` to consume all 5 existing DLQs
6. Add Prometheus metrics for queue depth and job duration

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/modules/jobs/` | New | Dedicated jobs module (does not exist yet) |
| `packages/shared/src/jobs/` | New | Shared Zod schemas, types, enums |
| `packages/database/prisma/schema.prisma` | Modified | Add JobDefinition, JobRun, JobSchedule |
| `apps/api/src/modules/activity-timeline/` | Modified | Remove BullModule.forRoot() after extraction |
| `apps/api/src/modules/audit/` | Modified | Wire DlqProcessor to audit:dlq |
| `apps/api/src/modules/knowledge/` | Modified | Wire DlqProcessor to kb:ingestion-dlq |
| `apps/api/src/modules/reporting/` | Modified | Wire DlqProcessor to reporting:dataset:dlq |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Extracting BullModule.forRoot() breaks existing queues | Low | Create infra module first, keep old import during transition, remove in follow-up |
| Orphan queues (audit:retention, reporting:export, reporting:report:generate) have stale Redis jobs | Med | Drain stale queues before migration; document current depth |
| @nestjs/schedule cutover misses reminders (Phase 2) | Low | Phase 2 migration includes overlap window — both cron systems active during cutover |

## Rollback Plan

1. Keep `BullModule.forRoot()` import in activity-timeline alongside new `JobsInfraModule` (dual registration is safe — BullMQ dedupes)
2. Do NOT start `DlqProcessor` until existing DLQs are drained (if needed)
3. Prisma models are additive — no drop/alter existing tables
4. To roll back: remove `JobsInfraModule`, restore activity-timeline as sole forRoot, delete new models

## Dependencies

- ADR-0028 — Job platform architecture decision required before implementation
- `packages/shared` — must be buildable as ESM (check existing config)

## Success Criteria

- [ ] BullModule.forRoot() migrated to JobsInfraModule, all existing queues operational
- [ ] JobRun persisted for every enqueued job (id, status, tenantId, timestamps)
- [ ] DlqProcessor actively consuming all 5 DLQs with configurable retry policy
- [ ] `bullmqJobDuration` and `bullmqQueueDepth` metrics visible in Prometheus
- [ ] All existing tests pass without modification
- [ ] Tenant isolation verified: JobRun queries scoped by tenantId via Prisma extension
