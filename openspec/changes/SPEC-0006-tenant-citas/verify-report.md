# Verification Report — SPEC-0006-tenant-citas (design phase re-review)

**Change:** `SPEC-0006-tenant-citas`  
**Project:** crm-master  
**Phase:** `sdd-design` gatekeeper re-review  
**Artifact store mode:** `both`  
**Review date:** 2026-07-07  

## Verdict

| Field | Value |
|---|---|
| `gate_status` | `PASS_WITH_WARNINGS` |
| `recommendation` | Proceed to `sdd-tasks` after updating `tasks.md` to align PR slices with this design. |
| `skill_resolution` | `paths-injected` |

## Blockers (CRITICAL)

None.

## Warnings (non-blocking)

1. **`tasks.md` PR slice mismatch.** `tasks.md` still labels the current slice as `PR slice: 1/3 (models + provider)` and does not break Phase 3 into the `PR-3a..d` slices defined in the design. Update tasks before `sdd-apply` so the chained PR boundaries match the design.
2. **E2E auth setup for admin flow.** The design modifies `booking.setup.ts` for both public and admin E2E flows, but admin calendario endpoints require a tenant-admin session. Ensure the setup creates a separate authenticated storage state (or a dedicated Playwright project) before apply.
3. **`next-env.d.ts` hand-creation.** The design lists `next-env.d.ts` as a created file. Next.js can regenerate this file; committing it is acceptable but it should not be manually edited.
4. **Vitest setup file wiring.** `src/lib/test-setup.ts` is created but the `vitest.config.ts` description does not explicitly reference it via `test.setupFiles`. Confirm the wiring during apply.
5. **Admin auth headers in tenant-web `api.ts`.** The design mirrors admin-web's `api.ts` pattern, which injects `NEXT_PUBLIC_API_TOKEN` as a Bearer header. Tenant-web admin calls will need the same treatment; the apply phase should verify it.

## Previous review blockers — resolution status

| Previous blocker | Status | Evidence |
|---|---|---|
| Missing tenant-web config files in design changes | **Resolved** | `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts` are all listed in the File Changes table. |
| False `tsconfig.json` deviation claim | **Resolved** | Design Deviations section no longer contains any `tsconfig.json` claim. |
| API client description inaccurate | **Resolved** | The description now correctly states admin-web `api.ts` only exports `api.get<T>()` and tenant-web will add `post/patch/put` in the same `NetworkError`/`ApiError`/`buildUrl`/`handleResponse` style, matching `apps/admin-web/src/lib/api.ts`. |
| E2E testing strategy not covering real flows | **Resolved** | Testing Strategy table now describes full public booking flow (date → slot → form → confirmation) and admin flow (view/confirm/cancel/edit schedule/block/unblock). |
| Chained PR strategy undocumented | **Resolved** | A dedicated `Review Workload & PR Strategy` section documents `PR-3a..d` slices, estimated lines, and rollback-safe boundaries. |

## Design coherence vs spec

| Spec requirement | Design coverage |
|---|---|
| Abstract `CalendarProvider` + `LocalCalendarProvider` | Confirmed in Architecture Decisions and opening paragraph. |
| 6 endpoints (slots, booking, citas CRUD, disponibilidad CRUD) | Confirmed; frontend hooks call all of them. |
| Public booking UI (`CalendarPicker`, `SlotList`, `BookingForm`) | File Changes and Data Flow cover all components. |
| Admin UI (`ScheduleEditor`, `BlockedDates`, `CitaList`) | File Changes cover all components plus `kpi-bar` and `cita-card`. |
| Tenant isolation (`tenant_id`) | Design preserves Host-header resolution and `tenant_id` backend scoping. |
| E2E Playwright tests | Dedicated E2E files and strategy included. |

## Notes

- No code was changed during this review.
- No runtime tests were executed because this is a design-phase review; the verification is artifact-based.
- The spec remains in `proposed` state; approval should happen before `sdd-apply` per project convention.
