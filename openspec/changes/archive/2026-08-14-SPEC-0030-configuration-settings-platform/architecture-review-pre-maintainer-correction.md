# Architecture Review: SPEC-0030 — Configuration & Settings Platform

> **Normalized result:** BLOCKED
> **Executor:** HIGH / ARCHITECT — `sdd-direct-architecture-review`
> **Model binding:** `openai/gpt-5.6-terra` (`.opencode/sdd-model-map.json:8-12,29-32,51-55`)
> **Persistence:** hybrid; this file is the exact fresh review artifact.
> **Review sequence:** fresh Architecture Review after the one permitted Design Refinement. The correction budget is consumed.

## Scope and evidence boundary

Consumed the refined Design Working Set and Read Order before inspection. Reviewed
the Design against `docs/SDD-WORKFLOW.md`, the Enterprise Design template, and
the named profile, Host-tenant, permissions, composition, API-client,
navigation, and doorbell evidence. Bounded contradiction reads verified the
existing profile controller, global guards, and authentication behavior. No
Tasks, Apply, implementation, or SPEC-0028/SPEC-0029 artifact was touched.

## Historical evidence

The initial BLOCKED review is preserved unchanged as
`architecture-review-initial.md`. Its AR-001 through AR-005 contract,
ownership, Working Set, dependency, and module-boundary findings are closed by
the refined Design. AR-006 remains a non-blocking permission-vocabulary
condition and is retained below.

## Gate verdict

**BLOCKED.** The refined Design is structurally complete and resolves the
initial material findings, but its published settings contract cannot be
implemented through the declared, unchanged `TenantProfileService` boundary:
the required `logo: null` clear is rejected by that service's TypeScript input
type. The unauthenticated status code also conflicts with the globally applied
guard chain. These are implementation-readiness and security-contract
contradictions. This is the second Architecture Review in the loop; no second
Design Refinement is legal.

## Findings

| ID | Normalized status | Finding | Evidence | Required action |
|---|---|---|---|---|
| AR-001–AR-005 | PASS | Initial field-catalog, ownership, Working Set, dependency/generated-boundary, and module-export blockers are closed. | `design.md:20-23,42-69,134-155,236-268`; initial evidence in `architecture-review-initial.md`. | Historical only; no action in this review. |
| AR-006 | CONDITION | The tenant permission resource is intentionally the existing Spanish `configuracion`; it must be used and tested exactly. | `design.md:34,74-77,113-116,274`; `apps/api/src/common/auth/permissions.ts:3-26`. | Preserve the resource spelling in any maintainer-approved resolution. |
| AR-007 | BLOCKED | `PATCH` promises that `logo: null` clears the value, while the only declared mutation path accepts `logo?: string`. A settings service forwarding the declared DTO to the unchanged profile service cannot type-check; bypassing it would violate the Design's one-way adapter and excluded-file boundary. | `design.md:12-14,34,65,247-250,259,268`; `apps/api/src/modules/tenant-profile/tenant-profile.service.ts:31-40`. | HUMAN / MAINTAINER must decide whether to change the public v1 contract or authorize a new bounded Design/Working Set that changes the profile boundary. |
| AR-008 | BLOCKED | The Design guarantees `401` for no session, but `/api/v1/tenant/settings` is not an admin route. `BetterAuthGuard` permits an anonymous non-admin request and `PermissionsGuard` then denies the default `lector` role with `403`; the declared controller metadata alone does not produce `401`. | `design.md:34,253-257`; `apps/api/src/common/guards/better-auth.guard.ts:42-52`; `apps/api/src/common/guards/permissions.guard.ts:15-59`; `apps/api/src/app.module.ts:31-46`. | HUMAN / MAINTAINER must choose and authorize the route-authentication contract before another Design can be produced. |

## Architecture Review topics A–G

| Topic | Status | Review evidence |
|---|---|---|
| A. Scalability | PASS | Existing Tenant primary-key reads; no new persisted data. `design.md:159-168`. |
| B. Open/Closed Principle | PASS | New fields require an approved owner and contract, not arbitrary JSON. `design.md:170-177`. |
| C. Ownership | PASS | `Tenant`/Profile remains the single owner for `name` and `logo`. `design.md:179-190`. |
| D. Data Retention | PASS | The facade creates no retained dataset. `design.md:192-201`. |
| E. Idempotency | CONDITION | Equivalent PATCH is state-idempotent, subject to resolving AR-007's nullable-logo contract. `design.md:203-212`. |
| F. Shared Contracts | BLOCKED | The local contract is appropriate for one consumer, but its nullable-logo mutation contract is not executable through the declared service. `design.md:214-223,236-259`; AR-007. |
| G. Partitioning Strategy | PASS | No new table or volume dimension exists. `design.md:225-234`. |

## Contracts, security, tenant isolation, and Working Set

| Area | Status | Evidence |
|---|---|---|
| Host tenant authority | PASS | `@TenantId()` reads only middleware-resolved request state; the Design rejects supplied tenant IDs. `apps/api/src/common/decorators/tenant-id.decorator.ts:11-21`; `design.md:12,34,145-147`. |
| Cross-tenant enforcement | PASS | The global tenant guard rejects an authenticated tenant mismatch; the Design requires a real-database Host A/B doorbell test. `apps/api/src/common/guards/tenant-scope.guard.ts:44-58`; `design.md:55-57,128-132`. |
| Authorization | CONDITION | Global `PermissionsGuard` enforces controller metadata using `configuracion`; AR-008 prevents accepting the stated unauthenticated `401` behavior. `apps/api/src/common/guards/permissions.guard.ts:15-61`; AR-006, AR-008. |
| Secrets and excluded fields | PASS | `password` and `config` are excluded from the facade and unknown keys are rejected. `design.md:12,34,63-67,259`. |
| Legacy compatibility | BLOCKED | Name/logo ownership and rollback are explicit, but nullable logo mutation cannot honor the contract through the unchanged profile service. `design.md:259,265-268`; AR-007. |
| Working Set and Read Order | PASS | All named paths are concrete; the count reconciles to 7 creates and 4 modifies, and the Read Order was consumed before extra bounded inspection. `design.md:36-107`. |

## Validator evidence

| Check | Exact result | Classification |
|---|---|---|
| `pnpm sdd:validate` | `CRM-SDD governance validation: PASS` | PASS |
| `pnpm sdd:validate:design -- "openspec/changes/SPEC-0030-configuration-settings-platform/design.md"` | `Enterprise Design validation: PASS` | PASS — structural validation only |
| `git diff --check` | PASS (no output). This repository command does not inspect the untracked active change directory. | PASS |

No application build, lint, test, migration, generation, Tasks, or Apply command
was run. No implementation file was changed.

## Canonical next action

**STOP and escalate to HUMAN / MAINTAINER.** Under
`docs/SDD-WORKFLOW.md:129-143`, the one Design Refinement retry is consumed and
this second BLOCKED review has no ordinary next edge. Preserve this evidence;
do not create Tasks, revise the Design, or broaden the Working Set
without a maintainer-authorized new bounded action.

```yaml
status: BLOCKED
change: SPEC-0030-configuration-settings-platform
phase: Architecture Review
executor: sdd-direct-architecture-review
role: HIGH
artifact: openspec/changes/SPEC-0030-configuration-settings-platform/architecture-review.md
findings:
  - AR-006: CONDITION — retain and test configuracion permission vocabulary
  - AR-007: BLOCKED — nullable logo contract conflicts with unchanged profile-service input
  - AR-008: BLOCKED — declared unauthenticated 401 conflicts with global non-admin guard behavior
evidence:
  - initial review preserved: architecture-review-initial.md
  - refined Design Working Set and Read Order consumed before bounded inspection
  - pnpm sdd:validate: PASS
  - pnpm sdd:validate:design: PASS
  - git diff --check: PASS (no output; tracked-diff scope only)
next: STOP and escalate to HUMAN / MAINTAINER; Design Refinement budget is exhausted
```
