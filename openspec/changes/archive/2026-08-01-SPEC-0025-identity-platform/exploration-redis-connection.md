# Activity Timeline Redis Connection Correction — Evidence

skill_resolution: paths-injected

## 1. Current broken connection contract

`apps/api/src/modules/activity-timeline/activity-timeline.module.ts:14-20`
calls `BullModule.forRoot()` with a manually assembled connection:

```ts
connection: {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
}
```

The repository's canonical environment exposes `REDIS_URL`, not
`REDIS_HOST`/`REDIS_PORT` (`.env.example:12-13`). Consequently, the deployed
process sees the host and port as undefined and BullMQ is given
`localhost:6379`, rather than the Redis service endpoint.

## 2. Canonical working repository precedent

There is no shared Redis parser, Redis factory, or BullMQ connection helper
under `apps/api/src/common/` or `apps/api/src/config/`. `ConfigModule` is
global in `apps/api/src/app.module.ts:21`, but no Redis configuration is
registered there.

The other BullMQ modules only register queues and inherit the root connection:

- `apps/api/src/modules/audit/audit.module.ts:38-68`
- `apps/api/src/modules/identity/identity.module.ts:19-25`
- `apps/api/src/modules/knowledge/knowledge.module.ts:39-76`
- `apps/api/src/modules/reporting/reporting.module.ts:30-77`
- `apps/api/src/modules/billing/billing.module.ts:39-69`

Thus ActivityTimeline is currently the root BullMQ connection owner. No
existing repository precedent parses `REDIS_URL`; reuse is not available.

Installed versions are `@nestjs/bullmq 11.0.4` (declared `^11.0.0`) and
`bullmq 5.80.9` (declared `^5.0.0`). Nest's `BullRootModuleOptions` extends
BullMQ `QueueOptions` (`@nestjs/bullmq/dist/interfaces/shared-bull-config.interface.d.ts:16-17`).
BullMQ's installed `RedisOptions` is `ioredis.RedisOptions & { url?: string; skipVersionCheck?: boolean }`
(`bullmq/dist/esm/interfaces/redis-options.d.ts:3-7`), and `ConnectionOptions`
accepts that shape (`.../interfaces/redis-options.d.ts:7-8`).

The supported connection object is therefore:

```ts
connection: { url: string }
```

The URL carries hostname, port, optional username/password, and database
index. `redis://` and `rediss://` select plaintext and TLS respectively;
additional ioredis options such as `maxRetriesPerRequest` and a `tls` object
are valid, but are not needed for this correction. The installed ioredis
types confirm `username`, `password`, `db`, `maxRetriesPerRequest`, and `tls`
(`ioredis/built/redis/RedisOptions.d.ts:65-78,136-145`, and
`connectors/StandaloneConnector.d.ts:8-11`).

## 3. Exact correction

Production target: `apps/api/src/modules/activity-timeline/activity-timeline.module.ts:12-20`.

1. Read `process.env.REDIS_URL` as the sole application-level Redis source.
2. Fail fast if it is absent; do not preserve `REDIS_HOST`, `REDIS_PORT`, or a
   localhost fallback.
3. Pass the URL directly as `connection: { url: redisUrl }`.
4. Leave the approved atomic queue rename unchanged: queue names are
   `activity-timeline-ingestion` and `activity-timeline-dlq`.

No new parser/helper is justified: BullMQ 5.80.9 already accepts the URL
connection form and delegates URL field handling to its Redis connection.

Test target: `apps/api/test/setup-e2e-env.ts:1`. Add the exact non-secret local
test value:

```ts
process.env.REDIS_URL = 'redis://localhost:6379';
```

This is a test bootstrap value only; no password or credential is added.

## 4. Exact Working Set

### Production

- `apps/api/src/modules/activity-timeline/activity-timeline.module.ts` — replace
  the legacy host/port/password connection with required `REDIS_URL` URL
  configuration.

### Test

- `apps/api/test/setup-e2e-env.ts` — provide `REDIS_URL` for the real e2e
  bootstrap.
- `apps/api/src/modules/activity-timeline/__tests__/activity-timeline-redis-connection.spec.ts`
  — focused RED/GREEN regression test for the BullMQ root connection.

No deployment, queue-state, migration, or worker analysis belongs in this
Working Set.

## 5. RED/GREEN sequence

From the repository root, after Luna creates the focused test:

```bash
pnpm --filter api test -- --runInBand --runTestsByPath src/modules/activity-timeline/__tests__/activity-timeline-redis-connection.spec.ts
```

**RED:** with the current module, the focused test must fail because the
captured BullMQ connection contains `host: 'localhost'`/`port: 6379` and no
`url`, or because the required `REDIS_URL` contract is not present.

**GREEN:** after the minimal correction, the same command must pass and assert
that `BullModule.forRoot()` receives `{ connection: { url: 'redis://localhost:6379' } }`
from the e2e environment, and that the module rejects a missing `REDIS_URL`
instead of constructing a localhost connection.

The test should mock/capture `BullModule.forRoot()` before importing the module;
it must not open a Redis connection or execute an e2e deployment doorbell.

## 6. Environment and security behavior

`REDIS_URL` is the canonical contract (`.env.example:12-13`), and Docker's
production API receives `.env` via `docker-compose.yml:56-67`; the Redis
service is exposed as `redis:6379` inside the Compose network and `6379:6379`
to the host (`docker-compose.yml:22-34`). Production should therefore provide
the appropriate `redis://redis:6379` or authenticated/TLS URL in `.env`.

URL parsing preserves hostname, explicit port, username, password, and
database path. `rediss://` preserves TLS intent. Do not log the raw URL or
individual credentials; passwords must remain in environment/secret storage,
and any diagnostic output must redact user info and query/credential material.

## 7. Classification

**UNAMBIGUOUS_MINIMAL_FIX**

The canonical variable, installed BullMQ URL type, affected production file,
and e2e environment file are all directly evidenced. No helper or architectural
decision is required.

## 8. Exact mechanical instruction for Luna

1. Add a focused test at
   `apps/api/src/modules/activity-timeline/__tests__/activity-timeline-redis-connection.spec.ts`.
2. Mock/capture `BullModule.forRoot()` before importing
   `activity-timeline.module.ts`; assert the current implementation is RED
   because it does not use `REDIS_URL`.
3. Assert the corrected implementation passes
   `connection: { url: process.env.REDIS_URL }` and rejects an absent
   `REDIS_URL` rather than falling back to localhost.
4. Replace only `activity-timeline.module.ts:14-20` with required
   `REDIS_URL` validation and `connection: { url: redisUrl }`.
5. Add
   `process.env.REDIS_URL = 'redis://localhost:6379';` to
   `apps/api/test/setup-e2e-env.ts`.
6. Run the focused command in section 5; require RED before the production
   edit and GREEN after it.
7. Do not modify queue names, deployment state, workers, producers, migrations,
   or any file outside this Working Set.
