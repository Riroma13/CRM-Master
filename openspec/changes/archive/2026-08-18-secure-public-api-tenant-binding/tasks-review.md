# Tasks Review: secure-public-api-tenant-binding

> **Normalized result:** BLOCKED
> **Action:** Phase 5 — Tasks Review
> **Role:** MID / BUILDER
> **Model binding:** `openai/gpt-5.6-luna` (`.opencode/sdd-model-map.json:13-16,33-36,55-57`)
> **Persistence:** hybrid; this file is the exact repository artifact.

## Review boundary and provenance

Consumed the approved refined Design, its Working Set and Read Order, the
complete `tasks.md`, the preserved Architecture Review including the fresh
PASS retry, `docs/SDD-WORKFLOW.md`, `docs/architecture/sdd-direct.md`, and
`.opencode/sdd-model-map.json`. The approved Working Set and Read Order were
consumed before any bounded additional reads. No Design, `tasks.md`,
production/test file, unrelated active change, Workload Guard, Apply, or Git
lifecycle operation was changed or started.

The fresh Architecture Review PASS is accepted as the preceding gate. This
review is limited to whether `tasks.md` is complete and executable under the
refined Design; it does not reopen AR-001 or redesign the approved solution.

## Gate verdict

**BLOCKED.** The task intent is aligned with the refined tenant-binding Design,
but the artifact does not yet provide recoverable task-level evidence for the
approved file boundaries, strict RED-first security matrix, dependency-complete
TDD sequence, or the >400-line workload contract. Under
`docs/SDD-WORKFLOW.md:99-105,124-158`, the only ordinary next action is the one
conditional **Tasks Refinement**.

## Findings

| ID | Status | Finding | Evidence | Required correction in the one permitted refinement |
|---|---|---|---|---|
| TR-001 | **BLOCKER** | The Working Set and Read Order are shorthand, not an independently recoverable path/action inventory. The task artifact does not enumerate each approved primary and conditional secondary file with its exact action, preservation boundary, and ordered position. | `tasks.md:19-23`; Design §§5–6 (`design.md:41-93`) | Copy the exact approved paths, actions, conditional-read rule, preserved exclusions, and numbered Read Order into `tasks.md`; map every task to that inventory without broadening it. |
| TR-002 | **BLOCKER** | RED coverage is descriptive but not a complete recoverable route/method/status/no-effect matrix. It does not explicitly identify the four workflow/document handlers, representative list/get requests, selector locations, Host variants, document-null-before-mapper assertion, or the owner of each denial. | `tasks.md:25-30`; Design §§11–12 (`design.md:120-135,291-298`) | Add explicit failing RED rows for both route families and list/get behavior: same-tenant 200, missing/malformed/invalid/expired/revoked token 401, conflicting selector/Host 403 before handler/service, foreign workflow/document IDs as A-scoped 404, and document mapper-not-called-with-null. State method, expected result, no-effect assertion, and owning guard/controller/test. |
| TR-003 | **BLOCKER** | Tenant-isolation evidence is not sufficiently task-level. The artifact names A/B cases but does not explicitly trace persisted `ApiKey.tenantId` → `TokenAuthGuard` → trusted request context → controllers/services, Host agreement/neutral Host behavior, selector overwrite prevention, and no B disclosure or mutation. | `tasks.md:27-36`; Design §§2–4, 11–12, 16 (`design.md:11-39,120-135,271-298`) | Add a bounded authority-chain matrix and concrete A/B assertions for workflow and document IDs, agreeing/conflicting/neutral Hosts, supplied tenant selectors, service non-invocation on conflicts, A-scoped lookup, 404/no disclosure, and no mutation. Preserve the stop condition for any newly discovered selector alias. |
| TR-004 | **BLOCKER** | Strict RED → GREEN → REFACTOR sequencing is incomplete. The artifact has RED, GREEN, and verification headings but no explicit bounded REFACTOR/cleanup checkpoint before final acceptance. | `tasks.md:25-42`; `docs/SDD-WORKFLOW.md:193-197`; `PROJECT.md:123-127` | Add a dependency-ordered REFACTOR task limited to the approved Working Set, with its focused regression/lint/typecheck criteria, followed by final acceptance. Do not use refactor to broaden scope or rewrite Design/Tasks. |
| TR-005 | **BLOCKER** | Acceptance criteria and execution checkpoints are too broad to prove completion. The single summary criterion does not map each Design contract to an observable test outcome, and the commands do not specify the exact suites/scenarios or a bounded final diff/validator record. | `tasks.md:38-46`; Design §§7, 11, 16 (`design.md:83-93,120-128,291-298`) | Make acceptance criteria observable and traceable to each route family, auth status, scope, resource-miss, revocation, default-deny, no-disclosure, and no-mutation contract. Name exact focused commands, lint/build, applicable SDD validators, and the final bounded file/scope check as downstream evidence. |
| TR-006 | **BLOCKER** | The high 420–560-line forecast is preserved, but the workload fields do not use the canonical Workload Guard outcome terminology and do not define enough bounded work-unit evidence for the post-review gate. `ask-on-risk` is not a canonical Workload Guard result. | `tasks.md:3-17`; `docs/SDD-WORKFLOW.md:145-158`; `DECISIONS.md:92-98` | Retain the 420–560 estimate and high risk. Distinguish the canonical gate alternatives **Chained PRs** and **Size Exception** from the project convention `feature-branch-chain`; provide cohesive work-unit boundaries, verification/finish conditions, and file scopes. Explicitly record that the pending Chained PR strategy is a **HUMAN / MAINTAINER decision required before Apply**; do not make that decision in Tasks Review. |

## Contract checks

| Check | Result | Evidence |
|---|---|---|
| Approved Design / fresh PASS Architecture Review alignment | CONDITION | Authority source, Host corroboration, document null translation, route families, and exclusions are represented, but task-level proof is not recoverable. `design.md:8-16,41-93,120-159,271-318`; `architecture-review.md:64-116`. |
| Dependency and implementation order | **BLOCKED** | RED precedes GREEN, but no explicit REFACTOR checkpoint precedes final acceptance. `tasks.md:25-42`. |
| Working Set / Read Order accuracy | **BLOCKED** | Only shorthand inventory/order is present; exact paths and actions are absent. `tasks.md:19-23`; `design.md:41-93`. |
| Strict RED-first coverage | **BLOCKED** | Required security and resource-status cases are not a complete method/status/no-effect/owner matrix. `tasks.md:25-30`; `design.md:120-135,291-298`. |
| Tenant isolation and security evidence | **BLOCKED** | A/B intent exists, but trusted-authority propagation, Host/selector conflict ownership, no-disclosure, and no-mutation evidence are not independently recoverable. `tasks.md:27-36`; `design.md:11-39,255-269`. |
| Acceptance criteria | **BLOCKED** | Summary acceptance does not provide contract-by-contract observable outcomes or exact completion evidence. `tasks.md:38-46`; `design.md:120-128,291-298`. |
| Workload forecast | **BLOCKED** | Forecast is correctly high and within the requested 420–560 range, but canonical strategy terminology and pre-Apply HUMAN decision evidence are incomplete. `tasks.md:3-17`; `docs/SDD-WORKFLOW.md:145-158`. |
| Scope discipline | PASS with required preservation | The artifact does not authorize schema, mapper/service, global-guard, token-management, unrelated-change, or Git work. `tasks.md:19-23`; `design.md:58-73`. |

## Tenant-isolation evidence required for refinement

The refined Tasks artifact must retain the approved security boundary: the
persisted `ApiKey.tenantId` is the sole authority; `TenantResolveMiddleware`
only supplies optional `hostTenantId`; `TokenAuthGuard` owns comparison and
trusted request binding; controllers consume trusted authority; scoped services
cannot be reached on selector/Host conflict; and a Tenant A key never reads or
mutates Tenant B. Neutral/reserved Host cannot redirect authority. A newly
discovered selector alias is a material contradiction and must stop the action,
not be guessed into scope.

## Validation evidence

1. `pnpm sdd:validate` — **PASS**; canonical files, workflow, local Direct
   wiring, role map, hybrid persistence, and maintainer gates are valid.
2. `pnpm sdd:validate:design -- openspec/changes/secure-public-api-tenant-binding/design.md`
   — **PASS**; the approved Design retains the canonical 18 sections, A–G
   topics, decision/rationale structure, and Working Set numbering.
3. No Tasks-specific repository validator is defined; no alternate validator
   was invented. No Design modification was requested.
4. No implementation, test, Workload Guard, Apply, unrelated-change
   inspection, or Git lifecycle command was run in this review.

## Canonical next action

The normalized result is **BLOCKED**. Perform only the one permitted
**Phase 6 — Tasks Refinement**, preserving this review evidence and the
approved Design. After refinement, a fresh Tasks Review is mandatory. Do not
run Workload Guard or start Apply from this blocked review. A second BLOCKED
Tasks Review consumes the correction budget and is a stop/escalation condition;
it does not authorize another automatic refinement.

```yaml
status: BLOCKED
change: secure-public-api-tenant-binding
phase: Tasks Review
executor: sdd-direct-tasks-review
role: MID / BUILDER
artifact: openspec/changes/secure-public-api-tenant-binding/tasks-review.md
findings:
  - TR-001: BLOCKER — exact Working Set and Read Order are not recoverable
  - TR-002: BLOCKER — strict RED security matrix is incomplete
  - TR-003: BLOCKER — tenant-isolation authority and no-effect evidence is incomplete
  - TR-004: BLOCKER — explicit RED -> GREEN -> REFACTOR sequence is missing
  - TR-005: BLOCKER — acceptance and command evidence is not contract-complete
  - TR-006: BLOCKER — high forecast lacks canonical workload strategy/work-unit evidence
evidence:
  - fresh Architecture Review PASS preserved at architecture-review.md:64-116
  - approved Design Working Set and Read Order consumed before bounded reads
  - `pnpm sdd:validate` and Design validator are applicable post-write checks
next: Tasks Refinement only; preserve Design/tasks.md and do not invoke Workload Guard or Apply
```

---

# Fresh Retry: Phase 5 — Tasks Review

> **Normalized result:** PASS
> **Action:** Phase 5 — Tasks Review (fresh retry after the permitted Phase 6 refinement)
> **Role:** MID / BUILDER
> **Model binding:** `openai/gpt-5.6-luna` (`.opencode/sdd-model-map.json:13-16,33-36,55-57`)
> **Correction budget:** Consumed; no further Tasks Refinement is authorized.

## Review boundary and provenance

The refined approved `design.md`, refined `tasks.md`, and this preserved
historical `tasks-review.md` were consumed first, including the Design and Tasks
Working Set and Read Order. The fresh review then checked the refined task
breakdown against the approved Design and `docs/SDD-WORKFLOW.md`. No Design or
`tasks.md` change was made. No implementation, Workload Guard, Apply, unrelated
change inspection/modification, or Git lifecycle operation was performed.

## Fresh retry verdict

**PASS.** TR-001–TR-006 are closed:

| Prior blocker | Closure evidence |
|---|---|
| TR-001 | `tasks.md:20-43` gives every primary/conditional path, exact action and position, ordered Read Order, and explicit exclusions. |
| TR-002 | `tasks.md:45-55` supplies method, list/get route, input, status, no-effect assertion, and owner coverage for workflow/document routes, auth failures, selectors, and Host variants. |
| TR-003 | `tasks.md:18,45-55,61-64,67-69` traces persisted `ApiKey.tenantId` through guard/request/controllers/services and records A/B no-disclosure, no-mutation, scoped-lookup, Host, neutral-Host, selector, and overwrite evidence. |
| TR-004 | `tasks.md:57-73` explicitly orders RED, GREEN, and bounded REFACTOR before acceptance. |
| TR-005 | `tasks.md:75-80` maps exact commands and observable acceptance evidence to route, auth, scope, resource-miss, revocation, default-deny, disclosure, mutation, validator, and bounded-scope contracts. |
| TR-006 | `tasks.md:3-18` retains the High 420–560 forecast, distinguishes canonical **Chained PRs**/**Size Exception**, defines cohesive work units and finish evidence, and requires the HUMAN / MAINTAINER decision before Apply. |

## Contract checks

| Check | Result | Evidence |
|---|---|---|
| Approved Design and preceding Architecture Review alignment | PASS | Refined Design Working Set/Read Order and route/security contracts are represented; the preserved Architecture Review PASS remains authoritative predecessor evidence. |
| Working Set, Read Order, and exclusions | PASS | `tasks.md:20-43`; all ten primary files and three conditional files are recoverable without scope expansion. |
| Dependency order and strict TDD sequence | PASS | `tasks.md:57-80`; RED precedes GREEN, GREEN precedes bounded REFACTOR, then acceptance evidence. |
| RED-first route/auth/security coverage | PASS | `tasks.md:45-55,61-64`; both workflow/document list/get handlers and all required status/no-effect/owner cases are explicit. |
| Tenant isolation and no-disclosure/no-mutation evidence | PASS | `tasks.md:18,49-56,61-69`; persisted key authority, Host/selector conflicts, trusted context, A/B scoped IDs, and service non-invocation are explicit. |
| Acceptance criteria and validators | PASS | `tasks.md:75-80`; exact focused suites, doorbells, lint, build, SDD validators, and `git diff --check` are named with bounded final-scope evidence. |
| Workload forecast and Apply gate | PASS | `tasks.md:3-18`; Workload Guard alternatives are canonical and HUMAN / MAINTAINER authorization is required before Apply. |
| Scope discipline | PASS | `tasks.md:35-43,69,73,80`; conditional files remain RED-justified, and schema, services/mapper, global guards, token-management policy, unrelated changes, and Git artifacts remain excluded. |

## Validation evidence

Applicable repository validators run after this append:

1. `pnpm sdd:validate` — **PASS**.
2. `pnpm sdd:validate:design -- openspec/changes/secure-public-api-tenant-binding/design.md` — **PASS**.
3. `git diff --check` — **PASS**.

No Tasks-specific validator exists; no alternate validator was introduced.

## Canonical next action

The normalized result is **PASS**. The exact next action is **Workload Guard**.
Workload Guard must run before Apply because the forecast is High and above 400
changed lines. It must choose between canonical **Chained PRs** and **Size
Exception** and obtain the required HUMAN / MAINTAINER decision before Apply.
**Do not start Apply from this artifact.**

```yaml
status: PASS
change: secure-public-api-tenant-binding
phase: Tasks Review
executor: sdd-direct-tasks-review
role: MID / BUILDER
artifact: openspec/changes/secure-public-api-tenant-binding/tasks-review.md
historical_result: BLOCKED (preserved above)
findings: []
  - refined Design, refined tasks.md, and preserved historical review consumed first
  - TR-001 through TR-006 closed by tasks.md:18-80
  - pnpm sdd:validate PASS
  - pnpm sdd:validate:design -- openspec/changes/secure-public-api-tenant-binding/design.md PASS
  - git diff --check PASS
next: Workload Guard only; do not start Apply
```
