# ADR 0028: Jobs & Background Processing Platform

**Status:** Proposed
**Date:** 2026-07-21
**Driver:** SPEC-0028 Jobs & Background Processing Platform
**Reviewer:** Pending Architecture Review

## Context

17 BullMQ queues are spread across 5 feature modules with zero shared infrastructure:

| Module | Queues | Count |
|--------|--------|-------|
| Activity Timeline | `activity-timeline:ingestion`, `activity-timeline:dlq` | 2 |
| Knowledge Base | `kb:ingestion`, `kb:reindex`, `kb:ingestion-dlq` | 3 |
| Audit | `audit:ingestion`, `audit:retention`, `audit:dlq` | 3 |
| Billing | `billing:metering`, `billing:invoice`, `billing:stripe-webhooks` | 3 |
| Reporting | `reporting:dataset:ingestion`, `reporting:export`, `reporting:report:generate`, `reporting:dataset:dlq` | 4 |
| **Unmapped** | Orphan/unreferenced | 2 |

Total: 17 queues, of which 8 have no registered consumers. 5 DLQs (`activity-timeline:dlq`, `audit:dlq`, `kb:ingestion-dlq`, `reporting:dataset:dlq`, `billing:stripe-webhooks`) accumulate dead letters indefinitely with no automated retry.

`BullModule.forRoot()` is hidden inside `activity-timeline.module.ts` with inline environment variable references, making Redis configuration invisible at the application level. No centralized job run history exists — diagnosing a failed job requires manually inspecting Redis and matching against application logs.

Additionally, the codebase has an emerging pattern of ad-hoc background processing: `AutomationExecution`, `MessageDelivery`, `IntegrationExecution`, and `ExportJob` all model execution records with status fields but use different patterns for retries, idempotency, and tenant scoping.

## Decision

Create a **Jobs & Background Processing Platform** as a new bounded context within the API module. The platform consists of:

### Module architecture

| Component | Responsibility |
|-----------|---------------|
| `JobsInfraModule` (`@Global()`) | Extracts `BullModule.forRoot()` with `ConfigService` for Redis URL, enabling single-point Redis config management |
| `JobService` | Public API for enqueue, getStatus, cancel, retry, list — creates `JobRun` rows + BullMQ jobs atomically |
| `DlqProcessor` | Reads from configured DLQs, applies exponential backoff, re-enqueues to source queues, dead-letters after max retries |

### New Prisma models

| Model | Purpose | Tenant-scoped | Key constraints |
|-------|---------|---------------|----------------|
| `JobDefinition` | Job type registry (key, name, config) | Yes | `@@unique([tenantId, key])` |
| `JobRun` | Execution record with status, payload, retries | Yes | `@@unique([tenantId, idempotencyKey])` with CHECK on status |
| `JobSchedule` | Cron schedule for recurring jobs (Phase 2) | Yes | `@@unique([tenantId, jobDefinitionId])` |

### Shared types

`packages/shared/src/jobs/` houses `JobStatus` union, `JobPayload`, and DTO interfaces, following the established pattern from `packages/shared/src/billing/`.

### Idempotency

Database-level `@@unique([tenantId, idempotencyKey])` on `JobRun`. Optional idempotencyKey parameter — if not provided, no idempotency guarantee.

### Retry strategy

DlqProcessor-managed (not BullMQ built-in retry):
1. DlqProcessor reads from DLQ on configurable interval
2. Waits `backoffBase * 2^attempt` (exponential backoff, base 5s)
3. Re-enqueues to source queue
4. After `maxRetries` failures → status `dead_lettered`, metric incremented

This is cleaner than BullMQ retry on DLQ, which is counterintuitive (DLQ means already-retried).

### JobRun.status type

String with application-level Zod validation + DB CHECK constraint — NOT a Prisma enum. This avoids costly migrations when adding new statuses and follows the pattern used by `ReportExecution`, `ExportJob`, and other existing models.

### Metrics

| Metric | Type | Location |
|--------|------|----------|
| `bullmqQueueDepth` (existing) | Gauge | `metrics-registry.ts` — reused |
| `bullmqJobDuration` | Histogram | `metrics-registry.ts` — new, labels: queue, status |
| `deadLetterCount` | Counter | `metrics-registry.ts` — new |

### JobDefinition seeding strategy

Hybrid approach:
1. **Seed migration**: Pre-populate known job types for existing queues (activity-timeline, kb, audit, billing, reporting)
2. **Auto-create**: First `enqueue()` call for an unknown key creates the `JobDefinition` with sensible defaults

## Rationale

1. **Single Redis config source**: Moving `BullModule.forRoot()` to a `@Global()` module eliminates the hidden dependency in `activity-timeline.module.ts` and makes Redis configuration visible and testable.

2. **Persistence for job history**: Without `JobRun` records, diagnosing failures requires correlating Redis job state with application logs. Persistence enables querying, dashboards, and retention policies.

3. **Standardized retry**: DlqProcessor provides uniform retry behavior across all 5 DLQs instead of ad-hoc per-queue policies.

4. **Incremental migration**: Phase 1 adds infrastructure without touching existing processors or queue registrations. All existing code continues working.

5. **Backward compatibility**: `@Global()` on `JobsInfraModule` preserves the global BullMQ queue scope that all 5 existing modules depend on. Dual `forRoot()` registration during transition is safe (BullMQ deduplicates).

## Consequences

- All feature modules using `@InjectQueue()` continue to resolve their queues without changes
- `BullModule.forRoot()` must be removed from `activity-timeline.module.ts` only after JobsInfraModule is confirmed working in production
- Prisma tables are additive — no migration conflicts with existing schema
- The `JOBS_DLQ_QUEUES` env var must be configured with source-queue mappings for each DLQ
- New queue-based features should use `JobService.enqueue()` instead of `BullModule.registerQueue()` for persistence and idempotency

## Rejection criteria (triggers for re-evaluation)

- `JobRun` table growing beyond 50M rows without partitioning strategy
- More than 3 Prisma models in the jobs domain (currently 3: JobDefinition, JobRun, JobSchedule)
- Any feature module needing more than the `JobService` public API — module-specific queue logic stays in the feature module
- `JobRun.status` needing a Prisma enum (the CHECK constraint + Zod pattern must continue)

## Future phases

| Phase | Scope | Timing |
|-------|-------|--------|
| 1 (current) | ADR + Schema + Types + Seed + Infrastructure | Now |
| 2 | Scheduling API + JobRetentionService | Next |
| 3 | Admin dashboard (read views in admin-web) | After Phase 2 |
| 4 | Module migration to unified `@JobHandler(key)` decorator | After Phase 3 |
| 5 | Job orchestration / DAG support | If needed |
