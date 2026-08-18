# Verify Report: secure-public-api-tenant-binding

> **Phase:** 8 — Verify (fresh retry after the authorized V-001 Direct Fix)
> **Role:** HIGH / ARCHITECT (`openai/gpt-5.6-terra`)
> **Normalized result:** **PASS**

## Entry, recovery, and history

Consumed the approved refined Design, fresh PASS Architecture Review, refined
Tasks, fresh PASS Tasks Review, PASS Workload Guard with HUMAN / MAINTAINER
Chained PR approval, all Apply 7.1–7.5 artifacts, PASS Apply 7.6 Summary, and
the prior Verify report before repository inspection. The Design and Tasks
Working Sets and Read Orders were consumed before bounded implementation,
doorbell, runtime, and changed-path inspection.

The historical first Verify result remains preserved as provenance: it was
**BLOCKED** on V-001 because the original doorbell exercised only an absent ID.
The one permitted Direct Fix changed the approved doorbell and Apply evidence;
this fresh Verify independently inspected and executed the corrected doorbell.
No additional correction, Archive action, or Git lifecycle operation occurred.

## Verdict

**PASS.** The approved Design, Tasks, implementation, and fresh runtime
evidence agree. The corrected real-HTTP doorbell creates actual Tenant A/B
workflow and document fixtures; proves Tenant A same-tenant access; proves
Tenant A access to actual Tenant B IDs is scoped 404 without tenant/resource
disclosure; and proves rejected unsupported mutations leave authoritative Tenant
B workflow/document state unchanged. No production authorization defect or
scope expansion was found.

## Acceptance and tenant-isolation matrix

| Approved requirement | Fresh evidence | Result |
| --- | --- | --- |
| Persisted `ApiKey.tenantId` is sole public authority | `TokenAuthGuard` validates the token before assigning `request.tenantId`/`apiTokenTenantId`; conflicting selector, Host, and pre-existing untrusted tenant context return 403. Focused guard tests passed. | PASS |
| Controllers cannot consume caller tenant authority | Both public-v1 workflow/document list/get handlers pass only trusted `request.tenantId`; the historical A-token/B-query regression is 403. | PASS |
| Auth/status semantics remain distinct | Focused tests cover 401 token failures and 403 scope/conflict behavior. Fresh doorbell confirms missing/revoked 401 and selector/Host 403. | PASS |
| Same-tenant regression | Fresh doorbell returned 200 for Tenant A workflow and document IDs and 200 for Tenant B's independent document list with Token B. | PASS |
| Foreign workflow resource | Fresh doorbell seeded an actual Tenant B workflow definition/instance, requested its instance ID with Token A, received 404, and verified neither Tenant B ID nor workflow ID appears in the response. | PASS |
| Foreign document resource and mapper boundary | Fresh doorbell seeded an actual Tenant B document, requested its document ID with Token A, received 404, and verified neither Tenant B ID nor document ID appears in the response. Controller source translates scoped `null` to 404 before strict mapping. | PASS |
| No mutation / no disclosure | Fresh doorbell issued bounded unsupported `POST` workflow and `DELETE` document probes; each was 404/405. Authoritative Tenant B workflow/document rows read before and after were equal. | PASS |
| Neutral and tenant Host boundary | Fresh doorbell proves neutral `api.crmmaster.com` remains token-bound and conflicting Tenant B Host with Token A is 403. | PASS |
| Default-deny compatibility | Fresh default-deny doorbell passed all 22 scenarios, including the deferred public workflow/document missing-token 401 contract. | PASS |
| Scope, dependencies, and production boundaries | Current implementation paths are seven approved modified production/test paths plus the approved new doorbell. No conditional secondary path, schema/migration, document service/mapper, global guard, token-management, dependency, `.env`, runtime/infrastructure, persistent Redis, or `crm_test.public` change/use was found. | PASS |

## Fresh execution evidence

| Command / check | Result | Evidence |
| --- | --- | --- |
| `pnpm --filter api test -- public-api-cross-tenant-isolation token-auth.guard v1-workflows.controller v1-documents.controller public-api-full-flow public-api-scope-enforcement` | PASS | Exit 0; 6 suites, 47 tests passed. |
| `pnpm --filter api lint` | PASS | Exit 0. |
| `pnpm --filter api build` | PASS | Exit 0. |
| `pnpm --filter api exec tsc --noEmit` | PASS | Exit 0. |
| `pnpm sdd:validate:design -- openspec/changes/secure-public-api-tenant-binding/design.md` | PASS | Exit 0; canonical 18 sections, A–G topics, decision/rationale separation, and Working Set structure validated. |
| `pnpm sdd:validate` | PASS | Exit 0; canonical workflow, local Direct wiring, logical roles, hybrid persistence, and maintainer gates validated. |
| `git diff --check` | PASS | Exit 0; no whitespace errors. |
| Fresh public binding doorbell | PASS | Disposable authenticated Redis and disposable pgvector PostgreSQL; 1 suite, 5 tests, 0 skipped. Actual A/B workflow/document fixtures and V-001 assertions executed. |
| Fresh default-deny doorbell | PASS | Same disposable harness; 1 suite, 22 tests, 0 skipped. |
| Disposable fixture boundary and cleanup | PASS | Fresh harness generated ephemeral credentials, enabled `vector` only in the disposable database, used database `secure_public_api_tenant_binding/public`, and removed both uniquely named Verify containers. Post-run inspection found neither container; persistent `crm-master-redis` was not used or changed. |

The two e2e Jest invocations emitted the repository's existing one-second
open-handle warning after completion, but both exited 0 with all 27 scenarios
executed. It is recorded as a non-blocking runner condition, not a failed or
skipped scenario.

## Scope and production-defect review

Source inspection confirms the production correction is limited to the approved
guard and two public-v1 controllers: token authority is server-derived, selector
and Host conflicts fail before handler execution, workflow lookup uses the
trusted tenant, and document scoped absence becomes 404 before `toV1()`. The
runtime foreign-ID tests exercise those production paths against actual separate
tenant records. No production authorization defect was exposed by the Direct
Fix; the Direct Fix itself is test/evidence-only and does not alter production
authorization code.

## Findings

None. Historical V-001 is closed by fresh runtime evidence; no new blocker,
scope deviation, undeclared dependency, tenant-isolation failure, or relevant
baseline debt was found.

## Canonical next action

Per `docs/SDD-WORKFLOW.md:102-105`, a PASS Verify advances to **Phase 9 —
Archive**. Archive is a separate LOW / OPERATOR-EVIDENCE action. Do not perform
Archive or maintainer Git operations in this Verify action.

```yaml
status: PASS
change: secure-public-api-tenant-binding
phase: Verify
role: HIGH
evidence:
  - approved Design, Architecture Review, Tasks, Tasks Review, Workload Guard/HUMAN approval, full Apply artifacts, Apply Summary, and Direct Fix evidence consumed
  - V-001 fresh runtime proof: actual Tenant A/B workflow and document fixtures; A same-tenant 200; A-to-actual-B scoped 404/no disclosure; rejected mutation probes; B pre/post state equal
  - fresh doorbells: 2 serial suites, 27/27 tests, 0 skipped; disposable authenticated Redis and pgvector PostgreSQL cleanup PASS
  - changed-path and source inspection confirms approved scope and no production authorization, schema, migration, runtime, infrastructure, secret, persistent Redis, or crm_test.public use/change
findings: []
validators:
  - focused API suites: PASS (exit 0, 6 suites / 47 tests)
  - public tenant-binding doorbell: PASS (exit 0, 1 suite / 5 tests)
  - default-deny doorbell: PASS (exit 0, 1 suite / 22 tests)
  - pnpm --filter api lint: PASS (exit 0)
  - pnpm --filter api build: PASS (exit 0)
  - pnpm --filter api exec tsc --noEmit: PASS (exit 0)
  - pnpm sdd:validate:design: PASS (exit 0)
  - pnpm sdd:validate: PASS (exit 0)
  - git diff --check: PASS (exit 0)
next: Archive (Phase 9) by LOW / OPERATOR-EVIDENCE; no Archive or Git operation in this Verify action
```
