# Apply 7.5 Testing Evidence

> Nested Apply: 7.5 Testing
> Historical initial status: BLOCKED — required real HTTP evidence unavailable
> Executor: MID / BUILDER — project-local Direct wiring

> **Current status: PASS — bounded disposable Redis correction completed**

## Authorized bounded correction

HUMAN / MAINTAINER authorized one disposable Redis harness correction only. The
correction provisions a separately named, authentication-required local Redis
container with an ephemeral credential held only in the test-process shell,
injects its authenticated URL directly into the e2e command, proves unauthenticated
rejection and authenticated success, and removes the container and credential on
all exit paths. No application, production/runtime Redis configuration, `.env`,
persistent `crm-master-redis`, schema, migration, guard, token policy, or
unrelated file may be changed. The existing API-unit-to-e2e runner choice is a
strictly necessary mechanical command deviation because `jest.config.js` roots
only `src`; this deviation is recorded before execution.

## Historical blocked attempt (preserved)

The original blocked evidence below is retained unchanged as the historical
checkpoint that authorized this single correction.

## RED → GREEN → REFACTOR

| Stage | Evidence | Result |
|---|---|---|
| RED | Created `public-api-tenant-binding.doorbell.spec.ts` with A/B HTTP, Host, selector, 401/403/404, no-disclosure, no-mutation, and revocation cases before acceptance execution | PASS |
| GREEN | Historical exact unit focused command passed: 6 suites / 47 tests. The initial doorbell e2e startup timed out before tests ran | BLOCKED — historical |
| REFACTOR | API lint/build/validators passed; no assertion weakening or production refactor was made | PASS |

## Corrected required doorbell evidence

The API unit Jest command was not used for doorbells because its configured
roots are `src`; the project e2e Jest harness was the necessary bounded command
deviation. Both suites were run serially with `--runInBand`.

## V-001 Direct Fix correction

This is the single orchestrator-owned Direct Fix after the first BLOCKED Verify.
Only `apps/api/test/doorbell/public-api-tenant-binding.doorbell.spec.ts` and
canonical Apply evidence were changed. Production authorization code,
controllers/services/mappers, schema/migrations, infrastructure, secrets,
`.env`, persistent `crm-master-redis`, and `crm_test.public` were not used or
changed.

The doorbell now creates runtime-isolated Tenant A and Tenant B fixtures in a
disposable PostgreSQL database (`secure_public_api_tenant_binding/public`,
`pgvector/pgvector:pg16`): one workflow definition plus instance and one
document per tenant. Tenant A's token retrieves its actual workflow/document
with 200. Tenant A's token requests the actual Tenant B workflow instance ID
and document ID and receives 404 for both; response bodies contain neither the
Tenant B tenant ID nor the foreign resource IDs.

Public v1 workflow/document controllers expose read-only GET routes only. The
test records bounded unsupported mutation probes (`POST` workflow and `DELETE`
document) from Tenant A; each returned 404/405, and authoritative Tenant B
workflow/document rows queried before and after were exactly equal. This is the
bounded no-mutation evidence for the absence of a supported public mutation
surface.

| Evidence | Exact result |
|---|---|
| Disposable Redis | PASS — container `crm-master-secure-public-api-tenant-binding-redis`, image `redis:7-alpine`, runtime host port `32781`; persistent `crm-master-redis` was not stopped, reused, or modified |
| Unauthenticated Redis access | PASS — `redis-cli ping` returned `NOAUTH Authentication required` |
| Authenticated Redis access | PASS — `redis-cli -a <ephemeral> --no-auth-warning ping` returned `PONG`; credential was generated in the harness, never printed or persisted, and was unset on cleanup |
| `pnpm --filter api exec jest --config jest-e2e.json --runInBand test/doorbell/public-api-tenant-binding.doorbell.spec.ts` | PASS — 1 suite / 5 tests / 0 skipped |
| `pnpm --filter api exec jest --config jest-e2e.json --runInBand test/doorbell/tenant-auth-default-deny.doorbell.spec.ts` | PASS — 1 suite / 22 tests / 0 skipped |
| Disposable Redis cleanup | PASS — EXIT cleanup removed the named container and unset the ephemeral credential; persistent `crm-master-redis` remained running |
| V-001 disposable PostgreSQL | PASS — named ephemeral `crm-master-secure-public-api-tenant-binding-postgres`, pgvector enabled only to satisfy the repository schema, database `secure_public_api_tenant_binding`, schema `public`; removed by EXIT cleanup |
| V-001 fixture/state evidence | PASS — actual Tenant B workflow/document IDs returned scoped 404/no disclosure; Tenant B authoritative workflow/document pre/post rows equal after rejected mutation probes |

All 27 real-HTTP doorbell scenarios executed and passed. The Jest runner emitted
its existing one-second open-handle warning after each suite, but both commands
returned exit 0 and no scenario was skipped.

The disposable PostgreSQL/Redis setup command generated credentials at runtime,
created the named containers, enabled only the required `vector` extension in
the disposable database, ran `pnpm --filter @crm-master/database db:push --
--skip-generate`, then ran the two exact serial Jest commands above. EXIT cleanup
removed both named containers and unset credentials; post-run Docker inspection
found neither container, while persistent services remained running.

## Original blocked command evidence (preserved)

| Command | Exact result |
|---|---|
| `pnpm --filter api test -- public-api-tenant-binding.doorbell` | FAIL — API unit Jest roots only `src`; 0 tests found |
| `pnpm --filter api test -- tenant-auth-default-deny.doorbell` | Not reached in chained command after first 0-test failure |
| Bounded e2e retry with `jest-e2e.json` | BLOCKED — AppModule hooks exceeded 30s; BullMQ repeatedly emitted `NOAUTH Authentication required` |
| Existing default-deny via e2e config | BLOCKED — same AppModule/Redis `NOAUTH` startup timeout |

The original blocked attempt had **0 executed scenarios**; that historical
record is preserved above. The corrected run below executed all required
scenarios and does not rewrite the historical Verify finding.

## Work Unit Evidence — current correction

| Evidence | Result |
|---|---|
| Focused test | 6 suites / 47 unit+integration tests passed |
| Runtime harness | PASS — authenticated disposable Redis; 2 serial doorbell suites / 27 tests / 0 skipped |
| Validators | PASS — `pnpm --filter api lint`, `pnpm --filter api build`, `pnpm --filter api exec tsc --noEmit`, `pnpm sdd:validate:design -- openspec/changes/secure-public-api-tenant-binding/design.md`, `pnpm sdd:validate`, and `git diff --check` |
| Tenant-isolation evidence | PASS — actual B workflow/document fixtures; A-token 404/no-disclosure; B workflow/document pre/post state unchanged after rejected mutation probes |
| Rollback boundary | Remove only the corrected doorbell and revert approved public API implementation/tests; preserve unrelated work |

## Files

- Created `apps/api/test/doorbell/public-api-tenant-binding.doorbell.spec.ts`.
- Existing `tenant-auth-default-deny.doorbell.spec.ts` preserved unchanged.

## Historical blocker (closed)

The initial blocker was the missing authenticated disposable Redis endpoint. It
was closed by the authorized harness correction without changing production
Redis configuration.

The V-001 runtime correction also required a disposable PostgreSQL instance
because the existing shell target was `crm_test.public`, which is explicitly
out of bounds. The disposable pgvector database was provisioned for the test
run, schema-pushed, used only for fixtures, and removed on EXIT. An initial
plain PostgreSQL disposable attempt failed because the schema requires the
`vector` extension; no test was weakened, and the final pgvector run passed.

## Canonical next action

Proceed to fresh HIGH Verify for V-001. This executor does not start Verify.
