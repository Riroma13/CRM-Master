=== PHASE 1A COMPLETE ===

Files created:
- `apps/api/scripts/better-auth-schema.config.ts`
- `apps/api/src/common/__tests__/better-auth-schema-config.spec.ts`
- `packages/database/prisma/__tests__/better-auth-schema-reconciliation.spec.ts`
- `openspec/changes/SPEC-0025-identity-platform/evidence/better-auth.generated.prisma`
- `openspec/changes/SPEC-0025-identity-platform/apply-progress.md`
- `openspec/changes/SPEC-0025-identity-platform/apply-summary.md`

Files modified:
- `apps/api/package.json` - pinned Better-Auth/adapter and added `auth@1.6.23`.
- `apps/api/src/common/auth.ts` - added the provider-owned model and field mapping.
- `packages/database/prisma/schema.prisma` - reconciled only the Better-Auth provider block; preserved the pre-existing Identity/Jobs append.
- `pnpm-lock.yaml` - regenerated the approved CLI dependency graph while retaining the dirty worktree's unrelated entries.
- `openspec/changes/SPEC-0025-identity-platform/tasks.md` - recorded Slice 1 completion and Slice 2 as next.

Working Set:
- Planned: Slice 1 / Phase 1A provider toolchain, CLI config, generated provider artifact, model/catalog reconciliation, and assigned provider contract tests.
- Actual: All planned runtime/config/test/evidence paths, plus the required Direct progress and phase-summary artifacts.
- Accuracy: 100% runtime Working Set accuracy; no unplanned runtime path was changed.
- Review budget: 398 authored runtime/config/test changed lines, within the `<=400` Slice 1 target; generated lock/evidence and Direct bookkeeping are separate outputs.

Unexpected Files:
- None.

Unexpected Dependencies:
- None. `auth@1.6.23` and its transitive CLI dependencies are explicitly assigned to this slice.

Acceptance Criteria:
- [x] `better-auth`, `@better-auth/prisma-adapter`, and `auth` are pinned to `1.6.23`; Prisma remains lock-resolved at `6.19.3`.
- [x] The exported config loads the organization plugin and the exact `auth generate` command succeeds.
- [x] Provider-only generated evidence exists at the fixed path with SHA-256 `04e5860477590221ac289c45ffd5378e6eb6be59c41addb0e8cae49dac18e058`.
- [x] Canonical/generated provider model names, `ba_*` maps, field declarations, expiry, active organization state, and collision rules reconcile.
- [x] No provider Prisma CRUD or raw SQL access is introduced in the Slice 1 boundary.
- [x] Prisma validation, focused tests, and API build pass.
- [x] Historical review/refinement/ADR hashes and unrelated protected paths remain unchanged.

Build:
- `pnpm --filter api build` -> PASS.
- `pnpm --filter database exec prisma validate --schema prisma/schema.prisma` -> PASS.
- `pnpm --filter database exec prisma generate --schema prisma/schema.prisma` -> PASS, Prisma `6.19.3`.

Tests:
- `pnpm --filter api test -- src/common/__tests__/better-auth-schema-config.spec.ts --runInBand` -> PASS, 1 suite / 3 tests.
- `pnpm --filter database test -- prisma/__tests__/better-auth-schema-reconciliation.spec.ts` -> PASS, 1 file / 2 tests.
- Exact provider generation command -> PASS.
- Runtime HTTP harness: N/A; this slice has only the provider schema-generation boundary.

Risks:
- The v1.6.23 CLI displays the API workspace version (`0.0.1`) for `auth --version`; package metadata, lock resolution, and generation are the authoritative evidence, and the workspace version was not changed.
- Live provider catalog introspection is deferred until a disposable PostgreSQL instance is available; no uncontrolled database was mutated or queried.

Ready for Phase 1B.
