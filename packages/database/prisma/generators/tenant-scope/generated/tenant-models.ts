// ⚡ AUTO-GENERATED — DO NOT EDIT
// Source: prisma/schema.prisma
// Generator: prisma/generators/tenant-scope/generator.ts
// Generated: 2026-07-16T21:17:24.501Z

/**
 * Models that have a `tenantId` field and receive automatic
 * tenant-scoping in every Prisma query via createPrismaClient().
 */
export const TENANT_SCOPED_MODELS = [
  "AuditLog",
  "Cita",
  "ClientUser",
  "Cliente",
  "Comunicacion",
  "Disponibilidad",
  "Documento",
  "Encuesta",
  "EventoAcademico",
  "EventoBitacora",
  "Incidencia",
  "ItemInventario",
  "PagoIntent",
  "PlantillaDocumento",
  "Presupuesto",
  "Resource",
  "Sistema",
  "Tarea",
  "User",
  "Webhook"
] as const;

/**
 * Models that have a `clienteId` field and receive automatic
 * cross-client isolation via createPrismaClient({ clienteId }).
 */
export const CLIENTE_SCOPED_MODELS = [
  "Cita",
  "ClientUser",
  "Comunicacion",
  "Documento",
  "Incidencia",
  "PagoIntent",
  "Presupuesto",
  "Sistema",
  "Tarea"
] as const;

/**
 * Every model in the schema. Useful for validation.
 */
export const ALL_MODELS = [
  "AuditLog",
  "Cita",
  "ClientUser",
  "Cliente",
  "Comunicacion",
  "Disponibilidad",
  "Documento",
  "Encuesta",
  "EventoAcademico",
  "EventoBitacora",
  "Incidencia",
  "ItemInventario",
  "PagoIntent",
  "PlantillaDocumento",
  "Presupuesto",
  "Resource",
  "ShareLink",
  "Sistema",
  "Tarea",
  "Tenant",
  "User",
  "Webhook",
  "account",
  "invitation",
  "member",
  "organization",
  "session",
  "user",
  "verification"
] as const;

/**
 * Models grouped by the scoping field they contain.
 */
export const MODELS_BY_SCOPED_FIELD = {
  "tenantId": [
    "User",
    "Cliente",
    "ClientUser",
    "Presupuesto",
    "Webhook",
    "Sistema",
    "ItemInventario",
    "EventoBitacora",
    "Tarea",
    "Documento",
    "Disponibilidad",
    "Resource",
    "Incidencia",
    "Cita",
    "AuditLog",
    "Comunicacion",
    "PlantillaDocumento",
    "PagoIntent",
    "Encuesta",
    "EventoAcademico"
  ],
  "clienteId": [
    "ClientUser",
    "Presupuesto",
    "Sistema",
    "Tarea",
    "Documento",
    "Incidencia",
    "Cita",
    "Comunicacion",
    "PagoIntent"
  ]
} as const;

// ── Type helpers ────────────────────────────────────────────────────────

export type TenantScopedModel = typeof TENANT_SCOPED_MODELS[number];
export type ClienteScopedModel = typeof CLIENTE_SCOPED_MODELS[number];

export function isTenantScopedModel(name: string): name is TenantScopedModel {
  return (TENANT_SCOPED_MODELS as readonly string[]).includes(name);
}

export function isClienteScopedModel(name: string): name is ClienteScopedModel {
  return (CLIENTE_SCOPED_MODELS as readonly string[]).includes(name);
}
