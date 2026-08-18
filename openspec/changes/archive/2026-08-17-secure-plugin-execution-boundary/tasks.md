# Tasks: Secure Plugin Execution Boundary

## Review Workload Forecast
Estimated changed lines: 650–900; 19-file security remediation.
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Branch isolation: `sec/secure-plugin-execution-boundary`; no stacked-to-main.
Units: PR1 (base feature branch): RED tests/contracts; focused Jest; runtime N/A (unit fixtures); rollback tests/contracts. PR2 (base PR1): guards, admission, registry, disabled runtime; focused Jest; runtime N/A (disabled unit effects); rollback those implementation files. PR3 (base PR2): HTTP wiring/deletion/doorbell; disposable-DB e2e; Tenant A/B doorbell; rollback integration/deletion. Each unit must remain independently reviewable.

## Exact Working Set (19 files; only these may change)
1. `apps/api/src/modules/plugin/plugin.controller.ts` — Modify: trusted HTTP authority and stable errors; no route expansion.
2. `apps/api/src/modules/plugin/guards/plugin.guard.ts` — Modify: Host/session/membership context only.
3. `apps/api/src/modules/plugin/plugin.module.ts` — Modify: guard/Identity wiring and no worker wiring.
4. `apps/api/src/modules/plugin/plugin-manager.service.ts` — Modify: validate before effects; metadata/hash only.
5. `apps/api/src/modules/plugin/plugin-validator.service.ts` — Modify: manifest/archive allow-list.
6. `apps/api/src/modules/plugin/registry/plugin-registry.service.ts` — Modify: tenant-scoped metadata and inactive state.
7. `apps/api/src/modules/plugin/event-bridge/event-bridge.service.ts` — Modify: disabled before dispatch/logging.
8. `apps/api/src/modules/plugin/sandbox/worker-pool.service.ts` — Modify: disabled failure; no Worker/message.
9. `apps/api/src/modules/plugin/sandbox/plugin.worker.ts` — Delete: remove evaluator and dynamic execution.
10. `packages/shared/src/plugin/plugin-manifest.schema.ts` — Modify: strict manifest/capability contract.
11. `packages/shared/src/plugin/plugin.types.ts` — Modify: trusted context and disabled contracts.
12. `apps/api/src/modules/plugin/__tests__/plugin.controller.spec.ts` — Modify: route/authority RED coverage.
13. `apps/api/src/modules/plugin/__tests__/plugin-manager.service.spec.ts` — Modify: validation/effects RED coverage.
14. `apps/api/src/modules/plugin/__tests__/plugin-validator.service.spec.ts` — Modify: archive RED coverage.
15. `apps/api/src/modules/plugin/__tests__/plugin-cross-tenant-isolation.spec.ts` — Modify: scoped read/mutate RED coverage.
16. `apps/api/src/modules/plugin/sandbox/__tests__/worker-pool.service.spec.ts` — Modify: disabled/static reachability RED coverage.
17. `apps/api/src/modules/plugin/__tests__/event-bridge.service.spec.ts` — Modify: no dispatch/delivery RED coverage.
18. `apps/api/src/modules/plugin/__tests__/plugin-registry.service.spec.ts` — Modify: explicit inactive/disabled persistence RED coverage.
19. `apps/api/test/doorbell/plugin-tenant-isolation.doorbell.spec.ts` — Create: real Tenant A/B HTTP evidence only.

## Concrete Design Read Order
1. `apps/api/src/modules/plugin/plugin.controller.ts`; 2. `apps/api/src/modules/identity/identity-organization.guard.ts`, then `apps/api/src/modules/identity/workflow-tenant-context.guard.ts`; 3. `apps/api/src/modules/plugin/guards/plugin.guard.ts`, then `apps/api/src/modules/plugin/plugin.module.ts`; 4. `apps/api/src/modules/plugin/plugin-manager.service.ts`, `apps/api/src/modules/plugin/plugin-validator.service.ts`, `packages/shared/src/plugin/plugin-manifest.schema.ts`, `packages/shared/src/plugin/plugin.types.ts`; 5. `apps/api/src/modules/plugin/registry/plugin-registry.service.ts`, then `packages/database/prisma/schema.prisma` Plugin models; 6. `apps/api/src/modules/plugin/event-bridge/event-bridge.service.ts`, `apps/api/src/modules/plugin/sandbox/worker-pool.service.ts`, `apps/api/src/modules/plugin/sandbox/plugin.worker.ts`; 7. `apps/api/src/modules/plugin/__tests__/plugin.controller.spec.ts`, `apps/api/src/modules/plugin/__tests__/plugin-manager.service.spec.ts`, `apps/api/src/modules/plugin/__tests__/plugin-validator.service.spec.ts`, `apps/api/src/modules/plugin/__tests__/plugin-cross-tenant-isolation.spec.ts`, `apps/api/src/modules/plugin/sandbox/__tests__/worker-pool.service.spec.ts`, `apps/api/src/modules/plugin/__tests__/event-bridge.service.spec.ts`, `apps/api/src/modules/plugin/__tests__/plugin-registry.service.spec.ts`, `apps/api/test/doorbell/plugin-tenant-isolation.doorbell.spec.ts`. Do not broaden this order or set.

Scope exclusions: `packages/database/prisma/schema.prisma` changes/migrations; `apps/api/src/common/guards/*`; `apps/api/src/common/middleware/tenant-resolve.middleware.ts`; `apps/api/src/modules/core/core.module.ts`; workflow, public API, marketplace, Docker, infrastructure, SDD governance, common-auth redesign, source/runtime expansion, feature flags, and source reprocessing. No implementation artifacts or Git lifecycle operations.

## Phase 1: RED (all before GREEN)
- [x] 1.1 In `plugin.controller.spec.ts`, cover exactly POST `/api/v1/plugins/install`, GET `/api/v1/plugins`, GET `/api/v1/plugins/:id`, POST `/api/v1/plugins/:id/activate`, POST `/api/v1/plugins/:id/deactivate`, DELETE `/api/v1/plugins/:id`: anonymous/missing Host/session/membership, role, forged `tenantId`, same-tenant success, foreign `404`, and pre-effect denial.
- [x] 1.2 In validator/manager tests, reject malformed/path/compressed/duplicate/source/executable/unknown-capability/limit archives before registry/filesystem effects; prove source is not persisted.
- [x] 1.3 In registry, bridge, and pool tests, prove inactive `status`, `enabled: false`, activation `409`; `EventBridgeService.onEvent`, `dispatchToPlugin`, and `WorkerPoolService.execute` fail before lookup, delivery/logging, or effects. In the already-approved `worker-pool.service.spec.ts`, add a RED static reachability assertion reading approved plugin paths: no `new Function`, `eval` or equivalent dynamic evaluation, `new Worker` creation, source loaders, or `plugin.worker.ts` path.
- [x] 1.4 Create the no-skip Tenant A/B doorbell proving valid manifest-only install, forged-B denial, anonymous denial, same-tenant list/read/deactivate/delete, activation `409`, and no delivery/Worker evidence.

## Phase 2: GREEN (dependency order)
- [x] 2.1 Implement trusted context and scoped management; ignore caller `tenantId` and preserve global-first errors.
- [x] 2.2 Implement strict admission, validation-before-effects, inactive metadata/hash persistence, and source discard.
- [x] 2.3 Disable `onEvent`, `dispatchToPlugin`, `execute`, Worker creation/message/source loading; delete `plugin.worker.ts` and all dynamic evaluation reachability.
- [x] 2.4 Update shared contracts/module wiring only; no schema, common-auth, infrastructure, governance, marketplace, public API, or runtime expansion.

## Phase 3: Checkpoints and Acceptance
- [x] 3.1 After each slice run focused Jest; all RED scenarios execute with no skips, then GREEN proves only approved behavior.
- [x] 3.2 Expected commands: `pnpm --filter api test -- plugin.controller.spec.ts plugin-manager.service.spec.ts plugin-validator.service.spec.ts`; `pnpm --filter api test -- worker-pool.service.spec.ts event-bridge.service.spec.ts plugin-cross-tenant-isolation.spec.ts plugin-registry.service.spec.ts`; `DATABASE_TEST_URL=<disposable-url> pnpm --filter api test:e2e -- plugin-tenant-isolation.doorbell.spec.ts`; `pnpm --filter api lint`; `pnpm --filter api build`; `pnpm sdd:validate:design -- openspec/changes/secure-plugin-execution-boundary/design.md`; `pnpm sdd:validate`.
- [x] 3.3 At handoff, rerun both validators; record command output and no implementation/Git operations.
- [x] 3.4 Accept only Host/session/membership authority, Tenant A/B isolation with no pre-effect mutation, same-tenant metadata management, inactive registration, and deterministic execution disablement. Preserve unrelated lucide failures only as reproduced baseline debt.
