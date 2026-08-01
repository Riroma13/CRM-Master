# Proposal: SPEC-0025 — Identity Platform

## Intent

Define the bounded Identity Platform capability for tenant-safe provider authorization, append-only recovery, and transactional audit intent. Preserve approved Host and CoreModule boundaries while preventing tenant-data disclosure and uncontrolled retries.

## Scope

### In Scope
- Establish the Identity boundary for protected mutations, authorization recovery, and audit outbox intent.
- Preserve the exact protected-route matrix, fail-closed Host/session/membership/tenant/RBAC semantics, immutable `hostTenantId`, invitation-acceptance exclusion, and BullMQ-only retry ownership.
- Define planning areas, gates, rollout, rollback, and acceptance evidence.

### Out of Scope
- SPEC-0027, SPEC-0028, frontend, client-portal RBAC, SSO/SCIM, and unrelated Better Auth cleanup.
- Product/runtime implementation, migrations, tests, Tasks, or changes to `c1a2f90` (unchanged).

## Capabilities

### New Capabilities
- `identity-platform`: Tenant-bound provider organization authorization, durable authorization recovery, and audit outbox delivery contracts for the approved Identity routes.

### Modified Capabilities
- None.

## Approach

Use Host middleware as immutable tenant authority, wire Identity through `CoreModule`, and bind the organization guard only to approved handlers. Keep authorization state append-only with leased recovery and audit delivery under BullMQ. Activate routes/workers only after catalog compatibility and execution evidence pass.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/common/` | Planned | Host authority and provider-session boundary |
| `apps/api/src/modules/identity/` | Planned | Identity module, guard, state services, processor, dispatcher |
| `apps/api/src/modules/core/core.module.ts` | Planned | Composition wiring; no `app.module.ts` change |
| `packages/database/prisma/` | Planned | Additive durable Identity state |
| `apps/api/src/modules/audit/` | Planned | Terminal disposition and DLQ integration |
| `apps/api/test/` and Identity tests | Planned | Guard, isolation, lease, queue, and DLQ proofs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Better Auth catalog/declaration drift | Med | Fatal catalog preflight; disable routes/workers with redacted diagnostics |
| Guard or tenant isolation bypass | Med | Guard execution proof, exact route exclusions, immutable Host context, doorbell isolation |
| Lease/retry loss or duplicate delivery | Med | Lease predicates, idempotency, BullMQ-only retry ownership, terminal DLQ behavior |

Execution/rollout gates: catalog/declaration preflight, guard execution, route exclusions, tenant isolation, lease behavior, BullMQ retry ownership, and terminal DLQ behavior.

## Rollback Plan

Disable Identity routes and workers, stop processors/dispatchers, and retain durable rows for auditability. Revert only additive activation/wiring changes; do not import recovery-only migration history or alter `c1a2f90`.

## Dependencies

- Approved Design and final review #693 (`APPROVED_WITH_CONDITIONS`); Better Auth 1.6.23 catalog/declarations at implementation preflight; ADR-0025 and existing BullMQ/Audit contracts.

## Success Criteria

- [ ] Later specs map deterministically to the single `identity-platform` capability and exact protected-route matrix.
- [ ] All seven execution gates pass before route/worker activation.
- [ ] No excluded scope or runtime/product artifact is changed in this phase.
