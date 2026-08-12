# Architecture Review: SPEC-0028 — Jobs & Background Processing Platform

> **Normalized result:** PASS
> **Executor:** HIGH / ARCHITECT — `sdd-direct-architecture-review`
> **Model binding:** `openai/gpt-5.6-terra` (`.opencode/sdd-model-map.json:8-12,29-32,51-55`)
> **Persistence:** hybrid; this file is the exact fresh-review artifact.
> **Review sequence:** initial BLOCKED review → one Design Refinement → this fresh review. The Design Refinement retry budget is consumed.

## Scope and evidence boundary

Reviewed the refined `design.md` against the canonical workflow, the Enterprise
Design Standard, and the exact Design §5 Working Set / §6 Read Order. The §6
files were consumed in order before the only additional bounded reads
(`health.module.ts` and the two named regression tests). No Working Set
expansion, implementation, Tasks, Apply, Verify, Archive, unrelated-change
history, or Git action was performed.

## Gate verdict and correction-loop history

**PASS.** All material Design findings are closed or explicitly non-blocking.
Per `docs/SDD-WORKFLOW.md:124-143`, the only legal next action is **Tasks**.

| Attempt | Result | Evidence and disposition |
|---|---|---|
| Initial Architecture Review | BLOCKED | Preserved prior artifact recorded AR-01 (Topic C lacked separate Decision/Rationale) and AR-02 (creates budget forecast was 7 rather than 9); AR-03 was a non-blocking future-adoption concurrency condition. |
| Design Refinement | Complete | `design.md:144-150` now has separate `Decision` and `Rationale` fields. `design.md:88-95` now forecasts 9 creates: six platform files, two unit tests, and one doorbell test. The Design explicitly records the consumed retry at `design.md:1-3`. |
| Fresh Architecture Review (this artifact) | PASS | AR-01 and AR-02 are closed. AR-03 remains CONDITION only, with owner and deferral boundary. No material defect remains. |

## Findings

| ID | Normalized status | Finding | Evidence | Required action |
|---|---|---|---|---|
| AR-01 | PASS — closed | Ownership Topic C now separately supplies Decision and Rationale. | `design.md:144-150`; template `:399-415`. | None. |
| AR-02 | PASS — closed | Exploration budget accurately matches §5: 6 platform creates, 2 unit-test creates, 1 doorbell-test create; 8 modifications. | `design.md:35-55,88-95`. | None. |
| AR-03 | CONDITION | Per-definition concurrency defaults are intentionally unresolved. This root-only foundation migrates no producer/consumer, so the condition is non-blocking now. | `design.md:85-86,133-139,200-204`. | A separately approved domain-adoption Design must set and test a conservative definition-specific value before its first adoption. |
| VAL-01 | CONDITION | The protected SPEC-0028 design-validator notice is expected and is not a Design-content defect or baseline debt. | Exact validator output below. The validator states it does not read this protected path. | None; manual bounded review is the applicable Design-content evidence. |

No BLOCKED, BASELINE_DEBT, or NEEDS_EVIDENCE finding remains.

## Architecture Review topics A–G

| Topic | Status | Review evidence |
|---|---|---|
| A. Scalability | CONDITION | API-process topology, definition-owned concurrency, gauges, and measured ADR trigger for a worker split are defined at `design.md:133-139`. AR-03 is deferred only to later domain adoption. |
| B. Open/Closed Principle | PASS | A domain-local typed definition/handler is the extension point; adding a consumer does not alter the root (`design.md:130-131,141-143`). |
| C. Ownership | PASS | JobsModule owns transport/lifecycle; domains own effects, idempotency, durable state, and DLQs, with separately stated Decision/Rationale (`design.md:144-150`). |
| D. Data Retention | PASS | No generic persistence is introduced; terminal BullMQ records retain existing `removeOn*`, while domain records retain their current policy (`design.md:151-156`). |
| E. Idempotency | PASS | At-least-once semantics, stable IDs, domain unique/upsert/claim protections, and safe reload/no-op fallback are explicit (`design.md:158-162`). |
| F. Shared Contracts | PASS | The typed internal API contract is appropriately in `modules/jobs`; promotion requires a real second runtime (`design.md:164-168,176-190`). |
| G. Partitioning Strategy | PASS | No platform relational data is created, so no platform partition is required; any future persistence requires an ADR (`design.md:170-174`). |

## Contracts, security, and tenant isolation

| Area | Status | Evidence |
|---|---|---|
| Root and queue contract | PASS | Activity Timeline is the current sole `BullModule.forRoot()` using `REDIS_URL`; its queue registrations/options remain feature-owned (`activity-timeline.module.ts:17-40`, `activity-timeline-queue.constants.ts:1-12`, `design.md:13-20`). |
| Identity/outbox and DLQ ownership | PASS | Identity retains registered queues, lease → enqueue → DELIVERED behavior, duplicate protection, and Identity-owned failure/DLQ handling (`identity.module.ts:19-38`, `identity-audit-dispatcher.service.ts:28-90`, `design.md:18-19,57-61`). |
| Trusted/untrusted contract | PASS | Caller payload cannot select tenant, queue, handler, attempts, or delay policy; trusted context derives from Host/session or trusted system triggers and is revalidated before effects (`design.md:24-30,176-190`). |
| Tenant isolation | PASS | The worker is required to use `PrismaService.forTenant(tenantId)`, whose returned client automatically scopes queries and blocks raw SQL (`prisma.service.ts:24-31`). The planned real-DB doorbell test follows the existing Host-authority and scoped-client proof pattern (`identity-isolation.e2e-spec.ts:103-136`; `design.md:112-115`). |
| Secrets and telemetry | PASS | Logs are redacted and metrics cannot use payload labels (`design.md:29,46,128`); the existing registry uses bounded queue/module labels (`metrics-registry.ts:32-44`). |
| Scheduler and health boundaries | PASS | Notification reminders remain intentionally out of scope and in-memory (`notification-reminders.service.ts:7-19`, `design.md:60,130-131`). The current Redis health state is `unknown`, matching the named Jobs health integration point (`health.controller.ts:31-40`, `health.module.ts:6-10`, `design.md:43-45`). |

## Working Set, tests, risks, questions, and traceability

| Area | Status | Evidence |
|---|---|---|
| Working Set and Read Order | PASS | The exact 15-file bounded set protects AppModule, schema/migrations, Identity, and unrelated domain modules (`design.md:31-73`). The 9-item read order was consumed exactly; the later health module and named test reads were strictly necessary contract/test evidence. |
| Tests | PASS | Unit, integration, doorbell, and regression coverage address root ownership, forged/inactive tenant context, retries, lifecycle, telemetry, health, and Identity compatibility (`design.md:104-115`). Existing root and metrics tests establish the regression seams (`activity-timeline-redis-connection.spec.ts:19-42`, `metrics-registry.spec.ts:10-75`). |
| Risks and rollback | PASS | Root extraction, Redis/poison jobs, tenant leakage, and shutdown duplication have specific mitigations; rollback preserves queues and domain records (`design.md:96-102,192-198`). |
| Open questions | CONDITION | Only the future-adoption concurrency default is open and explicitly non-blocking for a root-only foundation; the standalone-worker threshold is resolved (`design.md:200-204`). |
| Traceability | PASS | All 15 requested concerns and process integration are mapped to Design sections and planned RED tests (`design.md:206-232`). |

## Validator evidence

| Command | Exact result | Classification |
|---|---|---|
| `pnpm sdd:validate` | `CRM-SDD governance validation: PASS` — canonical files/classifications; exactly 14 phases and Apply 7.1–7.6; workflow/Guard boundary; local Direct wiring and agent bindings; logical role map, hybrid persistence, maintainer gates; package validators and Enterprise template boundary all valid. | PASS |
| `pnpm sdd:validate:design -- "openspec/changes/SPEC-0028-jobs-background-processing-platform/design.md"` | `Enterprise Design validation: FAIL (openspec/changes/SPEC-0028-jobs-background-processing-platform/design.md)`; `SPEC-0028 is protected and is not read by this validator`; `ELIFECYCLE Command failed with exit code 1.` | CONDITION — expected protected-path notice only; not a substantive Design failure, not BASELINE_DEBT, and not NEEDS_EVIDENCE. |

No build, lint, application test, generation, migration, or e2e command was run:
this is a Design-only review. Those commands remain planned Apply evidence at
`design.md:75-83`.

## Canonical next action

**Tasks only** — owned by MID / BUILDER. This PASS review permits the
`Architecture Review → Tasks` edge and no later phase (`docs/SDD-WORKFLOW.md:93-105`).
The Design Refinement budget is consumed; if a material defect had remained,
the required outcome would have been stop-and-escalate, not another refinement.
