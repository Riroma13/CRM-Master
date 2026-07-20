# Tasks: SPEC-0022 — Plugin / Extension Platform

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1800–2500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1: schema+types → PR2: sandbox+perm → PR3: manager+registry → PR4: eventbridge+api+tests |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|----|---------------------|-----------------|-------------------|
| 1 | Schema + shared contracts | PR1 | `pnpm --filter database prisma migrate dev --name add_plugin_platform` | `pnpm --filter database generate` | schema.prisma + migration revert |
| 2 | Sandbox + PermissionGuard | PR2 | `pnpm --filter api test plugin-sandbox` | N/A — isolated unit tests | `plugin-sandbox.ts` + `worker-pool.ts` + `permission-guard.ts` |
| 3 | Plugin Manager + Registry | PR3 | `pnpm --filter api test plugin-manager` | N/A — isolated unit tests | manager/ + registry/ + validator/ services |
| 4 | EventBridge + API + Tests | PR4 | `pnpm test -- --testPathPattern=plugin` | Local API + BullMQ worker | event-bridge/ + controller/ + guards/ |

## Phase 1: Schema + shared contracts

- [ ] 1.1 Create `packages/shared/src/plugin/plugin.types.ts` — EventEnvelope, Permission, PluginManifest, PluginMetadata
- [ ] 1.2 Create `packages/shared/src/plugin/extension-api-v1.ts` — ExtensionAPIV1 interface
- [ ] 1.3 Create `packages/shared/src/plugin/plugin-manifest.schema.ts` — Zod schema for manifest validation
- [ ] 1.4 Create `packages/shared/src/plugin/index.ts` — re-exports
- [ ] 1.5 Add Plugin, PluginStore, PluginEvent models to `packages/database/prisma/schema.prisma`
- [ ] 1.6 Run migration: `pnpm --filter database prisma migrate dev --name add_plugin_platform`
- [ ] 1.7 Test: shared types compile, Zod validates/invalidates manifests correctly

## Phase 2: Plugin Sandbox + Worker Pool (sdd-apply-pro)

- [ ] 2.1 Create `plugin-sandbox.ts` — Worker thread spawn, postMessage communication, 10s timeout, crash isolation
- [ ] 2.2 Create `worker-pool.ts` — Max 10 workers, LRU eviction, worker.resourceLimits 50MB
- [ ] 2.3 Test: pool acquire/release, LRU eviction, timeout terminates worker, crash doesn't kill host process

## Phase 3: Extension API + PermissionGuard (sdd-apply-pro)

- [ ] 3.1 Create `permission-guard.ts` — require() checks manifest permissions, throws on denied
- [ ] 3.2 Implement ExtensionAPIFactory — wraps storage/http/emit/log with PermissionGuard, domain allowlist on http
- [ ] 3.3 Test: each permission enforced before action, denied throws, allowed proceeds, http blocked outside allowlist

## Phase 4: Plugin Manager + Registry

- [ ] 4.1 Create `plugin-registry.service.ts` — tenant-scoped CRUD, Redis cache TTL 5min
- [ ] 4.2 Create `plugin-validator.service.ts` — SHA-256 contentHash verification, Zod manifest validation, max size 10MB
- [ ] 4.3 Create `plugin-manager.service.ts` — lifecycle: install, activate, deactivate, delete, upgrade with onUpgrade
- [ ] 4.4 Test: registry scoped by tenantId, validator rejects bad hash/manifest/size, lifecycle transitions correctly

## Phase 5: EventBridge + dispatch (sdd-apply-pro)

- [ ] 5.1 Create `event-bridge.service.ts` — BullMQ listener, match plugins by tenantId+eventType, dispatch to Worker pool, log result
- [ ] 5.2 Create `plugin.module.ts` — NestJS module wiring all services + controllers
- [ ] 5.3 Test: event triggers matching plugin, non-matching tenantId skipped, async dispatch doesn't block caller

## Phase 6: Plugin API + Guards + Integration Tests (sdd-apply-pro)

- [ ] 6.1 Create `plugin.guard.ts` — tenant isolation guard for plugin management endpoints
- [ ] 6.2 Create `plugin.controller.ts` — POST install, POST activate, POST deactivate, DELETE, POST upgrade
- [ ] 6.3 Modify `apps/api/src/modules/core/core.module.ts` — import PluginModule
- [ ] 6.4 Doorbell: `plugin-cross-tenant-isolation.spec.ts` — Tenant A plugin not invoked by Tenant B events
- [ ] 6.5 Doorbell: `plugin-storage-isolation.spec.ts` — Plugin A store isolated from Plugin B
- [ ] 6.6 Doorbell: `plugin-permission-denied.spec.ts` — missing http:outbound blocks HTTP request
- [ ] 6.7 Integration: `plugin-event-dispatch.spec.ts` — full flow: module event → Bridge → Worker → handler
- [ ] 6.8 Integration: `plugin-lifecycle.spec.ts` — install → activate → dispatch → deactivate → upgrade → delete
