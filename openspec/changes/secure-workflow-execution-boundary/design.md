# Design: Secure Workflow Execution Boundary

> **Status:** Refined after initial BLOCKED Architecture Review
> **Working document.** It does not change the SDD pipeline.

---

## 1. Executive Summary

Workflow routes currently authorize with caller-controlled `tenantId`, and decision nodes execute stored JavaScript. This change binds every workflow route to the tenant resolved from `Host` and to a verified Identity membership, then replaces expressions with a closed, runtime-validated workflow definition. The result is that neither request data nor stored definitions can cross a tenant boundary or execute source code.

## 2. Technical Approach

`TenantResolveMiddleware` remains the sole Host resolver: its immutable `request.hostTenantId` is the workflow tenant source. The existing global chain remains ordered and intact: global authentication/permission gate, Host-derived tenant context, organization/membership authority, then workflow-specific tenant/resource authorization. Each workflow route keeps `@RequirePermission('workflow', action)` and runs the exported `IdentityOrganizationGuard`, then a local `WorkflowTenantContextGuard`; the latter two consume, but never bypass, the global result. Query/body `tenantId` is neither read nor accepted for authorization.

The sole global permission change is additive: the canonical `statement`/`ROLE_MAP` gains the `workflow` resource with `read`, `write`, and `execute` actions. It grants those actions only to the authorized canonical roles: `owner` and the exact Identity `admin` role through a workflow-only canonical map entry; `operador`, `lector`, unknown roles, and anonymous callers remain denied. `PermissionsGuard` and its registration/order are not changed.

`@crm-master/shared` will expose strict Zod schemas and inferred types for the full existing node set. Definition writes, versions, and publish validate before persistence state changes; start and resume revalidate stored versions before creating an instance or changing status. Decision execution interprets only the validated predicate union.

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
| --- | --- | --- | --- |
| Tenant authority | Query/body ID; Host only; Host plus authenticated membership | `hostTenantId` plus Identity guard | Host identifies the tenant; session, membership, active organization, and permission authorize the actor. |
| Nest wiring | Duplicate identity providers; import/export Identity guard; new auth subsystem | Export `IdentityOrganizationGuard` from `IdentityModule`, import it in `WorkflowModule` | Reuses the project-local provider and membership repository without systemic-auth work. |
| Node safety | TypeScript-only union; sandbox; strict Zod union | Strict shared Zod schema plus interpreter | Runtime data must be rejected before storage/execution; no sandbox contains arbitrary source safely. |
| Legacy nodes | Execute; auto-convert; reject | Reject | Conversion can change business semantics; fail closed removes reachability. |
| Global permission compatibility | Bypass/reorder `PermissionsGuard`; add `workflow` to the canonical map; auth redesign | Add only `workflow` capability for `owner` and Identity `admin` | The global guard consumes the same metadata first; a narrow additive map change preserves its order and denies every other role. |

## 4. Data Flow

```text
Host -> TenantResolveMiddleware -> request.hostTenantId
global BetterAuth/TenantScope/RateLimit/PermissionsGuard -> `workflow` map permit
session -> IdentityOrganizationGuard -> session + membership + active organization
                                       -> WorkflowTenantContextGuard -> context + scoped resource check
request definition -> shared parse -> DefinitionService -> Prisma.forTenant(context.tenantId)
stored version -> shared parse -> start/resume -> DecisionExecutor predicate interpreter
```

On a full workflow route, an anonymous request is `403`: the preserved global `PermissionsGuard` is reached before `IdentityOrganizationGuard`, resolves no user as `lector`, and denies the declared `workflow` permission before any workflow resource lookup or mutation. Missing Host context, tenant/organization mismatch, missing membership, and a non-owner/non-admin workflow permission are also `403`. The local `IdentityOrganizationGuard` unit contract may distinguish a missing provider session as `401` when invoked directly, but it does not define the full-route anonymous response. Malformed, unknown, expression-bearing, or semantically invalid definitions are `400` before the named side effect.

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `apps/api/src/common/auth/permissions.ts` | Modify | Add only `workflow: read/write/execute`; grant it only to canonical `owner` and Identity `admin` compatibility entry. |
| 2 | `apps/api/src/modules/workflow/workflow.controller.ts` | Modify | Use request context, ordered guards, and workflow permissions; remove tenant query inputs. |
| 3 | `apps/api/src/modules/workflow/guards/workflow-tenant-context.guard.ts` | Create | Build trusted context from verified `hostTenantId`, `identitySession`, and `identityMembership`. |
| 4 | `apps/api/src/modules/workflow/guards/workflow-definition.guard.ts` | Modify | Scope definition resource lookup only from trusted context. |
| 5 | `apps/api/src/modules/workflow/guards/workflow-execution.guard.ts` | Modify | Scope instance resource lookup only from trusted context; apply it to start/resume and instance routes. |
| 6 | `apps/api/src/modules/workflow/workflow.module.ts` | Modify | Import `IdentityModule`; register the local context guard. |
| 7 | `apps/api/src/modules/identity/identity.module.ts` | Modify | Export `IdentityOrganizationGuard` for Workflow's imported-module dependency. |
| 8 | `packages/shared/src/workflow/node-types.ts` | Modify | Add strict node, predicate, and definition schemas plus parse functions. |
| 9 | `packages/shared/src/workflow/index.ts` | Modify | Export the runtime validation contract. |
| 10 | `apps/api/src/modules/workflow/definition.service.ts` | Modify | Parse before create/version/publish state changes. |
| 11 | `apps/api/src/modules/workflow/workflow.service.ts` | Modify | Parse stored versions before start/resume side effects. |
| 12 | `apps/api/src/modules/workflow/executor/node-executor.ts` | Modify | Interpret validated decision predicates; remove `new Function`. |

### 5.2 Secondary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `apps/api/src/common/guards/permissions.guard.spec.ts` | Create | RED proof that the unchanged global guard permits only owner/admin `workflow` actions and denies anonymous, `operador`, and `lector`. |
| 2 | `apps/api/src/modules/workflow/workflow.controller.spec.ts` | Modify | Replace the always-allow guard with the production guard sequence and authenticated Host/session/membership cases. |
| 3 | `apps/api/src/modules/workflow/guards/workflow-tenant-context.guard.spec.ts` | Create | RED tests for trusted-context construction and the local direct-guard missing-session `401` versus membership/context `403` distinction; it must not claim a full-route `401`. |
| 4 | `apps/api/src/modules/workflow/workflow.service.spec.ts` | Modify | Prove start/resume reject invalid stored versions before writes. |
| 5 | `apps/api/src/modules/workflow/workflow-cross-tenant-execution.spec.ts` | Modify | Retain scoped-service isolation using trusted contexts. |
| 6 | `packages/shared/src/workflow/__tests__/node-types.spec.ts` | Create | RED schema bounds, strictness, references, and legacy-expression cases. |
| 7 | `apps/api/test/doorbell/workflow-execution-boundary.e2e-spec.ts` | Create | Real Prisma A/B proof for global-to-local guard order and workflow authorization. |

### 5.3 Expected NOT to Change

- `apps/api/src/common/middleware/tenant-resolve.middleware.ts` — its existing immutable Host-derived `hostTenantId` is consumed unchanged.
- `apps/api/src/common/guards/permissions.guard.ts` and `apps/api/src/app.module.ts` — global `PermissionsGuard` implementation, registration, and order remain unchanged.
- `packages/database/prisma/schema.prisma` — no persistence-model change.
- `apps/api/src/app.module.ts`, frontends, plugin module, infrastructure, and credentials — outside this workflow-only remediation.

## 6. Read Order

1. `common/auth/permissions.ts` and `common/guards/permissions.guard.ts` — add the exact capability/roles without changing global guard behavior.
2. `workflow.controller.ts` and `app.module.ts` — enumerate permission metadata and confirm global order is preserved.
3. `tenant-resolve.middleware.ts` — confirm `hostTenantId` is immutable Host-derived context.
4. `identity-organization.guard.ts` and `identity-membership.repository.ts` — consume exact session, organization, membership, and role checks.
5. `identity.module.ts` and `workflow.module.ts` — make the provider export/import change without duplicate providers.
6. Workflow guards and services — place trusted context and validation before resource lookup/side effects.
7. `node-types.ts`, `index.ts`, and `node-executor.ts` — implement one shared parse contract and interpreter.
8. Named permission, workflow, shared, and doorbell tests — prove the preserved chain and replace the bypass.

## 7. Expected Commands

```bash
pnpm --filter @crm-master/shared test -- workflow
pnpm --filter api test -- workflow
pnpm --filter api test:e2e -- workflow-execution-boundary
pnpm --filter api lint
```

## 8. Design Confidence

**Confidence:** High

The design names the global metadata consumer and exact canonical resource-map correction, preserving the existing guard order while making the approved owner/admin path reachable. Apply stops on a material contradiction rather than bypassing a guard, redesigning global auth, or adding a different role model.

## 9. Exploration Budget

| Resource | Budget | Notes |
| --- | --- | --- |
| Repo searches | 6 | Permission metadata/map, guard order, node consumers, and fixtures. |
| Files to read | 21 | Read Order and directly linked test setup only. |
| Files to create | 4 | Permission-guard, context-guard, shared-schema, and doorbell tests. |
| Files to modify | 13 | Primary files and named existing tests. |

## 10. Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Legacy definitions stop | High | High | Reject before state change/execution; operational rewrite remains separate. |
| Guard order/provider export or anonymous-route contract regresses | Med | High | Test the actual global-first sequence: anonymous full routes return `403` before resource access/mutation; direct local-guard missing-session behavior remains an isolated unit assertion. Do not duplicate providers, reorder, or bypass guards. |
| Predicate grows into a language | Med | High | Fixed operators, literal right operand, field grammar, strict keys, and bounds. |
| Existing tests mask authorization or assert the wrong anonymous status | High | Med | Remove the `APP_GUARD` allow-all fixture; add full-chain anonymous `403` tests plus Host/session/membership tests. |
| Global permission change broadens access | Med | High | Modify only `workflow` actions; grant only owner/admin; assert operador/lector/unknown/anonymous denial and preserve guard registration/order. |

## 11. Testing Strategy

| Layer | Focus | Approach |
| --- | --- | --- |
| Unit | Canonical permission map/guard | RED: unchanged `PermissionsGuard` permits `workflow` read/write/execute only for owner/admin; anonymous, operador, lector, and unknown roles return `403`. |
| Unit | Context guard | Direct invocation only: missing provider session `401`; missing Host, membership, active-org mismatch, and member role `403`; matching owner/admin context succeeds. This does not assert a full-route status. |
| Unit | Shared schema/executor | Unknown key/type, `expression`, invalid field/operand, duplicate IDs, dangling edge, bounds, and valid equal/not-equal RED cases. |
| Integration | Route authorization and order | Production global guard runs before Identity/workflow guards; every anonymous workflow endpoint under test returns `403` with service/resource spies untouched; forged query/body tenant is ignored; Host/token/org mismatch and unauthorized roles return `403`; authorized same-tenant owner/admin create/version/publish/start/resume succeeds. |
| Service | Validation ordering | Create/version/publish and start/resume throw `400` before Prisma write/status/audit calls. |
| Doorbell | Tenant isolation and anonymous fail-closed behavior | Persist A/B tenant, organization, membership, and workflows; anonymous workflow requests return `403` before any workflow resource access/mutation; A cannot act on B under any query/body value; unauthorized roles remain denied; authorized same-tenant owner/admin succeeds through the unchanged global guard. |
| Regression | Safe execution | Valid decision predicates select only declared next node and never invoke dynamic-code APIs. |

## 12. Doorbell Tests

| Test file | What it proves |
| --- | --- |
| `apps/api/test/doorbell/workflow-execution-boundary.e2e-spec.ts` | A Host/session for tenant A cannot create, publish, start, or resume tenant B resources even with forged query/body `tenantId`. |
| `apps/api/test/doorbell/workflow-execution-boundary.e2e-spec.ts` | A matching tenant A organization owner/admin can complete the same lifecycle; an anonymous request is `403` and a foreign session/unauthorized role is denied before workflow resource access or mutation. |
| `apps/api/src/common/guards/permissions.guard.spec.ts` | The global `PermissionsGuard` remains first and permits only the canonical owner/admin `workflow` capability; anonymous, `operador`, `lector`, and unknown roles return `403`. |

## 13. Required ADRs

| ADR | Reason | Status |
| --- | --- | --- |
| None | No schema, bounded-context, or platform policy change; this reuses the existing Identity boundary. | Not required |

## 14. Boundaries

| Boundary | Owner | Purpose |
| --- | --- | --- |
| Host tenancy | `TenantResolveMiddleware` | Set immutable `request.hostTenantId`; never consume DTO/query identity. |
| Global permission compatibility | `statement`/`ROLE_MAP` | Add only `workflow` read/write/execute for canonical owner and Identity admin; do not alter other resources, roles, or guard order. |
| Actor authorization | `IdentityOrganizationGuard` | Verify provider session, Tenant `betterAuthOrganizationId`, membership, active organization, and owner/admin permission after the global permit. |
| Workflow context | `WorkflowTenantContextGuard` | Convert verified request fields to `TrustedWorkflowContext`; no provider calls or tenant selection. |
| Definition contract | `@crm-master/shared` | Strictly parse nodes and references. |
| Execution | Workflow services/executor | Reparse stored versions and interpret predicates only. |

## 15. Extensibility

| Future feature | How it fits | Effort |
| --- | --- | --- |
| Safe predicate operator | Add one strict variant, interpreter branch, and RED tests. | Days |
| Workflow permission granularity | Extend both canonical permission maps and route metadata together without changing context source or global guard order. | Days |
| Legacy migration tool | Read rejected data and produce operator-reviewed replacements outside runtime. | Days |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× | 100× | Mitigation |
| --- | --- | --- | --- |
| Storage | Unchanged | Unchanged | No new data. |
| Query latency | One membership lookup | Same bounded lookup | Existing tenant scope and guard path. |
| Write throughput | Bounded parse | Bounded parse | 100 nodes, 10 edges/node, 20 conditions/decision. |
| Memory | Bounded definition | Bounded definition | Strict limits; no VM. |

**Decision:** Validate finite declarative definitions.
**Rationale:** Cost is bounded by input limits.
**Alternative:** Sandboxed source execution.
**Future impact:** Tune limits only from measured evidence.

### B. Open/Closed Principle (OCP)

**Point of extension:** Shared discriminated node/predicate schemas.
**What must change to add one more:** Schema, semantic validator, executor branch, and tests.
**Decision:** Explicit allow-list.
**Rationale:** Every new capability is reviewable.
**Alternative:** Free-form config/expression.
**Future impact:** Security review remains local to the variant.

### C. Ownership

| Data / Capability | Owner | Consumers |
| --- | --- | --- |
| `hostTenantId` | Tenant middleware | Identity and workflow guards |
| Global `workflow` capability | Canonical `ROLE_MAP` | PermissionsGuard, Identity and Workflow guards |
| Identity session/membership | Identity module | Workflow context guard |
| Workflow definition schema | Shared workflow package | Workflow API |

**Decision:** Reuse global permissions plus Identity; Workflow owns only adaptation and execution.
**Rationale:** The canonical global metadata consumer must permit before identity can authorize the tenant-bound actor.
**Alternative:** Workflow-local authentication or a guard bypass.
**Future impact:** New workflow actions require a narrow synchronized map change, not a global auth redesign.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
| --- | --- | --- | --- |
| Definitions/instances | Existing policy | Existing policy | Existing policy |
| Rejected payload | Not persisted | None | Request ends |

**Decision:** No new retained data.
**Rationale:** Parsing is synchronous.
**Alternative:** Persist rejected expressions.
**Future impact:** Auditing needs a separate retention decision.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
| --- | --- | --- | --- |
| Create/version/publish/start/resume | Request retry | Authorization and parse before side effect | Invalid retries mutate nothing |

**Decision:** Gate before writes.
**Rationale:** Rejection cannot create state.
**Alternative:** Post-write cleanup.
**Future impact:** Existing retry behavior is unchanged.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
| --- | --- | --- | --- |
| Strict definition/node/predicate schemas | `packages/shared/src/workflow/node-types.ts` | API services/executor | Shared package |
| `workflow` permission capability | `common/auth/permissions.ts` | Global PermissionsGuard, workflow routes | Canonical ROLE_MAP |
| Trusted context | Workflow context guard | Controller/guards/services | Workflow module |

**Decision:** One runtime shared schema plus the existing canonical permission metadata contract.
**Rationale:** Prevents DTO/executor drift and makes the global-first authorization chain compatible.
**Alternative:** API-local casts or workflow-specific permission bypass.
**Future impact:** A UI can consume the schema later; permissions remain centrally enumerable.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
| --- | --- | --- |
| Tenant | Cross-tenant access | Host-derived context plus scoped Prisma |
| Time | None added | Existing retention |
| Volume | Large definition | Schema limits |

**Decision:** Retain existing tenant partitioning.
**Rationale:** The entry boundary, not storage, is repaired.
**Alternative:** Per-tenant stores.
**Future impact:** Partition only with measured volume evidence.

---

## 16. Interfaces / Contracts

```typescript
type WorkflowRole = 'owner' | 'admin';
export interface TrustedWorkflowContext {
  tenantId: string; // exactly request.hostTenantId
  actorId: string;  // exactly request.identitySession.userId
  role: WorkflowRole; // exactly request.identityMembership.role
}

// Every route declares @RequirePermission('workflow', 'read'|'write'|'execute').
// The unchanged global PermissionsGuard runs first and reads the canonical map:
// statement.workflow = ['read', 'write', 'execute']; ROLE_MAP grants it only
// to owner and the exact Identity admin compatibility role. It denies anonymous,
// operador, lector, and unknown roles with 403 before IdentityOrganizationGuard
// or any workflow resource access/mutation. IdentityOrganizationGuard then requires
// a provider session, hostTenantId, Tenant.betterAuthOrganizationId membership,
// matching session.activeOrganizationId, and the same workflow permission;
// WorkflowTenantContextGuard finally attaches request.workflowContext.

const NodeId = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
const Literal = z.union([z.string().max(1_024), z.number().finite(), z.boolean(), z.null()]);
const Operand = z.object({ source: z.literal('variable'), field: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,63}$/) }).strict();
const Predicate = z.discriminatedUnion('operator', [
  z.object({ operator: z.literal('equals'), left: Operand, right: Literal }).strict(),
  z.object({ operator: z.literal('notEquals'), left: Operand, right: Literal }).strict(),
]);
const Condition = z.object({ when: Predicate, next: NodeId }).strict();
// Every node is `.strict()` with id: NodeId, name: z.string().min(1).max(120),
// type, and its exact config: start/end/event-wait {}, service-task {actionId:
// NodeId}, user-task {assignee?: string.max(128), input?: JsonRecord}, decision
// {conditions: Condition[1..20], defaultNext?: NodeId}, parallel-split and
// compensation {next: NodeId[1..10]}, parallel-join {branchGroup: NodeId,
// next?: NodeId[0..10]}, timer {delayMs: int 1..86_400_000}, and sub-workflow
// {definitionId: NodeId}. Node array is 1..100; IDs are unique.
```

`WorkflowDefinitionSchema` is strict (`{ nodes, startNode }` only) and its semantic parse verifies `startNode` and every `next`, `defaultNext`, and condition `next` reference an existing ID. Unknown keys, unsupported node types, `conditions[].expression`, string operands, nested/bracket/dotted fields, non-finite numbers, excess sizes, and all legacy layouts fail parse. Field lookup is only `Object.hasOwn(variables, field) ? variables[field] : undefined`; it never traverses object paths or prototype properties. `DecisionExecutor` compares that value with the literal using strict equality and chooses the first matching condition, otherwise `defaultNext`, otherwise no next node.

`DefinitionService.create` and `createVersion` call `parseWorkflowDefinition(data)` before Prisma create. `publish` parses its latest version before unpublishing/publishing. `WorkflowService.startWorkflow` parses `getLatestPublished(...)` before instance, variable, audit, or execution writes; `resumeWorkflow` parses it before status update/audit. Parse failure is `BadRequestException('WORKFLOW_DEFINITION_INVALID')` (`400`). Workflow routes use `@RequirePermission('workflow', 'read'|'write'|'execute')`; global-map denial, including every anonymous full-route workflow request, and tenant/membership denial are `403`. The unchanged global guard rejects anonymous callers before `IdentityOrganizationGuard`, resource lookup, or mutation. A direct local `IdentityOrganizationGuard` unit may return `401` for a missing provider session, but no full-route workflow test asserts `401`. Resource lookups are scoped exclusively with `context.tenantId`, never caller `tenantId`.

**Acceptance criteria:** Full-route anonymous workflow requests return `403` before any workflow service/resource access or mutation; authorized same-tenant `owner` and exact Identity `admin` remain permitted; `operador`, `lector`, unknown roles, Host/organization mismatches, and cross-tenant requests return `403`. These tests preserve the global guard order and fail-closed behavior; they do not bypass, disable, weaken, or redesign global authentication.

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
| --- | --- | --- | --- |
| 1 | Deploy the narrow canonical `workflow` resource-map addition with the shared schema, Identity export/Workflow import, guards, and validation; no Prisma migration. | An authorized route remains denied if map and metadata differ. | Restore only the additive map entry under incident control; do not bypass or reorder guards. |
| 2 | Rewrite rejected legacy definitions through an operator-reviewed process outside runtime. | Rule translation error. | Keep replacement unpublished until tested. |

## 18. Open Questions

| # | Question | Status | Resolution |
| --- | --- | --- | --- |
| 1 | What authenticates workflow callers? | Resolved | Existing Identity provider via exported `IdentityOrganizationGuard`; Host field is `request.hostTenantId`. |
| 2 | What decision language is accepted? | Resolved | Two strict literal predicates only: `equals` and `notEquals`; legacy expressions are rejected. |
| 3 | How is AR-05 resolved without changing global authorization design? | Resolved | Add only the canonical `workflow` capability for owner and Identity admin; preserve `PermissionsGuard` and its order, with all other roles denied. |
| 4 | What is the anonymous full-route workflow error contract under the preserved global chain? | Resolved | `403`: `PermissionsGuard` denies the anonymous `lector` fallback before `IdentityOrganizationGuard`, workflow resource access, or mutation. Direct local-guard missing-session behavior may remain `401` only in an isolated unit test. |

---

> **End of document.**
