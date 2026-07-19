# Tasks: Client Self-Registration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~195 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Schema + DTO + service + controller + frontend + tests | PR 1 | `pnpm --filter api test` | `docker compose up -d` (Postgres) | revert single PR + `prisma migrate reset` |

## Phase 1: Foundation / Schema

- [x] 1.1 Add `nombre String?` and `telefono String?` to `ClientUser` in `packages/database/prisma/schema.prisma`
- [x] 1.2 Migration created at `prisma/migrations/20260716212500_add_client_user_fields/migration.sql`
- [x] 1.3 Run `pnpm --filter database generate:scope` and verify `pnpm --filter database test:scope` passes (13/13)
- [x] 1.4 Add `RegisterDto` and `RegisterResponseDto` to `client-auth.dto.ts`

## Phase 2: Core Implementation (TDD — RED first)

- [x] 2.1 RED: Added `register` tests to `client-auth.service.spec.ts` — 6 tests covering success, businessName, duplicate email, weak password, rate limit
- [x] 2.2 GREEN: Implemented `register()` in `ClientAuthService` with bcrypt(12), array-form `$transaction`, rate limiting, P2002 catch
- [x] 2.3 All 22 client-auth tests pass (16 existing + 6 new)

## Phase 3: Integration / Wiring

- [x] 3.1 Added `@Post('auth/register')` to `ClientAuthController` — public, 201, tenantId from req, returns clientUser
- [x] 3.2 Modified `/registro/page.tsx` — API URL → `/api/v1/client/auth/register`, `name` → `nombre`, redirect to `/login?registered=true`

## Phase 4: Testing / Verification

- [x] 4.1 Created E2E test `apps/api/test/e2e/register-login.spec.ts` — 5 scenarios (register, login-after-register, duplicate email, missing tenant, weak password) + `apps/tenant-web/e2e/register.spec.ts` (Playwright frontend E2E)
- [x] 4.2 Full API test suite: 157 passed (16 suites) + scope tests 13/13
- [ ] 4.3 `pnpm lint` — pre-existing failures (unrelated to this change)

## Phase 5: Cleanup

- [x] 5.1 `telefono` NOT exposed in RegisterResponseDto or any API response
- [x] 5.2 Deviations from spec/design:
  - Rate limit key uses `register:ip` (IP-only) instead of `ip:email` — IP+email is ineffective for registration (email changes each attempt)
  - Used `db:push` instead of `db:migrate` (shadow DB permission); migration file created manually
  - Pre-generated UUIDs for array-form $transaction (array-form can't chain results)
  - E2E test at `apps/api/test/e2e/register-login.spec.ts` (not `.e2e-spec.ts` — matches existing naming convention)