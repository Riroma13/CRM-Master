# Verify Report: secure-plugin-execution-boundary

> **Initial normalized result:** BLOCKED — preserved history; see fresh Verify update below
> **Action:** Verify
> **Role:** HIGH / ARCHITECT
> **Model binding:** `openai/gpt-5.6-terra`
> **Persistence:** hybrid

## Entry and Evidence Consumed

The approved Design, fresh PASS Architecture Review, Tasks, fresh PASS Tasks
Review, PASS Workload Guard with the recorded HUMAN feature-branch-chain
authorization, and the complete Apply Summary (including its preserved initial
7.5 blocked evidence and 7.5/7.6 GREEN evidence) were consumed. The Design
Working Set and Read Order were followed before bounded contradiction checks.

Apply 7.6 supplies the required real HTTP evidence: the disposable Tenant A/B
doorbell passed **1 suite / 4 tests / 0 skipped**, including cleanup. Its
original `404` was correctly traced to `TenantResolveMiddleware` rejecting an
unseeded Host slug before controller/guards; disposable Tenant A/B bootstrap,
not a production route/authentication change, produced the required `401`
identity result. The approved test-only fixture deviation is also recorded:
`packages/shared/src/plugin/__tests__/plugin.types.spec.ts` adds only required
`PluginMetadata.enabled: false` fixture fields.

## Fresh Bounded Checks

| Check | Result |
| --- | --- |
| Focused plugin Jest | PASS — 7 suites / 63 tests / 0 skipped |
| `pnpm --filter @crm-master/shared lint` | PASS |
| `pnpm --filter api lint` | PASS |
| `pnpm --filter api build` | PASS |
| `pnpm sdd:validate` | PASS |
| `git diff --check` | PASS |

The doorbell was not reprovisioned or rerun: its accepted no-skip disposable
runtime evidence is preserved in Apply 7.5/7.6 and this Verify is constrained
not to provision databases.

## Acceptance Matrix

| P0 acceptance criterion | Evidence | Result |
| --- | --- | --- |
| Global-first Host/session/membership authority; caller tenant ignored | `PluginController` consumes only `request.pluginContext.tenantId`; `IdentityOrganizationGuard` establishes session, Host tenant, organization membership, and active organization before `PluginGuard`; focused tests and Apply doorbell cover anonymous and forged input. | PASS |
| Six management surfaces are tenant scoped; foreign access is denied pre-effect | Controller routes pass trusted tenant only; registry reads and `setInactive` use tenant predicates; Apply doorbell proves cross-tenant `404` and no effects. | PASS, except uninstall mutation finding below |
| Strict manifest/archive admission before effects; source is not persisted | Validator accepts exactly one `manifest.json`; strict shared schema rejects unknown fields/capabilities; manager validates before registry registration and stores hash/metadata only. | PASS |
| Registration is inactive/disabled; activation is deterministic `409` | Registry explicitly writes `status: 'inactive'`, `enabled: false`; manager throws `PLUGIN_EXECUTION_DISABLED`; focused and doorbell evidence pass. | PASS |
| Event bridge, worker pool, direct worker, source loading, and dynamic evaluation are unreachable/fail closed | Worker pool fails closed and evaluator file is deleted, but EventBridge retains a `dispatchToPlugin` implementation that calls the worker pool and then attempts delivery logging. | **BLOCKED** |
| Working Set and deviation discipline | `packages/shared/src/plugin/index.ts` is modified but is neither one of the approved 19 files nor the declared fixture-only deviation. It exports the new production contracts. | **BLOCKED** |

## Material Blockers

### V-01 — EventBridge direct dispatch path is not fail-closed before effects

`apps/api/src/modules/plugin/event-bridge/event-bridge.service.ts:70-82`
retains `dispatchToPlugin`. It invokes `workerPool.execute(...)` and then
attempts `logEventDelivery(...)`; its catch logs an execution failure. This
contradicts Tasks 1.3 and the Design contract requiring `dispatchToPlugin` to
fail with `PLUGIN_EXECUTION_DISABLED` before worker, delivery/logging, or other
plugin effects. `onEvent` is correctly fail-closed, but that does not prove the
named direct dispatch path.

**Narrow correction evidence required:** a bounded correction in the approved
EventBridge Working Set that removes or makes `dispatchToPlugin` immediately
throw the stable disabled error without calling the pool, registry, delivery
logger, or execution-error logger; focused test coverage must exercise that
path and prove no calls. Then rerun the seven focused suites and required
handoff checks.

### V-02 — Undeclared out-of-Working-Set production change

`git diff --name-only` shows a change to
`packages/shared/src/plugin/index.ts`. The exact Design/Tasks Working Set has
19 files and does not list this barrel. Apply 7.6 instead declares the sole
deviation to be the test-only shared fixture. The barrel is a production
consumer/export surface, so the claim that no out-of-scope production consumer
changed is false. The change exports `PLUGIN_EXECUTION_DISABLED` and
`TrustedPluginContext` for API imports.

**Narrow correction evidence required:** the orchestrator must obtain and
record an authorized bounded Working Set deviation for this production barrel,
including why the shared contract cannot be consumed without it and confirmation
that it changes no public behavioral contract; or otherwise remove it through
the orchestrator-owned Direct Fix. Do not silently relabel it as the test-only
fixture deviation.

## Verdict and Recovery

The fresh test/lint/build/validator evidence is passing, and the preserved
doorbell evidence is valid. However, V-01 leaves a named P0 execution path
noncompliant, and V-02 makes the Working Set/deviation record inaccurate.
Verify therefore cannot normalize to PASS.

Under `docs/SDD-WORKFLOW.md:102-105,126-143`, the only next action is the one
orchestrator-owned **Direct Fix** permitted by the Verify correction budget,
limited to the correction evidence above. A fresh HIGH / ARCHITECT Verify is
mandatory after that action. Archive and all maintainer Git lifecycle actions
remain illegal while this result is BLOCKED.

---

## Fresh Verify After Single Direct Fix

> **Normalized result:** PASS
> **Action:** Verify
> **Role:** HIGH / ARCHITECT
> **Correction budget:** Consumed; no further Direct Fix is permitted.

### Evidence consumed

Consumed the preserved initial BLOCKED Verify (including V-01/V-02),
`verify-direct-fix.md`, approved Design, PASS Architecture Review, Tasks, PASS
Tasks Review, PASS Workload Guard and recorded HUMAN authorization, and Apply
Summary 7.1–7.6. The approved Working Set and Read Order were consumed before
one bounded source/diff contradiction check.

The accepted Apply 7.5/7.6 no-skip real HTTP Tenant A/B evidence is preserved,
not reprovisioned: **1 suite / 4 tests / 0 skipped** proves global-first
anonymous denial, forged-tenant containment, same-tenant metadata lifecycle,
inactive install, disabled activation, Tenant B isolation, and no delivery
record. No database was provisioned or rerun in this Verify.

### Fresh contradiction check

| P0 criterion | Fresh evidence | Result |
| --- | --- | --- |
| EventBridge cannot reach worker, registry, delivery persistence, or execution-error logging | `event-bridge.service.ts:56-61` makes `dispatchToPlugin` immediately throw `ConflictException({ code: PLUGIN_EXECUTION_DISABLED })`; it has no pool, registry, Prisma, or logger reference. `onEvent` remains an immediate disabled throw (`47-54`). The typed direct-dispatch test proves `409`/code and zero pool, registry, Prisma-delivery, and logger calls (`event-bridge.service.spec.ts:32-65`). | PASS |
| Event bridge registers no listener | `onModuleInit` is intentionally empty (`32-34`); approved test proves `EventEmitter2.on` is not called (`67-79`). | PASS |
| Worker pool and deleted worker fail closed/static-safe | `WorkerPoolService.execute` immediately throws disabled (`worker-pool.service.ts:6-10`), counters remain zero, and its approved test verifies no dynamic evaluation/Worker/source loader and absent `plugin.worker.ts` (`worker-pool.service.spec.ts:6-23`). | PASS |
| Tenant authority/isolation and metadata-only behavior | Preserved focused 7-suite evidence plus accepted no-skip Tenant A/B HTTP evidence; trusted context remains Host/session/membership-derived (`plugin.guard.ts:7-22`). | PASS |
| Exact Working Set/deviations | `git status --short`/`git diff --name-only` show the 18 tracked approved Working Set paths plus deleted worker, the approved untracked doorbell, the declared fixture-only `packages/shared/src/plugin/__tests__/plugin.types.spec.ts`, and lifecycle evidence. `packages/shared/src/plugin/index.ts` is absent. | PASS |

### Test, lint, and build evidence

| Check | Result | Source |
| --- | --- | --- |
| Focused EventBridge test | PASS — 1 suite / 3 tests / 0 skipped | `verify-direct-fix.md:59-61` |
| Seven focused plugin suites | PASS — 7 suites / 64 tests / 0 skipped | `verify-direct-fix.md:61` |
| Shared lint | PASS | `verify-direct-fix.md:62` |
| API lint / build | PASS / PASS | `verify-direct-fix.md:63-64` |
| `git diff --check` | PASS | Fresh bounded check; no output |
| `pnpm sdd:validate` | PASS — final handoff command | Fresh Verify; `CRM-SDD governance validation: PASS` |

### Verdict and next action

V-01 and V-02 are closed with direct source, approved-test, and final-diff
evidence. No acceptance contradiction remains. Under
`docs/SDD-WORKFLOW.md:102-105,126-143`, Verify is **PASS** and the next legal
action is **Archive** by LOW / OPERATOR-EVIDENCE. Commit, push, merge, release,
and tag remain HUMAN / MAINTAINER-only.
