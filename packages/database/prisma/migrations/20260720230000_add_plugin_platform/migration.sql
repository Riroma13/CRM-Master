-- CreateTable: plugins
CREATE TABLE "plugins" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "content_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "plugins_pkey" PRIMARY KEY ("id")
);

-- CreateTable: plugin_hooks
CREATE TABLE "plugin_hooks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plugin_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "handler" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "plugin_hooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: plugin_store
CREATE TABLE "plugin_store" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plugin_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "plugin_store_pkey" PRIMARY KEY ("id")
);

-- CreateTable: plugin_events
CREATE TABLE "plugin_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plugin_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "plugins_tenant_id_name_key" ON "plugins"("tenant_id", "name");
CREATE INDEX "plugins_tenant_id_status_idx" ON "plugins"("tenant_id", "status");

CREATE UNIQUE INDEX "plugin_hooks_tenant_id_plugin_id_event_type_key" ON "plugin_hooks"("tenant_id", "plugin_id", "event_type");
CREATE INDEX "plugin_hooks_tenant_id_event_type_priority_idx" ON "plugin_hooks"("tenant_id", "event_type", "priority");

CREATE UNIQUE INDEX "plugin_store_tenant_id_plugin_id_key_key" ON "plugin_store"("tenant_id", "plugin_id", "key");
CREATE INDEX "plugin_store_tenant_id_plugin_id_idx" ON "plugin_store"("tenant_id", "plugin_id");

CREATE INDEX "plugin_events_tenant_id_event_type_created_at_idx" ON "plugin_events"("tenant_id", "event_type", "created_at" DESC);
CREATE INDEX "plugin_events_created_at_idx" ON "plugin_events"("created_at");

-- ForeignKeys
ALTER TABLE "plugin_hooks" ADD CONSTRAINT "plugin_hooks_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "plugins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "plugin_store" ADD CONSTRAINT "plugin_store_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "plugins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Comments
COMMENT ON TABLE "plugins" IS 'Plugin Platform (SPEC-0022) — installed plugin registry';
COMMENT ON TABLE "plugin_hooks" IS 'Plugin event subscriptions scoped by tenant';
COMMENT ON TABLE "plugin_store" IS 'Plugin key-value storage scoped by tenant + plugin';
COMMENT ON TABLE "plugin_events" IS 'Plugin-emitted events log';
