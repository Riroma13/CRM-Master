# Design: SPEC-0012 — Communication Platform

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Platform Baseline:** sdd-v2.1-baseline
> **Estado:** Draft

---

## 1. Executive Summary

CRM-Master carece de un sistema de comunicaciones unificado. Actualmente cada
canal (email, WhatsApp, SMS, notificaciones) se implementa de forma ad-hoc en
distintos módulos, con lógica duplicada de plantillas, reintentos, y gestión
de proveedores. No existe un historial centralizado de comunicaciones enviadas,
ni una abstracción común que permita al Automation Hub o al sistema de Activity
Timeline disparar comunicaciones sin conocer el proveedor concreto.

**Communication Platform** implementa un sistema de comunicaciones unificado con
una abstracción `CommunicationProvider`, un `ProviderRegistry` para registro de
proveedores, y un `DeliveryPipeline` con políticas de reintento, rate limiting,
y seguimiento de estado. La arquitectura sigue el patrón **Channel Abstraction →
ProviderRegistry → Delivery Pipeline**, donde los canales (email, WhatsApp, SMS,
push, notificaciones internas, webhooks) son registrables sin modificar el motor.

El impacto esperado es eliminar la lógica de comunicaciones dispersa, proporcionar
un historial único de mensajes con trazabilidad completa, y permitir que el
Automation Hub (SPEC-0011) y futuros módulos envíen comunicaciones sin conocer
el proveedor concreto.

---

## 2. Technical Approach

El sistema se compone de nueve capas:

1. **Channel Abstraction** — interfaz `CommunicationChannel` que define el
   contrato para cada canal: `send(message)`, `getStatus(deliveryId)`, `cancel(deliveryId)`.
   Cada canal representa un medio de comunicación (email, WhatsApp, SMS, etc.)
   y es independiente del proveedor concreto.

2. **Provider Selection Strategy** — abstracción que selecciona el proveedor
   para un canal según prioridad. Soporta primary, fallback y orden de prioridad.
   `ProviderSelectionStrategy` permite que un canal tenga múltiples proveedores
   sin cambiar la lógica de envío.

3. **ProviderRegistry** — registro de proveedores de comunicación. Cada
   proveedor implementa uno o más canales. Ejemplo: `TwilioProvider` implementa
   los canales `whatsapp` y `sms`. `SendGridProvider` implementa `email`.
   Los proveedores se registran mediante inyección de dependencias.
   Cada proveedor declara `verifyWebhookSignature(request)` para validar
   callbacks entrantes sin que el módulo conozca el mecanismo específico.

4. **Message Templates** — sistema de plantillas de mensajes. Las plantillas
   usan sintaxis `{{variable}}` y se renderizan antes del envío mediante un
   `TemplateRenderer` seguro que no permite acceso a prototipos ni variables
   globales. Las variables requeridas se validan antes de renderizar.

5. **ChannelOutputSanitizer** — cada canal sanitiza su salida de forma
   independiente: `EmailSanitizer`, `SmsSanitizer`, `WhatsappSanitizer`.
   El renderizador produce contenido; el sanitizador lo valida por canal.

6. **Delivery Queue** — cola de entregas que desacopla el `CommunicationService`
   de la ejecución del pipeline. Implementación inicial: `InMemoryDeliveryQueue`.
   Futura: `BullMQDeliveryQueue`. El pipeline depende solo de `DeliveryQueue`.

7. **Delivery Pipeline** — orquestador que recibe un mensaje de la cola,
   selecciona el canal y proveedor, renderiza la plantilla, aplica rate limiting
   por (tenant, provider), ejecuta el envío con política de reintentos, y registra
   el resultado en el historial. Los mensajes que agotan reintentos van a Dead
   Letter Queue (`delivery_dlq`) para inspección administrativa.

8. **Message History** — tabla `message_deliveries` que registra cada envío
   con estado, proveedor, canal, intentos, errores y metadatos.

9. **Automation Integration** — `SendEmailAction`, `SendWhatsAppAction` y
   `SendSMSAction` existentes en SPEC-0011 se integran via CommunicationPlatform,
   eliminando la necesidad de que el Automation Hub conozca proveedores concretos.

```
[Automation Hub / Domain Events] ──► [CommunicationService]
                                           │
                                    [DeliveryPipeline]
                                           │
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                      [Channel: email]  [Ch: sms]  [Ch: whatsapp]
                              │            │            │
                      [SendGrid]      [Twilio]      [Twilio/Meta]
                              │            │            │
                              └────────────┼────────────┘
                                           ▼
                                  [Message History]
                                  (delivery status + audit)
```

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Channel model | Interfaz única por canal, Interfaz genérica con type discriminator, Proveedor directo | **Interfaz `CommunicationChannel` por canal** | Cada canal tiene requisitos distintos (email necesita adjuntos, SMS necesita origen). Type-safe, extensible. |
| Provider model | Un proveedor = un canal, Un proveedor = múltiples canales | **Un proveedor = múltiples canales** | Twilio cubre WhatsApp + SMS. SendGrid cubre email. Reduce duplicación de registro. |
| Template engine | Handlebars, Mustache, EJS, Liquid | **Handlebars** | Seguro (sin evaluación de código), ampliamente usado, fácil de sandbox. |
| Template storage | Tabla `message_templates`, Archivos en disco, Git | **Tabla `message_templates`** | Scoped por tenant, versionable, consultable via API. |
| Rate limiting | Token bucket, Sliding window, Fixed window | **Sliding window (Redis)** | Preciso, justo, evita ráfagas. Redis como store compartido (ya es dependencia del proyecto via BullMQ). |
| Retry strategy | Exponential backoff, Fixed delay, Dead letter queue | **Exponential backoff + Dead letter queue** | Misma estrategia que SPEC-0011. Estándar para comunicaciones. |
| Delivery tracking | Síncrono (respuesta del provider), Webhook callback, Polling | **Webhook callback asíncrono** | Los providers de email/WhatsApp envían webhooks con estado de entrega. El pipeline actualiza el historial. |
| Message history | Tabla única, Tabla por canal, Almacenamiento externo | **Tabla `message_deliveries` unificada** | Trazabilidad cross-canal. Consultas simples. Partición mensual para volumen. |
| SecretStore integration | Lectura directa, Cache en memoria, Inyección en provider init | **Inyección en provider init** | Cada provider recibe sus credenciales al inicializarse. Sin lectura en caliente por mensaje. |
| Provider selection | Un proveedor por canal, Múltiples proveedores con primary/fallback, Round-robin | **ProviderSelectionStrategy con primary + fallback** | Permite tener SendGrid como primary y Resend como fallback. Sin cambios en CommunicationService. |
| Webhook validation | Validación centralizada en el módulo, Validación delegada a cada provider | **Delegada a cada provider** | Cada `CommunicationProvider` implementa `verifyWebhookSignature(request)`. El módulo nunca valida firmas de proveedores específicos. |
| Delivery queue | Síncrono (en línea), Fila en memoria, BullMQ | **InMemoryDeliveryQueue (v1) + `DeliveryQueue` interfaz** | Desacopla el envío de la respuesta HTTP. BullMQ se añade sin cambiar el pipeline. |
| Dead Letter Queue | Tabla `delivery_dlq`, Flag dlq en message_deliveries, Logging | **Tabla `message_deliveries` con flag `dlq`** | Los mensajes que agotan reintentos persisten con `dlq: true`. Visibles via `GET /api/v1/communications/dlq`. Replay via `POST /api/v1/communications/dlq/:id/replay`. |
| Template rendering | Handlebars directo, Sandbox seguro, Sin sandbox | **SecureTemplateRenderer con allowedProperties + allowedHelpers** | Sin acceso a prototipos, sin `lookupProperty`, sin variables globales. Los helpers permitidos se registran explícitamente. |
| Output sanitization | Sin sanitización, Sanitización genérica, Sanitización por canal | **ChannelOutputSanitizer por canal** | EmailSanitizer limpia HTML peligroso. SmsSanitizer elimina todo HTML. WhatsappSanitizer permite markdown subset. |
| Rate limiting key | Global por provider, Por tenant, Por (tenant, provider) | **Rate limit key = (tenantId, providerId)** | Previene noisy neighbour. Un tenant no puede agotar el rate limit de otro. |

---

## 4. Data Flow

```
1. Automation Hub / Domain event triggers communication
        │
        ▼
2. CommunicationService.send(channel, message)
        │
        ├── Resolve channel (email, whatsapp, sms, etc.)
        ├── Resolve provider via ProviderSelectionStrategy (primary / fallback)
        ├── Validate required template variables (fail early if missing)
        │
        ▼
3. DeliveryQueue.enqueue(message)
        │
        ├── InMemoryDeliveryQueue.deliver(message)  [v1]
        │   │
        │   ▼
        └── 3a. Load & render template (if templateId provided)
        │     ├── Read template from message_templates
        │     ├── Validate required variables (all present, no unknowns)
        │     ├── SecureTemplateRenderer.render(template, variables)
        │     │   └── Handlebars.compile (sandbox: allowedProperties only)
        │     │   └── No prototype access, no global lookup
        │     └── ChannelOutputSanitizer.sanitize(channel, rendered)
        │         ├── EmailSanitizer → strip <script>, allow basic HTML
        │         ├── SmsSanitizer → strip all HTML
        │         └── WhatsappSanitizer → allow markdown subset
        │
        ├── 3b. Rate limit check (per tenant + provider)
        │     ├── Key: (tenantId, providerId)
        │     ├── Sliding window via Redis
        │     └── If exceeded → QUEUED (retry when window opens)
        │
        ├── 3c. Create delivery record (PENDING)
        │     ├── deliveryId (UUID)
        │     ├── tenantId, channel, provider, to, subject/body
        │     └── Save to message_deliveries
        │
        ├── 3d. Send via provider
        │     ├── channel.send(message) → deliveryId (external)
        │     ├── On success → mark SENT
        │     ├── On retryable failure → retry (exponential backoff, max 3)
        │     ├── On non-retryable failure → mark FAILED
        │     └── On retries exhausted → mark FAILED + dlq=true
        │
        ├── 3e. Webhook callback (async)
        │     ├── Provider sends delivery webhook → POST /api/v1/communications/webhook
        │     ├── provider.verifyWebhookSignature(request) → valida HMAC
        │     ├── If invalid → 401 (reject)
        │     ├── If valid → update delivery status
        │     └── Publish 'message.delivered' event
        │
        └── 3f. Register in Message History
              ├── Store full delivery record
              └── ActivityTimeline.publish('comunicacion.enviada')

[Dead Letter Queue flow]
Messages with dlq=true → visible via GET /api/v1/communications/dlq
                       → replay via POST /api/v1/communications/dlq/:id/replay
                       → Archived after 30 days

[Future] BullMQDeliveryQueue.enqueue(message)  [v2]
         └── Worker picks up → executes pipeline
```

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add `MessageTemplate`, `MessageDelivery` models |
| 2 | `packages/shared/src/communication/channel.interface.ts` | Create | `CommunicationChannel` interface |
| 3 | `packages/shared/src/communication/template.types.ts` | Create | Template types, render input/output |
| 4 | `packages/shared/src/communication/delivery.types.ts` | Create | Delivery status, history types |
| 5 | `packages/shared/src/communication/index.ts` | Create | Re-export |
| 6 | `apps/api/src/modules/communication/communication.module.ts` | Create | NestJS module |
| 7 | `apps/api/src/modules/communication/communication.service.ts` | Create | `send()`, `getStatus()`, `cancel()` |
| 8 | `apps/api/src/modules/communication/delivery-pipeline.service.ts` | Create | Pipeline: render → rate limit → send → retry → record |
| 9 | `apps/api/src/modules/communication/dto.ts` | Create | Send message DTOs, filter schemas |
| 10 | `apps/api/src/modules/communication/providers/provider-registry.ts` | Create | Registry de proveedores de comunicación |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 11 | `apps/api/src/modules/communication/templates/template-renderer.ts` | Create | Handlebars renderer |
| 12 | `apps/api/src/modules/communication/providers/sendgrid.provider.ts` | Create | Email provider (SMTP/Resend/SendGrid abstraction) |
| 13 | `apps/api/src/modules/communication/providers/twilio.provider.ts` | Create | WhatsApp + SMS provider |
| 14 | `apps/api/src/modules/core/core.module.ts` | Modify | Import `CommunicationModule` |

### 5.3 Expected NOT to Change

- `app.module.ts` — pasa por `CoreModule`
- `AutomationModule` — se integra via CommunicationService, sin cambios
- Existing notification modules — la plataforma las reemplaza progresivamente
- Existing webhook logic — se integra via webhook channel

---

## 6. Read Order

1. `docs/templates/design-enterprise-template.md` — recordar estructura
2. `packages/shared/src/automation/ai-provider.ts` — patrón de abstracción (ej: AiProvider)
3. `packages/database/prisma/schema.prisma` — naming y modelos existentes
4. `packages/shared/src/communication/channel.interface.ts` — definir contrato
5. `packages/shared/src/communication/template.types.ts` — definir plantillas
6. `apps/api/src/modules/communication/delivery-pipeline.service.ts` — core
7. `apps/api/src/modules/communication/providers/provider-registry.ts` — registro
8. `apps/api/src/modules/communication/providers/sendgrid.provider.ts` — ejemplo

---

## 7. Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_communication_tables
pnpm --filter database generate
pnpm --filter api lint
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** High

El patrón Provider Selection → DeliveryQueue → DeliveryPipeline → DLQ es una
evolución directa del patrón AutomationDispatcher implementado en SPEC-0011.
Las 8 mejoras arquitectónicas (webhook validation, provider selection, delivery
queue, DLQ, secure templates, output sanitization, variable validation, rate
limiting por tenant) están todas diseñadas siguiendo el mismo patrón de
abstracciones que SPEC-0011 validó. La incertidumbre principal es la
integración con webhooks de delivery tracking (depende del provider externo).

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 4 | Patrones de provider registry, SPEC-0011 reference |
| Files to read | 8 | Schema, shared patterns, existing communication code |
| Files to create | 12 | Channel interface, pipeline, providers, templates, registry |
| Files to modify | 2 | schema.prisma, core.module.ts |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Webhook delivery tracking no implementado por el provider | Media | Alto | Fallback a polling + timeout. El delivery se marca como SENT si no hay webhook en 24h. |
| Webhook signature falsificada | Baja | Alto | Cada `CommunicationProvider.verifyWebhookSignature()` valida HMAC. Peticiones inválidas → 401. |
| Rate limiting entre proveedores (SendGrid + Twilio en paralelo) | Media | Medio | Sliding window independiente por (tenantId, providerId). Noisy neighbour mitigado. |
| Plantillas con errores de sintaxis rompen el envío | Baja | Alto | Validación de template antes de guardar. Variables requeridas validadas antes de renderizar. Preview en API. |
| SecretStore sin credenciales configuradas | Baja | Alto | Provider se inicializa sin credenciales → error en init, no en send. Rate limit no se activa sin provider configurado. |
| Dead Letter Queue sin supervisión | Baja | Medio | DLQ consultable via API. Alerta si un delivery permanece en DLQ >24h (v2). |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Channel interface | `send()`, `getStatus()`, `cancel()` con mock provider | Jest |
| Unit — Pipeline | Render → rate limit → send → retry → record | Jest + mocked provider |
| Unit — Templates | Handlebars render, variable injection, missing vars | Jest |
| Integration — API | Envío via REST endpoint, status query | supertest |
| Doorbell | Tenant A messages no visibles para Tenant B | E2E |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `communication-cross-tenant-isolation.spec.ts` | Tenant A no puede ver mensajes de Tenant B |
| `communication-cross-tenant-webhook.spec.ts` | Webhook callback de Tenant A no actualiza mensajes de Tenant B |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0008 | Documentar la arquitectura de Communication Platform, el modelo de canales, el sistema de plantillas y la integración con SPEC-0011. | Proposed |

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `CommunicationChannel` interface | CommunicationModule | Contrato que todo canal debe implementar |
| `ProviderRegistry` | CommunicationModule | Registro de proveedores de comunicación |
| `DeliveryPipeline` | CommunicationModule | Orquestador de envío con reintentos y rate limiting |
| `MessageTemplate` (tabla) | CommunicationModule | Almacenamiento de plantillas por tenant |
| `MessageDelivery` (tabla) | CommunicationModule | Historial de entregas |
| Communication actions (SPEC-0011) | AutomationModule | Dependen de `CommunicationService`, no de proveedores concretos |

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| New channel (Discord) | Implementar `CommunicationChannel` + registrar provider | Hours |
| New provider (Resend) | Implementar `CommunicationProvider` + registrar en registry | Hours |
| BullMQ delivery queue | Implementar `BullMQDeliveryQueue`. Pipeline no cambia. | Days |
| Template versioning | Añadir campo `version` a `message_templates` | Days |
| Bulk sending | Pipeline acepta array de destinatarios, paraleliza por provider | Days |
| Delivery dashboard | UI que consume `GET /api/v1/communications/deliveries` | Weeks |
| Automation integration | `SendEmailAction` de SPEC-0011 usa CommunicationService | Days |

---

## Architecture Review (MANDATORY)

### A. Scalability

| Factor | 10× (1K msgs/day) | 100× (10K msgs/day) | Mitigation |
|--------|------------------|---------------------|------------|
| API throughput | <10ms per send | <50ms per send | Async pipeline. Rate limiting evita saturación. |
| Message history | <1M rows | <10M rows | Partición mensual. Archive >90 días. |
| Template rendering | <5ms per render | <5ms (cacheable) | Handlebars.compile cache por templateId. |
| Webhook processing | <5ms per callback | <20ms | Idempotency key por webhook. |

**Decision:** El pipeline escala linealmente. Rate limiting por provider y canal
previene saturaciones. La tabla `message_deliveries` se particiona por mes.

### B. Open/Closed Principle (OCP)

**Point of extension:** `ProviderRegistry` + `CommunicationChannel` interface.

**What must change to add one new channel:** Implementar `CommunicationChannel`
+ registrar provider en el módulo. Cero cambios en el pipeline.

**What must change to add one new provider:** Implementar provider con los
canales que soporta + registrar en `ProviderRegistry`. Cero cambios en los
canales existentes.

**Decision:** OCP cumplido. El pipeline no conoce canales ni proveedores
concretos.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| `communication_channel` interface | CommunicationModule | Pipeline, providers |
| `ProviderRegistry` | CommunicationModule | Pipeline, Automation Hub (via DI) |
| `message_templates` | CommunicationModule | Pipeline, Tenant admin (CRUD) |
| `message_deliveries` | CommunicationModule | Pipeline (writes), Tenant admin (reads) |
| Communication actions | AutomationModule | Dependen de CommunicationService |

**Decision:** CommunicationModule es el único propietario de canales,
proveedores, plantillas e historial de mensajes.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| message_templates | Indefinido | No aplica | Desactivar en lugar de borrar |
| message_deliveries | 90 días online | Partición mensual | Eliminar >90 días via job |
| delivery webhooks | 30 días | No aplica | Eliminar después de actualizar delivery status |

**Decision:** Las entregas se archivan después de 90 días. Los webhooks se
descartan después de actualizar el estado de entrega.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
|-----------|---------------|------------|----------|
| `send()` | Alta (retry del pipeline, UI double-click) | `messageId` UUID único | `ON CONFLICT (message_id) DO NOTHING` |
| Webhook callback | Media (provider puede retry el webhook) | `webhookId` + `deliveryId` unique | Verificar delivery status antes de actualizar |
| Template save | Baja | Unique name + tenantId | Error de duplicado |

**Decision:** Cada mensaje tiene un `messageId` UUID. La tabla usa
`ON CONFLICT DO NOTHING`. Webhooks duplicados no actualizan el estado dos veces.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
|----------|----------|-----------|-----------|
| `CommunicationChannel` | `packages/shared/src/communication/` | Pipeline | Providers |
| `SendMessageInput` | `packages/shared/src/communication/` | Pipeline, Controller, Automation Hub | — |
| `DeliveryStatus` | `packages/shared/src/communication/` | Pipeline, Controller, Webhook handler | — |
| `TemplateDefinition` | `packages/shared/src/communication/` | Pipeline, Template CRUD | — |

**Decision:** Contratos compartidos en `packages/shared/src/communication/`.
Misma estrategia que SPEC-0010 y SPEC-0011.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
|-----------|------|----------|
| Tenant | Bajo | `tenant_id` indexado. No requiere partición. |
| Time | Medio (message_deliveries crece rápido) | Partición mensual. Cleanup >90 días. |

**Decision:** `message_deliveries` se particiona por mes (misma estrategia que
ActivityTimeline). `message_templates` no requiere partición.

---

## 16. Interfaces / Contracts

```typescript
// ─── packages/shared/src/communication/ ──────────────────

export interface CommunicationProvider {
  readonly id: string;             // 'sendgrid' | 'twilio' | 'resend' | ...
  readonly name: string;
  readonly channels: string[];     // channels this provider implements
  send(channel: string, message: SendMessageInput): Promise<SendResult>;
  verifyWebhookSignature(request: WebhookRequest): boolean;
}

export interface CommunicationChannel {
  readonly id: string;
  readonly name: string;
  readonly providerId: string;
  send?(message: SendMessageInput): Promise<SendResult>;
}

export interface WebhookRequest {
  headers: Record<string, string>;
  body: unknown;
  rawBody?: string;
}

// ─── Provider Selection ────────────────────────────────

export interface ProviderSelectionStrategy {
  select(channel: string, tenantId: string): Promise<CommunicationProvider>;
}

export interface ChannelProviderConfig {
  channelId: string;
  providers: Array<{ providerId: string; priority: number }>;
}

// ─── Delivery Queue ────────────────────────────────────

export interface DeliveryQueue {
  enqueue(message: SendMessageInput): Promise<void>;
}

// ─── Template ──────────────────────────────────────────

export interface TemplateRenderer {
  compile(template: string): CompiledTemplate;
  render(compiled: CompiledTemplate, variables: Record<string, unknown>): string;
}

export interface CompiledTemplate {
  // opaque handle for cached template
}

export interface SecureTemplateRenderer extends TemplateRenderer {
  readonly allowedHelpers: string[];
  readonly allowedProperties: string[];
}

// ─── Output Sanitizer ──────────────────────────────────

export interface ChannelOutputSanitizer {
  sanitize(channel: string, content: string): string;
  validate(channel: string, content: string): boolean;
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
}

export interface SendResult {
  success: boolean;
  externalId?: string;          // provider's delivery ID
  error?: string;
  status: DeliveryStatusValue;
}

export type DeliveryStatusValue =
  | 'PENDING' | 'QUEUED' | 'SENT' | 'DELIVERED'
  | 'BOUNCED' | 'FAILED' | 'CLICKED' | 'OPENED';

export interface DeliveryStatus {
  deliveryId: string;
  status: DeliveryStatusValue;
  attempts: number;
  lastAttemptAt?: string;
  error?: string;
  webhookReceivedAt?: string;
  updatedAt: string;
}

export interface TemplateDefinition {
  id: string;
  tenantId: string;
  name: string;
  channel: string;
  subject?: string;              // email subject (with {{variables}})
  body: string;                  // Handlebars template
  variables: string[];           // expected variable names
  isActive: boolean;
}
```

```prisma
model MessageTemplate {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  name      String
  channel   String   // 'email' | 'whatsapp' | 'sms' | 'push' | 'internal' | 'webhook'
  subject   String?  // email subject (with {{variables}})
  body      String   // Handlebars template
  variables String[] // expected variable names
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, name])
  @@map("message_templates")
}

model MessageDelivery {
  id            String   @id @default(uuid())
  messageId     String   @map("message_id")
  tenantId      String   @map("tenant_id")
  channel       String
  provider      String
  to            String[]
  subject       String?
  body          String?
  templateId    String?  @map("template_id")
  status        String   @default("pending")
  attempts      Int      @default(1)
  maxAttempts   Int      @default(3)
  externalId    String?  @map("external_id")
  error         String?
  webhookData   Json?    @map("webhook_data")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@unique([messageId])
  @@index([tenantId, status])
  @@index([tenantId, createdAt(sort: Desc)])
  @@map("message_deliveries")
}
```

---

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Add `message_templates`, `message_deliveries` tables | Bajo | `prisma migrate down` |
| 2 | Create `CommunicationModule` + shared contracts | Bajo | Revertir commit |
| 3 | Implement DeliveryPipeline con rate limiting + retry | Medio | Desactivar pipeline, volver a envío directo |
| 4 | Implement SendGrid + Twilio providers | Bajo | Desregistrar del módulo |
| 5 | Integrar con Automation Hub (sustituir acciones directas) | Medio | Cada acción se migra individualmente |

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿Handlebars vs Liquid para plantillas? | **Resolved** | Handlebars con sandbox (`SecureTemplateRenderer`). Sin acceso a prototipos. |
| 2 | ¿Redis obligatorio para rate limiting? | Open | Recomendación: Redis si está disponible. Fallback a in-memory Map (sin precisión entre instancias). |
| 3 | ¿Soporte para attachments en todos los canales? | Open | Recomendación: solo email en v1. WhatsApp soporta archivos vía Media API. SMS no soporta. |
| 4 | ¿Provider selection strategy: cómo se configura? | **Resolved** | `ChannelProviderConfig` por tenant en `tenant.config`. Primary + fallback + priority. |
| 5 | ¿DLQ replay: resetear intentos o mantener contador? | **Resolved** | Resetear `attempts` a 0 y `dlq` a false. El webhook callback actualiza normalmente. |
| 6 | ¿Webhook signature verification: cómo se implementa por provider? | **Resolved** | Cada provider implementa `verifyWebhookSignature()`. SendGrid usa HMAC-SHA256. Twilio usa `X-Twilio-Signature`. |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Listo para pasar a Tasks.
