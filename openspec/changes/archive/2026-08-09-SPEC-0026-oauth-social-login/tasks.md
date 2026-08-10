# Tasks: SPEC-0026 — OAuth Social Login

## Review Workload Forecast
650–900 lines; High; `force-chained`; `feature-branch-chain`.

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units
| Unit | Goal / boundaries | Focused test | Runtime harness | Rollback |
|---|---|---|---|---|
| 1 | PR #1 base=tracker: BA config/link/callback | `pnpm --filter api test -- auth.spec.ts` | Supertest config/CORS/replay | Revert auth/main/env/tests |
| 2 | PR #2 base=PR #1: session/Host authorization | `pnpm --filter api test -- identity-integration.spec.ts isolation-http.spec.ts` | API callback + A-on-B doorbell | Revert provider/guard/identity tests |
| 3 | PR #3 base=PR #2: UI/browser | `pnpm --filter tenant-web test && pnpm --filter tenant-web test:e2e -- e2e/login.spec.ts` | Playwright Google/password/client | Revert login/middleware/E2E |

## Phase 1 — Foundation
- [x] 1.1 RED `apps/api/src/common/auth.spec.ts`: test disabled/invalid config, exact trusted/return origins, no initiation/records, and unchanged BA user/account/session, membership, `LegacyUser`.
- [x] 1.2 RED `apps/api/src/common/auth.spec.ts`: prove `prisma.$transaction(async (tx) => ...)` starts before account-linking reads; test invalid state, invalid origin, missing admin, email mismatch, conflicting provider account, invalid/missing/inactive tenant/org membership, binding conflict, validation rejection, and downstream write failure; assert every `ba_users`, `ba_accounts`, `ba_sessions`, membership, and `LegacyUser` read/write uses `tx`, invariants run in order (OAuth state valid, callback origin valid, existing admin identified, provider email equals existing admin email, no conflicting provider account, tenant/org membership valid) before any write/commit, each failure throws and leaves all five record sets unchanged.
- [x] 1.3 RED `apps/api/src/common/auth.spec.ts`, `apps/api/src/main.ts`: test invalid origin, mismatched origin, missing/expired/tampered/mismatched/unknown state, tenant mismatch, organization mismatch, replay/PKCE failure, and generic no-session failure; assert reserved `api` Host never activates tenant/org unless validated state maps to an allowed tenant origin, and credentialed CORS rejects wildcard, foreign, and unlisted origins.
- [x] 1.4 RED `apps/api/src/common/auth.spec.ts`: verify BA 1.6.23 fields in `packages/database/prisma/schema.prisma`/migrations; prove no schema or migration change is assumed.
- [x] 1.5 GREEN `apps/api/src/common/auth.ts`, `.env.example`: fail closed; set `disableImplicitLinking:true` and `disableImplicitSignUp:true`; leave `trustedProviders`/`allowDifferentEmails` unset; implement exactly `prisma.$transaction(async (tx) => ...)`, with all BA user/account/session, organization-membership, and applicable `LegacyUser` reads/writes on `tx`; begin before reads, throw on any invariant/write failure, and commit only after all checks/writes so rollback leaves `ba_users`, `ba_accounts`, `ba_sessions`, memberships, and `LegacyUser` unchanged for every 1.2 case.
- [x] 1.6 GREEN `apps/api/src/common/auth.ts`, `apps/api/src/main.ts`: mount `toNodeHandler(auth)` before parsers/controllers; in both paths revalidate state-bound canonical origin after callback and before protected access, including missing/expired/tampered/mismatched/unknown state/origin, and fail each closed with no session/protected access; reserved `api` Host activates no tenant/org until validated state maps to an allowed tenant origin and grants no session/protected access otherwise; configure credentialed CORS with exact trusted/return allowlists only, reject wildcard, and preserve `/admin|/login` returns.

## Phase 2 — Core Engine
- [x] 2.1 RED `apps/api/src/modules/identity/__tests__/identity-integration.spec.ts`: opaque signed/invalid cookies, bearer `getSession`, legacy continuity, ordering, generic failure, and no Next JWT parsing.
- [x] 2.2 GREEN `apps/api/src/common/auth-client.provider.ts`, `common/guards/better-auth.guard.ts`, `modules/identity/identity-organization.guard.ts`: cookie/bearer session; Host→organization→active membership; reject claims/state/body tenant selection.
- [x] 2.3 RED `apps/api/test/doorbell/isolation-http.spec.ts`: reserved-Host callback state mapping, A-on-B denial, and missing/mismatch membership fail closed.
- [x] 2.4 GREEN same path: enforce callback Host→organization→membership before protected access.

## Phase 3 — Feature Implementation
- [x] 3.1 RED `apps/tenant-web/src/__tests__/middleware.spec.ts`, `src/app/login/login-form.test.tsx`, `src/lib/auth.test.ts`: admin-only Google initiation; opaque cookie not JWT-parsed; preserve password/client routing and no client OAuth. Run focused Vitest.
- [x] 3.2 GREEN `login-form.tsx`, `src/lib/auth.ts`, `src/middleware.ts`, `package.json`: advisory admin initiation without secrets; preserve password/client behavior.

## Phase 4 — Integration
- [x] 4.1 RED `apps/tenant-web/e2e/login.spec.ts`: Google redirect/callback, `/admin|/login`, generic failure/no session, password continuity, client exclusion.
- [x] 4.2 GREEN same path; run `pnpm --filter tenant-web test:e2e -- e2e/login.spec.ts`.

## Phase 5 — Testing
- [x] 5.1 Run API/identity/doorbell Jest, tenant Vitest/Playwright; assert RED cases, no provisioning/leakage/migration, lint/build, `git diff --check`.

## Phase 6 — Apply Summary
- [x] 6.1 Record acceptance, commands/results, no-migration evidence, Working Set variance, dependencies, runtime harnesses, and rollback boundaries in Apply Summary.

## Explicit boundaries
Google-only admins; no schema/migration/Caddy/`app.module.ts`/integration/client-auth/portal changes unless RED proves necessity. `openspec/config.yaml` says `stacked-to-main`; this change explicitly overrides it to `feature-branch-chain`.
