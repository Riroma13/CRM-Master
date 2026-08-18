# Architecture Review: Secure Public API Tenant Binding

> **Phase:** 2 — Architecture Review
> **Role:** HIGH / ARCHITECT (`openai/gpt-5.6-terra`)
> **Normalized result:** **BLOCKED**
> **Design reviewed:** `design.md` (Phase 1 Draft)
> **Provenance:** Design Working Set and Read Order were consumed before bounded repository reads. The only additional reads address direct contract checks: public-module/global guard wiring, route-family inventory, selector inventory, and the document not-found path.

## Decision

The design correctly centralizes public API tenant authority in the validated persisted `ApiKey.tenantId`, preserves default-deny admission, and covers both current public-v1 route families. It is blocked by one material, repository-proven resource-status contradiction: the Design promises scoped-document 404 behavior that the current document service/controller path does not provide.

## Findings

| ID | Classification | Finding | Evidence | Required disposition |
| --- | --- | --- | --- | --- |
| AR-001 | **BLOCKED** | Section 3/14/16 states that a Tenant A request for a Tenant B document ID retains an existing scoped `404`. `DocumentService.getDocument()` returns `null` on an absent or foreign document; `V1DocumentsController.get()` passes that value to `toV1()`, which dereferences `document.id`. The asserted existing 404 contract is therefore unproven and contradicted by the executable path. | `document.service.ts:62-67`; `v1-documents.controller.ts:26-33`; `document-response.mapper.ts:20-27`. In contrast, workflows throw `NotFoundException` after a `{ id, tenantId }` scoped lookup at `workflow.service.ts:172-183`. | One conditional **Design Refinement** must reconcile the document resource contract with actual behavior, preserve the established 401/403/404 guard/resource semantics without test-driven status changes, and add any strictly necessary file to the Working Set and test/doorbell matrix. |
| AR-002 | **PASS** | Token record/service/guard is the sole proposed public API authority. The persisted key carries `tenantId`; validation rejects missing, inactive, expired, and unknown records; revocation clears the cache. The guard is the single proposed write point for trusted request authority. | `schema.prisma:1577-1590`; `token.service.ts:40-85`; `token-auth.guard.ts:12-35`. |
| AR-003 | **PASS** | Host-derived context cannot create alternate authority under the Design. Middleware writes immutable `hostTenantId`; reserved/neutral `api` Host has no host tenant. Public controllers use `@ExternalAuth('api-token-deferred')`, so global default-deny guards defer to the token boundary. Tenant Host agreement is explicitly required before controller/service execution. | `tenant-resolve.middleware.ts:39-53,104-115`; `tenant-resolve.middleware.spec.ts:105-140,195-211`; `app.module.ts:32-57`; `better-auth.guard.ts:26-38`; both v1 controllers:10-13. |
| AR-004 | **PASS** | The complete current public-v1 route inventory is two families: workflows and documents. All four handlers consume query `tenantId`; no body, path, or legacy tenant selector appears under `public-api/v1/`. The Design removes controller authority consumption and requires conflict rejection before handlers. | `public-api.module.ts:22-36`; v1 route inventory; selector search results in both controllers at workflows:19,35 and documents:19,30. |
| AR-005 | **PASS** | Missing/malformed/invalid/revoked token denial remains 401; scope remains 403; tenant selector/Host conflicts are specified as pre-handler 403. Token-management redesign is excluded while validation/revocation evidence remains in scope. | `token-auth.guard.ts:12-29`; `scope.guard.ts:34-43`; `token-auth.guard.spec.ts:63-99`; `public-api-full-flow.spec.ts:153-183`; Design sections 3, 11, 14, and 16. |
| AR-006 | **PASS** | Default-deny is preserved: global guards remain expected-not-to-change, and API-token routes retain the explicit deferred hand-off rather than becoming public. The existing doorbell asserts missing-token 401 for both public-v1 families. | `design.md:64-69`; `app.module.ts:31-46`; `tenant-auth-default-deny.doorbell.spec.ts:152-158`. |
| AR-007 | **PASS** | No schema or migration is required by the proven authority correction. `ApiKey.tenantId`, uniqueness, active state, expiry, and tenant index already exist; the Design excludes schema, migration, generation, and token-management policy changes. | `schema.prisma:1577-1590`; `design.md:68-69,79-88,289-296`. |

## Architecture Topics A–G

| Topic | Result | Review conclusion |
| --- | --- | --- |
| A. Scalability | **PASS** | Guard comparisons reuse existing key lookup/cache; no storage or write path is introduced. |
| B. Open/Closed | **PASS** | A single guard boundary is the extension point for new public-v1 route families. |
| C. Ownership | **PASS** | Persisted API key owns authenticated authority; Host is corroborating context only. |
| D. Data Retention | **PASS** | No retained data is added. |
| E. Idempotency | **PASS** | Current verified routes are reads; denial precedes service invocation. |
| F. Shared Contracts | **PASS** | `ApiKeyPayload.tenantId` remains server-derived; caller DTOs do not gain authority fields. |
| G. Partitioning | **PASS** | This narrows authority and retains existing tenant-scoped data layout. |

## Contract and Tenant-Isolation Review

- **Authority:** `TokenService.validateToken()` returns the persisted API-key tenant, and `TokenAuthGuard` is the specified trusted request-authority boundary.
- **Host:** A resolved tenant Host must agree with the key; neutral/reserved Host supplies no tenant authority and cannot redirect the key. Malformed/conflicting Host behavior remains middleware-owned 400.
- **Selectors:** Current public-v1 selectors are only query `tenantId`. The Design requires any verified query/body/path selector to be data-only or rejected before controller/service execution; discovery of an additional legacy selector remains a stop condition.
- **Status semantics:** Token denial remains 401, scope denial remains 403, and workflow foreign-resource lookup remains scoped 404. AR-001 blocks approval of the equivalent document claim.
- **Coverage:** Both public-v1 route families are named in the Working Set, controller tests, inverted historical cross-tenant regression, and real HTTP A/B doorbell.

## Working Set and Open Questions

The Working Set is otherwise bounded: two controllers, the guard, targeted tests, one doorbell, and only conditional token-service/middleware/default-deny test changes. It neither broadens default-deny nor plans a migration. AR-001 means its assertion that no service file is needed is not yet reliable.

Design open questions 1–3 are resolved by bounded evidence. AR-001 is a newly confirmed blocking question: **what is the established document resource-miss contract, and where must it be preserved so a cross-tenant ID never discloses or mutates data without inventing a status solely for a test?**

## Validator Evidence

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm sdd:validate:design -- openspec/changes/secure-public-api-tenant-binding/design.md` | **PASS** | Canonical 18 sections, A–G topics, decision/rationale structure, and Working Set numbering validated. |
| `pnpm sdd:validate` | **PASS** | Canonical workflow, Direct wiring, local role map, hybrid persistence, and maintainer gates validated. |

## Canonical Next Action

**Phase 3 — Design Refinement (conditional, once).** It is the only legal next action after this BLOCKED Architecture Review. Do not begin it in this invocation; preserve AR-001 and return for a fresh Architecture Review after refinement.

---

## Fresh Architecture Review — after the sole Design Refinement

> **Phase:** 2 — Architecture Review (fresh retry)
> **Role:** HIGH / ARCHITECT (`openai/gpt-5.6-terra`)
> **Normalized result:** **PASS**
> **Design reviewed:** `design.md` (Phase 3 refined Draft)
> **Provenance:** The refined Design and the preserved initial BLOCKED review above were read first. The refined Working Set and Read Order were then consumed before the bounded reads of the guard/service/schema, Host/default-deny boundary, both public-v1 controllers and resource paths, and named regression/doorbell tests. Additional bounded checks covered the public-v1 route/selector inventory and the document resource call sites.

### Decision

**AR-001 is closed.** `DocumentService.getDocument()` already performs the tenant-scoped lookup with `{ documentId, tenantId, isDeleted: false }` and returns `null` for an absent or foreign resource. The strict `toV1()` mapper dereferences its input, so `V1DocumentsController.get()` is the smallest owning HTTP boundary that can turn that scoped absence into `NotFoundException`/404 before mapping. This is not a status invented for a test: it prevents the otherwise erroneous null-mapper path and aligns the public resource boundary with the established workflow scoped-resource `NotFoundException`/404 behavior. Changing the service or making the mapper null-tolerant would broaden responsibility without improving the tenant lookup.

### Findings

| ID | Classification | Finding | Evidence | Disposition |
| --- | --- | --- | --- | --- |
| AR-001 (historical BLOCKED) | **PASS** | The refined controller translation is the smallest bounded correction. A valid Tenant A key requesting an absent or Tenant B document ID remains an A-scoped lookup, receives `null`, throws 404 before `toV1()`, and discloses no B resource. | `document.service.ts:62-67`; `v1-documents.controller.ts:26-34`; `document-response.mapper.ts:20-27`; analogous scoped workflow 404 at `workflow.service.ts:172-183`; refined Design §§2–5, 11–12, 14, 16. | Closed by the sole allowed Design Refinement; controller/tests/doorbell are in scope, document service and mapper remain excluded. |
| AR-008 | **PASS** | Persisted `ApiKey.tenantId` is the sole public-API authority. Token validation derives it server-side only after finding an active, unexpired record; the guard is the authority write point. | `schema.prisma:1577-1590`; `token.service.ts:40-74`; `token-auth.guard.ts:26-35`; refined Design §§2–4, 14, 16. | Guard binds trusted request context and controllers consume it rather than caller input. |
| AR-009 | **PASS** | Caller query/body/path/legacy selectors cannot override credential authority under the refined contract. Current public-v1 has only query `tenantId`, on all four handlers; no body/path/legacy tenant selector was found. Conflicting verified selector input is planned as pre-handler 403, while an unknown future alias is explicitly a stop/escalation. | Bounded `public-api/v1` selector/route inventory; `v1-workflows.controller.ts:16-39`; `v1-documents.controller.ts:16-34`; refined Design §§2, 10–12, 16, 18. | Complete and bounded; historical accepting query test is explicitly inverted. |
| AR-010 | **PASS** | Host is corroborating scope, never token authority. A resolved tenant Host must agree with the key; neutral/reserved Hosts create no `hostTenantId` and cannot select authority. Malformed or proxy-conflicting Host remains middleware-owned 400. | `tenant-resolve.middleware.ts:27-53,93-115`; `tenant-resolve.middleware.spec.ts:105-140,166-211`; refined Design §§2–4, 11–12, 16, 18. | Guard conflict check is pre-handler; real HTTP Host cases are in the A/B doorbell. |
| AR-011 | **PASS** | Authentication and authorization status contracts remain differentiated: missing/malformed/invalid/expired/revoked tokens are 401; insufficient scope and selector/Host conflicts are 403; foreign or absent workflow/document resources under valid A authority are A-scoped 404. | `token-auth.guard.ts:12-29`; `token-auth.guard.spec.ts:63-99`; `scope.guard.ts:34-43`; `public-api-full-flow.spec.ts:153-183`; refined Design §16. | No status is weakened or repurposed. |
| AR-012 | **PASS** | All current public-v1 route families are covered: workflows and documents, each with list/get handlers. The Working Set names guard/controller suites, full-flow/scope regression suites, inverted historical cross-tenant evidence, and a real HTTP A/B doorbell covering same-tenant success, denial, no disclosure, and no mutation. | `public-api.module.ts:22-36`; bounded v1 route inventory; `public-api-cross-tenant-isolation.spec.ts:86-120`; refined Design §§5–6, 11–12. | Coverage is complete for the current public-v1 surface. |
| AR-013 | **PASS** | Default-deny and out-of-scope boundaries are preserved. Public-v1 uses the explicit API-token deferred admission before `TokenAuthGuard`; global guards, schema/migrations, token-management policy, document service, and mapper are excluded unless a new proven need appears. | `app.module.ts:27-57`; `better-auth.guard.ts:25-38`; both v1 controllers:10-13; `tenant-auth-default-deny.doorbell.spec.ts:152-158`; refined Design §§5, 13–14, 17–18. | No redesign, migration, or unrelated scope is authorized. |

### Architecture Topics A–G

| Topic | Result | Review conclusion |
| --- | --- | --- |
| A. Scalability | **PASS** | Existing validation lookup/cache gains comparisons only; no storage or new query family. |
| B. Open/Closed | **PASS** | The token guard and trusted request contract remain the explicit extension point for another public-v1 family. |
| C. Ownership | **PASS** | The persisted API key owns authenticated authority; middleware supplies only optional Host context; controllers own public HTTP translation. |
| D. Data Retention | **PASS** | No retained data is introduced. |
| E. Idempotency | **PASS** | Verified routes are reads and denials occur before service invocation; revocation cache clearing remains intact. |
| F. Shared Contracts | **PASS** | `ApiKeyPayload.tenantId` is server-derived and no client tenant-authority DTO is introduced. |
| G. Partitioning | **PASS** | Existing tenant-scoped lookup and index/layout remain sufficient; no partitioning change is introduced. |

### Working Set, Contracts, and Open Questions

The refined Working Set is bounded and sufficient: one guard, two public-v1 controllers, their targeted tests, existing regression suites, and one new real HTTP A/B doorbell. The document controller and tests are strictly necessary for AR-001; the document service and mapper are correctly expected not to change. The Read Order directly proves each authority, Host, resource, and regression contract before implementation.

All Design open questions are resolved or have an explicit stop/escalation disposition. No unresolved material question remains. The historical AR-001 evidence above is retained as provenance and does not remain a blocker after this fresh review.

### Validator Evidence

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm sdd:validate:design -- openspec/changes/secure-public-api-tenant-binding/design.md` | **PASS** | Canonical 18 sections, A–G topics, decision/rationale structure, and Working Set numbering validated. |
| `pnpm sdd:validate` | **PASS** | Canonical workflow, Direct wiring, local role map, hybrid persistence, and maintainer gates validated. |
| `git diff --check` | **PASS** | No whitespace errors reported. |

### Canonical Next Action

**Phase 4 — Tasks.** This fresh Architecture Review passes because all material findings are closed and the refined Design, Working Set, Read Order, contracts, and planned test evidence agree. Do not begin Tasks in this Architecture Review action.
