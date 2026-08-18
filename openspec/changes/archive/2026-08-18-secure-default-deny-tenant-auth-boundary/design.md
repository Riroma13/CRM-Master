# Design: secure-default-deny-tenant-auth-boundary — Secure Default-Deny Tenant Authentication Boundary

> **Status:** Draft
> **Working document.** This Design does not modify the SDD pipeline.

## 1. Executive Summary

Tenant-facing API routes currently resolve a Host tenant but may continue anonymously: `BetterAuthGuard` permits a missing or invalid credential on non-admin paths, and `PermissionsGuard` falls back to `lector`. This P0 remediation makes the global boundary deny by default, while preserving Host as tenant context—not authentication—and retaining existing tenant and permission checks. Only route families with an already evidenced public or route-specific authentication contract are exempted; all other unclassified routes fail closed. This is the single AR-01 refinement: it replaces the unsafe generic external hand-off with classified, owned post-global authentication contracts.

## 2. Technical Approach

Introduce route-auth classification metadata consumed by the existing global guards. The absence of metadata means Better Auth tenant/admin session authentication is required. `@Public()` remains the explicit, documented anonymous allow-list. Because global Nest guards run before controller guards, `identity-session`, `client-session`, and `api-token-deferred` explicitly bypass only the global Better Auth/Tenant Scope path and hand control to an existing route guard with a named authority responsibility; none means anonymous access.

`IdentityOrganizationGuard` already compares the identity session's active organization/membership to immutable `hostTenantId`; export is classified `identity-session` and its class-level `@Public()` is removed, so the export fixture need not gain a legacy user. `ClientAuthGuard` compares its signed payload tenant to `hostTenantId` before exposing a client principal and must not overwrite Host-derived `request.tenantId`. API-token routes are classified `api-token-deferred` solely to preserve their existing token guard admission; their guard and controllers currently overwrite/consume `request.tenantId`/query `tenantId`, so this Design makes no Host-isolation claim and does not change that contract.

The implementation does not alter Host resolution, Prisma scoping, public-API `tenantId` behavior, roles, or authorization design. It removes the incorrect anonymous path and default `lector` authorization only. Routes that are webhook/callback candidates without an evidenced registered guard remain default-denied and are recorded as deferred rather than made public.

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
| --- | --- | --- | --- |
| Default boundary | Controller-by-controller guards; global default deny | Global default deny | One unannotated tenant route must not become public as modules grow. |
| Exception model | Prefix allow-list; metadata classification | Explicit handler/class metadata | Prefixes cannot prove a route's authentication mechanism; metadata is auditable and local. |
| Anonymous access | Implicit `lector`; explicit `@Public()` only | Explicit `@Public()` only | A role is an authenticated principal, not an anonymous fallback. |
| External routes | Generic bypass; classified identity/client/token hand-off | Explicit `identity-session`, `client-session`, `api-token-deferred` | Global guards precede controller guards; each classification must name its post-global authority and Host responsibility. |
| Export identity | Require legacy user; identity-session classification | Identity-session hand-off | The proven export session has membership but no legacy user; existing identity guard is the correct owner. |
| Unclear webhooks/callbacks | Invent allow-list; default-deny and defer | Default-deny and defer | No signature/registration evidence authorizes opening an endpoint. |

## 4. Data Flow

```text
HTTP request -> TenantResolveMiddleware -> route auth metadata -> global guards
                    | immutable hostTenantId        | public/classified/default
                    v                              v
              hostTenantId            Better Auth principal / 401 -> scope -> permissions
                                                  | classified route
                                                  v
                              Identity guard / Client guard / Token guard -> handler
                               Host-org 403       Host-payload 403    deferred token scope
```

`@Public()` bypasses the global authentication/scope path only for the documented allow-list. Classified routes bypass that path only to reach their existing named guard. A missing/invalid Better Auth or client/token credential remains its guard's `UnauthorizedException` (401); identity/client Host mismatch and permission/membership denial remain their existing `ForbiddenException` (403). This change does not reinterpret API-token query-tenant status semantics.

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `apps/api/src/common/decorators/public.decorator.ts` | Modify | Define public, identity-session, client-session, and deferred API-token metadata. |
| 2 | `apps/api/src/common/guards/better-auth.guard.ts` | Modify | Default-deny Better Auth routes and bypass only explicit classifications. |
| 3 | `apps/api/src/common/guards/tenant-scope.guard.ts` | Modify | Preserve Host checks for Better Auth and hand classified routes only to their named guard. |
| 4 | `apps/api/src/common/guards/permissions.guard.ts` | Modify | Require a principal for permission metadata; remove anonymous `lector` fallback. |
| 5 | `apps/api/src/modules/client-auth/client-auth.guard.ts` | Modify | Compare signed payload tenant to immutable `hostTenantId`; never overwrite Host tenant context. |
| 6 | `apps/api/src/modules/client-auth/client-auth.controller.ts` | Modify | Classify only existing `me` as client-session. |
| 7 | `apps/api/src/modules/export/export.controller.ts` | Modify | Replace class `@Public()` with identity-session classification. |
| 8 | `apps/api/src/modules/public-api/v1/v1-workflows.controller.ts` | Modify | Classify API-token admission as deferred; do not alter query `tenantId`. |
| 9 | `apps/api/src/modules/public-api/v1/v1-documents.controller.ts` | Modify | Apply the same deferred API-token classification. |
| 10 | `apps/api/src/common/guards/tenant-auth-boundary.guard.spec.ts` | Create | RED/PASS global classification, default-deny, and status-order contracts. |
| 11 | `apps/api/src/modules/client-auth/client-auth.guard.spec.ts` | Modify | Prove same-Host admission and Host/payload mismatch 403 without `tenantId` overwrite. |
| 12 | `apps/api/test/doorbell/import-export-tenant-isolation.e2e-spec.ts` | Modify | Preserve its legacy-user-free identity fixture and prove export 401/200/403. |
| 13 | `apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts` | Create | Real HTTP default-deny, client Host A/B, and public allow-list evidence. |

### 5.2 Secondary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `apps/api/src/common/guards/tenant-scope.guard.spec.ts` | Modify | Cover classified hand-off while retaining Better Auth Host mismatch denial. |
| 2 | `apps/api/src/common/guards/permissions.guard.spec.ts` | Modify | Prove no missing-principal/`lector` authorization path remains. |
| 3 | `apps/api/src/modules/identity/__tests__/identity-authorization.spec.ts` | Inspect only | Confirm the existing identity guard retains Host/organization comparison responsibility. |
| 4 | `apps/api/src/modules/public-api/__tests__/token-auth.guard.spec.ts` | Inspect only | Preserve token-auth 401 behavior without expanding into tenantId remediation. |
| 5 | `apps/api/src/modules/health/health.controller.ts` | Inspect only | Confirm existing health endpoint remains in the explicit public allow-list. |

### 5.3 Expected NOT to Change

- `apps/api/src/common/middleware/tenant-resolve.middleware.ts` — Host resolution remains tenant context, not authentication.
- `apps/api/src/modules/public-api/auth/token-auth.guard.ts` — public API token `tenantId` remediation is explicitly out of scope.
- `apps/api/src/modules/identity/identity-organization.guard.ts` — existing identity membership/permission semantics are preserved.
- `apps/api/src/modules/communication/communication.controller.ts` and `apps/api/src/modules/observability/alerting/alert-webhook.controller.ts` — unsigned/unregistered candidates remain deferred and default-denied.

## 6. Read Order

1. `apps/api/src/app.module.ts` — global guards precede controller guards; this fixes AR-01's ordering premise.
2. `apps/api/src/common/decorators/public.decorator.ts`, `better-auth.guard.ts`, and `tenant-scope.guard.ts` — establish the only classification and hand-off boundary.
3. `apps/api/src/modules/client-auth/client-auth.guard.ts` and spec — bind client payload to immutable Host before controller access.
4. `apps/api/src/modules/identity/identity-organization.guard.ts`, export controller, and import/export doorbell — retain existing identity Host/organization authority without a legacy user.
5. Public-API controllers and token spec — classify deferred token admission only; do not read or modify query-tenant behavior beyond this confirmed boundary.
6. Permissions tests and new default-deny doorbell — write RED contracts, then production changes.

## 7. Expected Commands

```bash
pnpm --filter api test -- tenant-auth-boundary.guard.spec.ts tenant-scope.guard.spec.ts permissions.guard.spec.ts client-auth.guard.spec.ts
pnpm --filter api test:e2e -- tenant-auth-default-deny.doorbell.spec.ts import-export-tenant-isolation.e2e-spec.ts
pnpm --filter api lint
pnpm --filter api build
pnpm sdd:validate
pnpm sdd:validate:design -- openspec/changes/secure-default-deny-tenant-auth-boundary/design.md
```

## 8. Design Confidence

**Confidence:** Medium

AR-01 established the global ordering and the export fixture contradiction. This refinement assigns post-global authority explicitly: identity compares organization to immutable Host, client compares payload tenant to immutable Host, and API token remains intentionally deferred. Implementation proof remains mandatory RED/integration/real-HTTP evidence, but no unresolved design ambiguity remains.

## 9. Exploration Budget

| Resource | Budget | Notes |
| --- | --- | --- |
| Repo searches | 14 | Original budget plus the AR-01 identity export and client guard evidence. |
| Files to read | 28 | Working Set plus direct guards and existing export doorbell. |
| Files to create | 2 | One focused guard spec and one doorbell spec. |
| Files to modify | 13 | Primary source/tests only; inspect-only files do not count. |

## 10. Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| External token/client guard runs after global guards | Med | High | Explicit classification bypass plus identity/client-owned Host comparison; RED and real HTTP proof before claiming pass. |
| Existing `@Public()` is broader than intended | Med | High | Freeze the evidenced route list below; Architecture Review blocks any new candidate. |
| Export identity session is incompatible with global session lookup | Low | High | Identity-session classification bypasses legacy lookup; preserve the real fixture's 401/200/403 proof. |
| Webhook/callback availability changes | Med | Med | Fail closed; no endpoint is made public without a signed/registered contract. |

## 11. Testing Strategy

| Layer | Focus | Approach |
| --- | --- | --- |
| Unit | Metadata and global guard decisions | RED tests: default tenant route missing/invalid session is 401; public is admitted; each classification bypasses only its named global path. |
| Integration | Client and identity authority | Client payload/Host match admits and mismatch is 403 without changing Host tenant; identity export validates session membership against Host without legacy user. |
| Doorbell | Real HTTP Tenant A/B boundary | Disposable DB fixture, actual Host and sessions, no conditional skip; assert no effects before 401/403. API-token tests assert token admission only, not deferred query-tenant isolation. |
| Regression | Existing public routes | Assert only the documented allow-list remains anonymously reachable. |

## 12. Doorbell Tests

| Test file | What it proves |
| --- | --- |
| `apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts` | Anonymous requests to representative tenant families (`/api/v1/tenant/*`, workflow, plugins, documents, billing, communications) receive the guard-derived 401 before effects. |
| `apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts` | Client cookie with Tenant A payload and Tenant B Host receives 403 before handler effects; same Host is admitted only through `ClientAuthGuard`. |
| `apps/api/test/doorbell/import-export-tenant-isolation.e2e-spec.ts` | Existing legacy-user-free identity fixture remains 401 anonymous, 200 same Host, and 403 cross Host through `IdentityOrganizationGuard`. |
| `apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts` | Existing public allow-list remains reachable only where annotated; API-token missing-token behavior is tested without asserting deferred query-tenant isolation. |

## 13. Required ADRs

| ADR | Reason | Status |
| --- | --- | --- |
| None | No schema, retention, or new bounded context; this corrects the existing global authentication boundary. | Not required |

## 14. Boundaries

| Boundary | Owner | Purpose |
| --- | --- | --- |
| Host tenant context | `TenantResolveMiddleware` | Resolve immutable `hostTenantId`; no later guard may overwrite it. |
| Tenant/admin session default | `BetterAuthGuard` + `TenantScopeGuard` | Authenticate Better Auth principal, compare its tenant to Host, or deny before handler execution. |
| Identity session | `IdentityOrganizationGuard` | Compare provider session/membership organization to `hostTenantId`; export does not require a legacy user. |
| Client session | `ClientAuthGuard` | Compare signed payload tenant to `hostTenantId`, then expose client identity without replacing Host context. |
| Deferred API token | Existing `TokenAuthGuard` + scope guard | Require token, but make no Host/query-tenant isolation claim or remediation in this change. |
| Explicit public allow-list | `@Public()` metadata | Existing anonymous routes only: health, metrics, auth login/check-user/register, client login/register/logout, and shared-document token download. |
| Deferred webhook/callback candidates | Their controllers | Default deny pending a separately designed signed/stateful contract. |

## 15. Extensibility

| Future feature | How it fits | Effort |
| --- | --- | --- |
| Signed provider webhook | Add an explicit classification only alongside a registered signature guard, named Host responsibility, and HTTP proof. | Days |
| OAuth callback | Add explicit callback classification only after state/session verification is implemented. | Days |
| New public route | Add `@Public()` plus allow-list and anonymous HTTP regression evidence; never rely on path prefix. | Hours |

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× | 100× | Mitigation |
| --- | --- | --- | --- |
| Storage | None | None | No data is added. |
| Query latency | Fewer anonymous DB paths | Same | Deny before identity/handler work where possible. |
| Write throughput | None | None | No write path changes. |
| Memory | Metadata lookup only | Metadata lookup only | Reuse Nest Reflector. |

**Decision:** Use metadata-based global denial.

**Rationale:** It is constant-cost and prevents unauthenticated work.

**Alternative:** Per-controller guards.

**Future impact:** New routes are protected without registration work.

### B. Open/Closed Principle (OCP)

**Point of extension:** Explicit auth-classification decorator with a named post-global guard and Host comparison owner.

**What must change to add one more:** The route annotation, documented allow-list, and RED HTTP test.

**Decision:** Classify identity-session, client-session, and deferred API-token routes; never use a generic bypass.

**Rationale:** Authentication mechanisms are route contracts.

**Alternative:** Prefix lists in guards.

**Future impact:** Signed mechanisms can be added without weakening defaults.

### C. Ownership

| Data / Capability | Owner | Consumers |
| --- | --- | --- |
| Host tenant context | Tenant middleware | Global and route guards |
| Better Auth principal | BetterAuthGuard | Tenant scope, permissions, handlers |
| Identity principal and Host comparison | IdentityOrganizationGuard | Export controller |
| Client principal and Host comparison | ClientAuthGuard | Client controller |
| Deferred token principal | TokenAuthGuard | Public API controllers; Host/query scope is deferred |
| Route classification | Controller metadata | Global guards and named route guard |

**Decision:** Keep Host resolution immutable and assign each classified mechanism its own post-global comparison.

**Rationale:** A Host selects a tenant but proves no actor identity; global guards cannot compare principals that controller guards have not yet created.

**Alternative:** Treat Host as authentication.

**Future impact:** Tenant isolation remains independently enforceable.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
| --- | --- | --- | --- |
| Auth metadata | Source lifetime | Git history | Source removal |
| Existing audit denials | Existing policy | Existing policy | Existing policy |

**Decision:** No new retained data.

**Rationale:** The change is control flow only.

**Alternative:** Persist an auth-classification registry.

**Future impact:** No retention migration.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
| --- | --- | --- | --- |
| Repeated denied request | No state change | Guard stops before handler | Repeated 401/403 |

**Decision:** Denial is side-effect free.

**Rationale:** Doorbell tests must prove it.

**Alternative:** Audit-only admission.

**Future impact:** Safe retries remain safe.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
| --- | --- | --- | --- |
| Route auth metadata | `common/decorators/public.decorator.ts` | Global guards/controllers | Decorators |
| Immutable Host tenant | request `hostTenantId` | Identity/client guards | Tenant middleware |

**Decision:** Use one typed backend classification contract whose values encode the responsible existing guard.

**Rationale:** It prevents an unowned generic bypass without frontend/backend payload changes.

**Alternative:** Duplicate controller lists in guards.

**Future impact:** One auditable exception mechanism.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
| --- | --- | --- |
| Tenant | Existing isolation risk | Preserve Host and Prisma scope. |
| Time | None | No persisted data. |
| Volume | None | No partitioning change. |

**Decision:** No partitioning change.

**Rationale:** This is an authorization boundary correction.

**Alternative:** N/A.

**Future impact:** Existing tenant partitioning remains intact.

## 16. Interfaces / Contracts

```typescript
export const IS_PUBLIC_KEY = 'isPublic';
export const AUTH_BOUNDARY_KEY = 'authBoundary';
export type AuthBoundaryKind =
  | 'identity-session'
  | 'client-session'
  | 'api-token-deferred';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const ExternalAuth = (kind: AuthBoundaryKind) =>
  SetMetadata(AUTH_BOUNDARY_KEY, kind);
```

| Route class | Authentication contract | Expected failure |
| --- | --- | --- |
| Tenant/default | Valid Better Auth session bound to Host tenant | 401 missing/invalid session; 403 Host/permission mismatch |
| Public | Existing `@Public()` annotation only | Route-specific validation errors only |
| Identity session | `IdentityOrganizationGuard` compares membership organization to immutable `hostTenantId`; no legacy user required | 401 missing session; 403 membership/Host mismatch |
| Client session | `ClientAuthGuard` compares signed payload tenant to immutable `hostTenantId` before setting client fields | 401 missing/invalid cookie; 403 role or Host/payload mismatch |
| API token deferred | Existing token/scope guards authenticate the token after explicit hand-off | Preserve token 401; Host/query `tenantId` scope is not asserted or changed |
| Admin | Existing Better Auth superadmin semantics | Existing 401/403 semantics |
| Deferred webhook/callback | No approved contract | Default 401 |

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
| --- | --- | --- | --- |
| 1 | Add RED tests and classification metadata. | Test exposes unguarded dependency. | Remove metadata-only change. |
| 2 | Enforce global default-deny and apply classified identity/client/deferred-token hand-offs. | A named route guard fails to preserve its contract. | Restore only the affected classification after incident assessment; never make it public ad hoc. |
| 3 | Run focused HTTP doorbell, API test/lint/build, and validators. | Fixture/environment failure. | Record baseline/environment evidence; do not waive security assertions. |

No schema migration, feature flag, or frontend deployment is required.

## 18. Open Questions

| # | Question | Status | Resolution |
| --- | --- | --- | --- |
| 1 | How is AR-01 resolved? | Resolved | Identity compares membership organization to immutable Host; client compares payload tenant to immutable Host and preserves Host context; API token is explicitly admission-only/deferred. RED, integration, and real HTTP proof are Apply acceptance criteria, not pre-Apply evidence. |
| 2 | Which incoming webhook/callback routes have a registered signature/state guard in live module wiring? | Resolved | None evidenced in the bounded inspection; they remain deferred/default-denied and are not opened by this change. |
| 3 | Does export preserve its legacy-user-free identity session contract? | Resolved | Use `identity-session` classification and retain the existing real HTTP 401/200/403 fixture; no legacy user is added. |
| 4 | AR-01 refinement record | Resolved | Bounded deviation from the original Working Set: added `ClientAuthGuard`, its existing spec, and existing import/export doorbell because AR-01 directly proved their required comparison/fixture contracts. `architecture-review.md` remains immutable evidence of the initial block. |

---

> **End of document.**
