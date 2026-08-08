# SDD-Direct Repository Ready: SPEC-0025 — Identity & Organization Platform

## Gate Record

- **Change:** `SPEC-0025-identity-platform`
- **Artifact:** `repository-ready.md`
- **Status:** `READY_WITH_CONDITIONS`
- **Canonical evidence path:** `openspec/changes/archive/2026-08-01-SPEC-0025-identity-platform/`
- **Generated at:** `2026-08-01`
- **Effective owner/model:** `openai/gpt-5.6-luna`
- **Artifact store:** hybrid
- **Branch:** `merge/spec-0025-identity`

## Decision

**READY_WITH_CONDITIONS.** The intended SPEC-0025 boundary is understood, all
current changes are either classified for inclusion or explicitly excluded,
there are no unexplained deletions or renames, generated tenant-scope output
matches `schema.prisma`, and `git diff --check` passes. The worktree remains
intentionally cumulative and dirty. Commit, Push, Merge, Release, and Tag are
maintainer-controlled and were not executed.

## Branch and Worktree State

- Branch: `merge/spec-0025-identity`.
- Worktree: dirty; 76 modified tracked paths plus untracked SPEC-0025,
  migration, generated-support, and archived-evidence paths were reported.
- Staged changes: none observed in `git status --short`.
- Deleted files: none reported.
- Renamed files: none reported.
- `git diff --check`: PASS (exit code 0).
- No reset, clean, stash, restore, checkout, stage, commit, push, merge, tag,
  release, migration, or database operation was performed.

## Categorized Change Inventory

### Production implementation — intended SPEC-0025 boundary

- `apps/api/src/modules/identity/**` — identity catalog, contracts,
  organization guard, controller, repositories, authorization service and
  processor, audit dispatcher, module, and focused tests.
- `apps/api/src/common/auth-client.provider.ts`,
  `apps/api/src/common/guards/better-auth.guard.ts`,
  `apps/api/src/common/middleware/tenant-resolve.middleware.ts`, and the
  middleware test — canonical provider boundary and Host authority correction.
- `apps/api/src/common/prisma.service.ts`, `apps/api/src/modules/core/core.module.ts`,
  audit services/module/ingestion, reporting read-only boundary, and related
  tests — Prisma boundary and composition integration recorded by Apply/Verify.
- Active queue compatibility corrections in Knowledge, Reporting, Billing,
  Activity Timeline, Audit, Notification, and related producers/consumers,
  with their queue constants and focused harnesses. The archived BullMQ
  evidence packet identifies these as bounded SPEC-0025 compatibility fixes.

### Tests and harness corrections — intended boundary

- Identity unit/integration/audit/module tests and
  `apps/api/test/doorbell/identity-isolation.e2e-spec.ts`.
- Host middleware, audit append-only, reporting read-only, queue compatibility,
  and bounded module-harness tests listed by the archived Apply/Verify evidence.
- `apps/api/jest-e2e.json`, `apps/api/test/setup-e2e-env.ts`, and the bounded
  e2e harness changes required by the recorded test-environment correction.

### Database, schema, and migrations — intended boundary

- `packages/database/prisma/schema.prisma`.
- `packages/database/prisma/migrations/20260728150000_add_identity_platform/`.
- `packages/database/prisma/migrations/20260730150000_add_better_auth_session_metadata/`.
- `packages/database/src/audit-append-only.extension.ts` and
  `packages/database/src/index.ts`.
- `docs/adr/0025-identity-platform.md`.

### Generated output — intended boundary

- `packages/database/prisma/generators/tenant-scope/generated/tenant-metadata.json`.
- `packages/database/prisma/generators/tenant-scope/generated/tenant-models.ts`.
- `packages/database/prisma/generators/tenant-scope/generated/tenant-scope.spec.ts`.

### SDD/archive evidence — intended boundary

- `openspec/changes/archive/2026-08-01-SPEC-0025-identity-platform/**`,
  including the archived Proposal, Spec, Design, Tasks, Apply Summary, Verify,
  Archive, Health, preserved exploration artifacts, and this report.

### Configuration/documentation — excluded from the SPEC-0025 commit boundary

- `.ai/context/ROADMAP.md`, `.ai/context/SESSION.md`, `AGENTS.md`.
- `.opencode/agents/sdd-direct-orchestrator.md`.
- `docs/SDD-MODEL-ASSIGNMENTS.md`, `docs/SDD-WORKFLOW.md`,
  `docs/architecture/platform-baseline.md`, `docs/architecture/sdd-direct.md`,
  `docs/sdd-workflow-guard.md`, `docs/templates/README.md`, and
  `openspec/config.yaml`.
- `pnpm-lock.yaml` unless the maintainer separately confirms its dependency
  changes belong to this boundary.

### Unrelated/unknown cumulative changes — excluded pending maintainer review

- Any modified production or test path outside the bounded Identity, Prisma,
  audit/reporting boundary, and documented queue-compatibility working sets.
- The inventory contains broad pre-existing changes in client-auth, clients,
  dashboard, billing, knowledge, notification, observability, tenant-
  preferencias, tenants, and generic e2e tests. They are preserved, not
  silently discarded, and are not included by this handoff unless the
  maintainer explicitly reconciles them to SPEC-0025 evidence.

## Boundary Validation

| Check | Result | Evidence |
|---|---|---|
| Production scope | PASS WITH EXCLUSIONS | Apply/Verify identify the Identity, audit/reporting, Prisma, and queue compatibility boundaries; broader cumulative paths are excluded above. |
| Test scope | PASS WITH EXCLUSIONS | Focused Identity, isolation, audit/reporting, queue, and harness corrections have archived evidence; unrelated cumulative tests remain excluded. |
| Schema/migration rationale | PASS WITH CONDITION | ADR-0025, additive identity migration, Better Auth metadata migration, and archived Verify/Health evidence align; baseline reproducibility remains a condition. |
| Logical `User` → `LegacyUser` rename | PASS | Physical `users` and `ba_users` mappings are preserved; no physical table rename is claimed. |
| Generated Prisma consistency | PASS | `pnpm --filter database generate:scope:verify` exited 0: generated files are up to date (`95` models; `77` tenantId and `11` clienteId). |
| Direct SQL authentication fallback | PASS | Archived Verify evidence and current guard inspection show no `$queryRawUnsafe`, `$queryRaw`, or direct `ba_sessions`/`ba_users` authentication path. |
| BullMQ queue names | PASS | Archived queue evidence records active queue identities as colon-free; route/job/payload colons are excluded from queue-name validation. |
| Exploration artifacts | PASS WITH CONDITION | `exploration.md`, `exploration-redis-connection.md`, `exploration-bullmq-queues.md`, and `exploration-operational.md` are preserved and explicitly identified. |
| Accidental deletion/replacement gap | PASS | No deleted or renamed paths were reported; archived Tasks/Verify record replacement coverage for the six historical test paths. |
| Sensitive files | PASS | No `.env`, secret, credential, key, certificate, or local-machine file appears in the intended boundary or status output; nothing is staged. |

## Retained Conditions

The following remain non-blocking and are carried forward exactly:

- Full historical API suite: CONDITION.
- API lint: CONDITION due to the pre-existing API ESLint configuration gap.
- Test Environment Isolation and `DATABASE_URL` Provisioning.
- Database Migration Baseline and Environment Reproducibility.
- Preserved exploration artifacts require later review/disposition.
- Unavailable closed Apply output hashes remain unavailable; historical
  evidence is not rewritten.

## Intended Commit Boundary

The maintainer may form the SPEC-0025 commit boundary from the intended
production, test, database/schema/migration, generated-output, ADR, and archived
evidence groups above, after reviewing each path against the archived Apply and
Verify evidence. Explicitly exclude the configuration/documentation group,
unrelated/unknown cumulative changes, and any sensitive/local file discovered
by the maintainer before staging. Do not stage from this report automatically.

## Maintainer Guidance and Exact Next Phase

1. Review the categorized path list and stage only the confirmed SPEC-0025
   boundary.
2. Keep all retained conditions visible in the commit/PR handoff; do not claim
   full historical-suite, lint, migration-baseline, or production readiness.
3. The exact next canonical phase is **Commit**, manual maintainer-only.

## Structured Result

```yaml
status: READY_WITH_CONDITIONS
change: SPEC-0025-identity-platform
phase: Repository Ready
effective_owner_model: openai/gpt-5.6-luna
branch: merge/spec-0025-identity
artifact_store: hybrid
artifacts:
  - openspec/changes/archive/2026-08-01-SPEC-0025-identity-platform/repository-ready.md
prior_artifacts:
  - openspec/changes/archive/2026-08-01-SPEC-0025-identity-platform/verify-report.md
  - openspec/changes/archive/2026-08-01-SPEC-0025-identity-platform/archive-report.md
  - openspec/changes/archive/2026-08-01-SPEC-0025-identity-platform/health-report.md
blocking_findings: []
retained_conditions: 6
git_diff_check: PASS
generated_consistency: PASS
migration_consistency: PASS_WITH_CONDITION
decision: READY_WITH_CONDITIONS
manual_gates:
  Commit: NOT EXECUTED
  Push: NOT EXECUTED
  Merge: NOT EXECUTED
  Release: NOT EXECUTED
  Tag: NOT EXECUTED
next: Commit
```
