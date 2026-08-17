# Verify: Secure Workflow Execution Boundary

> **Normalized result:** BLOCKED
> **Executor:** HIGH / ARCHITECT — `openai/gpt-5.6-terra`
> **Persistence:** hybrid; this file is the exact Verify artifact.

## Scope and evidence boundary

Consumed the approved Design §5 Working Set and §6 Read Order, fresh PASS
Architecture Review, fresh PASS Tasks Review, and complete Apply Summary before
inspection. Verification stayed within the approved workflow boundary. No
production code, Design, Tasks, database, database provisioning, or Git
lifecycle state was changed. The disposable PR3 database/container had been
cleaned up as recorded by Apply; it was not recreated or rerun.

## Acceptance evidence

| Contract | Evidence | Result |
|---|---|---|
| Global-first permission order and anonymous full-route denial | `app.module.ts:31-46` retains BetterAuth → TenantScope → RateLimit → Permissions; `permissions.guard.ts:24-58` maps no user to `lector` and denies the declared workflow permission. The Apply PR3 record reports anonymous create/publish/start/resume/read/control `403` before service spies. | PASS |
| Trusted tenant and identity authority | `tenant-resolve.middleware.ts:104-115` sets immutable Host-derived context; `identity-organization.guard.ts:56-86` requires provider session, Host tenant, matching organization and membership; `workflow-tenant-context.guard.ts:13-24` derives context only from those fields. | PASS |
| Resource and start-route tenant isolation | Definition/instance guards scope through `workflowContext.tenantId` (`workflow-definition.guard.ts:10-20`, `workflow-execution.guard.ts:10-20`). The start route includes `WorkflowDefinitionGuard` (`workflow.controller.ts:79-88`), which resolves `body.definitionId` before service lookup. Published-version lookup additionally constrains `definition.tenantId = tenantId` (`definition.service.ts:90-96`). Apply PR3 records the exact A/B start denial as `403`. | PASS |
| Runtime schema and no dynamic execution | Shared schema is strict, bounded, and rejects expression/unknown input (`node-types.ts:3-59`); definition and execution services parse before writes/state change (`definition.service.ts:11-27,55-87`; `workflow.service.ts:23-49,54-84`); decision evaluation uses own-field strict literal comparison (`node-executor.ts:61-82`). | PASS |
| Exact Apply runtime packet and cleanup | Apply records disposable `pgvector/pgvector:pg16`, vector `0.8.6`, a dedicated ephemeral database, no `DATABASE_URL`/`crm_test.public` use, cleanup, and exact PR3 result: 1 suite / 6 tests / 0 skipped. It also records no Redis `NOAUTH` or connection-limit error. The test harness is explicitly disposable-only (`workflow-execution-boundary.e2e-spec.ts:13-53,101,170-183`). | PASS |
| Required controller test boundary | The approved Design requires replacement of the always-allow controller fixture with the production guard sequence and authenticated Host/session/membership cases (`design.md:67-70,121-135`). `workflow.controller.spec.ts:10-21,57-68` still mocks all local guards and installs an always-allow `APP_GUARD`; its cases still send caller `query.tenantId` (`:78-180`). This does not provide the required controller-level proof. | BLOCKED |

## Fresh bounded command evidence

| Command | Exit | Result | Output SHA-256 |
|---|---:|---|---|
| `pnpm --filter @crm-master/shared test -- workflow` | 0 | 1 suite / 4 tests passed | `fc063b2785ec28ba0f0d2cc6958eb62d9ea50958111c5c1b4c938f18a652e472` |
| `pnpm --filter api test -- --runInBand workflow` | 0 | 7 suites / 46 tests passed | `1238f1952275a5599df61d93dbe8b71f16386a23240db8216e5a95f246a13103` |
| `pnpm --filter api lint` | 0 | PASS | `c770ce006a072224b104645923a90652bed70fdbca1680cfda0adb21e866c1bf` |
| `pnpm --filter api build` | 0 | PASS | `cd85d8c8b7a56d2153d902c791e942b27c7fbca3353a36d1986ae2b6b7111d91` |
| `pnpm --filter @crm-master/shared lint` | 0 | PASS | `b64caf9bf5e065cecc1ec8121d39db6ed6a88bbd2a17673f2638e672be6ec38b` |
| `git diff --check` | 0 | PASS | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

The real-AppModule PR3 command was not rerun because this Verify is prohibited
from provisioning a database and Apply records its disposable baseline cleanup.
Its exact 6/6/0 runtime evidence is accepted as the completed Apply evidence
packet, subject to the blocker below.

## Working Set and dependencies

`git diff --name-only` shows the 19 approved primary/secondary files plus the
one recorded bounded fixture deviation,
`apps/api/src/modules/workflow/workflow-cross-tenant-isolation.spec.ts`.
No dependency, Prisma schema/migration, app-module, middleware, frontend,
plugin, infrastructure, credential, or Git lifecycle change is present.

## Finding and required recovery evidence

**V-01 — BLOCKED:** The controller test fixture directly contradicts the
approved Design and Tasks test contract. Although production behavior and the
real-AppModule PR3 evidence are otherwise consistent, the required controller
coverage has not replaced the guard bypass and continues to use caller tenant
query input.

**Narrow correction evidence required:** change only the approved
`apps/api/src/modules/workflow/workflow.controller.spec.ts` test boundary to
exercise the production guard sequence with Host-derived tenant and verified
Identity session/membership context; remove the always-allow `APP_GUARD` and
guard mocks; demonstrate that forged query/body `tenantId` cannot select or
redirect tenant authority. Record a focused passing controller/workflow test
result. No production authorization change, database provisioning, Design/Tasks
change, or Git operation is authorized by this Verify result.

## Canonical next action

`docs/SDD-WORKFLOW.md:137-143` permits one orchestrator-owned Direct Fix after
this initial BLOCKED Verify, followed by a fresh HIGH / ARCHITECT Verify. Do not
Archive.

---

## Fresh Verify — after the single canonical Direct Fix

> **Normalized result:** PASS
> **Executor:** HIGH / ARCHITECT — `openai/gpt-5.6-terra`
> **Persistence:** hybrid; this appended section is the exact fresh Verify evidence.
> **Correction-loop state:** Initial Verify BLOCKED on V-01 → one
> orchestrator-owned Direct Fix limited to `workflow.controller.spec.ts` → fresh
> Verify PASS. The prior BLOCKED record above is preserved as history.

### Scope and evidence boundary

Consumed the approved Design §5 Working Set and §6 Read Order, PASS Architecture
Review, PASS Tasks Review, complete Apply Summary, and the preserved BLOCKED
Verify before bounded inspection. The Direct Fix changed only the approved
controller test boundary. No production source, Design, Tasks, dependency,
database, database provisioning, or Git lifecycle state was changed. The cleaned
disposable PR3 baseline was not recreated or rerun.

### Acceptance evidence

| Contract | Fresh evidence | Result |
|---|---|---|
| V-01 controller guard boundary | `workflow.controller.spec.ts` registers actual BetterAuth, TenantScope, RateLimit, Permissions, IdentityOrganization, WorkflowTenantContext, WorkflowDefinition, and WorkflowExecution guards. It uses `TenantResolveMiddleware` with Host context, verified provider session, organization membership, and no allow-all `APP_GUARD` or local guard mock. | PASS |
| Caller tenant input is not authority | The five controller cases send forged query/body `tenantId` values while asserting Host tenant A is passed to definition/start/resume services and scoped definition/instance lookups. | PASS |
| Global-first permission order | `app.module.ts` retains BetterAuth → TenantScope → RateLimit → Permissions. The controller's anonymous full-route case receives `403` before membership or definition service access; the complete Apply PR3 packet reports all six anonymous route classes denied before access/mutation. | PASS |
| Host, Identity, and resource isolation | Middleware sets immutable `hostTenantId`; Identity verifies provider session, tenant organization, active organization, and membership; context/resource guards consume only trusted context. The start route includes `WorkflowDefinitionGuard`; version lookup additionally scopes through `definition.tenantId = tenantId`. | PASS |
| Strict runtime safety | Shared Zod parsing is strict and bounded; create/version/publish/start/resume parse before named effects; decision execution performs own-field strict literal comparisons without dynamic execution. | PASS |
| Real-AppModule runtime evidence | Apply 7.5/7.6 records the exact disposable vector-capable PR3 command as 1 suite / 6 scenarios / 0 skipped, including start-route cross-tenant `403`, no Redis `NOAUTH`, no connection-limit failure, and cleanup of the disposable baseline. | PASS |

### Task, Working Set, and dependency evidence

- All 11 Tasks checkboxes are complete.
- `git status --short` shows only the 19 approved Working Set paths plus the
  single recorded bounded fixture deviation
  `workflow-cross-tenant-isolation.spec.ts`; no dependency, Prisma schema or
  migration, app module, middleware, frontend, plugin, infrastructure, or
  credential change is present.
- The Direct Fix target is the approved secondary Working Set file
  `apps/api/src/modules/workflow/workflow.controller.spec.ts`; it introduces no
  dependency or production change.

### Fresh bounded command evidence

| Command | Exit | Result |
|---|---:|---|
| `pnpm --filter api test -- --runInBand workflow.controller.spec.ts` | 0 | 1 suite / 5 tests passed |
| `pnpm --filter api test -- --runInBand workflow` | 0 | 7 suites / 41 tests passed |
| `git diff --check` | 0 | PASS |
| `pnpm --filter @crm-master/shared test -- workflow` | 0 (Apply evidence) | 1 suite / 4 tests passed |
| `pnpm --filter api lint` | 0 (Apply evidence) | PASS |
| `pnpm --filter api build` | 0 (Apply evidence) | PASS |
| `pnpm --filter @crm-master/shared lint` | 0 (Apply evidence) | PASS |

The production files and dependencies are unchanged since the prior Verify's
passing lint/build evidence; only the bounded controller test was corrected, so
the fresh focused runtime commands above are the required contradiction check.

### Findings

**CRITICAL:** None.

**WARNING:** None.

**BASELINE_DEBT:** None applicable.

### Canonical next action

**Archive** — owned by LOW / OPERATOR-EVIDENCE. The fresh Verify PASS permits
the canonical `Verify -> Archive` edge. Archive must consume this exact evidence;
no Git lifecycle action is authorized.
