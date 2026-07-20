# Design: SPEC-0023 — Billing & Subscription

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Platform Baseline:** sdd-v2.1-baseline
> **Estado:** Refined (Architecture Review: REJECTED → re-submitted)

---

## 1. Executive Summary

CRM-Master no tiene un sistema de facturación ni gestión de suscripciones.
Los tenants se crean manualmente, no hay planes, no hay métricas de uso,
no hay facturación recurrente, no hay trials, no hay downgrades/upgrades.
Cada tenant nuevo requiere intervención administrativa.

**Billing & Subscription Platform** gestiona el ciclo de vida completo de
la relación comercial con cada tenant: planes, suscripciones, métricas de
uso, facturación recurrente, trials, upgrades, downgrades, cancellations,
y facturación por excesos (overage). Se integra con un procesador de pagos
externo (Stripe) para la captura de pagos, pero mantiene el modelo de
suscripción y métricas en la base de datos del plataforma.

El impacto esperado es automatizar la gestión comercial de tenants, permitir
modelos de negocio basados en suscripciones con métricas de uso, eliminar
la intervención manual en el ciclo de vida de los tenants.

---

## 2. Technical Approach

El Billing Platform se organiza en seis capas:

1. **Plan Catalog** — define los planes disponibles (gratuito, básico,
   profesional, enterprise). Cada plan tiene: límites de recursos, métricas
   incluidas, precio base, precio por overage, período de facturación.

2. **Subscription Engine** — gestiona suscripciones por tenant. Soporta
   trials, upgrades, downgrades, cancellations, reactivaciones. Cada
   suscripción tiene: plan, estado, fechas de facturación, métricas de uso.

3. **Metering Engine** — captura métricas de uso por tenant (workflows
   ejecutados, documentos almacenados, notificaciones enviadas, API calls,
   plugins instalados, etc.). Acumula contadores por período de facturación.

4. **Invoice Engine** — genera facturas al cierre del período. Calcula:
   cargo base del plan, overages por métricas que exceden el límite del plan,
   descuentos, impuestos. Las facturas son persistidas y exportables.

5. **Payment Gateway Integration** — se integra con Stripe para: crear
   customer, suscribir a precio, actualizar cantidad, gestionar métodos de
   pago, recibir webhooks de eventos de pago (invoice.paid, payment_failed,
   subscription.updated, etc.). Incluye circuit breaker para degraded mode.

6. **Billing API** — expone endpoints para: consultar plan actual, métricas
   de uso, facturas, métodos de pago. Endpoints administrativos para:
   gestionar planes, forzar facturación, ajustar métricas.

Adicionalmente, una capa transversal:

7. **Plan Limits Enforcement** — evalúa límites del plan en puntos de
   enforcement síncronos y asíncronos. Separa hard limits (bloquean la
   operación) de soft limits (alertan y facturan overage).

```
Plan Catalog ──→ Subscription Engine ──→ Metering Engine
                      │                       │
                      │  usage metrics         │
                      ▼                       ▼
                 Invoice Engine ←──── Usage Aggregator
                      │
                      ▼
              Payment Gateway (Stripe)
                      │
              Webhook events → Subscription Engine
                      │
              BullMQ Queue (billing:stripe-webhooks)
```

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Payment processor | Stripe, Paddle, Chargebee, In-house | **Stripe** | Estándar de la industria, webhooks maduros, API idempotente, soporte para suscripciones y facturación recurrente. |
| Metering storage | Stripe usage records, In-house DB, Mixpanel | **In-house DB (usage_meters table)** | Stripe usage records tienen latencia y límites de API. In-house permite consultas en tiempo real y facturación por excesos sin depender de Stripe. |
| Invoice storage | Stripe-hosted, In-house + Stripe | **In-house + Stripe** | La factura legal se almacena en DB del plataforma. Stripe es el procesador de pagos. Ambas tienen copia para reconciliación. |
| Subscription state machine | Stripe-managed, In-house + webhooks | **In-house + Stripe webhooks** | La fuente de verdad es la DB del plataforma. Stripe webhooks actualizan el estado. Reconciliation periódica para detectar desviaciones. |
| Usage aggregation | Real-time, Batch (cron), Hybrid | **Batch (cron cada hora)** | Las métricas de uso se agregan cada hora desde los AnalyticsDataset (SPEC-0019). Consultas en tiempo real sobre datos agregados, no raw. |
| Trial management | Stripe trial, In-house trial | **In-house trial** | El trial se gestiona en el plataforma. Stripe solo se involucra al convertir a paid. Evita costos de Stripe para trials gratuitos. |
| Metering accuracy | Cumulative (SUM), Incremental (delta) | **Cumulative via UPSERT** | `SELECT SUM(value)` acumula sobre writes. UPSERT reemplaza valor completo (no delta) para auto-corrección con lag de AnalyticsDataset. |
| Trial conversion | Inline, Saga | **BullMQ saga (CONVERT_TRIAL)** | 3 pasos con compensaciones. Si falla a medio camino, el tenant no queda en limbo. |
| Webhook security | Raw body passthrough, Guard-level verification | **Controller guard + timestamp freshness** | `stripe.webhooks.constructEvent()` en guard. Reject >5 min. BullMQ queue para idempotencia. |
| Stripe degraded mode | Fail closed, Fail open with circuit breaker | **Fail open + circuit breaker** | 3 failures en 60s → fail open. Invoice se crea como unpaid local first, luego push async a Stripe. |
| Invoice generation order | Stripe-first, Local-first | **Local-first (unpaid) → async push to Stripe** | Invoice local con `status: unpaid` se persiste antes de contactar Stripe. Stripe caído no bloquea generación. |

---

## 4. Data Flow

```
Subscribe tenant to plan:

Admin → POST /api/v1/billing/subscriptions
       │
       ├── Select plan, set billing period
       ├── Create subscription (TRIAL / ACTIVE)
       ├── If paid plan:
       │     ├── Create Stripe customer
       │     ├── Create Stripe subscription
       │     ├── Store stripeCustomerId + stripeSubscriptionId
       │     └── Listen for Stripe webhooks
       └── Return subscription details

Enforcement check (sync — hard limits):

Client → Protected operation (workflow, upload, API call)
       │
       ├── PlanLimitsService.checkLimit(tenantId, metric)
       │     ├── Query current usage from UsageMeter (current period)
       │     ├── Load plan limit for metric
       │     ├── If usage >= limit → return { allowed: false, current, limit }
       │     │     └── Operation fails with 429 Limit Exceeded
       │     └── If usage < limit → return { allowed: true, current, limit }
       │           └── Operation proceeds
       └── Execute operation → record usage (async metering)

Record usage (hourly cron):

MeteringEngine
       │
       ├── Query AnalyticsDataset for tenant metrics
       ├── Accumulate: total_workflows, total_documents, total_api_calls, etc.
       ├── UPSERT into usage_meters for current period
       │     └── (overwrites value, not delta — self-correcting)
       └── If soft limit exceeded → log warning, notify tenant

Finalize meter (period close):

MeteringEngine
       │
       ├── Lock (tenantId, metric, periodStart) — prevent concurrent writes
       ├── SELECT SUM(value) FROM usage_meters WHERE tenantId=X AND metric=Y
       │     AND periodStart >= periodStart AND periodEnd <= periodEnd
       ├── Compute final value for invoicing
       ├── Store finalized flag in usage_meters
       └── Unlock

Generate invoice (end of period):

InvoiceEngine
       │
       ├── Load subscription + plan
       ├── Load finalized usage_meters for period
       ├── Calculate:
       │     ├── Base charge (plan price)
       │     ├── Overage charges (usage - limit × overage_price)
       │     ├── Discounts (if any)
       │     └── Total
       ├── Create Invoice record (status: unpaid)
       ├── If paid plan:
       │     ├── Enqueue async push to Stripe
       │     ├── StripeGateway.createInvoice(invoice)
       │     ├── On success: update Invoice.status = finalized
       │     └── On failure (Stripe down): keep Invoice.status = unpaid
       │           └── Retry via BullMQ retry queue
       └── Update subscription.nextBillingDate

Handle payment failure:

Stripe webhook → payment_failed
       │
       ├── Update subscription status (PAST_DUE)
       ├── Notify tenant (via SPEC-0016)
       ├── Retry 3x (Stripe Smart Retries)
       └── If still failed after 7 days → cancel subscription

Trial → Paid conversion (BullMQ saga: CONVERT_TRIAL):

Saga orchestrator
       │
       ├── Step 1: Create Stripe customer (if not exists)
       │     └── Fail → saga aborts (trial continues)
       ├── Step 2: Attach payment method (from setup_intent)
       │     └── Fail → compensating: delete Stripe customer (if created)
       ├── Step 3: Create Stripe subscription
       │     └── Fail → compensating: delete Stripe customer (if created)
       ├── Step 4: Update in-house subscription to ACTIVE
       │     └── Fail → compensating: delete Stripe customer + subscription
       └── All steps succeed → subscription is ACTIVE
            On any compensating action → subscription stays TRIAL

Stripe webhook processing:

Stripe → POST /api/v1/billing/webhooks
       │
       ├── [Guard] stripe.webhooks.constructEvent() — verify signature
       ├── [Guard] Reject if event.created > 5 min (timestamp freshness)
       ├── Enqueue to BullMQ queue "billing:stripe-webhooks"
       └── Return 200 immediately (ack to Stripe)

BullMQ consumer:
       │
       ├── Check idempotency: StripeWebhookEvent.findByPk(eventId)
       ├── If duplicate → skip (ON CONFLICT DO NOTHING)
       ├── Insert StripeWebhookEvent record (eventId as PK)
       ├── Process event type:
       │     ├── invoice.paid → mark Invoice as paid
       │     ├── invoice.payment_failed → mark Invoice as failed, update subscription
       │     ├── customer.subscription.updated → reconcile subscription state
       │     └── payment_method.attached → store default payment method
       └── On processing error → mark StripeWebhookEvent.status = failed

Upgrade (mid-period, prorated):

Tenant → POST /api/v1/billing/subscriptions/{id}/upgrade
       │
       ├── Verify new plan is higher tier
       ├── Calculate proration: remaining_days / total_days × (new_price - old_price)
       ├── stripe.subscriptions.update(subscriptionId, { items, proration_behavior: always_invoice })
       ├── Create credit note / invoice line for prorated difference
       ├── Update subscription.planId → new plan (mid-period)
       └── Usage meters CONTINUE (reset only at period boundary)

Downgrade (next period, no refund):

Tenant → POST /api/v1/billing/subscriptions/{id}/downgrade
       │
       ├── Verify new plan is lower tier
       ├── Set subscription.pendingPlanId → new plan
       ├── Calculate proration informational (no charge/refund mid-period)
       ├── stripe.subscriptions.update(subscriptionId, { items, proration_behavior: none })
       └── At period end: swap planId = pendingPlanId, clear pendingPlanId
            Usage meters CONTINUE across change (reset only at period boundary)

Post-cancellation lifecycle:

Subscription → cancelled
       │
       ├── Immediate: tenant frozen (read-only, 30 days)
       │     └── Notify tenant (SPEC-0016) at days 1, 7, 21
       ├── After 30 days → tenant archived (inaccessible)
       │     └── Notify tenant at day 28
       ├── After 60 days (archived) → soft-delete tenant
       └── Data retention policies apply (see section D)
```

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add Plan, Subscription, UsageMeter, Invoice, InvoiceLine, StripeWebhookEvent models |
| 2 | `packages/shared/src/billing/billing.types.ts` | Create | Plan, Subscription, Invoice, Usage types |
| 3 | `packages/shared/src/billing/index.ts` | Create | Re-export |
| 4 | `apps/api/src/modules/billing/billing.module.ts` | Create | NestJS module |
| 5 | `apps/api/src/modules/billing/plan/plan-catalog.service.ts` | Create | Plan CRUD |
| 6 | `apps/api/src/modules/billing/subscription/subscription-engine.ts` | Create | Subscription lifecycle + state machine |
| 7 | `apps/api/src/modules/billing/metering/metering-engine.ts` | Create | Usage aggregation |
| 8 | `apps/api/src/modules/billing/invoice/invoice-engine.ts` | Create | Invoice generation |
| 9 | `apps/api/src/modules/billing/payment/stripe-gateway.ts` | Create | Stripe integration + circuit breaker |
| 10 | `apps/api/src/modules/billing/payment/stripe-webhook.controller.ts` | Create | Stripe webhook handler |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 11 | `apps/api/src/modules/billing/subscription/plan-limits.service.ts` | Create | Plan limit enforcement (hard/soft limits) |
| 12 | `apps/api/src/modules/billing/billing.controller.ts` | Create | Billing API |
| 13 | `apps/api/src/modules/billing/guards/billing.guard.ts` | Create | Tenant isolation |
| 14 | `apps/api/src/modules/billing/payment/stripe-webhook.guard.ts` | Create | Webhook signature verification + timestamp freshness |
| 15 | `apps/api/src/modules/billing/subscription/convert-trial.saga.ts` | Create | BullMQ saga for trial → paid conversion |
| 16 | `apps/api/src/modules/billing/payment/stripe-circuit-breaker.ts` | Create | In-memory circuit breaker for StripeGateway |
| 17 | `apps/api/src/modules/core/core.module.ts` | Modify | Import BillingModule |

### 5.3 Expected NOT to Change

- SPEC-0019 (AnalyticsDataset) — el metering consulta datasets existentes, no los modifica
- SPEC-0016 (Notification Center) — el billing notifica via Notification Center, no lo modifica
- Stripe — plataforma externa, no se modifica

---

## 6. Read Order

1. `packages/shared/src/billing/billing.types.ts` — tipos base
2. `packages/database/prisma/schema.prisma` — modelos
3. `apps/api/src/modules/billing/plan/plan-catalog.service.ts` — planes
4. `apps/api/src/modules/billing/subscription/subscription-engine.ts` — suscripciones
5. `apps/api/src/modules/billing/metering/metering-engine.ts` — uso
6. `apps/api/src/modules/billing/invoice/invoice-engine.ts` — facturación
7. `apps/api/src/modules/billing/payment/stripe-gateway.ts` — pagos
8. `apps/api/src/modules/billing/subscription/plan-limits.service.ts` — enforcement
9. `apps/api/src/modules/billing/subscription/convert-trial.saga.ts` — conversión trial
10. `apps/api/src/modules/billing/payment/stripe-webhook.guard.ts` — webhook security

---

## 7. Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_billing_tables
pnpm --filter database generate
pnpm --filter api test billing
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** Medium → High (after refinement)

El patrón de planes + suscripciones + métricas + facturación con Stripe es
estándar (similar a Chargebee, Recurly, o GitHub's billing). La integración
con Stripe es madura y bien documentada. Tras el refinamiento, se añadieron:

- Enforcement layer con hard/soft limits y puntos de enforcement definidos
- Conversion saga BullMQ con compensaciones
- Webhook security con signature verification y timestamp freshness
- Metering accuracy con cumulative aggregation y finalización de período
- Circuit breaker en StripeGateway y degraded mode
- Matriz completa de transiciones de estado con upgrade/downgrade proration

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 3 | Patrones de consulta AnalyticsDataset, env vars, webhooks |
| Files to read | 5 | Schema, AnalyticsDataset queries, Notification Center |
| Files to create | 17 | Module, services, engines, gateway, controller, guards, saga, circuit breaker, types |
| Files to modify | 2 | schema.prisma, core.module.ts |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Stripe API inconsistente con estado local | Baja | Alto | Reconciliation periódica. Stripe webhooks como fuente de eventos de pago. Alerta si hay desviación. |
| Overage billing con métricas incorrectas | Baja | Alto | Doble validación: metering engine vs AnalyticsDataset. Invoice draft antes de finalizar. Finalización de período con lock. |
| Payment failure sin notificación al tenant | Baja | Medio | Stripe Smart Retries. Notificación via SPEC-0016. Degradación gradual: warning → restrict → suspend. |
| Trial expira sin conversión y tenant pierde datos | Media | Medio | Notificaciones 7, 3, 1 día antes de expirar. Período de gracia de 7 días post-expiración con datos accesibles (read-only). |
| **Stripe caído (SPOF)** | Baja | Alto | Circuit breaker (fail open tras 3 fallos en 60s). Invoice se crea como unpaid local antes de push a Stripe. Cola de reintentos. Degradación gradual: suscripciones nuevas encoladas, existentes continúan, facturas como unpaid. |
| **Trial conversion saga falla a medio camino** | Baja | Medio | BullMQ saga con compensaciones: si falla step 2, elimina Stripe customer creado en step 1. Tenant mantiene TRIAL. |
| **Metering sub-reporte por lag de AnalyticsDataset** | Media | Bajo | UPSERT sobreescribe valor completo (no delta). El próximo ciclo de agregación corrige el valor. ±1% SLA. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Subscription | State machine transitions, trial conversion, upgrade/downgrade proration | Jest |
| Unit — Metering | Usage aggregation, overage calculation, period reset, finalize step | Jest |
| Unit — Invoice | Line calculation, discounts, taxes, proration, local-first creation | Jest |
| Unit — Stripe Gateway | Webhook signature verification, idempotency, error handling, circuit breaker | Jest |
| Unit — Plan Limits | Hard limit enforcement, soft limit warning, checkLimit return contract | Jest |
| Unit — Conversion Saga | Each step + compensating action, full saga rollback | Jest |
| Integration — API | Plan CRUD, subscription lifecycle, invoice listing | supertest |
| Integration — Webhook | signature verification, timestamp freshness, duplicate detection | supertest |
| Doorbell | Tenant A's billing data not visible to Tenant B | E2E |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `billing-cross-tenant-isolation.spec.ts` | Tenant A cannot see Tenant B's subscriptions, invoices, or usage |
| `billing-plan-limit-enforcement.spec.ts` | Tenant A's limit breach does not affect Tenant B's operations |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0020 | Documentar la arquitectura del Billing Platform, integración con Stripe, metering in-house, y modelo de suscripciones. | Proposed |
| ADR-0021 | Documentar enforcement layer: hard/soft limits, puntos de enforcement, sync/async. | Proposed |
| ADR-0022 | Documentar política de degraded mode (Stripe SPOF) y circuit breaker. | Proposed |

---

## 14. Boundaries

### 14.1 Domain Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| Plan catalog | BillingModule | Definiciones de planes y precios |
| Subscription | BillingModule | Estado de suscripción por tenant |
| Usage metering | BillingModule | Métricas de uso por período |
| Invoice | BillingModule | Facturación y cargos |
| Payment processing | Stripe + BillingModule | Stripe captura pagos. BillingModule gestiona webhooks. |
| Tenant provisioning | TenantModule | Creación de tenants — el billing asigna plan después |

### 14.2 Enforcement Points

| Enforcement Point | Limit Type | Behavior | Implementation |
|-------------------|------------|----------|----------------|
| Workflow execution (`workflowService.start()`) | **Hard** | `checkLimit(tenantId, 'workflows')`. If exceeded → 429 Limit Exceeded. Workflow not created. | Guard in WorkflowModule calls PlanLimitsService before start(). |
| API call (SPEC-0021 public API) | **Hard** | `checkLimit(tenantId, 'api_calls')`. If exceeded → 429. Request rejected. | Middleware in API gateway checks plan limit. |
| Active plugins | **Hard** | `checkLimit(tenantId, 'plugins')`. If exceeded → 429. Plugin install rejected. | Guard in PluginModule before install(). |
| Storage / document upload | **Soft** | `checkLimit(tenantId, 'documents')`. If exceeded → warning logged, tenant notified. Upload proceeds. Overage charged at invoice. | MeteringEngine flags overage async. InvoiceEngine charges at period close. |
| Notifications sent | **Soft** | `checkLimit(tenantId, 'notifications')`. Same behavior as storage. Warnings at 80%, 90%, 100%. | Async monitoring via MeteringEngine. |

**Hard limits** — enforced synchronously at the point of operation. The operation
is rejected before any resource is consumed. Response: `429 Limit Exceeded`
with body `{ error: "plan_limit_exceeded", metric, current, limit }`.

**Soft limits** — enforced asynchronously via metering. The operation proceeds,
overage is logged and charged at invoice time. Tenant receives warnings at
80%, 90%, and 100% of the limit.

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| New billing metric | Añadir query en MeteringEngine + límite en Plan + enforcement point. Sin cambios en InvoiceEngine. | Days |
| Custom pricing per tenant | Plan con `overrides: Json`. Precios personalizados sin crear nuevo plan. | Days |
| Coupons / discounts | Añadir `Discount` model. InvoiceEngine aplica antes de total. | Days |
| Tax calculation | Integrar API de impuestos (TaxJar/Stripe Tax) en InvoiceEngine. | Weeks |
| Multi-currency | Añadir `currency` a Plan + Subscription. Stripe maneja conversión. | Weeks |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× (1K tenants, 10K invoices) | 100× (10K tenants, 100K invoices) | Mitigation |
|--------|--------------------------------|-----------------------------------|------------|
| Subscription queries | <5ms | <10ms | Index on (tenantId). Cache activas en Redis. |
| Usage aggregation | <1s por tenant | <5s por tenant | Batch paralelo. Agregación desde AnalyticsDataset pre-agregado. |
| Invoice generation | <100ms por invoice | <500ms | Batch nocturno. Local-first (unpaid) antes de push Stripe. Sin impacto en usuarios. |
| Stripe webhooks | <100ms por webhook | <200ms | Idempotent by design. BullMQ queue para evitar duplicados y rate limiting. |
| Plan limit check | <5ms | <10ms | Consulta directa a usage_meters indexado por (tenantId, metric). Cache en Redis para hot tenants. |

**Decision:** El billing escala horizontalmente con workers estateless. La agregación de uso desde AnalyticsDataset evita consultas pesadas a tablas operacionales. Las facturas se generan en batch nocturno con local-first creation.

### B. Open/Closed Principle (OCP)

**Point of extension:** `MeteringCollector`, `PricingStrategy`, `LimitEnforcementStrategy`.

**What must change to add a new metering source:** Implementar `MeteringCollector` interface que consulta la fuente y devuelve métricas. Registrar en MeteringEngine.

**What must change to add a new pricing model:** Implementar `PricingStrategy` interface (flat, tiered, per-unit, etc.). InvoiceEngine lo usa sin modificaciones.

**What must change to add a new enforcement point:** Implementar `LimitEnforcementStrategy` o llamar a `PlanLimitsService.checkLimit()` desde el guard/middleware correspondiente. Sin cambios en enforcement core.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| Plans | BillingModule | PlanCatalog, InvoiceEngine |
| Subscriptions | BillingModule | SubscriptionEngine, PaymentGateway |
| Usage meters | BillingModule | MeteringEngine, InvoiceEngine, PlanLimitsService |
| Invoices | BillingModule | InvoiceEngine, BillingAPI |
| Payments | Stripe | StripeGateway (webhooks) |
| Tenant lifecycle | TenantModule | BillingModule (subscription status affects tenant) |
| Plan limit enforcement | BillingModule | PlanLimitsService, WorkflowModule, PluginModule |

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| Invoices | 7 años (legal requirement) | Archive anual | Eliminar >7 años |
| Usage meters | **7 años** (auditability, reconciliation) | Archive anual | Eliminar >7 años |
| Subscriptions | Mientras el tenant exista | — | Solo si el tenant se elimina |
| Stripe webhook log | 90 días | — | Eliminar >90 días |

**Note:** Meter retention extended from 3 months to 7 years to match invoice retention
for auditability and reconciliation. The ±1% accuracy SLA requires ability to
reconcile invoice totals against raw meters at any point during the legal retention
period. Partition by year for performance (see section G).

### E. Idempotency

| Operation | Duplicate risk | Protection |
|-----------|---------------|------------|
| `createSubscription()` | Media | `idempotencyKey` en Stripe API. Unique (tenantId, planId) in-house. |
| `recordUsage()` | Alta | UPSERT por (tenantId, metric, periodStart). Sobreescribe valor completo (no delta). |
| `generateInvoice()` | Baja | Unique (subscriptionId, periodStart, periodEnd). Stripe idempotencyKey. Local-first: Invoice creada antes de push Stripe. |
| Stripe webhook | Alta | **eventId como PK** en StripeWebhookEvent. `ON CONFLICT DO NOTHING`. |
| Trial conversion saga | Baja | Cada paso con idempotencyKey. Saga orchestrator detecta step ya completado. |

### F. Shared Contracts

| Contract | Location | Consumers |
|----------|----------|-----------|
| `Plan` | `packages/shared/src/billing/` | PlanCatalog, SubscriptionEngine, InvoiceEngine |
| `Subscription` | `packages/shared/src/billing/` | SubscriptionEngine, BillingAPI |
| `Invoice` | `packages/shared/src/billing/` | InvoiceEngine, BillingAPI |
| `UsageMeter` | `packages/shared/src/billing/` | MeteringEngine, SubscriptionEngine, PlanLimitsService |
| `CheckLimitResult` | `packages/shared/src/billing/` | PlanLimitsService, all enforcement guards |
| `StripeWebhookEvent` | `packages/shared/src/billing/` | StripeWebhookController, BullMQ consumer |

### G. Partitioning Strategy

`invoices` se particiona por año (retención legal de 7 años). `usage_meters` se particiona por **año** (retención aumentada a 7 años). `subscriptions` no requiere partición. `stripe_webhook_events` se particiona por mes.

---

## 16. Interfaces / Contracts

```typescript
// ─── Plan ───────────────────────────────────────────

export type BillingPeriod = 'monthly' | 'yearly';

export type LimitType = 'hard' | 'soft';

export interface PlanLimit {
  metric: string;         // "workflows", "documents", "api_calls", "plugins", "notifications"
  limit: number;          // 0 = unlimited
  overagePrice?: number;  // price per unit over limit
  type: LimitType;        // hard = blocks operation, soft = warns + charges overage
  warningThresholds?: number[];  // [0.8, 0.9, 1.0] — % of limit at which to warn
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;            // cents
  currency: string;         // "usd"
  billingPeriod: BillingPeriod;
  limits: PlanLimit[];
  features: string[];       // feature flags
  trialDays: number;
  active: boolean;
}

// ─── Subscription State Machine ─────────────────────
//
// From           To             Trigger
// ────────────   ────────────   ───────────────────────────────────
// —              trialing       New tenant created with trial plan
// trialing       active         Trial ended + payment method valid (auto)
// trialing       cancelled      Trial ended + no payment method
// trialing       pending        Payment method added, awaiting Stripe confirmation
// pending        active         Stripe subscription confirmed
// pending        trialing       Stripe confirmation failed (fallback)
// active         past_due       Payment failed
// past_due       active         Payment retry succeeded
// past_due       cancelled      Payment failed after 7 days / max retries
// past_due       grace_period   Payment failed, grace period started
// grace_period   active         Payment received during grace
// grace_period   suspended      Grace period expired without payment
// suspended      active         Payment received during suspension
// suspended      cancelled      Suspension period expired (30 days)
// active         cancelled      Admin cancels / tenant cancels
// active         active         Upgrade (mid-period, prorated)
// active         active         Downgrade (next period, prorated)
// cancelled      —              Terminal state
//
// Upgrade:  proration_behavior = always_invoice. Immediate effect.
// Downgrade: proration_behavior = none. Effect at next period boundary.
// Usage meters CONTINUE across upgrade/downgrade (reset at period boundary only).

export type SubscriptionStatus =
  | 'trialing'
  | 'pending'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'suspended'
  | 'cancelled'
  | 'expired';

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  pendingPlanId?: string;     // for downgrade (takes effect next period)
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  cancelledAt?: string;
  gracePeriodEnd?: string;    // when grace_period ends → suspended
  suspendedUntil?: string;    // when suspended → cancelled
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

// ─── Usage ─────────────────────────────────────────

export interface UsageMeter {
  id: string;
  tenantId: string;
  metric: string;
  periodStart: string;
  periodEnd: string;
  value: number;              // accumulated usage (cumulative SUM)
  overage: number;            // max(0, value - planLimit)
  isFinalized: boolean;       // true after period close
}

// ─── Plan Limit Enforcement ─────────────────────────

export interface CheckLimitResult {
  allowed: boolean;
  metric: string;
  current: number;
  limit: number;
  remaining: number;           // limit - current
  type: LimitType;
}

// ─── Invoice ───────────────────────────────────────

export type InvoiceStatus = 'draft' | 'unpaid' | 'finalized' | 'paid' | 'failed' | 'void';

export interface InvoiceLine {
  description: string;
  amount: number;      // cents
  quantity?: number;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  tenantId: string;
  status: InvoiceStatus;
  periodStart: string;
  periodEnd: string;
  lines: InvoiceLine[];
  subtotal: number;
  total: number;
  stripeInvoiceId?: string;
  paidAt?: string;
  dueDate: string;
}

// ─── StripeWebhookEvent ────────────────────────────

export type WebhookEventStatus = 'pending' | 'processed' | 'failed' | 'ignored';

export interface StripeWebhookEvent {
  id: string;                  // Stripe event ID (PK)
  type: string;                // "invoice.paid", "payment_failed", etc.
  data: unknown;               // Stripe event data
  status: WebhookEventStatus;
  processedAt?: string;
  failureReason?: string;
  createdAt: string;
}

// ─── MeteringCollector ─────────────────────────────

export interface MeteringCollector {
  readonly metric: string;
  readonly limitType: LimitType;
  collect(tenantId: string, periodStart: Date, periodEnd: Date): Promise<number>;
}

// ─── PricingStrategy ───────────────────────────────

export interface PricingStrategy {
  calculate(plan: Plan, usage: UsageMeter[]): Promise<InvoiceLine[]>;
}
```

```prisma
// ─── Plan ──────────────────────────────────────────
model Plan {
  id            String   @id @default(uuid())
  name          String   @unique
  description   String?
  price         Int      // cents
  currency      String   @default("usd")
  billingPeriod String   @default("monthly") // monthly | yearly
  limits        Json     // PlanLimit[]
  features      String[]
  trialDays     Int      @default(14)
  active        Boolean  @default(true)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  subscriptions Subscription[]

  @@map("plans")
}

// ─── Subscription ──────────────────────────────────
model Subscription {
  id                   String    @id @default(uuid())
  tenantId             String    @unique @map("tenant_id")
  planId               String    @map("plan_id")
  pendingPlanId        String?   @map("pending_plan_id")
  status               String    @default("trialing")
  // trialing | pending | active | past_due | grace_period | suspended | cancelled | expired
  currentPeriodStart   DateTime  @map("current_period_start")
  currentPeriodEnd     DateTime  @map("current_period_end")
  trialEnd             DateTime? @map("trial_end")
  cancelledAt          DateTime? @map("cancelled_at")
  gracePeriodEnd       DateTime? @map("grace_period_end")
  suspendedUntil       DateTime? @map("suspended_until")
  stripeCustomerId     String?   @unique @map("stripe_customer_id")
  stripeSubscriptionId String?   @map("stripe_subscription_id")
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  plan Plan @relation(fields: [planId], references: [id])
  invoices Invoice[]

  @@index([tenantId, status])
  @@map("subscriptions")
}

// ─── UsageMeter ────────────────────────────────────
model UsageMeter {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  metric      String
  periodStart DateTime @map("period_start")
  periodEnd   DateTime @map("period_end")
  value       Float    @default(0)
  isFinalized Boolean  @default(false) @map("is_finalized")

  @@unique([tenantId, metric, periodStart])
  @@index([tenantId, metric, periodStart, periodEnd])
  @@map("usage_meters")
}

// ─── Invoice ───────────────────────────────────────
model Invoice {
  id              String    @id @default(uuid())
  subscriptionId  String    @map("subscription_id")
  tenantId        String    @map("tenant_id")
  status          String    @default("draft")
  // draft | unpaid | finalized | paid | failed | void
  periodStart     DateTime  @map("period_start")
  periodEnd       DateTime  @map("period_end")
  lines           Json      // InvoiceLine[]
  subtotal        Int       // cents
  total           Int       // cents
  stripeInvoiceId String?   @unique @map("stripe_invoice_id")
  paidAt          DateTime? @map("paid_at")
  dueDate         DateTime  @map("due_date")
  createdAt       DateTime  @default(now()) @map("created_at")

  subscription Subscription @relation(fields: [subscriptionId], references: [id])

  @@index([tenantId, status])
  @@index([subscriptionId, periodStart, periodEnd])
  @@map("invoices")
}

// ─── StripeWebhookEvent ───────────────────────────
model StripeWebhookEvent {
  id             String    @id          // Stripe event ID (not auto-generated)
  type           String
  data           Json
  status         String    @default("pending")
  // pending | processed | failed | ignored
  processedAt    DateTime? @map("processed_at")
  failureReason  String?   @map("failure_reason")
  createdAt      DateTime  @default(now()) @map("created_at")

  @@index([createdAt(sort: Desc)])
  @@map("stripe_webhook_events")
}
```

---

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Add billing tables + migration | Bajo | `DROP TABLE` (sin datos aún) |
| 2 | Seed default plans (Free, Basic, Pro, Enterprise) | Bajo | DELETE plans |
| 3 | Create shared contracts + types | Bajo | Revertir commit |
| 4 | Implement PlanCatalogService | Bajo | Sin impacto en tenants |
| 5 | Implement SubscriptionEngine + state machine | Bajo | Sin suscripciones activas |
| 6 | Implement PlanLimitsService + enforcement guards | Bajo | Sin enforcement activo hasta wiring |
| 7 | Implement MeteringEngine (consume AnalyticsDataset) | Bajo | Solo lecturas a datasets existentes |
| 8 | Implement InvoiceEngine + local-first creation | Bajo | Sin facturas que generar |
| 9 | Implement StripeGateway + circuit breaker | Bajo | Circuit breaker open hasta config |
| 10 | Implement StripeWebhookController + guard + queue | Bajo | Webhook endpoint sin registrar en Stripe aún |
| 11 | Implement ConvertTrial saga | Bajo | Sin trials que convertir hasta activar |
| 12 | Wire BillingModule en CoreModule | Bajo | Quitar del imports |

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿Stripe se integra en modo test primero o directamente en producción? | Open | Recomendación: modo test con claves de prueba. Stripe webhooks en entorno de staging. Migrar a producción cuando el billing esté estable. |
| 2 | ¿Facturación mensual o también anual desde MVP? | Open | Recomendación: mensual en MVP. Anual como extensión en v2 (requiere prorrateo). |
| 3 | ¿Manejo de impuestos (VAT, GST, IVA) en MVP? | Open | Recomendación: no en MVP. Stripe Tax o TaxJar como extensión. Las facturas en MVP son sin impuestos. |
| 4 | ¿Créditos / descuentos promocionales en MVP? | Open | Recomendación: no en MVP. Añadir modelo de créditos en v2. |
| 5 | ¿Qué métricas exactas serán hard vs soft? Depende de cada plan. | Open | Definiendo en spec de planes: Free = hard limits bajos. Enterprise = soft limits altos. |
| 6 | ¿Configuración de circuit breaker (3 fallos / 60s) validada con datos de producción? | Open | Valor inicial. Ajustar basado en Stripe latencia observada en staging. |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Refinado tras Architecture Review.
> **Blocking issues:** 1/1 resolved. **High severity:** 5/5 resolved.
