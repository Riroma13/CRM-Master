skill_resolution: paths-injected

1. **Queue reference inventory** — every active reference with file:line

   Active code/test references found by bounded search:

   - `apps/api/src/modules/activity-timeline/activity-timeline.module.ts:23` — registers `activity-timeline:ingestion`.
   - `apps/api/src/modules/activity-timeline/activity-timeline.module.ts:32` — registers `activity-timeline:dlq`.
   - `apps/api/src/modules/activity-timeline/activity-timeline.service.ts:15` — injects `activity-timeline:ingestion`; enqueue calls are at `:30` and `:50`.
   - `apps/api/src/modules/activity-timeline/activity-timeline.processor.ts:10` — consumes `activity-timeline:ingestion`.
   - `apps/api/src/modules/activity-timeline/activity-timeline.processor.ts:17` — injects `activity-timeline:dlq`; DLQ enqueue is at `:26`.
   - `apps/api/src/modules/activity-timeline/activity-timeline.service.spec.ts:32` — mock token for ingestion.
   - `apps/api/src/modules/activity-timeline/__tests__/activity-timeline-backward-compat.spec.ts:43` — mock token for ingestion.
   - `apps/api/src/modules/activity-timeline/__tests__/activity-timeline-cross-tenant-isolation.spec.ts:94` — mock token for ingestion.

   No queue constants or alias definitions were found. Queue identities are duplicated as literals across module, service, processor, and focused tests. SPEC-0017 design/tasks and archived artifacts also document the old names (`openspec/changes/SPEC-0017-activity-timeline/design.md:28,48,97,104,557`; `tasks.md:53-54`; archived `pr-description.md:35`), but those are documentation evidence, not runtime references.

2. **Deployment and persisted-job evidence** — what is actually deployed and whether jobs may exist

   - `docker-compose.yml:22-34` defines Redis 7 with a mounted `redis_data:/data` volume and restart policy `unless-stopped`; this is evidence that Redis state can survive container restarts, not proof of a production queue snapshot or current job counts.
   - `docker-compose.yml:56-75` defines one production-profile `api` service, dependent on Redis, with no separate Activity Timeline worker service, replica count, rolling-update policy, or queue migration hook.
   - `apps/api/Dockerfile:14-19` builds and starts one API process; it contains no queue-drain or migration step.
   - `.env.example:12-13` exposes Redis configuration only (`REDIS_URL`); no queue-name, migration-mode, or worker-version setting exists.
   - No `scripts/` or `tools/` operational script for inspecting, draining, renaming, or re-queueing these queues was found. No destructive Redis command was run.
   - The active registrations use `removeOnComplete: true` and `removeOnFail: 100` for ingestion (`activity-timeline.module.ts:24-29`), while the DLQ uses `removeOnComplete: true` (`:33-36`). Waiting, delayed, active, and retained failed jobs are not removed by those options; therefore old-name jobs may exist if any producer/worker previously ran. Their actual presence is **not found / not measurable within the read-only bounded inspection**.
   - SPEC-0017 archive evidence says the implementation was archived and “Ready for merge” (`openspec/changes/archive/2026-07-20-SPEC-0017-activity-timeline/pr-description.md:70-72`; archive report `:287-291`). No compose/deploy evidence proves it reached production. Production deployment status: **not found**.
   - Queue jobs are operationally transient, but unprocessed ingestion jobs carry activity events and must not be silently discarded if event loss is unacceptable. The design states activity events have indefinite lifetime and DLQ events 90 days (`openspec/changes/SPEC-0017-activity-timeline/design.md:342-351`), so preservation/drain is the safe production assumption.

3. **Compatibility risks** — rolling deploy, job persistence, consumer/producer mismatch

   - Queue names are part of the BullMQ identity; changing them without compatibility leaves producers and consumers attached to different queues.
   - The repository has no replica or rolling-deployment declaration (`docker-compose.yml:56-75`), so simultaneous old/new workers are neither enabled nor ruled out by repository configuration. An external orchestrator decision is required.
   - A pre-production atomic rename is safe only if the old queues are proven empty/nonexistent and no old producer can run during the cutover. That proof is not present in the repository.
   - For production, old workers must continue consuming old ingestion jobs while new producers/workers use the new identity, or an explicit drain must complete before retirement. Dual-write is not evidenced as necessary and would duplicate activity events unless deduplication is guaranteed for every payload.
   - Old and new DLQs should remain separately inspectable during transition; merging or deleting the old DLQ would risk losing invalid-job evidence.

4. **Viable migration strategies** — with exact Working Set per strategy

   **Strategy A — Pre-production atomic rename (only with an empty-queue gate).** Rename both queue identities to delimiter-safe names in one change, update all injection/decorator/registration literals and focused mocks, then boot the application. This is viable only where no old-name Redis state or concurrent old producer exists.

   **Strategy B — Production-safe staged cutover with old-queue drain.** Introduce centralized old/new identities, switch producers to the new ingestion queue, run consumers for both old and new queues during a bounded drain window, preserve old and new DLQs, verify old ingestion is empty, then remove old compatibility consumption in a later deployment. This is the only repository-compatible strategy that protects potentially persisted jobs without requiring duplicate writes.

5. **Rejected strategies and reasons** — why each is unsuitable

   - **Blind atomic rename in production** — rejected: Redis has persistent-volume evidence and no proof that old waiting/delayed/active/failed jobs are absent.
   - **Dual-write every event to old and new queues** — rejected: it duplicates work and can duplicate persisted activity events; the current code does not define a cross-queue idempotency key for all legacy envelopes.
   - **Delete/obliterate old queues** — rejected: destructive, no operational script or approval exists, and it can discard activity events/DLQ evidence.
   - **Assume compose provides rolling compatibility** — rejected: compose declares one API service and no replicas/update policy; external deployment behavior is unknown.

6. **Exact Working Set for each viable strategy** — file-by-file

   **A. Pre-production atomic rename**

   - `apps/api/src/modules/activity-timeline/activity-timeline.module.ts` — rename both registrations and centralize/export names if chosen.
   - `apps/api/src/modules/activity-timeline/activity-timeline.service.ts` — use the new ingestion identity.
   - `apps/api/src/modules/activity-timeline/activity-timeline.processor.ts` — use the new ingestion decorator and DLQ identity.
   - `apps/api/src/modules/activity-timeline/activity-timeline.service.spec.ts` — update ingestion token.
   - `apps/api/src/modules/activity-timeline/__tests__/activity-timeline-backward-compat.spec.ts` — update ingestion token.
   - `apps/api/src/modules/activity-timeline/__tests__/activity-timeline-cross-tenant-isolation.spec.ts` — update ingestion token.
   - `apps/api/src/modules/activity-timeline/activity-timeline.queue-names.ts` — **new**, recommended single source of truth; no existing equivalent was found.
   - No Docker/Caddy/environment change is required by the evidence for a same-process rename.

   **B. Production-safe staged cutover**

   - All six Activity Timeline runtime/focused-test files listed for Strategy A.
   - `apps/api/src/modules/activity-timeline/activity-timeline.queue-names.ts` — old and new identities plus migration phase/alias contract.
   - `apps/api/src/modules/activity-timeline/activity-timeline.processor.ts` — compatibility consumers for old and new ingestion, with old/new DLQ routing explicitly preserved.
   - `apps/api/src/modules/activity-timeline/activity-timeline.module.ts` — register old and new queues/workers for the overlap window.
   - `scripts/` or `tools/` — **new bounded operational inspection/drain/requeue script**, because no precedent or existing queue utility was found. It must be non-destructive by default and report queue counts before/after.
   - Deployment manifest/orchestrator configuration — **not found in the bounded repository paths**; the maintainer must identify the actual production deployment file/process before claiming a rolling-safe cutover.
   - A migration runbook/design artifact under `openspec/changes/SPEC-0025-identity-platform/` — required to record sequencing, drain gate, retention, and owner approval.

7. **Test and operational verification plan** — specific focused tests and operational checks

   - **RED:** add focused assertions that producer injection resolves the selected new queue, processor subscribes to the selected ingestion queue, invalid jobs route to the selected DLQ, and no old literal remains outside the compatibility path.
   - **GREEN:** run only the focused Activity Timeline suites: `activity-timeline.service.spec.ts`, `__tests__/activity-timeline-backward-compat.spec.ts`, and `__tests__/activity-timeline-cross-tenant-isolation.spec.ts`; the existing archive reports 14 + 6 + 4 tests for these suites (`openspec/changes/archive/2026-07-20-SPEC-0017-activity-timeline/archive-report.md:98-105`).
   - For Strategy B, test old-job processing, new-job processing, invalid-job routing to both transition DLQs as specified, retry behavior, and duplicate-event protection.
   - Operationally, inspect (read-only first) BullMQ counts for old ingestion/DLQ and new ingestion/DLQ: waiting, delayed, active, completed, failed, and paused; capture the inspection timestamp and Redis instance identity.
   - Gate retirement of old consumers on old ingestion counts reaching zero and on no old producers remaining. Verify a canary publish is consumed once, persisted once, and visible in the expected tenant scope.
   - Do not run destructive commands as part of evidence gathering.

8. **Rollback plan** — how to revert each strategy

   - **Strategy A:** stop the new process, restore the old queue identities in code, redeploy the prior artifact, and verify old-name producers/consumers reconnect. This assumes the pre-production empty-queue gate was true.
   - **Strategy B before old-worker retirement:** route producers back to old identity while retaining the new consumer long enough to settle new jobs; keep both queues visible and avoid deleting either queue. Do not replay both queues without event-id/deduplication controls.
   - **Strategy B after old-worker retirement:** redeploy the compatibility artifact that consumes both names, restore producer routing to the old identity, and drain/reconcile new-name jobs before removing the new path. Any requeue must be explicit, audited, and non-destructive by default.

9. **Classification** — **MAINTAINER_DECISION_REQUIRED**

10. **Exact bounded question for the maintainer or Terra** — For this pre-existing SPEC-0017 queue, should the team approve (A) a pre-production-only atomic rename after an explicit empty old-queue gate, or (B) a production-safe staged cutover that keeps old/new consumers and DLQs during a drain window—and what deployment/orchestrator owns the overlap window?
