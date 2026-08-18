# Architecture Review: secure-default-deny-tenant-auth-boundary

> **Normalized result:** BLOCKED
> **Action:** Architecture Review
> **Role:** HIGH / ARCHITECT
> **Model binding:** `openai/gpt-5.6-terra` (`.opencode/sdd-model-map.json:8-12,29-32,51-55`)
> **Persistence:** hybrid; this is the exact repository artifact and Engram carries only its bounded status/evidence summary.

## Decision

The P0 default-deny objective is sound, but the approved Design does not yet
define a coherent, tenant-safe external-auth hand-off. Nest executes the global
guards before controller `@UseGuards`; bypassing the global session/scope guards
therefore leaves no defined post-auth Host comparison for client sessions, and
the current API-token guard overwrites `request.tenantId`. In addition, removing
`@Public()` from export would place `BetterAuthGuard` before its existing
identity guard even though the proven export fixture has no legacy user for that
identity session. These are material contract contradictions, not implementation
details.

## Findings

| ID | Classification | Finding | Evidence / required Design Refinement |
| --- | --- | --- | --- |
| AR-01 | BLOCKED | The proposed external-auth metadata (`'api-token' \| 'client-session'`) cannot preserve the existing export identity contract or prove Host-to-external-principal isolation. `ExportController` is to lose `@Public()` but has no external identity classification; its existing real-HTTP fixture creates only `ba_users`/membership/session and expects the identity guard to admit same-tenant export. With default-deny, `BetterAuthGuard` first requires `legacyUser`; its lookup returns no user for that fixture, so it returns 403 before `IdentityOrganizationGuard`. Separately, `ClientAuthGuard` and `TokenAuthGuard` overwrite `request.tenantId` after global `TenantScopeGuard` runs, with no defined post-auth Host comparison. | Refine the Design—not production code—to define the exact external-auth classifications and guard responsibilities for API token, client session, and identity session; state where each external principal is compared to immutable `hostTenantId`, and add the resulting guard files/tests to the Working Set. Preserve public API token/query-`tenantId` remediation as explicitly deferred, but do not claim Host/body/query/path Tenant A/B isolation for that deferred family. Resolve Open Questions 1 and 3 without requiring impossible pre-Apply HTTP evidence; make RED/integration/doorbell proof an Apply acceptance criterion. Evidence: `app.module.ts:31-46`; `better-auth.guard.ts:25-75`; `tenant-scope.guard.ts:44-58`; `token-auth.guard.ts:26-35`; `client-auth.guard.ts:41-56`; `export.controller.ts:43-46`; `identity-organization.guard.ts:48-86`; `import-export-tenant-isolation.e2e-spec.ts:28-64,72-105`; `design.md:12-14,47-55,69-72,113-115,300-302`. |
| AR-02 | PASS | The global/default-deny boundary is mechanically feasible for ordinary tenant and admin Better Auth routes. Global order is Better Auth, Tenant Scope, rate limit, then permissions; missing or invalid tenant sessions can become 401 before handler execution, and authenticated Host mismatch/permission failures remain 403. | `app.module.ts:31-46`; `better-auth.guard.ts:42-65,81-102`; `tenant-scope.guard.ts:44-58`; `permissions.guard.ts:21-61`; `design.md:28-39,122-125,280-284`. |
| AR-03 | PASS | Host tenant resolution remains distinct from actor authentication. Middleware derives immutable `hostTenantId` only from Host and rejects conflicting/ambiguous Host data; it does not create an actor principal. | `tenant-resolve.middleware.ts:27-37,93-116`; `design.md:8,12-14,145-149,194-206`. |
| AR-04 | PASS | The Design correctly removes anonymous authorization. Current `PermissionsGuard` defaults a missing user to `lector`; the proposed contract requires an authenticated principal and preserves 401 for missing/invalid credentials versus 403 for authenticated scope/permission denial. | `permissions.guard.ts:21-58`; `design.md:8,12-14,39,50,122-125,280-284`. |
| AR-05 | PASS | The anonymous allow-list is explicit and repository-proven, with no invented endpoints: `GET /api/v1/health`, `GET /metrics`, auth login/check-user/register, client login/register/logout, and shared-document token download. Admin logout is not public. | `health.controller.ts:9-21`; `metrics.controller.ts:5-13`; `auth.controller.ts:13-40,69-75`; `client-auth.controller.ts:21-68`; `shared.controller.ts:16-29`; `design.md:147-149`. |
| AR-06 | CONDITION | Public API token tenant scope is deliberately deferred. The existing token guard overwrites `request.tenantId` and the controllers consume query `tenantId`; this review neither accepts that as Host isolation nor expands this P0 change into token/query remediation. | `token-auth.guard.ts:26-35`; `v1-workflows.controller.ts:14-36`; `v1-documents.controller.ts:14-31`; `design.md:14,51-52,70,131-134`. |
| AR-07 | PASS | Unsigned or unregistered webhook/callback candidates remain default-denied. The inspected tenant and internal webhook controllers have neither `@Public()` nor an inbound signature/state guard; no endpoint is invented or opened. Signed webhook and OAuth callback admission remains a separately designed future contract. | `tenant-webhooks.controller.ts:7-18`; `webhook.controller.ts:22-79`; `design.md:14,24,72,115,149,155-157,284,301`. |
| AR-08 | NEEDS_EVIDENCE | Representative route-family and Tenant A/B HTTP coverage is correctly planned but cannot close AR-01 until the refined external-auth authority contract exists. Required future proof includes ordinary tenant routes, client-session Host A/B mismatch, identity export Host A/B mismatch, public allow-list regression, and no pre-denial effects. API-token query-tenant scope remains outside this change. | `design.md:118-134`; `import-export-tenant-isolation.e2e-spec.ts:72-126`. This is subordinate to AR-01 and does not authorize Apply. |

## Architecture Topic Verdicts

| Topic | Classification | Evidence |
| --- | --- | --- |
| A. Scalability | PASS | Metadata lookup is constant-cost and adds no stored data (`design.md:161-176`). |
| B. Open/Closed Principle | BLOCKED | Metadata is a valid extension point, but it omits the already-existing identity-session mechanism and no safe external-principal/Host extension point is specified (`design.md:178-190,267-285`). |
| C. Ownership | BLOCKED | Host context ownership is explicit, but ownership/comparison of API-token, client-session, and identity-session principals after global-guard hand-off is not (`design.md:192-206`; AR-01 evidence). |
| D. Data Retention | PASS | Control-flow metadata only; no new retained data or schema is proposed (`design.md:208-221`). |
| E. Idempotency | CONDITION | Default-route denial is side-effect free as designed; external-route pre-effect denial awaits AR-01's authority definition and required HTTP proof (`design.md:223-235,122-125`). |
| F. Shared Contracts | BLOCKED | The metadata contract excludes identity session and does not express required Host-binding responsibility (`design.md:237-249,269-285`). |
| G. Partitioning Strategy | CONDITION | Existing Host/Prisma tenant partitioning is preserved, while public API token/query tenant scope is expressly deferred (`design.md:251-265`; AR-06). |

## Bounded Evidence and Validation

1. Consumed the Design Working Set and Read Order before any additional inspection (`design.md:41-82`).
2. Bounded deviations: inspected the direct dependencies of Working Set controllers—token, client, and identity guards—and the existing export Tenant A/B doorbell. They were necessary to test the stated external-auth and export open questions; no repository inventory was performed.
3. No Tasks, Apply, Design Refinement, implementation, or Git lifecycle action was performed.
4. `pnpm sdd:validate:design -- openspec/changes/secure-default-deny-tenant-auth-boundary/design.md` — PASS.
5. `pnpm sdd:validate` — PASS.

## Next Action

Under `docs/SDD-WORKFLOW.md:93-105,124-143`, this initial BLOCKED Architecture
Review permits exactly one next edge: **Design Refinement** owned by HIGH /
ARCHITECT. Tasks, Apply, and all Git lifecycle actions are illegal at this
checkpoint.

---

# Fresh Architecture Review: secure-default-deny-tenant-auth-boundary (after AR-01)

> **Normalized result:** PASS
> **Action:** Architecture Review
> **Role:** HIGH / ARCHITECT
> **Model binding:** `openai/gpt-5.6-terra` (`.opencode/sdd-model-map.json:8-12,29-32,51-55`)
> **Persistence:** hybrid; the preceding initial BLOCKED review is preserved as the consumed AR-01 evidence.

## Decision

PASS. The single Design Refinement closes AR-01 without changing the P0
boundary or redesigning authorization. The refined Design explicitly classifies
each external mechanism, retains immutable Host comparison ownership after the
global guard ordering, and limits API-token treatment to its existing admission
contract. Required RED, integration, and real-HTTP proofs remain mandatory
Tasks/Apply acceptance criteria, not claims of completed implementation.

## Findings

| ID | Classification | Finding | Evidence |
| --- | --- | --- | --- |
| AR-01 | PASS | External identity, client, and API-token-deferred classifications are explicit. `identity-session` bypasses global Better Auth/Tenant Scope only to `IdentityOrganizationGuard`; `client-session` only to `ClientAuthGuard`; `api-token-deferred` only to existing token/scope guards. There is no generic external bypass or anonymous fall-through. | Refined Design §§2–4, 14, 16, 18 (`design.md:10-16,149-159,281-303,315-322`); global-before-controller ordering is repository-proven by `app.module.ts:31-46`. |
| AR-02 | PASS | Immutable Host responsibility is owned and testable. Middleware establishes non-overwritable `hostTenantId`; identity already compares it to membership/active organization; the client contract requires payload-to-Host comparison before principal fields and prohibits overwriting Host-derived scope. | `tenant-resolve.middleware.ts:104-115`; `identity-organization.guard.ts:48-85`; refined Design §§5–6, 12, 14, 16 (`design.md:50-62,81-88,134-141,151-157,295-301`). |
| AR-03 | PASS | The export fixture does not require an unjustified legacy user. The current fixture contains provider identity/membership/session only, while the refined `identity-session` hand-off reaches the existing identity guard rather than `BetterAuthGuard`'s legacy-user lookup. Its planned 401/200/403 Tenant A/B proof directly closes the prior ordering contradiction. | `import-export-tenant-isolation.e2e-spec.ts:28-64,72-105`; `better-auth.guard.ts:67-75`; `export.controller.ts:43-46`; `identity-organization.guard.ts:56-74`; refined Design `:12-14,61,86,140,299`. |
| AR-04 | PASS | Default-deny remains global: unclassified tenant/admin routes require Better Auth; missing/invalid credentials are 401, and authenticated Host/permission mismatches remain 403. Permissions no longer derive `lector` from an absent principal. Existing role and permission semantics are retained. | Refined Design `:8,12-16,50-53,125-132,153-159,295-303`; current baseline confirms the exact gaps to be removed in `better-auth.guard.ts:42-65` and `permissions.guard.ts:21-61`. |
| AR-05 | PASS | The anonymous allow-list is explicit and limited to the repository-proven existing routes. Health remains annotated `@Public()`; client login/register/logout are annotated; the preserved initial review records the corroborating health, metrics, auth, client, and shared-document evidence. | `health.controller.ts:19-21`; `client-auth.controller.ts:25-26,50-51,64-65`; preserved review AR-05; refined Design `:158,301-303`. |
| AR-06 | CONDITION | Public API token admission is intentionally deferred, not accepted as Host/body/query/path tenant isolation. Existing guards overwrite `request.tenantId` and controllers consume query `tenantId`; the refined Design classifies only token admission, preserves its 401 contract, and neither expands the public API nor claims remediation. This non-blocking scope boundary is explicit. | `token-auth.guard.ts:26-35`; `v1-workflows.controller.ts:14-36`; `v1-documents.controller.ts:14-31`; refined Design `:14-16,57-58,71,87,131,157,301`. |
| AR-07 | PASS | Unsigned webhook/callback candidates remain repository-proven deferred and default-denied; no endpoint is added to the public list without a registered signature/state guard. | Preserved review AR-07; refined Design `:16,79,123,159,165-167,303,320`. |
| AR-08 | PASS | The required representative matrix is sufficient and bounded: ordinary tenant families deny anonymously before effects; client Tenant A/B and identity export Tenant A/B prove Host binding; public allow-list regression proves explicit-only anonymous access. API-token tests are deliberately admission-only. | Refined Design §§11–12 (`design.md:125-141`). |

## Architecture Topic Verdicts

| Topic | Classification | Evidence |
| --- | --- | --- |
| A. Scalability | PASS | Constant-cost metadata lookup; no data, query, or write growth (`design.md:171-186`). |
| B. Open/Closed Principle | PASS | A typed explicit classification has a named post-global authority and required HTTP proof; no prefix/generic bypass (`design.md:188-200,283-293`). |
| C. Ownership | PASS | Middleware owns immutable Host context; each identity/client mechanism owns its principal-to-Host comparison; token scope is expressly deferred (`design.md:202-219,149-159`). |
| D. Data Retention | PASS | Control-flow metadata only; no retained data or schema change (`design.md:221-234`). |
| E. Idempotency | PASS | Denials are designed to be side-effect free and doorbell tests require that proof (`design.md:236-248,129-131`). |
| F. Shared Contracts | PASS | One typed backend metadata contract represents each named external hand-off and Host-context invariant (`design.md:250-263,283-303`). |
| G. Partitioning Strategy | CONDITION | Host/Prisma partitioning is retained for the P0 tenant boundary; token/query scope remains an explicit out-of-scope condition (`design.md:265-279,301`). |

## Bounded Evidence and Validation

1. Consumed only the refined Design, preserved initial review, and their approved Working Set/Read Order before the fresh contradiction check.
2. Read only the named guard, controller, middleware, and export-fixture evidence required to verify AR-01 closure and the stated P0 contracts; no broad inventory or new Working Set deviation occurred.
3. No Tasks, Apply, implementation, additional Design Refinement, agent invocation, or Git lifecycle operation was performed.
4. `pnpm sdd:validate:design -- openspec/changes/secure-default-deny-tenant-auth-boundary/design.md` — PASS (18 ordered sections, A–G topics, decision/rationale separation, and Working Set structure).
5. `pnpm sdd:validate` — PASS (canonical workflow, local Direct wiring, role map, hybrid persistence, and maintainer gates).

## Next Action

Under `docs/SDD-WORKFLOW.md:93-105,124-143`, the fresh Architecture Review
PASS permits exactly the next edge: **Tasks**, owned by MID / BUILDER. The
AR-01 correction budget is consumed; any future material Architecture Review
contradiction is a stop/escalation condition, not another refinement.
