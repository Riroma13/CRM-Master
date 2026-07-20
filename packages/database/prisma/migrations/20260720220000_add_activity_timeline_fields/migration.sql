-- Add new columns to activity_events for Activity Timeline enhancements
-- All additive: no existing columns or indexes are modified or dropped

ALTER TABLE "activity_events" ADD COLUMN "event_id" TEXT;
ALTER TABLE "activity_events" ADD COLUMN "correlation_id" TEXT;
ALTER TABLE "activity_events" ADD COLUMN "causation_id" TEXT;
ALTER TABLE "activity_events" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'tenant-only';
ALTER TABLE "activity_events" ADD COLUMN "subject_name" TEXT;
ALTER TABLE "activity_events" ADD COLUMN "actor_name" TEXT;
ALTER TABLE "activity_events" ADD COLUMN "search_vector" TSVECTOR;
ALTER TABLE "activity_events" ADD COLUMN "enriched" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "activity_events" ADD COLUMN "enriched_at" TIMESTAMP(3);
ALTER TABLE "activity_events" ADD COLUMN "occurred_at" TIMESTAMP(3);
ALTER TABLE "activity_events" ADD COLUMN "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndexes
CREATE UNIQUE INDEX "activity_events_event_id_key" ON "activity_events"("event_id");
CREATE INDEX "activity_events_tenant_id_correlation_id_idx" ON "activity_events"("tenant_id", "correlation_id");
CREATE INDEX "activity_events_search_vector_idx" ON "activity_events" USING GIN ("search_vector");
