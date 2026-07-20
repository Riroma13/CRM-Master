# Tasks: SPEC-0014 — Integration Platform

> **Basado en:** Design APPROVED (5 architecture improvements incorporated)
> **SDD v2.1 — Enterprise Design Standard**
> **Platform Baseline:** sdd-v2.1-baseline
> **Fecha:** 2026-07-20

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900–1200 |
| 400-line budget risk | **High** |
| Chained PRs recommended | **Yes** |
| Suggested split | PR1 Foundation → PR2 Core → PR3 Auth + Webhooks → PR4 Scheduler → PR5 Testing |
| Delivery strategy | `stacked-to-main` |

---

## Phase 1: Foundation — Schema, Shared Contracts, ADR

**Objetivo:** Crear la base de datos, los contratos compartidos de Integration
Platform y el ADR-0010.

**Dependencias:** Ninguna.

**Riesgo:** Bajo. Cambios aditivos.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 1.1 | ADR-0010: Integration Platform Architecture | `docs/architecture/adr/0010-integration-platform.md` | ADR creado documentando la arquitectura de conectores, autenticación, webhooks, scheduler y retry engine | Documental |
| 1.2 | Add integration tables to Prisma schema | `packages/database/prisma/schema.prisma` | Modelos `IntegrationConnector`, `IntegrationExecution` con `dlq` flag. Indexes en `(tenantId, provider)`, `(tenantId, createdAt)`. | Schema |
| 1.3 | Create Connector interface | `packages/shared/src/integration/connector.interface.ts` | `Connector` con `execute()`, `getAuthStatus()`, `refreshAuth()`, `verifyWebhookSignature?()`. | Shared |
| 1.4 | Create auth types | `packages/shared/src/integration/auth.types.ts` | `OAuthConfig`, `ApiKeyConfig`, `AuthStatus`, tipos de configuración de autenticación. | Shared |
| 1.5 | Create integration types | `packages/shared/src/integration/integration.types.ts` | `ConnectorResult`, `ExecutionStatus`, tipos de ejecución. | Shared |
| 1.6 | Create re-export | `packages/shared/src/integration/index.ts`, `packages/shared/src/index.ts` | Export all integration modules. `tsc --noEmit` passes. | Shared |

**Expected Commands:**
```bash
pnpm --filter database prisma validate
pnpm --filter shared tsc --noEmit
```

---

## Phase 2: Core Engine — Service, Controller, Module

**Objetivo:** Implementar el motor central de integraciones: `IntegrationService`,
`ConnectorRegistry`, `IntegrationController` y el módulo NestJS.

**Dependencias:** Phase 1 (shared contracts)

**Riesgo:** Bajo. Patrón establecido (SPEC-0012, SPEC-0011).

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 2.1 | Implement ConnectorRegistry | `apps/api/src/modules/integration/connectors/connector-registry.ts` | `register(connector)`, `get(id)`, `getAll()`. Los conectores se registran via DI. | Core |
| 2.2 | Implement IntegrationService | `apps/api/src/modules/integration/integration.service.ts` | `execute(connectorId, operation, input)`: verifica auth antes de ejecutar, registra execution, maneja fallos. `getStatus(executionId)`. `replay(executionId)`: resetea DLQ. | Core |
| 2.3 | Implement IntegrationController | `apps/api/src/modules/integration/integration.controller.ts` | CRUD de conectores: `POST/GET/PATCH/DELETE /api/v1/integration/connectors`. Ejecuciones: `GET /api/v1/integration/executions`. DLQ: `GET /api/v1/integration/executions/dlq`, `POST /api/v1/integration/executions/:id/replay`. | Controller |
| 2.4 | Implement DTOs | `apps/api/src/modules/integration/dto.ts` | `CreateConnectorSchema`, `UpdateConnectorSchema`, `ExecuteSchema`, `ExecutionQuery`. Validación Zod. | DTO |
| 2.5 | Implement IntegrationModule | `apps/api/src/modules/integration/integration.module.ts` | Wire service, controller, registry. | Wiring |

**Expected Commands:**
```bash
pnpm --filter api lint
pnpm turbo build --filter=api
```

---

## Phase 3: Auth + Webhooks

**Objetivo:** Implementar los proveedores de autenticación (OAuth, API Key) y
el consumidor de webhooks entrantes.

**Dependencias:** Phase 2 (ConnectorRegistry, IntegrationService)

**Riesgo:** Medio. OAuth requiere callback endpoint con validación de state.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 3.1 | Implement OAuthProvider | `apps/api/src/modules/integration/auth/oauth-provider.ts` | Authorization code flow. `getAuthUrl()` genera URL con state parameter. `handleCallback(code, state)`: valida state, exchange code por tokens, almacena en SecretStore. `refreshToken()`: renueva access token. | Auth |
| 3.2 | Implement ApiKeyProvider | `apps/api/src/modules/integration/auth/api-key-provider.ts` | `validate(key)`: verifica contra SecretStore. `getHeaderName()`: retorna el header esperado. | Auth |
| 3.3 | Implement OAuth callback controller | `apps/api/src/modules/integration/auth/oauth-callback.controller.ts` | `GET /api/v1/integration/auth/:providerId/callback`. Valida state, exchange code, retorna success. | Controller |
| 3.4 | Implement WebhookConsumer | `apps/api/src/modules/integration/webhook/webhook-consumer.ts` | `POST /api/v1/integration/webhook/:providerId`. Resuelve connector desde ConnectorRegistry. Verifica firma via `connector.verifyWebhookSignature()`. Rate limiting por (tenantId, providerId) mediante `RateLimiter` de SPEC-0012 (reutilizado). Ejecuta operación. Registra execution. | Webhook |

**Expected Commands:**
```bash
pnpm --filter api lint
pnpm turbo build --filter=api
```

---

## Phase 4: Retry Engine + Scheduler

**Objetivo:** Implementar el motor de reintentos con DLQ y el scheduler de
tareas periódicas via BullMQ.

**Dependencias:** Phase 2 (IntegrationService)

**Riesgo:** Medio. BullMQ repeatable jobs requieren Redis configurado.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 4.1 | Implement RetryEngine | `apps/api/src/modules/integration/retry/retry-engine.ts` | Exponential backoff (3 intentos). Marca execution como dlq=true al agotar. `replay()` resetea execution. | Retry |
| 4.2 | Implement SchedulerService | `apps/api/src/modules/integration/scheduler/scheduler.service.ts` | BullMQ repeatable jobs. Formato cron con timezone. `schedule(connectorId, cronPattern)`. `unschedule(connectorId)`. Cada ejecución genera `executionId` para idempotencia. | Scheduler |
| 4.3 | Implement scheduler controller | `apps/api/src/modules/integration/scheduler/scheduler.controller.ts` | `POST /api/v1/integration/schedule`, `DELETE /api/v1/integration/schedule/:id`, `GET /api/v1/integration/schedule`. | Controller |
| 4.4 | Wire CoreModule | `apps/api/src/modules/core/core.module.ts` | Import `IntegrationModule` | Wiring |

**Expected Commands:**
```bash
pnpm --filter api lint
pnpm turbo build --filter=api
```

---

## Phase 5: Testing

**Objetivo:** Completar la cobertura de tests.

**Dependencias:** Phases 1–4

**Riesgo:** Medio. Doorbell tests requieren base de datos real.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 5.1 | Connector registry tests | `apps/api/src/modules/integration/connectors/__tests__/connector-registry.spec.ts` | register, get, getAll con connectors mock | Testing |
| 5.2 | IntegrationService tests | `apps/api/src/modules/integration/integration.service.spec.ts` | execute, replay, DLQ flow | Testing |
| 5.3 | OAuth provider tests | `apps/api/src/modules/integration/auth/__tests__/oauth-provider.spec.ts` | getAuthUrl genera state parameter único. handleCallback valida state correcto. handleCallback rechaza state inválido (anti-CSRF). refreshToken renueva access token. | Testing |
| 5.4 | ApiKey provider tests | `apps/api/src/modules/integration/auth/__tests__/api-key-provider.spec.ts` | validate, getHeaderName | Testing |
| 5.5 | RetryEngine tests | `apps/api/src/modules/integration/retry/__tests__/retry-engine.spec.ts` | exponential backoff, DLQ after max retries, replay reset | Testing |
| 5.6 | Scheduler tests | `apps/api/src/modules/integration/scheduler/__tests__/scheduler-service.spec.ts` | schedule, unschedule, executionId idempotency | Testing |
| 5.7 | Controller integration tests | `apps/api/test/integration/integration-platform.spec.ts` | CRUD connectors, execute, DLQ list + replay | Testing |
| 5.8 | Doorbell — cross-tenant isolation | `apps/api/test/doorbell/integration-cross-tenant-isolation.spec.ts` | Tenant A connectors no visibles para Tenant B | Testing |

**Expected Commands:**
```bash
pnpm --filter api test integration
pnpm --filter api lint
pnpm turbo build --filter=api
```

---

## Verify Readiness

### What Verify will check

| Area | Check |
|------|-------|
| **Working Set Accuracy** | ¿Todos los archivos del Working Set se crearon/modificaron? |
| **Architecture Compliance** | `Connector` interfaz respetada. OAuth con state anti-CSRF. |
| **Retry + DLQ** | Reintentos + DLQ + replay funcional |
| **Scheduler** | Cron format + idempotencia en scheduled jobs |
| **Auth** | OAuth callback con validación de state |

### Doorbell Tests Expected

| Test | File |
|------|------|
| Cross-tenant isolation | `integration-cross-tenant-isolation.spec.ts` |

---

## Resumen

| Métrica | Valor |
|---------|-------|
| **Fases** | 5 |
| **Tareas totales** | 26 |
| **Distribución** | Shared: 6 / Core: 5 / Auth+Webhooks: 4 / Scheduler+Retry: 4 / Testing: 8 |
| **Riesgo principal** | OAuth callback con state anti-CSRF requiere implementación cuidadosa |
| **Riesgo secundario** | BullMQ scheduler requiere Redis disponible |
| **Design respetado** | ✅ Íntegramente. Las 5 mejoras arquitectónicas incluidas. |
