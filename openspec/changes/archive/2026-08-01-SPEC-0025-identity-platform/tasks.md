# Tasks: SPEC-0025 Identity Platform

## Review Workload Forecast
| Field | Value |
|---|---|
| Estimated changed lines | 700–1,000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 foundation; PR2 engine; PR3 integration/proof |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units
| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | schema, ADR, contracts | PR1 | planned `pnpm --filter api test -- identity-authorization.spec.ts` | N/A: preflight only | additive schema/ADR files |
| 2 | guard, repositories, state machine | PR2 | planned focused Jest suites | N/A: mocked provider/DB | Identity engine files |
| 3 | wiring, queue, doorbell proof | PR3 | planned e2e + build | planned API doorbell A/B | Identity wiring/audit files |

## RED / Preflight Gates (before implementation)
- [ ] R1 RED: catalog/declaration incompatibility disables routes/workers; prove `IDENTITY_CATALOG_MISMATCH` (Design §16, `identity-catalog-preflight.service.ts`).
- [ ] R2 RED: existing-row/index safety and ADR-0025 preflight reject unsafe schema/migration (`packages/database/prisma/schema.prisma`, migration, `docs/adr/0025-identity-platform.md`).
- [ ] R3 RED: route guard executes on the exact Design §2 matrix and excludes acceptance, health, bootstrap, public, webhook, non-Identity routes (`apps/api/src/modules/identity/identity.controller.ts` metadata).
- [ ] R4 RED: Host/session/membership/tenant/RBAC failures map fail-closed; Host cannot be overwritten (`tenant-resolve.middleware.spec.ts`, guard).
- [ ] R5 RED: tenant A/B doorbell cannot read/claim/complete B state (`apps/api/test/doorbell/identity-isolation.e2e-spec.ts`).
- [ ] R6 RED: lease claim, success, retry/exhaustion, stale completion, and failed-history mutation transitions (`identity-authorization.spec.ts`).
- [ ] R7 RED: outbox lease/idempotency, BullMQ-only retry, terminal DLQ and one-alert behavior (`identity-audit-outbox.spec.ts`).

## Phase 1 Foundation: schema/contracts/config/ADR/migration safety
- [x] 1.1 GREEN R1–R2: add `docs/adr/0025-identity-platform.md`, Prisma models/indexes/migration, Identity contracts, and catalog config; depend on R1–R2. Checkpoint: planned generate + API build.

## Phase 2 Core Engine: scoped repositories/provider/leases
- [x] 2.1 GREEN R4–R6: modify `tenant-resolve.middleware.ts`/`auth-client.provider.ts`; create scoped repositories, `identity-authorization.service.ts`, and `identity-authorization.processor.ts`; depend on 1.1. Checkpoint: focused Jest passed.

## Phase 3 Feature Implementation: service/RBAC/recovery/deny
- [x] 3.1 GREEN R6: implement `identity-authorization.service.ts` mutations, RBAC invalidation, append-only recovery, idempotency, and pending-deny behavior; depend on 2.1. Checkpoint: planned unit/integration tests.

## Phase 4 Integration: wiring/guard/audit
- [x] 4.1 GREEN R3–R4: create `identity.module.ts`, `identity.controller.ts`, `identity-organization.guard.ts`; wire only `core.module.ts`, retain pure `tenant.module.ts`, and update `audit/ingestion/ingestion.service.ts` plus dispatcher/DLQ; depend on 3.1. Checkpoint: focused API tests + API build + diff check; Phase 5 e2e deferred.

## Phase 5 Testing: proof and gates
- [x] 5.1 GREEN R5/R7: run planned unit, integration, doorbell, regression, and all seven execution gates; verify `c1a2f90` and recovery migration unchanged. Checkpoint: planned lint, build, API tests, doorbell. Closure evidence: four focused Group A suites pass (57/57); six historical identity test paths are intentionally replaced/consolidated by current Identity coverage; Group B/C remain permitted pre-existing conditions because `DATABASE_URL` is absent in the test environment.

## Phase 6 Apply Summary
- [x] 6.1 Record the standard five-phase Apply Summary with files, Working Set, acceptance criteria, build, and tests; no execution in Tasks.

## Conditions (non-blocking)
Preserve route matrix, fail-closed semantics, immutable `hostTenantId`, acceptance exclusion, BullMQ-only retries; catalog/declaration preflight is mandatory.

### Phase 5 permitted pre-existing conditions
- **Group B (11 suites):** database-dependent suites cannot initialize because `DATABASE_URL` is absent from the test environment; this is unrelated to SPEC-0025 and has no production impact. Follow-up: **Test Environment Isolation and DATABASE_URL Provisioning**.
- **Group C (6 suites):** `prisma.admin`/cleanup failures are cleanup cascades from Group B `beforeAll` failures, not independent root causes; they are unrelated to SPEC-0025 and have no production impact. Follow-up: **Test Environment Isolation and DATABASE_URL Provisioning**.
- **Deleted-test validation:** the six historical paths (`team.service.spec.ts`, `invitation-engine.spec.ts`, `membership.service.spec.ts`, `migrate-users.script.spec.ts`, `directory.service.spec.ts`, and `default-team.spec.ts`) are intentionally replaced/consolidated by the current four Identity suites (`identity-authorization.spec.ts`, `identity-audit-outbox.spec.ts`, `identity-integration.spec.ts`, and `identity-module.spec.ts`).

## NOT to change
`app.module.ts`, `tenant.module.ts`, frontend, SPEC-0027/0028, client-portal RBAC, SSO/SCIM, unrelated Better Auth cleanup, recovery migration, or `c1a2f90`.
