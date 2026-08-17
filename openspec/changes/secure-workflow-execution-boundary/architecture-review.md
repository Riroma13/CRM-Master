# Architecture Review: Secure Workflow Execution Boundary

> **Current normalized result:** PASS — fresh Architecture Review after the maintainer-authorized AR-06 Design-only correction
> **Executor:** HIGH / ARCHITECT — `sdd-direct-architecture-review`
> **Model binding:** `openai/gpt-5.6-terra` (`.opencode/sdd-model-map.json:8-12,29-32,51-55`)
> **Persistence:** hybrid; this file is the exact Architecture Review artifact.
> **Correction-loop state:** Initial Architecture Review BLOCKED → one Design Refinement → fresh BLOCKED → maintainer-authorized AR-05 Design-only correction → fresh BLOCKED → maintainer-authorized AR-06 Design-only correction → fresh PASS. The ordinary retry budget remains exhausted; the PASS edge to Tasks is legal.

> **History preservation:** Sections through “Initial Review canonical next action”
> are the exact initial-review evidence. The fresh-review evidence and current
> normalized result begin after that preserved record.

## Scope and evidence boundary

Reviewed `design.md` against `docs/SDD-WORKFLOW.md`, project architecture, and
the Enterprise Design Standard. The Design §6 Read Order was consumed before
additional inspection. No implementation, Tasks, Apply, unrelated-change
exploration, template alteration, or Git operation was performed.

### Read Order and bounded deviations

The Review consumed the six ordered production entries and the named workflow
and doorbell test patterns. The following strictly necessary deviations were
made only to resolve the Design's claimed authentication/tenant source and
Nest provider wiring:

| Path | Reason | Evidence |
| --- | --- | --- |
| `apps/api/src/common/guards/tenant-scope.guard.ts` | Verify the existing Host-derived tenant contract. | It accepts a Host-resolved `request.tenantId`, but only compares `request.user?.tenantId` when a user is already present (`:44-58`). |
| `apps/api/src/modules/identity/identity-organization.guard.ts` | Verify whether the existing authenticated organization guard can supply the required context. | It authenticates a provider session and requires `request.hostTenantId`, then writes `identitySession` and `identityMembership` (`:48-86`). |
| `apps/api/src/modules/identity/identity.module.ts` | Verify availability of that guard and its dependencies to Workflow. | The module exports `AUTH_CLIENT` but not `IdentityOrganizationGuard` or `IdentityMembershipRepository` (`:19-39`). |
| `apps/api/src/modules/workflow/workflow.module.ts` | Verify required local provider/module changes. | Workflow registers only its two local guards and does not import Identity (`:18-38`). |

## Gate verdict and correction-budget impact

**BLOCKED.** `docs/SDD-WORKFLOW.md:124-143` permits only **Design Refinement**
after this initial blocked Architecture Review. This consumes the sole
Architecture Review correction-loop retry when refinement is invoked; a fresh
Architecture Review is then mandatory. A second BLOCKED Architecture Review is
a stop-and-escalate condition.

## Findings

| ID | Status | Finding | Evidence | Required Design Refinement |
| --- | --- | --- | --- | --- |
| AR-01 | BLOCKED | The tenant-authorization design does not name an implementable, authenticated source of `TrustedWorkflowContext` or its provider wiring. The Design requires authenticated identity plus Host resolution, but it does not identify the guard/decorator, the request fields it trusts, the membership/role rule, or the Workflow module dependency boundary. The current Workflow guards authorize from caller-supplied query/body `tenantId`; `startWorkflow` has no guard. | `design.md:14-16,47-50,137-140,245-256`; `workflow.controller.ts:20-77`; `workflow-definition.guard.ts:8-23`; `workflow-execution.guard.ts:8-23`; bounded-deviation evidence above. | Specify the project-local authenticated guard/context mechanism, its exact Host tenant field, identity/membership/role checks, 401/403 behavior, and required provider/module files in the Working Set and Read Order. Include tests that prove missing session, forged query/body tenant, Host/token or organization mismatch, and authorized same-tenant success. |
| AR-02 | BLOCKED | The declarative-node security contract is incomplete. The Design promises discriminated shared schemas before persistence/publish, but §16 supplies only a two-variant TypeScript predicate and no complete node/condition schema, validation boundary, unknown-key policy, or predicate-field constraint. The current shared contract still exposes `conditions[].expression`, and the executor invokes `new Function`. | `design.md:14-16,115-118,216-221,240-256`; `packages/shared/src/workflow/node-types.ts:1-16`; `node-executor.ts:61-85`. | Define the complete runtime-validated node and decision-condition schema in the shared contract: allowed node/config variants, predicate operands and field lookup rules, bounds, unknown/legacy rejection, and the exact validation calls before create/version/publish and before start/resume execution. Add the corresponding Working-Set test paths and RED cases. |
| AR-03 | CONDITION | Existing workflow controller tests install an always-allow `APP_GUARD` and send `tenantId` in the query, so they cannot establish the proposed authenticated tenant boundary. | `workflow.controller.spec.ts:44-54,65-125`; `design.md:111-125`. | Replace/extend as part of AR-01's planned tests; no separate architecture decision is required. |
| AR-04 | PASS | The change remains appropriately bounded to workflow execution: no Prisma schema, frontend, plugin execution, systemic authentication, infrastructure, or credential work is included. | `design.md:16,62-67,127-131`; `docs/SDD-WORKFLOW.md:185-197`. | None. |

No BASELINE_DEBT was found. The validators below pass; they do not close the
material security and contract gaps identified by AR-01 and AR-02.

## Architecture Review topics A–G

| Topic | Status | Review evidence |
| --- | --- | --- |
| A. Scalability | PASS | Bounded declarative evaluation adds no storage and defines definition/predicate bounds (`design.md:153-165`). |
| B. Open/Closed Principle | CONDITION | The intended discriminated variant extension point is appropriate, but AR-02 must define the runtime schema and interpreter boundary before it is actionable (`design.md:167-174`). |
| C. Ownership | PASS | Workflow owns request authorization, validation, execution, and scoped persistence; no plugin/auth-domain expansion is claimed (`design.md:176-187,133-140`). |
| D. Data Retention | PASS | Validation is synchronous and adds no retained data; legacy-definition inventory is explicitly outside runtime scope (`design.md:189-199,258-263`). |
| E. Idempotency | PASS | Authorization and validation precede side effects; existing write/publish/start semantics remain the only retry surface (`design.md:201-210`). |
| F. Shared Contracts | BLOCKED | A single shared contract is the correct decision, but its runtime-enforced shape and rejection semantics are incomplete (AR-02) (`design.md:212-221,240-252`). |
| G. Partitioning Strategy | PASS | Existing tenant partitioning plus the scoped Prisma client remains appropriate; no new table or partition is introduced (`design.md:223-234`). |

## Contracts, security, and tenant isolation

| Area | Status | Evidence |
| --- | --- | --- |
| Route authorization | BLOCKED | Controller methods pass query `tenantId` into services, and the definition/execution guards derive authorization from query/body (`workflow.controller.ts:20-77`; guard files `:8-23`). The Design's server-derived replacement lacks an implementable local binding (AR-01). |
| Dynamic-code elimination | BLOCKED | The target is correct, but the present executor constructs `new Function` from persisted expressions and the refined schema/interpreter contract is not fully specified (AR-02). |
| Tenant-scoped persistence | PASS | Workflow services consistently use `prisma.forTenant(tenantId)` for definition, instance, execution, variable, and audit access; the required source of that tenant ID is the AR-01 blocker. | `definition.service.ts:10-25,44-65,69-92`; `workflow.service.ts:17-50,170-188,211-259`. |
| Doorbell coverage | CONDITION | The planned real-DB doorbell test has the right persisted cross-tenant objective. The existing project pattern uses real Nest/Prisma fixtures, but its authentication fixture/Host/session proof must be specified by AR-01. | `design.md:120-125`; `apps/api/test/doorbell/jobs-tenant-isolation.e2e-spec.ts:1-112`. |
| Error contract | CONDITION | 401/403/400 outcomes are stated, but AR-01 and AR-02 must bind them to concrete authenticated and validation failure paths. | `design.md:39,254-256`. |

## Working Set, risks, and open questions

| Area | Status | Evidence |
| --- | --- | --- |
| Working Set and Read Order | BLOCKED | The listed files cover the vulnerable routes, services, executor, shared contract, and tests, but omit the concrete local authorization/provider/module boundary required by AR-01. | `design.md:41-76`; `workflow.module.ts:18-38`; `identity.module.ts:19-39`. |
| Testing strategy | BLOCKED | Unit, integration, doorbell, and regression layers are named, but they cannot demonstrate authenticated Host/session/membership binding or a complete fail-closed schema until AR-01/AR-02 are refined. | `design.md:111-125`; existing workflow test evidence above. |
| Risks and rollback | PASS | Legacy expressions are explicitly rejected, sandboxing is rejected, and rollback is incident-controlled rather than a normal route to reopen the P0. | `design.md:102-109,258-263`. |
| Open questions | BLOCKED | The Design marks both questions resolved, but the concrete trust source and complete runtime predicate schema remain unresolved material questions. | `design.md:265-270`; AR-01; AR-02. |

## Validator evidence

| Command | Exact result | Status |
| --- | --- | --- |
| `pnpm sdd:validate` | `CRM-SDD governance validation: PASS` | PASS |
| `pnpm sdd:validate:design -- "openspec/changes/secure-workflow-execution-boundary/design.md"` | `Enterprise Design validation: PASS (openspec/changes/secure-workflow-execution-boundary/design.md)` | PASS |

No build, lint, application test, generation, migration, or e2e command was
run: this is a Design-only review. Those remain Apply evidence after a PASS
Architecture Review and PASS Tasks Review.

## Initial Review canonical next action (historical)

**Design Refinement only** — owned by HIGH / ARCHITECT. It must close AR-01 and
AR-02 without broadening the remediation beyond the approved security boundary,
then a fresh Architecture Review is mandatory. Tasks, Apply, and later phases
are not legal from this gate (`docs/SDD-WORKFLOW.md:93-105,124-143`).

---

## Fresh Architecture Review — after Design Refinement

### Transition and evidence boundary

The refined Design was recovered with the preserved initial BLOCKED review. Its
§5 Working Set and §6 Read Order were consumed before any other source read.
The refinement closes the two initial material findings: AR-01 now names the
Host/Identity context and module export/import path; AR-02 now defines the full
strict Zod contract, semantic checks, execution semantics, validation call
sites, and RED coverage (`design.md:14-16,45-66,74-82,117-126,249-284`).

No implementation, Tasks, Apply, unrelated-change exploration, template change,
or Git operation was performed.

### Bounded deviations after the Read Order

| Path | Reason | New evidence |
| --- | --- | --- |
| `apps/api/src/app.module.ts` | Prove that the claimed Host and permission boundaries are applied to workflow routes. | `TenantResolveMiddleware` and `PermissionsGuard` are global guards/middleware for `*` (`:27-57`). |
| `apps/api/src/common/decorators/permissions.decorator.ts` | Verify the metadata contract named by the refined Design. | `@RequirePermission` writes the shared `PERMISSIONS_KEY` used by both permission guards (`:3-10`). |
| `apps/api/src/common/guards/better-auth.guard.ts` | Verify interaction of the existing global session path with the proposed Identity guard. | Non-admin routes may proceed anonymously, but a resolved legacy user is attached as `request.user`; invalid non-admin credentials may also proceed (`:33-102`). |
| `apps/api/src/common/guards/tenant-scope.guard.ts` | Verify that Host-derived tenant context remains enforced before local workflow guards. | It requires `request.tenantId` and rejects a token/Host tenant mismatch (`:26-58`). |
| `apps/api/src/common/guards/permissions.guard.ts` | Verify the effect of the Design's proposed `@RequirePermission('workflow', ...)`. | It consumes that metadata globally and authorizes only the legacy `request.user.role` through `ROLE_MAP` before controller guards (`:15-61`). |
| `apps/api/src/common/auth/permissions.ts` | Verify whether the legacy permission map can authorize the proposed workflow resource. | The statement and all mapped roles omit `workflow` (`:3-54`). |
| `packages/shared/package.json` | Verify that the planned strict Zod contract has a project-local dependency. | `zod` is already a shared-package dependency (`:7-18`). |

### Fresh findings

| ID | Status | Finding | Evidence |
| --- | --- | --- | --- |
| AR-01 | PASS | The refinement supplies an implementable Host-derived and Identity-authenticated workflow context, ordered local guards, required module export/import, route error behavior, and route/doorbell tests. | `design.md:14-15,45-50,61-66,121-125,141-149,251-284`; `tenant-resolve.middleware.ts:104-115`; `identity-organization.guard.ts:48-86`; `identity.module.ts:27-39`; `workflow.module.ts:21-83`. |
| AR-02 | PASS | The refinement defines a complete strict runtime node/definition contract, legacy rejection, bounded predicate interpreter, and parse-before-side-effect boundaries. | `design.md:16,51-55,114-126,249-284`; current vulnerable baseline in `node-types.ts:1-16` and `node-executor.ts:61-85`; Zod availability above. |
| AR-03 | CONDITION | The current controller suite bypasses all guards, but the refined Working Set explicitly replaces it and adds authenticated Host/session/membership cases. | `workflow.controller.spec.ts:44-54,65-167`; `design.md:61-66,121-125`. |
| AR-05 | BLOCKED | The refined Design applies `@RequirePermission('workflow', action)` to workflow routes, but that decorator is also consumed by the global legacy `PermissionsGuard` before controller-level `IdentityOrganizationGuard`. Its `ROLE_MAP` has no `workflow` resource, so even an Identity owner/admin matching the Host context is denied before the proposed local guard can authorize the route. The Design excludes this incompatible global permission boundary from its Working Set and declares the authorized same-tenant lifecycle successful. | `design.md:14-15,45-55,68-72,121-125,261-284`; `app.module.ts:32-45,53-58`; `permissions.decorator.ts:3-10`; `permissions.guard.ts:15-61`; `auth/permissions.ts:3-54`. |

No BASELINE_DEBT applies: AR-05 is a direct contradiction in the approved
authorization contract, not unrelated pre-existing debt.

### Architecture Review topics A–G — fresh result

| Topic | Status | Review evidence |
| --- | --- | --- |
| A. Scalability | PASS | Input and predicate bounds cap runtime work without new storage (`design.md:163-175`). |
| B. Open/Closed Principle | PASS | Adding a predicate requires an explicit schema, semantic-validator, interpreter, and test change (`design.md:177-184`). |
| C. Ownership | BLOCKED | The Design assigns route authorization to Identity, but the globally shared legacy permission contract intercepts the same metadata and cannot authorize `workflow` (`design.md:186-197`; AR-05). |
| D. Data Retention | PASS | Validation is synchronous and rejected payloads are not persisted (`design.md:199-209`). |
| E. Idempotency | PASS | Parse and authorization precede writes and execution state changes (`design.md:211-220,282-284`). |
| F. Shared Contracts | BLOCKED | The new shared workflow schema is sufficient, but the existing shared `RequirePermission` metadata contract has incompatible consumers (`design.md:222-232,261-284`; AR-05). |
| G. Partitioning Strategy | PASS | Host-derived context and existing scoped Prisma partitioning remain the correct bounded strategy (`design.md:234-245`). |

### Contracts, security, tenant isolation, Working Set, and open questions

| Area | Status | Evidence |
| --- | --- | --- |
| Workflow definition/execution contract | PASS | Strict shared parse, reference checks, and literal-only interpreter remove the dynamic-code path before persistence and execution (`design.md:265-284`). |
| Host/session/membership tenant isolation | BLOCKED | The refined guard path correctly rejects forged tenant inputs and mismatches, but the globally intercepted permission metadata prevents the required authorized same-tenant path (AR-05). |
| Error contract | BLOCKED | The stated `401`/`403`/`400` behavior cannot be realized for authorized owner/admin workflow calls while the global permission guard denies `workflow` first (`design.md:37,121-125,282-284`; AR-05). |
| Doorbell coverage | BLOCKED | The proposed real-DB test has the correct A/B proof, but it cannot prove the required authorized A lifecycle until AR-05 is resolved (`design.md:128-133`; AR-05). |
| Working Set and Read Order | BLOCKED | They cover the refined local Identity and runtime-schema work, but omit the directly conflicting global permission metadata consumer and its resource map (`design.md:39-82`; AR-05). |
| Open questions | BLOCKED | §18 marks both questions resolved, but the conflict between Identity authorization and global legacy permission enforcement is an unresolved material design question (`design.md:293-298`; AR-05). |

### Validator evidence — fresh run

| Command | Exact result | Status |
| --- | --- | --- |
| `pnpm sdd:validate` | `CRM-SDD governance validation: PASS` | PASS |
| `pnpm sdd:validate:design -- "openspec/changes/secure-workflow-execution-boundary/design.md"` | `Enterprise Design validation: PASS (openspec/changes/secure-workflow-execution-boundary/design.md)` | PASS |

The validators confirm governance and Design shape; neither validator evaluates
Nest global-guard ordering or the semantic compatibility of shared permission
metadata.

## Current canonical next action

**STOP and escalate.** This is the second BLOCKED Architecture Review result in
the same correction loop. Under `docs/SDD-WORKFLOW.md:124-143`, no second Design
Refinement, Tasks, Apply, or later phase is legal. The orchestrator must retain
this evidence and escalate AR-05 for an explicit architectural/maintainer
decision on the incompatible global permission contract.

---

## Fresh Architecture Review — after maintainer-authorized AR-05 correction

> **Normalized result:** BLOCKED
> **Executor:** HIGH / ARCHITECT — `sdd-direct-architecture-review`
> **Model binding:** `openai/gpt-5.6-terra` (`.opencode/sdd-model-map.json:8-12,29-32,51-55`)
> **Authorization:** HUMAN authorized exactly one maintainer-scoped AR-05 Design correction after correction-budget exhaustion. No production implementation, Tasks, Apply, Git lifecycle action, guard reordering, bypass, disabling, weakening, or unrelated permission change was authorized.
> **History preservation:** The preceding records remain the exact initial and first-fresh review evidence. This section is the sole fresh review after the authorized AR-05 correction.

### Scope, Working Set, and bounded evidence

The corrected Design §5 Working Set and §6 Read Order were consumed in order.
The review inspected only the workflow boundary, the canonical permission
vocabulary, declared workflow files, and declared tests. Two bounded deviations
were necessary to verify the global-first metadata behavior and the stated error
contract:

| Path | Reason | Evidence |
| --- | --- | --- |
| `apps/api/src/common/guards/better-auth.guard.ts` | Determine whether a workflow request with no session can reach the later Identity guard. | Non-admin requests with no credential proceed (`:42-52`); the route-specific Identity guard therefore cannot issue its planned `401` before the global permission guard. |
| `apps/api/src/common/decorators/permissions.decorator.ts` | Verify that the Design's workflow metadata is consumed by the unchanged global guard. | `@RequirePermission` sets `PERMISSIONS_KEY` (`:3-10`), which `PermissionsGuard` reads (`permissions.guard.ts:15-22`). |

No source or test was changed. Files absent from the Working Set test paths are
planned RED tests, not missing evidence: `workflow-tenant-context.guard.ts`,
the permission/context/shared-schema test files, and the workflow doorbell e2e
file are explicitly Create actions.

### Gate verdict and correction-budget/handoff state

**BLOCKED.** The maintainer-authorized AR-05 correction closes AR-05, but the
corrected Design retains an incompatible full-route anonymous error contract.
The global `PermissionsGuard` remains first as required; an anonymous workflow
request reaches it as `lector` and is denied `403` before the local
`IdentityOrganizationGuard` can issue the Design's stated `401`. Resolving this
requires a Design contract/test correction or a prohibited global-auth/order
change. The ordinary Architecture Review correction budget remains exhausted;
the narrow AR-05 authorization does not authorize another correction.

### Findings

| ID | Status | Finding | Evidence | Required action |
| --- | --- | --- | --- | --- |
| AR-05 | PASS | The global permission compatibility contradiction is closed architecturally. The Design adds only `workflow: read/write/execute` to canonical `statement`/`ROLE_MAP`, grants the capability only to exact `owner` and Identity `admin`, retains denial for `operador`, `lector`, unknown, and anonymous callers, and leaves the global implementation, registration, and order unchanged. | `design.md:14-16,28,49,66-72,76-79,123-125,157-159,203-210,239-246,273-280,307-308,314-316`; current global order `app.module.ts:30-46`; current map/guard ownership `permissions.ts:3-54`, `permissions.guard.ts:15-61`; Identity canonical owner/admin vocabulary `identity-organization.guard.ts:23-31`. | None. This is required Apply evidence for production behavior and RED/GREEN test execution. |
| AR-06 | BLOCKED | The Design says both that the preserved global permission chain runs first and that a workflow request with no session is `401`. Those statements cannot both hold for this route: `BetterAuthGuard` permits anonymous non-admin requests, then `PermissionsGuard` maps no user to `lector` and throws `403` for `workflow` before `IdentityOrganizationGuard` runs. The planned unit test may prove the local guard's isolated `401`, but no full-route integration/doorbell test can prove the stated anonymous `401` without reordering/bypassing the preserved global chain. | `design.md:14-16,41,66,130-135,273-280,301`; `better-auth.guard.ts:42-65`; `app.module.ts:32-46`; `permissions.guard.ts:24-58`; `identity-organization.guard.ts:56-86`. | HUMAN decision: authorize a Design-only correction that aligns the full-route anonymous contract and RED/integration/doorbell expectations to global-first `403`, or explicitly authorize a different global-auth decision. No implementation may proceed. |

No BASELINE_DEBT applies. AR-06 is a direct inconsistency in the approved
workflow authorization and error contract, not unrelated pre-existing debt.

### Architecture Review topics A–G

| Topic | Status | Review evidence |
| --- | --- | --- |
| A. Scalability | PASS | Finite node/predicate limits bound evaluation without new storage (`design.md:175-187`). |
| B. Open/Closed Principle | PASS | New safe behavior requires an explicit schema, semantic validator, executor branch, and tests (`design.md:189-196`). |
| C. Ownership | PASS | Global canonical permissions decide capability first; Host tenancy, Identity membership, and Workflow context remain additive owners (`design.md:198-210`). |
| D. Data Retention | PASS | Parsing is synchronous and rejected payloads are not persisted (`design.md:212-222`). |
| E. Idempotency | PASS | Authorization and parse occur before workflow mutation (`design.md:224-233,301`). |
| F. Shared Contracts | BLOCKED | The permission vocabulary is now compatible (AR-05 PASS), but the public anonymous error contract conflicts with its global metadata consumer (AR-06). |
| G. Partitioning Strategy | PASS | Host-derived tenant context and scoped Prisma retain the existing tenant partition (`design.md:248-259`). |

### Contracts, security, tenant isolation, and tests

| Area | Status | Evidence |
| --- | --- | --- |
| Global PermissionsGuard intact and first | PASS | `APP_GUARD` registration keeps `PermissionsGuard` after BetterAuth, TenantScope, and RateLimit; the Design expressly excludes changes to it and `app.module.ts` (`app.module.ts:30-46`; `design.md:76-79`). |
| Canonical workflow vocabulary only | PASS | The Working Set names only `common/auth/permissions.ts` for the additive resource/action and excludes global guard/auth changes (`design.md:49,76-79,157-159`). |
| Exact owner/admin allow; other roles deny | PASS (design) / NEEDS_EVIDENCE (Apply) | The Design binds workflow actions to `owner` and exact Identity `admin` only, and plans explicit RED denials for anonymous, `operador`, `lector`, and unknown roles (`design.md:16,66,130-131,275-280`). Current production map has no workflow entry, so runtime authorization remains required Apply evidence. |
| Authorized same-tenant owner/admin additive path | PASS (architecture) / NEEDS_EVIDENCE (Apply) | The stated path is global permission -> Host context -> Identity session/organization/membership -> workflow context/resource authorization (`design.md:14-15,32-38,131-135,156-161,273-301`). The proposed map correction makes this path reachable without a bypass; no production route/guard/map code exists yet. |
| Host/org mismatch, forged tenantId, and cross-tenant denial | PASS (architecture) / NEEDS_EVIDENCE (Apply) | Trusted `hostTenantId`, active-organization membership checks, scoped resource lookup, and A/B doorbell tests are bounded in the Design (`design.md:14-15,72,131-135,140-144,268-280,301`). Existing workflow guards are still caller-tenant based (`workflow-definition.guard.ts:8-23`; `workflow-execution.guard.ts:8-23`), so runtime proof belongs to Apply. |
| Anonymous and unauthorized-role denial | CONDITION | Denial is architecturally preserved, and the Design includes RED tests; however the Design's full-route `401` claim is incompatible with global-first `403` (AR-06). |
| No global-auth redesign, guard reorder, bypass, or unrelated permission change required for AR-05 | PASS | The AR-05 correction is a narrow map addition; all prohibited alternatives are rejected in the Design (`design.md:28,76-79,157-159,207-210,245-246,307-308`). |
| Bounded RED/verification tests | BLOCKED | The Design names permission-map, context, controller, service, cross-tenant, shared-schema, and real-Prisma doorbell RED tests (`design.md:66-72,126-144`), but their anonymous full-route expected status must be reconciled under AR-06 before Tasks/Apply. |

### Working Set, risks, and open questions

| Area | Status | Evidence |
| --- | --- | --- |
| Working Set and Read Order | PASS for AR-05; BLOCKED overall | The corrected map file, untouched global guard/app module, Identity import/export, workflow wiring, and test files are all bounded (`design.md:43-90`). The AR-06 contract correction is Design-only but needs HUMAN authorization because the loop is exhausted. |
| Security and tenant-isolation scope | PASS | No schema, frontend, plugin, infrastructure, credential, or global-auth redesign is included (`design.md:74-79,146-161`). |
| Risks and rollback | PASS | Map broadening is explicitly mitigated by owner/admin-only tests and preserved registration/order (`design.md:116-125,303-308`). |
| Open questions | BLOCKED | §18 resolves AR-05, but does not resolve whether full-route anonymous denial is `401` or the required global-first `403` (`design.md:310-316`; AR-06). |

### Validator evidence

| Command | Exact result | Status |
| --- | --- | --- |
| `pnpm sdd:validate` | `CRM-SDD governance validation: PASS` | PASS |
| `pnpm sdd:validate:design -- "openspec/changes/secure-workflow-execution-boundary/design.md"` | `Enterprise Design validation: PASS (openspec/changes/secure-workflow-execution-boundary/design.md)` | PASS |

No build, lint, application test, migration, generation, or e2e command was
run. The Design's named workflow and doorbell commands are Apply evidence, and
their execution is not legal while this Architecture Review is BLOCKED.

## Current canonical next action

**STOP and escalate to HUMAN / MAINTAINER.** Under
`docs/SDD-WORKFLOW.md:124-143`, Architecture Review is PASS only when all
material findings are closed; the ordinary correction budget is exhausted. The
previous HUMAN authorization was scoped to AR-05 only. Obtain an explicit
maintainer decision on AR-06 before any Design correction. Do not create Tasks,
start Apply, implement production code, or perform any Git lifecycle action.

---

## Fresh Architecture Review — after maintainer-authorized AR-06 correction

> **Normalized result:** PASS
> **Executor:** HIGH / ARCHITECT — `sdd-direct-architecture-review`
> **Model binding:** `openai/gpt-5.6-terra` (`.opencode/sdd-model-map.json:8-12,29-32,51-55`)
> **Authorization:** HUMAN authorized exactly one Design-only AR-06 correction: align the full-route anonymous workflow contract and its acceptance/RED/integration/doorbell evidence to global-first `403`. No production implementation, Tasks, Apply, global-auth change, guard reordering/bypass/weakening, unrelated permission work, or Git lifecycle action was authorized.
> **History preservation:** Every preceding section is preserved as exact historical review evidence. This is the sole fresh HIGH review after the AR-06 correction.

### Scope, Working Set, and evidence boundary

The corrected Design §5 Working Set and §6 Read Order were consumed in order
before review evidence was expanded. The review then read the existing review
artifact only to preserve its exact history. No other deviation was needed.

No source or test was changed. The listed Create test paths do not yet exist;
that is expected planned Apply work, not absent Architecture Review evidence.
The current controller, guards, services, shared types, and executor remain
the vulnerable baseline that the approved Design will replace. They are not
evidence that the proposed production behavior already runs.

### Gate verdict and correction-budget state

**PASS.** AR-06 is closed: the Design now states the only compatible
full-route anonymous result, `403`, because the preserved global
`PermissionsGuard` resolves the missing user as `lector` and denies the
declared `workflow` permission before `IdentityOrganizationGuard`, workflow
resource access, or mutation. The isolated local Identity guard may retain its
direct missing-session `401` behavior without representing the route contract.

The ordinary Architecture Review correction budget remains exhausted from the
initial BLOCKED review and its one Design Refinement
(`docs/SDD-WORKFLOW.md:129-143`). The two subsequent maintainer-authorized,
Design-only AR-05 and AR-06 corrections are consumed exceptions; they do not
create another automatic refinement allowance. No material finding remains in
this fresh review, so the legal graph edge is PASS -> Tasks.

### Findings

| ID | Status | Finding | Evidence | Required action |
| --- | --- | --- | --- | --- |
| AR-05 | PASS | The narrow canonical vocabulary correction remains intact: `workflow` has only `read`, `write`, and `execute`; it is granted only to `owner` and exact Identity `admin`, while anonymous, `operador`, `lector`, and unknown roles remain denied. It neither changes `PermissionsGuard` nor its registration/order. | `design.md:14-16,28,49,66-72,76-79,121-124,130-135,157-161,203-210,239-246,273-281,301-304`; current baseline map/guard `apps/api/src/common/auth/permissions.ts:3-54`, `apps/api/src/common/guards/permissions.guard.ts:15-61`; order `apps/api/src/app.module.ts:30-46`. | Apply the bounded map and test changes; runtime proof is Apply evidence. |
| AR-06 | PASS | The full-route anonymous contract is now internally consistent with the preserved global chain: `403` occurs before Identity/workflow resource access or mutation. The Design limits `401` to direct local-guard testing and requires full-chain `403` in integration and doorbell coverage. | `design.md:32-41,66-72,120-135,140-144,273-281,301-304,317-320`; global fallback/denial `permissions.guard.ts:24-58`; global ordering `app.module.ts:30-46`; local direct guard behavior `identity-organization.guard.ts:48-86`. | Apply the planned RED tests and production work; do not alter global guard order. |

No BLOCKED, CONDITION, BASELINE_DEBT, or NEEDS_EVIDENCE finding remains for
this Architecture Review gate. Runtime behavior is deliberately recorded below
as future Apply evidence rather than being claimed as present fact.

### Architecture Review topics A–G

| Topic | Status | Review evidence |
| --- | --- | --- |
| A. Scalability | PASS | Definition/predicate cardinality and field bounds cap validation and interpretation without new storage (`design.md:175-187,283-300`). |
| B. Open/Closed Principle | PASS | Safe extension is explicit: schema variant, semantic validator, interpreter branch, and RED tests change together (`design.md:189-196,163-169`). |
| C. Ownership | PASS | The global permission map grants capability first; Host middleware owns tenant selection; Identity owns membership; Workflow owns trusted-context adaptation, resource scope, and execution (`design.md:14-18,152-161,198-210`). |
| D. Data Retention | PASS | Rejected definitions are not persisted and no retention model changes (`design.md:212-222`). |
| E. Idempotency | PASS | Authorization and parsing precede definition/version/publish/start/resume side effects (`design.md:224-233,300-302`). |
| F. Shared Contracts | PASS | The strict shared workflow schema and canonical permission metadata have defined producers/consumers and explicit error semantics (`design.md:235-246,263-304`). |
| G. Partitioning Strategy | PASS | Host-derived context plus existing scoped Prisma preserves tenant partitioning; forged caller `tenantId` is excluded from authorization (`design.md:248-259,300-304`). |

### Contracts, security, tenant isolation, Working Set, and open questions

| Area | Status | Evidence |
| --- | --- | --- |
| Global guard order and fail-closed behavior | PASS | The Design excludes global guard/app-module modification and states global permission denial before local guards; current registration remains BetterAuth -> TenantScope -> RateLimit -> Permissions (`design.md:14-16,74-79,301-304`; `app.module.ts:30-46`). |
| Full-route anonymous denial | PASS (architecture) / NEEDS_EVIDENCE (Apply) | The approved contract is `403` before workflow resource access/mutation, with integration and doorbell spies/tests prescribed. The current controller lacks the proposed route metadata and guards, so only Apply can establish runtime proof (`design.md:41,130-135,142-144,273-281,301-304`; `workflow.controller.ts:20-136`). |
| Authorized same-tenant owner/admin path | PASS (architecture) / NEEDS_EVIDENCE (Apply) | The exact ordered path is canonical workflow permission -> Host tenant -> organization/membership -> trusted workflow context/resource authorization. The planned map, module wiring, route metadata, and tests make it reachable without a bypass (`design.md:14-16,32-38,49-55,121-135,152-161,273-304`). |
| Unauthorized role and cross-tenant/forged-input denial | PASS (architecture) / NEEDS_EVIDENCE (Apply) | `operador`, `lector`, unknown, and anonymous are denied by the canonical map; Host/org mismatch and foreign resources are denied by Identity/context/scoped lookup; query/body `tenantId` is ignored for authorization. Required A/B doorbell coverage is explicit (`design.md:16,41,130-135,140-144,268-281,300-304`). |
| Dynamic-code elimination and validation ordering | PASS (architecture) / NEEDS_EVIDENCE (Apply) | Strict Zod parse, semantic references, literal predicates, and parse-before-write/start/resume are defined; the existing expression/New Function implementation is baseline to replace (`design.md:18,126-136,263-302`; `node-types.ts:1-16`; `node-executor.ts:61-85`). |
| Working Set and Read Order | PASS | The map, workflow controller/guards/module/services, Identity export, shared contract/executor, and precise RED/integration/doorbell test paths are bounded; global implementation/registration, schema, frontends, and infrastructure are protected (`design.md:43-90`). |
| Prohibited scope / implementation requirement | PASS | The Design requires no global-auth redesign, guard reordering/bypass/weakening, unrelated permission change, schema migration, frontend, infrastructure, or credential work. It is sufficiently specified for later bounded implementation but this review performed none (`design.md:27-28,74-79,146-161,306-311`). |
| Open questions | PASS | All four questions are resolved, including the full-route anonymous `403` contract (`design.md:313-320`). |

### Validator evidence — fresh run

| Command | Exact result | Status |
| --- | --- | --- |
| `pnpm sdd:validate` | `CRM-SDD governance validation: PASS` | PASS |
| `pnpm sdd:validate:design -- "openspec/changes/secure-workflow-execution-boundary/design.md"` | `Enterprise Design validation: PASS (openspec/changes/secure-workflow-execution-boundary/design.md)` | PASS |

No build, lint, application test, migration, generation, or e2e command was
run. Those commands are named implementation/verification evidence and are not
substitutes for this Design-only review.

## Current canonical next action

**Tasks is legal next** — owned by MID / BUILDER. The canonical PASS edge is
Architecture Review -> Tasks (`docs/SDD-WORKFLOW.md:93-105,124-127`). Tasks
must derive only from this approved Design Working Set; Apply remains illegal
until Tasks Review passes and the Workload Guard is satisfied. No Git lifecycle
action is authorized.
