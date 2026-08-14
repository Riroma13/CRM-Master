# Tasks: SPEC-0030 — Configuration & Settings Platform

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 320–400 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single bounded delivery; no chained-PR strategy authorized |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | API facade, profile boundary, and security tests | Single | `pnpm --filter api test -- --runInBand tenant-settings tenant-profile.service` | `apps/api/test/doorbell/tenant-settings-isolation.spec.ts` via `pnpm --filter api test:e2e -- tenant-settings-isolation.spec.ts` | Revert exactly these 11 API files: 7 primary — `apps/api/src/modules/tenant-settings/tenant-settings.module.ts`, `apps/api/src/modules/tenant-settings/tenant-settings.controller.ts`, `apps/api/src/modules/tenant-settings/tenant-settings.service.ts`, `apps/api/src/modules/tenant-settings/tenant-settings.dto.ts`, `apps/api/src/modules/tenant/tenant.module.ts`, `apps/api/src/modules/tenant-profile/tenant-profile.module.ts`, `apps/api/src/modules/tenant-profile/tenant-profile.service.ts`; 4 secondary — `apps/api/src/modules/tenant-settings/__tests__/tenant-settings.service.spec.ts`, `apps/api/src/modules/tenant-settings/__tests__/tenant-settings.controller.spec.ts`, `apps/api/test/doorbell/tenant-settings-isolation.spec.ts`, `apps/api/src/modules/tenant-profile/tenant-profile.service.spec.ts` |
| 2 | Tenant-web settings page and navigation | Single | `pnpm --filter tenant-web test -- settings` | N/A: bounded Vitest page harness | Revert the 4 tenant-web files |

## Phase 1: RED Tests (dependency-first)

- [x] 1.1 Create `tenant-settings.service.spec.ts` with failing mapping, partial update, `logo:null`, repeat-PATCH, and `config`/`password` exclusion cases.
- [x] 1.2 Create `tenant-settings.controller.spec.ts` with failing exact `configuracion:read/update` metadata, Host tenant selection, 400 validation, anonymous GET/PATCH 403, and authenticated permission-denial 403 cases.
- [x] 1.3 Create `tenant-profile.service.spec.ts` with failing direct regression: supplied `logo:null` is persisted; omitted logo is absent from update data.
- [x] 1.4 Create `tenant-settings-isolation.spec.ts` with failing real-database Host A/B doorbell proof: B cannot read/update A and body `tenantId` is rejected.
- [x] 1.5 Create `page.test.tsx` with failing load/save/validation/failed-save cases; modify `admin.test.ts` with failing Settings registration coverage.

## Phase 2: GREEN API and profile

- [x] 2.1 Modify `tenant-profile.service.ts` input to `logo?: string | null`; preserve omitted-logo behavior and supplied-null persistence.
- [x] 2.2 Modify `tenant-profile.module.ts` to export `TenantProfileService` only for the one-way facade dependency.
- [x] 2.3 Create `tenant-settings.dto.ts` with a strict partial whitelist for non-empty trimmed `name` and nullable `logo`.
- [x] 2.4 Create `tenant-settings.service.ts` mapping only Tenant identity fields through `TenantProfileService`.
- [x] 2.5 Create `tenant-settings.controller.ts` for Host-scoped GET/PATCH with exact `configuracion` metadata and unchanged guards.
- [x] 2.6 Create `tenant-settings.module.ts`; modify `tenant.module.ts` using pure composition imports only.

## Phase 3: GREEN tenant-web

- [x] 3.1 Create `admin/settings/page.tsx` using the existing API client for the two identity fields and failure state.
- [x] 3.2 Modify `config/navigation/admin.ts` to add feature-owned Settings metadata; do not edit Sidebar or registry.

## Phase 4: REFACTOR (dependency-ordered)

- [x] 4.1 Refactor the approved API, Profile, and tenant-web UI boundaries after RED/GREEN: preserve the passing tests and contracts, Host-derived tenant isolation, exact `configuracion` permissions, anonymous/authenticated 403 behavior, exclusions, and no scope expansion.

## Phase 5: Checkpoints and acceptance

- [x] 5.1 Run focused API, profile, doorbell, tenant-web, build, and lint commands from Design; then `pnpm sdd:validate` and `git diff --check`.
- [x] 5.2 Confirm only the 15 Design Working Set files changed; no schema, migration, generated, package, lockfile, guard/auth, unrelated settings, SPEC-0028, or SPEC-0029 changes.
- [x] 5.3 Acceptance: typed name/logo GET/PATCH, nullable clear, exact permissions, anonymous 403s, Host-derived isolation, excluded fields rejected, and navigation/page tests pass.

Canonical next action: Verify (HIGH / ARCHITECT).
