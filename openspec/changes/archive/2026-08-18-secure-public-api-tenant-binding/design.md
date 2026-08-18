# Design: secure-public-api-tenant-binding — Secure Public API Tenant Binding

> **Status:** Draft — Phase 3 Design Refinement (the sole correction after blocked AR-001)
> **Provenance:** Created on `sec/secure-public-api-tenant-binding` from repository evidence in the public-v1 controllers, token guard/service, tenant middleware, and existing tests. Historical evidence is preserved: `public-api-cross-tenant-isolation.spec.ts:108-120` currently accepts Tenant A token + Tenant B query authority with HTTP 200.
> **Refinement note:** AR-001 is reconciled without redesigning authority, guard order, or resource policy. The public document GET controller must translate the document service's established scoped `null` result into the repository's established resource `NotFoundException`/404 path before `toV1()` dereferences it. `architecture-review.md` remains the preserved blocked Phase 2 evidence and provenance.

## 1. Executive Summary

Public v1 controllers currently pass caller query `tenantId` to tenant-scoped services even though `TokenAuthGuard` has resolved the API key's tenant. This permits caller-selected cross-tenant authority. The change makes the authenticated `ApiKey.tenantId` the sole public-API authority, propagates it into trusted request context, rejects conflicting caller/Host context before handlers, and removes controller consumption of caller `tenantId`. It also restores the actual public document resource-miss contract: a scoped service `null` becomes `NotFoundException`/404 before mapping, matching the established workflow resource path without changing a status merely to satisfy a test.

## 2. Technical Approach

Keep API-key lookup, expiry, active/revocation checks, scopes, quotas, and public-route admission where they are. Extend `TokenAuthGuard` immediately after `validateToken()` to bind immutable API-token authority, compare a resolved `hostTenantId` when present, reject verified tenant-selector fields that conflict, then populate `request.tenantId` from the token.

Both verified public-v1 route families (`workflows`, `documents`) will read trusted request authority, never query authority. Resource lookup remains tenant-scoped: an A token requesting a B resource ID is looked up as A. Workflows already throw `NotFoundException`; documents return `null`, so only `V1DocumentsController.get()` converts that scoped absence to `NotFoundException` before the strict mapper runs. A neutral/reserved Host has no `hostTenantId`; the token remains sufficient. A tenant Host participates as scope context and must agree with the token.

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
| --- | --- | --- | --- |
| Tenant authority | Query/body/path; Host; persisted API key | Persisted `ApiKey.tenantId` | `TokenService.validateToken()` returns the record tenant; caller fields are untrusted. |
| Host rule | Ignore; Host overrides; require agreement | Require agreement only when `hostTenantId` exists | Middleware preserves Host context; neutral/reserved Hosts have none. Neither can create alternate token authority. |
| Conflict handling | Ignore; substitute; deny | 403 before controller/service | Fail closed without exposing or mutating another tenant. |
| Document resource miss | Leave null to mapper; mapper fallback; controller translation | Controller translates scoped null to `NotFoundException`/404 | `getDocument()` scopes `{ documentId, tenantId, isDeleted: false }` but returns null; `toV1()` dereferences. This restores the established workflow-style resource boundary, preserves no-disclosure, and does not invent a test-driven status. |
| Token lifecycle | Redesign management; validate current record | Retain lookup/revocation boundaries | Creation/revocation administration is separate; only validation plumbing is in scope. |

## 4. Data Flow

```text
Client + Bearer key + optional Host/tenantId
  -> TenantResolveMiddleware (optional immutable hostTenantId)
  -> TokenAuthGuard (validate persisted ApiKey)
  -> compare Host and supplied tenant selectors
  -> trusted request.tenantId = ApiKey.tenantId
  -> Scope/RateLimit guards -> v1 controller -> tenant-scoped service
  -> document null? NotFoundException (404) : strict `toV1()` mapping
```

Missing, malformed, expired, inactive, or revoked credentials stop at the token guard with 401. A conflicting Host or supplied `tenantId` in verified query/body/path input stops with 403 before service invocation. A valid A request for absent or B document ID reaches only A-scoped lookup, receives null, and stops with 404 before mapping; it cannot disclose or mutate B. A neutral `api`/reserved Host has no host tenant and cannot select authority.

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `apps/api/src/modules/public-api/auth/token-auth.guard.ts` | Modify | Bind token tenant, preserve trusted context, and fail closed on conflicts. |
| 2 | `apps/api/src/modules/public-api/v1/v1-workflows.controller.ts` | Modify | Remove query authority; pass trusted tenant to both routes. |
| 3 | `apps/api/src/modules/public-api/v1/v1-documents.controller.ts` | Modify | Remove query authority; pass trusted tenant to both routes. |
| 4 | `apps/api/src/modules/public-api/__tests__/token-auth.guard.spec.ts` | Modify | Prove token, Host, supplied-field, and overwrite invariants. |
| 5 | `apps/api/src/modules/public-api/__tests__/public-api-cross-tenant-isolation.spec.ts` | Modify | Invert the historical 200 cross-tenant regression into denial evidence. |
| 6 | `apps/api/src/modules/public-api/__tests__/v1-workflows.controller.spec.ts` | Modify | Assert trusted authority reaches workflow services. |
| 7 | `apps/api/src/modules/public-api/__tests__/v1-documents.controller.spec.ts` | Modify | Assert trusted authority reaches document services. |
| 8 | `apps/api/src/modules/public-api/__tests__/public-api-full-flow.spec.ts` | Modify | Preserve valid-token, revocation, quota, and rate-limit contracts without caller authority. |
| 9 | `apps/api/src/modules/public-api/__tests__/public-api-scope-enforcement.spec.ts` | Modify | Preserve 403 scope semantics while removing tenant selection. |
| 10 | `apps/api/test/doorbell/public-api-tenant-binding.doorbell.spec.ts` | Create | Real HTTP Tenant A/B token, Host, resource, and no-disclosure matrix. |

### 5.2 Secondary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `apps/api/src/modules/public-api/auth/token.service.ts` | Modify only if needed | Minimal validation payload/cache plumbing only; no token-management redesign. |
| 2 | `apps/api/src/common/middleware/tenant-resolve.middleware.spec.ts` | Modify only if needed | Preserve proven Host/neutral-host context semantics. |
| 3 | `apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts` | Modify only if needed | Keep existing deferred-token 401 coverage compatible with the new doorbell. |

### 5.3 Expected NOT to Change

- `apps/api/src/app.module.ts` — global default-deny guard order is a recently merged boundary, not this change's target.
- `apps/api/src/common/guards/better-auth.guard.ts` and `tenant-scope.guard.ts` — `@ExternalAuth('api-token-deferred')` hand-off remains intact.
- `packages/database/prisma/schema.prisma` — `ApiKey.tenantId`, active, expiry, and unique hash already support binding; no migration is proven.
- `apps/api/src/modules/document-engine/document.service.ts` — its scoped `null` return is an established service contract; the public controller owns HTTP translation.
- `apps/api/src/modules/public-api/v1/mappers/document-response.mapper.ts` — it remains strict and must not accept null or manufacture a response.
- Token creation/revocation controller policy — admin management needs a separate scoped/HUMAN decision if changes are required.

## 6. Read Order

1. `token-auth.guard.ts` — current authority write point.
2. `token.service.ts` and `schema.prisma` `ApiKey` — persisted authority and invalid/revoked rules.
3. `tenant-resolve.middleware.ts` and `tenant-scope.guard.ts` — Host context and default-deny boundary.
4. Both `v1` controllers, `workflow.service.ts`, `document.service.ts`, and `document-response.mapper.ts` — prove both route families and the exact document null-to-mapper contradiction.
5. Cross-tenant, guard, controller, full-flow, scope, default-deny, and doorbell tests — preserve contracts; add RED evidence for document 404 before mapping.

## 7. Expected Commands

```bash
pnpm --filter api test -- public-api-cross-tenant-isolation token-auth.guard v1-workflows.controller v1-documents.controller public-api-full-flow public-api-scope-enforcement
pnpm --filter api test -- public-api-tenant-binding.doorbell
pnpm --filter api test -- tenant-auth-default-deny.doorbell
pnpm --filter api lint
pnpm --filter api build
```

No migration or generation command is planned.

## 8. Design Confidence

**Confidence:** High

Both route families, API-key guard/service, Host middleware, scoped services, mapper, and accepting cross-tenant test were inspected. AR-001's direct contradiction is resolved by the narrowly evidenced controller translation; token-service plumbing remains conditional and bounded to a demonstrated validation need.

## 9. Exploration Budget

| Resource | Budget | Notes |
| --- | --- | --- |
| Repo searches | 9 | Only public-v1 authority, Host, resource-miss, and test references. |
| Files to read | 24 | Working Set plus direct dependencies and the document mapper contradiction. |
| Files to create | 2 | Canonical design and one focused doorbell. |
| Files to modify | 12 | At most 10 primary plus 2 evidenced secondary files; document service/mapper remain excluded. |

## 10. Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Host behavior differs at neutral ingress | Med | High | Test neutral and tenant Hosts through real HTTP; stop if runtime contradicts middleware evidence. |
| Legacy tenant alias is discovered | Low | High | Do not guess or broaden; record exact field and escalate for HUMAN scope decision. |
| Existing tests encode caller selection | High | Med | Update all verified public-v1 suites and preserve inversion history. |
| Token cache hides revocation | Low | High | Retain/verify `revokeToken()` cache clear and 401 after revocation. |
| Document null reaches mapper | High | High | Controller throws `NotFoundException` after A-scoped null and before `toV1()`; unit/integration and A/B doorbell prove 404/no disclosure. |

## 11. Testing Strategy

| Layer | Focus | Approach |
| --- | --- | --- |
| Unit | Guard authority/invariants | Missing, malformed, invalid, revoked 401; selector/Host conflict or overwrite 403; persisted token context wins. |
| Controller | Both route families and document miss | Trusted A tenant reaches services; documents convert A-scoped null to 404 before `toV1()`; mapper is never called with null. |
| Integration | Guard/controller boundaries | Same-tenant list/get 200; B query/body/path selector 403 before service; A token plus B resource ID is A-scoped 404. |
| Regression | Historical cross-tenant success | Replace Tenant A + B query HTTP 200 with 403 and no service call; retain 401/403 scope/revocation behavior. |
| Doorbell | Real HTTP A/B boundary | Seed A/B keys and workflow/document resources; validate neutral/tenant Hosts, 401/403/404, no B disclosure, and no mutation. |

## 12. Doorbell Tests

| Test file | What it proves |
| --- | --- |
| `apps/api/test/doorbell/public-api-tenant-binding.doorbell.spec.ts` | Real HTTP A/B: same-tenant workflow/document success; missing/malformed/revoked token 401; selector/tenant-Host conflict 403 before service; A key + B workflow/document ID is A-scoped 404 with no B disclosure or mutation; neutral Host cannot redirect authority. |
| `apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts` | Existing missing-token 401 and default-deny contract remains unchanged. |

## 13. Required ADRs

| ADR | Reason | Status |
| --- | --- | --- |
| None | Existing persisted key ownership and Host middleware support this bounded security correction; no schema or platform decision is introduced. | Not required |

## 14. Boundaries

| Boundary | Owner | Purpose |
| --- | --- | --- |
| API-token authority | `TokenAuthGuard` / `TokenService` | Authenticate key and derive the only public API tenant authority. |
| Host context | `TenantResolveMiddleware` | Resolve immutable optional tenant scope; never authenticate/select API-key authority. |
| Public route semantics | v1 controllers | Consume trusted request authority and scope-check before services. |
| Workflow resource miss | `WorkflowService` | Throw established scoped `NotFoundException`/404 after A-scoped lookup. |
| Document resource miss | `V1DocumentsController` | Translate the document service's A-scoped `null` to `NotFoundException` before strict mapping; service and mapper do not change. |
| Token management | Existing internal controller/service | Out of scope except validation/revocation evidence; admin-policy changes require separate scope. |

## 15. Extensibility

| Future feature | How it fits | Effort |
| --- | --- | --- |
| New public-v1 route family | Reuse token-bound request authority and add its family to the A/B matrix. | Small |
| Explicit tenant data field | Define it in that route DTO; it cannot become authority and conflicts are validated at the guard boundary. | Small |

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× | 100× | Mitigation |
| --- | --- | --- | --- |
| Storage | None | None | No new persistence. |
| Query latency | Same key lookup | Cache remains bounded | Retain current hash cache/DB index. |
| Write throughput | `lastUsedAt` unchanged | Same | Do not add writes. |
| Memory | Same cache shape | Same | Retain TTL/cache clear. |

**Decision:** Bind authority in the existing guard.

**Rationale:** It adds comparisons, not new storage or query families.

**Alternative:** Per-controller resolution duplicates lookup and can drift.

**Future impact:** New routes inherit one boundary.

### B. Open/Closed Principle (OCP)

**Point of extension:** New public-v1 controllers use the existing token guard and trusted request contract.

**What must change to add one more:** Controller route plus scoped service and its matrix row.

**Decision:** Centralize authority validation in the guard.

**Rationale:** Route families do not reimplement hostile-input checks.

**Alternative:** Controller-specific checks.

**Future impact:** New APIs remain explicit but consistent.

### C. Ownership

| Data / Capability | Owner | Consumers |
| --- | --- | --- |
| API-key tenant | `ApiKey` / TokenService | Token guard |
| Host tenant context | Tenant middleware | Token guard, tenant guards |
| Request authority | Token guard | Public-v1 controllers/services |

**Decision:** Credential authority wins; Host is corroborating scope only.

**Rationale:** The API key is the authenticated, server-side record.

**Alternative:** Caller or Host authority.

**Future impact:** No alternate selection channel.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
| --- | --- | --- | --- |
| Existing ApiKey / lastUsedAt | Existing policy | Existing | Existing revocation policy |
| Test fixtures | Test run | None | Doorbell cleanup |

**Decision:** No new retained data.

**Rationale:** Binding reuses `ApiKey.tenantId`.

**Alternative:** Audit table in this change.

**Future impact:** Audit-policy work remains separate.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
| --- | --- | --- | --- |
| Read request | No mutation | Guard before service; document controller checks null before mapping | 401/403/404 as applicable |
| Revocation validation | Cache stale risk | Existing cache clear | 401 after revoke |

**Decision:** Do not add retry/mutation behavior.

**Rationale:** Verified v1 routes are reads; denial precedes services.

**Alternative:** Persist denial events.

**Future impact:** Mutating routes must retain pre-handler binding.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
| --- | --- | --- | --- |
| `ApiKeyPayload.tenantId` | `packages/shared/src/public-api/public-api.types.ts` | Token service/guard | Token service |
| Trusted request tenant | API-local request context | v1 controllers | Token guard |

**Decision:** Reuse payload type; keep Express request augmentation local unless compilation proves a shared type is needed.

**Rationale:** No frontend or public DTO should expose tenant authority selection.

**Alternative:** Add caller tenantId to shared API DTO.

**Future impact:** New route families consume the same server-derived context.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
| --- | --- | --- |
| Tenant | Cross-tenant access | Persisted token tenant, pre-handler conflict denial, scoped lookup, and document null-to-404 translation |
| Time | None | No new data |
| Volume | Cache growth | Existing TTL cache |

**Decision:** No partitioning change.

**Rationale:** The correction narrows authority, not data layout.

**Alternative:** Tenant-partitioned token storage.

**Future impact:** Existing `ApiKey` tenant index remains adequate.

## 16. Interfaces / Contracts

```typescript
type PublicApiTrustedRequest = Request & {
  tenantId?: string;          // set from validated ApiKey only after token auth
  apiTokenTenantId?: string;  // immutable provenance marker
  hostTenantId?: string;      // middleware-derived optional scope
  apiKeyId?: string;
  apiKeyScopes?: string[];
};

// Guard contract after validateToken(payload):
// 1. payload.tenantId is canonical request tenant authority.
// 2. hostTenantId, if present, must equal payload.tenantId (403 otherwise).
// 3. Explicit tenantId in verified query/body/path input must equal payload.tenantId (403 otherwise).
// 4. Controllers pass trusted request.tenantId only; no caller field selects authority.
// 5. V1DocumentsController translates an A-scoped `null` to NotFoundException
//    before `toV1()`; the mapper never receives null.
```

| Request condition | Status | Contract |
| --- | --- | --- |
| Missing/malformed/invalid/expired/revoked token | 401 | Existing `TokenAuthGuard` authentication semantics. |
| Valid token, insufficient scope | 403 | Existing `ScopeGuard` semantics. |
| Token vs Host/supplied tenant conflict | 403 | Fail closed before handler/service. |
| Cross-tenant workflow ID with valid A token | 404 | Existing A-scoped service throws `NotFoundException`; no B disclosure. |
| Cross-tenant/absent document ID with valid A token | 404 | A-scoped document lookup returns null; public controller throws `NotFoundException` before mapper; no B disclosure. |
| Malformed/conflicting raw Host | 400 | Existing middleware contract; unchanged. |

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
| --- | --- | --- | --- |
| 1 | Deploy guard/controllers correction with focused tests. | Clients relying on selector conflict receive 403; document misses become supported 404 rather than mapper failure. | Revert only this bounded change; do not re-enable caller authority as compatibility. |
| 2 | Monitor existing auth denial/error telemetry without token values. | Host ingress contradiction. | Stop and investigate ingress configuration; preserve fail-closed behavior. |

No schema migration, flag, runtime, secret, Docker, or dependency change is planned.

## 18. Open Questions

| # | Question | Status | Resolution |
| --- | --- | --- | --- |
| 1 | Does a public-v1 route have a verified legacy tenant-authority alias other than `tenantId`? | Resolved | Evidence found only controller query `tenantId`; discovery of another alias is a stop/escalation, not inferred scope. |
| 2 | Does token creation/revocation authorization need redesign? | Resolved — separate | Current change validates current records and revocation only; management-policy changes require a separate HUMAN-scoped change. |
| 3 | Can neutral `api` Host select tenant authority? | Resolved | Middleware marks reserved/no-slug hosts without `hostTenantId`; token authority remains sufficient and Host cannot redirect it. |
| 4 | Is document service/controller/mapper/test work in scope for AR-001? | Resolved | Yes: controller and its tests/doorbell are strictly necessary to restore the established HTTP resource-miss contract. No: document service and mapper changes are unnecessary and excluded because service already scopes the lookup and mapper should remain non-null. |

> **Design refinement pre-gate:** PASS on 2026-08-18 — `pnpm sdd:validate:design -- openspec/changes/secure-public-api-tenant-binding/design.md`, `pnpm sdd:validate`, and `git diff --check` passed. A fresh Phase 2 Architecture Review is mandatory after the one allowed refinement.
