# Contract: SPEC-0025 - Identity & Organization Platform

**Planning mode:** SDD-Direct
**Scope:** Identity & Organization Platform Phase 1
**Contract status:** Workload Guard READY; Apply not executed in this planning continuation

This contract is the implementation authority for tenant users, teams,
memberships, roles, invitations, security policy, directory reads, migration,
cleanup, and audit behavior. It is a planning contract, not runtime code.
The historical `architecture-review.md`, prior Direct review,
`architecture-review-direct-repeat.md`, approved repeat review
`architecture-review-direct-repeat-2.md`, and prior `design-refinement.md`
remain unchanged. `design-refinement-repeat.md` is the additive resolution
record for AR-012 through AR-014 and the concrete conditions below.

## 1. Scope

Phase 1 provides:

- Tenant-scoped local Identity projections linked to Better-Auth user IDs.
- Team hierarchy with explicit depth semantics and same-tenant relationships.
- Tenant RBAC with one validated permission grammar, cache invalidation, typed
  mutation events, and required Identity audit delivery.
- Better-Auth organization invitations with a local tenant-scoped projection,
  signed delivery link, hash-only token storage, and provider-owned lifecycle.
- Security policy storage and bounded directory queries.
- A report-driven, idempotent legacy-user and invitation migration boundary.
- Safe stale-claim cleanup that never accepts an invitation from unproven
  provider state.

Phase 1 does not provide SSO, SCIM, ABAC, client-portal RBAC, frontend Identity
screens, a migration of every legacy controller to Identity permissions, or a
platform-wide refactor of pre-existing provider-table writers.

The existing legacy permission guard remains a compatibility boundary for
controllers outside this change. `ClientUser` remains owned by the client
authentication boundary and is not a local Identity projection.

## 2. Review Evidence and Refinement Authority

`architecture-review.md` is historical rejected evidence. The independent
Direct review is preserved in `architecture-review-direct.md`, and the first
repeat review is preserved in `architecture-review-direct-repeat.md`.
`architecture-review-direct-repeat-2.md` approves the refined package with
implementation conditions. `design-refinement.md` and
`design-refinement-repeat.md` record the resolution decisions without rewriting
the review artifacts.

| Finding group | Contract disposition |
|---|---|
| AR-001 | Better-Auth v1.6.23 generated Prisma provider schema is the provider-owned schema boundary. No invented provider columns, custom undocumented mapping, or provider-table CRUD is allowed. |
| AR-002 | Identity requires a real Host-derived tenant and a non-empty scoped client. Development first-tenant fallback and legacy session tenant overwrite cannot satisfy Identity routes. |
| AR-003 | Preflight, exact mapping manifest, quarantine/error policy, idempotent backfill, redacted report, non-zero exit, and forward-fix boundary are mandatory before enablement. |
| AR-004 | Only typed Better-Auth APIs may read invitation state. Pending/non-expired is the only affirmative cleanup signal; unavailable state remains retryable. |
| AR-005..AR-011 | Each condition is a testable acceptance contract and has one owner in `tasks.md`. |
| AR-012 | The repository-resolved Better-Auth `1.6.23` and Prisma `6.19.3` versions are pinned. The separate `auth@1.6.23` CLI is added, loaded through an exported config, run with an exact `cwd/config/output` command, and reconciled against the provider block and database catalog before Prisma migration generation. |
| AR-013 | `AuthProviderPort` validates provider user, email, organization, member, local active status, and role mapping for session, invitation, cleanup, and migration paths. Manifest mappings are explicit, hashed, tenant-specific, and fail closed. |
| AR-014 | `docs/adr/0025-identity-organization-platform.md` is created under the repository's `docs/adr/` convention, declared in the Working Set, and required before schema Apply. |
| AR-015..AR-022 | Guard order, scoped operation/raw SQL coverage, provider/local roles, constraint inventory, migration artifact paths, audit retry IDs, scope-manifest schema, and Host/version trust are concrete conditions in `design-refinement-repeat.md`. |

## 3. Actors and Tenant Resolution

The request context is assembled in this order:

1. `TenantResolveMiddleware` parses one normalized `Host` value and resolves
   exactly one `<slug>.<CRM_BASE_DOMAIN>` tenant subdomain through the platform
   tenant lookup. `CRM_BASE_DOMAIN` is required outside tests. An untrusted
   `X-Forwarded-Host` is ignored; a forwarded host is accepted only from a
   configured trusted proxy and only when it contains one value.
2. A valid Identity request must carry `tenantResolutionSource = 'host'` and a
   non-empty `tenantId`. Reserved hosts, the apex host, localhost, IP literals,
   untrusted suffixes, missing Host, comma-separated forwarded hosts, and the
   development first-tenant fallback are not tenant context. The accepted host
   grammar is one ASCII slug label followed by the exact configured base domain.
3. `IdentitySessionGuard` calls `auth.api.getSession({ headers })` with the
   request headers. The provider user ID is never accepted from a body, query,
   URL, or caller-selected tenant.
4. The provider organization ID from the tenant record is required and is
   compared with the provider session, member, invitation, and migration
   context. A missing mapping fails before any provider mutation.
5. Identity resolves local `User` by
   `forTenant(tenantId).user.findFirst({ where: { betterAuthUserId } })` and
   evaluates local RBAC using the local user ID.

The Host-derived tenant remains authoritative. A legacy guard may validate an
existing session for non-Identity routes, but it must not overwrite a resolved
Identity tenant. A superadmin cannot use an apex/admin host to satisfy a tenant
Identity route; Mission Control access remains a separate platform boundary.

`PrismaService.forTenant()` rejects non-string, `undefined`, `null`, empty, and
whitespace tenant IDs. A scoped client rejects platform/provider models,
unsupported bulk operations, all raw SQL methods, and any transaction path that
could expose the admin client. It never returns the unscoped admin client for an
Identity call.

Background maintenance receives an explicit tenant ID from a trusted
enumeration boundary and uses `forTenant(tenantId)` for local tenant data. It
does not turn that maintenance boundary into a request tenant selector.

## 4. Data Entities and Ownership

| Entity | Owner | Provider or local data | Tenant rule |
|---|---|---|---|
| `Tenant` | Tenant platform | Local | Host resolution starts from the tenant slug. |
| local `User` | Identity projection with legacy compatibility | Local | `tenantId` is required; `betterAuthUserId` is nullable only for legacy rows and is unique per tenant when present. |
| `Team` | Identity | Local | `tenantId` is required; parent is nullable but, when present, must share tenant and satisfy depth. |
| `Role` | Identity | Local | `tenantId` is required; system roles are protected. |
| `Membership` | Identity | Local | User, team, role, and membership tenant IDs are enforced together. |
| local `Invitation` | Identity projection | Local | Links to one tenant and optionally a provider invitation during legacy migration. New active rows require provider link state `mapped`; local token hash only. |
| `SecurityPolicy` | Identity | Local | Exactly one row per tenant. |
| `AuditEvent` | Audit platform | Local | Identity mutation and migration events carry tenant, actor, outcome, and correlation ID without secrets. |
| Better-Auth `user`, `session`, `organization`, `member`, `invitation` | Better-Auth | Provider-owned | Access only through typed Better-Auth APIs. Their Prisma schema is generated from the configured provider/plugin boundary. |

Better-Auth `organizationId` is provider metadata. It is never a local
Identity scope key and never replaces `tenantId` in a local query.

## 5. API Contract

All routes use the controller prefix `/api/v1/tenant/identity`. The tenant is
resolved from the Host header and is absent from request DTOs.

| Method and route | Auth and permission | Input | Success output |
|---|---|---|---|
| `GET /users` | Identity session; `users:read` | `teamId?`, `roleId?`, `q?`, `page?`, `limit?` | Bounded tenant user summaries and pagination metadata. |
| `GET /users/:userId` | Identity session; `users:read` | Local opaque `userId` | Tenant-scoped user summary with teams and roles. |
| `GET /teams` / `GET /teams/:teamId` | Identity session; `teams:read` | Optional active filter | Tenant-scoped team summaries/tree/detail. |
| `POST /teams` | Identity session; `teams:create` | `name`, `description?`, `parentTeamId?` | Created team summary. |
| `PATCH /teams/:teamId` | Identity session; `teams:update` | `name?`, `description?` | Updated team summary. |
| `DELETE /teams/:teamId` | Identity session; `teams:delete` | Local opaque `teamId` | Soft-deleted team result. |
| `GET /teams/:teamId/members` | Identity session; `users:read` | Local opaque `teamId` | Tenant-scoped membership summaries. |
| `POST /teams/:teamId/members` | Identity session; `users:update` | `userId`, `roleId` | Created membership summary. |
| `PATCH /teams/:teamId/members/:userId/role` | Identity session; `users:update` | `roleId` | Updated membership summary. |
| `DELETE /teams/:teamId/members/:userId` | Identity session; `users:update` | Local opaque IDs | Deleted membership result. |
| `GET /roles` | Identity session; `roles:read` | None | Tenant roles and validated permissions. |
| `POST /roles` / `PATCH /roles/:roleId` | Identity session; `roles:create` or `roles:update` | Role name, description, permissions | Role summary. |
| `DELETE /roles/:roleId` | Identity session; `roles:delete` | Local opaque `roleId` | Deletion result; system roles are rejected. |
| `GET /permissions` | Identity session | None | Effective permissions for the current local user. |
| `GET /invitations` | Identity session; `users:read` | `status?`, `page?`, `limit?` | Local invitation summaries with no token material. |
| `POST /invitations` | Identity session; `users:create` | `email`, `roleId`, `teamId?`, `idempotencyKey?` | Local invitation ID, provider-linked status, expiry, delivery status. No raw token. |
| `POST /invitations/:invitationId/cancel` | Identity session; `users:update` | Local invitation ID | Cancelled local/provider invitation summary. |
| `POST /invitations/accept` | Authenticated Better-Auth invitee session; no RBAC permission | `token`, `signature` | Local user ID, membership summary, accepted status. No session token. |
| `GET /security-policy` / `PATCH /security-policy` | Identity session; `roles:admin` | Validated policy fields | Tenant policy projection. |
| `GET /directory/search` | Identity session; `users:read` | Required `q`, bounded `limit` | Tenant-scoped users and teams. |

The invitee must sign up or sign in through Better-Auth before acceptance.
Acceptance verifies the local signed link and session email, calls the typed
provider `getInvitation`/`acceptInvitation` APIs with request headers, and then
projects the provider user into the local tenant. Identity never creates a
local auth session or password.

## 6. Inputs, Outputs, and Error Contract

NestJS DTOs reject unknown fields. No input accepts a caller tenant ID,
password, session token, provider table record, token hash, or provider access
token.

| Error code | HTTP/status or process result | Meaning |
|---|---:|---|
| `IDENTITY_AUTH_REQUIRED` | 401 | Better-Auth session is absent, expired, invalid, or not available to the Identity session guard. |
| `IDENTITY_TENANT_CONTEXT_REQUIRED` | 403 | Host is missing/reserved, development fallback was attempted, the tenant source is not `host`, or the scope is empty. |
| `IDENTITY_TENANT_MISMATCH` | 403 | Host tenant, provider organization, provider user, local projection, or resource tenant disagree. |
| `IDENTITY_UNMAPPED_PROJECTION` | 403 | The local user has no validated Better-Auth ID mapping and cannot use Identity RBAC. |
| `IDENTITY_NOT_FOUND` | 404 | A scoped resource does not exist for the active tenant. Foreign IDs use the same result. |
| `IDENTITY_CONFLICT` | 409 | A membership, mapped pending invitation, idempotency key, or claim state conflicts. |
| `IDENTITY_VALIDATION_FAILED` | 400 | DTO, permission grammar, policy, hierarchy, email, or migration input is invalid. |
| `IDENTITY_SYSTEM_ROLE_PROTECTED` | 409 | A system role cannot be deleted or weakened. |
| `IDENTITY_PROVIDER_UNAVAILABLE` | 503 | Better-Auth is unavailable or the required authenticated provider context is missing. Local acceptance is not finalized. |
| `IDENTITY_AUDIT_PENDING` | 503 | The local mutation committed but required Identity audit delivery was not accepted. The response carries a deterministic retry key and must not replay the mutation. |
| `INVITATION_SIGNATURE_INVALID` | 400 | HMAC signature is missing, malformed, cross-tenant, or does not match. |
| `INVITATION_EXPIRED` | 410 | Local expiry or an explicit provider expiry is known. |
| `INVITATION_STATE_UNAVAILABLE` | 409 | Better-Auth did not expose the invitation as pending/non-expired; the terminal reason is intentionally not inferred. |
| `INVITATION_ALREADY_USED` | 409 | The local claim is accepted, cancelled, quarantined, or already being processed. |
| `IDENTITY_MIGRATION_BLOCKED` | process exit 1 | Preflight/backfill found an unresolved, ambiguous, unmapped, provider-unavailable, or constraint-invalid row. |

Mutation outcome is explicit:

- `success`: local mutation committed, cache invalidated, typed event emitted,
  and required audit enqueue accepted.
- `failure`: mutation did not commit; the failure audit attempt is reported if
  required delivery is unavailable.
- `committed_audit_pending`: local mutation committed, but required audit
  enqueue failed. Retry uses the event ID/correlation key and never replays the
  local mutation.

Responses never include `tokenHash`, raw invitation tokens, HMAC secrets,
passwords, provider access tokens, or session tokens.

## 7. Security Rules and Invariants

- `INVITATION_SIGNING_SECRET` is required at startup and contains at least 32
  bytes of entropy. Empty, short, and development fallback values fail
  configuration.
- Invitation links contain an opaque random token and an HMAC-SHA-256 signature
  over `tenantId + "." + token`. Verification is constant-time and occurs
  before local claim or provider acceptance.
- Only `SHA-256(token)` is persisted locally. Raw token material is transient
  delivery data and is absent from logs, responses, audit metadata, reports,
  snapshots, and error strings.
- Better-Auth `1.6.23` owns authentication, provider sessions, organizations,
  members, and provider invitations. Identity uses `auth.api.getSession`,
  `auth.api.createInvitation`, `auth.api.getInvitation`,
  `auth.api.acceptInvitation`, organization/member validation APIs, and the
  documented pending-invitation API only, all behind `AuthProviderPort`.
- The separate `auth` CLI is pinned to `1.6.23`. Its exported config generates
  the provider Prisma schema to the declared evidence path; the exact output
  is reconciled with the provider block and physical `ba_*` catalog before
  Prisma `6.19.3` generates/applies the additive migration. Identity does not
  use `$queryRaw`, `$executeRaw`, or Prisma model access to `ba_*` provider
  tables.
- Every tenant-owned Identity read, write, and transaction obtains its client
  from `PrismaService.forTenant(tenantId)`. `prisma.admin`, unscoped clients,
  and empty tenant IDs are forbidden in Identity services/controllers.
- Composite tenant foreign keys cover local User, Team, Role, Membership, and
  Invitation relationships. Service validation remains required for readable
  errors and provider organization consistency.
- Local User email and Better-Auth user ID uniqueness is tenant-scoped because
  one Better-Auth user may belong to multiple provider organizations. Null
  provider IDs remain legacy-only until an explicit content-hashed mapping
  manifest and typed provider organization-member validation validate them;
  email-only matching is never automatic.
- Local RBAC is authoritative. New local roles map to provider `admin` or
  `member` only as required by Better-Auth lifecycle APIs; Identity never
  grants provider `owner`. Unknown or missing organization/role mappings fail
  before any provider call.
- Valid permissions are `<resource>:create|read|update|delete|admin`,
  `<resource>:*`, and `*:admin`. Invalid permission strings are rejected before
  persistence. Legacy permission metadata remains separate.
- Role, membership, team, invitation, policy, cleanup, and migration mutations
  invalidate the affected RBAC cache before the caller receives an authorization
  result, emit a typed event, and use the required Identity audit enqueue path.
- Better-Auth pending invitation retrieval requires the appropriate request or
  approved server-side provider context and returns only pending, non-expired
  state. An unavailable result is not a terminal-state proof.

## 8. Team Depth Semantics

Depth is identical in Prisma, migration SQL, service validation, and tests:

- A root team has `depth = 0`.
- A child has `depth = parent.depth + 1`.
- The maximum allowed depth is inclusive `3`.
- Valid persisted values are exactly `0`, `1`, `2`, and `3`.
- A child of a depth-3 team is rejected before persistence.
- SQL enforces `depth >= 0 AND depth <= 3`.
- Phase 1 does not expose arbitrary reparenting. Delete/reparent operations
  recalculate the affected subtree in a tenant-scoped transaction and reject a
  result above depth 3.

## 9. Edge Cases and Failure Behavior

- A foreign resource ID returns the same scoped not-found behavior as an unknown
  resource and emits no successful mutation event.
- A request without a real tenant subdomain cannot use the development
  fallback, even with a valid superadmin session, to access Identity routes.
- An empty or whitespace scope passed to `forTenant()` throws before a Prisma
  client can be returned.
- A provider session whose organization does not match the Host tenant is
  rejected. The legacy guard cannot overwrite the Host tenant for Identity.
- A local user with `betterAuthUserId = null` is not auto-created, email-matched,
  or authorized. An explicit provider-validated mapping manifest is required.
- Memberships with a user, team, or role from another tenant are rejected by
  service validation and composite foreign keys. Existing inconsistent rows
  block the hardening migration; they are not silently reassigned or deleted.
- Existing local invitations without a provider ID are handled by the
  preflight/backfill contract: an exact pending provider match may be mapped;
  an ambiguous or absent active match is an error and may only be quarantined
  by an explicit forward-fix decision. Historical terminal rows remain
  report-only and cannot enter the new acceptance flow.
- Duplicate pending invitation requests with the same normalized tenant email
  and idempotency key return the original local result. The database partial
  unique index and provider pending check prevent two mapped active invitations.
- Invalid HMAC, wrong tenant Host, wrong invitee email, expired/provider-
  unavailable invitation, cancelled invitation, and accepted invitation cause
  no local user, membership, or session write.
- Concurrent acceptance has exactly one local claim. A release after a provider
  failure is conditional on the claim version and cannot release a newer claim.
- A stale `processing` claim is eligible only after the configured stale window.
  Cleanup uses the typed pending provider API. Pending/non-expired exact match
  releases the claim; no match, terminal/unavailable result, missing context,
  timeout, or provider error leaves `processing`, increments retry state, and
  schedules exponential backoff. After the retry ceiling, the job alerts and
  fails while leaving the claim retryable. It never accepts or finalizes from
  an unavailable result.
- Deleting or changing a system role is rejected and audited. A role with
  memberships cannot be deleted without an explicit reassignment operation.
- Required audit enqueue failure does not roll back a committed local mutation.
  The mutation result is `committed_audit_pending`, and retry enqueues the same
  event ID without repeating the mutation. Legacy optional audit behavior is
  unchanged.
- Migration report rows contain stable IDs and hashes, not raw email, token,
  password, provider credential, or session material. Any fatal report error
  causes process exit 1 and prevents Identity enablement.

## 10. Testable Acceptance Criteria

### Provider and tenant boundary

1. Better-Auth v1.6.23 schema generation produces the exact provider fields
   required by the organization plugin, including invitation expiry and active
   organization session state; the generated provider migration applies through
   Prisma without direct provider-table CRUD in Identity.
2. Provider integration tests prove `getSession`, `createInvitation`,
   `getInvitation`, and `acceptInvitation` use typed APIs and request headers,
   and that provider acceptance updates active organization session state.
3. Every Identity route rejects missing Host, apex/reserved Host, localhost,
   development fallback, empty tenant context, and a provider organization
   mismatch before a local Identity mutation.
4. `PrismaService.forTenant()` rejects empty/non-string IDs, and no Identity
   service/controller references `prisma.admin`, an unscoped client, raw SQL,
   or provider Prisma models.
5. The five required Identity doorbells prove tenant A cannot read or mutate
   tenant B data through direct IDs, roles, teams, permissions, or invitations.

### Local model and RBAC

6. Local User, Team, Role, Membership, Invitation, and SecurityPolicy rows are
   generated as tenant-scoped models; composite relationships reject cross-
   tenant references at service and database boundaries.
7. Local User email and Better-Auth ID uniqueness is tenant-scoped, and a
   provider user may have one local projection per tenant but not duplicates
   within a tenant.
8. Permission parser, DTOs, seed roles, evaluator, and tests accept only the
   canonical grammar. `resource:*` and `*:admin` match as documented; `write`,
   `*:*`, unknown resources, and malformed strings are rejected before storage.
9. Root depth 0 and maximum depth 3 are accepted consistently; negative and
   depth-4 values fail service and SQL checks.
10. System roles cannot be deleted or weakened, and roles with memberships
    cannot be removed without explicit reassignment.
11. Membership/team/role mutations synchronously purge the affected cache,
    emit typed mutation events, and call required audit enqueue with actor,
    resource, action, outcome, and correlation ID.
12. Audit queue absence/rejection produces an explicit `committed_audit_pending`
    result and deterministic retry key; legacy optional audit callers retain
    their existing behavior.

### Invitation lifecycle

13. New invitation creation calls Better-Auth with the tenant's mapped provider
    organization ID and authenticated actor headers; no provider table write or
    local session is created.
14. New local invitation rows have provider link state `mapped`, a provider ID,
    expiry copied from the provider response, a hash-only token, and no raw token
    in output, logs, audit, or delivery snapshots.
15. Acceptance verifies Host tenant, HMAC, local mapped state, expiry, session
    email, and pending provider state before the conditional local claim and
    provider `acceptInvitation` call.
16. Two concurrent acceptance requests produce one provider/local acceptance,
    one deterministic conflict, and exactly one local membership.
17. Cleanup tests cover stale claims, pending release, missing/terminal provider
    result, wrong provider context, timeout, retry/backoff, retry ceiling,
    alert/failure, idempotency, and claim-version safety. Cleanup never queries
    provider tables or finalizes from an unavailable result.

### Migration, composition, and scope

18. Preflight validates populated consistent/inconsistent fixtures before the
    hardening migration; no inconsistent relationship is silently reassigned or
    deleted.
19. Null local user links require an explicit provider-validated mapping
    manifest; email-only matching is rejected. Active unmapped rows produce a
    redacted error report and process exit 1.
20. Existing invitations use exact pending-provider matching only. Ambiguous or
    unmapped active invitations are blocked/quarantined by explicit forward fix;
    no provider ID is invented. Rerunning preflight/backfill is idempotent.
21. Migration and backfill reports include run ID, stable row IDs, dispositions,
    counts, error codes, and audit correlation without secrets. Final errors
    produce non-zero process status and prevent route/job enablement.
22. Prisma-managed and SQL-managed constraints are declared in the drift
    contract. `prisma validate`, migration diff, and the constraint allowlist
    fail on unapproved drift; the old identity migration is unchanged.
23. `IdentityModule` is imported by `CoreModule`, not `AppModule`; the approved
    Nest graph has one Identity permission guard path, no Identity-local duplicate
    Prisma/auth/audit providers, and deterministic Identity session/permission
    guard order.
24. The cleanup queue/scheduler registration and migration runner command are
    declared, tested, and return non-zero on unresolved migration errors.
25. Pre-Apply and Verify manifests prove that SPEC-0027, SPEC-0028, SDD-v3,
    recovery, dispatcher, and historical review artifacts are unchanged.
26. Controller tests prove DTO validation, Host tenant resolution, authentication,
    Identity permission checks, stable status codes, audit outcome mapping, and
    secret-free outputs.
27. Database scope generation, focused API tests, required doorbells, lint,
    build, and the repository test suite pass, with unrelated pre-existing
    failures recorded separately.

### Repeat blocker and condition gates

28. `apps/api/package.json` and `pnpm-lock.yaml` pin `better-auth`,
    `@better-auth/prisma-adapter`, and the separate `auth` CLI to `1.6.23`;
    Prisma remains lock-resolved at `6.19.3`.
29. The exact `auth generate` command loads
    `apps/api/scripts/better-auth-schema.config.ts`, writes
    `evidence/better-auth.generated.prisma`, and the reconciliation test proves
    model names, physical `ba_*` maps, fields, types, nullability, relations,
    `invitation.expiresAt`, and `session.activeOrganizationId` before any
    migration is generated.
30. `AuthProviderPort` returns typed provider user/session/organization/member
    results and tests prove missing, foreign, inactive-local, email-mismatched,
    organization-mismatched, unauthorized, timeout, and unavailable behavior
    during session, invitation, cleanup, and migration flows.
31. The mapping manifest is canonical, content-hashed, tenant-specific, and
    rejects duplicate, foreign-organization, unknown-role, and provider-
    unavailable entries without email-only attachment.
32. Guard/module execution order is executable and tested: Host middleware,
    legacy guard no-op boundary, tenant context gate, Identity session guard,
    then Identity permission guard; `CoreModule` owns Identity and AppModule
    has no direct feature import.
33. Scoped-client tests cover every supported read/write/bulk operation,
    interactive/array transactions, all raw SQL methods, invalid scopes, and
    rejection of provider/platform/admin models.
34. Provider/local role mapping, named Prisma/SQL constraint allowlist, audit
    event/job/retry IDs, migration report/quarantine paths, scope-manifest JSON
    schema/hash verification, and exact Host base-domain/trusted-proxy rules
    are present in the design and tested in their owning phases.
35. `docs/adr/0025-identity-organization-platform.md` exists, records the
    schema/provider/tenant/invitation/migration/audit/compatibility decisions,
    and is accepted before schema Apply.

## 11. Required ADR References

| ADR | Use |
|---|---|
| ADR-0001 | Host-based tenant resolution and explicit superadmin boundary. |
| ADR-0002 | Better-Auth ownership and provider integration constraints. |
| ADR-0003 | Historical local User uniqueness decision; ADR-0025 explicitly records the tenant-scoped projection exception required for multi-organization provider users. |
| ADR-0025 | `docs/adr/0025-identity-organization-platform.md`; accepted planning decision for Identity schema, provider-schema boundary, RBAC grammar, invitation bridge, migration/backfill, audit outcomes, retention, and compatibility. |

The ADR-0025 decision is a prerequisite for schema Apply. It is the only file
outside the change directory created by this planning refinement, following the
repository's current `docs/adr/0024-*.md` and `docs/adr/0028-*.md` convention.

## 12. Out-of-Scope Safety Boundary

No runtime implementation, unrelated roadmap file, dispatcher state, native
review lifecycle state, provider table data, or provider migration history is
changed by this planning refinement. Apply may touch only the paths declared in
`design.md` and `tasks.md` after the approved repeat Direct Architecture Review,
Tasks Review, and Workload Guard gates.

The following remain outside SPEC-0025 even though they are visible repository
risks:

- Legacy direct provider-table writers in `apps/api/src/modules/auth/` and
  `apps/api/src/modules/tenants/`.
- Global cleanup of every pre-existing `PrismaService` provider declaration in
  unrelated modules.
- SPEC-0027, SPEC-0028, SDD-v3, recovery, dispatcher, and native review files.
- Frontend Identity screens and client-portal authentication.
