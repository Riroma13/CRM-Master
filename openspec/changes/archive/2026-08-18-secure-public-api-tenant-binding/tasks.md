# Tasks: Secure Public API Tenant Binding

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 420–560 |
| 400-line budget risk | High |
| Canonical Workload Guard outcomes | Chained PRs or Size Exception |
| Project delivery convention | `feature-branch-chain` (not a Workload Guard outcome) |
| Strategy | Pending HUMAN / MAINTAINER decision; do not choose in Tasks or Apply |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

**Work-unit boundaries and finish evidence:** Unit 1 owns guard tests and `token-auth.guard.ts`; finish = focused guard RED→GREEN plus no-overwrite evidence. Unit 2 owns the two controllers and their unit/regression suites; finish = all four handlers use trusted authority and document null is 404 before mapping. Unit 3 owns the doorbell and compatibility suites; finish = A/B HTTP matrix, lint, build, validators, and bounded diff. The post-review Workload Guard must choose **Chained PRs** or **Size Exception**. If Chained PRs is selected, the project convention is `feature-branch-chain`; the HUMAN / MAINTAINER must authorize that strategy before Apply.

## Approved Working Set (independently recoverable)

### Primary files — exact action and position

1. `apps/api/src/modules/public-api/auth/token-auth.guard.ts` — **Modify**; bind persisted token tenant, compare Host/selectors, write trusted request context.
2. `apps/api/src/modules/public-api/v1/v1-workflows.controller.ts` — **Modify**; remove caller authority from list/get and pass trusted tenant.
3. `apps/api/src/modules/public-api/v1/v1-documents.controller.ts` — **Modify**; same authority change and null→404 before mapper.
4. `apps/api/src/modules/public-api/__tests__/token-auth.guard.spec.ts` — **Modify**; guard authentication and isolation RED tests.
5. `apps/api/src/modules/public-api/__tests__/public-api-cross-tenant-isolation.spec.ts` — **Modify**; invert historical cross-tenant 200 regression.
6. `apps/api/src/modules/public-api/__tests__/v1-workflows.controller.spec.ts` — **Modify**; trusted workflow list/get tests.
7. `apps/api/src/modules/public-api/__tests__/v1-documents.controller.spec.ts` — **Modify**; trusted document list/get and mapper boundary tests.
8. `apps/api/src/modules/public-api/__tests__/public-api-full-flow.spec.ts` — **Modify**; preserve valid, revocation, quota, and rate-limit contracts.
9. `apps/api/src/modules/public-api/__tests__/public-api-scope-enforcement.spec.ts` — **Modify**; preserve scope 403 semantics.
10. `apps/api/test/doorbell/public-api-tenant-binding.doorbell.spec.ts` — **Create**; real HTTP A/B isolation matrix.

### Conditional secondary files — exact action and position

11. `apps/api/src/modules/public-api/auth/token.service.ts` — **Modify only if RED proves minimal validation payload/cache plumbing is required**; no management redesign.
12. `apps/api/src/common/middleware/tenant-resolve.middleware.spec.ts` — **Modify only if RED proves Host/neutral-host compatibility evidence is required**.
13. `apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts` — **Modify only if RED proves existing deferred-token 401 compatibility requires it**.

### Read Order and exclusions

Read in this order: (1) guard; (2) token service and `packages/database/prisma/schema.prisma` `ApiKey`; (3) Host middleware and scope/default-deny guards; (4) both controllers, workflow/document services, and document mapper; (5) named guard, controller, cross-tenant, full-flow, scope, default-deny, and doorbell tests. Exclude modification of schema, document service, mapper, global guards, token-management policy, unrelated changes, and Git artifacts. A new selector alias or material contradiction is a stop condition.

## RED Matrix (write every row before production changes)

| Route / method | RED input and expected status | Required no-effect assertion | Owner |
|---|---|---|---|
| `GET /api/v1/public/workflows`, list | A token + A authority, valid scope → **200** | Service receives A; no B data | Controller test |
| `GET /api/v1/public/workflows/:id`, get | A token + A ID → **200**; A token + B/absent ID → **404** | Lookup is A-scoped; no B disclosure/mutation | Controller/doorbell; `WorkflowService` owns 404 |
| `GET /api/v1/public/documents`, list | A token + A authority → **200** | Service receives A; no B data | Controller test |
| `GET /api/v1/public/documents/:id`, get | A token + A ID → **200**; A token + B/absent ID → **404** | A-scoped `null`; `toV1()` is not called with null; no B disclosure/mutation | Controller/doorbell; controller owns null→404 |
| All four handlers | Missing, malformed, invalid, expired, or revoked token → **401** | Handler and service are not called | `TokenAuthGuard` |
| All four handlers | A token plus conflicting `tenantId` in query/body/path, or conflicting tenant Host → **403** | Stop before handler/service; request authority is not overwritten | `TokenAuthGuard` |
| All four handlers | A token plus agreeing tenant Host → normal route result; neutral/reserved Host → token remains authority | Host cannot select or redirect tenant | Guard/doorbell |

## Dependency-ordered execution

### Phase 1 — RED

- [x] 1.1 Add guard RED cases for persisted `ApiKey.tenantId`, `apiTokenTenantId`, all 401 variants, Host/selector 403, and pre-existing request-tenant overwrite.
- [x] 1.2 Add controller RED cases for the four routes, trusted A propagation, document null-before-mapper, and service non-invocation on conflicts.
- [x] 1.3 Add cross-tenant regression, full-flow/scope/default-deny compatibility, and real HTTP A/B RED cases from the matrix, including no disclosure/mutation.

### Phase 2 — GREEN

- [x] 2.1 Update `token-auth.guard.ts`: validate persisted key; compare optional `hostTenantId` and every verified `tenantId` selector; deny conflicts before handlers; set trusted tenant/provenance.
- [x] 2.2 Update both controllers to consume trusted request tenant; translate document `null` to `NotFoundException` before `toV1()`.
- [x] 2.3 Touch conditional secondary files only when a named RED failure proves minimal compatibility plumbing; otherwise preserve them.

### Phase 3 — REFACTOR checkpoint

- [x] 3.1 Refactor only within the approved Working Set: remove duplicate authority handling, retain guard-before-handler order, and preserve test intent. Re-run focused suites; no scope expansion or Design/tasks rewrite.

### Phase 4 — acceptance evidence

- [x] 4.1 Run `pnpm --filter api test -- public-api-cross-tenant-isolation token-auth.guard v1-workflows.controller v1-documents.controller public-api-full-flow public-api-scope-enforcement`.
- [x] 4.2 Run the two doorbells serially through the necessary e2e Jest harness with an authenticated disposable Redis endpoint; both suites passed with 27/27 scenarios and 0 skips.
- [x] 4.3 Run `pnpm --filter api lint`, `pnpm --filter api build`, `pnpm sdd:validate:design -- openspec/changes/secure-public-api-tenant-binding/design.md`, `pnpm sdd:validate`, and `git diff --check`.
- [x] 4.4 Every matrix row and Design §§2–4, 7, 11–12, 16 contract has observable evidence; no-disclosure/no-mutation, auth rejection/success, cleanup, exclusions, and final diff scope are recorded in Apply 7.5.

The canonical next phase after this refinement is a **fresh Phase 5 Tasks Review only**. Do not run Workload Guard or Apply here.
