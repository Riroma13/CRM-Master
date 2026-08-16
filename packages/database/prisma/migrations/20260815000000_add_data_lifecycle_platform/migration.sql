-- CreateTable
CREATE TABLE "data_lifecycle_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "data_lifecycle_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_lifecycle_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "purged_count" INTEGER NOT NULL DEFAULT 0,
    "failure_code" TEXT,

    CONSTRAINT "data_lifecycle_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_lifecycle_policies_tenant_id_enabled_idx" ON "data_lifecycle_policies"("tenant_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "data_lifecycle_policies_tenant_id_target_key" ON "data_lifecycle_policies"("tenant_id", "target");

-- CreateIndex
CREATE INDEX "data_lifecycle_runs_tenant_id_scheduled_for_idx" ON "data_lifecycle_runs"("tenant_id", "scheduled_for" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "data_lifecycle_runs_policy_id_scheduled_for_key" ON "data_lifecycle_runs"("policy_id", "scheduled_for");

-- AddForeignKey
ALTER TABLE "data_lifecycle_policies" ADD CONSTRAINT "data_lifecycle_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_lifecycle_runs" ADD CONSTRAINT "data_lifecycle_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_lifecycle_runs" ADD CONSTRAINT "data_lifecycle_runs_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "data_lifecycle_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
