-- CreateTable: notification_definitions
CREATE TABLE "notification_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "channels" TEXT[],
    "default_priority" TEXT NOT NULL DEFAULT 'normal',
    "default_severity" TEXT NOT NULL DEFAULT 'info',
    "rules" JSONB,
    "template" JSONB,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notification_instances
CREATE TABLE "notification_instances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "channel" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "severity" TEXT NOT NULL DEFAULT 'info',
    "content" JSONB,
    "content_snapshot" JSONB,
    "idempotency_key" TEXT,
    "correlation_id" TEXT,
    "preferences_last_checked_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "error" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notification_preferences
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "preferred_channels" TEXT[],
    "quiet_hours_start" TEXT,
    "quiet_hours_end" TEXT,
    "quiet_hours_timezone" TEXT,
    "digest_frequency" TEXT NOT NULL DEFAULT 'never',
    "timezone" TEXT,
    "language" TEXT DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notification_batches
CREATE TABLE "notification_batches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" TEXT,
    "batch_key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "notification_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notification_digests
CREATE TABLE "notification_digests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" TEXT,
    "batch_key" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "notification_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notification_receipts
CREATE TABLE "notification_receipts" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "error" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notification_audit
CREATE TABLE "notification_audit" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "notification_definitions_tenant_id_idx" ON "notification_definitions"("tenant_id");
CREATE INDEX "notification_definitions_tenant_id_category_idx" ON "notification_definitions"("tenant_id", "category");

CREATE UNIQUE INDEX "notification_instances_idempotency_key_key" ON "notification_instances"("idempotency_key");
CREATE INDEX "notification_instances_tenant_id_status_idx" ON "notification_instances"("tenant_id", "status");
CREATE INDEX "notification_instances_tenant_id_user_id_status_idx" ON "notification_instances"("tenant_id", "user_id", "status");
CREATE INDEX "notification_instances_tenant_id_correlation_id_idx" ON "notification_instances"("tenant_id", "correlation_id");
CREATE INDEX "notification_instances_tenant_id_scheduled_at_idx" ON "notification_instances"("tenant_id", "scheduled_at");

CREATE UNIQUE INDEX "notification_preferences_tenant_id_user_id_category_key" ON "notification_preferences"("tenant_id", "user_id", "category");
CREATE INDEX "notification_preferences_tenant_id_user_id_idx" ON "notification_preferences"("tenant_id", "user_id");

CREATE INDEX "notification_batches_tenant_id_user_id_status_idx" ON "notification_batches"("tenant_id", "user_id", "status");
CREATE INDEX "notification_batches_batch_key_idx" ON "notification_batches"("batch_key");

CREATE INDEX "notification_digests_tenant_id_user_id_idx" ON "notification_digests"("tenant_id", "user_id");

CREATE INDEX "notification_receipts_notification_id_idx" ON "notification_receipts"("notification_id");
CREATE INDEX "notification_receipts_tenant_id_status_idx" ON "notification_receipts"("tenant_id", "status");

CREATE INDEX "notification_audit_notification_id_idx" ON "notification_audit"("notification_id");
CREATE INDEX "notification_audit_tenant_id_created_at_idx" ON "notification_audit"("tenant_id", "created_at" DESC);

-- AddForeignKeys
ALTER TABLE "notification_instances" ADD CONSTRAINT "notification_instances_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "notification_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Note: notification_receipts has NO onDelete Cascade — receipts survive instance deletion
ALTER TABLE "notification_receipts" ADD CONSTRAINT "notification_receipts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notification_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_audit" ADD CONSTRAINT "notification_audit_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notification_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
