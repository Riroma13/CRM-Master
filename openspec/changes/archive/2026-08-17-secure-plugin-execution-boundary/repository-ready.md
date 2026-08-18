# Repository Ready: secure-plugin-execution-boundary

> **Status:** PASS
> **Action:** Repository Ready
> **Role:** LOW / OPERATOR-EVIDENCE
> **Model binding:** `longcat/LongCat-2.0` (`.opencode/sdd-model-map.json:19-21,46,60-62`)
> **Persistence:** hybrid
> **Change location:** `openspec/changes/archive/2026-08-17-secure-plugin-execution-boundary/`
> **Date:** 2026-08-17

## Gate Record

| Property | Value |
|---|---|
| Change | `secure-plugin-execution-boundary` |
| Artifact | `repository-ready.md` |
| Status | PASS |
| Canonical evidence path | `openspec/changes/archive/2026-08-17-secure-plugin-execution-boundary/` |
| Generated at | 2026-08-17 |

## Bounded Change Outcome

P0 security-containment remediation. Plugin execution remains **disabled /
fail-closed**. Host/session/membership authority is immutable; caller-supplied
tenant fields are ignored; the six management surfaces deny foreign access
pre-effect; strict manifest/archive admission runs before effects; registration
is explicitly inactive/disabled; activation is deterministic
`409 PLUGIN_EXECUTION_DISABLED`; and `EventBridgeService.dispatchToPlugin` throws
the stable disabled error before any worker, registry, delivery-persistence, or
execution-error-logger effect. Proven by 7 focused Jest suites (64 tests / 0
skipped) and the accepted no-skip real HTTP Tenant A/B doorbell (1 suite / 4
tests / 0 skipped).

Verify returned BLOCKED once, then PASS after exactly one orchestrator-owned
Direct Fix. The Direct Fix closed V-01 (EventBridge `dispatchToPlugin` made
fail-closed before effects; no pool/registry/Prisma/logger reference remains) and
V-02 (undeclared `packages/shared/src/plugin/index.ts` barrel change removed;
API consumers now import approved contracts directly from `@shared/plugin/plugin.types`
and the approved manifest schema subpath). The Verify correction budget is
**consumed**; no further Direct Fix is permitted.

## Artifact Pointers

| Artifact | Path | Verdict |
|---|---|---|
| Design | `design.md` | 18-section Enterprise Design; plugin disabled/fail-closed |
| Architecture Review | `architecture-review.md` | PASS (AR-01 closed via single Design Refinement) |
| Tasks | `tasks.md` | 12/12 reconciled complete; 19-file Working Set |
| Tasks Review | `tasks-review.md` | PASS (TR-01–TR-05 closed via single Tasks Refinement) |
| Workload Guard | `workload-guard.md` | PASS; HUMAN feature-branch-chain authorization recorded |
| Apply Summary | `apply-summary.md` | 7.1–7.6 PASS |
| Verify | `verify.md` | PASS |
| Verify Report | `verify-report.md` | initial BLOCKED preserved; fresh PASS |
| Verify Direct Fix | `verify-direct-fix.md` | single Direct Fix consumed (V-01, V-02) |
| Archive Report | `archive-report.md` | PASS |
| Health Report | `health-report.md` | PASS |
| Repository Ready | `repository-ready.md` | this artifact |

All 12 artifacts present in the canonical archive path.

## Working Set Reconciliation

Approved 19-file Working Set (`tasks.md:13-33`) exactly matches the uncommitted
working tree:

### Modified (18)
1. `apps/api/src/modules/plugin/__tests__/plugin.controller.spec.ts`
2. `apps/api/src/modules/plugin/__tests__/plugin-manager.service.spec.ts`
3. `apps/api/src/modules/plugin/__tests__/plugin-validator.service.spec.ts`
4. `apps/api/src/modules/plugin/__tests__/plugin-cross-tenant-isolation.spec.ts`
5. `apps/api/src/modules/plugin/sandbox/__tests__/worker-pool.service.spec.ts`
6. `apps/api/src/modules/plugin/__tests__/event-bridge.service.spec.ts`
7. `apps/api/src/modules/plugin/__tests__/plugin-registry.service.spec.ts`
8. `apps/api/src/modules/plugin/event-bridge/event-bridge.service.ts`
9. `apps/api/src/modules/plugin/guards/plugin.guard.ts`
10. `apps/api/src/modules/plugin/plugin-manager.service.ts`
11. `apps/api/src/modules/plugin/plugin-validator.service.ts`
12. `apps/api/src/modules/plugin/plugin.controller.ts`
13. `apps/api/src/modules/plugin/plugin.module.ts`
14. `apps/api/src/modules/plugin/registry/plugin-registry.service.ts`
15. `apps/api/src/modules/plugin/sandbox/worker-pool.service.ts`
16. `packages/shared/src/plugin/plugin-manifest.schema.ts`
17. `packages/shared/src/plugin/plugin.types.ts`
18. `packages/shared/src/plugin/__tests__/plugin.types.spec.ts`

### Deleted (1)
19. `apps/api/src/modules/plugin/sandbox/plugin.worker.ts`

`git diff --stat` confirms: 19 files changed, 393 insertions, 599 deletions —
exactly the 19-file Working Set plus the declared fixture deviation. No extra
tracked production path is modified.

## Sole Declared Deviation

`packages/shared/src/plugin/__tests__/plugin.types.spec.ts` — the only bounded
deviation outside the approved 19-file Working Set. It adds required
`PluginMetadata.enabled: false` fields to two existing compile fixtures so they
satisfy the approved disabled contract. The contract was **not** weakened; no
production consumer outside the Working Set required modification. This is
test-only and is the sole declared deviation in the entire diff.

## No Production Barrel Drift

`packages/shared/src/plugin/index.ts` appears **0 times** in
`git diff --name-only`. The undeclared barrel change found during Verify was
explicitly removed by the Direct Fix (V-02 closed). API consumers import
approved contracts directly. No production barrel, re-export surface, or public
behavioral contract changed.

## No Infrastructure / Schema / Dependency Mutation

`git diff --name-only` contains **0** matches for `package.json`,
`schema.prisma`, `migrations`, `.env`, or `docker`. No persistent database or
Redis instance was mutated. The doorbell's disposable PostgreSQL/Redis containers
were removed by the cleanup trap during Apply 7.5; post-run inspection confirmed
`disposable harness cleanup: PASS`. No repository infrastructure, schema,
dependency, container, or environment change persists.

## Preserved No-Skip Doorbell Evidence

The approved no-skip Tenant A/B doorbell is preserved in `apply-summary.md`
7.5/7.6 and `verify-report.md` fresh Verify. Its accepted result is **1 suite /
4 tests / 0 skipped** and proves: global-first anonymous `401` denial
(`TenantResolveMiddleware` was traced as the original `404` producer, corrected
via bounded disposable Host-tenant bootstrap rather than a security-expectation
change), forged-tenant containment, same-tenant metadata lifecycle, inactive
install, disabled activation, Tenant B isolation (`404`, no delivery record),
and malformed-package rejection before registry/filesystem effect. The doorbell
was NOT reprovisioned or rerun in Verify or this report; no database was
provisioned. Its no-skip contract remains intact and it is not a skipped gate.

## Baseline Debt

No unrelated failures were relabeled as part of this change. The doorbell's
original `404` and request-factory misuse were traced and corrected within the
approved doorbell path, not deferred as debt. No new unrelated baseline debt was
introduced. The change is contained to its approved P0 security scope.

## Untracked Files

Only two untracked paths exist:
- `apps/api/test/doorbell/plugin-tenant-isolation.doorbell.spec.ts` — the
  approved doorbell spec (Working Set file 19).
- `openspec/changes/archive/2026-08-17-secure-plugin-execution-boundary/` — this
  archive folder.

No unexpected production file or dependency was introduced.

## Validators and Gates (Fresh Results)

| Validator | Result | Command |
|---|---|---|
| CRM-SDD governance validator | PASS | `pnpm sdd:validate` → `CRM-SDD governance validation: PASS` |
| Conflict/whitespace check | PASS | `git diff --check` → no output, exit 0 |

Both re-run at Repository Ready time. No broad audit or infrastructure
provisioning was performed.

### Fresh Validation Output

`pnpm sdd:validate` reported:
- canonical files and classifications are valid
- exactly 14 phases and nested Apply 7.1-7.6 are valid
- workflow authority and non-semantic Guard boundary are valid
- local Direct wiring, legacy STOP stubs, and agent bindings are valid
- logical role map, hybrid persistence, and maintainer gates are valid
- package-level validators and Enterprise template boundary are valid

`git diff --check` produced no output, exit code 0.

## Git State Confirmation

| Property | Value |
|---|---|
| Branch | `sec/secure-plugin-execution-boundary` |
| Upstream | none (isolated; no stack to `main`) |
| Commits for this change | **0** — HEAD equals `main`'s merge commit; the entire change is uncommitted working tree |
| Stash entries | 4, all on unrelated branches (`feat/SPEC-0006-tenant-citas-pr3d`, `feat/SPEC-0005-tenant-auth-pr3`, `main`); none on this branch |
| Tracked changes | 18 modified + 1 deleted = 19 (exact Working Set) |
| Untracked | doorbell spec + this archive folder only |
| Barrel drift | none |
| Infrastructure mutation | none |

No Git lifecycle operation has been executed. The repository state and
provenance are unambiguous.

## Maintainer-Controlled Gates

These gates are intentionally manual and are NOT executed by SDD-Direct:

| Gate | Status | Maintainer evidence |
|---|---|---|
| Inspect / Review | NOT EXECUTED | Review the 19-file diff on `sec/secure-plugin-execution-boundary`; verify fail-closed containment, tenant authority, inactive/disabled state, admission strictness, EventBridge/worker/pool/static-safety, and the no-skip doorbell evidence |
| Commit | NOT EXECUTED | Manual action required on isolated branch `sec/secure-plugin-execution-boundary` |
| Push | NOT EXECUTED | Manual action required |
| Merge | NOT EXECUTED | Manual action required |
| Release | NOT EXECUTED | Manual action required |
| Tag | NOT EXECUTED | Manual action required |

Commit, Push, Merge, Release, and Tag are HUMAN / MAINTAINER-only per
`AGENTS.md` and `docs/SDD-WORKFLOW.md:225-232`. This agent has prepared the
Repository Ready evidence packet and explicit gate handoff only; it has not
executed or simulated any maintainer authorization.

## Decision

The change is archived, verified PASS after exactly one Direct Fix with the
correction budget consumed and no CRITICAL or blocking conditions remaining, the
19-file Working Set is intact with the single declared fixture-only deviation,
production barrel drift found during Verify was removed (V-02 closed), no
persistent infrastructure or schema or dependency was mutated, the no-skip
doorbell evidence is preserved, baseline debt was preserved only when proven,
and all fresh canonical validators pass. Repository state is consistent with the
verified Design and the canonical workflow. Repository Ready **PASS**.

## Structured Result

```yaml
status: PASS
change: secure-plugin-execution-boundary
artifact: repository-ready.md
blocking_findings: []
manual_gates:
  - Inspect / Review
  - Commit
  - Push
  - Merge
  - Release
  - Tag
next: HUMAN / MAINTAINER Git handoff
```
