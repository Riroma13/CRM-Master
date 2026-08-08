# SPEC-0025 BullMQ colon-queue evidence packet

skill_resolution: paths-injected

Scope: read-only repository and Redis evidence. No Apply, product-file changes, build, full test suite, or R5 doorbell was run. The visible phase remains Apply Phase 5 — Testing.

## 1. Complete active colon-queue inventory

`AppModule` imports `CoreModule` and `InfrastructureModule`; `CoreModule` imports `KnowledgeModule`, `ReportingModule`, and `BillingModule`. Therefore all queues below are active bootstrap registrations.

### KnowledgeModule

| Queue | Registration | Producer / consumer | DLQ/retry | Focused tests |
|---|---|---|---|---|
| `kb:ingestion` | `apps/api/src/modules/knowledge/knowledge.module.ts:44` | Consumer `@Processor` at `apps/api/src/modules/knowledge/ingestion/ingestion.service.ts:28`; no producer literal found | `kb:ingestion-dlq`; 3 attempts, exponential backoff at module `:45-50` | No direct token assertion; `apps/api/src/modules/knowledge/__tests__/ingestion.service.spec.ts:48,142` tests DLQ injection |
| `kb:reindex` | `knowledge.module.ts:53` | Consumer at `ingestion.service.ts:106`; no producer literal found | Uses `kb:ingestion-dlq` at `ingestion.service.ts:113`; 2 attempts/backoff | Same ingestion service suite; no direct queue token for reindex |
| `kb:garbage-collector` | `knowledge.module.ts:62`; injected scheduler at `:20` | Consumer at `garbage-collector.service.ts:6`; scheduler `knowledge.module.ts:23-35` | No DLQ; 1 attempt | No focused queue-token test found |
| `kb:ingestion-dlq` | `knowledge.module.ts:70` | Producers at `ingestion.service.ts:45,87,122,147`; injected at `:36,113` | DLQ queue, 1 attempt | `knowledge/__tests__/ingestion.service.spec.ts:48,142` |

Additional active identity reads: `apps/api/src/modules/knowledge/knowledge.controller.ts:147,150,153` query the three non-DLQ queue names for depth reporting. No other producer reference was found in the repository.

### ReportingModule

| Queue | Registration | Producer / consumer | DLQ/retry | Focused tests |
|---|---|---|---|---|
| `reporting:dataset:ingestion` | `apps/api/src/modules/reporting/reporting.module.ts:35` | Consumer `dataset-ingestion.service.ts:29`; no producer literal found | `reporting:dataset:dlq` at `dataset-ingestion.service.ts:36`; 3 attempts/backoff | `apps/api/src/modules/reporting/__tests__/dataset-ingestion.spec.ts:35` injects the DLQ mock; no name literal |
| `reporting:dataset:dlq` | `reporting.module.ts:44` | Producers `dataset-ingestion.service.ts:45,185`; injected at `:36` | DLQ, 1 attempt | `reporting/__tests__/dataset-ingestion.spec.ts:35` |
| `reporting:report:generate` | `reporting.module.ts:51` | Producer `apps/api/src/modules/reporting/report/report-engine.ts:52,191`; no processor found | 2 attempts/backoff; no DLQ registration found | No focused queue-token test found |
| `reporting:export` | `reporting.module.ts:60` | Producer `apps/api/src/modules/reporting/export/export.service.ts:22,43`; no processor found | 2 attempts/backoff; no DLQ registration found | No focused queue-token test found |
| `reporting:schedule` | `reporting.module.ts:69` | Scheduler producer `apps/api/src/modules/reporting/scheduling/scheduling.service.ts:12,37-57,82-86`; no processor found | 2 attempts/backoff; scheduler removal/replacement is at `:37-40,82-86` | No focused queue-token test found |

### BillingModule

| Queue | Registration | Producer / consumer | DLQ/retry | Focused tests |
|---|---|---|---|---|
| `billing:metering` | `apps/api/src/modules/billing/billing.module.ts:43` | Scheduler injection/producer `metering-cron-registrar.ts:10,16-32`; consumer `metering-cron.service.ts:12` | No DLQ; 2 attempts/backoff | `apps/api/src/modules/billing/__tests__/billing-module.spec.ts:68` |
| `billing:invoice` | `billing.module.ts:52` | No producer literal found; consumer `invoice/invoice-cron.service.ts:7` | No DLQ; 3 attempts/backoff | `billing/__tests__/billing-module.spec.ts:70` |
| `billing:stripe-webhooks` | `billing.module.ts:61` | Producer `payment/stripe-webhook.guard.ts:22,67`; consumer `payment/stripe-webhook.processor.ts:14` | No DLQ; 3 attempts/backoff | `billing/__tests__/billing-module.spec.ts:72` |

`billing:metering:hourly` at `metering-cron-registrar.ts:14` is a scheduler/job identifier, not a queue name, and is not inventoried as a separate queue.

## 2. Excluded stale/archive references

- `activity-timeline:ingestion` and `activity-timeline:dlq`: excluded by the closed context; current active constants and registrations are `activity-timeline-ingestion` and `activity-timeline-dlq`. Colon references occur only in SPEC-0017 documentation and the prior SPEC-0025 evidence artifacts.
- `audit:ingestion`, `audit:dlq`, and `audit:retention`: excluded by the closed context; active Audit/Identity code uses `audit-ingestion` and `audit-dlq` constants. Colon references are SPEC-0018 documentation/archive only.
- `kb:embedding`: documentation-only in active/archive SPEC-0020 artifacts; no current registration, processor, injection, or producer path was found, so it is DEAD.
- Reporting and Billing archive documents repeat names that also have active source registrations; they are not separate queue identities and are not excluded from the active inventory.
- Route scopes, SQL casts, job names, and payload strings containing `:` were excluded unless they were queue-name arguments to registration, processor, injection, or queue operations.

## 3. Deployment and persisted-state evidence per migration unit

The running API container/image was created 2026-07-11. Expected compiled module files were absent from the running image for `knowledge`, `reporting`, and `billing`. Source registration commits are later: Knowledge `29e84cf` (2026-07-20), Reporting `4c4c2f5` (2026-07-20), Billing `75d475b` (2026-07-26). These three units are therefore **not deployed in the running image**.

Read-only Redis checks against the compose Redis used both `SCAN 0 MATCH 'bull:<queue>:*' COUNT 100` and `KEYS 'bull:<queue>:*'`. For every queue in all three units, both match counts were 0. Standard BullMQ `wait`, `active`, `delayed`, `prioritized`, `completed`, `failed`, `paused`, `meta`, `events`, `marker`, and `id` sub-keys were absent; consequently LLEN/ZCARD/HLEN counts are not applicable and are all effectively zero. No Redis key names or credentials are reported.

| Unit | Queues | Running image | Redis old-identity state | Atomic rename |
|---|---|---|---|---|
| Knowledge ingestion | 4 | Not deployed | No keys; no persisted jobs | Safe on current evidence |
| Reporting queues | 5 | Not deployed | No keys; no persisted jobs | Safe on current evidence |
| Billing queues | 3 | Not deployed | No keys; no persisted jobs | Safe on current evidence |

This is evidence for the inspected Redis and running image only; a different deployment or Redis endpoint would require a new read-only gate.

## 4. Proposed old → new identity mapping

Replace `:` with `-` exactly:

```text
kb:ingestion                 -> kb-ingestion
kb:reindex                   -> kb-reindex
kb:garbage-collector         -> kb-garbage-collector
kb:ingestion-dlq             -> kb-ingestion-dlq
reporting:dataset:ingestion  -> reporting-dataset-ingestion
reporting:dataset:dlq        -> reporting-dataset-dlq
reporting:report:generate    -> reporting-report-generate
reporting:export             -> reporting-export
reporting:schedule           -> reporting-schedule
billing:metering             -> billing-metering
billing:invoice              -> billing-invoice
billing:stripe-webhooks      -> billing-stripe-webhooks
```

## 5. Atomic Working Set per migration unit

### Knowledge ingestion unit

- `apps/api/src/modules/knowledge/knowledge.module.ts`
- `apps/api/src/modules/knowledge/ingestion/ingestion.service.ts`
- `apps/api/src/modules/knowledge/ingestion/garbage-collector.service.ts`
- `apps/api/src/modules/knowledge/knowledge.controller.ts`
- `apps/api/src/modules/knowledge/__tests__/ingestion.service.spec.ts`
- `apps/api/src/modules/knowledge/__tests__/knowledge-api.spec.ts` (bootstrap/depth behavior; no old literal currently)

### Reporting unit

- `apps/api/src/modules/reporting/reporting.module.ts`
- `apps/api/src/modules/reporting/ingestion/dataset-ingestion.service.ts`
- `apps/api/src/modules/reporting/report/report-engine.ts`
- `apps/api/src/modules/reporting/export/export.service.ts`
- `apps/api/src/modules/reporting/scheduling/scheduling.service.ts`
- `apps/api/src/modules/reporting/__tests__/dataset-ingestion.spec.ts`
- Add focused queue-identity assertions in the reporting test boundary before implementation; no existing focused token suite covers report/export/schedule.

### Billing unit

- `apps/api/src/modules/billing/billing.module.ts`
- `apps/api/src/modules/billing/metering/metering-cron-registrar.ts`
- `apps/api/src/modules/billing/metering/metering-cron.service.ts`
- `apps/api/src/modules/billing/invoice/invoice-cron.service.ts`
- `apps/api/src/modules/billing/payment/stripe-webhook.guard.ts`
- `apps/api/src/modules/billing/payment/stripe-webhook.processor.ts`
- `apps/api/src/modules/billing/__tests__/billing-module.spec.ts`

No Docker, environment, or Redis migration file belongs in these same-process, empty-state working sets.

## 6. Required behavioral RED/GREEN tests

RED must first assert that the old identity is rejected/not registered and that each producer, processor, scheduler, and DLQ resolves the proposed hyphenated token. GREEN must then prove the renamed registration and behavior.

Focused commands after the tests are written:

```bash
pnpm --filter api test -- src/modules/knowledge/__tests__/ingestion.service.spec.ts src/modules/knowledge/__tests__/knowledge-api.spec.ts
pnpm --filter api test -- src/modules/reporting/__tests__/dataset-ingestion.spec.ts
pnpm --filter api test -- src/modules/billing/__tests__/billing-module.spec.ts
```

The focused tests must cover invalid/failing job routing to the renamed DLQ, scheduler registration under the renamed queue, webhook enqueue/processor resolution, and a source scan asserting no old colon literal remains in each unit. Do not run the full suite or R5 as part of this packet.

## 7. Compatibility and rollback requirements

- Queue names are BullMQ identities. Any producer/consumer mismatch loses processing connectivity even though the application may compile.
- Current evidence supports an atomic source rename because these modules are absent from the running image and old identities are absent from the inspected Redis.
- Before Apply, re-check that the target deployment and Redis endpoint are the authoritative ones; the empty-state gate must not be inferred for another environment.
- Rollback is a prior-artifact redeploy or source revert restoring every old registration, processor, injection, producer, scheduler, SQL depth literal, and focused test token. Do not delete, rename, drain, or replay Redis keys.

## 8. Classification per unit

- Knowledge ingestion: **UNAMBIGUOUS_MINIMAL_FIX** — no keys/jobs, not deployed, one bounded module boundary.
- Reporting queues: **UNAMBIGUOUS_MINIMAL_FIX** — no keys/jobs, not deployed, one bounded module boundary.
- Billing queues: **UNAMBIGUOUS_MINIMAL_FIX** — no keys/jobs, not deployed, one bounded module boundary.

No unit is classified as MAINTAINER_DECISION_REQUIRED, ARCHITECTURAL_DECISION_REQUIRED, or NEEDS_EVIDENCE on the inspected image/Redis evidence. This does not waive maintainer authorization to execute the change.

## 9. Recommended execution grouping for Luna

1. Knowledge ingestion unit: smallest worker/DLQ boundary and existing focused DLQ tests.
2. Reporting unit: dataset ingestion/DLQ first, then report/export/schedule identities in the same module change.
3. Billing unit: metering/invoice/Stripe webhook identities together so BillingModule bootstrap cannot retain a colon queue.
4. Run only the unit-focused RED/GREEN tests above, then hand off to the existing Phase 5 verification contract.

## 10. Exact next mechanical instruction

Create the RED assertions for the Knowledge ingestion unit first, limited to the Knowledge Working Set above; do not change production code, run Apply, run `pnpm build`/`pnpm test`, inspect unrelated BullMQ behavior, or run the full R5 doorbell.
