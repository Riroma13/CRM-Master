# Architecture Review — SPEC-0023: Billing & Subscription

**Verdict: REJECTED**

## Blocking Issues

| # | Finding |
|---|---------|
| 🔴 #1 | **Plan limit enforcement sin diseño** — `plan-limits.service.ts` listado pero sin detalle. ¿Hard block? ¿Soft warning? ¿Sync? ¿Async? |

## High Severity

| # | Finding |
|---|---------|
| 🟡 #2 | **Trial → Paid conversion saga** — 3 pasos (Stripe customer → payment method → subscription). Si falla a medio camino, el tenant queda en limbo. |
| 🟡 #3 | **Webhook security** — timestamp freshness, process queue, signature enforcement a nivel de guard. |
| 🟡 #4 | **Metering accuracy** — Cumulative vs incremental sin definir. Lag de AnalyticsDataset causa sub-reporte. |
| 🟡 #5 | **Stripe SPOF** — Sin degraded mode. Si Stripe está caído, no se generan facturas. |
| 🟡 #6 | **State machine incompleta** — Faltan estados (pending, grace_period, suspended). Sin matriz de transiciones ni upgrade/downgrade. |

## Conditions for re-submission

1. Diseñar enforcement layer: puntos de enforcement, comportamiento por métrica, sync vs async
2. Añadir matriz de transiciones de estado con upgrade/downgrade proration
3. Mandar `stripe.webhooks.constructEvent()` a nivel de controller guard
4. Especificar cumulative vs incremental metering + finalización de período
