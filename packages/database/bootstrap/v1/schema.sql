-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "config" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'gratuito',
    "plan_desde" TIMESTAMP(3),
    "better_auth_org_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ba_organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ba_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ba_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ba_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ba_invitations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inviter_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ba_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ba_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ba_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ba_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "active_organization_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "ba_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ba_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ba_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ba_verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ba_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "password_hash" TEXT,
    "notif_email" BOOLEAN NOT NULL DEFAULT true,
    "notif_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "avatar" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "better_auth_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "tipo_negocio" TEXT,
    "contacto_principal" TEXT,
    "estado_relacion" TEXT NOT NULL DEFAULT 'Activo',
    "salud_general" TEXT NOT NULL DEFAULT '🟢',
    "fecha_inicio" TIMESTAMP(3),
    "notas_generales" TEXT,
    "tags" TEXT[],
    "custom_fields" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_users" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT,
    "telefono" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuestos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "lineas" JSONB NOT NULL DEFAULT '[]',
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presupuestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "eventos" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_envio" TIMESTAMP(3),
    "ultimo_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sistemas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "nombre_sistema" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "entorno" TEXT,
    "version" TEXT,
    "estado_tecnico" TEXT NOT NULL DEFAULT '🟢',
    "fecha_ultimo_chequeo" TIMESTAMP(3),
    "credenciales_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sistemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_inventario" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sistema_id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Implementado',
    "descripcion" TEXT,
    "fecha_implementacion" TIMESTAMP(3),
    "responsable" TEXT,

    CONSTRAINT "items_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_bitacora" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sistema_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "siguiente_accion" TEXT,

    CONSTRAINT "eventos_bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "sistema_id" TEXT,
    "titulo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "prioridad" TEXT NOT NULL DEFAULT 'Media',
    "fecha_limite" TIMESTAMP(3),

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "filename" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "documento_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "max_downloads" INTEGER,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilidad" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "slot_duration" INTEGER NOT NULL DEFAULT 30,
    "min_notice" INTEGER NOT NULL DEFAULT 240,
    "max_days" INTEGER NOT NULL DEFAULT 30,
    "daily_schedule" JSONB NOT NULL DEFAULT '[{"day":1,"start":"09:00","end":"14:00"},{"day":1,"start":"16:00","end":"19:00"},{"day":2,"start":"09:00","end":"14:00"},{"day":3,"start":"09:00","end":"14:00"},{"day":4,"start":"09:00","end":"14:00"},{"day":5,"start":"09:00","end":"14:00"}]',
    "blocked_dates" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disponibilidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recursos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'professional',
    "descripcion" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidencias" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "asignado_a" TEXT,
    "fecha_limite" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "resource_id" TEXT,
    "titulo" TEXT NOT NULL DEFAULT 'Consulta',
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "duracion" INTEGER NOT NULL DEFAULT 30,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "cliente_nombre" TEXT,
    "cliente_email" TEXT,
    "cliente_telefono" TEXT,
    "notas_internas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "details" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunicaciones" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comunicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas_documentos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'documento',
    "contenido" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "presupuesto_id" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'eur',
    "metodo_pago" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "referencia" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "event_type" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "source_module" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "category" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_id" TEXT,
    "correlation_id" TEXT,
    "causation_id" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'tenant-only',
    "subject_name" TEXT,
    "actor_name" TEXT,
    "search_vector" tsvector,
    "enriched" BOOLEAN NOT NULL DEFAULT false,
    "enriched_at" TIMESTAMP(3),
    "occurred_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encuestas" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "referencia_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "respondida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encuestas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_academicos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_academicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "search_vector" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_secrets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL,
    "actions" TEXT[],
    "filters" JSONB DEFAULT '{}',
    "config" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_executions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "actions_total" INTEGER NOT NULL,
    "actions_ok" INTEGER NOT NULL,
    "actions_failed" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_execution_steps" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "action_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,

    CONSTRAINT "automation_execution_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_deliveries" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "to" TEXT[],
    "subject" TEXT,
    "body" TEXT,
    "template_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "external_id" TEXT,
    "dlq" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "webhook_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_folders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "tags" TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'scanning',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "retention_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_trash" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "restored_at" TIMESTAMP(3),

    CONSTRAINT "document_trash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definition_versions" (
    "id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "nodes" JSONB NOT NULL,
    "start_node" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_definition_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "definition_version" INTEGER NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "correlation_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "version" INTEGER NOT NULL DEFAULT 1,
    "maxInstanceLifetime" INTEGER NOT NULL DEFAULT 604800000,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_user_tasks" (
    "id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "assignee" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "input" JSONB,
    "output" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "workflow_user_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_timers" (
    "id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "fire_at" TIMESTAMP(3) NOT NULL,
    "fired" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_timers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_audit" (
    "id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "node_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_variables" (
    "id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_active_branches" (
    "id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_group" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_active_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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
    "scheduled_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "error" TEXT,
    "preferences_last_checked_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "notification_audit" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "integration_connectors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "config" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_executions" (
    "id" TEXT NOT NULL,
    "connector_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "dlq" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_name" TEXT,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_name" TEXT,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "correlation_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "hash" TEXT NOT NULL,
    "prev_hash" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "legal_hold" BOOLEAN NOT NULL DEFAULT false,
    "legal_hold_until" TIMESTAMP(3),

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_audit_state" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "last_event_id" TEXT NOT NULL,
    "last_hash" TEXT NOT NULL,
    "last_sequence" INTEGER NOT NULL,
    "last_occurred_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_audit_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_retention_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "retention_days" INTEGER NOT NULL DEFAULT 365,
    "archive_after_days" INTEGER,
    "purge_after_days" INTEGER,
    "legal_hold" BOOLEAN NOT NULL DEFAULT false,
    "legal_hold_reason" TEXT,
    "legal_hold_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_event_legal_holds" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "date_from" TIMESTAMP(3) NOT NULL,
    "date_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),

    CONSTRAINT "audit_event_legal_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_violations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rule_name" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "event_id" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "compliance_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_chunks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "embedding" vector(384),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_source_indexes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "last_indexed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_source_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_query_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "source_types" TEXT[],
    "top_k" INTEGER NOT NULL DEFAULT 5,
    "result_count" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_expectation_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rule_name" TEXT NOT NULL,
    "evaluated_at" TIMESTAMP(3) NOT NULL,
    "violations_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "compliance_expectation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "dashboards" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layout" JSONB NOT NULL DEFAULT '{"columns":12,"gap":16}',
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "roles" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "report_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataset_name" TEXT NOT NULL,
    "dimensions" TEXT[],
    "metrics" JSONB NOT NULL,
    "filters" JSONB,
    "date_range" JSONB,
    "granularity" TEXT,
    "schedule" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_prefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "event_types" TEXT[],
    "secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "response_code" INTEGER,
    "response_body" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_quotas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "monthly_limit" INTEGER NOT NULL DEFAULT 10000,
    "used_this_month" INTEGER NOT NULL DEFAULT 0,
    "month" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_hooks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plugin_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "handler" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "plugin_hooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_store" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plugin_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "plugin_store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plugin_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "billingPeriod" TEXT NOT NULL DEFAULT 'monthly',
    "pricingModel" TEXT NOT NULL,
    "limits" JSONB NOT NULL,
    "features" TEXT[],
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "pending_plan_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_end" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "grace_period_end" TIMESTAMP(3),
    "suspended_until" TIMESTAMP(3),
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_meters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "usage_meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "lines" JSONB NOT NULL,
    "plan_snapshot" JSONB,
    "subtotal" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "stripe_invoice_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "due_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "promql_expression" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_events" (
    "id" TEXT NOT NULL,
    "rule_name" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'firing',
    "value" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_check_logs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT,
    "checks" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_check_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_authorization_operations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "mutation_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_owner" TEXT,
    "lease_expires_at" TIMESTAMP(3),
    "terminal_at" TIMESTAMP(3),
    "terminal_reason" TEXT,
    "purge_confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_authorization_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_audit_outbox" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "mutation_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lease_owner" TEXT,
    "lease_expires_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "terminal_at" TIMESTAMP(3),
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_audit_outbox_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_better_auth_org_id_key" ON "tenants"("better_auth_org_id");

-- CreateIndex
CREATE UNIQUE INDEX "ba_organizations_slug_key" ON "ba_organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ba_members_organization_id_user_id_key" ON "ba_members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ba_users_email_key" ON "ba_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ba_sessions_token_key" ON "ba_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_better_auth_user_id_key" ON "users"("better_auth_user_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "clientes_tenant_id_idx" ON "clientes"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_users_email_key" ON "client_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "client_users_tenantId_email_key" ON "client_users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "presupuestos_tenant_id_idx" ON "presupuestos"("tenant_id");

-- CreateIndex
CREATE INDEX "presupuestos_cliente_id_idx" ON "presupuestos"("cliente_id");

-- CreateIndex
CREATE INDEX "webhooks_tenant_id_idx" ON "webhooks"("tenant_id");

-- CreateIndex
CREATE INDEX "sistemas_tenant_id_idx" ON "sistemas"("tenant_id");

-- CreateIndex
CREATE INDEX "sistemas_cliente_id_idx" ON "sistemas"("cliente_id");

-- CreateIndex
CREATE INDEX "items_inventario_tenant_id_idx" ON "items_inventario"("tenant_id");

-- CreateIndex
CREATE INDEX "items_inventario_sistema_id_idx" ON "items_inventario"("sistema_id");

-- CreateIndex
CREATE INDEX "eventos_bitacora_tenant_id_idx" ON "eventos_bitacora"("tenant_id");

-- CreateIndex
CREATE INDEX "eventos_bitacora_sistema_id_idx" ON "eventos_bitacora"("sistema_id");

-- CreateIndex
CREATE INDEX "eventos_bitacora_fecha_idx" ON "eventos_bitacora"("fecha");

-- CreateIndex
CREATE INDEX "tareas_tenant_id_idx" ON "tareas"("tenant_id");

-- CreateIndex
CREATE INDEX "tareas_cliente_id_idx" ON "tareas"("cliente_id");

-- CreateIndex
CREATE INDEX "tareas_sistema_id_idx" ON "tareas"("sistema_id");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_storage_key_key" ON "documentos"("storage_key");

-- CreateIndex
CREATE INDEX "documentos_tenant_id_idx" ON "documentos"("tenant_id");

-- CreateIndex
CREATE INDEX "documentos_category_idx" ON "documentos"("category");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_token_idx" ON "share_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "disponibilidad_tenant_id_key" ON "disponibilidad"("tenant_id");

-- CreateIndex
CREATE INDEX "recursos_tenant_id_idx" ON "recursos"("tenant_id");

-- CreateIndex
CREATE INDEX "incidencias_tenant_id_idx" ON "incidencias"("tenant_id");

-- CreateIndex
CREATE INDEX "incidencias_tenant_id_estado_idx" ON "incidencias"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "incidencias_cliente_id_idx" ON "incidencias"("cliente_id");

-- CreateIndex
CREATE INDEX "citas_tenant_id_idx" ON "citas"("tenant_id");

-- CreateIndex
CREATE INDEX "citas_fecha_idx" ON "citas"("fecha");

-- CreateIndex
CREATE INDEX "citas_tenant_id_estado_idx" ON "citas"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "citas_resource_id_idx" ON "citas"("resource_id");

-- CreateIndex
CREATE INDEX "audit_log_tenant_id_idx" ON "audit_log"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_log_tenant" ON "audit_log"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_log_created" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "comunicaciones_tenant_id_idx" ON "comunicaciones"("tenant_id");

-- CreateIndex
CREATE INDEX "comunicaciones_cliente_id_idx" ON "comunicaciones"("cliente_id");

-- CreateIndex
CREATE INDEX "plantillas_documentos_tenant_id_idx" ON "plantillas_documentos"("tenant_id");

-- CreateIndex
CREATE INDEX "pagos_tenant_id_idx" ON "pagos"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "activity_events_event_id_key" ON "activity_events"("event_id");

-- CreateIndex
CREATE INDEX "timeline_tenant_created" ON "activity_events"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "timeline_cliente" ON "activity_events"("tenant_id", "cliente_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "timeline_entity" ON "activity_events"("tenant_id", "entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "timeline_event_type" ON "activity_events"("tenant_id", "event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "timeline_source_module" ON "activity_events"("tenant_id", "source_module", "created_at" DESC);

-- CreateIndex
CREATE INDEX "timeline_severity" ON "activity_events"("tenant_id", "severity", "created_at" DESC);

-- CreateIndex
CREATE INDEX "timeline_correlation" ON "activity_events"("tenant_id", "correlation_id");

-- CreateIndex
CREATE INDEX "timeline_search_vector" ON "activity_events" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "encuestas_tenant_id_idx" ON "encuestas"("tenant_id");

-- CreateIndex
CREATE INDEX "eventos_academicos_tenant_id_idx" ON "eventos_academicos"("tenant_id");

-- CreateIndex
CREATE INDEX "search_entries_tenant_id_entity_type_idx" ON "search_entries"("tenant_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "search_entries_entity_type_entity_id_tenant_id_key" ON "search_entries"("entity_type", "entity_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_secrets_tenant_id_key_key" ON "tenant_secrets"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "automation_rules_tenant_id_trigger_idx" ON "automation_rules"("tenant_id", "trigger");

-- CreateIndex
CREATE INDEX "automation_executions_rule_id_idx" ON "automation_executions"("rule_id");

-- CreateIndex
CREATE INDEX "automation_executions_tenant_id_status_idx" ON "automation_executions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "automation_executions_tenant_id_created_at_idx" ON "automation_executions"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "automation_execution_steps_execution_id_idx" ON "automation_execution_steps"("execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_tenant_id_name_key" ON "message_templates"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "message_deliveries_tenant_id_status_idx" ON "message_deliveries"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "message_deliveries_tenant_id_dlq_idx" ON "message_deliveries"("tenant_id", "dlq");

-- CreateIndex
CREATE INDEX "message_deliveries_tenant_id_created_at_idx" ON "message_deliveries"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "message_deliveries_message_id_key" ON "message_deliveries"("message_id");

-- CreateIndex
CREATE INDEX "document_folders_tenant_id_idx" ON "document_folders"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_folders_tenant_id_parent_id_name_key" ON "document_folders"("tenant_id", "parent_id", "name");

-- CreateIndex
CREATE INDEX "documents_tenant_id_folder_id_idx" ON "documents"("tenant_id", "folder_id");

-- CreateIndex
CREATE INDEX "documents_tenant_id_is_deleted_idx" ON "documents"("tenant_id", "is_deleted");

-- CreateIndex
CREATE INDEX "documents_tenant_id_status_idx" ON "documents"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "documents_tenant_id_hash_key" ON "documents"("tenant_id", "hash");

-- CreateIndex
CREATE INDEX "document_versions_document_id_idx" ON "document_versions"("document_id");

-- CreateIndex
CREATE INDEX "document_versions_document_id_version_number_idx" ON "document_versions"("document_id", "version_number");

-- CreateIndex
CREATE INDEX "document_trash_tenant_id_idx" ON "document_trash"("tenant_id");

-- CreateIndex
CREATE INDEX "document_trash_expires_at_idx" ON "document_trash"("expires_at");

-- CreateIndex
CREATE INDEX "workflow_definitions_tenant_id_idx" ON "workflow_definitions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definition_versions_definition_id_version_key" ON "workflow_definition_versions"("definition_id", "version");

-- CreateIndex
CREATE INDEX "workflow_instances_tenant_id_status_idx" ON "workflow_instances"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "workflow_instances_tenant_id_correlation_id_idx" ON "workflow_instances"("tenant_id", "correlation_id");

-- CreateIndex
CREATE INDEX "workflow_executions_instance_id_idx" ON "workflow_executions"("instance_id");

-- CreateIndex
CREATE INDEX "workflow_executions_tenant_id_idx" ON "workflow_executions"("tenant_id");

-- CreateIndex
CREATE INDEX "workflow_user_tasks_instance_id_idx" ON "workflow_user_tasks"("instance_id");

-- CreateIndex
CREATE INDEX "workflow_user_tasks_tenant_id_status_idx" ON "workflow_user_tasks"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "workflow_timers_fire_at_fired_idx" ON "workflow_timers"("fire_at", "fired");

-- CreateIndex
CREATE INDEX "workflow_timers_tenant_id_idx" ON "workflow_timers"("tenant_id");

-- CreateIndex
CREATE INDEX "workflow_audit_instance_id_idx" ON "workflow_audit"("instance_id");

-- CreateIndex
CREATE INDEX "workflow_audit_created_at_idx" ON "workflow_audit"("created_at" DESC);

-- CreateIndex
CREATE INDEX "workflow_audit_tenant_id_idx" ON "workflow_audit"("tenant_id");

-- CreateIndex
CREATE INDEX "workflow_variables_tenant_id_idx" ON "workflow_variables"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_variables_instance_id_key_key" ON "workflow_variables"("instance_id", "key");

-- CreateIndex
CREATE INDEX "workflow_active_branches_instance_id_branch_group_idx" ON "workflow_active_branches"("instance_id", "branch_group");

-- CreateIndex
CREATE INDEX "workflow_active_branches_tenant_id_idx" ON "workflow_active_branches"("tenant_id");

-- CreateIndex
CREATE INDEX "notification_definitions_tenant_id_idx" ON "notification_definitions"("tenant_id");

-- CreateIndex
CREATE INDEX "notification_definitions_tenant_id_category_idx" ON "notification_definitions"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "notification_instances_idempotency_key_key" ON "notification_instances"("idempotency_key");

-- CreateIndex
CREATE INDEX "notification_instances_tenant_id_status_idx" ON "notification_instances"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "notification_instances_tenant_id_user_id_status_idx" ON "notification_instances"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "notification_instances_tenant_id_correlation_id_idx" ON "notification_instances"("tenant_id", "correlation_id");

-- CreateIndex
CREATE INDEX "notification_instances_tenant_id_scheduled_at_idx" ON "notification_instances"("tenant_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "notification_preferences_tenant_id_user_id_idx" ON "notification_preferences"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_tenant_id_user_id_category_key" ON "notification_preferences"("tenant_id", "user_id", "category");

-- CreateIndex
CREATE INDEX "notification_batches_tenant_id_user_id_status_idx" ON "notification_batches"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "notification_batches_batch_key_idx" ON "notification_batches"("batch_key");

-- CreateIndex
CREATE INDEX "notification_receipts_notification_id_idx" ON "notification_receipts"("notification_id");

-- CreateIndex
CREATE INDEX "notification_receipts_tenant_id_status_idx" ON "notification_receipts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "notification_audit_notification_id_idx" ON "notification_audit"("notification_id");

-- CreateIndex
CREATE INDEX "notification_audit_tenant_id_created_at_idx" ON "notification_audit"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notification_digests_tenant_id_user_id_idx" ON "notification_digests"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "integration_connectors_tenant_id_idx" ON "integration_connectors"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connectors_tenant_id_provider_key" ON "integration_connectors"("tenant_id", "provider");

-- CreateIndex
CREATE INDEX "integration_executions_tenant_id_status_idx" ON "integration_executions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "integration_executions_tenant_id_created_at_idx" ON "integration_executions"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_sequence_idx" ON "audit_events"("tenant_id", "sequence");

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_occurred_at_idx" ON "audit_events"("tenant_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_actor_type_actor_id_idx" ON "audit_events"("tenant_id", "actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_resource_type_resource_id_idx" ON "audit_events"("tenant_id", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_action_outcome_idx" ON "audit_events"("tenant_id", "action", "outcome");

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_correlation_id_idx" ON "audit_events"("tenant_id", "correlation_id");

-- CreateIndex
CREATE INDEX "audit_events_occurred_at_idx" ON "audit_events" USING BRIN ("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "audit_events_tenant_id_sequence_key" ON "audit_events"("tenant_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_audit_state_tenant_id_key" ON "tenant_audit_state"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_retention_policies_tenant_id_key" ON "audit_retention_policies"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_event_legal_holds_tenant_id_idx" ON "audit_event_legal_holds"("tenant_id");

-- CreateIndex
CREATE INDEX "compliance_violations_tenant_id_framework_idx" ON "compliance_violations"("tenant_id", "framework");

-- CreateIndex
CREATE INDEX "compliance_violations_tenant_id_severity_idx" ON "compliance_violations"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "kb_chunks_tenant_id_source_type_source_id_idx" ON "kb_chunks"("tenant_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "kb_chunks_tenant_id_content_hash_idx" ON "kb_chunks"("tenant_id", "content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "kb_chunks_tenant_id_source_type_source_id_chunk_index_key" ON "kb_chunks"("tenant_id", "source_type", "source_id", "chunk_index");

-- CreateIndex
CREATE UNIQUE INDEX "kb_source_indexes_tenant_id_source_type_source_id_key" ON "kb_source_indexes"("tenant_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "kb_query_logs_tenant_id_created_at_idx" ON "kb_query_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "compliance_expectation_runs_tenant_id_rule_name_idx" ON "compliance_expectation_runs"("tenant_id", "rule_name");

-- CreateIndex
CREATE INDEX "analytics_datasets_tenant_id_dataset_name_granularity_windo_idx" ON "analytics_datasets"("tenant_id", "dataset_name", "granularity", "window_start" DESC);

-- CreateIndex
CREATE INDEX "analytics_datasets_tenant_id_metric_name_window_start_idx" ON "analytics_datasets"("tenant_id", "metric_name", "window_start" DESC);

-- CreateIndex
CREATE INDEX "analytics_datasets_tenant_id_idx" ON "analytics_datasets"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_datasets_tenant_id_dataset_name_metric_name_granu_key" ON "analytics_datasets"("tenant_id", "dataset_name", "metric_name", "granularity", "window_start");

-- CreateIndex
CREATE INDEX "analytics_snapshots_tenant_id_name_expires_at_idx" ON "analytics_snapshots"("tenant_id", "name", "expires_at");

-- CreateIndex
CREATE INDEX "analytics_snapshots_tenant_id_idx" ON "analytics_snapshots"("tenant_id");

-- CreateIndex
CREATE INDEX "kpis_tenant_id_idx" ON "kpis"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "kpis_tenant_id_name_key" ON "kpis"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "dashboards_tenant_id_idx" ON "dashboards"("tenant_id");

-- CreateIndex
CREATE INDEX "dashboard_widgets_dashboard_id_idx" ON "dashboard_widgets"("dashboard_id");

-- CreateIndex
CREATE INDEX "dashboard_widgets_tenant_id_idx" ON "dashboard_widgets"("tenant_id");

-- CreateIndex
CREATE INDEX "report_definitions_tenant_id_idx" ON "report_definitions"("tenant_id");

-- CreateIndex
CREATE INDEX "report_executions_report_id_created_at_idx" ON "report_executions"("report_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "report_executions_tenant_id_idx" ON "report_executions"("tenant_id");

-- CreateIndex
CREATE INDEX "export_jobs_tenant_id_status_idx" ON "export_jobs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "export_jobs_tenant_id_idx" ON "export_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "dataset_ingestion_logs_tenant_id_dataset_name_window_start_idx" ON "dataset_ingestion_logs"("tenant_id", "dataset_name", "window_start");

-- CreateIndex
CREATE INDEX "dataset_ingestion_logs_tenant_id_idx" ON "dataset_ingestion_logs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_token_hash_key" ON "api_keys"("token_hash");

-- CreateIndex
CREATE INDEX "api_keys_tenant_id_idx" ON "api_keys"("tenant_id");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_tenant_id_idx" ON "webhook_subscriptions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_delivery_id_key" ON "webhook_deliveries"("delivery_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_subscription_id_created_at_idx" ON "webhook_deliveries"("subscription_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_deliveries_delivery_id_idx" ON "webhook_deliveries"("delivery_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_quotas_tenant_id_key" ON "api_quotas"("tenant_id");

-- CreateIndex
CREATE INDEX "plugins_tenant_id_status_idx" ON "plugins"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "plugins_tenant_id_name_key" ON "plugins"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "plugin_hooks_tenant_id_event_type_priority_idx" ON "plugin_hooks"("tenant_id", "event_type", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_hooks_tenant_id_plugin_id_event_type_key" ON "plugin_hooks"("tenant_id", "plugin_id", "event_type");

-- CreateIndex
CREATE INDEX "plugin_store_tenant_id_plugin_id_idx" ON "plugin_store"("tenant_id", "plugin_id");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_store_tenant_id_plugin_id_key_key" ON "plugin_store"("tenant_id", "plugin_id", "key");

-- CreateIndex
CREATE INDEX "plugin_events_tenant_id_event_type_created_at_idx" ON "plugin_events"("tenant_id", "event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "plugin_events_created_at_idx" ON "plugin_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_customer_id_key" ON "subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "subscriptions_tenant_id_status_idx" ON "subscriptions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "usage_meters_tenant_id_metric_period_start_period_end_idx" ON "usage_meters"("tenant_id", "metric", "period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "usage_meters_tenant_id_metric_period_start_key" ON "usage_meters"("tenant_id", "metric", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripe_invoice_id_key" ON "invoices"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_status_idx" ON "invoices"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "invoices_subscription_id_period_start_period_end_idx" ON "invoices"("subscription_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_created_at_idx" ON "stripe_webhook_events"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "alert_rules_name_key" ON "alert_rules"("name");

-- CreateIndex
CREATE INDEX "alert_events_rule_name_started_at_idx" ON "alert_events"("rule_name", "started_at" DESC);

-- CreateIndex
CREATE INDEX "alert_events_status_severity_idx" ON "alert_events"("status", "severity");

-- CreateIndex
CREATE INDEX "health_check_logs_created_at_idx" ON "health_check_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "identity_authorization_operations_status_next_attempt_at_idx" ON "identity_authorization_operations"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "identity_authorization_operations_tenant_id_status_next_att_idx" ON "identity_authorization_operations"("tenant_id", "status", "next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "identity_authorization_operations_tenant_id_subject_id_muta_key" ON "identity_authorization_operations"("tenant_id", "subject_id", "mutation_id");

-- CreateIndex
CREATE UNIQUE INDEX "identity_audit_outbox_event_id_key" ON "identity_audit_outbox"("event_id");

-- CreateIndex
CREATE INDEX "identity_audit_outbox_tenant_id_status_lease_expires_at_idx" ON "identity_audit_outbox"("tenant_id", "status", "lease_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "identity_audit_outbox_tenant_id_mutation_id_event_type_key" ON "identity_audit_outbox"("tenant_id", "mutation_id", "event_type");

-- CreateIndex
CREATE INDEX "data_lifecycle_policies_tenant_id_enabled_idx" ON "data_lifecycle_policies"("tenant_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "data_lifecycle_policies_tenant_id_target_key" ON "data_lifecycle_policies"("tenant_id", "target");

-- CreateIndex
CREATE INDEX "data_lifecycle_runs_tenant_id_scheduled_for_idx" ON "data_lifecycle_runs"("tenant_id", "scheduled_for" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "data_lifecycle_runs_policy_id_scheduled_for_key" ON "data_lifecycle_runs"("policy_id", "scheduled_for");

-- AddForeignKey
ALTER TABLE "ba_members" ADD CONSTRAINT "ba_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "ba_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ba_members" ADD CONSTRAINT "ba_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ba_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ba_invitations" ADD CONSTRAINT "ba_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "ba_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ba_invitations" ADD CONSTRAINT "ba_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "ba_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ba_sessions" ADD CONSTRAINT "ba_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ba_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ba_sessions" ADD CONSTRAINT "ba_sessions_active_organization_id_fkey" FOREIGN KEY ("active_organization_id") REFERENCES "ba_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ba_accounts" ADD CONSTRAINT "ba_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ba_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_users" ADD CONSTRAINT "client_users_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_users" ADD CONSTRAINT "client_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sistemas" ADD CONSTRAINT "sistemas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sistemas" ADD CONSTRAINT "sistemas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_inventario" ADD CONSTRAINT "items_inventario_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_inventario" ADD CONSTRAINT "items_inventario_sistema_id_fkey" FOREIGN KEY ("sistema_id") REFERENCES "sistemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_bitacora" ADD CONSTRAINT "eventos_bitacora_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_bitacora" ADD CONSTRAINT "eventos_bitacora_sistema_id_fkey" FOREIGN KEY ("sistema_id") REFERENCES "sistemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_sistema_id_fkey" FOREIGN KEY ("sistema_id") REFERENCES "sistemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilidad" ADD CONSTRAINT "disponibilidad_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recursos" ADD CONSTRAINT "recursos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "recursos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicaciones" ADD CONSTRAINT "comunicaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_documentos" ADD CONSTRAINT "plantillas_documentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_presupuesto_id_fkey" FOREIGN KEY ("presupuesto_id") REFERENCES "presupuestos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encuestas" ADD CONSTRAINT "encuestas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_academicos" ADD CONSTRAINT "eventos_academicos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_entries" ADD CONSTRAINT "search_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_secrets" ADD CONSTRAINT "tenant_secrets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "automation_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_execution_steps" ADD CONSTRAINT "automation_execution_steps_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "automation_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "document_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "document_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_definition_versions" ADD CONSTRAINT "workflow_definition_versions_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_user_tasks" ADD CONSTRAINT "workflow_user_tasks_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_timers" ADD CONSTRAINT "workflow_timers_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_audit" ADD CONSTRAINT "workflow_audit_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_variables" ADD CONSTRAINT "workflow_variables_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_active_branches" ADD CONSTRAINT "workflow_active_branches_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_instances" ADD CONSTRAINT "notification_instances_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "notification_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_receipts" ADD CONSTRAINT "notification_receipts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notification_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "report_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "webhook_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_hooks" ADD CONSTRAINT "plugin_hooks_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_store" ADD CONSTRAINT "plugin_store_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_authorization_operations" ADD CONSTRAINT "identity_authorization_operations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_audit_outbox" ADD CONSTRAINT "identity_audit_outbox_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_lifecycle_policies" ADD CONSTRAINT "data_lifecycle_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_lifecycle_runs" ADD CONSTRAINT "data_lifecycle_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_lifecycle_runs" ADD CONSTRAINT "data_lifecycle_runs_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "data_lifecycle_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

