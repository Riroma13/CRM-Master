BEGIN;

-- Better Auth catalog compatibility is additive and safe for existing rows.
ALTER TABLE ba_organizations ADD COLUMN IF NOT EXISTS slug TEXT;
UPDATE ba_organizations
SET slug = 'identity-' || id
WHERE slug IS NULL OR btrim(slug) = '';
ALTER TABLE ba_organizations ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ba_organizations_slug_key ON ba_organizations (slug);

ALTER TABLE ba_invitations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
UPDATE ba_invitations
SET expires_at = "createdAt" + INTERVAL '7 days'
WHERE expires_at IS NULL;
ALTER TABLE ba_invitations ALTER COLUMN expires_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ba_invitations_inviter_id_fkey'
  ) THEN
    ALTER TABLE ba_invitations
      ADD CONSTRAINT ba_invitations_inviter_id_fkey
      FOREIGN KEY (inviter_id) REFERENCES ba_users(id);
  END IF;
END $$;

ALTER TABLE ba_sessions ADD COLUMN IF NOT EXISTS active_organization_id TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ba_sessions_active_organization_id_fkey'
  ) THEN
    ALTER TABLE ba_sessions
      ADD CONSTRAINT ba_sessions_active_organization_id_fkey
      FOREIGN KEY (active_organization_id) REFERENCES ba_organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS identity_authorization_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  mutation_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  terminal_at TIMESTAMPTZ,
  terminal_reason TEXT,
  purge_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT identity_authorization_operations_mutation_key
    UNIQUE (tenant_id, subject_id, mutation_id)
);
CREATE INDEX IF NOT EXISTS identity_authorization_operations_status_next_attempt_idx
  ON identity_authorization_operations (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS identity_authorization_operations_tenant_status_idx
  ON identity_authorization_operations (tenant_id, status, next_attempt_at);
-- PARTIAL INDEX SAFETY: terminal history remains append-only and reusable.
CREATE UNIQUE INDEX IF NOT EXISTS identity_authorization_operations_active_subject_idx
  ON identity_authorization_operations (tenant_id, subject_id)
  WHERE status IN ('PENDING', 'PURGING');

CREATE TABLE IF NOT EXISTS identity_audit_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mutation_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  terminal_at TIMESTAMPTZ,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT identity_audit_outbox_mutation_event_key
    UNIQUE (tenant_id, mutation_id, event_type)
);
CREATE INDEX IF NOT EXISTS identity_audit_outbox_tenant_status_lease_idx
  ON identity_audit_outbox (tenant_id, status, lease_expires_at);

COMMIT;
