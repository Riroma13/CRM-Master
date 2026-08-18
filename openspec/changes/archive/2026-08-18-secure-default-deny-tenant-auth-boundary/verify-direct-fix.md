# Verify Direct Fix: Secure Default-Deny Tenant Authentication Boundary

> **Action:** Verify Direct Fix
> **Change:** `secure-default-deny-tenant-auth-boundary`
> **Role:** Orchestrator-owned correction
> **Persistence:** hybrid
> **Prior Verify evidence:** `verify-report.md` preserved unchanged

## Boundary

This is the single permitted correction after the initial BLOCKED Verify. It
fixes only V-001 and V-002. Design, Architecture Review, Tasks, Tasks Review,
Workload Guard, Apply artifacts, and the blocked Verify report were not
rewritten. No other lifecycle phase, agent, or Git lifecycle operation was
invoked.

## V-001 — Public authentication versus tenant scope

### Correction

`TenantScopeGuard` no longer returns immediately for `@Public()` metadata. It
continues to enforce Host scope whenever an authenticated principal is present,
including rejecting a principal whose tenant differs from immutable
`hostTenantId`. Anonymous explicitly public routes remain reachable only when
there is no scoped principal, preserving the existing health, metrics, auth,
client-auth, logout, and shared-document contracts. Classified `ExternalAuth`
routes retain their named guard hand-offs.

### Regression proof

- Public metadata with a mismatched authenticated tenant is rejected with 403.
- Anonymous public metadata remains admitted for routes without an applicable
  authenticated scope.
- Permissioned public-marked requests still fail without a principal through
  `PermissionsGuard`.
- Webhook controllers remain unannotated and default-denied; no signature path
  was bypassed or changed.
- Existing `BetterAuthGuard` public allow-list behavior and all classified
  identity/client/token hand-offs remain unchanged.

## V-002 — Disposable real-HTTP runtime

Provisioned and removed disposable-only containers:

- PostgreSQL `pgvector/pgvector:pg16` as `doorbell` on `localhost:55433`.
- Redis `redis:7-alpine` on `localhost:56379`.
- Enabled `vector` only inside the disposable PostgreSQL database and pushed
  the existing Prisma schema there. No repository runtime or infrastructure
  file changed.

Exact independent serial command:

```bash
DATABASE_URL='postgresql://doorbell:doorbell@localhost:55433/doorbell?schema=public' \
REDIS_URL='redis://localhost:56379' \
pnpm --filter api test:e2e --runInBand -- \
  tenant-auth-default-deny.doorbell.spec.ts import-export-tenant-isolation.e2e-spec.ts
```

Result: **2 suites passed, 23 tests passed, 0 skipped, 0 unseeded**. The
containers were removed after execution.

## Validation evidence

| Check | Result |
|---|---|
| Public/scope and focused auth matrix | PASS — 4 suites / 43 tests |
| API-token tests | PASS — 1 suite / 7 tests |
| Exact real-HTTP doorbell command | PASS — 2 suites / 23 tests / 0 skipped / 0 unseeded |
| API typecheck | PASS — `pnpm --filter api exec tsc --noEmit` |
| API lint | PASS — `pnpm --filter api lint` |
| API build | PASS — `pnpm --filter api build` |
| Database scope gate | PASS — `pnpm --filter database generate:scope:verify` |
| SDD validator | PASS — `pnpm sdd:validate` |
| Design validator | PASS — `pnpm sdd:validate:design -- openspec/changes/secure-default-deny-tenant-auth-boundary/design.md` |
| Diff check | PASS — `git diff --check` |

## Scope and provenance

Direct-fix files changed:

- `apps/api/src/common/guards/tenant-scope.guard.ts`
- `apps/api/src/common/guards/tenant-scope.guard.spec.ts`
- `apps/api/src/common/guards/tenant-auth-boundary.guard.spec.ts`

Unexpected files: none. New dependencies: none. Schema/migration files:
none. Runtime/infrastructure repository files: none. Pre-existing Apply files
and unrelated `openspec/changes/felix-git-repository-setup/` were preserved.

## Structured result

```yaml
status: READY
change: secure-default-deny-tenant-auth-boundary
action: Verify Direct Fix
artifacts:
  - openspec/changes/secure-default-deny-tenant-auth-boundary/verify-report.md
  - openspec/changes/secure-default-deny-tenant-auth-boundary/verify-direct-fix.md
files_changed:
  - apps/api/src/common/guards/tenant-scope.guard.ts
  - apps/api/src/common/guards/tenant-scope.guard.spec.ts
  - apps/api/src/common/guards/tenant-auth-boundary.guard.spec.ts
unexpected_files: []
dependencies: []
evidence:
  - V-001 public authentication/scope distinction fixed and regression-tested
  - V-002 disposable PostgreSQL/Redis runtime provisioned and cleaned up
  - exact real-HTTP matrix: 2 suites / 23 passed / 0 skipped / 0 unseeded
  - focused auth matrix: 4 suites / 43 passed
  - API token tests: 1 suite / 7 passed
  - typecheck, lint, build, database scope, SDD, Design, and diff checks: PASS
blocked_by: []
next: Verify — HIGH / ARCHITECT
```
