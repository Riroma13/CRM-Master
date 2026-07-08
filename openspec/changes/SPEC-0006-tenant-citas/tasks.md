# Tasks: SPEC-0006 — Tenant Citas/Calendario (Frontend PR 3)

**Status:** Planning complete, ready for apply  
**Delivery strategy:** auto-forecast → feature-branch-chain  
**Chain strategy:** feature-branch-chain  
**Tracker branch:** `feat/SPEC-0006-tenant-citas-pr3`  
**Review budget:** 400 changed lines per PR slice

---

## PR Slice Overview

| Slice | Scope | Est. Lines | Dependencies | Ready |
|-------|-------|-----------|--------------|-------|
| PR-3a | Config + shared UI + API client | ~400 | None (starts from Phase 1–2 backend) | ✅ |
| PR-3b | Public booking flow | ~300 | PR-3a (needs API client, UI components) | ❌ |
| PR-3c | Admin dashboard + availability config | ~400 | PR-3a (needs UI components, API client) | ❌ |
| PR-3d | E2E tests | ~200 | PR-3b + PR-3c (needs pages implemented) | ❌ |

**Dependency chain:** PR-3a → PR-3b (UI needs API client + components), PR-3a → PR-3c (same), PR-3b + PR-3c → PR-3d

---

## PR-3a — Config + Shared UI + API Client

**Branch target:** `feat/SPEC-0006-tenant-citas-pr3` (tracker)

### Tasks

- [x] **3a.1 — Project config files** (~80 lines)
  - **Files:**
    - `apps/tenant-web/tsconfig.json` — Create, model on admin-web: `@/*` path alias, Next.js plugins
    - `apps/tenant-web/next.config.ts` — Create, `transpilePackages` for `@crm-master/database`, `@crm-master/shared`
    - `apps/tenant-web/postcss.config.mjs` — Create, `@tailwindcss/postcss` plugin
    - `apps/tenant-web/vitest.config.ts` — Create, `@vitejs/plugin-react`, jsdom env, `@/` alias
    - `apps/tenant-web/next-env.d.ts` — Create, Next.js type references
    - `apps/tenant-web/src/lib/test-setup.ts` — Create, `@testing-library/jest-dom` import
  - **Verification:** `ls` each file exists; `cd apps/tenant-web && npx tsc --noEmit` passes

- [x] **3a.2 — Theme tokens + layout** (~70 lines)
  - **Files:**
    - `apps/tenant-web/src/app/globals.css` — Modify: replace `@import "tailwindcss"` with `@import "tailwindcss"` + `@theme` block containing tokens from admin-web (surface colors, status colors, border-subtle, surface-container, radius, shadow, font-sans Inter)
    - `apps/tenant-web/src/app/layout.tsx` — Modify: import `Inter` from `next/font/google`, add to `<html>` className, wrap body with font classes
  - **Dependencies:** 3a.1 (tsconfig for path resolution)
  - **Verification:** `cd apps/tenant-web && npx next build` succeeds (or at least `npx tsc --noEmit`)

- [x] **3a.3 — Lib utilities** (~180 lines)
  - **Files:**
    - `apps/tenant-web/src/lib/utils.ts` — Create: `cn()` helper (`clsx` + `tailwind-merge`), same as admin-web
    - `apps/tenant-web/src/lib/api.ts` — Create: API client extending admin-web pattern with `get<T>()`, `post<T>()`, `patch<T>()`, `put<T>()`, `NetworkError`, `ApiError`, `buildUrl`, `handleResponse`
    - `apps/tenant-web/src/lib/api-types.ts` — Create: `Slot`, `Cita`, `BookCitaInput`, `DisponibilidadConfig`, `DaySchedule`, `CitaListResponse` interfaces
  - **Dependencies:** 3a.1 (vitest config for tests)
  - **Tests (same commit):**
    - `apps/tenant-web/src/lib/utils.test.ts` — Test `cn()` merges classes correctly
    - `apps/tenant-web/src/lib/api.test.ts` — Test `api.get/post/patch/put` with mocked fetch per admin-web pattern
  - **Verification:** `cd apps/tenant-web && npx vitest run src/lib/`

- [x] **3a.4 — Shared UI components** (~140 lines)
  - **Files (7 copies from admin-web, adapting imports to local `@/lib/utils`):**
    - `apps/tenant-web/src/components/ui/button.tsx` — Copy from `apps/admin-web/src/components/ui/button.tsx`
    - `apps/tenant-web/src/components/ui/card.tsx` — Copy from `apps/admin-web/src/components/ui/card.tsx`
    - `apps/tenant-web/src/components/ui/badge.tsx` — Copy from `apps/admin-web/src/components/ui/badge.tsx`
    - `apps/tenant-web/src/components/ui/input.tsx` — Copy from `apps/admin-web/src/components/ui/input.tsx`
    - `apps/tenant-web/src/components/ui/tabs.tsx` — Copy from `apps/admin-web/src/components/ui/tabs.tsx`
    - `apps/tenant-web/src/components/ui/separator.tsx` — Copy from `apps/admin-web/src/components/ui/separator.tsx`
    - `apps/tenant-web/src/components/ui/scroll-area.tsx` — Copy from `apps/admin-web/src/components/ui/scroll-area.tsx`
  - **Dependencies:** 3a.3 (need `cn()` in utils)
  - **Tests (smoke):** Component smoke test — verify each UI component renders without error
  - **Verification:** `cd apps/tenant-web && npx vitest run src/components/ui/`

### Verification (full slice)
```bash
cd apps/tenant-web
npx tsc --noEmit
npx vitest run src/lib/ src/components/ui/
```
### Rollback
```bash
cd apps/tenant-web
git rm tsconfig.json next.config.ts postcss.config.mjs vitest.config.ts next-env.d.ts
git rm -r src/lib/ src/components/ui/
git checkout src/app/globals.css src/app/layout.tsx
```

---

## PR-3b — Public Booking Flow

**Branch target:** `feat/SPEC-0006-tenant-citas-pr3` (tracker)  
**Depends on:** PR-3a (API client, UI components)

### Tasks

- [x] **3b.1 — useSlots hook** (~50 lines)
  - **File:** `apps/tenant-web/src/hooks/use-slots.ts` — Create
  - **Interface:** `useSlots(date: Date): { slots, isLoading, isError, error, refetch }`
  - **Pattern:** Matches admin-web hook pattern (`useState` + `api.get` + loading/error states)
  - **Endpoint:** `GET /api/v1/tenant/calendario/slots?fecha=...`
  - **Dependencies:** PR-3a (api.ts, api-types.ts)
  - **Tests (same commit):**
    - `apps/tenant-web/src/hooks/use-slots.test.ts` — Mock fetch, assert loading/empty/data/error states
  - **Verification:** `npx vitest run src/hooks/use-slots.test.ts`

- [x] **3b.2 — CalendarPicker component** (~120 lines)
  - **File:** `apps/tenant-web/src/app/calendario/components/calendar-picker.tsx` — Create
  - **Behaviour:** Month/day grid selector, keyboard-navigable (`role="grid"`, arrow keys + Enter + Escape), `aria-label` per day, month navigation buttons, emits `onSelect(date: Date)`, highlights today
  - **Dependencies:** PR-3a (button.tsx, cn())
  - **Tests (same commit):**
    - `apps/tenant-web/src/app/calendario/components/calendar-picker.test.tsx` — RTL: renders month grid, navigates months via buttons, selects a day, keyboard navigation
  - **Verification:** `npx vitest run src/app/calendario/components/calendar-picker.test.tsx`

- [x] **3b.3 — SlotList component** (~80 lines)
  - **File:** `apps/tenant-web/src/app/calendario/components/slot-list.tsx` — Create
  - **Behaviour:** Renders list of available time slots (`Slot[]` from api-types), `aria-selected` on active slot, listbox pattern, `onSelect(slot: Slot)` callback, shows loading/empty states
  - **Dependencies:** PR-3a (scroll-area.tsx, badge.tsx, cn())
  - **Tests (same commit):**
    - `apps/tenant-web/src/app/calendario/components/slot-list.test.tsx` — RTL: renders slots, marks selected slot, empty state, loading state
  - **Verification:** `npx vitest run src/app/calendario/components/slot-list.test.tsx`

- [x] **3b.4 — BookingForm component** (~120 lines)
  - **File:** `apps/tenant-web/src/app/calendario/components/booking-form.tsx` — Create
  - **Behaviour:** Form with fields: nombre (required), email (required), teléfono (optional), descripción (optional, max 500 chars). Client-side validation with zod. Inline validation errors linked via `aria-describedby`. Submit button calls `onSubmit(data)`. Loading state while submitting.
  - **Dependencies:** PR-3a (input.tsx, button.tsx, cn())
  - **Tests (same commit):**
    - `apps/tenant-web/src/app/calendario/components/booking-form.test.tsx` — RTL: renders form fields, shows validation errors on empty submit, submits valid data, shows loading state
  - **Verification:** `npx vitest run src/app/calendario/components/booking-form.test.tsx`

- [x] **3b.5 — BookingConfirmation component** (~50 lines)
  - **File:** `apps/tenant-web/src/app/calendario/components/booking-confirmation.tsx` — Create
  - **Behaviour:** Shows success state after booking: check icon, cita details (date, time, duration), confirmation number, "Volver" button. Props: `cita: Cita`, `onReset(): void`
  - **Dependencies:** PR-3a (card.tsx, button.tsx, cn())
  - **Tests (same commit):**
    - `apps/tenant-web/src/app/calendario/components/booking-confirmation.test.tsx` — RTL: renders confirmation details, calls onReset
  - **Verification:** `npx vitest run src/app/calendario/components/booking-confirmation.test.tsx`

- [x] **3b.6 — Calendario public page** (~60 lines)
  - **File:** `apps/tenant-web/src/app/calendario/page.tsx` — Create
  - **Behaviour:** Orchestrates the full public flow: CalendarPicker → SlotList (when date selected) → BookingForm (when slot selected) → BookingConfirmation (on success). Manages step state. Centered single-column layout, `max-w-2xl`, no sidebar. Calls `POST /api/v1/tenant/calendario/citas` via `api.post()`.
  - **Dependencies:** 3b.1–3b.5 (all public booking components + hook)
  - **Verification:** `npx vitest run src/app/calendario/` (all component + page tests)

### Verification (full slice)
```bash
cd apps/tenant-web
npx tsc --noEmit
npx vitest run src/hooks/use-slots.test.ts src/app/calendario/
```
### Rollback
```bash
cd apps/tenant-web
git rm -r src/app/calendario/ src/hooks/use-slots.ts
```

---

## PR-3c — Admin Dashboard + Availability Config

**Branch target:** `feat/SPEC-0006-tenant-citas-pr3` (tracker)  
**Depends on:** PR-3a (API client, UI components)

### Tasks

- [x] **3c.1 — Admin layout + sidebar** (~90 lines)
  - **Files:**
    - `apps/tenant-web/src/components/layout/sidebar-layout.tsx` — Create: flex layout with 260px sidebar + main content area, responsive: sidebar→drawer `<768px`
    - `apps/tenant-web/src/components/layout/sidebar.tsx` — Create: nav items for tenant admin: Dashboard, Documentos, Calendario. Uses same visual tokens as admin-web sidebar pattern
    - `apps/tenant-web/src/app/admin/layout.tsx` — Create: route group layout wrapping children in `<SidebarLayout>`
  - **Dependencies:** PR-3a (cn(), button.tsx, separator.tsx, scroll-area.tsx)
  - **Tests (same commit):**
    - `apps/tenant-web/src/components/layout/sidebar.test.tsx` — RTL: renders nav items
    - `apps/tenant-web/src/components/layout/sidebar-layout.test.tsx` — RTL: renders sidebar + children
  - **Verification:** `npx vitest run src/components/layout/`

- [x] **3c.2 — useCitas + useDisponibilidad hooks** (~110 lines)
  - **Files:**
    - `apps/tenant-web/src/hooks/use-citas.ts` — Create: `useCitas(): { citas, isLoading, isError, error, refetch, confirmCita(id), cancelCita(id) }`. GET + PATCH via api.
    - `apps/tenant-web/src/hooks/use-disponibilidad.ts` — Create: `useDisponibilidad(): { config, isLoading, isError, error, refetch, updateConfig(data) }`. GET + PUT via api.
  - **Dependencies:** PR-3a (api.ts, api-types.ts)
  - **Tests (same commit):**
    - `apps/tenant-web/src/hooks/use-citas.test.ts` — Mock fetch, assert list/confirm/cancel
    - `apps/tenant-web/src/hooks/use-disponibilidad.test.ts` — Mock fetch, assert load/update
  - **Verification:** `npx vitest run src/hooks/use-citas.test.ts src/hooks/use-disponibilidad.test.ts`

- [x] **3c.3 — KPI bar + CitaCard + CitaList** (~190 lines)
  - **Files:**
    - `apps/tenant-web/src/app/admin/calendario/components/kpi-bar.tsx` — Create: KPI cards showing "Citas hoy", "Pendientes", "Esta semana" counts. Props: `kpis: { hoy, pendientes, semana }`. Responsive: 3→2→1 cols.
    - `apps/tenant-web/src/app/admin/calendario/components/cita-card.tsx` — Create: Cita card with client name, date/time, status badge (pendiente=warning, confirmada=success, cancelada=critical, completada=default), confirm/cancel action buttons. Props: `cita: Cita`, `onConfirm(id)`, `onCancel(id)`
    - `apps/tenant-web/src/app/admin/calendario/components/cita-list.tsx` — Create: Card grid with Tabs (Próximas / Historial), renders CitaCard grid (3→2→1 cols), loading/empty/error states
  - **Dependencies:** PR-3a (card.tsx, badge.tsx, button.tsx, tabs.tsx, cn())
  - **Tests (same commit):**
    - KPI bar tests: renders counts, responsive className
    - CitaCard tests: renders status badge variants, calls onConfirm/onCancel
    - CitaList tests: renders Tabs, empty state, loading state, card grid
  - **Verification:** `npx vitest run src/app/admin/calendario/components/kpi-bar.test.tsx src/app/admin/calendario/components/cita-card.test.tsx src/app/admin/calendario/components/cita-list.test.tsx`

- [x] **3c.4 — ScheduleEditor + BlockedDates** (~140 lines)
  - **Files:**
    - `apps/tenant-web/src/app/admin/calendario/components/schedule-editor.tsx` — Create: Day-of-week schedule grid (Mon–Fri), each row: day label + start time input + end time input + remove button + add row. Props: `schedule: DaySchedule[]`, `onChange(schedule)`
    - `apps/tenant-web/src/app/admin/calendario/components/blocked-dates.tsx` — Create: List of blocked dates (vacations/holidays), each with date display + remove button, "Añadir fecha" input (date picker or text). Props: `dates: string[]`, `onChange(dates)`
  - **Dependencies:** PR-3a (input.tsx, button.tsx, card.tsx, cn())
  - **Tests (same commit):**
    - ScheduleEditor tests: renders day rows, adds/removes row
    - BlockedDates tests: renders date list, adds/removes date
  - **Verification:** `npx vitest run src/app/admin/calendario/components/schedule-editor.test.tsx src/app/admin/calendario/components/blocked-dates.test.tsx`

- [x] **3c.5 — Admin calendario page** (~60 lines)
  - **File:** `apps/tenant-web/src/app/admin/calendario/page.tsx` — Create
  - **Behaviour:** Orchestrates admin view: KpiBar at top (data from useCitas), CitaList below (with confirm/cancel wired to useCitas), ScheduleEditor + BlockedDates in config section (wired to useDisponibilidad with save button)
  - **Dependencies:** 3c.1–3c.4 (all admin components + hooks + layout)
  - **Verification:** `npx vitest run src/app/admin/` (all admin tests)

### Verification (full slice)
```bash
cd apps/tenant-web
npx tsc --noEmit
npx vitest run src/hooks/use-citas.test.ts src/hooks/use-disponibilidad.test.ts src/components/layout/ src/app/admin/
```
### Rollback
```bash
cd apps/tenant-web
git rm -r src/app/admin/ src/hooks/use-citas.ts src/hooks/use-disponibilidad.ts src/components/layout/
```

---

## PR-3d — E2E Tests

**Branch target:** `feat/SPEC-0006-tenant-citas-pr3` (tracker)  
**Depends on:** PR-3b + PR-3c (pages must exist)

### Tasks

- [x] **3d.1 — Public booking E2E** (~100 lines)
  - **Files:**
    - `apps/tenant-web/e2e/booking.setup.ts` — Modify: update storage state setup for fully implemented pages
    - `apps/tenant-web/e2e/booking.spec.ts` — Replace placeholder smoke tests with full flow:
      1. Navigate to `/calendario`
      2. Verify CalendarPicker is visible
      3. Select a date → verify slots appear
      4. Select a slot → verify BookingForm appears
      5. Fill form (nombre, email) → submit
      6. Verify BookingConfirmation shows
      7. Verify confirmation contains cita details
  - **Dependencies:** PR-3b (must be deployed/available)
  - **Verification:** See below

- [x] **3d.2 — Admin calendario E2E** (~100 lines)
  - **File:** `apps/tenant-web/e2e/admin-calendario.spec.ts` — Create
  - **Scenarios:**
    1. Navigate to `/admin/calendario`
    2. Verify sidebar nav is visible
    3. Verify KPI bar renders with counts
    4. Verify cita list renders with citas
    5. Click confirm on a pending cita → verify badge changes to success
    6. Click cancel on a cita → verify badge changes to critical
    7. Edit schedule (add an hour row) → save → verify reflects
    8. Block a date → verify blocked date appears
    9. Unblock a date → verify date removed
  - **Dependencies:** PR-3c (must be deployed/available)
  - **Verification:** See below

### Verification (full slice)
```bash
cd apps/tenant-web
# Requires running apps (tenant-web + API)
npx playwright test e2e/booking.spec.ts e2e/admin-calendario.spec.ts
```
### Rollback
```bash
cd apps/tenant-web
git checkout e2e/booking.spec.ts e2e/booking.setup.ts
git rm e2e/admin-calendario.spec.ts
```

---

## Summary

| Phase | Status | Tasks | Est. Lines |
|-------|--------|-------|-----------|
| Phase 1–2 (Backend) | ✅ Complete | 6 tasks | Done |
| PR-3a (Config + UI + API) | ✅ Complete | 4 tasks | ~400 |
| PR-3b (Public booking) | ✅ Complete | 6 tasks | ~300 |
| PR-3c (Admin dashboard) | ❌ Ready | 5 tasks | ~400 |
| PR-3d (E2E) | ❌ Ready | 2 tasks | ~200 |

**Verification commands:**

```bash
# After PR-3a
cd apps/tenant-web && npx tsc --noEmit && npx vitest run src/lib/ src/components/ui/

# After PR-3b
cd apps/tenant-web && npx tsc --noEmit && npx vitest run src/hooks/use-slots.test.ts src/app/calendario/

# After PR-3c
cd apps/tenant-web && npx tsc --noEmit && npx vitest run src/hooks/use-citas.test.ts src/hooks/use-disponibilidad.test.ts src/components/layout/ src/app/admin/

# After PR-3d (full)
cd apps/tenant-web && npx playwright test
```

**TDD enforcement:** Tests travel with code in the same commit per work-unit-commits rules. Exception: component smoke tests may follow the component in the same commit (not strictly test-first).

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| Theme token drift between admin-web and tenant-web | Copy exact @theme block from admin-web globals.css; visually verify |
| API client inconsistent with backend endpoints | Types in api-types.ts match spec endpoints exactly |
| Admin layout responsive breakpoints misaligned | Use same breakpoints as admin-web (768px drawer) |
| CitaCard status badge colors mismatch | badge.tsx already has warning/success/critical/destructive variants |
| Booking form validation incomplete | zod schema inline in form mirrors `BookCitaSchema` from spec |
| Hooks not following admin-web pattern | Copy pattern from `useDashboardMetrics` (simple GET) and `useClients` (GET + params) |
