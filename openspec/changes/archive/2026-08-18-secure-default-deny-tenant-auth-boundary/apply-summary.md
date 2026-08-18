# Apply Summary: Secure Default-Deny Tenant Authentication Boundary

> **Nested Apply:** 7.1 Foundation → 7.2 Core Engine → 7.3 Feature Implementation → 7.4 Integration → 7.5 Testing → 7.6 Apply Summary
> **Status:** PASS — all Apply substeps 7.1–7.6 completed.
> **Role:** MID / BUILDER
> **Persistence:** hybrid

## Boundary and provenance

This summary consumes the approved Design, final PASS Tasks Review, HUMAN-
authorized Workload Guard, exact Working Set/Read Order, the prior Apply
checkpoint, and `apply-7.5-testing.md`. It consolidates only Apply evidence.
Verify, Archive, Health Report, Repository Ready, and every Git lifecycle
operation remain unexecuted. Design, Architecture Review, Tasks, Workload
Guard, production code, and tests were not modified by 7.6.

## Changed files

### Approved production Working Set — 9

- `apps/api/src/common/decorators/public.decorator.ts`
- `apps/api/src/common/guards/better-auth.guard.ts`
- `apps/api/src/common/guards/tenant-scope.guard.ts`
- `apps/api/src/common/guards/permissions.guard.ts`
- `apps/api/src/modules/client-auth/client-auth.guard.ts`
- `apps/api/src/modules/client-auth/client-auth.controller.ts`
- `apps/api/src/modules/export/export.controller.ts`
- `apps/api/src/modules/public-api/v1/v1-workflows.controller.ts`
- `apps/api/src/modules/public-api/v1/v1-documents.controller.ts`

### Approved test Working Set — 5

- `apps/api/src/common/guards/tenant-auth-boundary.guard.spec.ts` (created)
- `apps/api/src/common/guards/tenant-scope.guard.spec.ts`
- `apps/api/src/common/guards/permissions.guard.spec.ts`
- `apps/api/src/modules/client-auth/client-auth.guard.spec.ts`
- `apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts` (created)

The existing identity doorbell was consumed as evidence and was not modified.
No bounded-deviation files, dependencies, schema/migration files, runtime
configuration, or infrastructure files were changed. Pre-existing untracked
change artifacts, including `openspec/changes/felix-git-repository-setup/`,
were preserved and are not part of this change.

## RED → GREEN → REFACTOR evidence

| Substep | RED | GREEN | REFACTOR | Result |
|---|---|---|---|---|
| 7.1 Foundation | Focused metadata test failed because `AUTH_BOUNDARY_KEY`, `AuthBoundaryKind`, and `ExternalAuth` were absent | `tenant-auth-boundary.guard.spec.ts`: 1 suite / 5 tests passed | Metadata plus `public.decorator.spec.ts`: 2 suites / 9 tests passed | PASS |
| 7.2 Core Engine | Focused guard additions failed for default-deny, immutable Host, no-`lector`, and client mismatch; bounded provider mock isolated the existing Jest ESM boundary | Four guard suites: 4 suites / 36 tests passed | Same focused matrix after classified-scope setup correction: 4 suites / 36 tests passed | PASS |
| 7.3 Feature Implementation | Route classification assertions failed for four unclassified routes; 8 existing tests passed | Classification suite: 1 suite / 12 tests passed | Four authority suites: 4 suites / 40 tests passed | PASS |
| 7.4 Integration | Integration assertions were exercised against the existing identity doorbell and the new real-HTTP route matrix before acceptance | Existing identity export plus default-deny doorbells passed through the wired global/controller chain; 2 suites / 23 tests | Fixture diagnostics removed, exact Host headers and valid route-contract fixtures retained; no assertion weakening | PASS |
| 7.5 Testing | First complete real-HTTP run failed only at the bounded fixture boundary: missing Host headers and invalid empty client-register fixture | Serial complete doorbell command: 2 suites / 23 tests / 0 skipped | Corrected fixtures, removed diagnostics, and reran the complete matrix | PASS |

7.4 integration evidence is retained in the exact 7.5 runtime record because
the integration boundary is the wired HTTP path and no separate production
integration artifact was created.

## Security matrix and acceptance evidence

The complete matrix executed **23 tests covering 22 scenarios**, with **23
passed, 0 skipped, and 0 unseeded**. Anonymous tenant data and mutation routes
(tenant clients, workflow definitions, plugins, documents, billing, and
communications) returned 401 before effects. Host-only access returned 401.
Same-tenant client access returned 200; insufficient client role returned 403;
Tenant A client on Tenant B Host returned 403 with Host authoritative and no
effect. Identity export proved 401 anonymous, 200 same Host, and 403 cross
Host with unchanged forged-import counts.

The explicit public allow-list remained reachable: health 200, metrics 200,
auth check-user 200, auth login 401, client login 401, duplicate client
register 409, client logout 204, and shared-document missing token 404.
Communications and observability webhooks without signature/auth returned 401
before handler effects. Deferred workflow and document API-token routes without
tokens returned 401; no tenant-binding redesign was asserted.

Public metadata is only an explicit authentication-boundary allow-list. It does
not bypass tenant scope, permissions, resource checks, or webhook signature
verification. Webhook contracts remain exact: `POST
/api/v1/communications/webhook/:providerId` preserves the existing
`WebhookHandler`/`ProviderRegistry` signature path, while
`POST /api/v1/observability/alerts/webhook` has no approved public or signed
contract. Both remain default-denied/deferred and were not converted to generic
public routes.

## Host and guard chain

`TenantResolveMiddleware` owns immutable `hostTenantId`; Host selects tenant
context but is never actor authority. Ordinary routes use
`BetterAuthGuard → TenantScopeGuard → PermissionsGuard → protected resource`.
Classified routes bypass only the global Better Auth/Tenant Scope path and hand
off to their named owner: `IdentityOrganizationGuard`, `ClientAuthGuard`, or
the existing token guards. Identity membership compares to Host; client signed
payload tenant compares to Host without overwriting `request.tenantId`; caller
tenant IDs are not authority; missing principals never inherit `lector`.

The preserved contracts are: default-deny tenant authentication; no anonymous
lector/default permissions; explicit `@Public()` only; identity-session,
client-session, and api-token-deferred classifications; existing admin and
webhook behavior; and no public API-token tenant-binding redesign.

## Runtime deviations, rollback, and scope

- Disposable PostgreSQL: `pgvector/pgvector:pg16`, database `doorbell`, port
  `55433`; schema pushed from the existing Prisma schema and vector extension
  enabled. Disposable Redis: `redis:7-alpine`, port `56379`.
- The first concurrent doorbell run exceeded disposable PostgreSQL connection
  capacity. This was a bounded harness deviation, not a security failure.
  The same scenarios were rerun serially with Jest `--runInBand` and all
  passed. No production or infrastructure file changed.
- Rollback was not executed. Maintainer-only rollback is limited to the exact
  substep file sets in `tasks.md`; it must not touch unrelated work or simulate
  a Git lifecycle operation.
- No unexpected implementation files or dependencies were introduced. No
  scope expansion occurred. Apply would have stopped and returned to HUMAN for
  unrelated resources, API-token tenant redesign, webhook opening, schema or
  runtime changes, broad permission redesign, unapproved guard reordering,
  public-contract changes, or files outside the Working Set.

## Validators and gates

| Gate | Exact result |
|---|---|
| Focused auth/guard/client tests | PASS — 4 suites / 40 tests |
| Deferred API-token guard tests | PASS — 1 suite / 7 tests |
| Real HTTP doorbells | PASS — 2 suites / 23 tests / 0 skipped / 0 unseeded |
| API typecheck | PASS — `pnpm --filter api exec tsc --noEmit` |
| API lint | PASS — `pnpm --filter api lint` |
| API build | PASS — `pnpm --filter api build` |
| Database scope gate | PASS — `pnpm --filter database generate:scope:verify`, 97 models |
| SDD validator | PASS — `pnpm sdd:validate` |
| Design validator | PASS — `pnpm sdd:validate:design -- openspec/changes/secure-default-deny-tenant-auth-boundary/design.md` |
| Diff check | PASS — `git diff --check` |

## Working Set metrics

| Metric | Result |
|---|---:|
| Approved production files modified | 9 |
| Approved test files changed | 5 |
| Total implementation files changed | 14 |
| Bounded deviation files | 0 |
| New dependencies | 0 |
| Schema/migration files changed | 0 |
| Git lifecycle operations | 0 |
| Security scenarios executed | 22 |
| Tests passed / skipped / unseeded | 23 / 0 / 0 |
| Apply substeps completed | 7.1–7.6 |

## Structured result

```yaml
status: PASS
change: secure-default-deny-tenant-auth-boundary
phase: Apply 7.6 Apply Summary
role: MID / BUILDER
completed_substeps: [7.1, 7.2, 7.3, 7.4, 7.5, 7.6]
files_changed: 14
unexpected_files: []
bounded_deviations:
  - disposable PostgreSQL connection capacity required serial --runInBand rerun
security_scenarios:
  executed: 22
  tests_passed: 23
  skipped: 0
  unseeded: 0
validators: PASS
rollback: not executed; maintainer-only boundaries recorded
next: Verify — HIGH / ARCHITECT
```

## Canonical next action

**Verify — HIGH / ARCHITECT.** Verification must be fresh and independent; this
MID / BUILDER Apply execution does not self-approve Verify.
