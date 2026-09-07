-- Audit & Compliance Platform: Append-Only Enforcement
-- Layer 2: PostgreSQL trigger to block UPDATE/DELETE on audit_events
-- Layer 3: DB role separation (audit_app, audit_admin)
--
-- Migration: Apply AFTER running Prisma migration that creates audit_events table.
--   psql $DATABASE_URL -f packages/database/scripts/audit-append-only-trigger.sql
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_block_audit_event_update ON audit_events;
--   DROP TRIGGER IF EXISTS trg_block_audit_event_delete ON audit_events;
--   DROP FUNCTION IF EXISTS block_audit_event_mutation();
--   REVOKE ALL ON audit_events FROM audit_app, audit_admin;
--   DROP ROLE IF EXISTS audit_app;
--   DROP ROLE IF EXISTS audit_admin;

-- ─── Trigger Function ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION block_audit_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are append-only. Mutations are not permitted.'
    USING HINT = 'Use the redaction API for GDPR compliance. Use audit_admin role for partition management.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_audit_event_update
  BEFORE UPDATE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION block_audit_event_mutation();

CREATE TRIGGER trg_block_audit_event_delete
  BEFORE DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION block_audit_event_mutation();

-- ─── Role Separation ──────────────────────────────────────────────────────

-- audit_app: application role with INSERT and SELECT only
CREATE ROLE audit_app;
GRANT INSERT, SELECT ON audit_events TO audit_app;

-- audit_admin: full access (DROP PARTITION, retention engine via raw SQL)
CREATE ROLE audit_admin;
GRANT ALL ON audit_events TO audit_admin;
