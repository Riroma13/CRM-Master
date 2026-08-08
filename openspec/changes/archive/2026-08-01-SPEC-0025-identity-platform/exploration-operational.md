skill_resolution: paths-injected

1. **Environment classification** — **production**, with evidence

   - `.env:8` sets `NODE_ENV=production`; `.env:4` and `.env:6` use HTTPS deployment URLs.
   - `docker-compose.yml:56-75` defines the API under the production profile, and `docker-compose --profile production ps` showed `api`, `postgres`, `redis`, and `tenant-web` running.
   - The running API container started `2026-07-11T14:48:19Z`; the image was created `2026-07-11T14:45:44Z`.

2. **SPEC-0017 deployment evidence** — what proves or disproves active deployment

   - Repository evidence proves SPEC-0017 was completed in commit `f47e55a` on `2026-07-20T18:08:51Z`, and its archive report marks the SDD cycle complete (`openspec/changes/archive/2026-07-20-SPEC-0017-activity-timeline/archive-report.md:287-291`).
   - The running API image predates that commit by nine days, and the running image does not contain the compiled Activity Timeline module at the expected dist path (`dist_activity_timeline=absent`).
   - Therefore active deployment of SPEC-0017 is **disproved for the currently running API image**. The archive/commit is repository evidence, not deployment evidence.

3. **Old queue existence** — which of `activity-timeline:ingestion`, `activity-timeline:dlq` exist in Redis

   - Neither queue exists in the compose-managed Redis instance.
   - Exact read-only commands and output:

     ```text
     $ docker exec crm-master-redis redis-cli --raw SCAN 0 MATCH 'bull:activity-timeline:ingestion:*' COUNT 1000
     0
     $ docker exec crm-master-redis redis-cli --raw SCAN 0 MATCH 'bull:activity-timeline:dlq:*' COUNT 1000
     0
     $ docker exec crm-master-redis redis-cli --raw SCAN 0 MATCH 'bull:*activity*' COUNT 1000
     0
     ```

   - Runtime connection evidence is split: `.env:7` defines the `REDIS_URL` variable and `docker-compose.yml:66` passes `.env` to the API; however `apps/api/src/modules/activity-timeline/activity-timeline.module.ts:14-19` wires BullMQ from `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`, which are not defined in `.env`. Thus the Activity Timeline module is not proven to target the compose-managed Redis instance.

4. **Job counts by state** — per-queue breakdown of waiting/delayed/active/prioritized/completed/failed/paused

   Exact read-only command used:

   ```text
   for q in 'activity-timeline:ingestion' 'activity-timeline:dlq'; do
     for s in wait delayed active prioritized completed failed paused; do
       LLEN bull:$q:$s for wait/active/paused; ZCARD bull:$q:$s otherwise
     done
   done
   ```

   Output (missing keys also return zero for these cardinality/length queries):

   | Queue | waiting | delayed | active | prioritized | completed | failed | paused |
   |---|---:|---:|---:|---:|---:|---:|---:|
   | `activity-timeline:ingestion` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
   | `activity-timeline:dlq` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

5. **Connected producer/worker evidence** — what clients/workers are connected to those queues

   - Exact command: `docker exec crm-master-redis redis-cli --raw INFO clients`; relevant output: `connected_clients:1`, `blocked_clients:0`, `pubsub_clients:0`.
   - Exact command: `docker exec crm-master-redis redis-cli --raw CLIENT LIST`; the sole listed client was the inspection command itself (`cmd=client|list`). No producer or BullMQ worker connection was present at inspection time.
   - This is evidence for the inspected Redis instance only; because the Activity Timeline runtime wiring does not consume the configured `REDIS_URL`, it cannot prove absence from any other Redis endpoint.

6. **Downtime/cutover capability** — single-instance vs rolling, controlled window availability

   - **Single-instance is evidenced:** `docker-compose.yml:56-75` defines one API service/container, with no replicas, rolling-update policy, separate Activity Timeline worker service, or migration hook. `docker compose --profile production ps` showed one running API.
   - A controlled downtime window is technically compatible with this single-instance compose topology, but maintainer scheduling/approval is not evidenced in the repository. No rolling deployment configuration was found.

7. **Recommended strategy** — **NEEDS_MAINTAINER_FACT**

8. **Exact evidence supporting the recommendation** — concrete facts from #1-#6

   - The environment is classified as production, not preproduction (#1), so `A_PREPRODUCTION_ATOMIC_RENAME` cannot be asserted.
   - The running image predates the SPEC-0017 completion commit and lacks the compiled Activity Timeline module (#2), so active SPEC-0017 deployment is not established.
   - Both old queues are absent and all inspected state counts are zero (#3-#4), but the Activity Timeline runtime uses separate Redis variable names from the configured `REDIS_URL` (#3), so the inspected Redis cannot be treated as conclusive evidence for the module's effective endpoint.
   - No producer/worker is connected to the inspected Redis (#5), while the single-instance topology is known but the actual maintainer-controlled cutover window is not (#6).
   - The maintainer must confirm the effective runtime Redis endpoint and whether this production stack is the authoritative deployment before selecting either atomic rename or staged production cutover.
