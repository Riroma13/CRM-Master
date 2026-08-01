# Design: SPEC-0025 — Identity Platform

> **Status:** APPROVED_WITH_CONDITIONS. Authorized for Tasks and Apply. `d41f8dec` is **CURRENT_MAIN**. `5641914:packages/database/prisma/migrations/20260720230000_add_identity/migration.sql` is **RECOVERY_ONLY**, never imported; `c1a2f90` remains history only. Excludes SPEC-0027/0028, shared foundation, frontend identity, client RBAC, SSO/SCIM, and Better Auth cleanup.

## 1. Executive Summary
Identity adds a tenant-bound provider gate, append-only authorization recovery, and transactional audit intent. Host authority is corrected to the existing middleware boundary, while `CoreModule` is the feature composition point. Catalog drift disables Identity before routes activate; request mismatches deny without leaking tenant data. Audit delivery uses the existing BullMQ policy only.

## 2. Technical Approach
`apps/api/src/common/middleware/tenant-resolve.middleware.ts:27-85` is the canonical Host boundary. It will strictly canonicalize `Host`, resolve and retain `hostTenantId`, and reject malformed, multiple, or untrusted-proxy-conflicting authority before authentication. `BetterAuthGuard:80-90` must stop replacing that value; a proposed Identity organization guard compares the Host tenant's `betterAuthOrganizationId` to the authenticated provider organization.

Identity is a feature module imported by the existing pure `CoreModule`; `tenant/tenant.module.ts` remains a tenant-feature aggregator with imports only. The current root (`app.module.ts`) already registers the middleware and global guard, so no root edit is planned: changing it would reintroduce the documented hot-file regression. Static catalog validation runs from the proposed Identity module at boot; request-time provider calls use the existing `apps/api/src/common/auth-client.provider.ts` (`AUTH_CLIENT`, `createAuth(prisma.$client)`).

### Guard registration and protected-route scope
`IdentityOrganizationGuard` uses **route-level `@UseGuards(IdentityOrganizationGuard)`**, not `APP_GUARD`. `IdentityModule` owns and provides the injectable guard; `CoreModule` imports `IdentityModule`, which creates the module and its provider at bootstrap. The guard constructor injects `AUTH_CLIENT`, `PrismaService`, and the Identity RBAC engine. Each protected handler in the proposed `IdentityController` declares the guard directly, so Nest resolves the provider through `IdentityModule` and invokes it for that handler after the existing global guards. It independently reads immutable `hostTenantId` and the Better Auth session; it MUST NOT rely on `BetterAuthGuard`'s mutable `request.tenantId` or `request.user`.

| Controller / route | Host tenant | Better Auth session | Organization membership | RBAC |
|---|---|---|---|---|
| `IdentityController` `POST /api/v1/identity/invitations` | Required | Required | Required | `auth:create` |
| `IdentityController` `DELETE /api/v1/identity/invitations/:invitationId` | Required | Required | Required | `auth:delete` |
| `IdentityController` `POST /api/v1/identity/memberships` | Required | Required | Required | `user:assign` |
| `IdentityController` `PATCH /api/v1/identity/memberships/:memberId/role` | Required | Required | Required | `role:update` |
| `IdentityController` `DELETE /api/v1/identity/memberships/:memberId` | Required | Required | Required | `user:revoke` |
| `IdentityController` `POST|PATCH|DELETE /api/v1/identity/teams[/:teamId]` | Required | Required | Required | `configuration:create|update|delete` |
| `IdentityController` `POST|PATCH|DELETE /api/v1/identity/roles[/:roleId]` | Required | Required | Required | `role:create|update|delete` |
| `IdentityController` `PUT /api/v1/identity/policies/:subjectId` | Required | Required | Required | `permission:update` |

The route-level guard is deliberately absent from `POST /api/v1/identity/invitations/:invitationId/accept`: acceptance needs pre-membership access and is validated by a single-use, unexpired invitation token instead. It is also absent from health/public endpoints, legacy authentication bootstrap endpoints (`/api/v1/auth/login`, `/check-user`, `/register`, `/logout`), client-auth bootstrap endpoints, public API/webhook endpoints, and every non-Identity controller. No guard is attached to a provider-owned Better Auth endpoint outside Nest's controller pipeline; such an endpoint is out of scope until it is wrapped by one of the routes above.

One admin-client transaction writes a deterministic mutation, append-only authorization row, and outbox row. A leased authorization processor performs provider-side purge/deny recovery; a separate proposed dispatcher claims outbox rows and enqueues immutable events. These are server-side contracts only; no frontend/API surface is introduced by this scope.

## 3. Architecture Decisions
| Decision | Options | Chosen | Rationale |
|---|---|---|---|
| Host authority | `TenantModule`; request Host middleware | Existing middleware | It is the current request authority; TenantModule cannot own logic. |
| Feature wiring | `app.module.ts`; CoreModule | CoreModule import | Preserves root/composition hot-file constraint. |
| Organization gate binding | module import only; `APP_GUARD`; route-level guard | route-level `@UseGuards` on listed Identity handlers | A module import alone does not execute a guard. Explicit handler binding guarantees execution without applying organization authorization to public/bootstrap routes. |
| Authorization history | overwrite; append-only | append-only + active partial index | Preserves provenance and permits a new mutation after terminal state. |
| Delivery retries | ingestion loop; BullMQ | BullMQ five attempts | The existing queue already owns delivery retry/backoff. |

## 4. Data Flow
```
Client Host -> TenantResolveMiddleware -> BetterAuthGuard -> IdentityOrganizationGuard
     |              hostTenantId                 |                 |
     |                                           session/org       403 deny
     +-> transaction(mutation + operation + outbox) -> response
                         |                         |
                      processor lease          dispatcher lease -> audit-ingestion(jobId=eventId)
                                                    |                     |
                                                 conditional state        AuditEvent / DLQ
```
Malformed/ambiguous Host returns `400`; inactive/unknown retains existing `403/404` behavior, while Identity requires a resolved Host tenant. Static catalog incompatibility disables Identity routes at boot. A request uses only `Host`; `authorization` and `cookie` are the only forwarded provider headers.

## 5. Working Set
### 5.1 Primary Files
| # | File | Action | Reason |
|---:|---|---|---|
| 1 | `apps/api/src/common/middleware/tenant-resolve.middleware.ts` | Modify | Strict Host/proxy validation; preserve `hostTenantId`. |
| 2 | `apps/api/src/common/guards/better-auth.guard.ts` | Modify | Never overwrite Host-derived context; expose authenticated subject only. |
| 3 | `apps/api/src/common/auth-client.provider.ts` | Modify | Proposed allowlisted provider-session adapter port. |
| 4 | `apps/api/src/modules/identity/identity.module.ts` | Create | Proposed feature owner; imports its guard, catalog preflight, service, processor, and dispatcher. |
| 5 | `apps/api/src/modules/identity/identity-organization.guard.ts` | Create | Proposed exact owner of Host/provider organization equality. |
| 6 | `apps/api/src/modules/identity/identity-catalog-preflight.service.ts` | Create | Proposed exact owner of static catalog/declaration gate and redacted diagnostics. |
| 7 | `apps/api/src/modules/core/core.module.ts` | Modify | Alphabetically import IdentityModule; valid feature composition path. |
| 8 | `packages/database/prisma/schema.prisma` | Modify | Proposed operation/outbox models and catalog compatibility fields. |
| 9 | `packages/database/prisma/migrations/YYYYMMDDHHMMSS_add_identity_platform/migration.sql` | Create | Additive SQL, including partial unique index. |
| 10 | `apps/api/src/modules/audit/ingestion/ingestion.service.ts` | Modify | Replace failed logging hook (172-177) with terminal disposition/DLQ integration. |

### 5.2 Secondary Files
| # | File | Action | Reason |
|---:|---|---|---|
| 1 | `apps/api/src/modules/audit/audit.module.ts` | Modify | Export/register proposed completion-disposition collaborator; retain queue options. |
| 2 | `apps/api/src/modules/identity/identity-authorization.service.ts` | Create | Proposed atomic mutation/lease state machine. |
| 3 | `apps/api/src/modules/identity/identity-audit-dispatcher.service.ts` | Create | Proposed outbox claimant/enqueuer, owned by IdentityModule. |
| 4 | `apps/api/src/modules/identity/identity-authorization.processor.ts` | Create | Proposed leased provider recovery processor, owned by IdentityModule. |
| 5 | `apps/api/src/modules/identity/__tests__/identity-authorization.spec.ts` | Create | RED-1–5 authorization/provider state tests. |
| 6 | `apps/api/src/modules/identity/__tests__/identity-audit-outbox.spec.ts` | Create | RED-6–8 audit/lease/DLQ tests. |
| 7 | `apps/api/src/common/middleware/tenant-resolve.middleware.spec.ts` | Modify | RED-9 Host/proxy parsing tests. |
| 8 | `apps/api/test/doorbell/identity-isolation.e2e-spec.ts` | Create | RED doorbell A/B Host, provider, operation, outbox isolation. |

### 5.3 Expected NOT to Change
- `apps/api/src/modules/tenant/tenant.module.ts` — pure aggregation; no providers, guards, middleware, or Identity business logic.
- `apps/api/src/app.module.ts` — existing root registration proves the boundary; CoreModule avoids a hot-file regression.
- `apps/*-web/`, SPEC-0027/0028, recovery migration, and the design template — excluded.

### 5.4 Approved Prisma delegate collision correction
The legacy logical Prisma model is named `LegacyUser` and remains mapped to the
physical `users` table with all fields, relations, indexes, and mappings
unchanged. Better Auth's logical `user` model remains mapped to `ba_users`.
This removes the case-insensitive Prisma delegate collision: legacy callers use
`prisma.admin.legacyUser`, while Better Auth retains its canonical default
`user` resolution and no `modelName` override. Because only logical model
metadata and callers change, no SQL migration or physical table rename is
created. Rollback is bounded to the schema source, generated client, and
legacy callers; durable tables and migration history remain untouched.

## 6. Read Order
1. `tenant-resolve.middleware.ts` — actual Host authority and cache semantics.
2. `better-auth.guard.ts` and `auth-client.provider.ts` — current overwrite/provider construction.
3. `core.module.ts`, `tenant.module.ts`, `audit.module.ts` — valid composition and queue ownership.
4. `ingestion.service.ts` — five-attempt policy, conflict loop, failed hook.
5. `schema.prisma` — **CURRENT_MAIN** physical catalog; it proves invitation has no `expiresAt`/inviter relation and no `updatedAt`.
6. `pnpm-lock.yaml` and `apps/api/package.json` — package metadata proves Better Auth 1.6.23 resolution; `apps/api/node_modules/better-auth` is unavailable and declarations are an implementation preflight input.
7. recovery migration — historical-only evidence, never copied/imported.

## 7. Expected Commands
```bash
pnpm --filter @crm-master/database db:migrate # planned additive migration
pnpm --filter @crm-master/database generate # planned Prisma and scope generation
pnpm --filter api test -- tenant-resolve.middleware.spec.ts identity-authorization.spec.ts identity-audit-outbox.spec.ts # planned RED/GREEN
pnpm --filter api test:e2e -- identity-isolation.e2e-spec.ts # planned doorbell
pnpm --filter api lint # planned lint
pnpm --filter api build # planned build
```

## 8. Design Confidence
**Confidence:** Medium. Current source, schema, queue configuration, lockfile, and recovery commit were inspected; installed Better Auth declarations and recovery working files are unavailable, so implementation must run fatal catalog/declaration preflight before activation.

## 9. Exploration Budget
| Resource | Budget | Notes |
|---|---:|---|
| Repo searches | 14 | composition, gates, queue, schema, tests |
| Files to read | 24 | includes installed declarations if present at Apply |
| Files to create | 7 | proposed Identity/migration/tests |
| Files to modify | 7 | bounded wiring and existing gates |

## 10. Risks
| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Provider/catalog drift | Med | High | Fatal redacted boot diagnostic; routes/workers remain disabled. |
| Host context overwrite | Med | Critical | Immutable `hostTenantId`; guard equality RED doorbell. |
| Lease/queue loss | Med | High | Conditional predicates, idempotent IDs, BullMQ-only delivery. |

### Applicable Threat / Failure Matrix
| Boundary | Threat/failure | Enforced response | RED/doorbell proof |
|---|---|---|---|
| Host routing | spoofed, malformed, multiple Host; `X-Forwarded-Host` conflict | strict `Host` parse; reject `400`; proxy header ignored unless trusted and exact match | RED-9 |
| Provider gate | omitted guard, missing Host/session/membership, org mismatch, unauthorized RBAC, non-allowlisted headers | listed handlers bind the guard; forward only `authorization`,`cookie`; fail closed | RED-1, doorbell-1 |
| Tenant persistence | A/B operation or outbox leakage | tenant predicates/scoped reads; zero rows | doorbell-2 |
| Static/request gate | catalog or provider failure | boot disables routes/workers; request `503` gate code | RED-2 |
| Authorization worker | crash, expired lease, retry, stale completion | reclaim only eligible row; stale update count 0; terminal deny | RED-3–5 |
| Audit queue | lost/duplicate/DLQ terminal failure | eventId job id; conditional delivery; one terminal alert/DLQ | RED-6–8 |
| Migration | partial-index/catalog mismatch | migration/preflight fail before activation | RED-2, RED-4 |
| VCS/shell/executable classification | no such boundary | N/A — no commands/process execution added | N/A |

## 11. Testing Strategy
| Layer | Focus | Approach |
|---|---|---|
| Unit | guard binding, Host/session/membership/RBAC failure mapping; IDs, predicates, deterministic backoff | controller metadata + mocked provider/RBAC; RED-1,3–5 |
| Integration | catalog, transaction, queue disposition | DB/queue fixtures; RED-2,6–8 |
| Doorbell | tenant A/B Host/org/operation/outbox | real DB when configured; doorbell-1–2 |
| Regression | existing BullMQ policy | assert five attempts and conflict-loop-only retry |

## 12. Doorbell Tests
| Test file | What it proves |
|---|---|
| `identity-isolation.e2e-spec.ts` | doorbell-1: a listed protected handler executes the guard; A Host + B provider org returns `403 IDENTITY_ORGANIZATION_MISMATCH` and preserves Host tenant. |
| `identity-isolation.e2e-spec.ts` | doorbell-2: A cannot claim/read/complete B authorization or outbox row. |

## 13. Required ADRs
| ADR | Reason | Status |
|---|---|---|
| ADR-0025 | Prisma durable state, partial index, retention | Proposed |
| ADR-0002 | generated tenant scoping baseline | Existing |

## 14. Boundaries
| Boundary | Owner | Purpose |
|---|---|---|
| Host resolution | common middleware | resolve immutable Host tenant; not auth/provider logic |
| Provider/session equality | Identity guard/service | session header allowlist and Host-org equality; not TenantModule |
| Operation/outbox | Identity service | atomic intent and lease state; not Audit writer |
| Audit ingestion/DLQ | Audit module | chain, queue and terminal disposition; not authorization retry |

## 15. Extensibility
| Future feature | How it fits | Effort |
|---|---|---|
| SSO/SCIM (excluded) | new provider adapter behind same closed equality gate | Weeks |
| Client RBAC (excluded) | new subject policy; no mutation-ID/Host changes | Weeks |
| archival | ADR-backed terminal-history exporter | Days |

---

## Architecture Review Preparation (MANDATORY)
### A. Scalability
**Question:** How does this scale at 10×/100×?
| Factor | 10× | 100× | Mitigation |
|---|---|---|---|
| Storage/queue | linear | material backlog/history | indexes, bounded claims, measure retention |
**Decision:** indexed tenant/time state, no premature partitioning.
**Rationale:** preserves audit provenance with bounded worker work.
**Alternative:** immediate partitioning.
**Future impact:** additive archive/partition ADR when measured.

### B. Open/Closed Principle (OCP)
**Question:** Can capability be added without weakening gates? **Point of extension:** proposed provider adapter and mapping registry. **What must change to add one more:** adapter + mapping + RED case.
**Decision:** closed Host/equality gate, extensible adapter.
**Rationale:** prevents guard branches.
**Alternative:** feature conditionals.
**Future impact:** approved SSO/SCIM can plug in later.

### C. Ownership
**Question:** Who owns data/capability?
| Data / Capability | Owner | Consumers |
|---|---|---|
| operation/outbox | Identity | processor, dispatcher |
| audit chain/DLQ | Audit | Identity dispatcher |
**Decision:** single writer per state.
**Rationale:** eliminates cross-context races.
**Alternative:** dispatcher mutates authorization.
**Future impact:** transfer requires ADR.

### D. Data Retention
**Question:** What lives/how long?
| Data | Lifetime | Archive | Deletion |
|---|---|---|---|
| FAILED/PURGED and outbox | explicit retained provenance | future ADR review | no automatic deletion |
**Decision:** retain auditable terminals.
**Rationale:** investigation needs provenance.
**Alternative:** TTL.
**Future impact:** measured archive policy remains additive.

### E. Idempotency
**Question:** What if repeated?
| Operation | Duplicate risk | Protection | Fallback |
|---|---|---|---|
| mutation | replay | UUIDv5 + unique triple | original result |
| audit job | enqueue/retry | `jobId=eventId` + predicate | duplicate accepted |
**Decision:** database/queue idempotency.
**Rationale:** caller/worker replay safe.
**Alternative:** random IDs/application checks.
**Future impact:** all producers retain identities.

### F. Shared Contracts
**Question:** Is a typed cross-module contract needed?
| Contract | Location | Consumers | Producers |
|---|---|---|---|
| Identity port/events | Identity module | Audit/processor | Identity service |
**Decision:** internal TypeScript contracts; no frontend contract.
**Rationale:** frontend identity is excluded.
**Alternative:** shared package now.
**Future impact:** extract only with approved scope.

### G. Partitioning Strategy
**Question:** Partition by tenant/time/volume?
| Dimension | Risk | Strategy |
|---|---|---|
| tenant/time/volume | leakage/growth/backlog | tenant-leading keys, timestamps, additive future partition |
**Decision:** no partition now.
**Rationale:** no measured need.
**Alternative:** immediate partitions.
**Future impact:** identities/indexes survive additive partitioning.

## 16. Interfaces / Contracts
```typescript
type AuthorizationStatus = 'PENDING' | 'PURGING' | 'FAILED' | 'PURGED';
interface HostTenantContext { hostTenantId: string; hostTenantSlug: string }
interface ProviderSession { userId: string; activeOrganizationId: string | null }
interface IdentityProvider { getSession(headers: Pick<Headers, 'get'>): Promise<ProviderSession | null> }
interface OutboxEvent { eventId: string; tenantId: string; mutationId: string; eventType: string; payload: Record<string, unknown> }
```
`TenantResolveMiddleware` proposes `hostTenantId`/`hostTenantSlug`; `BetterAuthGuard` may add `request.user` but MUST NOT assign `tenantId`/slug for Identity routes. The route-bound Identity guard calls `AUTH_CLIENT` session retrieval with a new `Headers` containing only incoming `authorization` and `cookie`, then loads provider membership and evaluates the listed RBAC permission. It fails closed as follows: absent resolved Host context -> `403 IDENTITY_TENANT_CONTEXT_REQUIRED`; no session -> `401 IDENTITY_SESSION_REQUIRED`; no membership in the Host tenant organization -> `403 IDENTITY_ORGANIZATION_MEMBERSHIP_REQUIRED`; a different active organization -> `403 IDENTITY_ORGANIZATION_MISMATCH`; denied role/permission -> `403 IDENTITY_PERMISSION_DENIED`. Malformed/ambiguous Host remains the middleware's prior `400`. Boot catalog failure is `IDENTITY_CATALOG_MISMATCH` (redacted table/column/type/nullability diagnostic); routes/workers stay disabled. Invitation acceptance is token-authorized before membership and is explicitly outside this guard; health, public, bootstrap, webhook, and non-Identity routes are also excluded.

```prisma
model IdentityAuthorizationOperation { // proposed; mapped fields omitted only where conventional
  id String @id @default(uuid())
  tenantId String @map("tenant_id")
  subjectId String @map("subject_id")
  mutationId String @map("mutation_id")
  status String @default("PENDING")
  attempts Int @default(0)
  maxAttempts Int @default(5) @map("max_attempts")
  nextAttemptAt DateTime @default(now()) @map("next_attempt_at")
  leaseOwner String? @map("lease_owner")
  leaseExpiresAt DateTime? @map("lease_expires_at")
  terminalAt DateTime? @map("terminal_at")
  terminalReason String? @map("terminal_reason")
  purgeConfirmedAt DateTime? @map("purge_confirmed_at")
  @@unique([tenantId, subjectId, mutationId])
  @@index([status, nextAttemptAt])
}
model IdentityAuditOutbox { /* proposed: eventId unique; mutationId+eventType unique; PENDING|LEASED|DELIVERED|FAILED; tenant/event/payload/lease/error timestamps */ }
```
Migration additionally executes `CREATE UNIQUE INDEX ... ON identity_authorization_operations(tenant_id, subject_id) WHERE status IN ('PENDING','PURGING')`.

`mutationId=v5(50be45c0-b8f5-48d0-8c2f-2431aa0c5cb0,"mutation:{tenantId}:{operation}:{resourceId}:{key}")`; require RFC-4122 `Idempotency-Key`. `eventId=v5(namespace,"audit:{tenantId}:{event}:{resourceId}:{mutationId}")`. Preserve 14 mappings: invitation created/accepted/canceled/expired=`auth:create/assign/delete/update`; membership created/roles-changed/removed=`user:assign`,`role:update`,`user:revoke`; team created/updated/deleted=`configuration:create/update/delete`; role created/updated/deleted=`role:create/update/delete`; policy updated=`permission:update`.

**Atomic operation SQL/predicates:** claim in one `UPDATE ... SET status='PURGING', attempts=attempts+1, lease_owner=$owner, lease_expires_at=now()+interval '60 seconds' WHERE id=$id AND ((status='PENDING' AND next_attempt_at<=now()) OR (status='PURGING' AND lease_expires_at<=now())) RETURNING *`. Success: `WHERE id=$id AND status='PURGING' AND lease_owner=$owner AND lease_expires_at>now()` -> `PURGED`, confirmation timestamp, ownership cleared. Transient failure uses that same owner/status/unexpired predicate: if `attempts < max_attempts`, clear owner and set `PENDING, next_attempt_at=now()+make_interval(secs => LEAST(300, 5 * power(2, attempts - 1)::int))`; otherwise atomically set `FAILED, terminal_at=now(), terminal_reason=$code`, clear owner. Expired PURGING is reclaimable; stale completion updates zero rows and is no-op/failure. PENDING/PURGING/FAILED remain deny; FAILED/PURGED retain provenance and a server-derived new mutation may insert.

**Named RED transition proof:** RED-3 `claims-pending-or-expired-purging-only`; RED-4 `success-requires-live-owner-and-marks-purged`; RED-5 `transient-backoff-exhaustion-and-stale-completion`; RED-6 `new-server-mutation-follows-failed-or-purged-history`; RED-7 `outbox-claim-and-duplicate-job-idempotency`; RED-8 `audit-terminal-dlq-one-alert`; RED-9 `host-spoof-multiple-and-proxy-rejection`. RED-1 is `identity-route-guard-executes-and-fails-closed`: assert each listed route has `IdentityOrganizationGuard`, a valid Host/session/membership/permission reaches its handler, missing Host -> `403 IDENTITY_TENANT_CONTEXT_REQUIRED`, missing session -> `401 IDENTITY_SESSION_REQUIRED`, no membership -> `403 IDENTITY_ORGANIZATION_MEMBERSHIP_REQUIRED`, A-Host/B-org -> `403 IDENTITY_ORGANIZATION_MISMATCH`, and a denied permission -> `403 IDENTITY_PERMISSION_DENIED`; assert invitation acceptance and health/bootstrap/public routes remain reachable without organization authorization. RED-2 is `catalog-preflight-disables-routes-and-workers`.

**Audit contract:** dispatcher claims `PENDING`/expired `LEASED` with a 60-second lease and predicate, enqueues `audit-ingestion` with `jobId=eventId`; existing-job duplicate is accepted. Completion conditionally updates `WHERE id=$id AND status='LEASED' AND lease_owner=$owner` to DELIVERED. `audit-ingestion` retains five exponential 2s attempts; `MAX_RETRIES=3` remains only its sequence-conflict loop and never requeues. On final failure (`job.attemptsMade >= (job.opts.attempts ?? 1)`), the replacement hook conditionally transitions that predicate to FAILED, writes one redacted DLQ payload `{eventId,tenantId,mutationId,eventType,jobId,errorCode,failedAt}` and emits one alert; repeated hooks update zero rows. Invalid payload is terminal/non-retryable.

**Catalog provenance:** CURRENT_MAIN schema proves nullable unique `Tenant.betterAuthOrganizationId`; `organization.slug` nullable; invitation has `inviterId` scalar but no relation, `expiresAt`, or `updatedAt`; session has no `activeOrganizationId`. Provider compatibility requirements (`organization.slug` non-null/unique, invitation expiry + inviter FK, session active organization) are **PROPOSED** and must be checked against installed Better Auth 1.6.23 declarations at Apply. Any physical/declaration mismatch is fatal preflight, not a claimed current fact.

## 17. Migration Strategy
| Step | Description | Risk | Rollback |
|---:|---|---|---|
| 1 | ADR, additive schema/index migration, generate | index/catalog mismatch | do not activate; forward-fix additive migration |
| 2 | deploy Core-wired Identity gate/worker disabled until preflight passes | provider drift | disable Identity routes/workers; preserve rows |
| 3 | enable routes then processors/dispatcher | queued terminal failure | stop workers; records remain auditable |

## 18. Open Questions
| # | Question | Status | Resolution |
|---:|---|---|---|
| 1 | Exact Better Auth declaration shape? | Resolved preflight | unavailable checkout input; fatal implementation-time declaration/catalog check. |
| 2 | State/queue test coverage? | Resolved | nine RED plans: provider/org, catalog, claim/success, retry/exhaustion, stale lease, outbox duplicate, DLQ, mappings, Host; plus two doorbells. |
| 3 | Hidden blockers? | None | no blocker is hidden; implementation is gated by preflight and ADR. |

> **Template compliance:** Sections 1–18, required tables, ASCII flow, A–G review blocks, and applicable matrix are literal. This artifact changes no runtime code.
