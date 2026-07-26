# Design: SPEC-0027 — Feature Flags & Licensing Platform

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Estado:** Draft
> **Documento de trabajo.** No modifica el pipeline SDD.

---

## 1. Executive Summary

El modelo `Plan.features` (String[]) existe en el schema y está poblado en los seeds de 4 planes, pero nunca se evalúa en runtime. Ningún guard, decorator o servicio consulta `plan.features` para decidir si un tenant puede acceder a una funcionalidad. Esto hace que los límites del plan sean puramente informativos — cualquier tenant puede acceder a cualquier feature independientemente de su suscripción. Se crea un sub-módulo `FeatureFlags` dentro del módulo Billing que implementa `FeatureFlagService` con cache TTL en memoria, un decorador `@PlanFeature()` y un `PlanFeatureGuard` que replica el patrón existente de `@PlanLimit()`. El impacto esperado es cerrar la brecha de enforcement del modelo de licenciamiento sin cambios de schema, sentando las bases para overrides por tenant en una fase posterior.

## 2. Technical Approach

El sistema de feature flags opera como una capa de consulta sobre el modelo de suscripción existente. `FeatureFlagService` recibe un `tenantId` y un `featureKey`, resuelve la suscripción activa del tenant, extrae el array `features` del plan asociado, y retorna un booleano. Los resultados se cachean en memoria con TTL de 120s siguiendo el patrón Map + `expiresAt` ya utilizado en `token.service.ts` y `kpi-engine.ts`.

El decorador `@PlanFeature('feature-key')` se aplica en endpoints o controllers y, mediante `Reflector`, el guard intercepta la request, extrae el `tenantId` del request object, e invoca `FeatureFlagService.isEnabled()`. Si retorna `false`, se lanza `HttpException` con 403 Forbidden. Si no hay decorador, el guard pasa sin evaluar.

La suscripción se valida por status: solo `active`, `trialing` y `grace_period` son considerados válidos. `expired`, `cancelled`, `past_due` y `suspended` retornan conjunto vacío de features.

El módulo se integra como `FeatureFlagModule` dentro de `BillingModule` (sub-módulo), y reemplaza el consumo del legacy `TenantModulesService` en los puntos de navegación que actualmente consultan `tenant.config.modules`.

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Feature key type | Runtime enum, Zod enum, String literal union | String literal union | Tree-shakeable, serializable, sin overhead de runtime. Sigue el patrón de `SubscriptionStatus` en `billing.types.ts`. |
| Cache backend | Redis, In-memory Map, Database query every time | In-memory Map with TTL | No hay Redis en el stack actual. Las features cambian poco (~cambios de plan). TTL 120s balancea frescura vs. latencia. Sigue patrón probado en `token.service.ts`. |
| Cache invalidation | TTL only, Event-driven + TTL | Event-driven + TTL fallback | Suscripción cambia: `SubscriptionEngine` emite evento que invalida cache del tenant. TTL es respaldo si el evento falla. |
| Decorator/Guard pattern | Interceptor, Middleware, Guard | Guard con Reflector | Es idéntico al patrón `@PlanLimit()` + `PlanLimitGuard` existente. Consistencia con la base de código. |
| Module placement | New top-level module, Sub-module of Billing | Sub-module `feature-flags/` dentro de `BillingModule` | Feature flags son una capacidad del billing (plan → features). Evita crear otro módulo top-level. El `FeatureFlagModule` se importa en `BillingModule`. |
| Subscription statuses | All statuses pass, Only active | Active + trialing + grace_period | `past_due` está en mora, `expired`/`cancelled` perdieron acceso, `suspended` está inhabilitado. |
| Phase 2 (overrides) | New FeatureFlag model, Extend Plan model | New model (deferred to Phase 2) | Phase 1 es schema-less. Phase 2 agrega `FeatureFlag` + `TenantFeatureOverride` cuando se necesiten overrides por tenant. |

## 4. Data Flow

```
                              ┌──────────────────┐
                              │   HTTP Request    │
                              │  @PlanFeature(x)  │
                              └────────┬─────────┘
                                       │
                              ┌────────▼─────────┐
                              │ PlanFeatureGuard  │
                              │ (canActivate)     │
                              └────────┬─────────┘
                                       │ get tenantId from request
                                       │ read featureKey from Reflector
                                       │
                              ┌────────▼─────────┐
                              │ FeatureFlagService │
                              │ .isEnabled(       │
                              │   tenantId,       │
                              │   featureKey      │
                              │ )                 │
                              └────────┬─────────┘
                                       │
                          ┌────────────┴────────────┐
                          │                         │
                   ┌──────▼──────┐          ┌───────▼───────┐
                   │   Cache     │          │ Subscription  │
                   │  Map<key,   │          │  → Plan       │
                   │  expiresAt> │          │  → features[] │
                   └──────┬──────┘          └───────┬───────┘
                          │                         │
                          └────────────┬────────────┘
                                       │
                              ┌────────▼─────────┐
                              │  Return boolean   │
                              │  true / false     │
                              └────────┬─────────┘
                                       │
                              ┌────────▼─────────┐
                              │  403 / Allow      │
                              └──────────────────┘
```

**Happy path:** Request llega con `@PlanFeature('workflows')`. Guard lee el metadata key, obtiene `tenantId`, llama a `FeatureFlagService.isEnabled()`. Cache miss → consulta DB: `Subscription.findUnique({where:{tenantId}, include:{plan}})` → verifica status válido → busca `'workflows'` en `plan.features` → true → cachea resultado → guard permite.

**Cache invalidation:** `SubscriptionEngine` emite evento `plan.changed` tras upgrade/downgrade. `FeatureFlagService` escucha y elimina la entrada del Map para ese tenant.

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/shared/src/billing/feature-flags.types.ts` | Create | `FeatureKey` union type con las 18 keys documentadas |
| 2 | `packages/shared/src/billing/index.ts` | Modify | Re-exportar tipos de feature flags |
| 3 | `apps/api/src/modules/billing/feature-flags/feature-flags.service.ts` | Create | `FeatureFlagService` con `isEnabled()`, `getAllEnabled()`, `invalidateCache()` |
| 4 | `apps/api/src/modules/billing/feature-flags/plan-feature.decorator.ts` | Create | `@PlanFeature('key')` decorator con `SetMetadata` |
| 5 | `apps/api/src/modules/billing/feature-flags/plan-feature.guard.ts` | Create | `PlanFeatureGuard` que lee metadata, llama al service, retorna 403 |
| 6 | `apps/api/src/modules/billing/feature-flags/feature-flags.module.ts` | Create | `FeatureFlagModule` con providers y exports |
| 7 | `apps/api/src/modules/billing/billing.module.ts` | Modify | Importar `FeatureFlagModule`, registrar `PlanFeatureGuard` global |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `apps/api/src/modules/billing/feature-flags/__tests__/feature-flags.service.spec.ts` | Create | Tests unitarios del service (cache, subscription gating, feature resolution) |
| 2 | `apps/api/src/modules/billing/feature-flags/__tests__/plan-feature.guard.spec.ts` | Create | Tests del guard (403, allow, skip, missing tenantId) |
| 3 | `apps/api/src/modules/billing/__tests__/doorbell/feature-flags.doorbell.spec.ts` | Create | Doorbell test de aislamiento cross-tenant |
| 4 | `apps/api/src/modules/billing/subscription/subscription-engine.ts` | Modify | Emitir evento `plan.changed` para invalidar cache |

### 5.3 Expected NOT to Change

- `apps/api/src/app.module.ts` — FeatureFlagModule se importa dentro de BillingModule, no en app.module
- `apps/admin-web/` — Sin cambios de frontend en Phase 1 (solo enforcement backend)
- `apps/tenant-web/` — Sin cambios de frontend en Phase 1 (navigation gating usa FeatureFlagService internamente)
- `packages/database/prisma/schema.prisma` — Phase 1 es schema-less. Sin migraciones.

## 6. Read Order

1. `packages/shared/src/billing/billing.types.ts` — Entender `SubscriptionStatus`, interfaces existentes para contratos compartidos
2. `packages/shared/src/billing/index.ts` — Ver patrón de re-exportaciones
3. `apps/api/src/modules/billing/guards/plan-limit.guard.ts` — Patrón exacto de decorator + guard a replicar
4. `apps/api/src/modules/billing/plan/plan-limits.service.ts` — Patrón de acceso a DB para obtener plan + subscription
5. `apps/api/src/modules/billing/billing.module.ts` — Estructura del módulo, imports, providers
6. `packages/database/seeds/billing-plans.seed.ts` — Catálogo actual de feature keys por plan
7. `apps/api/src/modules/billing/subscription/subscription-engine.ts` — Punto de emisión de eventos de cambio de plan

## 7. Expected Commands

```bash
pnpm --filter shared build                        # Compilar tipos nuevos
pnpm --filter api test -- --testPathPattern="feature-flags"  # Tests del módulo
pnpm --filter api lint                            # Lint del módulo nuevo
pnpm --filter api build                           # Build completo del backend
pnpm test                                         # Suite completa sin regresiones
```

## 8. Design Confidence

**Confidence:** High

**Justification:** Phase 1 es schema-less, no toca Prisma, no requiere migración. El patrón decorator + guard es idéntico a `@PlanLimit()` que ya existe y está probado. El patrón de cache TTL en memoria se usa en `token.service.ts` y `kpi-engine.ts`. No hay áreas de incertidumbre significativas — las 18 feature keys están documentadas en el contrato, los estados de suscripción están tipados en `SubscriptionStatus`.

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 3 | SubscriptionEngine events, TenantModulesService callers, plan-features usage |
| Files to read | 7 | Los listados en Read Order |
| Files to create | 6 | 4 fuentes + 2 test files |
| Files to modify | 2 | billing.module.ts, shared billing index, subscription-engine.ts |

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Cache TTL sirve features desactualizadas tras downgrade | Low | High | Invalidation por evento en SubscriptionEngine. TTL de 120s como respaldo. |
| Legacy TenantModulesService sigue siendo usado en paralelo | Medium | Medium | FeatureFlagService reemplaza consultas a tenant.config.modules. No se elimina el servicio legacy en Phase 1. |
| Feature key typo en decorador vs. seed | Low | Medium | `FeatureKey` union type en shared package da error en compilación si el key no existe. |
| Subscription sin plan asignado (null planId) | Low | Low | Service retorna false si no hay subscription o el plan no tiene features. |
| Cross-tenant cache leak | Low | Critical | Cache keyed por `tenantId`. Nunca se comparte estado entre tenants. Tests doorbell lo verifican. |

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit | `FeatureFlagService` — cache hit/miss, subscription gating, feature resolution, invalidation | Jest con mock de PrismaService. Testear: tenant con plan activo → true; tenant expired → false; feature no en plan → false; cache miss consulta DB; cache hit no consulta DB. |
| Unit | `PlanFeatureGuard` — 403 cuando no tiene feature, allow cuando sí, skip sin decorador | Jest con mock de `Reflector` y `FeatureFlagService`. Testear cada rama del guard. |
| Integration | Feature flag resolution con subscription real | Test de integración con DB real: crear tenant, asignar subscription, verificar que `isEnabled` retorna los features del plan. |
| Doorbell | Cross-tenant isolation | Dos tenants con distintos planes. Verificar que tenant A no resuelve features de tenant B. |

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `feature-flags.doorbell.spec.ts` | Tenant A (Free plan, features=[workflows,documents]) no resuelve `advanced-analytics` que pertenece a Tenant B (Pro plan). |
| `feature-flags.doorbell.spec.ts` | Cache de Tenant A no se ve afectado por consultas de Tenant B (misma clave `tenantId`). |

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0027 | Feature Flags & Licensing — arquitectura de enforcement de features basada en plan. Schema-less Phase 1, con modelo explícito en Phase 2. | Proposed |

Phase 1 no requiere schema change (no necesita ADR per AGENTS.md rule 8). ADR-0027 documenta la estrategia general para que Phase 2 sea consistente.

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `FeatureFlagService` | `BillingModule` (feature-flags submodule) | Evaluar si un tenant tiene acceso a una feature. Lee datos de Subscription → Plan. |
| `PlanFeatureGuard` | `BillingModule` (feature-flags submodule) | Interceptar requests HTTP y denegar con 403 si el tenant no tiene la feature requerida. |
| `PlanFeature` decorator | `BillingModule` (feature-flags submodule) | Marcar endpoints con el feature key requerido. Metadata-only, sin lógica. |
| `FeatureKey` types | `packages/shared` | Contrato compartido: catálogo tipado de todas las features conocidas. |
| In-memory cache | `FeatureFlagService` (internal) | Almacenamiento temporal de resultados por tenantId. Sin ownership externo. |

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| Phase 2: `FeatureFlag` + `TenantFeatureOverride` models | Nuevos modelos Prisma + `FeatureFlagAdminService`. La evaluación existente (`isEnabled`) se extiende con override check antes de plan check. | 2-3 days |
| Admin UI for per-tenant flag overrides | Nuevo panel en Mission Control. Consume `FeatureFlagAdminService`. Sin cambios en el service de evaluación. | 3-4 days |
| Percent-based gradual rollout | Nuevo campo `rolloutPercentage` en `FeatureFlag` model. Evaluación incluye hash del tenantId contra el porcentaje. | 1-2 days |
| `useFeature()` frontend hook | Nuevo hook en `packages/ui/` que consulta endpoint `GET /api/v1/billing/features` (retorna `getAllEnabled`). | 1 day |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

**Question:** ¿Cómo escala esta feature con 10× y 100× los datos actuales?

| Factor | 10× | 100× | Mitigation |
|--------|-----|------|------------|
| Storage | Sin nuevo storage (schema-less) | Sin nuevo storage | N/A — Phase 1 no crea tablas |
| Query latency | 10× suscripciones = 10× queries a `subscriptions` table (indexada por tenantId) | 100× = 100×. Cada query es `findUnique` con PK lookup, O(1). | Index `@@unique([tenantId])` en Subscription ya existe. No hay degradación. |
| Write throughput | Cache invalidations en cambios de plan (eventos poco frecuentes) | Idem | Eventos de plan son raros (~1/tenant/mes). Sin cuello de botella. |
| Memory | Cache Map con 10× entradas (~10KB) | 100× entradas (~100KB) | Cache con TTL corto (120s). Memoria despreciable. |

**Decision:** La feature escala linealmente sin degradación. No se requiere sharding ni caching externo en esta fase.

### B. Open/Closed Principle (OCP)

**Question:** ¿La solución permite añadir nuevas capacidades sin modificar el código existente?

**Point of extension:** `FeatureKey` union type en `packages/shared/src/billing/feature-flags.types.ts`. Añadir un nuevo feature flag = añadir un string literal a la unión.

**What must change to add one more:** Solo el archivo de tipos y el seed del plan correspondiente. El service, el guard y los decoradores no cambian — operan sobre strings.

**Decision:** OCP preservado. El catálogo de features es un tipo, no una estructura de control.

### C. Ownership

**Question:** ¿Qué bounded context es propietario de cada dato? ¿Qué módulos solo consumen información?

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| Plan.features | BillingModule (PlanCatalogService) | FeatureFlagService (reads) |
| Subscription.status | BillingModule (SubscriptionEngine) | FeatureFlagService (reads) |
| FeatureKey types | packages/shared | Controllers, Guards, Tests |
| Cache entries | FeatureFlagService (internal) | FeatureFlagService |

**Decision:** Ownership claro. FeatureFlagService es consumer de Plan y Subscription, no propietario. No hay ownership compartido.

### D. Data Retention

**Question:** ¿Qué datos genera esta feature? ¿Cuánto tiempo viven? ¿Cómo se archivan o eliminan?

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| Cache entries (in-memory) | 120s (TTL) | No archive | Expira por TTL o invalidation explícita |
| Plan.features (existing) | Vida del plan | Backup DB | Management manual desde admin |

**Decision:** Phase 1 no genera nuevos datos persistentes. La cache es volátil. Data retention no aplica más allá del TTL.

### E. Idempotency

**Question:** ¿Qué ocurre si la operación se ejecuta dos veces? ¿Existe protección contra duplicados?

| Operation | Duplicate risk | Protection | Fallback |
|-----------|---------------|------------|----------|
| `FeatureFlagService.isEnabled()` | Ninguno — es read-only | N/A | N/A |
| `PlanFeatureGuard.canActivate()` | Ninguno — es read-only | N/A | N/A |
| Cache invalidation | Inofensivo — `Map.delete()` es idempotente | N/A | N/A |

**Decision:** Todas las operaciones son read-only o idempotentes. No se requiere protección adicional.

### F. Shared Contracts

**Question:** ¿Existe un contrato compartido entre frontend y backend, o entre módulos? ¿Debe estar tipado?

| Contract | Location | Consumers | Producers |
|----------|----------|-----------|-----------|
| `FeatureKey` union type | `packages/shared/src/billing/feature-flags.types.ts` | FeatureFlagService, PlanFeatureGuard, Tests | Design-time (manual) |
| `FeatureFlagService` interface | `apps/api/src/modules/billing/feature-flags/feature-flags.service.ts` | PlanFeatureGuard, controllers (future) | FeatureFlagService |

**Decision:** `FeatureKey` es el contrato compartido principal. Frontend lo consumirá en Phase 2. En Phase 1 solo backend.

### G. Partitioning Strategy

**Question:** ¿Será necesario particionar por tenant, por fechas o por volumen? ¿Hay una decisión temprana que facilite el crecimiento sin migration destructiva?

| Dimension | Risk | Strategy |
|-----------|------|----------|
| Tenant | Bajo — Subscription ya está particionada por tenantId (unique) | No se requiere particionado adicional |
| Time | Ninguno — cache TTL es auto-limpiante | N/A |
| Volume | Ninguno — no hay nuevos datos persistentes | N/A |

**Decision:** No se requiere particionado. La tabla `subscriptions` tiene unique constraint por `tenantId` que escala horizontalmente con indexación estándar.

---

## 16. Interfaces / Contracts

```typescript
// ─── FeatureKey Union Type ─────────────────────────────
// Archivo: packages/shared/src/billing/feature-flags.types.ts

export type FeatureKey =
  | 'workflows'
  | 'documents'
  | 'api-access'
  | 'basic-analytics'
  | 'advanced-analytics'
  | 'email-notifications'
  | 'custom-branding'
  | 'priority-support'
   | 'audit-logs'
   | 'automation-hub'
   | 'plugins'
   | 'billing'
   | 'identity-sso'
   | 'activity-timeline'
   | 'dedicated-infrastructure'
  | 'sla-guarantee'
  | 'custom-integrations'
  | 'onboarding-training';

// ─── FeatureFlagService Interface ──────────────────────
// Archivo: apps/api/src/modules/billing/feature-flags/feature-flags.service.ts

export interface IFeatureFlagService {
  isEnabled(tenantId: string, featureKey: FeatureKey): Promise<boolean>;
  getAllEnabled(tenantId: string): Promise<FeatureKey[]>;
  invalidateCache(tenantId: string): void;
}

// ─── Decorator ─────────────────────────────────────────
// Archivo: apps/api/src/modules/billing/feature-flags/plan-feature.decorator.ts

export const PLAN_FEATURE_KEY = 'plan_feature_key';

export const PlanFeature = (featureKey: FeatureKey) =>
  applyDecorators(
    SetMetadata(PLAN_FEATURE_KEY, featureKey),
  );

// ─── Guard ─────────────────────────────────────────────
// Archivo: apps/api/src/modules/billing/feature-flags/plan-feature.guard.ts

@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<FeatureKey>(
      PLAN_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!featureKey) return true;

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId ?? request.user?.tenantId;
    if (!tenantId) return true;

    const enabled = await this.featureFlagService.isEnabled(tenantId, featureKey);

    if (!enabled) {
      throw new HttpException(
        { error: 'feature_not_available', feature: featureKey },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
```

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Crear tipos compartidos y FeatureFlagModule (vacíos) | Ninguno — código nuevo no usado | Revertir commit |
| 2 | Implementar FeatureFlagService con cache | Bajo — solo lectura, no afecta escritura | Revertir commit |
| 3 | Implementar `@PlanFeature` decorator + Guard | Bajo — guard es opt-in, no afecta rutas sin decorador | Revertir commit |
| 4 | Aplicar `@PlanFeature()` en endpoints específicos | Medio — puede romper clientes si el decorador está mal | Quitar decorador del endpoint |
| 5 | Integrar cache invalidation en SubscriptionEngine | Medio — evento puede fallar, pero TTL es respaldo | Revertir cambio en subscription-engine.ts |
| 6 | Reemplazar TenantModulesService en navigation gating | Medio — migración controlada, FeatureFlagService + fallback | Revertir a TenantModulesService temporalmente |

**Rollback general:** `git revert <commit>`. Phase 1 no tiene migración de schema, el rollback es trivial.

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿TTL de cache debe ser configurable por entorno? | Resolved | Variable de entorno `FEATURE_FLAG_CACHE_TTL` con default 120s. |
| 2 | ¿Se necesita rate limiting en el endpoint `GET /api/v1/billing/features`? | Open | No hay endpoint en Phase 1 — `getAllEnabled` es interno. Se evalúa en Phase 2 si se expone como API. |
| 3 | ¿El guard debe permitir paso cuando no hay tenantId? | Resolved | Sí — sigue el patrón de `PlanLimitGuard` que retorna `true` si no hay tenantId. |
| 4 | ¿`past_due` debe perder acceso a features o solo impedir upgrades? | Resolved | Se trata como no-válido. El tenant no pudo pagar, se bloquean features no-esenciales. |

---

> **Fin del documento.**
> Este template sigue SDD v2.1. No modifica el pipeline, los prompts ni el workflow.
> Para cambios al template, crear ADR. No modificar directamente.
