# Archive Report — SPEC-0024 Monitoring & Observability

Date: 2026-07-20
PRs: 4 (PR-1 through PR-4)

## Delivered

### PR-1: Shared contracts + Metrics module
- `packages/shared/src/observability/` — types, index, re-exports
- ObservabilityModule (NestJS)
- MetricsController (`GET /metrics`, @Public)
- MetricsInterceptor (HTTP metrics collection)
- RouteNormalizationMiddleware (UUID/number → :param)
- MetricsInterceptor registered as APP_INTERCEPTOR in app.module.ts

### PR-2: Health + Logging
- HealthService (Prometheus, BullMQ, Stripe indicators)
- LoggingMiddleware (correlationId, duration, structured logs)
- PinoLoggerService (Pino-based LoggerService implementation)
- Correlation context (AsyncLocalStorage)
- HealthModule extended with HealthService
- LoggingMiddleware + RouteNormalizationMiddleware registered in app.module.ts

### PR-3: Infrastructure wiring
- InfrastructureModule imports ObservabilityModule
- Prisma schema: AlertRule, AlertEvent, HealthCheckLog models
- ADR-0024: Monitoring & Observability Stack (infra exception)
- docker-compose: Prometheus + Grafana services
- HealthController wired with extended checks

### PR-4: Alerting + Pino migration + Verify/Archive
- AlertService (createAlertEvent, resolveAlert, listAlerts, getAlertRules)
- AlertWebhookController (`POST /api/v1/observability/alerts/webhook`)
- Prometheus config: prometheus.yml + platform.rules.yml
- Pino migration: WorkflowService, NotificationsService, NotificationRemindersService, AuditService
- ObservabilityModule marked @Global()

## Files Created
- `packages/shared/src/observability/` (7 files)
- `apps/api/src/modules/observability/` (12 files)
- `packages/config/prometheus/prometheus.yml`
- `packages/config/prometheus/rules/platform.rules.yml`
- `docs/adr/0024-monitoring-observability-stack.md`
- `docs/architecture/adr/ADR-0024-monitoring-observability.md`

## Files Modified
- `apps/api/src/app.module.ts` — APP_INTERCEPTOR, middleware registration
- `apps/api/src/modules/infrastructure/infrastructure.module.ts` — import ObservabilityModule
- `apps/api/src/modules/health/health.module.ts` — HealthService import
- `apps/api/src/modules/health/health.controller.ts` — extended checks
- `apps/api/src/modules/workflow/workflow.service.ts` — Pino migration
- `apps/api/src/modules/notifications/notifications.service.ts` — Pino migration
- `apps/api/src/modules/notifications/notification-reminders.service.ts` — Pino migration
- `apps/api/src/modules/audit/audit.service.ts` — Pino migration
- `packages/database/prisma/schema.prisma` — new models
- `packages/shared/src/index.ts` — observability re-exports
- `apps/api/src/main.ts` — PinoLogger bootstrap
- `apps/api/package.json` — pino-pretty devDep

## Tests
- All observability tests: 58 passed
- All affected module tests (workflow, audit, notifications): 180 passed
- Pre-existing failures: 4 suites (unchanged)

## Architecture Decisions
- ADR-0024: Formal infra exception for Prometheus + Grafana + new models
- Metrics exposed @Public (no auth, no tenant data)
- Route normalization prevents high cardinality labels
- @Global() ObservabilityModule for cross-module logger injection
