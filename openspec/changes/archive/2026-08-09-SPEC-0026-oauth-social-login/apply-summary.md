# Apply Summary

> **SPEC:** SPEC-0026-oauth-social-login
> **Date:** 2026-08-08

## Executive Summary

Apply completed all six tasks for Google OAuth social login for existing admins.
The implementation preserves password and client-login continuity, uses Better Auth
session transport with Host-derived tenant authorization, rejects implicit
provisioning/linking, and records the required cross-tenant and browser evidence.
No schema or migration changes were made. This summary closes Apply; Verify was not
run by this work unit.

## Phases Completed

| Phase | Focus | Files Created | Files Modified | WSA |
|-------|-------|:-------------:|:--------------:|:---:|
| 1 | Foundation | 1 | 3 | 93% |
| 2 | Core Engine | 0 | 7 | 93% |
| 3 | Feature Implementation | 2 | 4 | 93% |
| 4 | Integration | 0 | 2 | 93% |
| 5 | Testing | 0 | 0 | 100% |
| **Total** | | **3** | **16** | **~93%** |

WSA is reported as planned-path coverage: 13 of 14 Design Working Set paths were
used. `package.json` required no change. Three bounded evidence/recovery paths were
also touched: `apps/api/jest-e2e.json`,
`apps/api/src/modules/identity/identity.contracts.ts`, and
`apps/tenant-web/playwright.config.ts`. Playwright report churn is generated output
and is not treated as authored Apply scope.

## Overall Metrics

| Metric | Value |
|--------|-------|
| Working Set Accuracy | ~93% planned-path coverage; variance documented above |
| Unexpected Files | 3 bounded harness/contract/config paths; generated report churn excluded |
| Unexpected Dependencies | 0 |
| Total Authored Files Created | 3 |
| Total Authored Files Modified | 16 |
| Build Success | 3/3 build tasks |
| Lint | 5/5 lint tasks |
| Focused/runtime tests | API auth 14/14; identity 21/21; tenant Vitest 17/17; doorbell 9/9; Playwright 11/11 |
| Repository-wide `pnpm test` | Red only on recorded unrelated/environmental failures |

## Acceptance Criteria Summary

| Phase | Criteria | Status |
|-------|----------|--------|
| 1 | Fail-closed Better Auth configuration, explicit linking transaction, callback/origin and CORS boundaries | ✅ |
| 2 | Opaque Better Auth cookie/bearer session transport and Host→organization→membership authorization | ✅ |
| 3 | Admin-only Google initiation with password/client routing continuity | ✅ |
| 4 | Browser callback failure, bounded returns, password continuity, and client exclusion | ✅ |
| 5 | Focused, runtime, lint, build, diff, and no-migration validation | ✅ |
| 6 | Apply Summary, cumulative evidence, dependency, variance, and rollback reconciliation | ✅ |

## Cumulative Evidence

### Focused and runtime commands

- `pnpm --filter api exec jest --runInBand src/common/auth.spec.ts` — PASS, 14/14.
- `pnpm --filter api exec jest --runInBand src/modules/identity/__tests__/identity-integration.spec.ts` — PASS, 21/21.
- `pnpm --filter tenant-web exec vitest run src/__tests__/middleware.spec.ts src/app/login/login-form.test.tsx src/lib/auth.test.ts` — PASS, 17/17.
- `REDIS_URL=redis://127.0.0.1:6379 pnpm --filter api exec jest --config jest-e2e.json --runInBand test/doorbell/isolation-http.spec.ts` — PASS, 9/9, including 4/4 database-backed tenant-isolation assertions. The root cause was the inherited Docker-only `REDIS_URL=redis://redis:6379` on the host; explicit localhost recovery is canonical. Non-fatal asynchronous ActivityTimeline FK errors were logged by fixture jobs.
- `PLAYWRIGHT_BASE_URL=http://localhost:3101 pnpm --filter tenant-web exec playwright test e2e/login.spec.ts` — PASS, 11/11. The stale remote deployment was not modified.

### Required project gates

- `pnpm lint` — PASS, 5/5.
- `pnpm build` — PASS, 3/3 after the recorded 300-second-timeout rerun.
- `git diff --check` — PASS.
- `git diff --name-only -- packages/database/prisma packages/database/migrations` — no output; no schema/migration changes.
- `pnpm test` — executed but not green: unrelated API database-backed suites lack `DATABASE_URL` in the root test environment, and two unrelated tenant-web tests fail (`calendar-picker` callback assertion and `upload-dialog` timeout). These failures were preserved and not relabeled or fixed.

## TDD Cycle Evidence

Strict TDD evidence from Phases 1–5 is cumulative and preserved in
`sdd/SPEC-0026-oauth-social-login/apply-progress`. Task 6.1 is closure evidence only
and introduces no production behavior or new test claim.

| Task | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----|-------|-------------|----------|
| 1.1–1.6 | ✅ Preserved | ✅ Preserved | ✅ Preserved | ✅ Preserved |
| 2.1–2.4 | ✅ Preserved | ✅ Preserved | ✅ Preserved | ✅ Preserved |
| 3.1–3.2 | ✅ Preserved | ✅ Preserved | ✅ Preserved | ✅ Preserved |
| 4.1–4.2 | ✅ Preserved | ✅ Preserved | ✅ Preserved | ✅ Preserved |
| 5.1 | N/A — validation-only | ✅ Focused/runtime gates passed | ✅ Cross-layer scenarios exercised | N/A — no behavior refactor |
| 6.1 | N/A — closure-only | N/A — no production behavior | N/A — no new test evidence | N/A — artifact reconciliation only |

## Work Unit Evidence — Task 6.1

| Evidence | Result |
|---|---|
| Focused test command and exact result | N/A — documentation/closure-only task; cumulative focused results are preserved above and unchanged. |
| Runtime harness command/scenario and exact result | N/A — no runtime boundary is introduced; cumulative Redis doorbell 9/9 and local Playwright 11/11 results are preserved above. |
| Rollback boundary | Revert only `tasks.md` Phase 6 Task 6.1 checkbox and `apply-summary.md` plus the matching final apply-progress receipt; do not revert product/test implementation or prior evidence. |

## Architecture Decisions Applied

- Google-only social login for existing admins; no client or implicit social signup.
- Better Auth authenticates; Host-derived tenant, mapped organization, and active membership authorize.
- Explicit account linking is atomic through `prisma.$transaction(async (tx) => ...)` and fails closed before writes on invariant violations.
- Better Auth opaque cookie/bearer `getSession` transport is authoritative; frontend middleware remains advisory.
- Exact canonical trusted/return origins and bounded `/admin` or `/login` returns replace wildcard credentialed behavior.
- Existing schema and migrations are reused; no OAuth schema migration is required.

## Dependencies and Deferred Items

| Item | Status / Reason |
|------|-----------------|
| Better Auth 1.6.23 handler/link/cookie/bearer proof | Satisfied by cumulative RED/GREEN and regression evidence. |
| Redis host execution | Recovered with explicit `REDIS_URL=redis://127.0.0.1:6379`; Docker-only `redis` hostname is not valid from the host. |
| Production remote | Deferred; stale remote was not modified. |
| Repository-wide `pnpm test` | Deferred to existing unrelated/environmental failures recorded above; no unrelated fixes permitted. |
| Verify, Archive, Commit, Push, Merge, Release, Tag | Deferred to their canonical phases or maintainer-controlled gates. |

## Risks

| Risk | Status |
|------|--------|
| Root `pnpm test` remains red outside OAuth scope | Recorded; not mitigated in this task. |
| Asynchronous ActivityTimeline fixture FK errors after valid doorbell assertions | Recorded; exact unfiltered 9/9 harness passed. |
| Stale production remote | Preserved and untouched. |
| Missing production Google credentials/allowlist | OAuth remains disabled by default until maintainer configuration. |

## Overall Apply Verdict

**CORRECTIVE APPLY — BLOCKED.**

## Focused Remediation Evidence — 2026-08-09

The original 16 checked tasks remain checked. This corrective work unit changed only
the Better Auth cookie contract and the local tenant-web browser fixture boundary.

### TDD Cycle

| Behavior | RED | GREEN | REFACTOR |
|---|---|---|---|
| Better Auth opaque session cookie configuration | `auth.spec.ts` failed because `advanced.cookies` was absent | 15/15 focused API tests passed | Configuration remains localized in `createAuth` |
| Opaque middleware transport | New opaque-value case added before production change; middleware suite remained green | 15/15 middleware tests and 18/18 focused tenant tests passed | Legacy admin cookie fallback preserved |
| Local client browser continuity | Playwright reproduced 2 client routing failures caused by invalid `__Secure-` cookie on HTTP | Local target passed 11/11 after non-secure local fixture alias and middleware fallback | Production `__Secure-client-session` behavior remains unchanged |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused tests | `auth.spec.ts` 15/15; identity integration 21/21; tenant Vitest 18/18 — PASS |
| Runtime harness | Explicit-host Redis doorbell 9/9 — PASS; local `e2e/login.spec.ts` 11/11 — PASS after restarting stale target with `pnpm --filter tenant-web exec next dev -p 3101` |
| Required quality gates | `pnpm lint` PASS (5/5); `pnpm build` PASS (3/3); `git diff --check` PASS |
| Root test command | `pnpm test` EXIT 1: API suites lack `DATABASE_URL`; unrelated calendar-picker remains 1 failure (184/185 tenant tests) |
| Rollback boundary | Revert only `auth.ts`, `auth.spec.ts`, `middleware.ts`, and the local cookie fixture lines in `e2e/login.spec.ts`; preserve prior SPEC-0026 implementation and generated reports |

### Unresolved Blockers / Deviations

- `apps/api/src/main.ts` still mounts `toNodeHandler(auth)` directly. The approved
  `validateOAuthCallback` and `linkOAuthAccount` helpers are not wired into the real
  Better Auth callback/link execution path; no unsafe replacement was introduced.
- The root `pnpm test` failure is environmental/unrelated to SPEC-0026 (`DATABASE_URL`
  absent in API integration suites) plus the pre-existing tenant calendar-picker failure;
  assertions were not weakened and tests were not suppressed.
- Playwright report changes under `apps/tenant-web/playwright-report/**` are generated
  HTML reporter output from the required runs and remain outside authored scope.

The corrective work unit is not ready for Verify. The canonical Verify phase must not
be routed until the callback/link wiring and root test gate are resolved.
