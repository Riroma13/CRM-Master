# Health Report: Secure Default-Deny Tenant Authentication Boundary

> **Change:** `secure-default-deny-tenant-auth-boundary`
> **Action:** Health Report
> **Role:** LOW / OPERATOR-EVIDENCE
> **Normalized result:** PASS
> **Generated at:** 2026-08-18
> **Canonical evidence path:** `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/`
> **Persistence:** hybrid; this repository artifact is the exact Health Report record.

## Boundary and provenance

This Health Report consumes the PASS Archive Report and all exact archived artifacts under `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/`, plus fresh repository evidence produced below. No product source, archived lifecycle artifact, or Git lifecycle operation was performed. This is bounded mechanical evidence only; architecture and implementation judgment remain HIGH / ARCHITECT and MID / BUILDER responsibilities.

## Required prior artifacts

| Artifact | Path | Status |
|---|---|---|
| Design | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/design.md` | Present |
| Architecture Review | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/architecture-review.md` | Present (PASS after AR-01) |
| Tasks | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/tasks.md` | Present |
| Tasks Review | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/tasks-review.md` | Present (PASS) |
| Workload Guard | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/workload-guard.md` | Present (HUMAN-authorized Chained PRs) |
| Apply 7.5 Testing | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/apply-7.5-testing.md` | Present (PASS) |
| Apply Summary | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/apply-summary.md` | Present (PASS) |
| Verify Direct Fix | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/verify-direct-fix.md` | Present |
| Verify Report | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/verify-report.md` | Present (PASS) |
| Archive Report | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/archive-report.md` | Present (PASS) |

All 10 archived lifecycle artifacts are intact.

## Fresh validator evidence

| Check | Result | Evidence |
|---|---|---|
| SDD validator | PASS | `pnpm sdd:validate` — canonical files, 14 phases, Direct wiring, role map, hybrid persistence, maintainer gates all valid |
| Design validator | PASS | `pnpm sdd:validate:design -- openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/design.md` — 18 sections, A-G topics |
| API typecheck | PASS | `pnpm --filter api exec tsc --noEmit` — exit 0 |
| API lint | PASS | `pnpm --filter api lint` — exit 0 |
| API build | PASS | `pnpm --filter api build` — exit 0 |
| Database scope gate | PASS | `pnpm --filter database generate:scope:verify` — 97 models (79 tenantId, 11 clienteId), generated files current |
| Git diff check | PASS | `git diff --check` — clean (no conflict markers, no whitespace issues) |
| Focused auth/guard/client tests | PASS | `pnpm --filter api test -- --runInBand tenant-auth-boundary.guard.spec.ts tenant-scope.guard.spec.ts permissions.guard.spec.ts client-auth.guard.spec.ts` — 4 suites / 43 passed |
| API-token tests | PASS | `pnpm --filter api test -- --runInBand token-auth.guard.spec.ts` — 1 suite / 7 passed |

## Real-HTTP doorbell deviation (CONDITION, non-blocking)

The 2-suite / 23-test real-HTTP doorbell matrix (`tenant-auth-default-deny.doorbell.spec.ts`, `import-export-tenant-isolation.e2e-spec.ts`) requires disposable `pgvector/pgvector:pg16` on `localhost:55433` and `redis:7-alpine` on `localhost:56379`. These containers were removed after Verify (`verify-direct-fix.md:43-51`); they are confirmed absent in the current runtime. The focused unit suites (43 + 7) pass without them. This is the documented runtime deviation — a harness/infrastructure condition, not a security regression. Doorbell re-execution is not required for Health Report.

## Working Set verification

| Metric | Approved (archive) | Current repository | Match |
|---|---|---|---|
| Production files modified | 9 | 12 tracked modified files (9 production + 3 modified test) | PASS — exact set |
| Test files changed | 5 | 2 untracked created + 3 tracked modified test files | PASS — exact set |
| Total implementation files | 14 | 14 | PASS |
| Bounded deviation files | 0 | 0 | PASS |
| New dependencies | 0 | 0 | PASS |
| Schema/migration files changed | 0 | 0 | PASS |
| Unexpected files | 0 | 0 | PASS |

All 14 Working Set files confirmed present at their exact paths. No file outside the approved set is modified.

## Git boundary

- **Branch:** `sec/secure-default-deny-tenant-auth-boundary` (the authorized Chained PRs delivery branch per `workload-guard.md`; never `main`).
- **Working tree:** 12 tracked modified files, 2 untracked new test files — all within the approved Working Set.
- **Staged changes:** None.
- **Git lifecycle operations:** None performed.
- **Preserved unrelated work:** `openspec/changes/felix-git-repository-setup/` remains untracked and untouched.

## Final P0 security remediation state

The archived evidence and fresh validators confirm the P0 default-deny tenant authentication boundary is complete and consistent:

| Contract element | Status | Evidence |
|---|---|---|
| Default-deny auth | PASS | `verify-report.md:38`; unclassified requests without credentials return 401 |
| Host/actor separation | PASS | `verify-report.md:38`; `TenantResolveMiddleware` owns immutable `hostTenantId` |
| No anonymous `lector` | PASS | `verify-report.md:41`; `PermissionsGuard` requires a principal |
| Explicit `@Public()` allow-list only | PASS | `verify-report.md:40-41`; health, metrics, auth, client-auth/logout, shared-document only |
| Public scope enforcement for authenticated principals | PASS | `verify-report.md:39-40`; V-001 closed by Direct Fix — `TenantScopeGuard` enforces Host scope even on `@Public()` metadata |
| Tenant A/B isolation | PASS | `verify-report.md:42-43`; 22 scenarios / 23 tests executed; cross-tenant access returns 403 before effects |

## Preserved baseline debt versus change-caused issues

| Category | Detail | Classification |
|---|---|---|
| Pre-existing tenant-web test failures | 5 `lucide-react` mock tests fail in tenant-web sidebar (`KNOWN_ISSUES.md`). This change modifies zero frontend files. | BASELINE_DEBT — pre-existing, unrelated, not change-caused |
| Change-caused test failures | None. All focused validators and unit suites pass. | None |
| Change-caused lint/typecheck/build failures | None. All pass. | None |

Baseline debt is preserved as recorded and is not converted into a new implementation task.

## Tenant isolation / public-route / webhook / deferred-token status

| Area | Status | Evidence |
|---|---|---|
| Tenant isolation | PASS — immutable Host resolution, ordinary session scope, identity membership scope, client payload scope all agree with approved boundaries | `verify-report.md:87-89` |
| Public routes | Only explicit `@Public()` allow-list reachable anonymously: health 200, metrics 200, auth check-user 200, auth login 401, client login 401, client register 409, client logout 204, shared-document missing token 404 | `verify-report.md:43`; doorbell matrix |
| Webhooks | `POST /api/v1/communications/webhook/:providerId` and `POST /api/v1/observability/alerts/webhook` remain unannotated, default-denied; 401 before effects. No signed/public contract. Deferred. | `verify-report.md:44`; `design.md:155-157` |
| Deferred API-token scope | `v1-workflows` and `v1-documents` remain `api-token-deferred` classification only. Missing token returns 401. No Host/query/body/path tenant-binding remediation. Explicitly deferred per AR-06. | `verify-report.md:45`; `design.md:157,301` |

## Conditions and follow-up owned outside this change

These are explicitly non-blocking and recorded as deferred; they require separate design or maintainer action:

1. **API-token tenant scope (AR-06):** Body/query/path `tenantId` isolation for public API-token routes is explicitly out of scope. No remediation was performed. Requires separate design.
2. **Webhook/callback admission (AR-07/G):** Unsigned/unregistered webhook candidates remain default-denied. Opening them requires a separately designed signed/stateful contract.
3. **Disposable doorbell re-execution:** Requires re-provisioning `pgvector/pgvector:pg16` at `localhost:55433` and `redis:7-alpine` at `localhost:56379`. The doorbell matrix passed once under Verify; re-execution is a harness/infrastructure condition, not a security regression.
4. **Pre-existing tenant-web test failures:** 5 `lucide-react` mock failures in `KNOWN_ISSUES.md` — BASELINE_DEBT, unrelated, frontend-only, untouched by this change.

## Maintainer-controlled gates

These gates are intentionally manual and are not executed by this Health Report:

| Gate | Status | Maintainer evidence |
|---|---|---|
| Commit | NOT EXECUTED | Pending maintainer action on `sec/secure-default-deny-tenant-auth-boundary` |
| Push | NOT EXECUTED | Pending maintainer action |
| Merge | NOT EXECUTED | Pending maintainer action |
| Release | NOT EXECUTED | Outside 14-phase lifecycle |
| Tag | NOT EXECUTED | Outside 14-phase lifecycle |

## Structured result

```yaml
status: PASS
change: secure-default-deny-tenant-auth-boundary
action: Health Report
role: LOW / OPERATOR-EVIDENCE
artifact: openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/health-report.md
artifacts_consumed:
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/archive-report.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/verify-report.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/apply-summary.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/apply-7.5-testing.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/verify-direct-fix.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/design.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/architecture-review.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/tasks.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/tasks-review.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/workload-guard.md
evidence:
  sdd_validator: PASS
  design_validator: PASS
  api_typecheck: PASS
  api_lint: PASS
  api_build: PASS
  database_scope_gate: PASS (97 models)
  git_diff_check: PASS
  focused_auth_guard_client_tests: PASS (4 suites / 43 passed)
  api_token_tests: PASS (1 suite / 7 passed)
  real_htt_doorbells: CONDITION — disposable PostgreSQL/Redis removed after Verify; confirmed absent; re-execution not required
  working_set: 14 files exact match; 0 deviations; 0 unexpected; 0 new dependencies; 0 schema changes
  branch: sec/secure-default-deny-tenant-auth-boundary (never main)
  git_lifecycle_operations: 0
  p0_security_remediation: complete and consistent
  baseline_debt: 5 pre-existing tenant-web lucide-react mock failures (unrelated, frontend-only, untouched)
conditions:
  - API-token tenant scope (AR-06) explicitly deferred — out of scope
  - Webhook/callback admission (AR-07/G) explicitly deferred — requires separate signed/stateful contract
  - Disposable doorbell re-execution requires re-provisioning pgvector/pg16:55433 and redis:7-alpine:56379
blocked_by: []
manual_gates:
  - Commit
  - Push
  - Merge
  - Release
  - Tag
next: Repository Ready — LOW / OPERATOR-EVIDENCE
```

## Canonical next action

**Repository Ready — LOW / OPERATOR-EVIDENCE.** Produce the bounded repository handoff packet. Health Report must not perform Commit, Push, Merge, Release, Tag, or any Git lifecycle operation.
