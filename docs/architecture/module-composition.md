# Module Composition Standard

> Canonical standard for NestJS composition (aggregation) modules in CRM-Master.
> Composition modules wire bounded contexts together. They contain zero logic.

---

## 1. Definition

A **composition module** is a NestJS `@Module({})` whose sole purpose is to import
feature modules from one bounded context and re-export them as a unit. It is a
pure composition layer — no logic, no providers, no controllers, no services.

```typescript
// ✅ Correct — pure composition
@Module({
  imports: [
    FeatureAModule,
    FeatureBModule,
    FeatureCModule,
  ],
})
export class MyContextModule {}
```

---

## 2. Hard rules

### 2.1 Imports only

Composition modules contain **only** an `imports` array in their decorator.
Everything else is forbidden unless explicitly justified in an ADR.

| Element | Permitido |
|---------|-----------|
| `imports` | ✅ Siempre |
| `exports` | ⚠️ Solo si otro módulo fuera del contexto lo re-importa |
| `controllers` | ❌ |
| `providers` | ❌ |
| `ConfigModule.forRoot()` | ❌ Pertenece a `app.module.ts` |

### 2.2 No business logic

Zero logic. Composition modules must never contain:
- Service instantiation or provider registration.
- Middleware or guard registration (those go in `app.module.ts`).
- Environment config, conditional imports, or factories.
- Any class, function, or constant besides the `@Module({})` declaration.

### 2.3 Alphabetical order

All import statements and `imports` array entries must be sorted
**case-insensitively by module name** (the imported symbol, not the path).

```typescript
// ✅ Correct
imports: [
  AuthModule,
  CitasModule,
  ClientAuthModule,
  ClientUserManagementModule,
  ClientsModule,
  CommunicationsModule,
]

// ❌ Wrong — not sorted
imports: [
  TenantsModule,
  AuthModule,
  CitasModule,
]
```

### 2.4 One bounded context per module

A composition module aggregates modules from **exactly one bounded context**.
Cross-context imports in the same composition module are a red flag.

| Composition module | Context | Feature module examples |
|---|---|---|
| `CoreModule` | Platform core | Auth, Clients, Dashboard, Tenants |
| `InfrastructureModule` | Cross-cutting | Audit, Health, Notifications, Search |
| `TenantModule` | Tenant features | TenantClientes, TenantRecursos |
| `TenantCRMModule` *(future)* | Tenant CRM | TenantClientes, TenantDashboard, TenantProfile |

### 2.5 Exports: required vs. unnecessary

Export a feature module from a composition module **only** when another
composition module (or the root `AppModule`) needs its exported providers
and does not import it directly.

Before adding an `exports` entry, verify:

```
grep -r "import.*ThatModule" apps/api/src/modules/
```

If no other module imports `ThatModule`, the export is **unnecessary**.
Remove it.

### 2.6 Module file naming

```
<context-name>.module.ts
```

Examples: `core.module.ts`, `infrastructure.module.ts`, `tenant.module.ts`.

Place composition modules in dedicated directories matching their context:

```
modules/
  core/
    core.module.ts
  infrastructure/
    infrastructure.module.ts
  tenant/
    tenant.module.ts
```

---

## 3. Boundaries

### 3.1 First level (AppModule children)

These are the composition modules imported directly by `app.module.ts`:

- `InfrastructureModule` — cross-cutting infrastructure
- `CoreModule` — platform core / admin back-office
- `TenantModule` — tenant-facing features

`app.module.ts` must never import feature modules directly. If it does, that
is an **architectural regression** (see section 5).

### 3.2 Second level (nested composition)

When a composition module exceeds **20–25 feature modules**, or when
concurrent branches frequently modify it, split it into sub-composition
modules under the same directory.

Example (`TenantModule` → sub-composition):

```
tenant/
  tenant.module.ts              ← imports sub-composition modules
  crm/
    tenant-crm.module.ts        ← imports TenantClientes, TenantDashboard, etc.
  scheduling/
    tenant-scheduling.module.ts ← imports TenantRecursos, TenantTareas, etc.
  communication/
    tenant-communication.module.ts
  automation/
    tenant-automation.module.ts
```

Sub-composition modules follow the same hard rules (2.1–2.6).

---

## 4. Verification checklist

Before committing a composition module:

- [ ] Only `imports` (and `exports` only if proven necessary).
- [ ] No `controllers`, `providers`, or business logic.
- [ ] Import statements sorted alphabetically.
- [ ] `imports` array sorted alphabetically.
- [ ] No duplicate imports.
- [ ] Single bounded context.
- [ ] Exports flagged as `⚠️` with a comment justifying why.

---

## 5. Regression alert

`app.module.ts` was the project's **#1 hot file** (29 commits, 21.3% of all
commits) before the aggregation refactor. If it appears among the Top Hot
Files again in any future analysis, that is an **architectural regression**.

Immediate corrective action:
1. Identify which feature module was added directly.
2. Route it through the correct composition module.
3. Verify no other module bypasses the composition layer.

---

## 6. References

- ADR-0001: Multi-tenancy strategy.
- ADR-0003: TenantModule split strategy (documents the sub-composition structure).
- `apps/api/src/app.module.ts` — root module, must import only composition modules.
- `apps/api/src/modules/infrastructure/infrastructure.module.ts` — reference implementation.
- `apps/api/src/modules/core/core.module.ts` — reference implementation.
- `apps/api/src/modules/tenant/tenant.module.ts` — reference implementation.
