# SPEC-0022 — Plugin / Extension Platform

## Summary

Plugin Platform enables third-party developers to extend CRM-Master via
isolated npm packages that react to platform events. Plugins run in Worker
threads with resource limits (max 10 pool, 50MB memory, 10s timeout) and
runtime permission enforcement. The EventBridge subscribes to 15 existing
platform events (`workflow.completed`, `document.created`, etc.) and
dispatches to matching plugins scoped by tenantId.

**17 source files | 90 tests (10 suites) | 28 tasks | 4 PRs stacked-to-main**

## Features

- **Extension API v1**: Key-value storage (scoped by plugin+tenant), HTTP
  outbound (domain allowlist), event emission, scoped logging
- **Worker Thread Sandbox**: `worker_threads` with `resourceLimits.maxOldGenerationSizeMb = 50`.
  Pool of max 10 workers with LRU eviction. 10s timeout via `worker.terminate()`.
  Crash isolation — only the worker dies, process continues.
- **Runtime PermissionGuard**: Every Extension API method checks
  `guard.require()` before executing. `storage:read`, `storage:write`,
  `http:outbound`, `events:emit` enforced at runtime.
- **EventBridge**: Subscribes to 15 platform events on module init.
  Matches plugins by `tenantId + eventType`. Dispatches to Worker pool.
  Failed plugins don't block others (Promise.allSettled).
- **Plugin Manager**: `install` (tgz/zip with SHA-256 contentHash),
  `activate`, `deactivate`, `uninstall` lifecycle. Manifest validation
  via Zod schema. Max package size 10MB.
- **Plugin Registry**: Tenant-scoped CRUD with event type subscription
  queries. Hooks created per eventType for efficient lookup.
- **Plugin API**: `POST /api/v1/plugins/install`, `POST/:id/activate`,
  `POST/:id/deactivate`, `DELETE/:id`, `GET`, `GET/:id`.
- **Platform Events (MVP)**: `workflow.completed`, `document.created`,
  `document.updated`, `document.uploaded`, `document.deleted`,
  `notification.sent`, `cliente.creado`, `pago.recibido`, `incidencia.creada`,
  `communication.send`, `entity.created`, `entity.updated`, `entity.deleted`,
  `cita.confirmada`, `cita.cancelada`, `tarea.overdue`

## Architecture

- **4 new Prisma models**: Plugin, PluginHook, PluginStore, PluginEvent
- **Shared contracts**: EventEnvelope, Permission, PluginManifest,
  PluginMetadata, ExtensionAPIV1, PluginManifestSchema (Zod)
- **Worker thread isolation** (not vm.createContext — per architecture review)
- **Runtime permission enforcement** (not decorative — per architecture review)
- **Module**: PluginModule at `apps/api/src/modules/plugin/`

### Implementation (4 stacked PRs)

- PR-1 — Schema migration + 4 Prisma models + shared types
- PR-2 — Worker Pool + plugin.worker + PermissionGuard + ExtensionAPIFactory
- PR-3 — PluginManager + Registry + Validator + EventBridge + PluginModule
- PR-4 — Plugin controller + guards + doorbell tests + integration + verify + archive

## Verification

| Metric | Value |
|--------|-------|
| Working Set Accuracy | ~95% |
| Architecture Review Conditions | All 5 satisfied |
| Verify Iterations | 1 (all 90 tests passing on first run) |
| Critical Discoveries | 0 |
| Major Discoveries | 0 |
| Minor Discoveries | 2 (schema deviation: PluginHook uses eventType; controller tenantId from query param) |
| Build | ✅ |
| Tests | 90/90 (10 suites) + 20 vitest type tests |

## Documentation

- design.md
- tasks.md
- architecture-review.md
- verify-report.md
- archive-report.md
- pr-description.md

## Status

✅ Ready for merge — PR-4 (final)

---

## Related Artifacts

- [design.md](../../../../openspec/changes/SPEC-0022-plugin-platform/design.md)
- [tasks.md](../../../../openspec/changes/SPEC-0022-plugin-platform/tasks.md)
- [architecture-review.md](../../../../openspec/changes/SPEC-0022-plugin-platform/architecture-review.md)
- [verify-report.md](../../../../openspec/changes/SPEC-0022-plugin-platform/verify-report.md)
- [archive-report.md](archive-report.md)
- [pr-description.md](pr-description.md)

---

## Navigation

← [archive-report.md](archive-report.md)
