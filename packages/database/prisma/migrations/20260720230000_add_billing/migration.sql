-- CreateTable: plans
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "billing_period" TEXT NOT NULL DEFAULT 'monthly',
    "pricing_model" TEXT NOT NULL,
    "limits" JSONB NOT NULL,
    "features" TEXT[],
    "trial_days" INTEGER NOT NULL DEFAULT 14,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: subscriptions
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "pending_plan_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "current_period_start" TIMESTAMPTZ NOT NULL,
    "current_period_end" TIMESTAMPTZ NOT NULL,
    "trial_end" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "grace_period_end" TIMESTAMPTZ,
    "suspended_until" TIMESTAMPTZ,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: usage_meters
CREATE TABLE "usage_meters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "period_start" TIMESTAMPTZ NOT NULL,
    "period_end" TIMESTAMPTZ NOT NULL,
    "value" REAL NOT NULL DEFAULT 0,
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "usage_meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable: invoices
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "period_start" TIMESTAMPTZ NOT NULL,
    "period_end" TIMESTAMPTZ NOT NULL,
    "lines" JSONB NOT NULL,
    "plan_snapshot" JSONB,
    "subtotal" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "stripe_invoice_id" TEXT,
    "paid_at" TIMESTAMPTZ,
    "due_date" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable: stripe_webhook_events
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processed_at" TIMESTAMPTZ,
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

CREATE UNIQUE INDEX "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");
CREATE UNIQUE INDEX "subscriptions_stripe_customer_id_key" ON "subscriptions"("stripe_customer_id");
CREATE INDEX "subscriptions_tenant_id_status_idx" ON "subscriptions"("tenant_id", "status");

CREATE UNIQUE INDEX "usage_meters_tenant_id_metric_period_start_key" ON "usage_meters"("tenant_id", "metric", "period_start");
CREATE INDEX "usage_meters_tenant_id_metric_period_start_period_end_idx" ON "usage_meters"("tenant_id", "metric", "period_start", "period_end");

CREATE UNIQUE INDEX "invoices_stripe_invoice_id_key" ON "invoices"("stripe_invoice_id");
CREATE INDEX "invoices_tenant_id_status_idx" ON "invoices"("tenant_id", "status");
CREATE INDEX "invoices_subscription_id_period_start_period_end_idx" ON "invoices"("subscription_id", "period_start", "period_end");

CREATE INDEX "stripe_webhook_events_created_at_idx" ON "stripe_webhook_events"("created_at" DESC);

-- ForeignKeys
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Comments
COMMENT ON TABLE "plans" IS 'Billing & Subscription (SPEC-0023) — plan catalog';
COMMENT ON TABLE "subscriptions" IS 'Billing & Subscription (SPEC-0023) — tenant subscriptions scoped by tenant_id';
COMMENT ON TABLE "usage_meters" IS 'Billing & Subscription (SPEC-0023) — usage metering per tenant per metric per period';
COMMENT ON TABLE "invoices" IS 'Billing & Subscription (SPEC-0023) — invoices generated per subscription period';
COMMENT ON TABLE "stripe_webhook_events" IS 'Billing & Subscription (SPEC-0023) — Stripe webhook log with idempotency (eventId as PK)';
