-- CreateTable: api_keys
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_prefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "last_used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable: webhook_subscriptions
CREATE TABLE "webhook_subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "event_types" TEXT[],
    "secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: webhook_deliveries
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "response_code" INTEGER,
    "response_body" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: api_quotas
CREATE TABLE "api_quotas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "monthly_limit" INTEGER NOT NULL DEFAULT 10000,
    "used_this_month" INTEGER NOT NULL DEFAULT 0,
    "month" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "api_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "api_keys_token_hash_key" ON "api_keys"("token_hash");
CREATE INDEX "api_keys_tenant_id_idx" ON "api_keys"("tenant_id");

CREATE INDEX "webhook_subscriptions_tenant_id_idx" ON "webhook_subscriptions"("tenant_id");

CREATE UNIQUE INDEX "webhook_deliveries_delivery_id_key" ON "webhook_deliveries"("delivery_id");
CREATE INDEX "webhook_deliveries_subscription_id_created_at_idx" ON "webhook_deliveries"("subscription_id", "created_at" DESC);
CREATE INDEX "webhook_deliveries_delivery_id_idx" ON "webhook_deliveries"("delivery_id");

CREATE UNIQUE INDEX "api_quotas_tenant_id_key" ON "api_quotas"("tenant_id");

-- ForeignKeys
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "webhook_subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Comments
COMMENT ON COLUMN "webhook_subscriptions"."secret" IS 'Encrypted at rest — HMAC key. Must use pgcrypto or NestJS Encryption.';
