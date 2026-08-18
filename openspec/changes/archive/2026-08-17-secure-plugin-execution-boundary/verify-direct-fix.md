# Verify Direct Fix: secure-plugin-execution-boundary

> **Status:** COMPLETE — correction applied; fresh HIGH / ARCHITECT Verify required
> **Action:** Single orchestrator-owned Verify Direct Fix
> **Role:** MID / BUILDER

## Correction-loop state

This artifact records the one correction permitted after the preserved BLOCKED
Verify report. It is not a new Apply phase and does not start Verify. The Verify
correction budget is consumed by this Direct Fix; the next legal action is one
fresh HIGH / ARCHITECT Verify.

## V-01 correction

`EventBridgeService.dispatchToPlugin` now throws
`ConflictException({ code: PLUGIN_EXECUTION_DISABLED })` as its first and only
operation. The worker call, delivery persistence helper, and execution-error
logging path were removed. `onEvent` remains fail-closed and
`onModuleInit` still registers no event listeners.

The approved event-bridge test invokes the private method through a typed test
cast and proves HTTP status `409`, the stable disabled code, and no calls to
`WorkerPoolService.execute`, registry lookup, Prisma delivery creation, or the
execution-error logger. The existing `onEvent` and `onModuleInit` fail-closed
tests remain present.

## V-02 correction

The unapproved production additions to `packages/shared/src/plugin/index.ts`
were removed explicitly, restoring its baseline exports. No Working Set
deviation was obtained or invented. The required API consumers now import the
approved contracts directly from `@shared/plugin/plugin.types` (and the
manifest output from its approved schema subpath) in:

- `plugin-manager.service.ts`
- `guards/plugin.guard.ts`
- `sandbox/worker-pool.service.ts`
- `event-bridge/event-bridge.service.ts`

This is removal of undeclared production scope, not scope expansion. The
approved `plugin.types.ts` contracts and public behavior remain unchanged.

## Changed paths

- `apps/api/src/modules/plugin/event-bridge/event-bridge.service.ts`
- `apps/api/src/modules/plugin/__tests__/event-bridge.service.spec.ts`
- `apps/api/src/modules/plugin/plugin-manager.service.ts`
- `apps/api/src/modules/plugin/guards/plugin.guard.ts`
- `apps/api/src/modules/plugin/sandbox/worker-pool.service.ts`
- `packages/shared/src/plugin/index.ts` — restored to baseline; absent from the final production diff
- `openspec/changes/secure-plugin-execution-boundary/verify-direct-fix.md`

No Design, Tasks, Reviews, Workload Guard, Apply Summary, fixture, doorbell,
schema, infrastructure, common-auth, or Git lifecycle artifact was changed.

## Evidence

- RED-first focused test before implementation: failed because direct dispatch resolved instead of rejecting.
- Focused `event-bridge.service.spec.ts`: PASS — 1 suite / 3 tests / 0 skipped.
- Full seven focused plugin suites: PASS — 7 suites / 64 tests / 0 skipped.
- `pnpm --filter @crm-master/shared lint`: PASS.
- `pnpm --filter api lint`: PASS.
- `pnpm --filter api build`: PASS.
- `pnpm sdd:validate`: PASS.
- `git diff --check`: PASS.
- Final `git diff --name-only` contains no `packages/shared/src/plugin/index.ts`.
- No database provisioning or doorbell rerun was performed; the accepted
  no-skip Tenant A/B evidence remains preserved in the prior Apply and Verify
  artifacts.
