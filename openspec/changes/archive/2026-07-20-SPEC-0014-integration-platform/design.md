# Design: SPEC-0014 — Integration Platform

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Platform Baseline:** sdd-v2.1-baseline
> **Estado:** Draft

---

## 1. Executive Summary

CRM-Master carece de un sistema unificado para integrarse con servicios
externos. Cada conexión con APIs de terceros (Google Calendar, SendGrid,
Twilio, OpenAI, etc.) se implementa ad-hoc sin un patrón común de
autenticación, reintentos, rate limiting ni monitorización. No existe un
registro de qué integraciones están activas, cuándo fallaron, ni cómo
recuperarlas.

**Integration Platform** implementa un sistema de conectores externos con
abstracción de autenticación (OAuth, API Key), webhooks (entrantes y
salientes), motor de reintentos, scheduler de tareas periódicas, y
registro centralizado de ejecuciones. La integración con SecretStore
(SPEC-0011), CommunicationPlatform (SPEC-0012), AutomationHub (SPEC-0011),
ActivityTimeline (SPEC-0009) y SearchModule (SPEC-0010) se realiza mediante
contratos compartidos y eventos.

---

## 2. Technical Approach

El sistema se compone de siete capas:

1. **Connector abstraction** — interfaz `Connector` que define
   `execute(operation, input)`, `getAuthStatus()`, `refreshAuth()`.
   Cada conector envuelve una API externa (Google, OpenAI, etc.) y
   gestiona su propia autenticación mediante OAuth o API Key. Antes de
   cada `execute()`, el conector verifica proactiveamente el estado de
   autenticación via `getAuthStatus()`. Si el token ha expirado, llama
   a `refreshAuth()` antes de ejecutar la operación. Si la renovación
   falla, la ejecución se marca como FAILED con error de autenticación
   (no retryable).

2. **Auth registry** — registro de métodos de autenticación.
   `OAuthProvider` (authorization code flow con refresh token y state
   parameter anti-CSRF), `ApiKeyProvider` (header-based key). El callback
   OAuth se recibe en `GET /api/v1/integration/auth/:providerId/callback`
   con validación del parámetro `state`. Las credenciales se almacenan
   en SecretStore (SPEC-0011), nunca en el conector.

3. **Webhook consumer** — receptor de webhooks entrantes. Cada proveedor
   externo envía eventos a un endpoint único con ruta por proveedor
   (`POST /api/v1/integration/webhook/:providerId`). El consumer valida
   la firma HMAC y enruta al conector correspondiente.

4. **Webhook publisher** — emisor de webhooks salientes hacia sistemas
   externos. Reutiliza el `WebhookCommunicationProvider` de SPEC-0012
   con el contrato `SendMessageInput`. Los webhooks fallidos entran en
   el motor de reintentos.

5. **Scheduler** — programador de tareas periódicas. Define tareas que
   se ejecutan en intervalos (cada hora, cada día, cada semana). Las
   tareas llaman a conectores específicos. Usa BullMQ repeatable jobs.
   Formato cron estándar con zona horaria: `cron(0 9 * * 1-5 Europe/Madrid)`.
   BullMQ convierte el patrón a repeatable job. Cada ejecución verifica
   idempotencia mediante `executionId` para evitar duplicados ante
   reinicios del worker.

6. **Retry engine** — motor de reintentos con exponential backoff,
   política por conector, Dead Letter Queue tras agotar intentos, y
   replay desde DLQ. El replay se realiza via
   `POST /api/v1/integration/executions/:id/replay`, que resetea el
   execution a estado pending, intentos a 0 y dlq a false, permitiendo
   una nueva ejecución completa. Mismo patrón que SPEC-0011 y SPEC-0012.

7. **Execution registry** — tabla `integration_executions` que registra
   cada ejecución de conector con estado, duración, intentos, errores
   y metadatos. Integrado con ActivityTimeline para auditoría.

```
External API ←→ [Connector] ←→ [Integration Service]
                    │
           [Auth Registry]
           OAuth | API Key
               │
         [SecretStore]
               │
    ┌──────────┼──────────┐
    │          │          │
[Webhook]  [Scheduler]  [Retry Engine]
Consumer   BullMQ Jobs  Exponential
Publisher              Backoff + DLQ
    │
    │
[Execution Registry] → ActivityTimeline → SearchModule
```

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Connector model | Interfaz única `Connector`, Clase por conector, Script | **Interfaz `Connector`** | Type-safe, testeable, registrable via DI. Mismo patrón que `CommunicationProvider` (SPEC-0012). |
| Auth model | OAuth, API Key, Basic Auth, Token exchange | **OAuth + API Key** | Cubre el 95% de las integraciones externas. Basic Auth queda para casos específicos. |
| Auth storage | SecretStore, Tabla separada, Env vars | **SecretStore** | Misma estrategia que SPEC-0011. Credenciales cifradas AES-256-GCM. |
| Webhook routing | Ruta única + discriminador, Ruta por proveedor | **Ruta por proveedor** | `POST /:providerId`. Resolución directa. Misma estrategia que SPEC-0012. |
| Scheduler | Cron nativo, BullMQ repeatable, node-cron | **BullMQ repeatable jobs** | Ya es dependencia del proyecto. Persistente, distribuido, monitoreable. |
| Retry engine | Exponential backoff, Fixed delay, Dead Letter Queue | **Exponential backoff + DLQ** | Mismo patrón que SPEC-0011 y SPEC-0012. |
| Execution registry | Tabla dedicada, Logs, Eventos | **Tabla `integration_executions`** | Trazabilidad cross-connector. Consultable via API. |

---

## 4. Data Flow

```
OAuth callback flow:

External OAuth → GET /api/v1/integration/auth/:providerId/callback?code=X&state=Y
       │
       ├── Validar state parameter (anti-CSRF)
       ├── Exchange code por access + refresh token
       ├── Store tokens en SecretStore
       └── Return success to browser

Incoming webhook flow:

External Service → POST /api/v1/integration/webhook/:providerId
       │
       ├── WebhookConsumer.handle(providerId, request)
       ├── ConnectorRegistry.get(providerId)
       ├── Connector.verifyWebhookSignature(request)
       │     ├── Invalid → 401
       │     └── Valid → process
       │
       ├── Create execution record (PENDING)
       ├── Connector.execute(operation, payload)
       ├── Update execution record (COMPLETED | FAILED)
       ├── ActivityTimeline.publish('integration.executed')
       └── SearchModule.index()

Scheduled execution flow:

BullMQ repeatable job fires
       │
       ├── SchedulerService.execute(taskId)
       ├── ConnectorRegistry.get(connectorId)
       ├── Create execution record (PENDING)
       ├── RetryEngine.execute(connector, operation, input)
       │     ├── Success → COMPLETED
       │     ├── Retryable error → RETRY (exponential backoff)
       │     └── Max retries exceeded → DLQ
       │
       └── Update execution record
```

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add `IntegrationConnector`, `IntegrationExecution` models |
| 2 | `packages/shared/src/integration/connector.interface.ts` | Create | `Connector` interface |
| 3 | `packages/shared/src/integration/auth.types.ts` | Create | OAuth + API Key types |
| 4 | `packages/shared/src/integration/integration.types.ts` | Create | Execution types, connector config |
| 5 | `packages/shared/src/integration/index.ts` | Create | Re-export |
| 6 | `apps/api/src/modules/integration/integration.module.ts` | Create | NestJS module |
| 7 | `apps/api/src/modules/integration/integration.service.ts` | Create | Core integration service |
| 8 | `apps/api/src/modules/integration/integration.controller.ts` | Create | REST API |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 9 | `apps/api/src/modules/integration/auth/oauth-provider.ts` | Create | OAuth2 authorization code flow |
| 10 | `apps/api/src/modules/integration/auth/api-key-provider.ts` | Create | API Key management |
| 11 | `apps/api/src/modules/integration/webhook/webhook-consumer.ts` | Create | Webhook receiver |
| 12 | `apps/api/src/modules/integration/retry/retry-engine.ts` | Create | Retry + DLQ |
| 13 | `apps/api/src/modules/integration/scheduler/scheduler.service.ts` | Create | BullMQ repeatable jobs |
| 14 | `apps/api/src/modules/core/core.module.ts` | Modify | Import `IntegrationModule` |

### 5.3 Expected NOT to Change

- `SecretStore` — ya existe (SPEC-0011). Se integra via contrato compartido.
- `CommunicationModule` — se integra via contratos compartidos (webhooks salientes).
- `AutomationModule` — consume eventos de integración, sin cambios.
- `SearchModule` — indexa ejecuciones via eventos, sin cambios.
- Frontend — SPEC separada.

---

## 6. Read Order

1. `packages/shared/src/communication/provider.interface.ts` — patrón de proveedores
2. `packages/shared/src/automation/ai-provider.ts` — patrón de abstracción
3. `packages/database/prisma/schema.prisma` — naming existente
4. `packages/shared/src/integration/connector.interface.ts` — definir contrato
5. `apps/api/src/modules/integration/integration.service.ts` — core
6. `apps/api/src/modules/integration/webhook/webhook-consumer.ts` — webhooks
7. `apps/api/src/modules/integration/retry/retry-engine.ts` — reintentos

---

## 7. Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_integration_tables
pnpm --filter database generate
pnpm --filter api test integration
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** High

El patrón `Connector` abstraction es idéntico a `CommunicationProvider`
(SPEC-0012). El retry engine y DLQ siguen el mismo patrón que SPEC-0011.
La única novedad es el scheduler con BullMQ repeatable jobs, que ya está
documentado y es estable.

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 3 | Patrones de provider, auth flows |
| Files to read | 6 | Schema, shared contracts, webhook handler |
| Files to create | 12 | Module, service, controller, auth, webhook, retry, scheduler |
| Files to modify | 2 | schema.prisma, core.module.ts |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OAuth refresh token expira sin renovación | Media | Alto | `refreshAuth()` en el Connector. Job de verificación periódica. |
| Webhook HMAC falsificado | Baja | Alto | `Connector.verifyWebhookSignature()` obligatorio en todos los conectores. |
| Scheduler job se acumula si el worker está caído | Baja | Medio | BullMQ repeatable jobs con deduplicación. Rate limit por conector. |
| API Key filtrada en execution logs | Baja | Alto | SecretStore gestiona claves. Nunca se loguean. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Connector | `execute()`, `getAuthStatus()`, `refreshAuth()` mocked | Jest |
| Unit — Retry Engine | Exponential backoff, DLQ, replay | Jest |
| Unit — Auth | OAuth flow, API Key validation | Jest |
| Integration — API | CRUD connectors, executions | supertest |
| Doorbell | Tenant A connectors no visibles para Tenant B | E2E |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `integration-cross-tenant-isolation.spec.ts` | Tenant A no puede ver ni ejecutar conectores de Tenant B |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0010 | Documentar la arquitectura de Integration Platform, el modelo de conectores, autenticación y scheduler. | Proposed |

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `Connector` interface | IntegrationModule | Abstracción de conectores |
| `AuthRegistry` | IntegrationModule | Gestión de OAuth y API Keys |
| `WebhookConsumer` | IntegrationModule | Recepción de webhooks entrantes |
| `WebhookPublisher` | CommunicationModule | Envío de webhooks salientes (reutiliza SPEC-0012) |
| `RetryEngine` | IntegrationModule | Reintentos + DLQ |
| `SchedulerService` | IntegrationModule | Tareas periódicas via BullMQ |
| `SecretStore` | SPEC-0011 | Almacenamiento de credenciales |

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| New connector | Implementar `Connector` + registrar DI | Hours |
| New auth method | Implementar `AuthProvider` + registrar en registry | Days |
| Connector marketplace | UI que consume `GET /api/v1/integration/connectors` | Weeks |
| AI connector | El `AiProvider` de SPEC-0011 puede exponerse como Connector | Days |
| GraphQL connector | Nuevo tipo de conector que usa GraphQL | Days |

---

## Architecture Review (MANDATORY)

### A. Scalability

| Factor | 10× (100 connectors) | 100× (1000 connectors) | Mitigation |
|--------|---------------------|------------------------|------------|
| Connector metadata | <5ms | <20ms | Index on `(tenantId, provider)` |
| Execution history | <10ms per write | <50ms | Index on `(tenantId, createdAt)`. Archive 90 días. |
| Webhook processing | <10ms per request | <30ms | Verify signature + execute connector |
| Scheduled jobs | <50 per day | <500 per day | BullMQ repeatable jobs. Workers. |

### B. Open/Closed Principle (OCP)

**Point of extension:** `Connector` interface + `ConnectorRegistry`.

**What must change to add a new connector:** Implementar `Connector` +
registrar en el módulo. Cero cambios en el engine.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| Connectors | IntegrationModule | IntegrationService |
| Auth credentials | SecretStore (SPEC-0011) | AuthRegistry |
| Webhook receivers | IntegrationModule | External services |
| Execution history | IntegrationModule | ActivityTimeline, SearchModule |
| Scheduled tasks | IntegrationModule | BullMQ workers |

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| Connector config | Indefinido | No aplica | Desactivar en lugar de borrar |
| Executions | 90 días online | Partición mensual | Eliminar >90 días |

### E. Idempotency

| Operation | Duplicate risk | Protection |
|-----------|---------------|------------|
| `execute()` | Media (retry) | `executionId` UUID + `ON CONFLICT DO NOTHING` |
| Webhook callback | Media (provider retry) | `webhookId` + delivery status check |
| Scheduled job | Alta (BullMQ at-least-once) | `executionId` generado al inicio de cada job. `ON CONFLICT (execution_id) DO NOTHING` evita duplicados aunque el job se ejecute múltiples veces. |

### F. Shared Contracts

| Contract | Location | Consumers |
|----------|----------|-----------|
| `Connector` | `packages/shared/src/integration/` | IntegrationService |
| `AuthConfig` | `packages/shared/src/integration/` | AuthRegistry |

### G. Partitioning Strategy

`integration_executions` se particiona por mes. Misma estrategia que
ActivityTimeline (SPEC-0009).

---

## 16. Interfaces / Contracts

```typescript
export interface Connector {
  readonly id: string;
  readonly name: string;
  readonly authType: 'oauth' | 'api-key' | 'none';
  execute(operation: string, input: Record<string, unknown>): Promise<ConnectorResult>;
  getAuthStatus(): Promise<AuthStatus>;
  refreshAuth(): Promise<void>;
  verifyWebhookSignature?(request: WebhookRequest): boolean;
}

export interface ConnectorResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  durationMs: number;
}

export interface AuthStatus {
  valid: boolean;
  expiresAt?: string;
  provider: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  redirectUri: string;
}

export interface ApiKeyConfig {
  headerName: string;
  key: string;
}
```

```prisma
model IntegrationConnector {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  provider    String   // 'google-calendar' | 'openai' | 'sendgrid' | ...
  name        String
  authType    String   // 'oauth' | 'api-key'
  config      Json?    @default("{}")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, provider])
  @@index([tenantId])
  @@map("integration_connectors")
}

model IntegrationExecution {
  id            String   @id @default(uuid())
  connectorId   String   @map("connector_id")
  tenantId      String   @map("tenant_id")
  operation     String
  status        String   @default("pending")
  attempts      Int      @default(1)
  maxAttempts   Int      @default(3)
  input         Json?
  output        Json?
  error         String?
  dlq           Boolean  @default(false)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([tenantId, status])
  @@index([tenantId, createdAt(sort: Desc)])
  @@map("integration_executions")
}
```

---

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Add integration tables + migration | Bajo | `prisma migrate down` |
| 2 | Create shared contracts | Bajo | Revertir commit |
| 3 | Implement IntegrationModule + Auth | Bajo | Desregistrar del módulo |
| 4 | Implement RetryEngine + Scheduler | Medio | Desactivar jobs. DLQ preserva datos. |
| 5 | Wire CoreModule + event handlers | Bajo | Quitar del imports |

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿Soportar Basic Auth además de OAuth y API Key? | Open | Recomendación: solo OAuth + API Key en v1. Basic Auth es poco seguro. |
| 2 | ¿Webhook consumer con ruta única + header discriminator? | Open | Recomendación: ruta por proveedor (`/:providerId`). Más simple, misma estrategia que SPEC-0012. |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Pendiente de Architecture Review.
