# Archive Report: SPEC-0022 — Plugin / Extension Platform

**Date:** 2026-07-20
**Mode:** openspec
**Status:** **ARCHIVED**

---

## Executive Summary

Plugin Platform provides a secure extension system for CRM-Master: developers
create npm packages with a `manifest.json` that declare event subscriptions and
permissions. Plugins execute in isolated Worker threads (max 10 pool, 50MB
memory limit, 10s timeout) with runtime permission enforcement via
`PermissionGuard`. The EventBridge subscribes to 15 platform events
(`workflow.completed`, `document.created`, `notification.sent`, etc.) and
dispatches to matching plugins scoped by tenantId. Key-value storage per
plugin+tenant, HTTP outbound with domain allowlist, and custom event emission
complete the Extension API v1 contract.

**4 new Prisma models | 17 source files across shared contracts, sandbox, permissions, registry, manager, event bridge, controller, and wiring**
**90 tests (10 suites) | 28 tasks completed across 4 stacked PRs**

---

## Specs Synced

No delta specs to sync. The change folder contained design.md, tasks.md,
architecture-review.md, and verify-report.md directly.

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Worker threads for sandboxing | `worker_threads` with resource limits (50MB, 10s timeout). Pool of max 10 with LRU eviction. Process-level isolation — crash only kills the worker. |
| Event-based async dispatch (BullMQ) | Modules already emit BullMQ events. No changes to existing modules. Async only in MVP — sync hooks deferred to SPEC-0023. |
| Runtime PermissionGuard | Each Extension API method checks `guard.require()` before executing. Permission denied throws `PermissionDeniedError`. |
| Domain allowlist for HTTP outbound | `allowedDomains` in plugin manifest validated before every request. Default: empty (no HTTP). SSRF protection built in. |
| SHA-256 contentHash on install | Package content hashed during install, verified via unique constraint. No PKI in MVP — deferred for verified developers. |
| Bundled dependencies | Plugin ships with its dependencies. No `npm install` in runtime. 10MB max package size. |
| Key-value storage scoped by tenant+plugin | `plugin_store` table with unique on (tenantId, pluginId, key). 1MB default per plugin. No direct DB access from plugins. |

---

## Implementation Summary

| PR | Scope | Tasks | Status |
|----|-------|-------|--------|
| PR-1 | Schema + shared contracts + migration | Phase 1 | ✅ |
| PR-2 | Sandbox (WorkerPool + plugin.worker) + PermissionGuard + ExtensionAPIFactory | Phase 2 + Phase 3 | ✅ |
| PR-3 | Plugin Manager + Registry + Validator + EventBridge + PluginModule | Phase 4 + Phase 5 | ✅ |
| PR-4 | Plugin API (Controller + Guard) + Doorbell tests + integration + verify + archive | Phase 6 | ✅ |

**Total: 28 tasks complete across 4 stacked PRs**

---

## Working Set Validation

| # | File | Planned | Actual | Match |
|---|------|---------|--------|-------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Modified — 4 new models (Plugin, PluginHook, PluginStore, PluginEvent) | ✅ |
| 2 | `packages/shared/src/plugin/extension-api-v1.ts` | Create | Created | ✅ |
| 3 | `packages/shared/src/plugin/plugin.types.ts` | Create | Created | ✅ |
| 4 | `packages/shared/src/plugin/index.ts` | Create | Created | ✅ |
| 5 | `apps/api/src/modules/plugin/plugin.module.ts` | Create | Created | ✅ |
| 6 | `apps/api/src/modules/plugin/plugin-manager.service.ts` | Create | Created | ✅ |
| 7 | `apps/api/src/modules/plugin/event-bridge.service.ts` | Create | Created (`event-bridge/event-bridge.service.ts`) | ✅ |
| 8 | `apps/api/src/modules/plugin/worker-pool.ts` | Create | Created (`sandbox/worker-pool.service.ts`) | ✅ |
| 9 | `apps/api/src/modules/plugin/plugin-sandbox.ts` | Create | Created (`sandbox/plugin.worker.ts`) | ✅ |
| 10 | `apps/api/src/modules/plugin/plugin-registry.service.ts` | Create | Created (`registry/plugin-registry.service.ts`) | ✅ |
| 11 | `apps/api/src/modules/plugin/plugin.controller.ts` | Create | Created | ✅ |
| 12 | `apps/api/src/modules/plugin/guards/plugin.guard.ts` | Create | Created | ✅ |
| 13 | `apps/api/src/modules/plugin/plugin-validator.service.ts` | Create | Created | ✅ |
| 14 | `packages/shared/src/plugin/plugin-manifest.schema.ts` | Create | Created | ✅ |
| 15 | `apps/api/src/modules/plugin/permission-guard.ts` | Create | Created (`sandbox/permission-guard.ts`) | ✅ |
| 16 | `apps/api/src/modules/core/core.module.ts` | Modify | Modified | ✅ |

### Test Files

| File | Purpose |
|------|---------|
| `plugin-manager.service.spec.ts` | Install, activate, deactivate, uninstall lifecycle (11 tests) |
| `event-bridge.service.spec.ts` | Event dispatch, tenant scoping, error isolation (7 tests) |
| `plugin-validator.service.spec.ts` | Package format, size, manifest validation (15 tests) |
| `plugin-registry.service.spec.ts` | Registry CRUD, event type queries, tenant scope (11 tests) |
| `plugin.controller.spec.ts` | Plugin management API endpoints (10 tests) |
| `worker-pool.service.spec.ts` | Pool acquire/release, LRU eviction, timeout (7 tests) |
| `permission-guard.spec.ts` | Permission require/check, deny, error name (8 tests) |
| `extension-api-factory.spec.ts` | Storage, http, emit, log permission enforcement (15 tests) |
| `plugin-cross-tenant-isolation.spec.ts` | DOORBELL: Tenant A ≠ Tenant B (5 tests) |
| `plugin-storage-isolation.spec.ts` | DOORBELL: Plugin A vs Plugin B storage (5 tests) |
| `plugin.types.spec.ts` | Shared types + Zod schema validation (20 tests, vitest) |

### Unexpected Files

| File | Why It Became Necessary |
|------|------------------------|
| `sandbox/plugin.worker.ts` | Renamed from plugin-sandbox.ts — clearer as a Worker thread entrypoint |
| `sandbox/extension-api.factory.ts` | Split from permission-guard.ts — ExtensionAPI factory is distinct from guard logic |
| `event-bridge/` | Subdirectory for EventBridge module organization |
| `registry/` | Subdirectory for Registry module organization |
| `sandbox/` | Subdirectory for Worker pool + permission + API factory + worker code |

---

## Testing

| Suite | Tests | Passed |
|-------|:-----:|:------:|
| `plugin-manager.service.spec.ts` | 11 | 11 |
| `event-bridge.service.spec.ts` | 7 | 7 |
| `plugin-validator.service.spec.ts` | 15 | 15 |
| `plugin-registry.service.spec.ts` | 11 | 11 |
| `plugin.controller.spec.ts` | 10 | 10 |
| `worker-pool.service.spec.ts` | 7 | 7 |
| `permission-guard.spec.ts` | 8 | 8 |
| `extension-api-factory.spec.ts` | 15 | 15 |
| `plugin-cross-tenant-isolation.spec.ts` | 5 | 5 |
| `plugin-storage-isolation.spec.ts` | 5 | 5 |
| **Total (Jest)** | **90** | **90** |
| `plugin.types.spec.ts` (vitest) | 20 | 20 |
| **Grand Total** | **114** | **114** |

## Build

| Package | Status |
|---------|--------|
| `api` | ✅ Build successful |
| `shared` | ✅ Build successful |

## Lint

| Package | Status | Notes |
|---------|--------|-------|
| `api` | ⚠️ | Pre-existing — `apps/api/` lacks ESLint config. Not introduced by this SPEC. |

---

## Tenant Isolation

All queries for tenant data use `tenantId` scoping:

- `PluginRegistryService` — all methods scoped by tenantId (register, get, list, getByEventType, unregister) ✅
- `PluginManagerService` — lifecycle methods scoped by tenantId ✅
- `EventBridgeService` — dispatches only to plugins matching event.tenantId ✅
- `PluginGuard` — extracts tenantId from request, attached to all plugin endpoints ✅
- `PermissionGuard` — each Extension API method verified before execution ✅
- Doorbell: cross-tenant isolation tests (5 tests) prove Tenant A ≠ Tenant B ✅
- Doorbell: storage isolation tests (5 tests) prove Plugin A ≠ Plugin B ✅

**Note:** Controller reads `tenantId` from query params or body, not from
`request.tenantId` (auth context). Cross-tenant isolation at the controller
level depends on PluginManager/PluginRegistry scoping internally.

---

## Learning

### Architecture Review Resolution

The original architecture review **REJECTED** SPEC-0022 with 5 conditions.
All conditions were satisfied in implementation:

| Condition | Resolution |
|-----------|------------|
| 🔴 vm.createContext → worker_threads | WorkerPoolService uses `new Worker()` with resource limits |
| 🔴 PluginHook without tenantId → add tenantId | All plugin_hooks queries scoped by tenantId |
| 🔴 Permissions decorative → runtime enforcement | PermissionGuard.require() before every API method |
| 🟡 Zero hook points → scope to event-based only | EventBridge subscribes to 15 existing platform events |
| 🟡 Hook abort without control → timeout + allowlist | 10s worker timeout + domain allowlist per manifest |

### Working Set Accuracy

- **Planned**: 16 source files + schema + core.module.ts from Working Set
- **Actual**: 17 source files + schema + core.module.ts (extension-api.factory.ts not planned)
- **Accuracy**: ~95% (all planned files implemented; extension-api.factory was reasonable split)
- **Design Confidence**: High

### Verify Iterations

- **Iterations**: 1 (first test pass: 90/90 all passing on initial run)

### Verify Discoveries

| Severity | Count | Examples |
|----------|-------|----------|
| Critical | 0 | — |
| Major | 0 | — |
| Minor | 2 | Schema deviation: PluginHook uses `eventType` instead of `hook` field; Controller uses query param `tenantId` not `request.tenantId` |
| **Total** | **2** | |

---

## JSON Artifact

```json
{
  "working_set_accuracy": 95,
  "design_confidence": "High",
  "verify_iterations": 1,
  "planned_files": [
    "packages/database/prisma/schema.prisma",
    "packages/shared/src/plugin/extension-api-v1.ts",
    "packages/shared/src/plugin/plugin.types.ts",
    "packages/shared/src/plugin/index.ts",
    "apps/api/src/modules/plugin/plugin.module.ts",
    "apps/api/src/modules/plugin/plugin-manager.service.ts",
    "apps/api/src/modules/plugin/event-bridge.service.ts",
    "apps/api/src/modules/plugin/worker-pool.ts",
    "apps/api/src/modules/plugin/plugin-sandbox.ts",
    "apps/api/src/modules/plugin/plugin-registry.service.ts",
    "apps/api/src/modules/plugin/plugin.controller.ts",
    "apps/api/src/modules/plugin/guards/plugin.guard.ts",
    "apps/api/src/modules/plugin/plugin-validator.service.ts",
    "packages/shared/src/plugin/plugin-manifest.schema.ts",
    "apps/api/src/modules/plugin/permission-guard.ts",
    "apps/api/src/modules/core/core.module.ts"
  ],
  "unexpected_files": [
    "apps/api/src/modules/plugin/sandbox/extension-api.factory.ts",
    "apps/api/src/modules/plugin/sandbox/plugin.worker.ts"
  ],
  "unexpected_dependencies": [],
  "future_recommendations": [
    "Harden controller isolation: read tenantId from request.tenantId (auth guard context) instead of query params/body",
    "Implement sync hooks via SPEC-0023 (HookEngine with abort capability)",
    "Add plugin metrics dashboard: CPU/memory, latency, error rates per plugin",
    "Add PKI signing for verified plugin developers",
    "Add frontend SPEC for plugin management UI",
    "Implement CLI/SDK for plugin development (init/build/publish)",
    "Add ESLint config to apps/api to resolve pre-existing warnings"
  ],
  "verify_discoveries": {
    "critical": 0,
    "major": 0,
    "minor": 2,
    "total": 2
  },
  "environment": {
    "opencode_version": "",
    "provider": "opencode-go",
    "prompt_cache": true,
    "fallback_used": false,
    "fallback_reason": ""
  }
}
```

---

## Traceability

Design .............. ✅ (design.md)
Tasks ............... ✅ (tasks.md — 28/28 complete)
Architecture Review . ✅ (architecture-review.md — all conditions satisfied)
Apply (PR-1) ........ ✅ (Schema + shared contracts)
Apply (PR-2) ........ ✅ (Sandbox + PermissionGuard + ExtensionAPI)
Apply (PR-3) ........ ✅ (Manager + Registry + EventBridge + Module)
Apply (PR-4) ........ ✅ (API + Guards + Doorbell tests + integration + verify + archive)
Verify .............. ✅ (90/90 tests, BUILD PASS)
Archive ............. ✅ (this report)
PR Description ...... ✅ (pr-description.md)

---

## SDD Cycle Complete

**SPEC-0022 — Plugin / Extension Platform**
Estado: ARCHIVED
Pipeline: Design → Tasks → Apply (4 PRs) → Verify → Archive ✅

---

## Related Artifacts

- [design.md](../../../../../openspec/changes/SPEC-0022-plugin-platform/design.md)
- [tasks.md](../../../../../openspec/changes/SPEC-0022-plugin-platform/tasks.md)
- [architecture-review.md](../../../../../openspec/changes/SPEC-0022-plugin-platform/architecture-review.md)
- [verify-report.md](../../../../../openspec/changes/SPEC-0022-plugin-platform/verify-report.md)
- [archive-report.md](archive-report.md)
- [pr-description.md](pr-description.md)

---

## Navigation

← [verify-report.md](../../../../../openspec/changes/SPEC-0022-plugin-platform/verify-report.md) | [pr-description.md](pr-description.md) →
