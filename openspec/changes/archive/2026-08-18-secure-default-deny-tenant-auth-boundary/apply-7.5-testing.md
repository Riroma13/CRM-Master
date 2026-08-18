# Apply 7.5 Testing Evidence: Secure Default-Deny Tenant Authentication Boundary

> **Nested Apply:** 7.5 Testing only
> **Status:** PASS
> **Role:** MID / BUILDER
> **Persistence:** hybrid

## Boundary and scope

- Consumed the current Apply checkpoint, approved Design, final PASS Tasks
  Review, Workload Guard authorization, and exact Tasks Working Set/Read Order.
- 7.1–7.4 were complete before this substep. 7.6 Apply Summary, Verify,
  Archive, and all Git lifecycle operations were not executed.
- No production security behavior, status code, public route semantics,
  webhook contract, API-token tenant binding, schema, runtime configuration,
  or guard ordering was changed.
- The only implementation Working Set change was the approved missing
  `apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts` fixture.
  The existing import/export doorbell was not modified.

## RED → GREEN → REFACTOR evidence

| Cycle | Evidence | Result |
|---|---|---|
| RED | New real-HTTP matrix was authored before acceptance execution. The first run exposed bounded fixture defects (missing Host headers on table-driven requests and an invalid empty client-register fixture); no production path was weakened. | FAIL at test-fixture boundary; no security scenario was accepted as skipped. |
| GREEN | `DATABASE_URL=postgresql://doorbell:doorbell@localhost:55433/doorbell?schema=public REDIS_URL=redis://localhost:56379 pnpm --filter api test:e2e --runInBand -- tenant-auth-default-deny.doorbell.spec.ts import-export-tenant-isolation.e2e-spec.ts` | PASS: 2 suites / 23 tests / 0 skipped. |
| REFACTOR | Removed diagnostic output, corrected all requests to set the exact Host, used valid route-contract fixtures, and reran the complete doorbell plus focused unit matrix. | PASS; no production change and no assertion weakening. |

## Executed security matrix

| Scenario | Method / route | Host / auth | Expected → actual | No-effect evidence | Result |
|---|---|---|---|---|---|
| Tenant data anonymous denial | GET `/api/v1/tenant/clientes` | Tenant A / anonymous | 401 → 401 | Cliente count unchanged | PASS |
| Workflow anonymous mutation denial | POST `/api/v1/workflow/definitions` | Tenant A / anonymous | 401 → 401 | Cliente count unchanged | PASS |
| Plugins anonymous mutation denial | POST `/api/v1/plugins/install` | Tenant A / anonymous | 401 → 401 | Cliente count unchanged | PASS |
| Documents anonymous mutation denial | POST `/api/v1/tenant/documentos` | Tenant A / anonymous | 401 → 401 | Cliente count unchanged | PASS |
| Billing anonymous mutation denial | POST `/api/v1/tenant/pagos/forged/10` | Tenant A / anonymous | 401 → 401 | Cliente count unchanged | PASS |
| Communications anonymous mutation denial | POST `/api/v1/communications/client-a` | Tenant A / anonymous | 401 → 401 | Cliente count unchanged | PASS |
| Host-only authority | GET `/api/v1/tenant/clientes` | Valid Tenant A Host / anonymous | 401 → 401 | Handler not reached | PASS |
| Same-tenant approved client access | GET `/api/v1/client/me` | Tenant A / valid Tenant A client cookie | 200 → 200 | Returned seeded Tenant A client | PASS |
| Insufficient client role | GET `/api/v1/client/me` | Tenant A / client cookie with admin role | 403 → 403 | No client principal/handler result | PASS |
| Client Tenant A → Tenant B | GET `/api/v1/client/me?tenantId=A` and forged path/body probe | Tenant B / Tenant A client cookie | 403 → 403 (path probe 404/403) | No client principal; Host remains authoritative | PASS |
| Health public contract | GET `/api/v1/health` | Tenant A / anonymous | 200 → 200 | Explicit `@Public()` contract | PASS |
| Metrics public contract | GET `/metrics` | Tenant A / anonymous | 200 → 200 | Explicit `@Public()` contract | PASS |
| Auth check-user public contract | POST `/api/v1/auth/check-user` | Tenant A / anonymous | 200 → 200 | Route-specific response | PASS |
| Auth login public contract | POST `/api/v1/auth/login` | Tenant A / anonymous | 401 → 401 | Route reached; login contract preserved | PASS |
| Auth client login public contract | POST `/api/v1/client/auth/login` | Tenant A / anonymous | 401 → 401 | Route reached; login contract preserved | PASS |
| Client register public contract | POST `/api/v1/client/auth/register` | Tenant A / anonymous | 409 → 409 | Duplicate fixture rejected by route contract | PASS |
| Client logout public contract | POST `/api/v1/client/auth/logout` | Tenant A / anonymous | 204 → 204 | Explicit public route | PASS |
| Shared-document token public contract | GET `/api/v1/shared/missing-token` | Tenant A / anonymous | 404 → 404 | Route-specific missing-token result | PASS |
| Communications webhook | POST `/api/v1/communications/webhook/provider-a` | Tenant A / anonymous, no signature | 401 → 401 | Handler/signature path not reached | PASS |
| Observability webhook | POST `/api/v1/observability/alerts/webhook` | Tenant A / anonymous, no signature | 401 → 401 | Alert effect not reached | PASS |
| Deferred workflow API token | GET `/api/v1/public/workflows` | Tenant A / no API token | 401 → 401 | Admission only; no tenant binding claim | PASS |
| Deferred document API token | GET `/api/v1/public/documents` | Tenant A / no API token | 401 → 401 | Admission only; no tenant binding claim | PASS |
| Identity export Tenant A/B | GET/export and POST/import | Existing Better Auth identity session; Host B then Host A | 401/200/403 → 401/200/403 | Cross-tenant import denied; forged CSV count unchanged | PASS |

**Matrix proof:** 22 scenarios in the new doorbell plus the existing identity
doorbell: 23 executed tests, 23 passed, 0 skipped, 0 unseeded. Unit authority
tests add no-`lector`, immutable Host, classification, same-tenant, and
insufficient-principal coverage.

## Gate evidence

| Gate | Exact result |
|---|---|
| Focused auth/guard/client tests | PASS — 4 suites / 40 tests |
| Deferred API-token guard tests | PASS — 1 suite / 7 tests |
| Real HTTP doorbells | PASS — 2 suites / 23 tests / 0 skipped |
| API typecheck | PASS — `pnpm --filter api exec tsc --noEmit` |
| API lint | PASS — `pnpm --filter api lint` |
| API build | PASS — `pnpm --filter api build` |
| Shared database scope gate | PASS — `pnpm --filter database generate:scope:verify`, 97 models |
| SDD validator | PASS — `pnpm sdd:validate` |
| Design validator | PASS — `pnpm sdd:validate:design -- openspec/changes/secure-default-deny-tenant-auth-boundary/design.md` |
| Diff check | PASS — `git diff --check` |

## Runtime dependencies and deviations

- Disposable PostgreSQL: `pgvector/pgvector:pg16`, database `doorbell`, host
  port `55433`; schema pushed from the existing Prisma schema and the vector
  extension enabled. The disposable database was not the repository database.
- Disposable Redis: `redis:7-alpine`, host port `56379`, no authentication.
- The first concurrent two-doorbell invocation exceeded the disposable
  PostgreSQL connection capacity. This was a bounded harness execution issue,
  not a security failure; the approved scenarios were rerun serially with
  Jest `--runInBand` and all passed. No production or infrastructure file was
  changed.
- Unexpected implementation files: none. New dependencies: none. Schema or
  migration files: none. Git lifecycle operations: none.

## Rollback boundary

Maintainer-only and not executed: remove only
`apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts` for this
7.5 test fixture. Existing user changes and all prior Apply files remain
untouched.

## Structured result

```yaml
status: PASS
change: secure-default-deny-tenant-auth-boundary
phase: Apply 7.5 Testing
role: MID / BUILDER
completed_substeps:
  - 7.5 RED matrix execution
  - 7.5 GREEN security acceptance
  - 7.5 REFACTOR bounded fixture cleanup
files_changed:
  - apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts
unexpected_files: []
security_scenarios:
  executed: 23
  passed: 23
  skipped: 0
  unseeded: 0
blockers: []
next: Apply 7.6 Apply Summary
```
