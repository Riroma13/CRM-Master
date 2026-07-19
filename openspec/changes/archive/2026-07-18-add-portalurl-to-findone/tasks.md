# Tasks: Add `portalUrl` to `TenantsService.findOne()`

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Add `portalUrl` line to `findOne()` return | PR 1 | `pnpm --filter api test` | N/A — additive DTO field, no new path exercised | Revert the one added line in `tenants.service.ts` |

## Phase 1: Implementation

- [x] 1.1 Open `apps/api/src/modules/tenants/tenants.service.ts`, locate `findOne()`, and add `portalUrl: \`https://${tenant.slug}.crmmaster.com\`,` to the return object between `status` and `config` (mirroring `create()` line 142).

## Phase 2: Verification

- [ ] 2.1 Run `pnpm --filter api lint` — must be clean.
- [x] 2.2 Run `pnpm --filter api test` — full suite must remain green; if a test pins exact shape, add `portalUrl` to its expected object (one line) per proposal §Risks.
- [x] 2.3 Run `git diff apps/api/src/modules/tenants/tenants.service.ts` — confirm exactly one line added and no other method touched.