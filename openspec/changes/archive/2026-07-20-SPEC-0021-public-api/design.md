# Design: SPEC-0021 — Public API

> **Version template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Platform Baseline:** sdd-v2.1-baseline
> **Status:** REFINED — Architecture Review conditions resolved

---

## 1. Executive Summary

CRM-Master expone APIs internas (NestJS controllers) que no son adecuadas
para consumo externo. Carecen de rate limiting, autenticación por API key,
versionamiento explícito, documentación de contrato (OpenAPI publicable),
y límites de uso por tenant. Los integradores externos no tienen una forma
estándar de acceder a datos del plataforma.

**Public API** es una capa de exposición controlada que envuelve las APIs
internas con: autenticación via API keys bearer token con scopes
recurso:acción, rate limiting por endpoint y tenant, versionamiento
explícito (v1, v2), documentación OpenAPI pública, cuotas de uso, y
webhooks para eventos asíncronos con protección SSRF y replay.

El impacto esperado es permitir integraciones externas seguras, eliminar
la exposición directa de las APIs internas, y proporcionar un contrato
estable y documentado para los integradores.

---

## 2. Technical Approach

La Public API se organiza en cinco capas, todas dentro del mismo proceso
NestJS. Caddy solo termina TLS y redirige el tráfico al puerto 3001.

1. **API Gateway** — Caddy termina TLS, proxy inverso a NestJS en puerto
   3001. NestJS `@Controller('v1/public')` maneja el enrutamiento. No hay
   separación de procesos.

2. **Auth Layer** — autenticación via bearer token `crm_live_xxx`. Los
   tokens tienen scopes en formato recurso:acción (`workflows:read`,
   `documents:write`, `*:admin`), están vinculados a un tenant, expiran,
   y tienen un flag `active` para revocación inmediata. Se validan contra
   `ApiKey` model en DB con cache en Redis. Revocación via
   `POST /api/v1/internal/api-keys/:id/revoke` con invalidación de cache
   Redis.

3. **API Versioning** — versionamiento explícito en URL: `/api/v1/public/...`,
   `/api/v2/public/...`. Cada versión tiene su propio controller. Las
   versiones antiguas se deprecan con un ciclo de vida: `Warning` header
   (6 meses antes) → `Sunset` header (fecha de desactivación) → `410 Gone`
   + `Link` header con URL de la versión sucesora.

4. **Rate Limiting & Quotas** — rate limiting por API key + método + ruta
   (`{apiKeyId}:{method}:{route}`) y cuotas mensuales (requests/mes). Cada
   endpoint tiene su propio pool de rate limiting. Los límites son
   configurables por tenant. Exceso → `429 Too Many Requests` con
   `Retry-After` header.

5. **Webhook Delivery** — webhooks para eventos asíncronos. Los tenants
   registran URLs para recibir eventos (workflow.completed, document.created,
   etc.). El sistema entrega vía HTTP POST con firma HMAC-SHA256 (que
   incluye `deliveryId` para protección contra replay) y reintento con
   backoff. Las URLs se validan contra SSRF antes de cualquier delivery.
   Los secrets de webhook se almacenan cifrados en reposo.

```
External Client
       │
       ▼
Caddy (TLS termination, proxy to :3001)
       │
       ▼
Public API Module ──→ Bearer Token Auth ──→ Rate Limiter (per endpoint)
       │                                   │
       ├── v1 controllers (stable)         ▼
       ├── v2 controllers (latest)     Quota Enforcer
       │                                   │
       ├──→ Response Mapper (v1 → DTO)    │
       ├──→ Internal API (NestJS modules)  │
       │                                   │
       └──→ Webhook Dispatcher ─────→ External Webhook URL
                │                          │
            (HMAC-SHA256 + deliveryId)   SSRF validation
```

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| API Gateway | Nginx, Caddy, Kong, AWS API Gateway | **Caddy + NestJS (same process)** | Caddy ya está en la infraestructura. TLS automático. NestJS maneja toda la lógica de aplicación. Sin separación de procesos. |
| Auth scheme | API key + secret (sk_xxx), Single bearer token | **Single bearer token `crm_live_xxx`** | `sk_xxx` nunca se verifica — es security theater. Bearer token único simplifica el modelo: hash → lookup → validate active + expiry → resolve tenant. El token se muestra una vez en creación. El guard extrae el token del header `Authorization: Bearer`, calcula hash, busca en DB/Redis, verifica active + not expired. |
| API Key storage | DB hashed, DB plaintext, Vault | **DB hashed (SHA-256 + salt)** | El token se muestra solo en creación. Se almacena `hash(token + salt)`. |
| Scope model | read/write/admin (coarse), resource:action (granular) | **resource:action (granular)** | `workflows:read`, `documents:write`, `*:admin`. Permite control de acceso preciso. Wildcard `*:read` = read en todos los recursos. |
| Rate limiting | Redis Sliding Window, In-memory, DB | **Redis Sliding Window (per endpoint)** | Redis está disponible (BullMQ ya lo usa). Sliding window es más preciso que fixed window. Clave: `{apiKeyId}:{method}:{route}` — cada endpoint tiene su propio pool. |
| API versioning | URL path, Header, Query param | **URL path (v1, v2)** | Explícito, cacheable, fácil de documentar. Headers y query params son menos visibles. |
| Webhook delivery | Polling, HTTP POST, Event bridge | **HTTP POST with HMAC signature** | Estándar de la industria (similar a Stripe, GitHub). HMAC-SHA256 para verificación. Firma incluye `deliveryId` para protección contra replay. Reintento con backoff. |
| Webhook URL validation | None, SSRF validation | **SSRF validation** | Bloqueo de RFC 1918, link-local, loopback, Docker subnets. DNS rebinding protection: resolver URL, verificar IP pública, cachear resolución. |
| Webhook secret storage | Plaintext, Encrypted at rest | **Encrypted at rest** | Secrets cifrados con NestJS Encryption o pgcrypto. Key rotation soportada. |
| OpenAPI docs | Swagger UI, Redoc, Stoplight | **Swagger UI (existing) + public endpoint** | Swagger ya está en uso internamente. Se expone un `openapi.json` público filtrado (solo endpoints public). |
| Response mapping | Direct internal DTO, Versioned DTO + mapper | **Versioned DTO + mapper** | `V1WorkflowResponse`, `V1DocumentResponse`. `WorkflowResponseMapper.toV1(internal)`. Aísla cambios internos del contrato público. |

---

## 4. Data Flow

```
Authenticate request:

Client → GET /api/v1/public/workflows
       │
       ├── Extract token from header: Authorization: Bearer crm_live_xxx
       ├── Lookup ApiToken by hash (Redis cache first, then DB)
       │     ├── NOT FOUND → 401 Unauthorized
       │     └── FOUND → continue
       │
       ├── Check active flag
       │     ├── INACTIVE → 401 Unauthorized ("Token revoked")
       │     └── ACTIVE → continue
       │
       ├── Check token expired
       │     ├── EXPIRED → 401 Unauthorized
       │     └── VALID → continue
       │
       ├── Resolve scope authorization
       │     ├── INSUFFICIENT → 403 Forbidden
       │     └── SUFFICIENT → continue
       │
       ├── Rate limit check (per endpoint: {apiKeyId}:GET:/v1/public/workflows)
       │     ├── EXCEEDED → 429 Too Many Requests
       │     └── OK → continue
       │
       ├── Quota check (monthly usage)
       │     ├── EXCEEDED → 429 + Retry-After
       │     └── OK → continue
       │
       ├── Resolve tenant from API key
       ├── Forward to internal controller with tenant context
       ├── Map internal response to versioned DTO
       │     ├── WorkflowResponseMapper.toV1(workflowInternal)
       │     └── Return V1WorkflowResponse
       └── Return response

Create API key:

Admin → POST /api/v1/internal/api-keys
       │
       ├── Generate token: crm_live_{random}
       ├── Hash: SHA-256(token + salt)
       ├── Store: ApiKey { id, tenantId, name, tokenHash, tokenPrefix, scopes, expiresAt, active: true }
       ├── Return: { token: "crm_live_xxx" } — shown only ONCE
       └── Log audit event (SPEC-0018)

Revoke API key:

Admin → POST /api/v1/internal/api-keys/:id/revoke
       │
       ├── Update: SET active = false
       ├── Delete Redis cache entry for token hash
       ├── Log audit event
       └── Return: { revoked: true }

Webhook delivery:

System event (workflow.completed)
       │
       ├── Load tenant webhook subscriptions for event type
       ├── For each subscription:
       │     ├── Validate webhook URL (SSRF check)
       │     │     ├── BLOCKED → log, skip delivery, alert admin
       │     │     └── PASS → continue
       │     ├── Build payload { deliveryId, eventType, data, timestamp }
       │     ├── Compute HMAC-SHA256(payload, decrypted webhookSecret)
       │     ├── POST to webhook URL with signature header + deliveryId header
       │     ├── 2xx → mark delivered
       │     └── !2xx → retry (5x, exponential backoff), then dead letter
       │
       └── Log delivery attempt
```

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add `ApiKey` (tokenHash, scopes resource:action), `WebhookSubscription`, `WebhookDelivery`, `ApiQuota` models |
| 2 | `packages/shared/src/public-api/` | Create | Types: ApiKeyToken, WebhookEvent, V1WorkflowResponse, V1DocumentResponse, PublicApiResponse, RateLimit |
| 3 | `packages/shared/src/public-api/index.ts` | Create | Re-export |
| 4 | `apps/api/src/modules/public-api/public-api.module.ts` | Create | NestJS module |
| 5 | `apps/api/src/modules/public-api/auth/api-key-auth.guard.ts` | Create | Bearer token authentication guard (checks active + expiry + scope) |
| 6 | `apps/api/src/modules/public-api/auth/api-key.service.ts` | Create | API Key CRUD + validation + revoke (with Redis cache invalidation) |
| 7 | `apps/api/src/modules/public-api/rate-limit/rate-limit.service.ts` | Create | Redis sliding window rate limiter (per endpoint) |
| 8 | `apps/api/src/modules/public-api/rate-limit/quota.service.ts` | Create | Monthly quota tracking |
| 9 | `apps/api/src/modules/public-api/webhook/webhook-dispatcher.service.ts` | Create | Webhook delivery + retry (includes SSRF validation before delivery) |
| 10 | `apps/api/src/modules/public-api/webhook/webhook-subscription.service.ts` | Create | Webhook CRUD (SSRF validation on create/update, encrypted secret storage) |
| 11 | `apps/api/src/modules/public-api/v1/v1-workflows.controller.ts` | Create | Public v1 workflows endpoint |
| 12 | `apps/api/src/modules/public-api/v1/v1-documents.controller.ts` | Create | Public v1 documents endpoint |
| 13 | `apps/api/src/modules/public-api/guards/scope.guard.ts` | Create | Scope-based access control (resource:action matching with wildcard support) |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 14 | `apps/api/src/modules/public-api/docs/public-openapi.ts` | Create | Public OpenAPI spec generation |
| 15 | `apps/api/src/modules/public-api/middleware/api-version.middleware.ts` | Create | Version header + deprecation (Warning, Sunset, Link headers) |
| 16 | `apps/api/src/modules/public-api/mappers/workflow-response.mapper.ts` | Create | V1 response mapper — explicit field mapping from internal model |
| 17 | `apps/api/src/modules/public-api/mappers/document-response.mapper.ts` | Create | V1 document response mapper |
| 18 | `apps/api/src/modules/public-api/auth/revoke.controller.ts` | Create | `POST /api/v1/internal/api-keys/:id/revoke` endpoint |
| 19 | `apps/api/src/modules/public-api/auth/ssrf-validator.service.ts` | Create | URL validation: block private IPs, DNS rebinding protection |
| 20 | `apps/api/src/modules/core/core.module.ts` | Modify | Import PublicApiModule |

### 5.3 Expected NOT to Change

- Módulos internos existentes (Workflow, Notification, Document, etc.) — la Public API los consume, no los modifica
- Frontend — SPEC separada
- Infraestructura Caddy — solo proxy host existente, sin cambios de enrutamiento

---

## 6. Read Order

1. `packages/shared/src/public-api/` — tipos base
2. `packages/database/prisma/schema.prisma` — modelos
3. `apps/api/src/modules/public-api/auth/api-key.service.ts` — auth
4. `apps/api/src/modules/public-api/auth/api-key-auth.guard.ts` — guard
5. `apps/api/src/modules/public-api/rate-limit/rate-limit.service.ts` — rate limiting
6. `apps/api/src/modules/public-api/webhook/webhook-dispatcher.service.ts` — webhooks
7. `apps/api/src/modules/public-api/v1/` — controllers de ejemplo
8. `apps/api/src/modules/public-api/mappers/` — response mappers
9. `apps/api/src/modules/public-api/auth/ssrf-validator.service.ts` — SSRF validation

---

## 7. Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_public_api
pnpm --filter database generate
pnpm --filter api test public-api
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** High

El patrón de bearer token con hash + rate limiting + webhooks con HMAC es
estándar en la industria (Stripe, GitHub, Twilio). Redis sliding window es
el enfoque recomendado para rate limiting. La separación de versiones por
URL path es la práctica más común. HMAC-SHA256 para webhooks es el estándar.
La validación SSRF y el cifrado de secrets en reposo son prácticas de
seguridad obligatorias.

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 3 | Patrones de guards existentes, Redis config, Caddy config |
| Files to read | 5 | Schema, guards existentes, módulo core |
| Files to create | 17 | Module, auth, rate-limit, webhook, controllers, guards, mappers, SSRF validator, revoke controller, types |
| Files to modify | 2 | schema.prisma, core.module.ts |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API key compromise permite acceso no autorizado | Baja | Alto | Rotación de keys forzada cada 90 días. Scopes recurso:acción limitan acciones. Revocación inmediata via endpoint + Redis cache invalidation. Audit logging. |
| SSRF via webhook URL — tenant configura URL apuntando a metadatos cloud (169.254.169.254), Docker host, o red interna | Baja | Alto | Validación SSRF en creación y cada delivery: bloqueo RFC 1918, link-local, loopback, Docker subnets. DNS rebinding protection con resolución y cache de IP. Alertas de seguridad si se detecta intento. |
| Revoked key still valid hasta que expire TTL de cache Redis | Media | Medio | El guard SIEMPRE verifica `active` flag en DB antes de permitir request. Redis cache es aceleración, no fuente de verdad. TTL corto (60s) para minimizar ventana. |
| Rate limiting por Redis puede fallar si Redis está caído | Baja | Alto | Fallback a in-memory rate limiting si Redis no responde. Log de alerta. |
| Versionamiento creciente (v3, v4) acumula deuda de mantenimiento | Media | Medio | Política de deprecación definida: Warning header a los 6 meses de anunciar deprecación, Sunset header con fecha, 410 Gone + Link successor-version al vencer. Máximo 2 versiones activas simultáneas. Cada versión tiene su propio mapper. |
| Webhook entrega falla y el tenant no recibe eventos críticos | Media | Alto | Retry 5x con backoff. Dead letter visible en dashboard del tenant. Replay manual. |
| Webhook secret compromise si se almacena en texto plano | Baja | Alto | Secrets cifrados en reposo con NestJS Encryption o pgcrypto. Key rotation periódica. |
| Replay attack on webhook — mismo payload reenviado por atacante | Baja | Medio | HMAC incluye `deliveryId` único. Endpoint webhook verifica que no se haya procesado el mismo `deliveryId`. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Auth | Bearer token hash/verify, expiry, scope validation, active flag check | Jest |
| Unit — Rate limit | Sliding window per endpoint, quota tracking, Redis fallback | Jest |
| Unit — Webhook | HMAC signing with deliveryId, retry logic, dead letter | Jest |
| Unit — SSRF | URL validation blocking private IPs, DNS rebinding | Jest |
| Unit — Mappers | Internal → V1 DTO field mapping | Jest |
| Integration — API | Full request flow: auth → rate limit → scope → mapper → response | supertest |
| Doorbell | Tenant A's API key cannot access Tenant B's data | E2E |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `public-api-cross-tenant-isolation.spec.ts` | Tenant A's API key cannot access Tenant B's workflows/documents |
| `public-api-scope-enforcement.spec.ts` | Read-only key (workflows:read) cannot perform write operations |
| `public-api-revocation.spec.ts` | Revoked key returns 401 immediately after revoke endpoint called |
| `public-api-ssrf-blocking.spec.ts` | Webhook URLs pointing to private IPs are rejected |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0018 | Documentar la arquitectura de la Public API, autenticación via bearer token `crm_live_xxx`, scopes recurso:acción, rate limiting por endpoint, webhooks con HMAC + deliveryId, SSRF protection, cifrado de secrets, política de versionamiento y deprecación. | Proposed |

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `ApiKey` (auth) | PublicApiModule | Autenticación y autorización de acceso externo. Scopes recurso:acción. Revocación inmediata. |
| `RateLimiter` | PublicApiModule | Control de uso por API key + método + ruta. Pool independiente por endpoint. |
| `ResponseMapper` | PublicApiModule | Transformación de modelos internos a DTOs versionados. Aísla cambios internos del contrato público. |
| `SSRFValidator` | PublicApiModule | Validación de URLs de webhook. Bloqueo de direcciones privadas. DNS rebinding protection. |
| `WebhookDispatcher` | PublicApiModule | Entrega de eventos asíncronos a externos con firma HMAC y deliveryId. |
| Internal APIs | Respective modules | La Public API las consume, no las modifica. |

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| New API version (v2) | Nuevo controller en `v2/`, nuevo mapper. Versionamiento por URL. Cero cambios en auth/rate-limit. | Days |
| OAuth2 integration | Nuevo `AuthStrategy` además de BearerTokenGuard. Sin cambiar rate limiting o webhooks. | Weeks |
| GraphQL endpoint | Módulo separado en `public-api/graphql/`. Comparte auth y rate limiting. | Weeks |
| IP whitelist | Añadir campo `allowedIps` a ApiKey. Validar en guard antes de rate limit. | Days |
| Webhook retry dashboard | Endpoint `GET /webhook/deliveries` para ver estado de entregas. | Days |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× (100 API keys, 10K req/día) | 100× (1000 keys, 100K req/día) | Mitigation |
|--------|-------------------------------|--------------------------------|------------|
| Auth lookup | <5ms (hashed token match) | <10ms (Redis cache) | Cache de ApiKey en Redis con TTL 60s. Auth guard verifica `active` flag contra DB. |
| Rate limiting | <2ms (Redis INCR) | <5ms | Redis pipelining. Sharding por tenant si escala. Clave por endpoint. |
| Webhook delivery | <1s por delivery | <2s | Workers paralelos. Límite de 10 webhooks/evento. SSRF validation cachea resolución DNS. |
| Request proxying | <50ms (incluye target) | <100ms | Misma instancia NestJS — sin overhead de proxy adicional. Response mapper overhead mínimo. |

**Decision:** La Public API escala horizontalmente. Redis es el cuello de
botella — mitigado con cache de ApiKeys y pipelining. Los webhooks se
delegan a BullMQ. Los response mappers son stateless y escalan con la
instancia.

### B. Open/Closed Principle (OCP)

**Point of extension:** `ApiController`, `AuthStrategy`, `ResponseMapper`.

**What must change to add a new public endpoint:** Crear mapper
(endpoint-specific to V1), crear controller en `v1/` o `v2/` con decorador
`@PublicApi('workflows:read')`. Cero cambios en auth/rate-limit/versioning.

**What must change to add a new auth strategy:** Implementar `AuthStrategy`
interface. Registrar en `AuthGuard`. Cero cambios en controllers.

**What must change to add a new API version:** Crear nuevo mapper layer
(e.g., `V2WorkflowResponse`), nuevo controller en `v2/`. Cero cambios en
auth/rate-limit. Los mappers existentes de v1 no se modifican.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| ApiKey | PublicApiModule | Auth guard, Admin UI, Revoke endpoint |
| Webhook subscriptions | PublicApiModule | Webhook dispatcher, SSRF validator |
| Webhook secrets (encrypted) | PublicApiModule | Webhook dispatcher (decrypt at use time) |
| Rate limit counters | PublicApiModule (Redis) | Rate limiter |
| Response mappers | PublicApiModule (per version) | V1 controllers, V2 controllers |
| SSRF validation rules | PublicApiModule | WebhookSubscriptionService, WebhookDispatcher |
| Internal APIs | Respective modules | PublicApiModule |

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| ApiKey | Hasta expiración (max 90 días) | — | Revocar (active=false) al expirar. Eliminar 30 días post-expiración. |
| Webhook deliveries | 30 días | — | Eliminar >30 días |
| Rate limit counters | TTL 1 minuto (Redis) | — | Expira automáticamente |
| Monthly quotas | Fin de mes | — | Reset mensual |

### E. Idempotency

| Operation | Duplicate risk | Protection |
|-----------|---------------|------------|
| `POST webhook` | Alta (retry) | `deliveryId` UUID en payload firmado + endpoint verifica `deliveryId` no procesado |
| `POST internal API` | Depende del módulo interno | La Public API confía en la idempotencia del módulo interno |

### F. Shared Contracts

| Contract | Location | Consumers |
|----------|----------|-----------|
| `PublicApiRequest` | `packages/shared/src/public-api/` | Controllers, Guards |
| `ApiKeyTokenPayload` | `packages/shared/src/public-api/` | Auth, Admin |
| `WebhookEvent` | `packages/shared/src/public-api/` | Dispatcher, External |
| `V1WorkflowResponse` | `packages/shared/src/public-api/` | V1 controllers, External clients |
| `V1DocumentResponse` | `packages/shared/src/public-api/` | V1 controllers, External clients |

### G. Partitioning Strategy

`api_keys` no requiere partición (volumen bajo). `webhook_deliveries` se
particiona por mes. Los rate limit counters viven en Redis (clave por
endpoint, sin partición necesaria). Las cuotas mensuales se resetean por
TRIGGER o cron.

---

## 16. Interfaces / Contracts

```typescript
// ─── Core Types ────────────────────────────────────

// Scope format: resource:action
// Resources: workflows, documents, webhooks, quotas, *
// Actions: read, write, admin
// Wildcard: *:read = read on all resources, *:admin = full access
export type ApiKeyScope = `${string}:${'read' | 'write' | 'admin'}`;

export interface ApiKeyTokenPayload {
  id: string;
  tenantId: string;
  name: string;
  scopes: ApiKeyScope[];
  expiresAt: string;
  active: boolean;
}

export interface CreateApiKeyResult {
  id: string;
  token: string;    // crm_live_xxx — shown once only
  scopes: ApiKeyScope[];
  expiresAt: string;
}

// ─── Webhook ────────────────────────────────────────

export interface WebhookSubscription {
  id: string;
  tenantId: string;
  url: string;
  eventTypes: string[];
  secret: string;     // Encrypted at rest (NestJS Encryption / pgcrypto)
  active: boolean;
}

export interface WebhookEvent {
  id: string;
  deliveryId: string;       // UUID — included in HMAC-signed payload
  eventType: string;
  tenantId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventId: string;
  deliveryId: string;       // Matches WebhookEvent.deliveryId
  status: 'delivered' | 'failed' | 'retrying';
  responseCode: number;
  responseBody?: string;
  deliveredAt?: string;
}

// ─── Rate Limit ─────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;       // Unix timestamp
  retryAfter?: number;   // seconds
}

export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: string;
}

// ─── Public API Response ────────────────────────────

export interface PublicApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ─── Versioned Response DTOs ────────────────────────

export interface V1WorkflowResponse {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface V1DocumentResponse {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
```

```prisma
// ─── ApiKey ────────────────────────────────────────
model ApiKey {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  name        String
  tokenHash   String   @unique @map("token_hash")    // SHA-256(token + salt)
  tokenPrefix String   @map("token_prefix")           // first 8 chars of crm_live_xxx
  scopes      String[]                                 // "workflows:read", "documents:write", "*:admin"
  expiresAt   DateTime @map("expires_at")
  lastUsedAt  DateTime? @map("last_used_at")
  active      Boolean  @default(true)                 // Must be true for auth to pass
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([tenantId])
  @@index([active])
  @@map("api_keys")
}

// ─── WebhookSubscription ───────────────────────────
model WebhookSubscription {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  url         String                                   // Validated against SSRF (no RFC 1918, link-local, loopback, Docker subnets)
  eventTypes  String[] @map("event_types")
  secret      String                                   // Encrypted at rest — HMAC key. Must use pgcrypto or NestJS Encryption.
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  deliveries  WebhookDelivery[]

  @@index([tenantId])
  @@map("webhook_subscriptions")
}

// ─── WebhookDelivery ───────────────────────────────
model WebhookDelivery {
  id             String    @id @default(uuid())
  subscriptionId String    @map("subscription_id")
  eventId        String    @map("event_id")
  deliveryId     String    @map("delivery_id")         // Included in HMAC payload — replay protection
  status         String    @default("pending")         // pending | delivered | failed | retrying
  responseCode   Int?
  responseBody   String?   @map("response_body")
  attemptCount   Int       @default(0) @map("attempt_count")
  deliveredAt    DateTime? @map("delivered_at")
  createdAt      DateTime  @default(now()) @map("created_at")

  subscription   WebhookSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([subscriptionId, createdAt(sort: Desc)])
  @@index([deliveryId])
  @@map("webhook_deliveries")
}

// ─── ApiQuota ──────────────────────────────────────
model ApiQuota {
  id            String   @id @default(uuid())
  tenantId      String   @unique @map("tenant_id")
  monthlyLimit  Int      @default(10000) @map("monthly_limit")
  usedThisMonth Int      @default(0) @map("used_this_month")
  month         String   @default("")                  // "2026-07"
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("api_quotas")
}
```

### Auth Flow Reference

```
Guard execution order:
1. Extract Bearer token from Authorization header
2. Hash token, search Redis cache → if miss, search DB
3. NOT FOUND → 401
4. Check `active === true` — INACTIVE → 401 "Token revoked"
5. Check expiry — EXPIRED → 401
6. Check scope — INSUFFICIENT → 403
7. Resolve tenantId → set request context
8. Continue to rate limiter

Revocation flow:
POST /api/v1/internal/api-keys/:id/revoke
→ UPDATE api_keys SET active = false WHERE id = :id
→ DELETE Redis entry for tokenHash
→ Log audit event
→ Response { revoked: true, revokedAt: ISO8601 }

Redis cache behavior:
- On auth lookup: cache tokenHash → { payload } with TTL 60s
- On revoke: DEL tokenHash from cache
- Never treat cache as source of truth for `active` flag
```

### SSRF Validation Reference

```
SSRFValidator.validate(url: string): ValidationResult

1. Parse URL — reject if scheme !== 'https'
2. Resolve DNS → get IP addresses
3. Check each IP against blocklists:
   - RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
   - Loopback: 127.0.0.0/8, ::1
   - Link-local: 169.254.0.0/16
   - Docker: 172.17.0.0/16, 172.18.0.0/16, etc.
   - CGNAT: 100.64.0.0/10
   - IETF reserved: 0.0.0.0/8, 240.0.0.0/4
4. If ANY IP is private → REJECT
5. Cache resolved IP with TTL 5min (DNS rebinding protection)
6. Return PASS

Applied on:
- WebhookSubscription create/update
- Each webhook delivery (re-validate cached resolution)
```

---

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Add Public API tables + migration | Bajo | `DROP TABLE` (sin datos aún) |
| 2 | Create shared contracts + types | Bajo | Revertir commit |
| 3 | Implement ApiKeyService + AuthGuard (bearer token, active check) | Bajo | Sin API keys creadas, no hay impacto |
| 4 | Implement SSRFValidator + WebhookSubscriptionService (SSRF validation + encrypted secret) | Bajo | Sin webhooks registrados, no hay impacto |
| 5 | Implement RevokeController + Redis cache invalidation | Bajo | Endpoint nuevo, no afecta nada existente |
| 6 | Implement RateLimiter (per endpoint) + QuotaService | Bajo | Sin tráfico público, no hay rate limiting activo |
| 7 | Implement response mappers (V1 DTOs) | Bajo | Sólo transformación interna, no afecta APIs |
| 8 | Implement v1 controllers (Workflows, Documents) | Bajo | Endpoints nuevos, no afectan APIs internas |
| 9 | Implement WebhookDispatcher (HMAC + deliveryId anti-replay) | Bajo | Sin webhooks registrados, no hay entregas |
| 10 | Wire PublicApiModule en CoreModule | Bajo | Quitar del imports |
| 11 | Configurar Caddy route (solo proxy host existente) | Bajo | Revertir configuración de ruta |

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿Soporte para OAuth2 además de bearer token en MVP? | Open | Recomendación: no en MVP. Bearer token `crm_live_xxx` es suficiente. OAuth2 como extensión v2. |
| 2 | ¿Webhooks con firma HMAC-SHA256 (incluyendo deliveryId) es suficiente o se necesita request signing en cada API call? | Open | Recomendación: HMAC solo en webhooks. API calls se autentican con bearer token + TLS. Request signing (como Stripe) es extensión futura. |
| 3 | ¿Máximo de webhooks por tenant? | Open | Recomendación: 10 webhooks por tenant en MVP. Configurable vía ApiQuota. |
| 4 | ¿Los rate limits se definen por endpoint o globales? | **Resolved** | **Por endpoint desde MVP.** Clave de rate limit: `{apiKeyId}:{method}:{route}`. Cada endpoint tiene su propio pool. Un endpoint ocupado no afecta a otros. Docs: "Each endpoint has its own rate limit pool." |
| 5 | ¿Política de deprecación de versiones? | **Resolved** | **Ciclo de vida completo:** `Warning` header (6 meses antes de deprecación) → `Sunset` header con fecha ISO → `410 Gone` al vencer + `Link` header con `<url>; rel="successor-version"`. Máximo 2 versiones activas simultáneas. |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Architecture Review conditions resolved. Ready for Tasks generation.
