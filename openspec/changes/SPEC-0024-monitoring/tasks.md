# Tasks: SPEC-0024 — Monitoring & Observability

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900–1100 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (shared) → PR 2 (metrics) → PR 3 (logging) → PR 4 (health) → PR 5 (alerting+infra) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Focused test | Harness | Rollback |
|------|------|----|-------------|---------|----------|
| 1 | Shared contracts + deps + Prisma schema | PR 1 | `pnpm --filter shared test observability` | `pnpm turbo build --filter=shared` | `packages/shared/src/observability/` |
| 2 | Metrics: controller, interceptor, normalize | PR 2 | `pnpm --filter api test metrics` | `curl localhost:3000/metrics` | `apps/api/.../observability/metrics/` |
| 3 | Pino logger + middleware + P0 migration | PR 3 | `pnpm --filter api test logging` | Check JSON stdout format | `apps/api/.../observability/logging/` |
| 4 | HealthService + HealthModule wire | PR 4 | `pnpm --filter api test health` | `curl localhost:3000/api/v1/health` | `apps/api/.../observability/health/` |
| 5 | Alerting + docker-compose + infra wire | PR 5 | `pnpm --filter api test alert` | `docker compose ps` | `infra/prometheus/` + compose services |

## Phase 1: ADR + Infra + Deps

- [ ] 1.1 Draft ADR-0024: infra exception, Prisma models, npm deps
- [ ] 1.2 Add `prom-client`, `pino` to packages/shared/package.json
- [ ] 1.3 Add `@nestjs/terminus`, `pino-pretty` to apps/api/package.json
- [ ] 1.4 Add AlertEvent + HealthCheckLog to Prisma schema + run migrate
- [ ] 1.5 Add Prometheus + Grafana services to docker-compose.yml
- [ ] 1.6 Create `infra/prometheus/rules/` directory with alert rule files

## Phase 2: Shared Contracts (RED → GREEN)

- [ ] 2.1 RED: `normalizeRoute` replaces UUIDs/numbers with `:param`; leaves static paths
- [ ] 2.2 Create `metrics.ts`: MetricRegistry, normalizeRoute, HttpMetricLabels
- [ ] 2.3 Create `logging.ts`: LogEntry, Logger interface
- [ ] 2.4 Create `health.types.ts`: HealthStatus, HealthIndicator, HealthCheckResult
- [ ] 2.5 Create `alert.types.ts`: AlertEvent (simplified — no CRUD, no engine)
- [ ] 2.6 Create `index.ts`: re-exports in packages/shared/src/observability/

## Phase 3: Structured Logging (RED → GREEN)

- [ ] 3.1 RED: PinoLogger outputs JSON with level, module, correlationId; serializes errors with stack
- [ ] 3.2 Create `pino-logger.ts` service
- [ ] 3.3 Create `logging.middleware.ts` (correlationId injection, duration tracking)
- [ ] 3.4 RED: ObservabilityModule logs use structured JSON (P0 migration)
- [ ] 3.5 P0: replace console.log in ObservabilityModule with PinoLogger injection

## Phase 4: Metrics (RED → GREEN)

- [ ] 4.1 RED: Doorbell `observability-scoping.spec.ts` — /metrics is @Public(), no tenant data leak
- [ ] 4.2 RED: Doorbell `observability-route-normalization.spec.ts` — route labels normalized
- [ ] 4.3 RED: MetricsInterceptor records timing + labels; high-cardinality blocked by normalization
- [ ] 4.4 Create `route-normalization.middleware.ts`
- [ ] 4.5 Create `metrics.interceptor.ts`
- [ ] 4.6 Create `metrics.controller.ts` (GET /metrics, @Public(), Prometheus Content-Type)
- [ ] 4.7 Create `observability.module.ts`
- [ ] 4.8 Modify `app.module.ts`: register APP_INTERCEPTOR + global middleware

## Phase 5: Health (RED → GREEN)

- [ ] 5.1 RED: HealthService returns degraded (200 + warning) on timeout; aggregates Prometheus, BullMQ, Stripe
- [ ] 5.2 Create `health.service.ts` with three health indicators
- [ ] 5.3 Modify `health.module.ts`: wire HealthService into existing checks
- [ ] 5.4 Modify `infrastructure.module.ts`: import ObservabilityModule

## Phase 6: Alerting (RED → GREEN)

- [ ] 6.1 RED: Alert webhook deduplicates by (alertName, startedAt); no promql in DB
- [ ] 6.2 Create Prometheus .rule files (HighErrorRate, HighLatency, ServiceDown)
- [ ] 6.3 Create AlertManager webhook receiver endpoint
- [ ] 6.4 Wire AlertEvent persistence via Prisma

## Phase 7: Migration P1 (RED → GREEN)

- [ ] 7.1 RED: Bootstrap logger outputs structured JSON at startup
- [ ] 7.2 Replace NestJS Logger in `main.ts` with PinoLogger
