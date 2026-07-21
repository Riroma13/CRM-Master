# Architecture Review — SPEC-0024: Monitoring & Observability

**Verdict: REJECTED**

## Blocking Issues

| # | Finding |
|---|---------|
| 🔴 #1 | **Infra feature freeze violation** — Prometheus + Grafana no están en docker-compose. ADR exception requerido. |
| 🔴 #2 | **Health endpoint collision** — Ya existe `GET /api/v1/health` en `health.controller.ts`. El diseño choca. |
| 🔴 #3 | **Global registration gap** — Interceptors en ObservabilityModule no cubren todos los routes. Falta `app.module.ts`. |
| 🔴 #4 | **`/metrics` bloqueado por auth** — Prometheus scrape sin auth → 401. Falta `@Public()`. |
| 🔴 #5 | **Schema changes sin ADR** — 3 modelos nuevos sin referencia a ADR. Violación AGENTS.md rule #8. |

## High Severity

| # | Finding |
|---|---------|
| 🟡 #6 | **pino migration sin plan** — Nadie adopta el logger. Inversión sin uso. |
| 🟡 #7 | **Custom alert engine redundante** — AlertManager ya hace esto con labels. |
| 🟡 #8 | **High-cardinality en route label** — `/workflows/:id` generaría series infinitas. |
| 🟡 #9 | **Prometheus polling anti-pattern** — Alertas vía HTTP Polling cada 60s. |
| 🟡 #10 | **SLOs definidos al revés** — Se recolecta todo sin saber qué se necesita. |

## Conditions for re-submission

1. ADR exception for Prometheus + Grafana infra + npm deps en Working Set
2. Integrar con HealthModule existente (no duplicar ruta)
3. Global registration via `APP_INTERCEPTOR` + `consumer.forRoutes('*')` en `app.module.ts`
4. `@Public()` en metrics controller
5. Referencia a ADR para nuevos modelos Prisma
6. Plan de migración pino para 3 módulos concretos
7. Reemplazar custom alert engine por AlertManager + webhook a SPEC-0016
8. Route normalization middleware para cardinalidad controlada
