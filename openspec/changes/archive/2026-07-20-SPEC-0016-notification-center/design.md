# Design: SPEC-0016 — Notification Center

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Platform Baseline:** sdd-v2.1-baseline
> **Estado:** Refined (Architecture Review conditions applied)

---

## 1. Executive Summary

CRM-Master carece de un sistema centralizado de notificaciones. Cada módulo
envía notificaciones de forma ad-hoc: el Workflow Engine (SPEC-0015) necesita
avisar a usuarios sobre tareas pendientes, la Communication Platform (SPEC-0012)
entrega mensajes pero no decide cuándo ni a quién, y no existe gestión de
preferencias de usuario, canales, horarios, prioridades ni batching.

**Notification Center** centraliza el ciclo de vida completo de las
notificaciones: decide qué notificaciones enviar, cuándo, por qué canal,
a quién, con qué prioridad, respetando preferencias de usuario y horarios
de silencio. Delega toda la entrega a la Communication Platform (SPEC-0012),
sin acceder nunca directamente a proveedores. Soporta notificaciones
inmediatas, programadas, digeridas, batch, escaladas, recordatorios y reintentos.

El impacto esperado es eliminar la dispersión actual de lógica de
notificaciones, dar a los usuarios control unificado sobre sus preferencias,
y proporcionar trazabilidad completa con receipts de entrega y lectura.

---

## 2. Technical Approach

El Notification Center se organiza en seis capas:

1. **Notification Definition** — define el tipo de notificación, categoría,
   canales disponibles, prioridad por defecto, template de contenido, reglas
   de enrutamiento y política de retención. Inmutable una vez publicada.

2. **Notification Instance** — instancia concreta de una notificación. Tiene
   estado (pending, scheduled, queued, delivered, failed, cancelled, expired,
   read), destinatario, canal, contenido resuelto, snapshot de definición en
   creación, y metadatos de trazabilidad.

3. **Routing Engine** — evalúa si una notificación debe enviarse basándose en:
   prioridad, severidad, preferencias del usuario, quiet hours, business hours,
   canales disponibles, throttling y rate limiting. Determina el canal primario
   y los canales de fallback.

4. **Batching & Digest Engine** — agrupa notificaciones en batches y digest
   (diario, semanal, ventana configurable) por categoría, entidad o workflow.
   Las notificaciones inmediatas saltan el batching.

5. **Scheduler & Delivery** — programa notificaciones inmediatas y retrasadas,
   delega la entrega a Communication Platform (SPEC-0012) vía
   `CommunicationProvider` con `idempotencyKey`, y registra delivery receipts.

6. **Preferences & Audit** — gestiona preferencias por tenant, usuario y
   categoría. Cada transición de estado se registra en audit trail.

```
Definition (type, category, channels, routing rules)
     │
     ▼
Instance (state, recipient, channel, content, contentSnapshot, metadata)
     │
     ├── Routing Engine
     │     ├── Priority + Severity
     │     ├── User Preferences + Quiet Hours
     │     ├── Channel Availability + Fallback
     │     └── Throttling + Rate Limit
     │
     ├── Batching & Digest Engine
     │     ├── Immediate → Deliver now
     │     ├── Batch → Group by category/entity/workflow
     │     └── Digest → Daily/Weekly window
     │
     ├── Scheduler → SPEC-0012 Communication Platform
     │
     └── Audit Trail (every transition)
```

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Definition format | JSON, YAML, DB columns | **JSON + DB** | Schema versionado en JSON para flexibilidad. Columnas indexed para consultas frecuentes. |
| Definition immutability | Editable siempre, Inmutable tras publicar | **Inmutable tras publicar** | Mismo patrón que Workflow Engine (SPEC-0015). Las notificaciones en curso no deben cambiar. |
| Delivery delegation | Directo a proveedores, Vía Communication Platform | **SPEC-0012 Communication Platform** | El Notification Center nunca toca proveedores. SPEC-0012 es el único bounded context autorizado. |
| Routing strategy | Rule-based, ML-based, Static priority | **Rule-based con overrides** | Reglas configurables por definición. ML puede añadirse como extensión. |
| Batching | Cron jobs, BullMQ repeatable, Event-driven | **BullMQ repeatable + Event window** | Misma infraestructura que SPEC-0011/12/13/15. Workers estateless. |
| Preferences storage | JSONB columna, Tabla EAV, Documento | **Tabla EAV (clave-valor por tenant/usuario/categoría)** | Consultas simples, escalable, sin schema migration por nueva preferencia. |
| Deduplication | Redis, DB unique constraint, IdempotencyKey | **IdempotencyKey + DB unique constraint** | El `notificationId` es único. Reintento con mismo ID es no-op. |
| Receipts | Polling, Webhook, Callback | **Webhook + Polling fallback** | SPEC-0012 entrega y notifica. Si webhook falla, polling periódico recupera. |
| Throttling | Token bucket, Leaky bucket, Fixed window | **Sliding window (Redis o DB)** | Por usuario y canal. Ventana deslizante evita ráfagas. |
| SPEC-0015 integration | ServiceTask, Direct REST, Shared interface | **POST /api/v1/notifications via ServiceTaskGateway** | SPEC-0015 invoca SPEC-0016 a través de su `ServiceTaskGateway` con `correlationId = workflowInstanceId`. El `UserTask` executor crea una notificación por este contrato cuando una tarea humana es asignada. |
| Definition versioning | NotificationDefinitionVersion table, Content snapshot on instance | **Content snapshot on NotificationInstance** | Almacenar `contentSnapshot: Json` en `NotificationInstance` en tiempo de creación. Más simple que tabla separada, sin joins, garantiza que notificaciones históricas no cambien aunque la definición se actualice. |

---

## 4. Data Flow

**Policy:** Routing preferences are evaluated at creation. Quiet hours and enabled/disabled are re-evaluated at delivery.

```
Create notification:

WorkflowEngine / Automation / Integration → POST /api/v1/notifications
       │
       ├── Create NotificationInstance (PENDING)
       ├── Resolve definition + routing rules
       ├── Snapshot definition content → contentSnapshot
       │
       ├── Check preferences — CHECKPOINT A (creation)
       │     ├── Evaluate: enabled/disabled, category allowed, preferred channels
       │     ├── DISABLED → mark CANCELLED, stop
       │     ├── ENABLED → select preferred channels for routing
       │     └── Store preferencesLastCheckedAt
       │
       ├── Routing Engine (channel selection based on creation-time preferences)
       │     ├── Select primary channel from allowed channels
       │     ├── Resolve content template
       │     └── Apply throttling
       │
       ├── Batching decision
       │     ├── DIGEST/BATCH → add to batch group using {tenantId}:{batchKey}, mark QUEUED
       │     └── IMMEDIATE → mark SCHEDULED, queue delivery
       │
       └── Return notificationId

Deliver notification (immediate or scheduled):

BullMQ worker picks up delivery
       │
       ├── Lock notification (optimistic, version++)
       │
       ├── Check preferences — CHECKPOINT B (delivery)
       │     ├── Re-evaluate: enabled/disabled
       │     ├── Re-evaluate: quiet hours
       │     │     ├── INSIDE QUIET HOURS → re-schedule for next allowed window
       │     │     └── OUTSIDE → continue
       │     ├── DISABLED (changed since creation) → mark CANCELLED, stop
       │     └── Update preferencesLastCheckedAt
       │
       ├── Call SPEC-0012 CommunicationPlatform.send() with idempotencyKey
       │     ├── SUCCESS → mark DELIVERED, record receipt
       │     └── FAILURE → retry with backoff, or DLQ
       │
       └── Update audit trail

Process digest:

BullMQ repeatable job (daily/weekly)
       │
       ├── Query pending digest notifications for window
       ├── Group by user + category
       ├── Create digest notification
       ├── Mark original notifications as BATCHED
       └── Queue delivery of digest notification

Preference change:

User → PATCH /api/v1/notifications/preferences
       │
       ├── Update preference
       └── Future notifications respect new preference

Note — Batch window race: New notifications created between batch window close and
job execution use {tenantId}:{batchKey}:{windowEnd} for membership, not createdAt,
preventing orphaned notifications. The batch window stays open until the job
atomically marks it closed.
```

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add `NotificationDefinition`, `NotificationInstance`, `NotificationPreference`, `NotificationBatch`, `NotificationDigest`, `NotificationReceipt`, `NotificationAudit` models |
| 2 | `packages/shared/src/notification/notification.types.ts` | Create | Core types: NotificationType, NotificationStatus, ChannelType, Priority, Severity |
| 3 | `packages/shared/src/notification/definition.types.ts` | Create | NotificationDefinition, RoutingRule, ChannelConfig |
| 4 | `packages/shared/src/notification/preference.types.ts` | Create | NotificationPreference, QuietHours, DigestFrequency |
| 5 | `packages/shared/src/notification/routing.types.ts` | Create | RoutingResult, ChannelSelection, RoutingContext |
| 6 | `packages/shared/src/notification/index.ts` | Create | Re-export |
| 7 | `apps/api/src/modules/notification/notification.module.ts` | Create | NestJS module |
| 8 | `apps/api/src/modules/notification/notification.service.ts` | Create | Core engine |
| 9 | `apps/api/src/modules/notification/notification.controller.ts` | Create | REST API |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 10 | `apps/api/src/modules/notification/routing/routing-engine.ts` | Create | Routing logic |
| 11 | `apps/api/src/modules/notification/batching/batching-engine.ts` | Create | Batching + digest |
| 12 | `apps/api/src/modules/notification/preferences/preference.service.ts` | Create | Preferences CRUD |
| 13 | `apps/api/src/modules/notification/guards/notification.guard.ts` | Create | Tenant-scoped access |
| 14 | `apps/api/src/modules/notification/guards/preference.guard.ts` | Create | Preference isolation |
| 15 | `apps/api/src/modules/notification/delivery/delivery-orchestrator.ts` | Create | Delegation to SPEC-0012 |
| 16 | `apps/api/src/modules/core/core.module.ts` | Modify | Import NotificationModule |

### 5.3 Expected NOT to Change

- `CommunicationModule` (SPEC-0012) — solo se llama vía contrato compartido
- `WorkflowModule` (SPEC-0015) — consume notificaciones, no las modifica
- `AutomationModule` (SPEC-0011) — puede trigger notificaciones, no las gestiona
- Cualquier proveedor externo (Twilio, SendGrid, etc.) — solo SPEC-0012 los toca

---

## 6. Read Order

1. `packages/shared/src/notification/notification.types.ts` — tipos base
2. `packages/shared/src/notification/definition.types.ts` — definiciones
3. `packages/shared/src/notification/preference.types.ts` — preferencias
4. `packages/shared/src/communication/communication-provider.ts` — patrón de delegación SPEC-0012
5. `packages/database/prisma/schema.prisma` — naming + patrones existentes
6. `apps/api/src/modules/notification/notification.module.ts` — estructura del módulo
7. `apps/api/src/modules/notification/routing/routing-engine.ts` — lógica core
8. `apps/api/src/modules/notification/batching/batching-engine.ts` — batching
9. `apps/api/src/modules/notification/delivery/delivery-orchestrator.ts` — entrega

---

## 7. Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_notification_tables
pnpm --filter database generate
pnpm --filter api test notification
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** High

El patrón Definition → Instance → Routing → Delivery con delegación a
SPEC-0012 sigue la misma arquitectura que SPEC-0015 (Workflow Engine).
El Routing Engine con rule-based + preferences extiende el patrón de
Provider registry que ya funciona en SPEC-0011 y SPEC-0012.

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 4 | Patrones de plataformas existentes |
| Files to read | 6 | Schema, types, communication provider |
| Files to create | 14 | Module, service, engine, preferences, guards, delivery, types |
| Files to modify | 2 | schema.prisma, core.module.ts |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| SPEC-0012 CommunicationProvider no soporta idempotencyKey | Alta — verificado ausente en contrato actual | Alto | Exigir idempotencyKey como requisito cross-SPEC añadiéndolo a `SendMessageInput` antes de la integración de delivery. |
| Digest batch demasiado grande (>1000 notificaciones) | Media | Medio | Límite configurable por digest. Si excede, dividir en sub-batches. |
| Quiet hours cambian mientras hay notificaciones programadas | Baja | Bajo | Quiet hours re-evaluadas en CHECKPOINT B (delivery). Las programadas existentes respetan el cambio al momento de envío. |
| Rate limiting bloquea notificaciones críticas (seguridad, pago) | Media | Alto | Las notificaciones CRITICAL severity bypassan rate limiting. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Routing | Preference evaluation, quiet hours, channel selection | Jest |
| Unit — Batching | Batch grouping, digest window, limits | Jest |
| Unit — Deduplication | IdempotencyKey + unique constraint | Jest |
| Integration — API | CRUD definitions, create/list/cancel notifications, preference CRUD | supertest |
| Integration — Delivery | Delegation to SPEC-0012 via CommunicationProvider mock | Jest + mock |
| Doorbell | Tenant A notifications invisibles para Tenant B | E2E |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `notification-cross-tenant-isolation.spec.ts` | Tenant A cannot see Tenant B's notifications, definitions, or receipts |
| `notification-preference-isolation.spec.ts` | Tenant A preference changes do not affect Tenant B |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0012 | Documentar la arquitectura del Notification Center, el modelo de definiciones, routing, batching y delivery delegation. | Proposed |

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `NotificationDefinition` | NotificationModule | Tipos de notificación versionados |
| `NotificationInstance` | NotificationModule | Estados de notificación |
| `NotificationPreference` | NotificationModule | Preferencias por tenant/usuario/categoría |
| `RoutingEngine` | NotificationModule | Decisión de canal y timing |
| `BatchingEngine` | NotificationModule | Digest y batch |
| Message delivery | CommunicationModule (SPEC-0012) | Entrega real a proveedores |
| Workflow triggers | WorkflowModule (SPEC-0015) | Inicia notificaciones, no las gestiona |

### 14.1 SPEC-0015 / SPEC-0016 Integration

SPEC-0015 calls SPEC-0016 via `POST /api/v1/notifications` with
`correlationId = workflowInstanceId`. The `ServiceTaskGateway` from
SPEC-0015 can invoke this endpoint. The `UserTask` executor in SPEC-0015
creates a notification through this contract when a human task is assigned.

The integration is one-directional: SPEC-0015 creates notifications, SPEC-0016
owns the full lifecycle. No reverse dependency exists.

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| New channel (Push, SMS, Webhook) | Implementar `ChannelAdapter` en SPEC-0012. El Notification Center solo añade el canal a la definición. | Days |
| ML-based routing priority | Implementar `RoutingStrategy` alternativa sin modificar el engine | Weeks |
| Custom digest frequency | Añadir frecuencia al schema de `NotificationPreference` sin migration de datos | Days |
| Notification templates con variables | Almacenar template en definition, resolver en creación de instancia | Days |
| A/B testing de canales | RoutingStrategy con split test, sin modificar delivery | Weeks |
| Custom RoutingStrategy implementations | Registrar vía `RoutingStrategyRegistry` (mismo patrón que `NodeExecutorRegistry` en SPEC-0015). Estrategias alternativas extienden OCP sin modificar el engine. | Days |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× (1M notif/día) | 100× (10M notif/día) | Mitigation |
|--------|-------------------|----------------------|------------|
| Storage | ~10 GB/día (instances + audit) | ~100 GB/día | Partición diaria. Archive >30 días. |
| Notification creation | <10ms | <30ms | Index on `(tenantId, status, createdAt)` |
| Routing evaluation | <5ms | <10ms | Cached preferences per user. Rule evaluation sin DB. |
| Delivery throughput | ~50/s | ~500/s | Workers horizontales. Batching reduce presión. |
| Digest processing | <30s | <5min | Parallel processing por tenant. |

**Decision:** El sistema escala horizontalmente con workers estateless. El cuello de botella es la base de datos de notificaciones — mitigado con partición semanal y archive temprano. Las preferencias se cachean en Redis (o en memoria con TTL) para evitar lecturas DB en routing.

### B. Open/Closed Principle (OCP)

**Point of extension:** `RoutingStrategy` y `BatchPolicy`.

**What must change to add a new routing strategy:** Implementar `RoutingStrategy` interface + registrar en `RoutingStrategyRegistry` (mismo patrón que SPEC-0015's `NodeExecutorRegistry`). Cero cambios en el engine.

**What must change to add a new channel type:** Añadir `ChannelAdapter` en SPEC-0012. Añadir el canal a `NotificationDefinition.channels[]` en el Notification Center. Cero cambios en el engine.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| Notification definitions | NotificationModule | Engine, Tenants (CRUD) |
| Notification instances | NotificationModule | Engine, Tenants (monitoring) |
| Notification preferences | NotificationModule | Users, Engine |
| Message delivery | CommunicationModule (SPEC-0012) | NotificationModule |
| Templates | NotificationModule | Engine (content resolution) |
| Audit trail | NotificationModule | Compliance, Monitoring |

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| Definitions | Indefinido | No aplica | Desactivar |
| Instances delivered | 30 días | Archive diario | Eliminar >30 días |
| Instances failed | 90 días | Archive semanal | Eliminar >90 días |
| Digest batches | 90 días | Archive semanal | Eliminar >90 días |
| Preferences | Indefinido | No aplica | Solo por solicitud del usuario |
| Audit trail | 1 año | Archive mensual | Eliminar >1 año |
| Receipts | 1 año mínimo | Archive mensual | Eliminar >1 año. Independiente del ciclo de vida de la instancia. |

### E. Idempotency

| Operation | Duplicate risk | Protection |
|-----------|---------------|------------|
| `createNotification()` | Alta (retry del caller) | `idempotencyKey` + `ON CONFLICT (idempotency_key) DO NOTHING` |
| `deliver()` | Alta (retry del worker) | `notificationId` + state check: si ya DELIVERED, no-op |
| `batch()` | Media | Unique batch window per user + category |
| `preference update()` | Baja | Upsert por (tenantId, userId, category) |

### F. Shared Contracts

| Contract | Location | Consumers |
|----------|----------|-----------|
| `NotificationType` | `packages/shared/src/notification/` | Engine, Definitions, Controller |
| `ChannelType` | `packages/shared/src/notification/` | Engine, Definitions, SPEC-0012 |
| `NotificationPreference` | `packages/shared/src/notification/` | Engine, PreferenceService |
| `CommunicationProvider.send()` + `SendMessageInput` | `packages/shared/src/communication/` | DeliveryOrchestrator, SPEC-0012 |
| `SendMessageInput.idempotencyKey` | `packages/shared/src/communication/provider.interface.ts` | Cross-SPEC (añadido como requisito de SPEC-0016) |

### G. Partitioning Strategy

`notification_instances` se particiona por semana (reduce overhead de 365 particiones/año a 52).
`notification_audit` se particiona por mes (12 particiones/año, volumen histórico más manejable).
`notification_preferences` no requiere partición (volumen bajo estable).
`notification_batches` se particiona por semana.
`notification_receipts` se particiona por mes (1 año mínimo de retención).

---

## 16. Interfaces / Contracts

```typescript
// ─── Base Types ─────────────────────────────────
export type NotificationStatus =
  | 'pending' | 'scheduled' | 'queued' | 'delivered'
  | 'failed' | 'cancelled' | 'expired' | 'read' | 'batched';

export type ChannelType = 'email' | 'sms' | 'push' | 'in-app' | 'webhook';

export type Priority = 'low' | 'normal' | 'high' | 'critical';

export type Severity = 'info' | 'warning' | 'error' | 'critical';

export type DigestFrequency = 'never' | 'daily' | 'weekly' | 'custom';

// ─── NotificationDefinition ─────────────────────
export interface NotificationDefinition {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  channels: ChannelType[];
  defaultPriority: Priority;
  defaultSeverity: Severity;
  routingRules: RoutingRule[];
  template?: NotificationTemplate;
  isPublished: boolean;
  bypassQuietHours?: boolean;
  version: number;
}

export interface RoutingRule {
  condition?: string;        // expression
  channel: ChannelType;
  priority?: Priority;
  fallbackChannels?: ChannelType[];
}

export interface NotificationTemplate {
  subject?: string;
  body: string;
  variables?: string[];
}

// ─── NotificationInstance ────────────────────────
export interface NotificationInstance {
  id: string;
  tenantId: string;
  definitionId: string;
  userId: string;
  status: NotificationStatus;
  channel: ChannelType;
  priority: Priority;
  severity: Severity;
  content: Record<string, unknown>;
  contentSnapshot?: Record<string, unknown>;  // resolved definition at creation time
  idempotencyKey?: string;
  correlationId?: string;
  scheduledAt?: string;
  expiresAt?: string;
  deliveredAt?: string;
  readAt?: string;
  error?: string;
  preferencesLastCheckedAt?: string;  // ISO datetime of last preference evaluation
  version: number;
}

// ─── NotificationPreference ──────────────────────
export interface NotificationPreference {
  id: string;
  tenantId: string;
  userId: string;
  category?: string;          // null = global default
  enabled: boolean;
  preferredChannels: ChannelType[];
  quietHours?: QuietHours;
  digestFrequency: DigestFrequency;
  timezone?: string;
  language?: string;
}

export interface QuietHours {
  start: string;              // "22:00"
  end: string;                // "07:00"
  timezone: string;
}

// ─── Routing ─────────────────────────────────────
export interface RoutingContext {
  notification: NotificationInstance;
  definition: NotificationDefinition;
  preferences: NotificationPreference[];
  tenantId: string;
  userId: string;
}

export interface RoutingResult {
  channel: ChannelType;
  fallbackChannels: ChannelType[];
  priority: Priority;
  delay?: number;             // ms to delay
  bypassQuietHours: boolean;
}

export interface RoutingStrategy {
  route(context: RoutingContext): Promise<RoutingResult>;
}

// ─── Batching ────────────────────────────────────
export interface BatchPolicy {
  shouldBatch(notification: NotificationInstance): boolean;
  getBatchKey(notification: NotificationInstance): string;  // includes tenantId prefix
  getDigestSchedule(): string;  // cron expression
}

// ─── Delivery ────────────────────────────────────
export interface DeliveryRequest {
  notificationId: string;
  tenantId: string;
  userId: string;
  channel: ChannelType;
  content: Record<string, unknown>;
  idempotencyKey: string;
  priority: Priority;
}

export interface DeliveryReceipt {
  notificationId: string;
  channel: ChannelType;
  status: 'delivered' | 'failed' | 'bounced';
  deliveredAt: string;
  providerMessageId?: string;
  error?: string;
}

// ─── SPEC-0012 CommunicationProvider Contract (cross-SPEC) ───
// The SendMessageInput interface in SPEC-0012's shared contract
// MUST include idempotencyKey to support deduplicated delivery.
// This is a prerequisite for SPEC-0016 integration.

// Current: packages/shared/src/communication/provider.interface.ts
export interface CommunicationProvider {
  readonly id: string;
  readonly name: string;
  readonly channels: string[];
  send(channel: string, message: SendMessageInput): Promise<SendResult>;
  verifyWebhookSignature(request: WebhookRequest): boolean;
}

export interface SendMessageInput {
  messageId: string;
  tenantId: string;
  channel: string;
  to: string | string[];
  subject?: string;
  body: string;
  templateId?: string;
  variables?: Record<string, unknown>;
  attachments?: Array<{ filename: string; content: string; contentType: string }>;
  priority?: 'high' | 'normal' | 'low';
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;  // REQUIRED for SPEC-0016 deduplication
}

export interface SendResult {
  success: boolean;
  externalId?: string;
  error?: string;
  status: DeliveryStatusValue;
}
```

```prisma
// ─── NotificationDefinition ─────────────────────
model NotificationDefinition {
  id              String   @id @default(uuid())
  tenantId        String   @map("tenant_id")
  name            String
  category        String
  channels        String[] // ChannelType[]
  defaultPriority String   @default("normal") @map("default_priority")
  defaultSeverity String   @default("info") @map("default_severity")
  rules           Json?    // RoutingRule[]
  template        Json?    // NotificationTemplate
  isPublished     Boolean  @default(false) @map("is_published")
  version         Int      @default(1)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  instances NotificationInstance[]

  @@index([tenantId])
  @@index([tenantId, category])
  @@map("notification_definitions")
}

// ─── NotificationInstance ────────────────────────
model NotificationInstance {
  id                      String    @id @default(uuid())
  tenantId                String    @map("tenant_id")
  definitionId            String    @map("definition_id")
  userId                  String    @map("user_id")
  status                  String    @default("pending")
  channel                 String?   // ChannelType
  priority                String    @default("normal")
  severity                String    @default("info")
  content                 Json?
  contentSnapshot         Json?     @map("content_snapshot")  // resolved definition at creation time
  idempotencyKey          String?   @unique @map("idempotency_key")
  correlationId           String?   @map("correlation_id")
  scheduledAt             DateTime? @map("scheduled_at")
  expiresAt               DateTime? @map("expires_at")
  deliveredAt             DateTime? @map("delivered_at")
  readAt                  DateTime? @map("read_at")
  error                   String?
  preferencesLastCheckedAt DateTime? @map("preferences_last_checked_at")
  version                 Int       @default(1)
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt @map("updated_at")

  receipts NotificationReceipt[]
  definition NotificationDefinition @relation(fields: [definitionId], references: [id])

  @@index([tenantId, status])
  @@index([tenantId, userId, status])
  @@index([tenantId, correlationId])
  @@index([tenantId, scheduledAt])
  @@map("notification_instances")
}

// ─── NotificationPreference ──────────────────────
model NotificationPreference {
  id                String   @id @default(uuid())
  tenantId          String   @map("tenant_id")
  userId            String   @map("user_id")
  category          String?  // null = global default
  enabled           Boolean  @default(true)
  preferredChannels String[] @map("preferred_channels")
  quietHoursStart   String?  @map("quiet_hours_start")  // "22:00"
  quietHoursEnd     String?  @map("quiet_hours_end")    // "07:00"
  quietHoursTz      String?  @map("quiet_hours_timezone")
  digestFrequency   String   @default("never") @map("digest_frequency")
  timezone          String?
  language          String?  @default("en")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, userId, category])
  @@index([tenantId, userId])
  @@map("notification_preferences")
}

// Note: @@unique([tenantId, userId]) for global (category=null) preferences
// is enforced at application layer via upsert logic, not as a partial unique
// index, to avoid Prisma limitations with nullable column uniqueness.

// ─── NotificationBatch ──────────────────────────
model NotificationBatch {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  userId      String   @map("user_id")
  category    String?
  batchKey    String   @map("batch_key")  // "{tenantId}:{type}:{userId}" — tenantId prefix for isolation
  windowStart DateTime @map("window_start")
  windowEnd   DateTime @map("window_end")
  status      String   @default("open") // open | closed | scheduled | delivered
  createdAt   DateTime @default(now()) @map("created_at")
  closedAt    DateTime? @map("closed_at")

  @@index([tenantId, userId, status])
  @@index([batchKey])
  @@map("notification_batches")
}

// ─── NotificationReceipt ────────────────────────
model NotificationReceipt {
  id                String   @id @default(uuid())
  notificationId    String   @map("notification_id")
  tenantId          String   @map("tenant_id")
  channel           String   // ChannelType
  status            String   // delivered | failed | bounced | read
  providerMessageId String?  @map("provider_message_id")
  error             String?
  receivedAt        DateTime @default(now()) @map("received_at")

  notification NotificationInstance @relation(fields: [notificationId], references: [id])

  @@index([notificationId])
  @@index([tenantId, status])
  @@map("notification_receipts")
}

// Note: No onDelete: Cascade — receipts survive instance deletion by design.
// Retention policy: receipts kept for 1 year minimum, independent of instance lifecycle.

// ─── NotificationAudit ──────────────────────────
model NotificationAudit {
  id             String   @id @default(uuid())
  notificationId String   @map("notification_id")
  tenantId       String   @map("tenant_id")
  eventType      String   @map("event_type") // created | routed | queued | delivered | failed | cancelled | expired | read | batched
  data           Json?
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([notificationId])
  @@index([tenantId, createdAt(sort: Desc)])
  @@map("notification_audit")
}
```

---

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Add notification tables + migration | Bajo | `prisma migrate down` |
| 2 | Create shared contracts + types | Bajo | Revertir commit |
| 3 | Implement DefinitionService + CRUD | Bajo | Revertir commit |
| 4 | Implement RoutingEngine + PreferenceService | Medio | Desactivar workers. Notificaciones no enviadas se mantienen en DB. |
| 5 | Implement BatchingEngine + DeliveryOrchestrator | Medio | Notificaciones en batch pueden perderse si se revierte. |
| 6 | Wire CoreModule + guards | Bajo | Quitar del imports |

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿SPEC-0012 CommunicationProvider soporta `idempotencyKey`? | Resolved | No. Se añade `idempotencyKey?: string` a `SendMessageInput` como requisito cross-SPEC antes de la integración de delivery. |
| 2 | ¿Notificaciones críticas (seguridad, pago) bypassan quiet hours? | Resolved | Sí, con campo `bypassQuietHours: boolean` en la definición. |
| 3 | ¿Máximo de notificaciones por digest? | Resolved | Límite configurable, default 100. Si excede, dividir en sub-batches. |
| 4 | ¿Soporte para notificaciones recurrentes (recordatorios)? | Resolved | Campo `repeatInterval` en definición. El Scheduler crea nuevas instancias en el intervalo. |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Design refinement complete. All Architecture Review conditions applied.

---

## Related Artifacts

- [design.md](design.md)
- [tasks.md](tasks.md)
- [verify-report.md](verify-report.md)
- [archive-report.md](archive-report.md)
- [architecture-decisions.md](architecture-decisions.md)
- [pr-description.md](pr-description.md)

---

## Navigation

← — | [tasks.md](tasks.md) →
