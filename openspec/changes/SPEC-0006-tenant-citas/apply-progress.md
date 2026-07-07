## Apply Progress: SPEC-0006 — Cumulative

### Mode
Standard

### Batches
| # | Branch | Scope | Status |
|---|--------|-------|--------|
| PR 2 | `feat/SPEC-0006-tenant-citas-pr2` | Backend controllers + endpoints | ✅ Complete |
| PR-3a | `feat/SPEC-0006-tenant-citas-pr3a` | Config + shared UI + API client | ✅ Complete |
| PR-3d | `feat/SPEC-0006-tenant-citas-pr3d` | E2E admin calendario fix — badge assertions | ✅ Complete |

### Completed Tasks (Cumulative)

#### PR-3d — E2E Admin Calendario Fix
- [x] **3d.2 — Admin calendario E2E** — Fixed mock mutation so badge assertions work after confirm/cancel. Updated confirm test to assert "Confirmada" badge. Updated cancel test to switch to "Historial" tab and assert "Cancelada" badge.

#### Phase 1–2 (Backend) — PR 2
- [x] 1.1 Prisma: add Disponibilidad + Cita models, migrate
- [x] 1.2 Create CalendarProvider interface + LocalCalendarProvider
- [x] 2.1 DisponibilidadService: CRUD disponibilidad, slot generation
- [x] 2.2 CitasService: booking con doble reserva prevention
- [x] 2.3 CitasController: 6 endpoints (público + admin)
- [x] 2.4 CitasModule + app.module.ts registration

#### PR-3a — Config + Shared UI + API Client
- [x] **3a.1 — Project config files** — tsconfig.json, next.config.ts, postcss.config.mjs, vitest.config.ts, next-env.d.ts, test-setup.ts
- [x] **3a.2 — Theme tokens + layout** — @theme block from admin-web in globals.css, Inter font in layout.tsx
- [x] **3a.3 — Lib utilities** — cn() helper, API client (get/post/patch/put + NetworkError/ApiError), api-types (Slot, Cita, BookCitaInput, DisponibilidadConfig, DaySchedule) + tests
- [x] **3a.4 — Shared UI components** — button, card, badge, input, tabs, separator, scroll-area (copied from admin-web, adapted imports) + smoke tests

### Files Changed (Cumulative)

#### PR-3d
| File | Action | What Was Done |
|------|--------|---------------|
| `apps/tenant-web/e2e/admin-calendario.spec.ts` | Modified | Added `mutableCitas` for PATCH persistence; updated GET to return mutable data; confirm test now asserts Confirmada badge; cancel test switches to Historial tab and asserts Cancelada badge |

#### PR 2
| File | Action | What Was Done |
|------|--------|---------------|
| `apps/api/src/common/decorators/tenant-id.decorator.ts` | Created | Custom @TenantId() param decorator |
| `apps/api/src/modules/citas/citas.controller.ts` | Created | 6 endpoints |
| `apps/api/src/modules/citas/citas.module.ts` | Modified | Added CitasController |
| `apps/api/src/app.module.ts` | Modified | Added CitasModule |

#### PR-3a
| File | Action | What Was Done |
|------|--------|---------------|
| `apps/tenant-web/tsconfig.json` | Created | Next.js + TypeScript config, @/* path alias |
| `apps/tenant-web/next.config.ts` | Created | transpilePackages for @crm-master packages |
| `apps/tenant-web/postcss.config.mjs` | Created | @tailwindcss/postcss plugin |
| `apps/tenant-web/vitest.config.ts` | Created | @vitejs/plugin-react, jsdom env, @/ alias |
| `apps/tenant-web/next-env.d.ts` | Created | Next.js type references |
| `apps/tenant-web/package.json` | Modified | Added radix UI, testing-library deps |
| `apps/tenant-web/.eslintrc.json` | Created | ESLint config (next/core-web-vitals) |
| `apps/tenant-web/src/lib/test-setup.ts` | Created | @testing-library/jest-dom import |
| `apps/tenant-web/src/app/globals.css` | Modified | Added admin-web @theme tokens, font import, base styles, scrollbar |
| `apps/tenant-web/src/app/layout.tsx` | Modified | Added Inter font, updated body classes |
| `apps/tenant-web/src/lib/utils.ts` | Created | cn() helper |
| `apps/tenant-web/src/lib/api.ts` | Created | API client (get/post/patch/put), NetworkError, ApiError |
| `apps/tenant-web/src/lib/api-types.ts` | Created | Slot, Cita, BookCitaInput, DisponibilidadConfig types |
| `apps/tenant-web/src/lib/utils.test.ts` | Created | cn() tests (6) |
| `apps/tenant-web/src/lib/api.test.ts` | Created | API client tests (10) |
| `apps/tenant-web/src/components/ui/button.tsx` | Created | Button with cva variants |
| `apps/tenant-web/src/components/ui/card.tsx` | Created | Card with sub-components |
| `apps/tenant-web/src/components/ui/badge.tsx` | Created | Badge with 7 variants |
| `apps/tenant-web/src/components/ui/input.tsx` | Created | Input with focus/disabled states |
| `apps/tenant-web/src/components/ui/tabs.tsx` | Created | Tabs (radix) |
| `apps/tenant-web/src/components/ui/separator.tsx` | Created | Separator (radix) |
| `apps/tenant-web/src/components/ui/scroll-area.tsx` | Created | ScrollArea (radix) |
| `apps/tenant-web/src/components/ui/button.test.tsx` | Created | Smoke test (3) |
| `apps/tenant-web/src/components/ui/card.test.tsx` | Created | Smoke test (2) |
| `apps/tenant-web/src/components/ui/badge.test.tsx` | Created | Smoke test (4) |
| `apps/tenant-web/src/components/ui/input.test.tsx` | Created | Smoke test (3) |
| `apps/tenant-web/src/components/ui/tabs.test.tsx` | Created | Smoke test (1) |
| `apps/tenant-web/src/components/ui/separator.test.tsx` | Created | Smoke test (2) |
| `apps/tenant-web/src/components/ui/scroll-area.test.tsx` | Created | Smoke test (1) |
| `pnpm-lock.yaml` | Modified | Updated for new dependencies |

### Deviations from Design
None — implementation matches design. All UI components copied from admin-web with import paths adapted to `@/lib/utils`.

### Issues Found
1. **pnpm-lock.yaml adds ~2400 lines** — auto-generated lockfile changes from new dependencies (radix UI, testing-library). This inflates the PR diff beyond the 400-line review budget. The lockfile is not human-reviewable content.
2. **`next lint` deprecation** — Next.js 15's `next lint` is deprecated. Configured eslint 8 + eslint-config-next as a compatibility shim. No lint errors.

### Remaining Tasks
- [ ] PR-3d — E2E booking spec (booking.spec.ts) — still pending in separate PR slice

### Workload / PR Boundary
- Mode: feature-branch-chain slice
- Current work unit: PR-3a (Config + shared UI + API client)
- Repository: `feat/SPEC-0006-tenant-citas-pr3a` (branch), targets `feat/SPEC-0006-tenant-citas-pr3` (tracker)
- Review budget impact: ~946 source lines + ~2400 lockfile changes

### Verification Results
```bash
cd apps/tenant-web
npx tsc --noEmit          # ✅ Pass
npx vitest run src/lib/ src/components/ui/  # ✅ 9 files, 32 tests passed

# From root:
pnpm lint --filter tenant-web  # ✅ No ESLint warnings or errors
```

### Git Log
```
a5bb769 chore: update pnpm-lock.yaml with tenant-web dependencies
72ef863 chore(tenant-web): add radix UI, testing-library deps and ESLint config
78264d3 feat(tenant-web): add shared UI components (button, card, badge, input, tabs, separator, scroll-area) with smoke tests
fa46a0a feat(tenant-web): add lib utilities (cn, api client, api types) with tests
4b5b1a3 feat(tenant-web): add theme tokens and Inter font to layout
a08f706 feat(tenant-web): add project config files (tsconfig, next.config, postcss, vitest, next-env, test-setup)
```

### Status
11/11 tasks complete. PR-3d E2E admin calendario fix complete. Remaining: PR-3d booking E2E spec in separate slice.
