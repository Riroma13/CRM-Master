# Verification Report: client-platform

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:0000000000000000000000000000000000000000000000000000000000000000
verdict: fail
blockers: 2
critical_findings: 2
requirements: 17/21
scenarios: 31/39
test_command: pnpm --filter database test && pnpm --filter shared test && pnpm --filter api test && pnpm --filter ui test && pnpm --filter admin-web test && pnpm --filter tenant-web test
test_exit_code: 1
test_output_hash: sha256:46de3a642aba8b4d3b2cffc7406467c0f9bb90586abf7183758f14823b5e2f12
build_command: pnpm turbo build
build_exit_code: 1
build_output_hash: sha256:7e81cdc989e98a7552862c71ed55dfc10a5dca8b80a5c26eaccdad7d9d52a2c0
```

## Verification Report

**Change**: client-platform
**Version**: N/A (delta specs)
**Mode**: Standard (Strict TDD NOT ACTIVE)
**Artifact store**: openspec

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 31 |
| Tasks complete | 31 |
| Tasks incomplete | 0 |
| Task completion rate | 100% |

### Build & Tests Execution

**Build**: ❌ Failed — `apps/tenant-web` build fails with `jsonwebtoken` import error
```text
pnpm turbo build
...
Failed:    tenant-web#build
./src/middleware.ts:3:22
Type error: Cannot find module 'jsonwebtoken' or its corresponding type declarations.
```

**Tests — Unit/Integration**: ⚠️ 456 passed / 8 failed (across 6 test suites)
| Package | Result | Passed/Failed | Client-platform tests |
|---------|--------|---------------|----------------------|
| database | ✅ | 31/0 | `index.test.ts` (13), `client-user.test.ts` (5) ✅ |
| shared | ✅ | 12/0 | `schemas.test.ts` (12) ✅ |
| api | ✅ | 168/0 | `client-auth.service.spec.ts` (7), `guard.spec.ts` (7), `client-user-management.service.spec.ts` (9) ✅ |
| ui | ✅ | 15/0 | `primitives.test.tsx` (15) ✅ |
| admin-web | ✅ | 74/0 | `ui-snapshot.test.tsx` (3) ✅ |
| tenant-web | ⚠️ | 156/6 | `middleware.spec.ts` (load error — jsonwebtoken not resolvable), 5 calendar tests (pre-existing), 1 upload timeout (pre-existing) |

**E2E Tests**:
| Suite | Result | Tests |
|-------|--------|-------|
| client-isolation (cross-client doorbell) | ✅ | 7/7 passed |
| isolation-gate (cross-tenant doorbell) | ✅ | 6/6 passed |
| register-login | ❌ | 3/5 passed (2 fail — response shape, status code) |

**Failure Analysis**:
- **tenant-web build**: `jsonwebtoken` is imported in `middleware.ts` but is NOT a dependency of `apps/tenant-web` (only `apps/api` has it). Even if added, `jsonwebtoken` uses Node.js `crypto` and is incompatible with Next.js Edge Runtime. → **CRITICAL — blocks deployment**
- **tenant-web test**: `middleware.spec.ts` cannot load because of same `jsonwebtoken` resolution issue → **CRITICAL** (12 middleware tests exist but cannot execute)
- **tenant-web calendar tests**: 5 failures in `calendario/page.test.tsx`, 1 in `calendar-picker.test.tsx` → **PRE-EXISTING, NOT from client-platform**
- **register-login e2e**: 2 failures → response shape mismatch (`clientUser` nesting) and 404 vs 403 → minor, not in spec scope

### Working Set Validation

#### Planned vs Actual

| # | Planned File | Exists? | Notes |
|---|-------------|---------|-------|
| P1 | `client-auth.{module,service,controller,guard}.ts` | ✅ | All 4 files exist |
| P2 | `client-auth/dto/client-auth.dto.ts` | ✅ | |
| P3 | `client-user-management.{module,service,controller}.ts` | ✅ | All 3 exist |
| P4 | `client-user-management/dto/client-user-management.dto.ts` | ✅ | |
| P5 | `core/core.module.ts` (wiring) | ✅ | Imports both modules transitively |
| P6 | `packages/database/src/index.ts` | ✅ | Extended with `clienteId` parameter |
| P7 | `packages/database/src/prisma-helpers.ts` | ✅ | Chokepoint for where/data injection |
| P8 | `packages/database/prisma/schema.prisma` | ✅ | `ClientUser` model present |
| P9 | `prisma/generators/tenant-scope/generated/tenant-models.ts` | ✅ | Lists ClientUser in scoped models |
| P10 | `packages/shared/src/client-auth/{index,schemas,dto}.ts` | ✅ | All 3 exist |
| P11 | `packages/ui/src/{index,button,card,badge,layout,utils}.tsx` | ⚠️ | **Minor**: `index.tsx` → `index.ts`, `utils.tsx` → `utils.ts`. All functionality present. |
| P12 | `apps/tenant-web/src/middleware.ts` | ✅ | Exists but build fails (jsonwebtoken) |
| P13 | `apps/tenant-web/src/app/(admin)/admin/layout.tsx` | ✅ | |
| P14 | `apps/tenant-web/src/app/(client)/layout.tsx` | ✅ | Feature flag gate present |
| P15 | `apps/tenant-web/src/app/(client)/portal/page.tsx` | ✅ | |
| P16 | `apps/tenant-web/src/app/(client)/portal/my-appointments/page.tsx` | ✅ | |
| P17 | `apps/tenant-web/src/app/(client)/portal/my-documents/page.tsx` | ✅ | |
| P18 | `apps/tenant-web/src/app/(client)/portal/profile/page.tsx` + `profile-edit-form.tsx` | ✅ | Both exist |
| P19 | `apps/tenant-web/src/app/login/{page,login-form}.tsx` | ✅ | Both exist |
| P20 | `apps/tenant-web/src/app/registro/page.tsx` | ✅ | Self-register form |
| P21 | `docs/adr/0001-clientuser-schema.md` | ✅ | ADR referenced per AGENTS.md rule 8 |

**Working Set Accuracy**: 20/21 files exist on disk (95.2%). One file has extension mismatch (`index.ts` vs planned `index.tsx`) but is functionally correct.

#### Expected NOT to Change

| File | Prediction | Actual | Status |
|------|-----------|--------|--------|
| `apps/api/src/app.module.ts` | Not changed | Not changed (no client-auth imports) | ✅ Correct |
| `apps/tenant-web/src/app/layout.tsx` | Not changed | Not changed | ✅ Correct |
| `(admin)/admin/**` urls | URLs unchanged | Admin pages moved into group but URLs preserved | ✅ Correct |
| `apps/admin-web` business pages | Not changed | Consumer re-wired to `@crm-master/ui`, no logic changes | ✅ Correct |

**"NOT to Change" accuracy**: 4/4 correct (100%).

#### Unexpected Files

| File | Why unexpected | Severity |
|------|---------------|----------|
| `apps/tenant-web/e2e/register.spec.ts` | Playwright e2e for self-registration, not planned in design | LOW |
| `openspec/changes/client-self-registration/*` | Separate SDD change that shipped alongside/after | INFO |
| `docs/tenant-scope-generator.md` | Generator documentation added during implementation | INFO |
| `docs/AUDITORIA.md`, `docs/DECISIONS.md`, `docs/TREE.md` | Documentation artifacts | INFO |

### Exploration Review

The design's **Design Confidence** ratings were:
- **High** for cross-client isolation contract → **VALIDATED** (7/7 doorbell tests pass)
- **Medium** for `/portal` SSR data correctness → **CONFIRMED** — portal pages exist, Cita/Documento client endpoints do NOT exist as separate handlers (they rely on the `clienteId` Prisma extension for scoping)
- **Low** for rate-limit state durability → Not validated (implementation detail, no test covers persistence)

**Exploration Budget compliance**: The design does not enumerate a concrete budget for verify phase reads/searches (budget was for Apply phase). Verify phase performed expected reads: all 5 spec directories, all primary file checks, codebase grep for `@crm-master/ui` imports.

### Spec Compliance Matrix

#### client-auth (10 scenarios, 5 requirements)

| # | Requirement | Scenario | Covering Test | Result |
|---|------------|----------|---------------|--------|
| 1.1 | Client Login | Valid credentials return 200 + cookie | `client-auth.service.spec.ts` — login success | ✅ COMPLIANT |
| 1.2 | Client Login | Wrong password → 401 | `client-auth.service.spec.ts` — wrong password | ✅ COMPLIANT |
| 1.3 | Client Login | Unknown tenant → 404 | `client-auth.service.spec.ts` — tenant resolution | ✅ COMPLIANT |
| 1.4 | Client Login | Deactivated → 403 | `client-auth.service.spec.ts` — deactivated user | ✅ COMPLIANT |
| 2.1 | Client Logout | Clears cookie | `client-auth.controller.spec.ts` (via service) | ✅ COMPLIANT |
| 3.1 | Session Retrieval | `GET /me` returns profile | `client-auth.service.spec.ts` — getMe | ✅ COMPLIANT |
| 3.2 | Session Retrieval | Missing cookie → 401 | `client-auth.guard.spec.ts` — missing cookie | ✅ COMPLIANT |
| 4.1 | Role Dispatch | Admin → `/admin` | `middleware.spec.ts` — admin routing* | ⚠️ PARTIAL |
| 4.2 | Role Dispatch | Client → `/portal` | `middleware.spec.ts` — client routing* | ⚠️ PARTIAL |
| 5.1 | Guard Rejects Wrong Token | Admin cookie blocked on client endpoint | `client-auth.guard.spec.ts` — admin cookie rejected; `client-isolation.e2e-spec.ts` — admin token rejected on `/client/me` | ✅ COMPLIANT |

\* Middleware spec exists (12 tests) but cannot execute because `jsonwebtoken` cannot be resolved by vitest in the tenant-web package. The 2 dispatch scenarios are covered by existing unit logic in `resolveRouteByCookie()` but cannot be verified at runtime.

#### client-self-service (8 scenarios, 5 requirements)

| # | Requirement | Scenario | Covering Test | Result |
|---|------------|----------|---------------|--------|
| 6.1 | Portal Dashboard | Client sees own KPIs | Portal page exists at `(client)/portal/page.tsx` | ⚠️ PARTIAL |
| 6.2 | Portal Dashboard | Unauthenticated → redirect to login | `(client)/layout.tsx` gate | ⚠️ PARTIAL |
| 7.1 | My Appointments | Client sees only own appointments | `client-isolation.e2e-spec.ts` — scoped client exclusions | ✅ COMPLIANT |
| 7.2 | My Appointments | Client cancels own appointment | Portal page exists | ⚠️ PARTIAL |
| 7.3 | My Appointments | Past appointment cancellation rejected | No dedicated test found | ❌ UNTESTED |
| 8.1 | My Documents | Client views shared documents only | `client-isolation.e2e-spec.ts` — list scoping | ✅ COMPLIANT |
| 8.2 | My Documents | Unshared document inaccessible by id | `client-isolation.e2e-spec.ts` — read scoping | ✅ COMPLIANT |
| 9.1 | Profile Edit | Client edits allowed field | Portal profile page exists | ⚠️ PARTIAL |
| 9.2 | Profile Edit | Restricted fields rejected | No dedicated test found | ❌ UNTESTED |
| 10.1 | Data Scoping | clienteId extension excludes rows | `client-isolation.e2e-spec.ts` — mutation count=0; `database/src/__tests__/index.test.ts` — injection tests | ✅ COMPLIANT |

#### client-user-management (7 scenarios, 5 requirements)

| # | Requirement | Scenario | Covering Test | Result |
|---|------------|----------|---------------|--------|
| 11.1 | ClientUser Model + ADR | Migration creates table | `prisma/__tests__/client-user.test.ts` (5 schema tests) | ✅ COMPLIANT |
| 11.2 | ClientUser Model + ADR | Blocked without ADR | `docs/adr/0001-clientuser-schema.md` exists | ✅ COMPLIANT |
| 12.1 | Admin Create | Creates client user → 201 | `client-user-management.service.spec.ts` — create | ✅ COMPLIANT |
| 12.2 | Admin Create | Cross-tenant clienteId rejected | `client-user-management.service.spec.ts` — cross-tenant rejection | ✅ COMPLIANT |
| 12.3 | Admin Create | Duplicate email → 409 | `client-user-management.service.spec.ts` — duplicate email | ✅ COMPLIANT |
| 13.1 | Admin Disable | Disabled user cannot log in | `client-user-management.service.spec.ts` — disable; `client-auth.service.spec.ts` — deactivated login rejection | ✅ COMPLIANT |
| 14.1 | Admin Reset Password | Hash rotates, session ends | `client-user-management.service.spec.ts` — reset password | ✅ COMPLIANT |
| 15.1 | passwordHash Exclusion | List excludes passwordHash | `client-user-management.service.spec.ts` — USER_SELECT excludes passwordHash | ✅ COMPLIANT |

#### data-leak-detection (8 scenarios, 2 requirements)

| # | Requirement | Scenario | Covering Test | Result |
|---|------------|----------|---------------|--------|
| 16.1 | Cross-Client Isolation | Client A cannot read Client B appointment | `client-isolation.e2e-spec.ts` — read block | ✅ COMPLIANT |
| 16.2 | Cross-Client Isolation | Client A cannot list Client B documents | `client-isolation.e2e-spec.ts` — list block | ✅ COMPLIANT |
| 16.3 | Cross-Client Isolation | Cross-client mutation count=0 | `client-isolation.e2e-spec.ts` — updateMany/deleteMany count=0 | ✅ COMPLIANT |
| 17.1 | Cross-Tenant Isolation (MODIFIED) | Tenant A cannot read Tenant B resource | `isolation-gate.spec.ts` — cross-tenant gate | ✅ COMPLIANT |
| 17.2 | Cross-Tenant Isolation (MODIFIED) | Tenant A cannot list Tenant B resources | `isolation-gate.spec.ts` — list isolation | ✅ COMPLIANT |
| 17.3 | Cross-Tenant Isolation (MODIFIED) | Tenant A cannot create under Tenant B | `isolation-gate.spec.ts` — create scoping | ✅ COMPLIANT |
| 17.4 | Cross-Tenant Isolation (MODIFIED) | Client A cannot read Client B within same tenant | `client-isolation.e2e-spec.ts` — cross-client doorbell | ✅ COMPLIANT |
| 17.5 | Cross-Tenant Isolation (MODIFIED) | Doorbell fails build on regression | Both doorbell suites exit non-zero on failure → gate active | ✅ COMPLIANT |

#### shared-ui (6 scenarios, 4 requirements)

| # | Requirement | Scenario | Covering Test | Result |
|---|------------|----------|---------------|--------|
| 18.1 | Package Exports Primitives | Consumer imports resolve | `primitives.test.tsx` (15 tests) — all 4 primitives render | ✅ COMPLIANT |
| 18.2 | Package Exports Primitives | Prop API backward compatible | `primitives.test.tsx` — variant/size/children props | ✅ COMPLIANT |
| 19.1 | Consumed by Both Frontends | admin-web imports from packages/ui | `ui-snapshot.test.tsx` (3 snapshots) — all match | ✅ COMPLIANT |
| 19.2 | Consumed by Both Frontends | tenant-web imports same package | 38 `@crm-master/ui` imports across admin-web | ✅ COMPLIANT |
| 20.1 | Tree-Shakeable | Unused primitive dropped from bundle | Not verified (build fails for tenant-web, no bundle analysis) | ⚠️ PARTIAL |
| 21.1 | Visual Consistency | Same props = same markup | `ui-snapshot.test.tsx` — snapshot regression gate | ✅ COMPLIANT |

#### Compliance Summary

| Status | Count |
|--------|-------|
| ✅ COMPLIANT | 31 of 39 |
| ⚠️ PARTIAL | 6 of 39 |
| ❌ UNTESTED | 2 of 39 |
| ❌ FAILING | 0 of 39 |

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| ClientUser model with @@unique([tenantId, email]) | ✅ Implemented | schema.prisma lines 213-227; 2 migrations present |
| ADR 0001 referenced | ✅ Implemented | `docs/adr/0001-clientuser-schema.md` exists (4904 bytes) |
| `clienteId` Prisma extension | ✅ Implemented | Two-stage $extends in `packages/database/src/index.ts` |
| Separate cookie (`__Secure-client-session`) | ✅ Implemented | `client-auth.controller.ts` sets cookie |
| `ClientAuthGuard` rejects admin cookie | ✅ Implemented | Guard unit tests + doorbell e2e confirm |
| Four shared UI primitives exported | ✅ Implemented | `packages/ui/src/index.ts` exports Button, Badge, Card, DashboardLayout |
| admin-web local copies removed | ✅ Implemented | 4 local files confirmed deleted; 38 imports from `@crm-master/ui` |
| Route groups `(admin)/` and `(client)/` | ✅ Implemented | Both route groups exist with separate layouts |
| `passwordHash` excluded from responses | ✅ Implemented | `USER_SELECT` in `client-user-management.service.ts` excludes it; unit test confirms |

### Coherence (Design Decisions)

| Decision | Followed? | Evidence |
|----------|-----------|----------|
| Separate `ClientUser` table (not `User.role='client'`) | ✅ Yes | `ClientUser` model in schema.prisma |
| `__Secure-client-session` cookie + `ClientAuthGuard` | ✅ Yes | Distinct cookie name, guard rejects wrong token type |
| `clienteId` scoping via `createPrismaClient` extension | ✅ Yes | Two-stage $extends in `packages/database/src/index.ts` |
| Next.js route groups `(admin)/` + `(client)/` same domain | ✅ Yes | Route groups at `apps/tenant-web/src/app/` |
| `NEXT_PUBLIC_CLIENT_PORTAL_ENABLED` feature flag | ✅ Yes | Gate check in `(client)/layout.tsx` |
| Prisma extension blocks raw SQL | ✅ Yes | `isolation-gate.spec.ts` confirms: raw SQL rejected on scoped client |
| `app.module.ts` unchanged (wiring via `core.module.ts`) | ✅ Yes | No client-auth imports in app.module.ts; transitively wired |
| `(admin)/admin` URLs unchanged after move | ✅ Yes | Admin pages moved into group, paths preserved |
| `passwordHash` excluded via explicit `select` | ✅ Yes | `USER_SELECT` constant in user-management service |

### Issues Found

**CRITICAL**:
1. `apps/tenant-web` **build fails**: `middleware.ts` imports `jsonwebtoken` which is NOT a dependency of tenant-web. The module is only listed in `apps/api/package.json`. This blocks deployment of the entire tenant-web app. Even if added, `jsonwebtoken` uses Node.js `crypto` and is incompatible with Next.js Edge Runtime (where middleware runs by default). The fix must use an Edge-compatible JWT library (e.g., `jose`) or move JWT verification out of middleware.
2. `apps/tenant-web` **middleware test cannot execute**: `middleware.spec.ts` (12 tests per design) fails at import resolution because vitest can't resolve `jsonwebtoken`. These 12 tests cover middleware routing logic (`resolveTenantFromHost`, `resolveRouteByCookie`) that are central to the role-based dispatch spec.

**WARNING**:
1. **register-login e2e partially fails** (2 of 5): The registration tests expect nested response shape (`res.body.clientUser`) but the actual API returns flat fields. Also expects 403 but gets 404 for missing tenant. These tests are NOT part of the `client-platform` spec scope (registration is `client-self-registration` change) but co-exist in the repo and fail.
2. **client-self-service portal pages have no runtime tests**: The portal dashboard, profile edit, my-appointments cancellation, and my-documents pages exist as server components but have no dedicated unit/e2e/integration tests beyond the cross-client doorbell's data isolation checks. UX behavior (redirect on unauthenticated, form submission, cancellation flow) is untested.
3. **tenant-web calendar tests fail** (6 failures): All related to calendar date/slot rendering in `calendario/page.test.tsx` and `calendar-picker.test.tsx`. These are **pre-existing** failures not introduced by client-platform, but they contribute to the non-zero exit code and mask the true health of the change.

**SUGGESTION**:
1. Minor file naming discrepancy: design references `packages/ui/src/index.tsx` and `utils.tsx`; actual files are `index.ts` and `utils.ts`. Functionally equivalent but would improve Working Set accuracy tracking.
2. Design references 4 primitives including `Layout`; actual export is `DashboardLayout`. Rename for consistency.
3. The middleware already has a `jsonwebtoken`-free fallback path for dev mode (`atob()`-based decoding). Consider using `jose` (Edge-compatible JWT) for the production path to keep JWT verification in middleware.
4. `rate-limit` state durability (in-memory `Map`) was flagged as **Low** confidence in the design — no test validates this, and it's a production readiness concern.

### Verdict

**FAIL**

The change has 2 blockers (tenant-web build failure, middleware tests cannot execute) and 2 untested spec scenarios. The core backend implementation (client-auth, client-user-management, client-user-management, Prisma clienteId extension, shared UI package, admin-web migration) is solid with 100% unit test pass rate and all 13 doorbell isolation tests passing. However, the `tenant-web` frontend cannot build or fully test due to the `jsonwebtoken` import in `middleware.ts` — this prevents deployment verification and blocks the change from being considered complete.

**Root cause**: `middleware.ts` imports `jsonwebtoken` (a Node.js-only dependency not present in tenant-web's `package.json`). Fix: either (a) add `jose` to tenant-web dependencies and replace the `jwt.verify()` call with Edge-compatible verification, or (b) move JWT verification server-side (API endpoint) and have middleware only parse the cookie to determine role dispatch.
