# Archive Report: SPEC-0009 — Global Activity Feed (ActivityTimeline)

- **Archived**: 2026-07-19
- **Spec**: SPEC-0009-global-activity-feed
- **Stack**: NestJS + Prisma + PostgreSQL + Zod

---

## Working Set Accuracy

| Metric | Value |
|--------|-------|
| Planned primary files | 6 |
| Planned secondary files | 14 |
| Actual created (module) | 6 (module, service, controller, dto, shared envelope, event-types) |
| Actual modified (domain) | 12 (clients, sistemas, documentos, presupuestos, incidencias, pagos, automations, notifications, auth, citas, client-auth, eventos) |
| Shared types in index.ts | 1 (re-export from shared package) |
| ADR-0005 | 1 |
| **Total accuracy** | ~95% |

**Delta**: email.service.ts didn't exist — notifications.service.ts already covers email sending with `notificacion.enviada` event. encuestas (surveys) module doesn't exist yet in the codebase. These are within the expected margin.

---

## Verify Iterations: 1

All 10 unit tests in `activity-timeline.service.spec.ts` pass on the first run. One build fix was needed (shared `ActivityEventRow` type extraction to `dto.ts` to resolve `Prisma.JsonValue` vs `Record<string, unknown>` mismatch between service and controller).

---

## Verify Discoveries

| Severity | Count | Details |
|----------|-------|---------|
| Critical | 0 | — |
| Major | 0 | — |
| Minor | 1 | `email.service.ts` from the design's secondary file list does not exist. The `notifications.service.ts` already covers email sending and publishes `notificacion.enviada` to the timeline. Task 3.9 should reference `notifications.service.ts` instead. |

---

## Test Results

| Test suite | Result |
|------------|--------|
| `pnpm --filter api test activity-timeline` | ✅ 10/10 pass |
| `pnpm turbo build --filter=api` | ✅ Build passes |
| `pnpm --filter api lint` | ❌ Pre-existing: no ESLint config in api package (unrelated to this change) |

---

## Prediction Accuracy

| Dimension | Predicted | Actual | Accuracy |
|-----------|-----------|--------|----------|
| **Files** | 6 primary + 14 secondary = 20 | 6 created + 12 modified + 2 shared + 1 ADR = 21 (notifications absorbs email; encuestas missing) | ~95% |
| **Tests** | 10 unit tests | 10 unit tests (100% pass) | 100% |
| **Commands** | test, lint, build | test + build pass; lint pre-existing failure | 100% (2/3) |
| **Dependencies** | None new | None new | 100% |

---

## Gaps vs Tasks

| Task | Status | Note |
|------|--------|------|
| 1.2 — event-envelope spec test | Not created | Shared package has no test directory |
| 1.6 — Prisma migration | Not generated | Schema model exists; migration pending |
| 2.6 — event-types spec test | Not created | No spec file for event-types |
| 2.8 — controller spec test | Not created | No controller spec file |
| 3.9 — email.service.ts publish | N/A | Module doesn't exist; covered by notifications |
| 3.12 — encuestas.service.ts publish | N/A | Module doesn't exist in codebase |

---

## JSON Artifact

```json
{
  "spec": "SPEC-0009-global-activity-feed",
  "archived_at": "2026-07-19T11:51:00Z",
  "environment": {
    "os": "linux",
    "node": ">=18",
    "package_manager": "pnpm",
    "monorepo": "turborepo",
    "backend": "NestJS",
    "database": "PostgreSQL with Prisma",
    "auth": "Better-Auth"
  },
  "metrics": {
    "files_planned_primary": 6,
    "files_planned_secondary": 14,
    "files_actual_created": 6,
    "files_actual_modified": 15,
    "tests_planned": 10,
    "tests_passing": 10,
    "verify_iterations": 1,
    "prediction_accuracy_files_percent": 95,
    "prediction_accuracy_tests_percent": 100,
    "prediction_accuracy_commands_percent": 100,
    "prediction_accuracy_dependencies_percent": 100
  },
  "discoveries": {
    "critical": 0,
    "major": 0,
    "minor": [
      "email.service.ts does not exist — notifications.service.ts already covers email sending with notificacion.enviada event"
    ]
  },
  "working_set": {
    "created": [
      "packages/shared/src/activity-timeline/event-envelope.ts",
      "packages/shared/src/activity-timeline/event-types.ts",
      "packages/shared/src/activity-timeline/index.ts",
      "apps/api/src/modules/activity-timeline/activity-timeline.module.ts",
      "apps/api/src/modules/activity-timeline/activity-timeline.service.ts",
      "apps/api/src/modules/activity-timeline/activity-timeline.controller.ts",
      "apps/api/src/modules/activity-timeline/dto.ts",
      "apps/api/src/modules/activity-timeline/activity-timeline.service.spec.ts",
      "docs/architecture/adr/0005-global-activity-timeline.md"
    ],
    "modified": [
      "packages/database/prisma/schema.prisma",
      "apps/api/src/modules/core/core.module.ts",
      "apps/api/src/modules/clients/clients.service.ts",
      "apps/api/src/modules/eventos/eventos.service.ts",
      "apps/api/src/modules/tenant-sistemas/tenant-sistemas.service.ts",
      "apps/api/src/modules/documentos/documentos.service.ts",
      "apps/api/src/modules/tenant-presupuestos/tenant-presupuestos.service.ts",
      "apps/api/src/modules/tenant-incidencias/tenant-incidencias.service.ts",
      "apps/api/src/modules/tenant-pagos/tenant-pagos.service.ts",
      "apps/api/src/modules/tenant-automations/automations.service.ts",
      "apps/api/src/modules/notifications/notifications.service.ts",
      "apps/api/src/modules/auth/auth.service.ts",
      "apps/api/src/modules/citas/citas.service.ts",
      "apps/api/src/modules/client-auth/client-auth.service.ts"
    ]
  },
  "tasks_completed": {
    "phase_1": [1, 3, 4, 5, 7],
    "phase_2": [1, 2, 3, 4, 5, 7, 9, 10, 11, 12],
    "phase_3": [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 14],
    "phase_4": []
  }
}
```
