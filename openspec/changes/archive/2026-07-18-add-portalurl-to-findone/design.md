# Design: Add `portalUrl` to `TenantsService.findOne()`

## Technical Approach

Append one property — `portalUrl: \`https://${tenant.slug}.crmmaster.com\`` — to the return object of `findOne()` in `apps/api/src/modules/tenants/tenants.service.ts`, mirroring the exact pattern on line 142 (`create()`) of the same file. The DTO already declares `portalUrl?: string` (`dto.ts:51`), so the contract is satisfied without type changes. The controller is a passthrough (`tenants.controller.ts:33-35`), so the field reaches the HTTP response automatically. No schema, endpoint, or test changes (per proposal §Scope).

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline template literal, mirror `create()` | One line, zero new paths, same hardcoded-domain debt | **Chosen** — matches existing pattern; refactor is a separate ticket |
| Extract `buildPortalUrl(slug)` helper | DRY, single source of truth for the domain | Rejected — would touch `create()` too; exceeds additive-only scope |
| Add `portalUrl` to `findAll()` | Closes the same gap at the list endpoint | Rejected — proposal §Out of Scope defers it |
| Compute `portalUrl` in controller/interceptor | Keeps service free of derived fields | Rejected — `create()` already derives it in the service; consistency wins |

## Data Flow

`HTTP GET /api/v1/admin/tenants/:id` → `TenantsController.findOne(id)` (passthrough) → `TenantsService.findOne(id)` (builds object, **adds `portalUrl`**) → JSON response now includes `portalUrl`. The field is derived from `tenant.slug`; no store, cache, or downstream side effect.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/modules/tenants/tenants.service.ts` | Modify (1 line) | Add `portalUrl: \`https://${tenant.slug}.crmmaster.com\`` to the `findOne()` return object, between `status` and `config` to match `create()`'s field order. |

## Interfaces / Contracts

No new types. `TenantResponseDto.portalUrl?: string` already exists (`dto.ts:51`); the addition is contract-conformant.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | — | None (per scope; `findOne()` has no existing spec) |
| Integration | — | None (per scope) |
| E2E | — | None (per scope) |
| Gate | `pnpm lint`, `pnpm test` | Full suite must remain green; no unrelated regressions |

`conventions.strict_tdd: true` is intentionally overridden because the change is purely additive, no field is removed/renamed, and no existing test pins `findOne()`'s shape.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration. No feature flag, cache invalidation, or consumer coordination. Rollback = revert the one added line.

## Working Set

### Primary Files

| # | File | Reason |
|---|------|--------|
| 1 | `apps/api/src/modules/tenants/tenants.service.ts` | The only file modified — `findOne()` return object |

### Secondary Files

| # | File | Reason |
|---|------|--------|
| 1 | `apps/api/src/modules/tenants/dto.ts` | Confirm `portalUrl` already declared on `TenantResponseDto` (line 51) |

### Tests

None — per proposal §Out of Scope and user direction.

### Configuration

None — no env var, Prisma schema, or NestJS wiring changes.

### Expected NOT to Change

- `tenants.controller.ts` — passthrough, no transform needed
- `tenant.module.ts` — no providers/controllers/imports to add
- `dto.ts` — `portalUrl` already in the contract
- `findAll()` (same file) — explicit out-of-scope per proposal §Notes
- `create()` (same file, line 142) — pattern source; do not "fix" the hardcoded domain
- All frontend apps and other modules — no consumer wiring depends on the new field; additive change is forward-compatible

## Read Order

1. `apps/api/src/modules/tenants/tenants.service.ts` — confirm `findOne()`'s current return shape and pick insertion point.
2. `apps/api/src/modules/tenants/dto.ts` — confirm `portalUrl?: string` is on `TenantResponseDto`.
3. `openspec/changes/add-portalurl-to-findone/proposal.md` — re-read to lock scope (additive only, no tests, no `findAll`).

No grep, spec, ADR, or controller read required.

## Expected Commands

- `git diff apps/api/src/modules/tenants/tenants.service.ts` — verify the single-line addition
- `pnpm --filter api lint` — ESLint clean
- `pnpm --filter api test` — full suite green (no new tests, no broken tests)
- `git add apps/api/src/modules/tenants/tenants.service.ts` — stage the one file
- `git commit -m "feat(tenants): include portalUrl in findOne() response"` — conventional commit per AGENTS.md

## Design Confidence

**High.** Single-file edit. The pattern to mirror is on the next screen of the same file. The DTO already accepts the field. No test pins the absence. No other file references `findOne()`'s shape in a conflicting way.

## Exploration Budget

- **Max repository searches:** 0
- **Max files to read:** 2
- **Max files to modify:** 1

If Apply exceeds this budget, it has drifted out of the one-line additive scope and must stop and report.

## Open Questions

None. Scope is fully bounded by the proposal; the `strict_tdd` override is justified and noted.
