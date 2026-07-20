-- CreateTable: analytics_datasets
CREATE TABLE "analytics_datasets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "dataset_name" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "granularity" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "dimensions" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: analytics_snapshots
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataset_name" TEXT NOT NULL,
    "granularity" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "ttl" INTEGER NOT NULL DEFAULT 300,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: kpis
CREATE TABLE "kpis" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "target" DOUBLE PRECISION,
    "upper_threshold" DOUBLE PRECISION,
    "lower_threshold" DOUBLE PRECISION,
    "unit" TEXT,
    "ttl" INTEGER NOT NULL DEFAULT 300,
    "cached_value" DOUBLE PRECISION,
    "cached_status" TEXT,
    "cached_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable: dashboards
CREATE TABLE "dashboards" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layout" JSONB NOT NULL DEFAULT '{"columns":12,"gap":16}',
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable: dashboard_widgets
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL,
    "dashboard_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "position" JSONB NOT NULL,
    "kpi_name" TEXT,
    "dataset_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: report_definitions
CREATE TABLE "report_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataset_name" TEXT NOT NULL,
    "dimensions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metrics" JSONB NOT NULL,
    "filters" JSONB,
    "date_range" JSONB,
    "granularity" TEXT,
    "schedule" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: report_executions
CREATE TABLE "report_executions" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "report_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: export_jobs
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "config" JSONB,
    "file_path" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: dataset_ingestion_logs
CREATE TABLE "dataset_ingestion_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "dataset_name" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "event_id" TEXT,
    "error" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_ingestion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes: analytics_datasets
CREATE UNIQUE INDEX "analytics_datasets_tenant_id_dataset_name_metric_name_granul_key"
    ON "analytics_datasets"("tenant_id", "dataset_name", "metric_name", "granularity", "window_start");
CREATE INDEX "analytics_datasets_tenant_id_dataset_name_granularity_window_idx"
    ON "analytics_datasets"("tenant_id", "dataset_name", "granularity", "window_start" DESC);
CREATE INDEX "analytics_datasets_tenant_id_metric_name_window_start_idx"
    ON "analytics_datasets"("tenant_id", "metric_name", "window_start" DESC);
CREATE INDEX "analytics_datasets_tenant_id_idx"
    ON "analytics_datasets"("tenant_id");

-- CreateIndexes: analytics_snapshots
CREATE INDEX "analytics_snapshots_tenant_id_name_expires_at_idx"
    ON "analytics_snapshots"("tenant_id", "name", "expires_at");
CREATE INDEX "analytics_snapshots_tenant_id_idx"
    ON "analytics_snapshots"("tenant_id");

-- CreateIndexes: kpis
CREATE UNIQUE INDEX "kpis_tenant_id_name_key"
    ON "kpis"("tenant_id", "name");
CREATE INDEX "kpis_tenant_id_idx"
    ON "kpis"("tenant_id");

-- CreateIndexes: dashboards
CREATE INDEX "dashboards_tenant_id_idx"
    ON "dashboards"("tenant_id");

-- CreateIndexes: dashboard_widgets
CREATE INDEX "dashboard_widgets_dashboard_id_idx"
    ON "dashboard_widgets"("dashboard_id");
CREATE INDEX "dashboard_widgets_tenant_id_idx"
    ON "dashboard_widgets"("tenant_id");

-- CreateIndexes: report_definitions
CREATE INDEX "report_definitions_tenant_id_idx"
    ON "report_definitions"("tenant_id");

-- CreateIndexes: report_executions
CREATE INDEX "report_executions_report_id_created_at_idx"
    ON "report_executions"("report_id", "created_at" DESC);
CREATE INDEX "report_executions_tenant_id_idx"
    ON "report_executions"("tenant_id");

-- CreateIndexes: export_jobs
CREATE INDEX "export_jobs_tenant_id_status_idx"
    ON "export_jobs"("tenant_id", "status");
CREATE INDEX "export_jobs_tenant_id_idx"
    ON "export_jobs"("tenant_id");

-- CreateIndexes: dataset_ingestion_logs
CREATE INDEX "dataset_ingestion_logs_tenant_id_dataset_name_window_start_idx"
    ON "dataset_ingestion_logs"("tenant_id", "dataset_name", "window_start");
CREATE INDEX "dataset_ingestion_logs_tenant_id_idx"
    ON "dataset_ingestion_logs"("tenant_id");

-- AddForeignKey: dashboard_widgets.dashboard_id → dashboards.id
ALTER TABLE "dashboard_widgets"
    ADD CONSTRAINT "dashboard_widgets_dashboard_id_fkey"
    FOREIGN KEY ("dashboard_id")
    REFERENCES "dashboards"("id")
    ON DELETE CASCADE;

-- AddForeignKey: report_executions.report_id → report_definitions.id
ALTER TABLE "report_executions"
    ADD CONSTRAINT "report_executions_report_id_fkey"
    FOREIGN KEY ("report_id")
    REFERENCES "report_definitions"("id")
    ON DELETE CASCADE;
