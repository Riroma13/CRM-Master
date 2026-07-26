# Tasks: SPEC-0028 — Jobs & Background Processing Platform

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Infrastructure) → PR 3 (Logic + Metrics + Tests) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Complexity Score: **8** — shared contracts (+2), existing consumers (+2), migration (+2), cross-package (+1), backward compat (+1). ≥ 4 → Chained PRs.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | ADR + Schema + Types + Seed + Migration | PR 1 | `prisma validate` | `pnpm turbo build` validates shared types | `prisma migrate down` + rm `packages/shared/src/jobs/` + rm seed |
| 2 | forRoot extraction + wiring + module init test | PR 2 | `--testPathPattern jobs.module.spec` | Start API, verify `bullmqQueueDepth` shows all 17 queues | Revert activity-timeline forRoot + rm JobsModule from InfrastructureModule |
| 3 | JobService + DlqProcessor + Metrics + all tests | PR 3 | `--testPathPattern jobs` | Integration: testcontainers Redis+PG for enqueue/cancel/retry | Revert JobService, DlqProcessor, metrics-registry.ts |

---

## PR 1: Foundation (ADR + Schema + Types + Seed)

- [x] 1.1 Create `docs/adr/ADR-0028-jobs-platform.md` with architecture decisions
- [x] 1.2 Add JobDefinition, JobRun, JobSchedule to `schema.prisma` with tenantId + indexes
- [x] 1.3 Add CHECK constraint in migration SQL for `job_runs.status`
- [x] 1.4 Create `packages/shared/src/jobs/job.types.ts` — JobStatus, JobPayload, DTOs, Zod schemas
- [x] 1.5 Create `packages/shared/src/jobs/index.ts` barrel export
- [x] 1.6 Create `packages/database/seeds/job-definitions.seed.ts` — seed known queue types
- [x] 1.7 Run `prisma migrate dev --name add_jobs_platform`

## PR 2: Infrastructure (forRoot Extraction + Wiring)

- [x] 2.1 Create `apps/api/src/modules/jobs/jobs-infra.module.ts` — `@Global()` + `BullModule.forRoot()` with ConfigService
- [x] 2.2 Remove `BullModule.forRoot()` from `activity-timeline.module.ts` (keep registerQueue)
- [x] 2.3 Create `apps/api/src/modules/jobs/jobs.module.ts` — wiring DlqProcessor + JobService providers
- [x] 2.4 Add JobsModule to `infrastructure.module.ts` imports (alphabetical)
- [x] 2.5 Write `jobs.module.spec.ts` — CoverModule: all 17 queues resolve after extraction

## PR 3: Logic + Metrics + Tests

- [x] 3.1 Drain orphan queues (audit:retention, reporting:export, reporting:report:generate) via one-time script
- [x] 3.2 RED: Write `job.service.spec.ts` failing tests for enqueue/getStatus/cancel/retry/list
- [x] 3.3 GREEN: Create `job.service.ts` — enqueue (JobRun + BullMQ), getStatus, cancel, retry, list (tenant-scoped)
- [x] 3.4 GREEN: Idempotency — `@@unique([tenantId, idempotencyKey])` returns existing on collision
- [x] 3.5 RED: Write `dlq-processor.spec.ts` — backoff calc 5s→10s→20s→40s, maxRetries threshold
- [x] 3.6 GREEN: Create `dlq-processor.ts` — config-driven JOBS_DLQ_QUEUES, exponential backoff, dead_letter + alert
- [x] 3.7 Add `bullmqJobDuration` histogram to `metrics-registry.ts` (labels: queue, status)
- [x] 3.8 Write `jobs-isolation.spec.ts` — doorbell: Tenant A runs invisible to B; idempotency key scoped per tenant
- [x] 3.9 Run full test suite — verify existing @Processor tests pass (AC8 backward compat)

**Task completion:** 21/21 Phase 1 tasks complete. Phases 2-5 remain deferred.
