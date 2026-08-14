# Architecture Review: SPEC-0030 — Configuration & Settings Platform

> **Normalized result:** PASS
> **Executor:** HIGH / ARCHITECT — `sdd-direct-architecture-review`
> **Model binding:** `openai/gpt-5.6-terra` (`.opencode/sdd-model-map.json`)
> **Persistence:** hybrid; this file is the exact fresh review artifact.
> **Scope:** exactly the HUMAN / MAINTAINER-authorized AR-007/AR-008 correction. AR-001–AR-005 were not reopened.

## Review boundary and provenance

The corrected `design.md` Working Set and Read Order were consumed before the
bounded evidence reads. The prior fresh BLOCKED review is preserved unchanged
as `architecture-review-pre-maintainer-correction.md`; the initial review
remains `architecture-review-initial.md`. No Design, production, test, Tasks,
Apply, SPEC-0028, or SPEC-0029 artifact was modified.

The only bounded deviations from the Read Order were
`apps/api/src/app.module.ts`, to verify global guard registration for AR-008,
and `apps/api/src/common/guards/tenant-scope.guard.ts`, to verify the declared
Host/token isolation boundary. Both directly close required review facts.

## Gate verdict

**PASS.** The approved minimal Profile-boundary change makes `logo: null`
executable through the sole durable owner while preserving omitted-logo
behavior. The settings route correctly documents and tests anonymous GET/PATCH
as `403` under the unchanged global guards. Exact `configuracion` permission
metadata is retained and planned for direct test coverage. The correction adds
no guard/auth change, tenant selector, data owner, schema change, or unrelated
requirement.

## Findings

| ID | Status | Finding | Evidence |
|---|---|---|---|
| AR-006 | PASS | The exact existing resource vocabulary is `configuracion`; the Design requires GET `configuracion:read`, PATCH `configuracion:update`, and controller metadata tests. | `design.md:36,58-60,81,122,132,154,274,292`; `apps/api/src/common/auth/permissions.ts:3-12,17-25`; `permissions.decorator.ts:3-10`. |
| AR-007 | PASS | The declared, minimal modification widens only `TenantProfileService.updateProfile` to `logo?: string \| null`; its existing `data.logo !== undefined` branch persists supplied `null` and omits the key when absent. The declared direct regression test proves both behaviors. | `design.md:13,25,50,63,124,131,197-199,257-269,283-286`; `tenant-profile.service.ts:31-40`. |
| AR-008 | PASS | The Design now specifies anonymous GET/PATCH as `403`, matching unchanged non-admin global guards: BetterAuth permits anonymous non-admin requests and PermissionsGuard denies the default `lector` role lacking `configuracion`. Tests cover anonymous and authenticated permission denials; no guard/auth file is in the modification set. | `design.md:36,59,70,82,123,132,156,274-275,294`; `better-auth.guard.ts:42-52`; `permissions.guard.ts:21-59`; `app.module.ts:31-46`. |

## Enterprise Design topics A–G

| Topic | Status | Evidence |
|---|---|---|
| A. Scalability | PASS | Existing Tenant primary-key identity reads; no new state or query class. `design.md:169-178`. |
| B. Open/Closed Principle | PASS | Future fields require an approved owner and contract, not generic JSON. `design.md:180-187`. |
| C. Ownership | PASS | `Tenant`/Profile remains the single identity owner; Settings is one-way facade. `design.md:189-200`. |
| D. Data Retention | PASS | No new retained data; identity follows existing Tenant lifecycle. `design.md:202-211`. |
| E. Idempotency | PASS | Equivalent PATCH, including a null clear, is state-idempotent and tested. `design.md:213-222`. |
| F. Shared Contracts | PASS | Local typed DTO/profile input is proportionate to one internal consumer; nullable input is executable. `design.md:224-233,246-277`. |
| G. Partitioning Strategy | PASS | No new table or partitioning dimension. `design.md:235-244`. |

## Contracts, boundaries, security, and Working Set

| Area | Status | Evidence |
|---|---|---|
| API contract | PASS | GET/PATCH return identity settings; malformed/forged/excluded fields are `400`; anonymous and unauthorized permission paths are `403`. `design.md:36,246-277`. |
| Module boundary | PASS | Settings imports exported Profile; Profile never imports Settings; composition module only imports the feature. `design.md:44-50,149-157,283-286`; `tenant-profile.module.ts:6-10`; `tenant.module.ts:38-63`. |
| Tenant isolation | PASS | Tenant ID is request context derived by Host middleware, not request body; TenantScopeGuard rejects authenticated Host/token tenant mismatch; a real-database Host A/B doorbell test is declared. `tenant-id.decorator.ts:11-21`; `tenant-scope.guard.ts:44-58`; `design.md:60,121,137-141,153-156`. |
| Permission/security behavior | PASS | `configuracion` is exact; global guard chain is unchanged; anonymous and authenticated permission-denial tests require `403`. `design.md:58-60,70,81-82`; `permissions.guard.ts:24-59`. |
| Working Set count | PASS | 10 creates + 5 modifies + 0 deletes = 15 files: primary 5 creates/4 modifies; secondary 5 creates/1 modify. It includes the direct Profile nullable-logo regression test. `design.md:42-74`. |
| Open questions | PASS | All three are resolved; none blocks Apply. `design.md:288-294`. |

## Validator evidence

| Check | Result | Status |
|---|---|---|
| `pnpm sdd:validate:design` | The no-argument command reported its required design-path usage; rerun with the declared Design path passed: 18 ordered sections, A–G topics, decision/rationale separation, and Working Set structure. | PASS |
| `pnpm sdd:validate` | `CRM-SDD governance validation: PASS`. | PASS |
| `git diff --check` | PASS (no output). It checks Git-tracked diff content and does not itself prove whitespace for an untracked artifact. | PASS |

The required Design validator takes a mandatory path argument; the successful
invocation was `pnpm sdd:validate:design --
"openspec/changes/SPEC-0030-configuration-settings-platform/design.md"`.

## Canonical next action

**Tasks.** This PASS Architecture Review permits the next graph edge to the
MID / BUILDER Tasks phase. Do not invoke Tasks from this review.

```yaml
status: PASS
change: SPEC-0030-configuration-settings-platform
phase: Architecture Review
executor: sdd-direct-architecture-review
role: HIGH
artifact: openspec/changes/SPEC-0030-configuration-settings-platform/architecture-review.md
findings:
  - AR-006: PASS — exact configuracion vocabulary is declared and testable
  - AR-007: PASS — nullable-logo clear is executable through the minimal Profile change and direct regression test
  - AR-008: PASS — anonymous and permission-denied GET/PATCH are documented and tested as 403 under unchanged guards
evidence:
  - corrected Working Set and Read Order consumed before bounded contradiction reads
  - prior fresh review preserved as architecture-review-pre-maintainer-correction.md
  - Enterprise Design sections 1–18 and topics A–G reviewed
  - pnpm sdd:validate:design: PASS with the declared design path
  - pnpm sdd:validate: PASS
  - git diff --check: PASS (no output; tracked-diff scope only)
next: Tasks (MID / BUILDER); do not invoke it from Architecture Review
```
