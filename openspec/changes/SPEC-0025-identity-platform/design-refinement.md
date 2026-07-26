# SPEC-0025 Design Refinement Record

**Mode:** SDD-Direct
**Trigger:** Independent Architecture Review `architecture-review-direct.md`
**Disposition:** AR-001 through AR-004 resolved in the Design; AR-005 through AR-011 resolved as mandatory implementation conditions.
**Scope:** Planning artifacts under this change directory only. No runtime code, dispatcher state, review lifecycle state, or historical review artifact is changed by this refinement.

The historical `architecture-review.md` and the prior Direct review
`architecture-review-direct.md` are preserved unchanged. This record is the
decision log for the replacement Design and Tasks artifacts.

## Decision Summary

| Decision | Contract |
|---|---|
| Better-Auth schema boundary | `apps/api/src/common/auth.ts` uses `prismaAdapter(prisma, { provider: 'postgresql' })` with no custom provider-table mapping. Better-Auth v1.6.23 generated Prisma schema is the provider-owned source for the provider models. `auth generate --adapter prisma` produces the provider schema delta; Prisma applies the resulting migration. Identity never reads or writes provider tables directly. |
| Tenant boundary | A valid tenant for Identity means a tenant resolved from a real tenant subdomain. Development first-tenant fallback is not valid for Identity. `IdentitySessionGuard` rejects missing, reserved, or non-host resolution, and `PrismaService.forTenant()` rejects empty scope values instead of returning the admin client. |
| Existing data | A read-only preflight produces a redacted, deterministic report before the hardening migration. Exact provider-ID mappings may be applied; null or ambiguous mappings are not guessed. Unresolved active rows block the migration or final enablement with a non-zero result. Historical unmapped invitations remain report-only/quarantined and are never accepted locally. |
| Invitation cleanup | Request-time acceptance uses Better-Auth `getInvitation`/`acceptInvitation` with the request session headers. Background cleanup uses only a typed provider API method that returns pending, non-expired user invitations with an approved server-side context. A missing provider result is unavailable, not proof of cancellation or acceptance. Stale claims remain retryable and alert/fail when safe reconciliation is unavailable. |
| Projection uniqueness | Better-Auth users may belong to more than one organization. Local `User` projections therefore use tenant-scoped uniqueness for email and provider ID; the global uniqueness constraints are replaced by a new SPEC-0025 migration, never by rewriting the historical migration. `ClientUser` is unaffected. |
| Permission grammar | Valid values are `<resource>:create|read|update|delete|admin`, `<resource>:*`, and `*:admin`. `*:admin` grants all valid Identity permissions; `resource:*` and `resource:admin` are resource-local wildcards. `write`, `*:*`, unknown resources, and other global wildcards are invalid. |
| Audit semantics | Existing optional `AuditService.log()` behavior remains unchanged for legacy callers. Identity uses a required enqueue method with deterministic event IDs. A mutation committed without audit delivery returns/records `committed_audit_pending` and a retry key; it is never silently reported as successful and is never replayed as a second mutation. |
| Module ownership | `CoreModule` owns the Identity feature import. `AppModule` does not import `IdentityModule`. Identity does not provide a second `PrismaService`, auth client, or AuditService. The Identity permission guard has one provider instance and is registered through the approved root guard path after the Identity session guard on Identity controllers. |
| Phase ownership | Each shared migration, module, guard, and publisher path has one Apply-phase owner. Later phases consume earlier contracts but do not edit their owned files. Cleanup queue registration and the migration command/exit code are explicit. |

## AR Resolution Table

| Finding | Classification | Resolution | Evidence required |
|---|---|---|---|
| AR-001 | BLOCKER | The Prisma adapter boundary is explicit. Generate the provider schema with Better-Auth v1.6.23, merge only the generated provider fields required by the organization plugin (`invitation.expiresAt` and `session.activeOrganizationId`) into the repository Prisma schema, and apply them through a provider-owned Prisma migration. Do not add a custom adapter mapping, invent columns, or use provider-table CRUD. | Generated schema diff, `prisma validate`, Prisma migration diff, and integration tests for `getSession`, `createInvitation`, `getInvitation`, `acceptInvitation`, invitation expiry, and active-organization persistence. |
| AR-002 | BLOCKER | The Host header is authoritative. The development first-tenant fallback is disabled for `/api/v1/tenant/identity`; the middleware records `tenantResolutionSource: 'host'` only after a valid subdomain lookup. Identity routes require that marker and `tenantId`. `forTenant()` rejects empty or non-string IDs. Legacy admin behavior remains a separate boundary and cannot satisfy Identity route resolution. | Middleware, guard, scoped-client fail-closed, missing/reserved Host, forged tenant, foreign session, and all five doorbell tests. |
| AR-003 | BLOCKER | Run a read-only preflight before applying the additive hardening migration. Validate every local relationship and prepare exact provider mappings through typed Better-Auth APIs. Use an explicit mapping manifest for null user links; do not attach by email alone. Exact invitation matches are accepted only when one pending/non-expired provider invitation matches tenant organization and normalized email. Missing/ambiguous/unmapped active rows are errors; no provider ID is invented. The runner is idempotent, emits a redacted report/audit event, and exits non-zero when errors remain. | Populated consistent/inconsistent fixtures, mapping and quarantine tests, report schema, repeat-run test, command exit-code test, and migration SQL review. |
| AR-004 | BLOCKER | Provider status is queried only through Better-Auth APIs. Request-time `getInvitation` requires the invitee session and returns only pending/non-expired invitations. Cleanup uses the documented server-side pending-invitation API equivalent with an approved provider context and verifies exact provider ID, organization, email, and expiry. Pending is the only affirmative release signal; missing, terminal, unauthorized, timeout, or provider-unavailable results keep the claim in `processing`, schedule retry/backoff, and alert/fail after the retry policy. | Provider-port contract tests, status matrix, crash/restart tests, claim-version tests, retry/backoff tests, and a static prohibition on provider-table access. |
| AR-005 | CONDITION | Adopt one grammar across shared types, DTOs, seed roles, evaluator, and tests. Resource wildcards are valid; `*:admin` is the only global wildcard; `write` and `*:*` are invalid. | Contract/parser tests, seed validation, evaluator matrix, and rejection-before-persistence test. |
| AR-006 | CONDITION | Preserve optional legacy audit logging. Add a required Identity enqueue path with explicit `success`, `failure`, and `committed_audit_pending` outcomes. Commit, cache purge, event publication, and required enqueue ordering is documented; deterministic retry keys prevent duplicate mutation. | Queue missing/rejection tests, mutation ordering tests, committed-pending response tests, and job retry tests. |
| AR-007 | CONDITION | Route `IdentityModule` through `CoreModule`; remove the direct AppModule feature import. Identity owns its feature providers; the shared runtime/auth boundary and `AuditModule` are imported, not re-provided. Register one permission-guard instance through the approved root guard path and test the resolved module graph. | Nest module graph test, provider identity/instance test, import-order check, and global guard ordering test. |
| AR-008 | CONDITION | Phase 1 owns schema/provider compatibility and shared fail-closed boundaries; Phase 2 owns scoped services/RBAC/events; Phase 3 owns invitation engine/provider port/cleanup logic; Phase 4 owns API/directory/policy; Phase 5 owns migration runner, seed entrypoint, queue registration, final composition, and doorbells. No file is owned by multiple phases. | Exact per-phase Working Sets, phase dependency table, queue registration path, migration runner command, and phase-summary path checks. |
| AR-009 | CONDITION | Prisma owns representable fields, relations, scalar indexes, and composite uniqueness. SQL owns the partial pending-invitation index, depth/status checks, and any provider-generated SQL not representable in Prisma. An allowlisted drift test checks both schemas and rejects unapproved changes; optional invitation team and team-parent composite relations are declared explicitly. | `prisma validate`, migration diff, constraint allowlist test, and applied-database relation test. |
| AR-010 | CONDITION | Provider users may belong to multiple organizations. Replace global local `User.email` and `User.betterAuthUserId` uniqueness with tenant-scoped uniqueness. A null provider link is never auto-matched by email; only an explicit mapping manifest validated against the provider organization can populate it. Unmapped active users are excluded from Identity RBAC and produce a non-zero migration result. | Duplicate-projection schema test, manifest validation tests, null-link session rejection, and migration report/error test. |
| AR-011 | CONDITION | Before Apply, capture changed paths and content hashes including pre-existing dirty worktree state. Apply may change only the approved SPEC-0025 Working Set and its generated outputs. Protected SPEC-0027, SPEC-0028, SDD-v3, dispatcher, recovery, and historical review artifacts are hash-checked before and after. | Pre-Apply/post-Verify manifest, allowlist diff check, generated-output review, and protected-path hash comparison. |

## Better-Auth Behavior Used by This Package

The package relies on the following v1.6.23 behavior, verified against the
Better-Auth organization plugin documentation/source:

- The configured Prisma adapter is the application schema boundary. For Prisma,
  Better-Auth schema generation is followed by the repository's Prisma
  migration workflow; the Better-Auth `migrate` command is not used as a
  replacement for Prisma migration.
- `auth.api.getSession` receives the request headers and is the server session
  boundary.
- `auth.api.createInvitation` requires an authenticated organization member
  context and the provider organization ID. The local tenant-to-organization
  mapping is checked before this call.
- `auth.api.acceptInvitation` requires the invitee's authenticated session
  headers and accepts only a pending, non-expired invitation for that session's
  email. The provider also updates the active organization on the provider
  session, which is why `activeOrganizationId` belongs to the provider schema.
- `auth.api.getInvitation` requires an authenticated session, validates the
  recipient email, and returns only a pending, non-expired invitation. A
  non-pending or expired invitation is reported as unavailable.
- The server-side user-invitation API may list pending invitations for an
  explicitly supplied email when invoked through the documented server API
  context. Cleanup may use it only with the approved provider worker context,
  an exact tenant organization comparison, and no fabricated/empty session
  headers. It does not expose terminal accepted/canceled/expired state for an
  arbitrary invitation ID. Cleanup therefore treats an absent result as
  unresolved, not as a safe final state.

## Preservation

The following files are intentionally not edited by this refinement:

- `openspec/changes/SPEC-0025-identity-platform/architecture-review.md`
- `openspec/changes/SPEC-0025-identity-platform/architecture-review-direct.md`

The refinement also does not modify `SPEC-0027`, `SPEC-0028`, SDD-v3/recovery
artifacts, shared workflow agents/commands, or any runtime file. Those paths are
implementation Working Set entries only for the later Apply phase and remain
outside this planning edit.

## Residual Risks

1. A provider API cannot prove why a non-pending invitation is unavailable. The
   cleanup policy intentionally leaves such claims retryable rather than
   risking a second acceptance.
2. Existing null-linked local users require a maintainer-owned mapping manifest
   or remain outside Identity RBAC. This is safer than an email-only attach but
   can make migration exit non-zero until the manifest is complete.
3. The repository has pre-existing Prisma providers in unrelated modules. The
   SPEC-0025 graph test covers the Identity/Auth/Audit boundary only and does
   not silently broaden this change into a platform-wide provider refactor.
4. The worktree is already dirty with unrelated feature and recovery changes.
   Apply must use the pre-Apply hash manifest and stop on any protected-path
   drift.

## Next Phase

Repeat the SDD-Direct Architecture Review against the revised `design.md` and
this record. Only a clean review should authorize Tasks Review; this refinement
does not authorize Apply and does not invoke any dispatcher or native lifecycle.
