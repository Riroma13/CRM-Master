# SPEC-0025 Repeat Design Refinement Record

**Mode:** SDD-Direct
**Trigger:** Repeat independent Architecture Review `architecture-review-direct-repeat.md`
**Disposition:** AR-012, AR-013, and AR-014 resolved in this record; AR-015 through AR-022 remain mandatory implementation conditions.
**Scope:** Planning artifacts for this change plus the required ADR. No runtime code, dispatcher state, native review state, or destructive operation is changed by this refinement.

The original review, prior Direct review, repeat review, and prior refinement
record remain unchanged. This record is additive evidence for the next
independent Direct Architecture Review.

## Decision First

1. Better-Auth is pinned to the repository-resolved `1.6.23`; the separate
   `auth` CLI is pinned to `1.6.23` and is added to the API development toolchain
   before schema generation.
2. Schema generation uses a dedicated exported `auth` config, an exact
   `cwd/config/output` command, a provider-only generated artifact, and a
   fail-closed reconciliation test before Prisma migration generation.
3. Provider users, members, organizations, invitations, sessions, accounts, and
   verifications are accessed at runtime only through a typed `AuthProviderPort`.
   The port validates provider user, email, organization, member, and local
   projection state for session, invitation, cleanup, and migration flows.
4. `docs/adr/0025-identity-organization-platform.md` is now the canonical new
   ADR for the Identity schema and provider boundary. Existing ADRs are not
   modified.

## Repository Evidence

| Fact | Evidence | Consequence |
|---|---|---|
| Better-Auth package version | `pnpm-lock.yaml:121-164,3161-3162` and installed `apps/api/node_modules/better-auth/package.json:1-3` resolve `better-auth@1.6.23`. | The plan must use `1.6.23`, not the manifest range `^1.0.0`. |
| Prisma adapter version | `pnpm-lock.yaml:123-125,723+` and installed adapter package resolve `@better-auth/prisma-adapter@1.6.23`. | The adapter is pinned with Better-Auth. |
| Prisma version | `pnpm --filter api exec prisma --version` reports `6.19.3`; the lockfile resolves the same version. | Schema and migration checks target Prisma `6.19.3`. |
| CLI availability | `pnpm --filter api exec auth --version` currently fails with `Command "auth" not found`. `better-auth@1.6.23` has no CLI binary; npm package `auth@1.6.23` owns the `auth` and `better-auth` binaries. | `pnpm exec auth` is not a valid current repository command. Add the exact CLI package before Apply. |
| Current config export | `apps/api/src/common/auth.ts` exports `createAuth(prisma)` and `Auth`, not an `auth` instance/options export. | The CLI config must be a separate exported instance that reuses the same options. |
| CLI config behavior | Better-Auth `auth@1.6.23` `generate.ts` calls `getConfig()` even with `--adapter`; `get-config.ts` requires an `auth` export with `.options` or a default auth instance. | `--adapter prisma` does not remove the config requirement. |
| CLI output behavior | Better-Auth `prisma.ts` defaults to `./prisma/schema.prisma`, reads/writes relative to the process directory, and capitalizes generated Prisma model names. | The command must pin `--cwd`, `--config`, and `--output`; output is reviewed before merge. |
| Current provider model collision | `packages/database/prisma/schema.prisma:62-161` uses lowercase provider models and also has local `model User`. | Unqualified generated `User`, `Organization`, or `Member` models are rejected. |

The evidence above is repository and pinned-package evidence, not a guessed
Better-Auth version or an invented command.

## AR-012 Resolution: Executable Provider Schema Boundary

### Version and ownership

The Apply Working Set must change `apps/api/package.json` from ranges to exact
versions and add the CLI as a development dependency:

```json
{
  "@better-auth/prisma-adapter": "1.6.23",
  "better-auth": "1.6.23",
  "auth": "1.6.23"
}
```

The resulting `pnpm-lock.yaml` is owned by Phase 1. The version test fails if
any of these three entries is a range or resolves to a version other than
`1.6.23`. No `pnpm dlx` or unpinned registry command is part of the workflow.

### Executable config and exact command

Phase 1 creates
`apps/api/scripts/better-auth-schema.config.ts`. It is a CLI-only config, not
an application bootstrap. It must:

- import the same `createAuth` option factory used by
  `apps/api/src/common/auth.ts`;
- construct an isolated `PrismaClient` only for CLI module loading;
- export `const auth = createAuth(prisma)` so `auth@1.6.23` can read
  `auth.options`;
- contain no request handling, provider-table CRUD, secrets, or migration
  execution; and
- be covered by a config-load test that asserts the exported value has an
  `options` object and the organization plugin is enabled.

After the exact CLI dependency is installed, the command is run from the
repository root with `pnpm --filter api`, whose process directory is
`apps/api`:

```bash
pnpm --filter api exec auth generate \
  --cwd . \
  --config scripts/better-auth-schema.config.ts \
  --adapter prisma \
  --dialect postgresql \
  --output ../../openspec/changes/SPEC-0025-identity-platform/evidence/better-auth.generated.prisma \
  --yes
```

This command is the authoritative schema-generation command for SPEC-0025.
The output path is a generated provider-only evidence artifact. A second run
with the same config and:

```text
--output ../../packages/database/prisma/schema.prisma
```

is allowed only after the provider-only artifact and reconciliation test pass.
The command never uses `auth migrate`: Better-Auth v1.6.23 documents that
`migrate` is for its Kysely adapter; Prisma schema output is applied by Prisma.

### Supported model and table collision policy

The config and the runtime `createAuth` options use the documented Better-Auth
`modelName` and field-name configuration. Provider model names are deliberately
prefixed with the existing physical table names so the generated Prisma model
and the Prisma client accessor are deterministic and cannot collide with local
Identity `User`:

| Better-Auth logical model | Configured `modelName` | Generated Prisma model | Physical table |
|---|---|---|---|
| `user` | `ba_users` | `Ba_users` | `ba_users` |
| `session` | `ba_sessions` | `Ba_sessions` | `ba_sessions` |
| `account` | `ba_accounts` | `Ba_accounts` | `ba_accounts` |
| `verification` | `ba_verifications` | `Ba_verifications` | `ba_verifications` |
| `organization` | `ba_organizations` | `Ba_organizations` | `ba_organizations` |
| `member` | `ba_members` | `Ba_members` | `ba_members` |
| `invitation` | `ba_invitations` | `Ba_invitations` | `ba_invitations` |

The provider schema block in `schema.prisma` must use the generated model
names and `@@map("ba_...")` values. The local `User` model remains `User`.
Any generated `User`, `Organization`, `Member`, `Invitation`, or unprefixed
physical table map is a collision and stops Apply. No `@@map` or field rename
is added by hand to make a failed generation appear compatible.

The supported field-name mapping is explicit and is part of the generated
config contract. Provider Prisma field identifiers match the actual provider
column names; existing `@map` aliases are removed from provider models only
when the generated output and database introspection prove that the physical
column is unchanged. The non-default identifiers are:

| Model | Better-Auth field | Provider Prisma field/column |
|---|---|---|
| `member` | `organizationId` | `organization_id` |
| `member` | `userId` | `user_id` |
| `invitation` | `organizationId` | `organization_id` |
| `invitation` | `inviterId` | `inviter_id` |
| `session` | `userId` | `user_id` |
| `session` | `expiresAt` | `expires_at` |
| `session` | `activeOrganizationId` | `active_organization_id` |
| `account` | `accountId` | `account_id` |
| `account` | `providerId` | `provider_id` |
| `account` | `userId` | `user_id` |
| `account` | `accessToken` | `access_token` |
| `account` | `refreshToken` | `refresh_token` |
| `account` | `idToken` | `id_token` |
| `account` | `accessTokenExpiresAt` | `access_token_expires_at` |
| `account` | `refreshTokenExpiresAt` | `refresh_token_expires_at` |
| `verification` | `expiresAt` | `expires_at` |
| `invitation` | `expiresAt` | `expires_at` |

All other generated provider fields retain the exact v1.6.23 field identifier
unless the current physical column inventory proves a different identifier.
Such a difference is a blocking reconciliation result, not an implementation
choice.

### Generated-output and migration reconciliation gate

Phase 1 adds
`packages/database/prisma/__tests__/better-auth-schema-reconciliation.spec.ts`.
The test must:

1. execute the pinned CLI command in a temporary output directory;
2. assert the output source is `auth@1.6.23` and the config/plugin/model map
   above;
3. compare every provider model, field type, required/optional state, unique
   attribute, relation target, `@@map`, and provider field/column name with
   `packages/database/prisma/schema.prisma`;
4. reject duplicate model names, duplicate physical table maps, a local
   `User` collision, missing `invitation.expiresAt`, or missing
   `session.activeOrganizationId`;
5. introspect a disposable PostgreSQL schema and compare the physical
   `ba_*` table/column inventory, including existing nullability and types; and
6. run `prisma validate` and compare the reviewed migration diff against the
   allowlist in the design and ADR.

The provider migration is owned by Prisma under
`packages/database/prisma/migrations/20260725120000_identity_platform_hardening/migration.sql`.
The Better-Auth CLI owns only generated provider schema output. Prisma owns
SQL generation and migration application. The old identity migration and all
existing provider migration history remain immutable.

Provider existing-row preflight is a prerequisite to the final non-null
provider schema. It records provider row IDs and dispositions without tokens
or credentials. Existing provider rows with a required field that cannot be
validated from an official Better-Auth API or an explicit maintainer-approved
provider reconciliation manifest are fatal and stop before the migration. No
default expiry, slug, name, provider ID, or relation is invented.

## AR-013 Resolution: Typed Provider Identity Boundary

### Port contract

`apps/api/src/modules/identity/auth/auth-provider.port.ts` is the only provider
contract used by Identity session resolution, invitation creation/acceptance,
cleanup, and migration. It returns normalized typed results and never exposes
Prisma provider models:

```typescript
type ProviderLookupStatus =
  | 'valid'
  | 'missing'
  | 'mismatched'
  | 'provider_unavailable'
  | 'invalid_context';

type ProviderRole = 'owner' | 'admin' | 'member' | (string & {});

interface ProviderUserRecord {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
}

interface ProviderSessionRecord {
  sessionId: string;
  user: ProviderUserRecord;
  activeOrganizationId: string | null;
  expiresAt: string;
}

interface ProviderOrganizationRecord {
  id: string;
  slug: string;
  name: string;
}

interface ProviderMemberRecord {
  id: string;
  organizationId: string;
  user: ProviderUserRecord;
  role: ProviderRole;
}

type ProviderValidation<T> =
  | { status: 'valid'; value: T }
  | { status: Exclude<ProviderLookupStatus, 'valid'>; code: string; retryable: boolean };
```

Better-Auth v1.6.23 has no built-in provider user `status` column. The port
must not invent one. Provider user status is therefore `valid`, `missing`, or
`provider_unavailable`; the local projection's `isActive` is the authoritative
local activation check and produces `IDENTITY_AUTH_REQUIRED` or
`IDENTITY_TENANT_MISMATCH` when false. A future provider status extension
requires a new schema decision and is not assumed by this change.

The port operations are:

| Operation | Better-Auth API | Required context and checks |
|---|---|---|
| `getSession` | `auth.api.getSession({ headers })` | Request headers only; return provider user, normalized email, verification state, active organization, and expiry. Never return a session token. |
| `getOrganization` | `auth.api.getFullOrganization({ query: { organizationId }, headers })` | Request or approved worker headers; returned ID must equal the requested ID. |
| `validateSessionMember` | `auth.api.getActiveMember({ headers })` after active organization comparison | Request headers; active provider organization must equal the Host tenant mapping. |
| `validateOrganizationMember` | `auth.api.listMembers({ query: { organizationId, limit, offset }, headers })` | Approved migration context; page through members, then require exact provider user ID, organization ID, and normalized email match. |
| `createInvitation` | `auth.api.createInvitation({ body, headers })` | Request headers, validated organization, actor membership, and mapped provider role. |
| `getInvitation` | `auth.api.getInvitation({ query: { id }, headers })` | Invitee request headers; pending, non-expired state, exact organization, exact normalized recipient email. |
| `acceptInvitation` | `auth.api.acceptInvitation({ body: { invitationId }, headers })` | Invitee request headers; returned provider member/user/org are checked before local finalization. |
| `listPendingUserInvitations` | `auth.api.listUserInvitations({ query: { email }, headers })` | Approved worker context only; exact normalized email and organization comparison; pending/non-expired is the only affirmative result. |
| `cancelInvitation` | `auth.api.cancelInvitation({ body: { invitationId }, headers })` | Authenticated actor context and exact organization. |

An approved migration context is:

```typescript
interface ApprovedProviderWorkerContext {
  kind: 'approved-migration-worker';
  headers: Headers;
  actorProviderUserId: string;
  organizationId: string;
  authorizationId: string;
}
```

The headers are supplied by a configured, authenticated Better-Auth member
session for the target organization. The worker verifies that session and
actor membership before `listMembers`, `getFullOrganization`, or
`listUserInvitations`. It never fabricates empty headers, creates a local
session, logs headers, or reads `ba_*` tables. Missing, expired, unauthorized,
foreign-organization, and provider-error contexts return a typed non-success
result; the migration remains non-zero and cleanup remains retryable.

### Deterministic mapping and role contract

The local tenant is authoritative for local authorization. Provider roles are
only the minimum role required for Better-Auth organization lifecycle calls.
The mapping is:

| Local role | Provider role for a new invitation | Legacy provider role to local role |
|---|---|---|
| `admin` | `admin` | `owner` or `admin` -> `admin` |
| `manager` | `member` | `member` -> `member` unless an explicit local role mapping says otherwise |
| `member` | `member` | `member` -> `member` |
| `viewer` | `member` | `member` -> `viewer` only through the explicit local mapping manifest |

`owner` is never assigned by an Identity invitation. Unknown provider roles,
unknown local roles, and a missing `Tenant.betterAuthOrganizationId` fail before
any provider call. Existing provider roles do not overwrite local RBAC. The
mapping manifest records the provider role observed and the local role chosen;
all exceptions are fatal or explicitly quarantined.

### Validation matrix

| Case | Port result | Local effect |
|---|---|---|
| Provider user/member is missing | `missing` | No projection or membership write; migration error/quarantine. |
| Provider API unavailable or timeout | `provider_unavailable`, retryable | No acceptance finalization; migration exits 1; cleanup keeps `processing`. |
| Provider organization differs from Host/local mapping | `mismatched` | 403/conflict; no local mutation. |
| Provider email differs from local invitation/user email | `mismatched` | No local projection or membership; report redacted error. |
| Local `User.isActive = false` | local inactive rejection | Session/RBAC denied; no provider mutation. |
| Session has no active organization | `mismatched` | Identity route denied; no local query through an unscoped client. |
| Valid provider member and active local projection | `valid` | Continue with tenant-scoped local RBAC and the documented provider operation. |

The tests cover each row for session resolution, invitation create/accept,
cleanup, and migration. The migration tests use a fake `AuthProviderPort`, not
provider Prisma models, and assert that the direct `prisma.admin.member` path
is absent from the replacement runner.

## AR-014 Resolution: ADR and Authorization Gate

The repository uses four-digit ADR filenames under `docs/adr/` for current
product decisions (`0024`, `0028`). Therefore this refinement creates:

`docs/adr/0025-identity-organization-platform.md`

The ADR records identity ownership, `tenantId` scoping, the Better-Auth
provider boundary, the generated-schema collision policy, invitation HMAC and
hash-only security, deterministic migration/backfill and quarantine, audit
delivery outcomes, retention, compatibility with legacy `User` and
`ClientUser`, and the Core/App module boundary. It is included in the
declared Working Set and is a prerequisite for schema Apply. Existing ADRs are
not modified.

## Mandatory Condition Closure Contract

These conditions remain implementation gates and are made concrete here for
the next Architecture Review and Tasks Review.

| Finding | Concrete contract | Required evidence |
|---|---|---|
| AR-015 guard/module order | Middleware order is `RouteNormalizationMiddleware -> TenantResolveMiddleware -> LoggingMiddleware`. Global legacy guards run without mutating Identity requests. `BetterAuthGuard` and `TenantScopeGuard` recognize the Identity prefix; the former does not query provider tables, the latter requires `tenantResolutionSource = 'host'`. Identity controllers use exactly `@UseGuards(IdentitySessionGuard, IdentityPermissionGuard)`, in that order. The Identity permission guard is not an `APP_GUARD`. | Nest integration test records guard invocation order for cookie and bearer requests, proves session precedes permission, and proves legacy `RequirePermission` metadata does not activate Identity permission metadata. `CoreModule` imports `IdentityModule`; `AppModule` does not. |
| AR-016 scoped client | `forTenant()` rejects non-string, empty, whitespace, and invalid tenant IDs before client creation. Scoped clients permit only generated tenant-scoped models; `Tenant`, provider models, and admin-only models are rejected. The operation matrix covers `findUnique`, `findUniqueOrThrow`, `findFirst`, `findFirstOrThrow`, `findMany`, `count`, `aggregate`, `groupBy`, `create`, `createMany`, `createManyAndReturn`, `update`, `updateMany`, `updateManyAndReturn`, `upsert`, `delete`, and `deleteMany`. Unsupported or non-injectable operations are rejected. `$queryRaw`, `$queryRawUnsafe`, `$queryRawTyped`, `$executeRaw`, `$executeRawUnsafe`, and `$runCommandRaw` are rejected. `$transaction` returns a transaction client with the same model/operation/raw restrictions; it cannot expose `admin`. | Scope operation matrix test, raw-method test, bulk-operation test, interactive and array transaction tests, static Identity-path scan, and cross-tenant doorbells. |
| AR-017 provider/local roles | Local RBAC is authoritative. The exact role table above is used by creation, acceptance, migration, and cleanup. Missing tenant organization mapping, missing actor membership, or unknown role rejects before provider calls. | Provider-port tests, role mapping matrix, invitation tests, and a no-provider-call assertion. |
| AR-018 constraint drift | The allowlist names old constraints to drop, replacement constraints, Prisma-managed relations/indexes, SQL-managed checks/partial indexes, and provider-generated additions. Unknown SQL diff, unknown index, duplicate physical map, or changed protected constraint fails. | `identity-constraint-drift.spec.ts`, `prisma validate`, `prisma migrate diff`, and applied PostgreSQL parity test. |
| AR-019 migration artifacts | Inputs and outputs are fixed: `evidence/identity-provider-mapping.json`, `evidence/identity-quarantine.json` (optional and explicit), `evidence/identity-migration-report.json`, `evidence/identity-migration-audit.jsonl`, and `evidence/identity-migration-report.sha256`. Commands are `identity:migration:scope-gate`, `identity:preflight`, `identity:backfill`, and `identity:migration:verify`; fatal report rows return exit 1. | Command integration tests, report schema tests, redaction tests, rerun/no-op tests, and non-zero exit tests. |
| AR-020 audit retry | `eventId` is generated once per mutation; `correlationId` is request/run-scoped; BullMQ `jobId` is `identity-audit-${eventId}`; `retryKey` equals `eventId`. `success` means local commit, cache purge, typed event, and enqueue accepted. `failure` means no local commit. `committed_audit_pending` means local commit succeeded but required enqueue was rejected/unavailable; retry loads the same event and job ID and never replays the mutation. Cache invalidation failure denies subsequent authorization until a fresh authorization read succeeds. | Publisher ordering test, exact job ID test, queue absence/rejection test, retry no-replay test, and legacy optional `AuditService.log()` regression test. |
| AR-021 scope manifest | `evidence/scope-manifest.json` uses schema `sdd-direct/scope-manifest/v1` with `baseline.gitHead`, `baseline.dirtyPaths[]`, `approvedPaths[]`, `generatedOutputs[]` containing source path/hash and generator/version, `protectedPaths[]`, `historicalReviewHashes[]`, and `verification`. Pre-Apply captures the manifest; post-Verify recomputes hashes and fails on any unapproved path or protected drift. | JSON schema validation, pre/post manifest integration test, generated-output source hash test, and protected-path comparison. |
| AR-022 version and Host trust | `better-auth`, `@better-auth/prisma-adapter`, and `auth` are exact `1.6.23`; Prisma is exact lock-resolved `6.19.3`. `CRM_BASE_DOMAIN` is required outside tests. Host resolution accepts only one normalized `<slug>.<CRM_BASE_DOMAIN>` label, rejects apex/reserved/localhost/IP/untrusted suffixes and comma-separated forwarded hosts, and trusts `X-Forwarded-Host` only from configured trusted proxy addresses. A tenant without provider organization mapping fails closed. | Version provenance test, Host parser/middleware tests, trusted-proxy test, untrusted suffix test, reserved/apex/localhost test, and missing provider-organization test. |

### Constraint inventory

The Phase 1 drift allowlist is exact:

| Category | Existing name/action | Approved replacement or preservation |
|---|---|---|
| Old team parent FK | Drop `teams_parent_team_id_fkey` | Add `teams_tenant_id_parent_team_id_fkey` on `(tenant_id, parent_team_id)` -> `(tenant_id, id)`, `ON DELETE SET NULL`. |
| Old membership FKs | Drop `memberships_team_id_fkey` and `memberships_role_id_fkey` | Add `memberships_tenant_id_user_id_fkey`, `memberships_tenant_id_team_id_fkey`, and `memberships_tenant_id_role_id_fkey` with the declared delete actions. |
| Old invitation FKs | Drop `invitations_role_id_fkey` and `invitations_team_id_fkey` | Add `invitations_tenant_id_role_id_fkey` and `invitations_tenant_id_team_id_fkey`. |
| Missing local User relation | None | Add `memberships_tenant_id_user_id_fkey` after preflight proves all rows resolve. |
| Depth check | Replace `teams_depth_check` | Add `teams_depth_range_check` with `depth >= 0 AND depth <= 3`. |
| Invitation status | None | Add `invitations_status_check` for `pending`, `processing`, `accepted`, `expired`, `cancelled`, and `quarantined`. |
| Provider link state | None | Add `invitations_provider_link_state_check` for `creating`, `mapped`, `legacy_unmapped`, `quarantined`, and `reconciliation_required`. |
| Active invitation uniqueness | None | SQL-only `invitations_tenant_id_active_email_key` on `(tenant_id, lower(email))` where status is `pending` or `processing` and link state is `mapped`. |
| Prisma-managed uniqueness | Existing local unique/index names | Preserve or replace only the declared tenant-composite User, Role, Membership, and Invitation indexes. |
| Provider schema delta | Provider fields absent from current models | Only generated v1.6.23 provider fields and maps; no unrelated provider table or column changes. |

The drift test compares the normalized Prisma diff and applied database
catalog to this inventory. It rejects an unknown drop, rename, index, check,
foreign key, provider table map, or provider column alteration.

## Mapping Manifest Contract

`evidence/identity-provider-mapping.json` is canonical JSON with sorted arrays:

```json
{
  "schemaVersion": "spec-0025/identity-provider-mapping/v1",
  "entries": [
    {
      "tenantId": "tenant-id",
      "localUserId": "local-user-id",
      "providerUserId": "provider-user-id"
    }
  ],
  "contentSha256": "sha256-of-canonical-json-without-this-field"
}
```

The runner rejects duplicate `(tenantId, localUserId)` entries, duplicate
`(tenantId, providerUserId)` entries, unknown tenants, missing provider
organization mappings, and a provider user that is not a member of the exact
provider organization. The same provider user may be mapped in two tenants
only when both provider membership validations independently succeed. Email is
read from the local row and provider response for comparison; it is never the
mapping key. The manifest hash, not raw email, is included in audit and report
metadata.

## Scope Manifest Contract

`evidence/scope-manifest.json` is generated before Apply and is not hand-edited
during implementation. Its protected set includes:

- both historical reviews, the repeat review, and both refinement records;
- `openspec/changes/archive/2026-07-21-SPEC-0027-feature-flags/**`;
- `openspec/changes/archive/2026-07-21-SPEC-0028-jobs-platform/**`;
- `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/**`;
- `docs/architecture/adr/0021-sdd-v3-stable-release.md`, SDD-v3 release notes,
  Direct-mode docs, `.opencode/**`, and dispatcher/recovery artifacts.

The approved path list is the union of the Phase 1-5 Working Sets plus the
required ADR and declared generated/evidence outputs. A post-Verify manifest
must match every protected SHA-256 and must contain no changed path outside
that union. A mismatch stops Verify and prevents Repository Ready.

## Residual Risks

1. Existing provider rows may prevent the generated required fields from being
   made non-null. The package now fails closed with a provider reconciliation
   report instead of choosing a default or silently changing data.
2. Better-Auth pending-invitation APIs still cannot explain every absent
   terminal state. Cleanup retains `processing`, retries with the same claim
   version, and alerts at the ceiling.
3. Legacy direct provider-table writers remain outside this bounded change. The
   typed Identity boundary never calls them; their future migration remains a
   separate decision.
4. The current worktree is dirty with unrelated feature, generated, Direct,
   and recovery paths. The exact scope manifest is mandatory before Apply.

## Preservation and Next Phase

The following artifacts are byte-for-byte preserved:

- `architecture-review.md`
- `architecture-review-direct.md`
- `architecture-review-direct-repeat.md`
- `design-refinement.md`

Recorded hashes at this refinement are:

| Artifact | SHA-256 |
|---|---|
| `architecture-review.md` | `89ccbad3a166e62be4068ae3a1d9105f8c1d18869157b2f2c90adb62b0989dcd` |
| `architecture-review-direct.md` | `f9b1c738ef84684a441124cc6ebd57d02d7e80f2bedb9bc008c59dc6414a53c1` |
| `architecture-review-direct-repeat.md` | `660eb334d2d118a4bb18b622854bc85a2e05dcc1ee8591954013eba108cfa9ea` |
| `design-refinement.md` | `5df1528b8d3df688fcb9f29fdd489454982d119a6be112ade886a2ebc760a619` |

Next phase is another independent Direct Architecture Review against the
updated `spec.md`, `design.md`, `tasks.md`, this record, and ADR-0025. Tasks
Review and Apply remain forbidden while any blocker is open. This record does
not authorize runtime implementation or any destructive gate.
