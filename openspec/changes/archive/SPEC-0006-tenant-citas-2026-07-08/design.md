# Design: SPEC-0006 — Tenant Citas/Calendario

## Technical Approach

Backend (PR 1-2, done): abstract `CalendarProvider` interface + `LocalCalendarProvider` on PostgreSQL, with `$transaction` for double-booking prevention. All 6 endpoints implemented.

Frontend (PR 3, this design): apply Mission Control visual language (admin-web tokens + UI components) to tenant-web. **Tenant admin calendario** mirrors the dashboard pattern: sidebar, KPI cards, filter tabs, cita card grid. **Public booking** is a focused calendar→slots→form→confirmation flow, same tokens, no dashboard chrome.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Calendar engine | Abstract interface + LocalCalendarProvider | cal.com self-hosted, raw SQL | Allows cal.com swap in v2 without rewriting consumers |
| Booking atomicity | Prisma `$transaction` | Advisory locks, `SELECT FOR UPDATE` | Simplest atomic check-and-create pattern |
| Tenant isolation | `tenant_id` in Cita + Disponibilidad tables | Separate DBs per tenant | Same row-level pattern as rest of system |
| UI components | Copy admin-web `components/ui/` to tenant-web | Shared package, shadcn/ui CLI | admin-web components are battle-tested Radix primitives matching the exact visual system. No shared package exists |
| Data fetching | Manual `useState` + `api.get()` hooks | TanStack Query, SWR | Consistency with admin-web. Citas data is low-frequency — no cache invalidation complexity needed |
| Theme tokens | Copy admin-web `globals.css` @theme block | Design tokens package | Immediate visual consistency. Covers all needed surfaces/states |
| Admin layout | SidebarLayout matching admin-web pattern | Inline layout, app router group | Admin pages need sidebar nav for Mission Control feel. Tenant admin gets its own sidebar with tenant nav items |
| Form validation | Client `useState` + zod | React Hook Form | Booking form has 5 fields. zod already in deps |
| Calendar widget | Custom CalendarPicker component | react-day-picker, @radix-ui/react-date-picker | Spec scope is simple month/day selector. Avoid heavy date-picker for this |

## Data Flow

```
  Public booking:
  CalendarPicker ──(date)──→ SlotList ──(slot)──→ BookingForm ──(submit)──→ POST /api/v1/tenant/calendario/citas
                                                                                    │
                                                                                    ▼
                                                                           BookingConfirmation

  Admin view:
  GET /citas ──→ CitaList (card grid with status badges, confirm/cancel actions)
  GET /disponibilidad ──→ ScheduleEditor (day/hour grid) + BlockedDates (date list)
  PUT /disponibilidad ←── both write back
```

API client (`lib/api.ts`) extends admin-web pattern: admin-web's `api.ts` currently only exports `api.get<T>()`. Tenant-web adds `api.post<T>()`, `api.patch<T>()`, `api.put<T>()` in the same style (`NetworkError`, `ApiError`, `buildUrl`, `handleResponse`). Tenant resolved via Host header — no explicit tenantId in frontend calls.

## Visual System Tokens

From admin-web (copied into `apps/tenant-web/src/app/globals.css`):

| Token | Value | Usage |
|---|---|---|
| `--color-surface` | `#fcf8fa` | Page background |
| `--color-on-surface` | `#1b1b1d` | Primary text |
| `--color-on-surface-variant` | `#45464d` | Secondary text, labels |
| `--color-primary-container` | `#131b2e` | Buttons, brand elements |
| `--color-success` | `#10b981` | Confirmed status |
| `--color-warning` | `#f59e0b` | Pending status |
| `--color-critical` | `#ef4444` | Cancelled status |
| `--color-border-subtle` | `#e2e8f0` | Card borders |
| `--color-surface-container` | `#f0edef` | KPI icon bg, inactive tabs |
| `--font-sans` | Inter | All text |
| `--radius-lg` | `0.5rem` | Cards |
| `--shadow-ambient` | `0 4px 6px -1px rgb(0 0 0 / 0.05)` | Card elevation |

Type scale: 11px uppercase labels, 13px subtitle, 16px heading, 30px KPI values.

## Admin Layout

```
┌──────────┬──────────────────────────────────────────┐
│ Sidebar  │ Header: "Calendario"                      │
│ 260px    │ ┌─────────┬─────────┬─────────┐           │
│          │ │ KPI: Hoy│ KPI: Sem │ KPI: Mes│          │
│ nav:     │ └─────────┴─────────┴─────────┘           │
│ Dashboard│ ┌──────────────────────────────────┐      │
│ Docs     │ │ Tabs: [Próximas] [Historial]     │      │
│ Calendar │ │ ┌──────────────────────────────┐ │      │
│          │ │ │ CitaCard │ CitaCard │ ...     │ │      │
│          │ │ └──────────────────────────────┘ │      │
│          │ └──────────────────────────────────┘      │
│          │ ┌ Config ─────────────────────────┐      │
│          │ │ ScheduleEditor │ BlockedDates   │      │
│          │ └─────────────────────────────────┘      │
└──────────┴──────────────────────────────────────────┘
```

Public booking: centered single-column flow, max-w-2xl, no sidebar.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/tenant-web/src/app/globals.css` | Modify | Add admin-web @theme tokens, font import |
| `apps/tenant-web/src/app/layout.tsx` | Modify | Add Inter font |
| `apps/tenant-web/tsconfig.json` | Create | Next.js + TypeScript config, `@/*` path alias (modeled on admin-web) |
| `apps/tenant-web/next.config.ts` | Create | `transpilePackages` for `@crm-master/database`, `@crm-master/shared` |
| `apps/tenant-web/postcss.config.mjs` | Create | `@tailwindcss/postcss` plugin (Tailwind v4) |
| `apps/tenant-web/vitest.config.ts` | Create | `@vitejs/plugin-react`, jsdom env, `@/` alias |
| `apps/tenant-web/next-env.d.ts` | Create | Next.js type references |
| `apps/tenant-web/src/lib/test-setup.ts` | Create | `@testing-library/jest-dom` import |
| `apps/tenant-web/src/lib/api.ts` | Create | API client + NetworkError/ApiError |
| `apps/tenant-web/src/lib/api-types.ts` | Create | Slot, Cita, DisponibilidadConfig types |
| `apps/tenant-web/src/lib/utils.ts` | Create | cn() helper |
| `apps/tenant-web/src/components/ui/button.tsx` | Create | Copy from admin-web |
| `apps/tenant-web/src/components/ui/card.tsx` | Create | Copy from admin-web |
| `apps/tenant-web/src/components/ui/badge.tsx` | Create | Copy from admin-web |
| `apps/tenant-web/src/components/ui/input.tsx` | Create | Copy from admin-web |
| `apps/tenant-web/src/components/ui/tabs.tsx` | Create | Copy from admin-web |
| `apps/tenant-web/src/components/ui/separator.tsx` | Create | Copy from admin-web |
| `apps/tenant-web/src/components/ui/scroll-area.tsx` | Create | Copy from admin-web |
| `apps/tenant-web/src/components/layout/sidebar-layout.tsx` | Create | Admin sidebar layout shell |
| `apps/tenant-web/src/components/layout/sidebar.tsx` | Create | Admin nav items |
| `apps/tenant-web/src/app/admin/layout.tsx` | Create | Admin route group layout |
| `apps/tenant-web/src/app/admin/calendario/page.tsx` | Create | Admin calendario dashboard |
| `apps/tenant-web/src/app/admin/calendario/components/kpi-bar.tsx` | Create | "Hoy/Semana/Pendientes" KPI cards |
| `apps/tenant-web/src/app/admin/calendario/components/cita-card.tsx` | Create | Cita card with status badge |
| `apps/tenant-web/src/app/admin/calendario/components/cita-list.tsx` | Create | Card grid + tabs |
| `apps/tenant-web/src/app/admin/calendario/components/schedule-editor.tsx` | Create | Day/hour schedule UI |
| `apps/tenant-web/src/app/admin/calendario/components/blocked-dates.tsx` | Create | Blocked dates manager |
| `apps/tenant-web/src/app/calendario/page.tsx` | Create | Public booking flow |
| `apps/tenant-web/src/app/calendario/components/calendar-picker.tsx` | Create | Month/day selector |
| `apps/tenant-web/src/app/calendario/components/slot-list.tsx` | Create | Available time slots |
| `apps/tenant-web/src/app/calendario/components/booking-form.tsx` | Create | Client data form |
| `apps/tenant-web/src/app/calendario/components/booking-confirmation.tsx` | Create | Confirmation screen |
| `apps/tenant-web/src/hooks/use-slots.ts` | Create | GET /slots hook |
| `apps/tenant-web/src/hooks/use-citas.ts` | Create | GET/PATCH /citas hook |
| `apps/tenant-web/src/hooks/use-disponibilidad.ts` | Create | GET/PUT /disponibilidad hook |
| `apps/tenant-web/e2e/booking.spec.ts` | Modify | Replace placeholder smoke tests with full public booking flow |
| `apps/tenant-web/e2e/admin-calendario.spec.ts` | Create | Admin calendario E2E: view/confirm/cancel citas, edit schedule, block dates |
| `apps/tenant-web/e2e/booking.setup.ts` | Modify | Update storage state setup for implemented pages |

## Interfaces / Contracts

```ts
// lib/api-types.ts
interface Slot { start: string; end: string; available: boolean; }
interface BookCitaInput { fecha: string; clienteNombre?: string; clienteEmail?: string; clienteTelefono?: string; descripcion?: string; }
interface Cita { id: string; fecha: string; duracion: number; estado: 'pendiente'|'confirmada'|'cancelada'|'completada'; clienteNombre?: string; clienteEmail?: string; titulo: string; descripcion?: string; }
interface DisponibilidadConfig { timezone: string; slotDuration: number; minNotice: number; maxDays: number; dailySchedule: DaySchedule[]; blockedDates: string[]; }
interface DaySchedule { day: number; start: string; end: string; }

// lib/api.ts — extends admin-web's get-only pattern; adds post/patch/put
const api = {
  get<T>(path: string, params?: Record<string,string|number|undefined>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
}
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (vitest) | API types, cn(), zod schemas | Pure functions |
| Component (vitest+RTL) | CalendarPicker keyboard nav, SlotList rendering, BookingForm validation errors, CitaCard status badge variants | React Testing Library |
| Hook (vitest) | useSlots, useCitas, useDisponibilidad with mocked fetch | Mock fetch, assert loading/error/data states |
| E2E (Playwright) | Public booking: pick date → select slot → fill form (name/email/phone/desc) → submit → see confirmation. Admin: view citas list → confirm cita → cancel cita → edit schedule (add/remove day hours) → block date → unblock date | `e2e/booking.spec.ts` (public), `e2e/admin-calendario.spec.ts` (admin), `e2e/booking.setup.ts` (modify) |

## Responsive & Accessibility

- **Breakpoints**: Sidebar→drawer `<768px`. KPI grid: 4→2→1 cols. Cita grid: 3→2→1 cols.
- **CalendarPicker**: keyboard-navigable grid (arrows+enter+escape), `role="grid"` with `aria-label` for each day
- **SlotList**: listbox pattern, `aria-selected` on active slot, arrow key navigation
- **BookingForm**: labeled inputs, inline validation errors linked via `aria-describedby`
- **Focus**: visible `focus-visible:ring-2 focus-visible:ring-primary` per admin-web pattern
- **Motion**: respect `prefers-reduced-motion`

## Design Deviations vs. Spec

1. **No shadcn/ui CLI components**: Admin-web uses hand-rolled Radix primitives. We follow that convention, not shadcn/ui's CLI-generated components.
2. **No TanStack Query**: Admin-web uses manual `useState` + `api.get()` hooks with 300ms debounce. We match.
3. **KPI cards added for admin view**: Spec doesn't mention dashboard-style KPIs but Mission Control visual language uses them. "Citas hoy", "Pendientes", "Esta semana" give immediate overview.
4. **Admin sidebar required**: Spec lists only the calendario page but admin needs navigation context. We add sidebar-layout with tenant nav items.

## Review Workload & PR Strategy

**Estimated change**: ~32 files, projected >400 changed lines. **Chained PRs: REQUIRED** per work-unit-commits rules.

| Slice | Scope | Key Files | Est. Lines |
|---|---|---|---|
| PR-3a | Config + shared UI | tsconfig, next.config, postcss, vitest, next-env, test-setup, globals.css, layout.tsx, lib/api.ts, lib/api-types.ts, lib/utils.ts, 7 UI components | ~400 |
| PR-3b | Public booking flow | calendario/page.tsx, calendar-picker, slot-list, booking-form, booking-confirmation, use-slots hook | ~300 |
| PR-3c | Admin dashboard + config | admin/layout, sidebar-layout, sidebar, calendario/page, kpi-bar, cita-card, cita-list, schedule-editor, blocked-dates, use-citas, use-disponibilidad hooks | ~400 |
| PR-3d | E2E tests | booking.spec.ts, admin-calendario.spec.ts, booking.setup.ts | ~200 |

Each slice is a reviewable work unit: independent start/finish state, verification included, rollback-safe without reverting unrelated work.

## Open Questions

None.
