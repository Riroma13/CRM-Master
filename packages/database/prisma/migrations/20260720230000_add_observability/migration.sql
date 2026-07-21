-- CreateTable: alert_rules
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "promql_expression" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: alert_events
CREATE TABLE "alert_events" (
    "id" TEXT NOT NULL,
    "rule_name" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'firing',
    "value" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: health_check_logs
CREATE TABLE "health_check_logs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT,
    "checks" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "health_check_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "alert_rules_name_key" ON "alert_rules"("name");
CREATE INDEX "alert_events_rule_name_started_at_idx" ON "alert_events"("rule_name", "started_at" DESC);
CREATE INDEX "alert_events_status_severity_idx" ON "alert_events"("status", "severity");
CREATE INDEX "health_check_logs_created_at_idx" ON "health_check_logs"("created_at" DESC);
