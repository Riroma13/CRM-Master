# Health Report: SPEC-0026 — OAuth Social Login

```yaml
schema: gentle-ai.health-result/v1
status: HEALTHY_WITH_BASELINE_DEBT
project: crm-master
change: SPEC-0026-oauth-social-login
artifact_store: hybrid
model: openai/gpt-5.6-luna
archive_status: success
verify_status: VERIFIED_WITH_CONDITION
verify_decision: VERIFIED
baseline_debt: present
repository_ready_blocker: none
next_recommended: repository-ready
```

## Executive Summary

The post-Archive SDD environment is healthy and ready to proceed to Repository Ready. The SPEC-0026 archive is present, the active change directory is absent, Engram and OpenSpec traceability is intact, and the accepted Verify result has zero SPEC blockers with all six security gates passing. Repository-wide test debt remains separately classified and does not invalidate SPEC-0026 acceptance.

## Scope and Read-Only Boundary

This report is read-only with respect to production code, tests, schema, Design, Tasks, Architecture Review, and Git lifecycle. The only repository artifact written by this phase is this `health-report.md`; no commit, push, merge, release, tag, or working-tree cleanup was performed.

## Health Findings

### 1. SDD persistence and archive integrity — PASS

- Archive exists at `openspec/changes/archive/2026-08-09-SPEC-0026-oauth-social-login/`.
- Archived artifacts present: `design.md`, `tasks.md`, `tasks-review.md`, `architecture-review.md`, `apply-summary.md`, `verify-report.md`, and `archive-report.md`.
- Active path `openspec/changes/SPEC-0026-oauth-social-login/` is absent.
- `tasks.md` records 16/16 tasks complete.
- Archive report #1015 and local `archive-report.md` agree on destination, hybrid persistence, successful move, no spec sync, and no Git lifecycle operation.
- Engram traceability is intact: Design #940, Tasks #946, Tasks Review #948, Architecture Review #942, Apply Progress #957, Verify #990, and Archive #1015.
- Compatibility artifacts `proposal.md` and delta `specs/` were intentionally absent and explicitly authorized as non-blocking by the Archive report. No unrelated main specs were modified.

### 2. Testing capability and Strict TDD readiness — PASS WITH BASELINE DEBT

| Layer / capability | Available | Canonical command / evidence |
|---|---|---|
| API unit/integration | Yes | `pnpm --filter api test` / Jest 29; `apps/api/jest.config.js` |
| API HTTP doorbell | Yes | `pnpm --filter api test:e2e -- isolation-http.spec.ts`; Supertest/Jest |
| Frontend unit | Yes | `pnpm --filter admin-web test`, `pnpm --filter tenant-web test`; Vitest 3 |
| Browser E2E | Yes | `pnpm --filter tenant-web test:e2e -- e2e/login.spec.ts`; Playwright |
| Coverage instrumentation | Configured | Jest `collectCoverageFrom` and `coverageDirectory`; no dedicated root coverage command or measured threshold in the archived evidence |
| Lint | Yes | `pnpm lint`; archived evidence 5/5 passed |
| Type checking | Configured | TypeScript strict mode; package-level type checks are available through package scripts/configuration |
| Formatting | Yes | Prettier 3 via root `format` script |
| Strict TDD | Enabled | `openspec/config.yaml`, project rules, and archived Verify report; RED/GREEN evidence is recorded for six correction behaviors |

Archived focused evidence is green: auth/identity 37/37, doorbell 4/4, build 3/3, lint 5/5, and `git diff --check` passed. The aggregate `pnpm test` remains red from 12 API failure groups / 69 tests and one unrelated tenant-web CalendarPicker failure. The causes are recorded as pre-existing infrastructure or unrelated date-sensitive behavior; none touches SPEC-0026's acceptance contract.

### 3. Architecture and security gates — PASS

The archived Verify report and source inspection confirm:

- Better Auth owns the atomic callback; implementation uses only supported pre-callback origin gating, lifecycle rejection, and post-redirect authorization boundaries.
- The canonical mount remains exactly one unchanged `app.use('/api/auth', toNodeHandler(auth));` in `apps/api/src/main.ts`.
- Account/session lifecycle hooks reject unsupported writes without callback transactions, manual Better Auth writes, recursion, or compensating cleanup.
- Explicit Google policy is fail-closed: implicit signup/linking disabled, different-email linking disabled, and local email verification required.
- The opaque Better Auth session is resolved before Host-derived tenant access; authorization follows Host → tenant → Better Auth organization → active membership.
- Callback-derived state, body tenant selection, and callback-context tenant bridges are not runtime authorities.
- Security acceptance gates are 6/6, with zero SPEC blockers and zero critical findings.

### 4. Baseline repository debt — SEPARATE, NON-BLOCKING

The following remains repository debt rather than SPEC-0026 acceptance debt:

- 12 API failure groups / 69 failed tests caused by missing test DI, missing `DATABASE_URL`, incomplete reporting Prisma mocks, and missing `REDIS_URL` bootstrap configuration.
- One unrelated tenant-web CalendarPicker click assertion failure (184/185 tenant-web tests passed in the archived aggregate evidence).
- Archived TDD receipt lacks a per-file Safety Net column; Verify classified this as documentation-incomplete and non-blocking.
- The archived Apply Summary contains historical intermediate remediation text stating that Verify was blocked; the later corrected Apply Progress, Verify report, and Archive report are the authoritative final evidence and close that state.

### 5. Registry, configuration, model, and persistence readiness — PASS

- `openspec/config.yaml` declares hybrid persistence, strict TDD, testing capabilities, phase rules, and `openai/gpt-5.6-luna` for code and planning.
- `.atl/skill-registry.md` exists and indexes the available non-SDD skills and project conventions; it was not modified.
- Project stack and commands are discoverable from `AGENTS.md`, `.ai/context/PROJECT.md`, package manifests, Jest/Vitest/Playwright configuration, and `turbo.json`.
- The configured health model is Luna (`openai/gpt-5.6-luna`), matching the authorized model.
- Engram context is available through `sdd-init/crm-master`; archive, verify, and apply evidence were retrieved from the requested observations.

## Working-Tree State

Pre-existing working-tree changes were observed and preserved. They include OAuth-related source/test edits, `.env.example`, Jest/Playwright configuration and generated Playwright report changes, plus the untracked archived SPEC-0026 directory. No attempt was made to classify, stage, revert, or clean these changes. This report must not be interpreted as Git cleanliness or authorization for lifecycle operations.

## Concrete Repository Ready Blocker

**None identified.** The red aggregate test command is documented baseline debt, not a SPEC-0026 blocker. The intentionally absent compatibility artifacts and the historical Apply Summary wording are traceability warnings already covered by the accepted Archive/Verify decisions, not conditions that prevent Repository Ready.

## Recommendation

Proceed to **Repository Ready**. Maintainer-controlled Commit, Push, Merge, Release, and Tag operations remain outside this phase and were not performed.

## Artifact and Persistence Record

- OpenSpec: `openspec/changes/archive/2026-08-09-SPEC-0026-oauth-social-login/health-report.md`
- Engram topic: `sdd/SPEC-0026-oauth-social-login/health-report`
- Persisted report: identical to this file; `capture_prompt: false`
