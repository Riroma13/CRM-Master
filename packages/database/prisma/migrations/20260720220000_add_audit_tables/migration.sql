-- CreateTable: audit_events
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_name" TEXT,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_name" TEXT,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "correlation_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "hash" TEXT NOT NULL,
    "prev_hash" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "legal_hold" BOOLEAN NOT NULL DEFAULT false,
    "legal_hold_until" TIMESTAMP(3),

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant_audit_state
CREATE TABLE "tenant_audit_state" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "last_event_id" TEXT NOT NULL,
    "last_hash" TEXT NOT NULL,
    "last_sequence" INTEGER NOT NULL,
    "last_occurred_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_audit_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable: audit_retention_policies
CREATE TABLE "audit_retention_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "retention_days" INTEGER NOT NULL DEFAULT 365,
    "archive_after_days" INTEGER,
    "purge_after_days" INTEGER,
    "legal_hold" BOOLEAN NOT NULL DEFAULT false,
    "legal_hold_reason" TEXT,
    "legal_hold_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable: audit_event_legal_holds
CREATE TABLE "audit_event_legal_holds" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "date_from" TIMESTAMP(3) NOT NULL,
    "date_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),

    CONSTRAINT "audit_event_legal_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable: compliance_violations
CREATE TABLE "compliance_violations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rule_name" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "event_id" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "compliance_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: compliance_expectation_runs
CREATE TABLE "compliance_expectation_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rule_name" TEXT NOT NULL,
    "evaluated_at" TIMESTAMP(3) NOT NULL,
    "violations_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "compliance_expectation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes: audit_events
CREATE UNIQUE INDEX "audit_events_tenant_id_sequence_key" ON "audit_events"("tenant_id", "sequence");
CREATE INDEX "audit_events_tenant_id_sequence_idx" ON "audit_events"("tenant_id", "sequence");
CREATE INDEX "audit_events_tenant_id_occurred_at_idx" ON "audit_events"("tenant_id", "occurred_at" DESC);
CREATE INDEX "audit_events_tenant_id_actor_type_actor_id_idx" ON "audit_events"("tenant_id", "actor_type", "actor_id");
CREATE INDEX "audit_events_tenant_id_resource_type_resource_id_idx" ON "audit_events"("tenant_id", "resource_type", "resource_id");
CREATE INDEX "audit_events_tenant_id_action_outcome_idx" ON "audit_events"("tenant_id", "action", "outcome");
CREATE INDEX "audit_events_tenant_id_correlation_id_idx" ON "audit_events"("tenant_id", "correlation_id");
CREATE INDEX "audit_events_occurred_at_idx" ON "audit_events" USING brin ("occurred_at");

-- CreateIndexes: tenant_audit_state
CREATE UNIQUE INDEX "tenant_audit_state_tenant_id_key" ON "tenant_audit_state"("tenant_id");

-- CreateIndexes: audit_retention_policies
CREATE UNIQUE INDEX "audit_retention_policies_tenant_id_key" ON "audit_retention_policies"("tenant_id");

-- CreateIndexes: audit_event_legal_holds
CREATE INDEX "audit_event_legal_holds_tenant_id_idx" ON "audit_event_legal_holds"("tenant_id");

-- CreateIndexes: compliance_violations
CREATE INDEX "compliance_violations_tenant_id_framework_idx" ON "compliance_violations"("tenant_id", "framework");
CREATE INDEX "compliance_violations_tenant_id_severity_idx" ON "compliance_violations"("tenant_id", "severity");

-- CreateIndexes: compliance_expectation_runs
CREATE INDEX "compliance_expectation_runs_tenant_id_rule_name_idx" ON "compliance_expectation_runs"("tenant_id", "rule_name");

-- Note: compliance_violations.event_id is a string reference, NOT a FK
-- Events may be removed by partition purge, so no foreign key constraint.
