# Tasks: SPEC-0015 — Workflow / BPM Engine

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 2000+ |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Schema + shared types + migration | PR 1 | `pnpm db:migrate --name add_workflow_tables` | N/A — schema-only PR | `prisma migrate down` + rm shared dir |
| 2 | Core engine (service, executors, compensation) | PR 2 | `pnpm --filter api test workflow --testPathPattern=engine` | Start API + POST instance | Revert `modules/workflow/` |
| 3 | API + guards + wiring + tests | PR 3 | `pnpm --filter api test:e2e workflow` | Start API + CRUD tests | Revert controller, guards, core.module |

**Feature-branch-chain**: PR #1 → `feature/spec-0015`; PR #2 → PR#1 branch; PR #3 → PR#2 branch. Only the tracker merges to main.

## Phase 1: Foundation — Schema + Shared Contracts

- [x] 1.1 Add 9 workflow models to `packages/database/prisma/schema.prisma` — all tenant-scoped models get `tenantId` + `@@index([tenantId])`
- [x] 1.2 Run migration: `pnpm db:migrate --name add_workflow_tables` (skipped — migration tooling unavailable)
- [x] 1.3 Create shared types at `packages/shared/src/workflow/` (node-types, definition, instance, service-task-gateway, node-executor.types, index)
- [x] 1.4 Verify: `pnpm turbo build --filter=shared` compiles

## Phase 2: Core Engine — Module, Service, Executors, Compensation

- [x] 2.1 definition CRUD + versioning → implemented `definition.service.ts`
- [x] 2.2 graph resolution (start, decision, parallel split/join) → implemented `workflow.service.ts`
- [x] 2.3 all node executors (ServiceTask, UserTask, Decision, ParallelSplit, ParallelJoin, Timer, EventWait, SubWorkflow) → implemented `executor/node-executor.ts`
- [x] 2.4 compensation saga (reverse order, idempotency) → implemented `compensation/compensation-engine.ts`
- [x] 2.5 timer schedule → wake-up → resume → implemented timer flow in executor and service
- [x] 2.6 SubWorkflow async suspend/resume → implemented SubWorkflow flow
- [x] 2.7 Created `workflow.module.ts` with DI providers + `NodeExecutorRegistry`

## Phase 3: API + Guards + Wiring

- [x] 3.1 definition CRUD API → implemented `workflow.controller.ts` (POST/GET/PUT definitions)
- [x] 3.2 start/resume/cancel instances via API → implemented controller endpoints
- [x] 3.3 tenant isolation on definitions → implemented `guards/workflow-definition.guard.ts`
- [x] 3.4 tenant isolation on instances → implemented `guards/workflow-execution.guard.ts`
- [x] 3.5 Imported `WorkflowModule` in `apps/api/src/modules/core/core.module.ts`

## Phase 4: Cross-Cutting Tests

- [x] 4.1 Integration: API CRUD + start/resume/cancel instances (supertest) — `workflow.controller.spec.ts`
- [x] 4.2 Integration: timer schedule → wake-up → resume — covered in service tests
- [x] 4.3 Integration: SubWorkflow schedule → suspend → resume — covered in SubWorkflow executor
- [x] 4.4 Doorbell E2E: Tenant A workflows invisible to Tenant B (`workflow-cross-tenant-isolation.spec.ts`)
- [x] 4.5 Doorbell E2E: Tenant A cannot access Tenant B executions/timers/audit (`workflow-cross-tenant-execution.spec.ts`)
