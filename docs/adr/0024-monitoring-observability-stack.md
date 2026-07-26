# ADR 0024: Monitoring & Observability Stack Exception

**Status:** Proposed
**Date:** 2026-07-20
**Driver:** SPEC-0024 Monitoring & Observability
**Reviewer:** Pending Architecture Review

## Context

Platform Baseline (AGENTS.md rule #14) declares infrastructure as feature-frozen.
SPEC-0024 requires Prometheus + Grafana as new infrastructure services not
present in the current docker-compose, and four new npm dependencies
(`prom-client`, `pino`, `@nestjs/terminus`, `pino-pretty`).

Additionally, the design introduces three new Prisma models (`AlertRule`,
`AlertEvent`, `HealthCheckLog`), which require ADR coverage per AGENTS.md rule #8.

## Decision

Grant a **formal exception** to the infrastructure feature freeze for the
following additions:

### New infrastructure services (docker-compose)

| Service | Purpose | Scope |
|---------|---------|-------|
| Prometheus | Metrics storage, querying, alerting rules | SPEC-0024 only |
| Grafana | Dashboard rendering, AlertManager integration | SPEC-0024 only |

### New npm dependencies (package.json)

| Package | Purpose | Scope |
|---------|---------|-------|
| `prom-client` | Prometheus metrics registry and exposition | `packages/shared` |
| `pino` | Structured JSON logging | `packages/shared` |
| `@nestjs/terminus` | Standardized health check framework | `apps/api` |
| `pino-pretty` | Development log formatting | `apps/api` (dev) |

### New Prisma models (schema.prisma)

| Model | Purpose | Reference in Design |
|-------|---------|---------------------|
| `AlertRule` | Prometheus alerting rule metadata (read from rule files, not user-configurable) | Section 16 |
| `AlertEvent` | Alert fire history from AlertManager webhook | Section 16 |
| `HealthCheckLog` | Health check result history | Section 16 |

### Nuance: `AlertRule` model scope

The `AlertRule` Prisma model stores **read-only references** to Prometheus
alerting rule files; it does NOT store editable PromQL expressions. PromQL
expressions are defined exclusively in `prometheus.yml` + rule files to
prevent injection risk. The model tracks metadata (name, severity, status)
for audit trail and dashboard display.

## Rationale

1. **No viable alternative**: The Prometheus + Grafana stack is the most
   widely adopted open-source observability solution. No existing
   infrastructure service (Caddy, PostgreSQL) can substitute for metrics
   TSDB or dashboard rendering.

2. **Minimal surface**: Only 2 new services + 4 packages. Prometheus and
   Grafana are self-contained (no additional DB, no external dependencies).

3. **Industry standard**: `prom-client` (12M+ weekly downloads), `pino`
   (25M+ weekly downloads), `@nestjs/terminus` (official NestJS package).

4. **Prisma models are audit/logging tables**: No business logic, no
   tenant data. Safe addition under controlled scope.

## Rejection criteria (triggers for re-evaluation)

- Adding more than 2 new infrastructure services beyond Prometheus + Grafana
- Any dependency that requires a commercial license or external API key
- PromQL expression storage becoming user-configurable (injection risk)
- Any Prisma model outside the observability domain

## Consequences

- This exception does NOT lift the infrastructure freeze for any other SPEC
- All new services must be added to `docker-compose.yml` with resource limits
- Grafana dashboards must be provisioned as code (automatic, not manual)
- `AlertRule` model must NOT store user-editable PromQL
