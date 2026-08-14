# Work Unit Evidence: SPEC-0030

| Apply unit | Focused test command and result | Runtime harness and result | Rollback boundary |
|---|---|---|---|
| 7.1 Foundation | `pnpm --filter api test -- --runInBand tenant-settings tenant-profile.service` — PASS, 9/9 | N/A: module/type foundation has no independent runtime boundary | The 7 API foundation files in the approved API set |
| 7.2 Core Engine | Same focused Jest command — PASS, 9/9 | `pnpm --filter api test:e2e -- tenant-settings-isolation.spec.ts` — PASS, 1/1 real DB | API facade/profile files and their 4 approved API tests |
| 7.3 Feature Implementation | Focused Jest — PASS, 9/9 | Doorbell — PASS; Host-selected A/B state remains isolated and body `tenantId` is rejected | API settings facade and profile boundary only |
| 7.4 Integration | `pnpm --filter tenant-web test -- settings admin.test.ts` — PASS, 4/4; `pnpm --filter tenant-web build` — PASS | N/A beyond bounded Vitest page harness; no Playwright added by Design | The 4 approved tenant-web files |
| 7.5 Testing | API, UI, doorbell, API build/lint, UI build/lint, SDD validator — all PASS | Real doorbell command above — PASS | Revert only the 15 approved Working Set files and evidence separately |
| 7.6 Apply Summary | `pnpm sdd:validate` — PASS; `git diff --check` — PASS | N/A: consolidation artifact | Apply evidence only; no production rollback needed |

## Exclusions Checked

No schema, migration, generated file, package/lockfile, guard/auth file,
Sidebar/registry, unrelated module, SPEC-0028, or SPEC-0029 path changed.
