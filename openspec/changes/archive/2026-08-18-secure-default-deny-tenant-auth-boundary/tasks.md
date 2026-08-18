# Tasks: Secure Default-Deny Tenant Authentication Boundary

## HUMAN-authorized Tasks Correction

This recovery correction closes only TR-007, TR-008, and TR-009 from the second
blocked Tasks Review. It does not change Design, architecture decisions, routes,
production code, tests, or any other artifact. RED precedes GREEN, then bounded
REFACTOR; this artifact is planning evidence only.

## Review Workload Forecast

Forecast: **450–650 changed lines**, high risk. Workload Guard outcome terminology:
**Chained PRs**. Project delivery convention: `feature-branch-chain` on
`sec/secure-default-deny-tenant-auth-boundary`, never `main`.

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

| Unit / base | Finish, exact focused test, exact real-HTTP doorbell, gates, rollback boundary |
|---|---|
| 1 / `sec/secure-default-deny-tenant-auth-boundary` | RED matrix/authority tests; `pnpm --filter api test -- tenant-auth-boundary.guard.spec.ts tenant-scope.guard.spec.ts permissions.guard.spec.ts client-auth.guard.spec.ts`; real HTTP: `pnpm --filter api test:e2e -- tenant-auth-default-deny.doorbell.spec.ts import-export-tenant-isolation.e2e-spec.ts`; gates: `pnpm --filter api exec tsc --noEmit`, `pnpm --filter api lint`, `pnpm --filter api build`, `pnpm sdd:validate`, `pnpm sdd:validate:design -- openspec/changes/secure-default-deny-tenant-auth-boundary/design.md`, `git diff --check`; disposable DB/Redis required by e2e; maintainer-only `git restore -- apps/api/src/common/guards/tenant-auth-boundary.guard.spec.ts apps/api/src/common/guards/tenant-scope.guard.spec.ts apps/api/src/common/guards/permissions.guard.spec.ts apps/api/src/modules/client-auth/client-auth.guard.spec.ts apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts apps/api/test/doorbell/import-export-tenant-isolation.e2e-spec.ts` (not executed). |
| 2 / PR #1 | GREEN metadata/guards/controllers; `pnpm --filter api test -- tenant-auth-boundary.guard.spec.ts tenant-scope.guard.spec.ts permissions.guard.spec.ts client-auth.guard.spec.ts`; real HTTP: `pnpm --filter api test:e2e -- tenant-auth-default-deny.doorbell.spec.ts import-export-tenant-isolation.e2e-spec.ts`; gates: `pnpm --filter api exec tsc --noEmit`, `pnpm --filter api lint`, `pnpm --filter api build`, `pnpm sdd:validate`, `pnpm sdd:validate:design -- openspec/changes/secure-default-deny-tenant-auth-boundary/design.md`, `git diff --check`; disposable DB/Redis required by e2e; maintainer-only `git restore -- apps/api/src/common/decorators/public.decorator.ts apps/api/src/common/guards/better-auth.guard.ts apps/api/src/common/guards/tenant-scope.guard.ts apps/api/src/common/guards/permissions.guard.ts apps/api/src/modules/client-auth/client-auth.guard.ts apps/api/src/modules/client-auth/client-auth.controller.ts apps/api/src/modules/export/export.controller.ts apps/api/src/modules/public-api/v1/v1-workflows.controller.ts apps/api/src/modules/public-api/v1/v1-documents.controller.ts` (not executed). |
| 3 / PR #2 | Bounded REFACTOR and acceptance; `pnpm --filter api test -- tenant-auth-boundary.guard.spec.ts tenant-scope.guard.spec.ts permissions.guard.spec.ts client-auth.guard.spec.ts`; real HTTP: `pnpm --filter api test:e2e -- tenant-auth-default-deny.doorbell.spec.ts import-export-tenant-isolation.e2e-spec.ts`; gates: `pnpm --filter api exec tsc --noEmit`, `pnpm --filter api lint`, `pnpm --filter api build`, `pnpm sdd:validate`, `pnpm sdd:validate:design -- openspec/changes/secure-default-deny-tenant-auth-boundary/design.md`, `git diff --check`; disposable DB/Redis required by e2e; maintainer-only `git restore -- apps/api/src/common/decorators/public.decorator.ts apps/api/src/common/guards/better-auth.guard.ts apps/api/src/common/guards/tenant-scope.guard.ts apps/api/src/common/guards/permissions.guard.ts apps/api/src/modules/client-auth/client-auth.guard.ts apps/api/src/modules/client-auth/client-auth.controller.ts apps/api/src/modules/export/export.controller.ts apps/api/src/modules/public-api/v1/v1-workflows.controller.ts apps/api/src/modules/public-api/v1/v1-documents.controller.ts apps/api/src/common/guards/tenant-auth-boundary.guard.spec.ts apps/api/src/modules/client-auth/client-auth.guard.spec.ts apps/api/src/common/guards/tenant-scope.guard.spec.ts apps/api/src/common/guards/permissions.guard.spec.ts apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts apps/api/test/doorbell/import-export-tenant-isolation.e2e-spec.ts` (not executed). |

For every unit, run `pnpm --filter api exec tsc --noEmit`,
`pnpm --filter api lint`, `pnpm --filter api build`, `pnpm sdd:validate`,
`pnpm sdd:validate:design -- openspec/changes/secure-default-deny-tenant-auth-boundary/design.md`,
and `git diff --check`. Use the disposable database and Redis required by the
API/e2e harness; missing disposable dependencies are STOP conditions. Finish
only when focused tests, real-HTTP no-effect assertions, gates, and bounded
diff checks pass. Rollback is maintainer-only and must not be executed here.

## Phase 1: RED — TR-007 and TR-008

- [ ] 1.1 In `apps/api/src/common/guards/tenant-auth-boundary.guard.spec.ts`, create this independently recoverable RED matrix; every row includes method, representative route/family, exact test/doorbell location, expected result, no-effect assertion where applicable, and owner:

| Method | Representative route/family | Exact proof location | Expected result / no effect | Owner |
|---|---|---|---|---|
| GET | `/api/v1/tenant/*` data route | `tenant-auth-boundary.guard.spec.ts` + `tenant-auth-default-deny.doorbell.spec.ts` | anonymous 401 before read/effects | `BetterAuthGuard` / `TenantScopeGuard` |
| POST, PATCH, DELETE | existing workflow, plugins, documents, billing, communications families | same unit spec + doorbell | anonymous 401 before mutation/effects | global guards / owning controller |
| GET | representative tenant family with valid Host only | unit spec | 401; Host is not authority; no handler/effect | `BetterAuthGuard` |
| any protected method | representative permissioned route | `permissions.guard.spec.ts` | anonymous never inherits `lector`; 401/no effect | `PermissionsGuard` |
| GET | same-tenant protected data route | unit spec + doorbell | authenticated same-tenant user allowed | `BetterAuthGuard` / `TenantScopeGuard` / controller |
| any protected method | same route with insufficient role | `permissions.guard.spec.ts` + doorbell | authenticated 403; no effect | `PermissionsGuard` / controller |
| GET/mutation | Tenant A identity, Tenant B Host; path identifier manipulation | `import-export-tenant-isolation.e2e-spec.ts` | 403; no cross-tenant read/write | `IdentityOrganizationGuard` / export controller |
| GET/mutation | Tenant A client, Tenant B Host; body/query/path `tenantId` or path manipulation | `client-auth.guard.spec.ts` + `tenant-auth-default-deny.doorbell.spec.ts` | 403; no effect; Host remains authority | `ClientAuthGuard` / owning controller |
| GET | explicit public allow-list: health, metrics, auth login/check-user/register, client login/register/logout, shared-document token download | `health.controller.ts` inspect + `tenant-auth-default-deny.doorbell.spec.ts` | existing public contract remains functional | `@Public()` metadata / owning controller |
| POST | `/api/v1/communications/webhook/:providerId` — `CommunicationController` / `CommunicationModule` | `communication.controller.ts:8,110-115`; `webhook-handler.ts:11-20`; `communication.module.ts:25-26,69-75`; RED `tenant-auth-boundary.guard.spec.ts` + HTTP doorbell `tenant-auth-default-deny.doorbell.spec.ts` | Existing `WebhookHandler`/registered `ProviderRegistry` verifies provider signatures, but no approved route-level signature guard or global hand-off exists; therefore this is not an approved public/signed exception and remains default-denied/deferred before the handler. Do not treat missing auth as public or add a webhook. | `BetterAuthGuard` / `TenantScopeGuard` before controller; existing handler signature check is preserved |
| POST | `/api/v1/observability/alerts/webhook` — `AlertWebhookController` / observability alerting module | `alert-webhook.controller.ts:22,31-33`; RED `tenant-auth-boundary.guard.spec.ts` + HTTP doorbell `tenant-auth-default-deny.doorbell.spec.ts` | No `@Public()`, route guard, signature verification, or approved registration evidence is present; no route is approved as public/signed. It remains default-denied/deferred with 401 before handler effects. Do not treat missing auth as public or add a webhook. | `BetterAuthGuard` / `TenantScopeGuard` |

API-token body/query/path tenant isolation is explicitly deferred by Design;
test token admission/401 only in `apps/api/src/modules/public-api/__tests__/token-auth.guard.spec.ts`.

- [ ] 1.2 Prove in `tenant-scope.guard.spec.ts`, `client-auth.guard.spec.ts`, and the identity doorbell that Host resolution alone is insufficient, authenticated identity and Host tenant agree, caller `tenantId` never becomes authority, and client/identity guards cannot overwrite immutable `hostTenantId`.
- [ ] 1.3 Attach no-`lector` proof to `permissions.guard.spec.ts`; attach route-classification proofs to `public.decorator.ts`, each owning guard/controller, and the exact doorbell rows. State the chain: `TenantResolveMiddleware` Host resolution → authenticated actor (`BetterAuthGuard` or classified client/external hand-off) → organization/membership authority → `PermissionsGuard` / `TenantScopeGuard` interaction → protected controller/resource. Global guards run before controller guards; each owner must retain only its named responsibility.
- [ ] 1.4 Prove public metadata bypasses only the intended authentication boundary—not tenant scope, permissions, resource checks, or webhook cryptographic verification.

## Phase 2: GREEN / REFACTOR and acceptance

- [ ] 2.1 Implement only the approved Design Working Set in RED → GREEN order; do not redesign authorization or deferred API-token scope.
- [ ] 2.2 Refactor only that Working Set after GREEN; preserve Host ownership, guard ordering, route classes, webhook deferral, and no-`lector` behavior.
- [ ] 2.3 Acceptance requires every Unit command above, real HTTP with disposable DB/Redis, `pnpm sdd:validate`, the Design pre-gate, and `git diff --check`. STOP on unexpected production/schema/global-auth expansion, unclear provenance, missing dependencies, security/tenant-isolation weakening, or scope expansion. Apply must stop and return to HUMAN if it requires unrelated controllers/resources; public API token tenant-binding redesign; plugin/workflow remediation; OAuth redesign; database schema/migration changes; production/runtime/infrastructure mutation; broad permission-model redesign; global guard reordering not already approved; changing intentionally public route semantics beyond the approved contract; or any production file outside the approved Working Set.
- [ ] 2.4 Exact rollback boundaries are the Unit-1/2/3 file sets in the approved Working Set only; a maintainer may use `git restore -- <exact-unit-files>` after review. This action must not execute rollback or any Git lifecycle operation.

## Approved Working Set / Read Order (preserved exact)

Primary modify: `apps/api/src/common/decorators/public.decorator.ts`; `apps/api/src/common/guards/better-auth.guard.ts`; `apps/api/src/common/guards/tenant-scope.guard.ts`; `apps/api/src/common/guards/permissions.guard.ts`; `apps/api/src/modules/client-auth/client-auth.guard.ts`; `apps/api/src/modules/client-auth/client-auth.controller.ts`; `apps/api/src/modules/export/export.controller.ts`; `apps/api/src/modules/public-api/v1/v1-workflows.controller.ts`; `apps/api/src/modules/public-api/v1/v1-documents.controller.ts`; `apps/api/src/common/guards/tenant-auth-boundary.guard.spec.ts`; `apps/api/src/modules/client-auth/client-auth.guard.spec.ts`; `apps/api/test/doorbell/import-export-tenant-isolation.e2e-spec.ts`; `apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts`. Secondary modify: `apps/api/src/common/guards/tenant-scope.guard.spec.ts`, `apps/api/src/common/guards/permissions.guard.spec.ts`. Inspect: `apps/api/src/modules/identity/__tests__/identity-authorization.spec.ts`, `apps/api/src/modules/public-api/__tests__/token-auth.guard.spec.ts`, `apps/api/src/modules/health/health.controller.ts`. Preserve: `apps/api/src/common/middleware/tenant-resolve.middleware.ts`, `apps/api/src/modules/public-api/auth/token-auth.guard.ts`, `apps/api/src/modules/identity/identity-organization.guard.ts`, `apps/api/src/modules/communication/communication.controller.ts`, `apps/api/src/modules/observability/alerting/alert-webhook.controller.ts`.

Read Order: 1. `apps/api/src/app.module.ts`; 2. `apps/api/src/common/decorators/public.decorator.ts`, `apps/api/src/common/guards/better-auth.guard.ts`, `apps/api/src/common/guards/tenant-scope.guard.ts`; 3. `apps/api/src/modules/client-auth/client-auth.guard.ts`, `apps/api/src/modules/client-auth/client-auth.guard.spec.ts`; 4. `apps/api/src/modules/identity/identity-organization.guard.ts`, `apps/api/src/modules/export/export.controller.ts`, `apps/api/test/doorbell/import-export-tenant-isolation.e2e-spec.ts`; 5. `apps/api/src/modules/public-api/v1/v1-workflows.controller.ts`, `apps/api/src/modules/public-api/v1/v1-documents.controller.ts`, `apps/api/src/modules/public-api/__tests__/token-auth.guard.spec.ts`; 6. `apps/api/src/common/guards/permissions.guard.spec.ts`, `apps/api/src/common/guards/tenant-auth-boundary.guard.spec.ts`, `apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts`. No expansion.

**Checkpoint:** correction complete; next is a fresh **Tasks Review — MID / BUILDER**. Do not enter Workload Guard or Apply.
