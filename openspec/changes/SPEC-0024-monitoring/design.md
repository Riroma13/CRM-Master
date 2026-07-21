# Design: SPEC-0024 — Monitoring & Observability

> **Version template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Platform Baseline:** sdd-v2.1-baseline — infra exception granted per ADR-0024
> **Estado:** Refined (post Architecture Review)

---

## 1. Executive Summary

CRM-Master carece de observabilidad centralizada. No hay dashboards de
salud del sistema, métricas de rendimiento por módulo, tracing de requests,
alertas sobre fallos, ni logs estructurados consultables. Cada módulo
maneja errores y logs de forma independiente. Detectar una degradación
del servicio requiere revisar logs de múltiples contenedores manualmente.

**Monitoring & Observability Platform** proporciona métricas en tiempo real
sobre la salud de la plataforma, tracing de requests a través de módulos,
logs estructurados con búsqueda y alertas, dashboards de rendimiento por
tenant y por módulo, y alertas configurables sobre umbrales de error,
latencia y capacidad.

El impacto esperado es reducir el tiempo de detección y resolución de
incidencias, proporcionar visibilidad del rendimiento de la plataforma a
Ricardo (Mission Control), y establecer una base para SLA/SLOs.

**SLOs objetivo (MVP):** (a) API latency P99 < 500ms, (b) Error rate < 1%
de requests totales, (c) Uptime > 99.9%. Estos SLIs se definen primero y
conducen la selección de métricas a recolectar.

---

## 2. Technical Approach

La plataforma se organiza en cuatro capas:

1. **Metrics Collection** — recolecta métricas del sistema y de la aplicación
   (CPU, memoria, requests/s, latencia P50/P95/P99, errores/s, colas BullMQ,
   conexiones DB). Expone un endpoint `/metrics` en formato Prometheus con
   `@Public()` para permitir scrape sin autenticación. Las rutas se normalizan
   antes de registrar la label de ruta (UUIDs y números reemplazados por
   `:param`) para evitar cardinalidad alta.

2. **Structured Logging** — todos los módulos existentes se migran a un logger
   estructurado común que emite JSON con campos normalizados (timestamp, level,
   module, tenantId, correlationId, durationMs, error). Los logs se escriben
   a stdout y son recolectados por el sistema de logs. **Plan de migración
   gradual:** P0 = ObservabilityModule, P1 = CoreModule (main.ts bootstrap),
   P2 = WorkflowModule (SPEC-0015), NotificationModule (SPEC-0016),
   AuditModule (SPEC-0018).

3. **Health Checks** — el módulo existente `GET /api/v1/health`
   (`HealthModule`) se extiende con indicadores adicionales vía un
   `HealthService` que integra checks de Prometheus, BullMQ y Stripe.
   No se crea un nuevo controller ni una nueva ruta.

4. **Observability Dashboard** — dashboards predefinidos para: salud del
   sistema, rendimiento por módulo, actividad por tenant, colas BullMQ,
   errores, latencia. Para uso interno de Ricardo (Mission Control).

```
Application Metrics ──→ /metrics (Prometheus format, @Public)
     │
     ├──→ Prometheus ──→ Grafana Dashboard
     │
     ├──→ Prometheus AlertManager ──→ SPEC-0016 (webhook)
     │
Structured Logs ──→ stdout ──→ Vector/Datadog ──→ Log Search
     │
Health Checks ──→ /api/v1/health (existing HealthModule + new HealthService)
     │
     └──→ Observability API ──→ Mission Control UI
```

### SLIs que conducen la recolección de métricas

| SLI | Target | Métricas necesarias |
|-----|--------|-------------------|
| API latency P99 | < 500ms | `http_request_duration_ms` con quantiles |
| Error rate | < 1% | `http_requests_total{status=~"5.."}` ÷ total |
| Uptime | > 99.9% | Health check success rate, `up` metric |

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Metrics format | Prometheus, StatsD, OpenTelemetry, Custom | **Prometheus** | Estándar de la industria, soporte nativo en Node.js vía `prom-client`, fácil integración con Grafana. |
| Metrics storage | Prometheus Server, Thanos, In-memory, VictoriaMetrics | **Prometheus Server (local)** | Single instance para MVP. Infra exception per ADR-0024. |
| Logging backend | stdout + Vector, Filebeat + ES, Datadog | **stdout + Vector** | Sin dependencias de infraestructura nueva. Vector puede enviar a múltiples destinos (S3, Elasticsearch, Datadog). |
| Log format | JSON, Plain text, Structured | **JSON (pino)** | `pino` es el logger más rápido de Node.js. JSON permite parseo estructurado sin esquema fijo. |
| Tracing | OpenTelemetry, AWS X-Ray, Custom | **OpenTelemetry (deferred to v2)** | No en MVP. OpenTelemetry requiere instrumentación de cada módulo. MVP se enfoca en métricas y logs. |
| Alerting | Prometheus AlertManager, Custom engine, Sentry | **Prometheus AlertManager + SPEC-0016 webhook** | AlertManager es el estándar del ecosistema Prometheus. Recibe alertas vía reglas en prometheus.yml + rule files. Webhook entrega a Notification Center (SPEC-0016). Sin engine custom. |
| Health checks | NestJS @nestjs/terminus, Custom | **@nestjs/terminus** (extiende `HealthModule` existente) | Ya disponible para NestJS. Integra con el módulo existente en lugar de crear uno nuevo. |
| Route labels | Raw path, Normalized params | **Route normalization middleware** | UUIDs y números reemplazados por `:param` antes de registrar la label. Previene cardinalidad infinita. |
| Infra freeze | Exception required per Platform Baseline | **ADR-0024 granted exception** | Prometheus + Grafana no existen en docker-compose actual. ADR-0024 documenta alcance y condiciones. |
| Schema changes | ADR required per AGENTS.md rule #8 | **Referenced in ADR-0024** | Los modelos `AlertRule`, `AlertEvent`, `HealthCheckLog` están cubiertos por ADR-0024. |

---

## 4. Data Flow

```
Collect metrics:

Prometheus → GET /metrics (every 15s, @Public())
       │
       ├── prom-client registry collects:
       │     ├── http_requests_total{method, route:normalized, status, module}
       │     ├── http_request_duration_ms{method, route:normalized, quantile}
       │     ├── bullmq_queue_depth{queue}
       │     ├── db_connection_pool_size
       │     ├── active_tenants
       │     └── module_errors_total{module, error_type}
       │
       └── Return Prometheus format text

Route normalization (before metrics recording):

Incoming: /workflows/abc-123 → route label: /workflows/:param
Incoming: /api/v1/tenants/42  → route label: /api/v1/tenants/:param
Incoming: /api/v1/health      → route label: /api/v1/health (unchanged)

Health check (extends existing endpoint):

HealthModule (existing) → GET /api/v1/health
       │
       ├── HealthService (new, provides additional indicators):
       │     ├── Prometheus: check if /metrics responds
       │     ├── BullMQ: queue status via Queue#getJobCounts
       │     └── Stripe: API check via Stripe health endpoint
       │
       ├── Aggregates with existing DB + Redis checks
       └── Return { status, checks: [{ name, status, latency }] }

Alerting (AlertManager native):

Prometheus alerting rules (prometheus.yml + .rule files)
       │
       ├── Rule: HighErrorRate → expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
       ├── Rule: HighLatency   → expr: http_request_duration_ms{p99} > 500
       ├── Rule: ServiceDown   → expr: up == 0
       │
       ├── When threshold breached → AlertManager
       │     ├── AlertManager deduplicates, groups, throttles
       │     ├── Webhook → SPEC-0016 (Notification Center)
       │     └── AlertEvent logged to DB for audit trail
       │
       └── Resolved → AlertManager sends recovery

Global registration:

- MetricsInterceptor: registered via APP_INTERCEPTOR in app.module.ts
  (covers ALL routes, not just ObservabilityModule routes)
- LoggingMiddleware: registered via consumer.forRoutes('*') in app.module.ts
  (covers ALL requests, not module-scoped)
```

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/shared/src/observability/metrics.ts` | Create | Metric names, labels, Prometheus registry setup |
| 2 | `packages/shared/src/observability/logging.ts` | Create | Pino logger setup, log levels, serializers |
| 3 | `packages/shared/src/observability/health.types.ts` | Create | HealthCheckResult, HealthIndicator types |
| 4 | `packages/shared/src/observability/alert.types.ts` | Create | AlertEvent types (simplified — no AlertRule CRUD, no AlertingEngine) |
| 5 | `packages/shared/src/observability/index.ts` | Create | Re-export |
| 6 | `apps/api/src/modules/observability/observability.module.ts` | Create | NestJS module |
| 7 | `apps/api/src/modules/observability/metrics/metrics.controller.ts` | Create | `GET /metrics` endpoint with `@Public()` |
| 8 | `apps/api/src/modules/observability/metrics/metrics.interceptor.ts` | Create | HTTP metrics interceptor (route normalization included) |
| 9 | `apps/api/src/modules/observability/metrics/route-normalization.middleware.ts` | Create | Normalize parameterized path segments before metrics recording |
| 10 | `apps/api/src/modules/observability/logging/logging.middleware.ts` | Create | Request logging middleware (correlationId, duration) |
| 11 | `apps/api/src/modules/observability/logging/pino-logger.ts` | Create | Pino logger service |
| 12 | `apps/api/src/modules/observability/health/health.service.ts` | Create | Provides additional health indicators to existing HealthModule |
| 13 | `apps/api/src/app.module.ts` | Modify | Register MetricsInterceptor as APP_INTERCEPTOR, LoggingMiddleware as global middleware |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 14 | `apps/api/src/modules/infrastructure/infrastructure.module.ts` | Modify | Import ObservabilityModule (follows infra pattern) |
| 15 | `apps/api/src/modules/health/health.module.ts` | Modify | Import HealthService, wire additional indicators |
| 16 | `apps/api/src/modules/health/health.controller.ts` | Modify | Accept HealthService injections for extended checks |

### 5.3 Migration Tasks (pino adoption)

| # | Module | Priority | Action | Timing |
|---|--------|----------|--------|--------|
| 17 | ObservabilityModule (itself) | P0 | Replace console.log with PinoLogger | Within SPEC-0024 |
| 18 | `main.ts` (CoreModule bootstrap) | P1 | Replace NestJS Logger with PinoLogger | Within SPEC-0024 |
| 19 | WorkflowModule (SPEC-0015) | P2 | Migrate to PinoLogger | Post SPEC-0024 |
| 20 | NotificationModule (SPEC-0016) | P2 | Migrate to PinoLogger | Post SPEC-0024 |
| 21 | AuditModule (SPEC-0018) | P2 | Migrate to PinoLogger | Post SPEC-0024 |

### 5.4 Infrastructure & Dependencies

| # | Item | Type | Action |
|---|------|------|--------|
| 22 | `prom-client` | npm dep | Add to `packages/shared/package.json` |
| 23 | `pino` | npm dep | Add to `packages/shared/package.json` |
| 24 | `@nestjs/terminus` | npm dep | Add to `apps/api/package.json` |
| 25 | `pino-pretty` | npm devDep | Add to `apps/api/package.json` (dev) |
| 26 | Prometheus service | docker-compose | New service with rule files volume |
| 27 | Grafana service | docker-compose | New service with provisioning dirs |
| 28 | Prometheus alert rule files | config | Create `infra/prometheus/rules/` directory |

### 5.5 Expected NOT to Change

- Módulos de negocio — solo añadir logger y métricas, no modificar lógica
- Frontend — SPEC separada (Mission Control dashboard)
- CoreModule — ObservabilityModule se importa en InfrastructureModule, no en CoreModule

---

## 6. Read Order

1. `packages/shared/src/observability/metrics.ts` — métricas
2. `packages/shared/src/observability/logging.ts` — logging
3. `packages/shared/src/observability/health.types.ts` — health types
4. `apps/api/src/modules/observability/metrics/metrics.interceptor.ts` — interceptor (con route normalization)
5. `apps/api/src/modules/observability/metrics/route-normalization.middleware.ts` — normalización
6. `apps/api/src/modules/observability/logging/logging.middleware.ts` — middleware
7. `apps/api/src/modules/observability/health/health.service.ts` — health service

---

## 7. Expected Commands

```bash
# Install new dependencies
pnpm install

# Prometheus + Grafana (new services, infra exception ADR-0024)
docker compose up -d prometheus grafana

# Migration
pnpm --filter database prisma migrate dev --name add_observability

# Test
pnpm --filter api test observability
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** High

Prometheus + Grafana es el stack de observabilidad más usado en la industria.
`pino` es el logger estándar para Node.js. `@nestjs/terminus` es mantenido
por el equipo de NestJS. La instrumentación de métricas vía interceptors
es un patrón probado. El reemplazo del alert engine custom por AlertManager
elimina complejidad y sigue el ecosistema Prometheus. La integración con el
`HealthModule` existente evita colisión de rutas.

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 3 | Patrones de middleware, interceptors existentes |
| Files to read | 4 | NestJS lifecycle, terminus docs, prom-client API |
| Files to create | 10 | Module, metrics, health service, logging, types, route normalization |
| Files to modify | 4 | app.module.ts, infrastructure.module.ts, health.module.ts, health.controller.ts |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| prom-client memoria crece con labels cardinalidad alta | Media | Alto | Route normalization middleware reemplaza UUIDs/números por `:param`. Labels limitadas a valores conocidos. |
| Pino logger en modo desarrollo consume más CPU | Baja | Bajo | `sync: false` en producción. Log level configurable por env. |
| Health checks falsos positivos por timeouts de red | Baja | Medio | Timeout configurable por check. Degraded status (200 + warning) en vez de 503. |
| Alertas ruidosas por umbrales mal configurados | Media | Medio | AlertManager grouping y throttling integrados. Cooldown vía `repeat_interval` en rule files. |
| Route normalization no cubre todos los patrones de ruta | Baja | Medio | Regex configurable. Tests de cobertura para patrones conocidos (UUID, ObjectId, números). |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Metrics | Registry setup, label cardinality, interceptor timing, route normalization | Jest |
| Unit — Logging | JSON format, correlationId propagation, error serialization | Jest |
| Unit — Health | Check aggregation via HealthService, timeout handling, degraded status | Jest |
| Integration — API | /metrics format (public, Prometheus content-type), /health extended response | supertest |
| Integration — Alert | AlertManager webhook receipt, AlertEvent persistence | supertest + mock |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `observability-scoping.spec.ts` | Metrics don't leak tenant data. /metrics is public (no auth required). |
| `observability-route-normalization.spec.ts` | High-cardinality routes are normalized before metric recording. |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0024 | Formal exception for infra feature freeze: Prometheus + Grafana services, npm deps (`prom-client`, `pino`, `@nestjs/terminus`, `pino-pretty`), and new Prisma models (`AlertRule`, `AlertEvent`, `HealthCheckLog`). | Proposed |

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| Metrics collection & exposition | ObservabilityModule | Recolectar y exponer métricas del sistema en `/metrics` (@Public) |
| Structured logging | ObservabilityModule | Logger común para todos los módulos (pino, migración gradual) |
| Health indicators (extended) | HealthService (en ObservabilityModule) | Indicadores adicionales para el HealthModule existente |
| Alert rule definition | Prometheus (rule files) | Reglas en `prometheus.yml` + `.rule` files, no en DB |
| Alert dispatch | AlertManager | Deduplicación, grouping, throttling. Webhook → SPEC-0016. |
| Metrics storage & query | Prometheus | Almacenamiento y consulta de series temporales |
| Dashboard rendering | Grafana | Visualización de dashboards (provisioned as code) |

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| Distributed tracing | OpenTelemetry SDK + exporter. Nueva capa sobre el logging middleware. | Weeks |
| Custom Prometheus exporter | Nuevo `MetricsCollector` para métricas de negocio (workflows/tenant, etc.) | Days |
| Log aggregation (Elasticsearch) | Vector envía logs a ES. Sin cambios en la aplicación. | Days |
| SLO/SLI tracking dashboard | Nuevo dashboard en Grafana sobre métricas existentes. | Days |
| Tenant-facing alerts | Nuevo webhook route in AlertManager → tenant notification queue. | Days |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× (100 req/s, 10 modules) | 100× (1000 req/s, 50 modules) | Mitigation |
|--------|------------------------------|-------------------------------|------------|
| Metrics endpoint | <5ms | <20ms | prom-client uses shared registry. Route normalization reduces label cardinality. |
| Log volume | ~10MB/día | ~100MB/día | Pino es ~2× más rápido que Winston. stdout sin bloqueo. |
| Health checks | <50ms agregado | <200ms | Checks paralelos. Timeout individual de 5s. |
| Alert evaluation | Native (Prometheus) | Native (Prometheus) | Sin engine custom. AlertManager escala horizontalmente. |

**Decision:** El observability stack escala horizontalmente. Prometheus single instance es suficiente para MVP. AlertManager nativo elimina cuello de botella del alert engine custom.

### B. Open/Closed Principle (OCP)

**Point of extension:** `MetricsCollector`, `HealthIndicator`.

**What must change to add a new metric:** Crear `MetricsCollector` que registra métricas en el registry compartido. Cero cambios en el metrics controller.

**What must change to add a new health check:** Implementar `HealthIndicator` interface + registrar en `HealthService`. Cero cambios en el health controller (existe).

**What must change to add a new alert rule:** Añadir regla en archivo `.rule` de Prometheus. Cero cambios en la aplicación.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| Application metrics | ObservabilityModule | Prometheus, Grafana |
| Logs | ObservabilityModule (pino format) | stdout → Vector → external |
| Health status | HealthModule + HealthService | Mission Control, Caddy (load balancer) |
| Alert rules | Prometheus (rule files) | AlertManager, Notification Center |
| Alert events (history) | ObservabilityModule (AlertEvent model) | Mission Control audit |
| Metrics storage | Prometheus | Grafana |
| Dashboards | Grafana | Mission Control |

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| Prometheus metrics | 15 días (local) | — | Configurable en prometheus.yml |
| Logs (stdout) | 30 días (Docker) | — | Depende del log driver |
| Alert events | 90 días | — | Eliminar >90 días |
| Health check history | 7 días | — | Eliminar >7 días |

### E. Idempotency

| Operation | Duplicate risk | Protection |
|-----------|---------------|------------|
| `incrementMetric()` | Alta (concurrente) | Prometheus client handlea concurrencia internamente. |
| `healthCheck()` | Ninguna | Read-only. Sin efectos secundarios. |
| AlertManager webhook | Baja | AlertManager maneja deduplicación. Events con UPSERT por `(alertName, startsAt)`. |

### F. Shared Contracts

| Contract | Location | Consumers |
|----------|----------|-----------|
| `MetricRegistry` | `packages/shared/src/observability/` | MetricsController, MetricsCollectors |
| `PinoLogger` | `packages/shared/src/observability/` | All modules (via injection, migración gradual) |
| `HealthCheckResult` | `packages/shared/src/observability/` | HealthController, HealthService |
| `AlertEvent` | `packages/shared/src/observability/` | ObservabilityModule (AlertManager webhook receiver) |

### G. Partitioning Strategy

Las métricas de Prometheus se almacenan en TSDB local (sin partición). Los `alert_events` se particionan por mes. Los `health_check_logs` se particionan por semana.

---

## 16. Interfaces / Contracts

```typescript
// ─── Metrics ───────────────────────────────────────

export interface MetricsInterceptorOptions {
  collectHttpMetrics?: boolean;
  collectBullMetrics?: boolean;
  collectDbMetrics?: boolean;
}

export interface HttpMetricLabels {
  method: string;
  /** Ruta normalizada: UUIDs y números reemplazados por :param */
  route: string;
  statusCode: number;
  module: string;
}

// ─── Route Normalization ───────────────────────────

/**
 * Normaliza segmentos de ruta que son UUIDs o números
 * antes de registrar la label de métrica.
 *
 * Ejemplos:
 *   /workflows/abc-123-def → /workflows/:param
 *   /api/v1/tenants/42     → /api/v1/tenants/:param
 *   /api/v1/health         → /api/v1/health (sin cambios)
 */
export function normalizeRoute(path: string): string;

// ─── Logging ───────────────────────────────────────

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  tenantId?: string;
  correlationId?: string;
  durationMs?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

// ─── Health ────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthIndicatorResult {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckResult {
  status: HealthStatus;
  checks: HealthIndicatorResult[];
  uptime: number;
  timestamp: string;
}

export interface HealthIndicator {
  readonly name: string;
  check(): Promise<HealthIndicatorResult>;
}

// ─── Alerting (simplified — no AlertRule CRUD, no AlertingEngine) ──

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'firing' | 'resolved' | 'acknowledged';

/**
 * AlertEvent recibido vía webhook de AlertManager.
 * Las reglas de alerta se definen en archivos .rule de Prometheus,
 * NO en la base de datos. PromQL no es configurable por el usuario
 * para prevenir inyección.
 */
export interface AlertEvent {
  id: string;
  alertName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  value: number;
  threshold: number;
  message: string;
  startedAt: string;
  resolvedAt?: string;
  labels: Record<string, string>;  // Labels de AlertManager (severity, module, tenant)
  annotations: Record<string, string>; // Annotations de AlertManager (summary, description)
}
```

> **/metrics auth:** El endpoint `GET /metrics` está decorado con `@Public()`
> para permitir que Prometheus scrape sin autenticación. No expone datos
> de tenant; solo métricas agregadas del sistema.

> **PromQL injection:** Las expresiones PromQL se definen exclusivamente en
> archivos de reglas de Prometheus (`prometheus.yml` + `.rule` files). No
> se almacenan en la base de datos ni son configurables por el usuario.
> El modelo `AlertRule` en Prisma es solo metadata de referencia.

```prisma
// ─── AlertEvent (received from AlertManager webhook) ──
model AlertEvent {
  id          String   @id @default(uuid())
  alertName   String   @map("alert_name")
  severity    String
  status      String   @default("firing") // firing | resolved | acknowledged
  value       Float?
  threshold   Float?
  message     String?
  labels      Json     // Labels from AlertManager
  annotations Json     // Annotations from AlertManager
  startedAt   DateTime @map("started_at")
  resolvedAt  DateTime? @map("resolved_at")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([startedAt(sort: Desc)])
  @@index([status, severity])
  @@map("alert_events")
}

// ─── HealthCheckLog ────────────────────────────────
model HealthCheckLog {
  id         String   @id @default(uuid())
  status     String   // healthy | degraded | unhealthy
  summary    String?
  checks     Json     // HealthIndicatorResult[]
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([createdAt(sort: Desc)])
  @@map("health_check_logs")
}
```

---

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Add observability tables + migration (ADR-0024) | Bajo | `DROP TABLE` |
| 2 | Create shared contracts + logger setup | Bajo | Revertir commit |
| 3 | Implement MetricsController + MetricsInterceptor + route normalization | Bajo | Sin dashboard configurado, no hay impacto |
| 4 | Implement HealthService, extend existing HealthModule | Bajo | Endpoint existente, cambios no rompen API |
| 5 | Implement logging middleware (pino) — P0: ObservabilityModule | Medio | Middleware nuevo, módulos existentes siguen con console.log |
| 6 | Replace NestJS Logger in main.ts — P1: CoreModule bootstrap | Bajo | Logger bootstrap solo afecta startup |
| 7 | Register MetricsInterceptor as APP_INTERCEPTOR + middleware in app.module.ts | Bajo | Quitar del imports si hay problema |
| 8 | Wire ObservabilityModule in InfrastructureModule | Bajo | Quitar del imports |
| 9 | Add Prometheus + Grafana + rule files to docker-compose (ADR-0024) | Bajo | Comentar servicios |
| 10 | Post-SPEC: migrate WorkflowModule (SPEC-0015) to PinoLogger — P2 | Medio | Revertir import de PinoLogger |
| 11 | Post-SPEC: migrate NotificationModule (SPEC-0016) to PinoLogger — P2 | Medio | Revertir import de PinoLogger |
| 12 | Post-SPEC: migrate AuditModule (SPEC-0018) to PinoLogger — P2 | Medio | Revertir import de PinoLogger |

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿Prometheus + Grafana en docker-compose o como servicios externos? | Resolved | docker-compose para MVP. Infra exception per ADR-0024. Externo para producción (Grafana Cloud o self-hosted). |
| 2 | ¿Migrar todos los módulos existentes a pino en esta SPEC o gradual? | Resolved | Gradual: P0 en SPEC-0024 (ObservabilityModule + main.ts), P2 en SPECs posteriores. Working Set documenta plan. |
| 3 | ¿Alertas enviadas solo a Mission Control o también a tenants? | Resolved | Solo internas en MVP (Mission Control vía AlertManager → SPEC-0016). Alertas a tenants en v2. |
| 4 | ¿SLA/SLO tracking en MVP o en v2? | Resolved | SLIs definidos en MVP (latencia P99 < 500ms, error rate < 1%, uptime > 99.9%). Tracking dashboard en Grafana. SLO agreement formal en v2. |
| 5 | ¿Alert engine custom o AlertManager? | Resolved | AlertManager nativo. Alert rules en prometheus.yml + .rule files. Sin engine custom. |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Refinado post Architecture Review.
