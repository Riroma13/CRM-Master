# Tasks: Secure Workflow Execution Boundary

## Review Workload Forecast
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

| Unit | Goal | Focused command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | RED security contracts | shared/API workflow unit tests | N/A: failing tests | test files |
| 2 | Map, context, schema, services, wiring | API workflow tests | N/A: integration | named production files |
| 3 | Route/order and A/B proof | `pnpm --filter api test:e2e -- workflow-execution-boundary` | real Prisma A/B | doorbell test |

## Phase 1: RED first (dependency: approved Design)
- [x] 1.1 Add permission RED tests in `apps/api/src/common/guards/permissions.guard.spec.ts` for anonymous, `operador`/`lector`/unknown denial, owner/admin allow, every action.
- [x] 1.2 Add context RED tests in `apps/api/src/modules/workflow/guards/workflow-tenant-context.guard.spec.ts` for direct missing-session `401`, Host/membership/org/role/forged-tenant `403`, and owner/admin success.
- [x] 1.3 Add schema RED tests in `packages/shared/src/workflow/__tests__/node-types.spec.ts` for strict unknown/legacy JS keys, invalid operands, references, bounds; equals/notEquals pass.
- [x] 1.4 Add service RED tests in `apps/api/src/modules/workflow/workflow.service.spec.ts` and controller RED tests in `apps/api/src/modules/workflow/workflow.controller.spec.ts`: parse failure is `400` before side effects for create, `version`/`createVersion`, publish, start, and resume.
- [x] 1.5 Add anonymous RED coverage in `apps/api/test/doorbell/workflow-execution-boundary.e2e-spec.ts` for full-route create, publish, start, resume, read, and control: `403`, global-first, spies untouched.

## Phase 2: GREEN implementation (depends on Phase 1)
- [x] 2.1 Modify only `apps/api/src/common/auth/permissions.ts` with canonical `workflow` read/write/execute owner/admin entries; preserve `PermissionsGuard` and global order.
- [x] 2.2 Create trusted context at `apps/api/src/modules/workflow/guards/workflow-tenant-context.guard.ts`; export `IdentityOrganizationGuard` from `apps/api/src/modules/identity/identity.module.ts`; import/register in `workflow.module.ts`.
- [x] 2.3 Update controller, guards, services to ignore caller `tenantId`, scope from Host/Identity context, and preserve read/control authorization.
- [x] 2.4 Implement strict schemas/exports in `packages/shared/src/workflow/node-types.ts` and `index.ts`; reparse all five operations and replace `new Function` in `node-executor.ts` with own-field literal interpretation.

## Phase 3: Integration and evidence (depends on Phase 2)
- [x] 3.1 Complete A/B doorbell proof: forged tenant, Host/org/session mismatch, unauthorized roles, anonymous all six route classes deny before access/mutation; authorized same-tenant owner/admin lifecycle succeeds.
- [x] 3.2 Run `pnpm --filter @crm-master/shared test -- workflow`; `pnpm --filter api test -- workflow`; `pnpm --filter api test:e2e -- workflow-execution-boundary`; `pnpm --filter api lint`; record baseline debt separately.

## Exact Working Set / Read Order
Working Set (exact Design set): `apps/api/src/common/auth/permissions.ts`; `apps/api/src/modules/workflow/workflow.controller.ts`; `apps/api/src/modules/workflow/guards/workflow-tenant-context.guard.ts`; `apps/api/src/modules/workflow/guards/workflow-definition.guard.ts`; `apps/api/src/modules/workflow/guards/workflow-execution.guard.ts`; `apps/api/src/modules/workflow/workflow.module.ts`; `apps/api/src/modules/identity/identity.module.ts`; `packages/shared/src/workflow/node-types.ts`; `packages/shared/src/workflow/index.ts`; `apps/api/src/modules/workflow/definition.service.ts`; `apps/api/src/modules/workflow/workflow.service.ts`; `apps/api/src/modules/workflow/executor/node-executor.ts`; `apps/api/src/common/guards/permissions.guard.spec.ts`; `apps/api/src/modules/workflow/workflow.controller.spec.ts`; `apps/api/src/modules/workflow/guards/workflow-tenant-context.guard.spec.ts`; `apps/api/src/modules/workflow/workflow.service.spec.ts`; `apps/api/src/modules/workflow/workflow-cross-tenant-execution.spec.ts`; `packages/shared/src/workflow/__tests__/node-types.spec.ts`; `apps/api/test/doorbell/workflow-execution-boundary.e2e-spec.ts`. Exclude schema, app module, middleware, frontend, plugins, infrastructure, dependencies, credentials, Git.

Read Order: (1) `apps/api/src/common/auth/permissions.ts`, `apps/api/src/common/guards/permissions.guard.ts`; (2) `apps/api/src/modules/workflow/workflow.controller.ts`, `apps/api/src/app.module.ts`; (3) `apps/api/src/common/middleware/tenant-resolve.middleware.ts`; (4) `apps/api/src/modules/identity/identity-organization.guard.ts`, `apps/api/src/modules/identity/identity-membership.repository.ts`; (5) `apps/api/src/modules/identity/identity.module.ts`, `apps/api/src/modules/workflow/workflow.module.ts`; (6) `apps/api/src/modules/workflow/guards/workflow-tenant-context.guard.ts`, `apps/api/src/modules/workflow/guards/workflow-definition.guard.ts`, `apps/api/src/modules/workflow/guards/workflow-execution.guard.ts`, `apps/api/src/modules/workflow/definition.service.ts`, `apps/api/src/modules/workflow/workflow.service.ts`; (7) `packages/shared/src/workflow/node-types.ts`, `packages/shared/src/workflow/index.ts`, `apps/api/src/modules/workflow/executor/node-executor.ts`; (8) `apps/api/src/common/guards/permissions.guard.spec.ts`, `apps/api/src/modules/workflow/workflow.controller.spec.ts`, `apps/api/src/modules/workflow/guards/workflow-tenant-context.guard.spec.ts`, `apps/api/src/modules/workflow/workflow.service.spec.ts`, `apps/api/src/modules/workflow/workflow-cross-tenant-execution.spec.ts`, `packages/shared/src/workflow/__tests__/node-types.spec.ts`, `apps/api/test/doorbell/workflow-execution-boundary.e2e-spec.ts`. Stop on contradiction.

## Checkpoints, acceptance, handoff
Checkpoint 1: RED tests fail before production edits. Checkpoint 2: GREEN passes with unchanged global-first order and no bypass. Checkpoint 3: `400` precedes effects; anonymous six-route `403` precedes access/mutation; Host authority, A/B isolation, exact owner/admin allow, other-role denial, and no dynamic execution are evidenced. After fresh Tasks Review PASS, run Workload Guard; HUMAN chooses the above-400-line chain before Apply. Apply remains forbidden.
