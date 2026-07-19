# Design: SPEC-0008 — Tenant Dashboard

## Technical Approach

The Tenant Dashboard is the tenant-side counterpart of `admin-dashboard`. Most of the implementation already exists in the repo from prior work (module, controller, service, DTO, hook, types, page, navigation entry). This change **closes the spec gap**: adds test coverage, reconciles drift between spec and existing code, and adds the doorbell isolation gate entry.

Strategy: **extend in place**, not rewrite. Migrate the service to `prisma.forTenant(tenantId)` for stronger scoping guarantees per the spec, add the missing `ultimaActualizacion` ISO field, cap `ultimosEventos` at 5, and align the hook API to the spec's `{ data, loading, error, refetch }` shape.

## Architecture Decisions

| Decision | Choice | Tradeoff | Rationale |
|---|---|---|---|
| Scoping primitive | `prisma.forTenant(tenantId)` instead of `prisma.admin.*` + explicit `where: { tenantId }` | Loses ability to query across tenants in this service (not needed) | Spec mandates it; guarantees scoping even if a future contributor forgets the `where` clause |
| Event limit | `take: 5` (not 10) | Existing service uses 10 | Spec requires max 5 in `ultimosEventos` |
| Auth surface | `TenantScopeGuard` (already global) + `@TenantId()` decorator | No `@UseGuards(BetterAuthGuard)` on the controller (relies on global APP_GUARD) | Matches `tenant-profile` and `admin-dashboard` patterns; `BetterAuthGuard` is registered as `APP_GUARD` in `app.module.ts` |
| Hook return shape | Rename `isLoading/isError` → `loading/error` | Breaks any external consumer (none today) | Spec requires the exact names |
| New field | Add `ultimaActualizacion: new Date().toISOString()` | Trivial | Spec lists it; `admin-dashboard` already has it |

## Data Flow

```
[Browser /admin]
  → useDashboard() [tenant-web/hooks/use-dashboard.ts]
  → api.get('/api/v1/tenant/dashboard', { auth: true })
  → [api/api/v1/tenant/dashboard] GET
  → TenantResolveMiddleware (Host → tenantId)
  → BetterAuthGuard (global APP_GUARD → 401 if no token)
  → TenantScopeGuard (global APP_GUARD → 403 if cross-tenant)
  → TenantDashboardController.getDashboard(@TenantId)
  → TenantDashboardService.getDashboard(tenantId)
  → prisma.forTenant(tenantId).{cliente,cita,tarea,sistema,eventoBitacora}.count/findMany
  → JSON response → hook → page renders 5 KPIs + recent events
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/modules/tenant-dashboard/tenant-dashboard.service.ts` | Modify | Switch to `prisma.forTenant(tenantId)`, add `ultimaActualizacion`, cap `ultimosEventos` at 5, rename `eventosRecientes` → `ultimosEventos`, drop `clientesActivos` + `onboardingChecklist` (not in spec) or keep as `onboardingChecklist?` optional |
| `apps/api/src/modules/tenant-dashboard/dto.ts` | Modify | Add `ultimaActualizacion: string`; rename `eventosRecientes` → `ultimosEventos`; mark onboarding optional |
| `apps/api/src/modules/tenant-dashboard/tenant-dashboard.service.spec.ts` | Create | ≥5 specs: happy path, empty tenant, backend error, 401 (no token), cross-tenant 403 |
| `apps/tenant-web/src/hooks/use-dashboard.ts` | Modify | Rename `isLoading→loading`, `isError→error` (add aliases to avoid breaking `page.tsx`); expose `isLoading/isError` as compat props |
| `apps/tenant-web/src/hooks/use-dashboard.test.ts` | Create | ≥3 specs: render with loading state, error state with retry, empty state |
| `apps/tenant-web/src/app/(admin)/admin/page.test.tsx` | Create | Render test verifying 5 KPI cards from mocked response |
| `apps/api/test/doorbell/tenant-dashboard-isolation.spec.ts` | Create | Doorbell entry: tenant A's metrics MUST NOT include tenant B's rows |

**No changes** to: `app.module.ts` (module already registered via `TenantModule` aggregator — rule 11 safe), `tenant-dashboard.controller.ts` (already correct), `tenant-dashboard.module.ts`, `api-types.ts` (shape compatible), `crm.ts` (nav entry exists).

## Interfaces / Contracts

```ts
// dto.ts
export interface EventoItem { id: string; fecha: string; tipo: string; titulo: string; descripcion?: string; link?: string; }
export interface TenantDashboardResponse {
  totalClientes: number;
  citasHoy: number;
  citasPendientes: number;
  citasSemana: number;
  tareasPendientes: number;
  sistemasActivos: number;
  ultimosEventos: EventoItem[];          // max 5
  ultimaActualizacion: string;            // ISO
  onboardingChecklist?: { steps: { id: string; label: string; done: boolean }[] };
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (Jest) | `TenantDashboardService` | Mock `prisma.forTenant`; cover happy/empty/error/401/cross-tenant |
| Isolation | `prisma.forTenant(A)` MUST NOT return B's rows | Doorbell spec using real DB fixtures (gated on `DATABASE_URL`) |
| Unit (Vitest) | `useDashboard` | Mock `api.get`; cover loading/error/empty |
| Component (Vitest) | `AdminDashboardPage` | Mock hook; assert 5 KPI cards render with live values |
| E2E (Playwright) | `/admin` page | Real flow; skipped if not configured |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Standard HTTP endpoint + React page.

## Migration / Rollout

No migration required (no schema change, additive only). Revert = revert commits; no data loss.

## Working Set

### Primary Files (will certainly change)
- `apps/api/src/modules/tenant-dashboard/tenant-dashboard.service.ts`
- `apps/api/src/modules/tenant-dashboard/dto.ts`
- `apps/tenant-web/src/hooks/use-dashboard.ts`

### Secondary Files (may change)
- `apps/api/src/modules/tenant-dashboard/tenant-dashboard.service.spec.ts` (new)
- `apps/tenant-web/src/hooks/use-dashboard.test.ts` (new)
- `apps/tenant-web/src/app/(admin)/admin/page.test.tsx` (new)
- `apps/api/test/doorbell/tenant-dashboard-isolation.spec.ts` (new)

### Tests
- Same as Primary + Secondary above (TDD strict — RED before GREEN)

### Configuration
- None (no env vars, no new config)

### Expected NOT to Change
- `apps/api/src/app.module.ts` (rule 11 — would be a regression)
- `apps/api/src/modules/tenant-dashboard/tenant-dashboard.controller.ts`
- `apps/api/src/modules/tenant-dashboard/tenant-dashboard.module.ts`
- `apps/tenant-web/src/lib/api-types.ts` (already compatible)
- `apps/tenant-web/src/config/navigation/crm.ts` (entry already exists)
- `apps/tenant-web/src/app/(admin)/admin/page.tsx` (already renders 5 KPIs + events with all 3 states)

## Read Order

1. `openspec/changes/SPEC-0008-tenant-dashboard/proposal.md` — already read
2. `openspec/changes/SPEC-0008-tenant-dashboard/specs/tenant-dashboard/spec.md` — already read
3. `apps/api/src/modules/dashboard/dashboard.service.spec.ts` — test pattern to mirror
4. `apps/api/src/modules/tenant-dashboard/{service,controller,module,dto}.ts` — current state
5. `apps/tenant-web/src/hooks/{use-dashboard,use-citas}.ts` — hook pattern
6. `apps/api/test/doorbell/isolation-gate.spec.ts` — doorbell pattern
7. `apps/tenant-web/src/app/(admin)/admin/page.tsx` — current page (do NOT rewrite)

## Expected Commands

```bash
# Tests
pnpm --filter api test tenant-dashboard                          # new service spec
pnpm --filter api test doorbell                                  # new isolation spec
pnpm --filter tenant-web test use-dashboard                      # new hook spec
pnpm --filter tenant-web test admin/page                         # new page spec
pnpm test                                                         # full suite
pnpm lint                                                         # lint
pnpm turbo build                                                  # typecheck + build
```

## Design Confidence

**High** — the implementation exists; the spec drift is bounded (3 fields, 1 scoping primitive, 2 hook aliases); the test pattern is well-established (`dashboard.service.spec.ts`, `use-citas.test.ts`); no architectural decisions remain open.

## Exploration Budget

- Max repository searches (grep/find): **10** (used: 8 in pre-design scan; ≤2 remaining for sanity checks during apply)
- Max files to read: **15** (used: 13; ≤2 remaining)
- Max files to modify: **3** (service, dto, hook — already enumerated in Primary)
- Max files to create: **4** (service spec, hook test, page test, doorbell spec)

## Open Questions

- [ ] Keep `onboardingChecklist` in response (UI uses it heavily) or drop it (spec doesn't list it)? **Recommendation: keep, mark `?` optional** so UI works but spec stays minimal.
- [ ] Add `clientesActivos` to spec retroactively (page renders `clientesActivos` as the headline number, with `totalClientes` as subtitle)? **Recommendation: yes, amend spec to include both fields.**
- [ ] Resolve spec drift by updating `spec.md` to match the working code (recommended) or by updating the code to match the spec literally? **Recommendation: update spec — current code is already shipped UX, regression risk is lower.**
