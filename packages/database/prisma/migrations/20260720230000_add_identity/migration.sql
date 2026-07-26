-- Identity & Organization Platform (SPEC-0025)

-- CreateTable: teams
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_team_id" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable: roles
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: memberships
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable: invitations
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "team_id" TEXT,
    "token_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: security_policies
CREATE TABLE "security_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "password_policy" JSONB NOT NULL,
    "require_mfa" BOOLEAN NOT NULL DEFAULT false,
    "mfa_methods" TEXT[],
    "session_timeout_minutes" INTEGER NOT NULL DEFAULT 480,
    "max_sessions_per_user" INTEGER NOT NULL DEFAULT 5,
    "ip_allowlist" TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "security_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "teams_tenant_id_name_key" ON "teams"("tenant_id", "name");
CREATE INDEX "teams_tenant_id_active_idx" ON "teams"("tenant_id", "active");

CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name");
CREATE INDEX "roles_tenant_id_idx" ON "roles"("tenant_id");

CREATE UNIQUE INDEX "memberships_tenant_id_user_id_team_id_key" ON "memberships"("tenant_id", "user_id", "team_id");
CREATE INDEX "memberships_tenant_id_user_id_idx" ON "memberships"("tenant_id", "user_id");
CREATE INDEX "memberships_tenant_id_team_id_idx" ON "memberships"("tenant_id", "team_id");
CREATE INDEX "memberships_tenant_id_idx" ON "memberships"("tenant_id");

CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");
CREATE INDEX "invitations_tenant_id_email_status_idx" ON "invitations"("tenant_id", "email", "status");
CREATE INDEX "invitations_tenant_id_idx" ON "invitations"("tenant_id");
CREATE INDEX "invitations_expires_at_idx" ON "invitations"("expires_at");

CREATE UNIQUE INDEX "security_policies_tenant_id_key" ON "security_policies"("tenant_id");

-- ForeignKeys
ALTER TABLE "teams" ADD CONSTRAINT "teams_parent_team_id_fkey" FOREIGN KEY ("parent_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Check constraints
ALTER TABLE "teams" ADD CONSTRAINT "teams_depth_check" CHECK (depth <= 3);

-- Comments
COMMENT ON TABLE "teams" IS 'Identity & Organization Platform (SPEC-0025) — teams within a tenant';
COMMENT ON TABLE "roles" IS 'Identity & Organization Platform (SPEC-0025) — RBAC roles with permissions';
COMMENT ON TABLE "memberships" IS 'Identity & Organization Platform (SPEC-0025) — user-team-role assignments';
COMMENT ON TABLE "invitations" IS 'Identity & Organization Platform (SPEC-0025) — invitation lifecycle';
COMMENT ON TABLE "security_policies" IS 'Identity & Organization Platform (SPEC-0025) — tenant security configuration';
