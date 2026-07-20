# Tasks: SPEC-0012 — Communication Platform

> **Basado en:** Design APPROVED (8 architectural improvements incorporated)
> **SDD v2.1 — Enterprise Design Standard**
> **Platform Baseline:** sdd-v2.1-baseline
> **Fecha:** 2026-07-20

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1100–1500 |
| 400-line budget risk | **High** |
| Chained PRs recommended | **Yes** |
| Suggested split | PR1 Foundation → PR2 Core → PR3 Providers → PR4 Integration → PR5 Testing |
| Delivery strategy | `stacked-to-main` |

---

## Phase 1: Foundation — Schema, Shared Contracts, ADR

**Objetivo:** Crear la base de datos, los contratos compartidos de Communication
y el ADR-0008.

**Dependencias:** Ninguna.

**Riesgo:** Bajo. Cambios aditivos. No afectan módulos existentes.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 1.1 | ADR-0008: Communication Platform Architecture | `docs/architecture/adr/0008-communication-platform.md` | ADR creado documentando la arquitectura de canales, proveedores, delivery queue, DLQ, saneamiento y rate limiting | Documental |
| 1.2 | Add communication tables to Prisma schema | `packages/database/prisma/schema.prisma` | Modelos `MessageTemplate`, `MessageDelivery` con `dlq` flag. Unique en `messageId`. Indexes en `(tenantId, status)`, `(tenantId, createdAt)`. | Schema |
| 1.3 | Create CommunicationProvider interface | `packages/shared/src/communication/provider.interface.ts` | `CommunicationProvider` con `send()`, `verifyWebhookSignature()`, `channels`, `id` | Shared |
| 1.4 | Create CommunicationChannel interface | `packages/shared/src/communication/channel.interface.ts` | `CommunicationChannel` con `id`, `name`, `providerId`, `send()` | Shared |
| 1.5 | Create ProviderSelectionStrategy interface | `packages/shared/src/communication/provider-selection.ts` | `ProviderSelectionStrategy.select()`, `ChannelProviderConfig` | Shared |
| 1.6 | Create DeliveryQueue interface | `packages/shared/src/communication/delivery-queue.ts` | `DeliveryQueue` con `enqueue()` | Shared |
| 1.7 | Create SecureTemplateRenderer interface | `packages/shared/src/communication/template-renderer.ts` | `SecureTemplateRenderer`, `CompiledTemplate`, `allowedHelpers`, `allowedProperties` | Shared |
| 1.8 | Create ChannelOutputSanitizer interface | `packages/shared/src/communication/output-sanitizer.ts` | `ChannelOutputSanitizer` con `sanitize(channel, content)`, `validate()` | Shared |
| 1.9 | Create shared DTOs | `packages/shared/src/communication/dto.ts` | `SendMessageInput`, `SendResult`, `DeliveryStatus`, `DeliveryStatusValue`, `WebhookRequest`, `TemplateDefinition` | Shared |
| 1.10 | Create re-export | `packages/shared/src/communication/index.ts`, `packages/shared/src/index.ts` | Export all communication modules. `tsc --noEmit` passes. | Shared |

**Expected Commands:**
```bash
pnpm --filter database prisma validate
pnpm --filter shared tsc --noEmit
```

**Acceptance Criteria:**
- [ ] `prisma validate` pasa con los 2 nuevos modelos
- [ ] `tsc --noEmit` en `packages/shared` sin errores
- [ ] ADR-0008 creado
- [ ] Cada interfaz en su propio archivo (provider, channel, selection, queue, renderer, sanitizer)
- [ ] All 8 architectural improvements reflected in shared contracts

---

## Phase 2: Core Engine — Service, Registry, Pipeline, DLQ, Rate Limiting

**Objetivo:** Implementar el motor central de comunicaciones: `CommunicationService`,
`ProviderRegistry`, `ProviderSelectionStrategy`, `InMemoryDeliveryQueue`, pipeline
de entrega con reintentos, Dead Letter Queue, rate limiting y delivery tracking.

**Dependencias:** Phase 1 (shared contracts)

**Riesgo:** Medio. El pipeline debe manejar reintentos, DLQ, rate limiting por
(tenant, provider), y webhook callbacks con verificación de firma.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 2.1 | Implement ProviderRegistry | `apps/api/src/modules/communication/providers/provider-registry.ts` | `register(provider)`, `getProvider(id)`, `getProvidersByChannel(channel)` | Engine |
| 2.2 | Implement ChannelProviderConfigStore | `apps/api/src/modules/communication/providers/channel-provider-config-store.ts` | Interfaz `ChannelProviderConfigStore` con `getConfig(tenantId, channel)`. `DatabaseChannelProviderConfigStore` lee de `tenant.config`. ProviderSelectionStrategy depende solo de esta interfaz. | Engine |
| 2.3 | Implement ProviderSelectionStrategy | `apps/api/src/modules/communication/providers/provider-selection.ts` | `select(channel)`: retorna provider según primary/fallback/priority order. Config obtenida via `ChannelProviderConfigStore`. | Engine |
| 2.4 | Implement InMemoryDeliveryQueue | `apps/api/src/modules/communication/queue/in-memory-delivery-queue.ts` | Implementa `DeliveryQueue.enqueue()`. Ejecuta el pipeline inline. Log al enqueuear. | Engine |
| 2.5 | Implement DeliveryPipeline | `apps/api/src/modules/communication/delivery-pipeline.service.ts` | Pipeline completo: render → sanitize → rate limit → send → retry → record → DLQ | Engine |
| 2.6 | Implement RateLimiter | `apps/api/src/modules/communication/rate-limiter.ts` | Sliding window. Key = `(tenantId, providerId)`. Fallback a in-memory Map si Redis no está disponible. | Engine |
| 2.7 | Implement Dead Letter Queue | `apps/api/src/modules/communication/dlq.service.ts` | Marcar `dlq: true` en `message_deliveries`. Endpoints: `GET /api/v1/communications/dlq`, `POST /api/v1/communications/dlq/:id/replay` | Engine |
| 2.8 | Implement WebhookHandler | `apps/api/src/modules/communication/webhook-handler.ts` | Recibe POST en `POST /api/v1/communications/webhook/:providerId`. Resuelve el provider desde ProviderRegistry por `providerId`. Llama a `provider.verifyWebhookSignature()`. Si provider desconocido → 404. Si firma inválida → 401. Si válido → actualiza delivery status y publica `message.delivered`. | Engine |
| 2.9 | Implement CommunicationService | `apps/api/src/modules/communication/communication.service.ts` | `send()`: valida variables, enqueuea. `getStatus()`: consulta delivery. `cancel()`: marca cancelado. | Engine |
| 2.10 | Implement CommunicationModule | `apps/api/src/modules/communication/communication.module.ts` | Wire todos los providers del core engine | Wiring |

**Expected Commands:**
```bash
pnpm --filter api lint
pnpm turbo build --filter=api
```

**Acceptance Criteria:**
- [ ] ProviderRegistry register/get/getByChannel funcionan
- [ ] ProviderSelectionStrategy selecciona primary/fallback según prioridad
- [ ] InMemoryDeliveryQueue ejecuta pipeline
- [ ] DeliveryPipeline: render → sanitize → rate limit → send → retry → DLQ
- [ ] RateLimiter usa key `(tenantId, providerId)`
- [ ] DLQ marca mensajes como `dlq: true` cuando se agotan reintentos
- [ ] WebhookHandler verifica firma y 401 si inválida

---

## Phase 3: Providers — SMTP, SendGrid, Twilio, Webhook

**Objetivo:** Implementar los proveedores de comunicación concretos.

**Dependencias:** Phase 2 (ProviderRegistry, pipeline)

**Riesgo:** Medio. Cada provider tiene su propia API y mecanismo de firma de
webhooks. La abstracción `CommunicationProvider` debe aislar estas diferencias.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 3.1 | Implement SMTP provider | `apps/api/src/modules/communication/providers/smtp.provider.ts` | `CommunicationProvider`. Channel: `email`. Envío via `nodemailer`. `verifyWebhookSignature()`: no aplica (SMTP no tiene webhooks). | Provider |
| 3.2 | Implement SendGrid provider | `apps/api/src/modules/communication/providers/sendgrid.provider.ts` | `CommunicationProvider`. Channel: `email`. Envío via SendGrid API. `verifyWebhookSignature()`: HMAC-SHA256 con SendGrid signing key. | Provider |
| 3.3 | Implement Twilio SMS provider | `apps/api/src/modules/communication/providers/twilio-sms.provider.ts` | `CommunicationProvider`. Channel: `sms`. Envío via Twilio API. `verifyWebhookSignature()`: `X-Twilio-Signature` validation. | Provider |
| 3.4 | Implement Twilio WhatsApp provider | `apps/api/src/modules/communication/providers/twilio-whatsapp.provider.ts` | `CommunicationProvider`. Channel: `whatsapp`. Envío via Twilio WhatsApp API. `verifyWebhookSignature()`: `X-Twilio-Signature` validation. | Provider |
| 3.5 | Implement Webhook provider | `apps/api/src/modules/communication/providers/webhook.provider.ts` | `CommunicationProvider`. Channel: `webhook`. Envío via HTTP POST. `verifyWebhookSignature()`: HMAC con secreto configurable. | Provider |
| 3.6 | Register all providers in module | `apps/api/src/modules/communication/communication.module.ts` | Todos los providers registrados via DI en el módulo | Wiring |

**Expected Commands:**
```bash
pnpm --filter api lint
pnpm turbo build --filter=api
```

**Acceptance Criteria:**
- [ ] SMTP provider envía email (o mock)
- [ ] SendGrid provider implementa HMAC-SHA256 signature verification
- [ ] Twilio SMS provider implementa X-Twilio-Signature verification
- [ ] Twilio WhatsApp provider implementa X-Twilio-Signature verification
- [ ] Webhook provider implementa HMAC configurable
- [ ] Todos los providers registrados via DI
- [ ] Ningún provider depende de lógica de negocio del CommunicationModule

---

## Phase 4: Templates & Integration — Renderer, Sanitizers, CRUD, Controllers, Wiring

**Objetivo:** Implementar el sistema de plantillas seguro, los sanitizadores de
salida por canal, los controladores CRUD, event handlers, y la integración con
CoreModule.

**Dependencias:** Phase 2 (pipeline), Phase 3 (providers)

**Riesgo:** Medio. El SecureTemplateRenderer debe impedir acceso a prototipos
y variables globales. Los sanitizadores deben ser específicos por canal sin
acoplar el renderizador.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 4.1 | Implement SecureTemplateRenderer | `apps/api/src/modules/communication/templates/secure-template-renderer.ts` | Handlebars.compile con `allowedProperties` list. Sin acceso a `lookupProperty`, `prototype`, `__proto__`. Helpers registrados explícitamente. | Templates |
| 4.2 | Implement variable validation | `apps/api/src/modules/communication/templates/variable-validator.ts` | Valida que todas las variables en `TemplateDefinition.variables` están presentes en el mensaje. Error si falta alguna. | Templates |
| 4.3 | Implement EmailSanitizer | `apps/api/src/modules/communication/sanitizers/email-sanitizer.ts` | Elimina `<script>`, `on*` event handlers, `javascript:` URLs. Permite HTML básico (p, a, strong, em, ul, ol, li). | Sanitizer |
| 4.4 | Implement SmsSanitizer | `apps/api/src/modules/communication/sanitizers/sms-sanitizer.ts` | Elimina todo HTML. Limita longitud a 160 caracteres (concatenar para SMS largos). | Sanitizer |
| 4.5 | Implement WhatsappSanitizer | `apps/api/src/modules/communication/sanitizers/whatsapp-sanitizer.ts` | Permite subset de markdown (*bold*, _italic_, ~strikethrough~, ```code```). Elimina HTML. | Sanitizer |
| 4.6 | Implement CommunicationController | `apps/api/src/modules/communication/communication.controller.ts` | CRUD de templates: `POST/GET/PATCH/DELETE /api/v1/communications/templates`. Envío: `POST /api/v1/communications/send`. Historial: `GET /api/v1/communications/deliveries`. DLQ: `GET /api/v1/communications/dlq`, `POST /api/v1/communications/dlq/:id/replay`. Webhook receiver: `POST /api/v1/communications/webhook`. | Controller |
| 4.7 | Implement DTOs | `apps/api/src/modules/communication/dto.ts` | `SendMessageSchema`, `CreateTemplateSchema`, `UpdateTemplateSchema`, `TemplateListQuery`, `DeliveryQuery`. Validación Zod. | DTO |
| 4.8 | Implement event handlers | `apps/api/src/modules/communication/communication.event-handlers.ts` | Escucha eventos de dominio que requieren comunicación (opcional en v1). | Events |
| 4.9 | Wire CommunicationModule in CoreModule | `apps/api/src/modules/core/core.module.ts` | Import `CommunicationModule` | Wiring |

**Expected Commands:**
```bash
pnpm --filter api lint
pnpm turbo build --filter=api
```

**Acceptance Criteria:**
- [ ] SecureTemplateRenderer rechaza templates con acceso a `prototype`
- [ ] Variable validator rechaza envío si faltan variables requeridas
- [ ] EmailSanitizer elimina `<script>` y permite HTML básico
- [ ] SmsSanitizer elimina todo HTML
- [ ] WhatsappSanitizer permite markdown subset
- [ ] CRUD de templates funcional con validación Zod
- [ ] Webhook receiver verifica firma antes de actualizar delivery
- [ ] DLQ replay resetea intentos y marca dlq=false

---

## Phase 5: Testing — Unit, Integration, Doorbell

**Objetivo:** Completar la cobertura de tests.

**Dependencias:** Phases 1–4

**Riesgo:** Medio. Los doorbell tests requieren base de datos real.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 5.1 | Provider registry tests | `apps/api/src/modules/communication/providers/provider-registry.spec.ts` | register/get/getByChannel con providers mock | Testing |
| 5.2 | Provider selection tests | `apps/api/src/modules/communication/providers/provider-selection.spec.ts` | Primary selected. Fallback on failure. Priority order. | Testing |
| 5.3 | DeliveryQueue tests | `apps/api/src/modules/communication/queue/delivery-queue.spec.ts` | Enqueue ejecuta pipeline. Múltiples mensajes en orden. | Testing |
| 5.4 | DeliveryPipeline tests | `apps/api/src/modules/communication/delivery-pipeline.spec.ts` | Render → sanitize → rate limit → send. Retry with backoff. DLQ after exhausted retries. | Testing |
| 5.5 | Rate limiter tests | `apps/api/src/modules/communication/rate-limiter.spec.ts` | Allows under limit. Blocks over limit. Resets after window. Key = (tenantId, providerId). | Testing |
| 5.6 | DLQ tests | `apps/api/src/modules/communication/dlq.service.spec.ts` | Mark dlq. List dlq. Replay resets attempts. | Testing |
| 5.7 | WebhookHandler tests | `apps/api/src/modules/communication/webhook-handler.spec.ts` | Provider resolution by providerId. Valid HMAC passes. Invalid HMAC → 401. Unknown provider → 404. | Testing |
| 5.7b | Provider signature validation tests | `apps/api/src/modules/communication/providers/__tests__/signature-validation.spec.ts` | Por cada provider (SendGrid, Twilio SMS, Twilio WhatsApp, Webhook): valid signature → true, invalid signature → false, malformed request → false. | Testing |
| 5.8 | Template renderer tests | `apps/api/src/modules/communication/templates/secure-template-renderer.spec.ts` | Renders variables. Rejects prototype access. Only allowed helpers. | Testing |
| 5.9 | Variable validation tests | `apps/api/src/modules/communication/templates/variable-validator.spec.ts` | Missing vars → error. All vars present → pass. Unknown vars → warning. | Testing |
| 5.10 | Sanitizer tests | `apps/api/src/modules/communication/sanitizers/*.spec.ts` | Email: strips script, keeps safe HTML. SMS: strips all HTML. WhatsApp: keeps markdown. | Testing |
| 5.11 | Controller integration tests | `apps/api/test/integration/communication.spec.ts` | CRUD templates. Send message. Query deliveries. DLQ list + replay. | Testing |
| 5.12 | Doorbell — cross-tenant isolation | `apps/api/test/doorbell/communication-cross-tenant-isolation.spec.ts` | Tenant A messages no visibles para Tenant B | Testing |
| 5.13 | Doorbell — webhook isolation | `apps/api/test/doorbell/communication-cross-tenant-webhook.spec.ts` | Webhook de Tenant A no actualiza deliveries de Tenant B | Testing |

**Expected Commands:**
```bash
pnpm --filter api test communication
pnpm --filter api lint
pnpm turbo build --filter=api
```

**Acceptance Criteria:**
- [ ] Provider registry: register/get/getByChannel tested
- [ ] Provider selection: primary, fallback, priority tested
- [ ] DeliveryQueue: enqueue + pipeline execution tested
- [ ] Pipeline: render → sanitize → rate limit → send → DLQ tested
- [ ] Rate limiter: per-(tenant, provider) key tested
- [ ] DLQ: mark, list, replay tested
- [ ] Signature validation: valid HMAC passes, invalid → 401
- [ ] Template renderer: renders, rejects prototype access
- [ ] Variable validation: missing vars rejected
- [ ] Sanitizers: channel-specific behavior tested
- [ ] Controller: CRUD + send + history tested via supertest
- [ ] Doorbell: cross-tenant isolation tested

---

## Verify Readiness

### What Verify will check

| Area | Check |
|------|-------|
| **Working Set Accuracy** | ¿Todos los archivos del Working Set se crearon/modificaron? |
| **Architecture Compliance** | `CommunicationService` depende de interfaces, no de providers concretos |
| **Webhook Security** | `verifyWebhookSignature()` implementado en cada provider |
| **Provider Selection** | Primary/fallback funciona correctamente |
| **DLQ** | Mensajes con retries exhaustos van a DLQ |
| **Rate Limiting** | Key = (tenantId, providerId), no global |
| **Template Security** | Sin acceso a prototipos, variables validadas |
| **Sanitization** | Cada canal sanitiza según su medio |

### Metrics for Archive

| Metric | Source |
|--------|--------|
| Working Set Accuracy | Design → Apply comparison |
| Verify Iterations | Number of Verify/Fix cycles |
| Verify Discoveries | Issues found during Verify |
| Prediction Accuracy | Files, tests, commands, dependencies |

---

## Resumen

| Métrica | Valor |
|---------|-------|
| **Fases** | 5 |
| **Tareas totales** | 42 |
| **Distribución** | Shared: 10 / Core: 9 / Providers: 6 / Integration: 9 / Testing: 13 |
| **Riesgo principal** | Webhook signature verification específica por provider (SendGrid HMAC ≠ Twilio) |
| **Riesgo secundario** | Handlebars sandbox debe bloquear prototype access sin romper templates legítimos |
| **Design respetado** | ✅ Íntegramente. Las 8 mejoras arquitectónicas incluidas. |
