# Tasks: SPEC-0008 — Tenant Dashboard

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~380 (3 mods ~75 + 4 test files ~305) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | RED tests for all 4 layers | PR 1 | `pnpm --filter api test tenant-dashboard && pnpm --filter tenant-web test use-dashboard` | N/A (unit tests, no runtime scenario) | 4 new test files; revertible without touching prod |
| 2 | Align service+DTO to spec | PR 1 | `pnpm --filter api test tenant-dashboard` | `docker compose up -d` then `curl Host: acme.crmmaster.com /api/v1/tenant/dashboard` | `tenant-dashboard.service.ts` + `dto.ts` only |
| 3 | Align hook to spec | PR 1 | `pnpm --filter tenant-web test use-dashboard` | N/A (hook unit test) | `use-dashboard.ts` only |
| 4 | GREEN verification + lint/tsc | PR 1 | `pnpm test && pnpm lint && pnpm turbo build` | Full suite | Whole change |

## Phase 1: Foundation / Infrastructure

- [x] 1.1 Write `apps/api/src/modules/tenant-dashboard/tenant-dashboard.service.spec.ts` covering: happy 8-field response, empty tenant returns zeroes, backend error → 500 generic, 401 no token (no tenant query runs), cross-tenant 403. RED — assert `prisma.forTenant(tenantId)` is used (not `prisma.admin.*`).
- [x] 1.2 Write `apps/api/test/doorbell/tenant-dashboard-isolation.spec.ts`: tenant A (10 clientes) vs tenant B (5); assert A's `totalClientes === 10`, B's `=== 5`, no leak. Gated on `DATABASE_URL`.
- [x] 1.3 Write `apps/tenant-web/src/hooks/use-dashboard.test.ts`: loading state (`loading` true, data/error null), error state with `refetch()` re-trigger, empty state.
- [x] 1.4 Write `apps/tenant-web/src/app/(admin)/admin/page.test.tsx`: mock hook → assert 5 KPI cards render with live values + max 5 events.

## Phase 2: Core Implementation

- [x] 2.1 Modify `apps/api/src/modules/tenant-dashboard/dto.ts`: add `ultimaActualizacion: string`; rename `eventosRecientes` → `ultimosEventos`; mark `onboardingChecklist?` optional.
- [x] 2.2 Modify `apps/api/src/modules/tenant-dashboard/tenant-dashboard.service.ts`: switch all metric queries to `prisma.forTenant(tenantId).{model}.count/findMany`; cap `ultimosEventos` at `take: 5`; set `ultimaActualizacion: new Date().toISOString()`.
- [x] 2.3 Modify `apps/tenant-web/src/hooks/use-dashboard.ts`: expose `loading` and `error` as primary names; keep `isLoading`/`isError` as compat aliases so existing `page.tsx` keeps compiling.

## Phase 3: Integration / Wiring

- [x] 3.1 Verify `page.tsx` still compiles against renamed hook (no code change expected — aliases cover it). If it references `eventosRecientes`, switch to `ultimosEventos`.

## Phase 4: Testing / Verification

- [x] 4.1 Run `pnpm --filter api test tenant-dashboard` — service spec GREEN.
- [x] 4.2 Run `pnpm --filter api test doorbell` — isolation gate GREEN.
- [x] 4.3 Run `pnpm --filter tenant-web test use-dashboard` and `pnpm --filter tenant-web test admin/page` — Vitest GREEN.
- [x] 4.4 Run `pnpm test && pnpm lint && pnpm turbo build` — full suite + typecheck clean.