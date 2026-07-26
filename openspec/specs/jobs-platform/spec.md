# Jobs Platform Specification

## 1. Context

17 BullMQ queues across 5 modules, zero shared infra. `BullModule.forRoot()` buried in activity-timeline. 8/17 queues have no consumers. DLQs accumulate dead letters forever. Retry policies hardcoded per queue. No centralized job run history.

## 2. Contracts

### 2.1 JobsInfraModule

MUST extract `BullModule.forRoot()` into JobsInfraModule with ConfigService. All 17 existing queues MUST resolve. Dual registration with old forRoot during transition is safe (BullMQ deduplicates).

- Inject any existing queue → resolves + processor consumes.
- Redis config from ConfigService → BullMQ connects with those params.

### 2.2 Prisma Models

| Model | Key Fields | Purpose |
|---|---|---|
| `JobDefinition` | id, name (unique), schema (Json), maxRetries, backoffMs, ttlMinutes | Job type registry |
| `JobRun` | id, tenantId (FK), jobDefinitionId, bullJobId, status, idempotencyKey?, payload, result?, error?, attempts, timestamps | Execution record |
| `JobSchedule` | id, tenantId, jobDefinitionId, cron, enabled, lastRunAt | Cron (Phase 2 schema reserved) |

- Valid payload enqueued → JobRun (status "queued") created with matching tenantId + BullMQ job.
- getStatus for T1's run from T2 context → empty/404 (Prisma extension).

### 2.3 JobService API

| Method | Signature | Behavior |
|---|---|---|
| `enqueue` | (name, payload, ctx, key?) → JobRun | Creates JobRun + BullMQ job; returns existing on collision |
| `getStatus` | (runId, ctx) → { status, attempts, timestamps } | Current state |
| `cancel` | (runId, ctx) → void | Removes job, sets "cancelled" |
| `retry` | (runId, ctx) → JobRun | Re-enqueues, increments attempts |

- Same idempotencyKey twice → existing JobRun returned, no duplicate BullMQ job.
- status "queued" → cancel removes job, status "cancelled".
- status "failed" + attempts < maxRetries → retry enqueues new job, attempts++, status "queued".

### 2.4 DlqProcessor

| Config | Default | Detail |
|---|---|---|
| maxRetries | 3 | Before dead_letter |
| backoffBaseMs | 5000 | Initial backoff |
| backoffMultiplier | 2 | Exponential |
| alertThreshold | 5 | Consecutive failures |

- DLQ job picked → waits backoffBaseMs, re-queues to source, increments retry counter.
- Retried maxRetries times → status "dead_lettered", metric++, alert triggered.
- Redis unavailable → logs + retries next cycle, no job loss.

### 2.5 Metrics

| Metric | Type | Labels |
|---|---|---|
| `bullmqJobDuration` | Histogram | queue, status |
| `bullmqQueueDepth` | Gauge | queue |
| `deadLetterCount` | Counter | queue |

- Job completes → Prometheus scrape includes duration + queue depth.

## 3. Edge Cases

| Edge Case | Behavior |
|---|---|
| Redis connection loss | DlqProcessor logs + retries next cycle; JobService.enqueue throws |
| Job timeout (stuck active) | BullMQ stalled handler marks JobRun as failed |
| DLQ overflow | FIFO processing, default concurrency 5 |
| Idempotency collision | Returns existing JobRun |
| Missing JobDefinition | JobService.enqueue throws 404 |

## 4. Acceptance Criteria

| # | Criterion | Verification |
|---|---|---|
| AC1 | enqueue creates JobRun + BullMQ job | Integration test |
| AC2 | getStatus returns all states | Integration test |
| AC3 | cancel stops pending job | Integration test |
| AC4 | retry re-queues failed job | Integration test |
| AC5 | DlqProcessor dead-letters after max retries | Integration test |
| AC6 | Metrics: depth, duration histogram, DLQ count | Prometheus scrape |
| AC7 | JobRun scoped by tenantId | Doorbell test |
| AC8 | Existing @Processor modules continue working | Existing tests pass |
| AC9 | All 17 queues resolve after forRoot extraction | Module init test |
