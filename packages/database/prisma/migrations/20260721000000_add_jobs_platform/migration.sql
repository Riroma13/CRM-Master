-- CreateTable: job_definitions
CREATE TABLE "job_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "retry_delay" INTEGER NOT NULL DEFAULT 5000,
    "timeout" INTEGER NOT NULL DEFAULT 30000,
    "concurrency" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "job_definitions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "job_definitions_concurrency_check" CHECK ("concurrency" > 0),
    CONSTRAINT "job_definitions_max_retries_check" CHECK ("max_retries" BETWEEN 0 AND 100)
);

-- CreateTable: job_runs
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "job_definition_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "idempotency_key" TEXT,
    "scheduled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "queue_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "job_runs_status_check" CHECK ("status" IN ('queued', 'active', 'completed', 'failed', 'cancelled', 'dead_lettered'))
);

-- CreateTable: job_schedules
CREATE TABLE "job_schedules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "job_definition_id" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "last_run_at" TIMESTAMPTZ,
    "next_run_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "job_definitions_tenant_id_key_key" ON "job_definitions"("tenant_id", "key");
CREATE INDEX "job_definitions_tenant_id_idx" ON "job_definitions"("tenant_id");

CREATE UNIQUE INDEX "job_runs_tenant_id_idempotency_key_key" ON "job_runs"("tenant_id", "idempotency_key");
CREATE INDEX "job_runs_tenant_id_status_idx" ON "job_runs"("tenant_id", "status");
CREATE INDEX "job_runs_tenant_id_job_definition_id_idx" ON "job_runs"("tenant_id", "job_definition_id");
CREATE INDEX "job_runs_created_at_idx" ON "job_runs"("created_at");

CREATE UNIQUE INDEX "job_schedules_tenant_id_job_definition_id_key" ON "job_schedules"("tenant_id", "job_definition_id");
CREATE INDEX "job_schedules_tenant_id_idx" ON "job_schedules"("tenant_id");
CREATE INDEX "job_schedules_next_run_at_enabled_idx" ON "job_schedules"("next_run_at", "enabled");

-- ForeignKeys
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_job_definition_id_fkey" FOREIGN KEY ("job_definition_id") REFERENCES "job_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_schedules" ADD CONSTRAINT "job_schedules_job_definition_id_fkey" FOREIGN KEY ("job_definition_id") REFERENCES "job_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Comments
COMMENT ON TABLE "job_definitions" IS 'SPEC-0028 Jobs Platform — job type registry with per-tenant configuration';
COMMENT ON TABLE "job_runs" IS 'SPEC-0028 Jobs Platform — execution record per job run, scoped by tenant_id';
COMMENT ON TABLE "job_schedules" IS 'SPEC-0028 Jobs Platform — cron schedule definitions for recurring jobs (Phase 2)';

-- NOTE: Orphan queues (audit:retention, reporting:export, reporting:report:generate) have
-- no registered consumers and accumulate stale Redis jobs. These queues SHOULD BE DRAINED
-- after this migration (before PR-2 deployment) using a one-time drain script:
--   - Drain audit:retention queue
--   - Drain reporting:export queue
--   - Drain reporting:report:generate queue
-- These queues have no processors today — draining them causes zero data loss.
-- Step 0 of the migration strategy in SPEC-0028 design §17.
