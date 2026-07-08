# Tasks: SPEC-0006 — Tenant Citas/Calendario

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
PR slice: 1/3 (models + provider)
400-line budget risk: High

## Phase 1: Modelo + Provider
- [x] 1.1 Prisma: add Disponibilidad + Cita models, migrate
- [x] 1.2 Create CalendarProvider interface + LocalCalendarProvider

## Phase 2: Backend API
- [x] 2.1 DisponibilidadService: CRUD disponibilidad, slot generation
- [x] 2.2 CitasService: booking con doble reserva prevention
- [x] 2.3 CitasController: 6 endpoints (público + admin)
- [x] 2.4 CitasModule + app.module.ts registration

## Phase 3: Frontend tenant-web
- [ ] 3.1 CalendarPicker, SlotList, BookingForm, BookingConfirmation
- [ ] 3.2 Admin: ScheduleEditor, BlockedDates, CitaList

## Phase 4: Tests
- [ ] 4.1 Unit: slot generation, booking validation, disponibilidad schema
- [ ] 4.2 Integration: all 6 endpoints
- [ ] 4.3 Playwright E2E: booking flow + admin flow
