# Direct Apply Progress: SPEC-0025 - Identity & Organization Platform

**Mode:** SDD-Direct
**Slice:** 1 / Phase 1A
**Status:** COMPLETE
**Delivery:** `stacked-to-main`
**Scope:** Exact Better-Auth toolchain/config, provider-only generated schema,
provider schema reconciliation, and assigned provider contract tests.

## Pre-Existing Worktree Deviation

Recorded before editing the dirty production paths:

- `packages/database/prisma/schema.prisma` was already modified before this
  session. Its pre-Apply worktree hash was
  `d705392820559ad39f317de5633200d48466db6f009ff1f086273d8e4a0488ab` and its
  existing diff appended the uncommitted SPEC-0025 local Identity models and
  SPEC-0028 Jobs models after the historical schema.
- Phase 1A requires this same file for the provider schema boundary. The slice
  will replace only the existing Better-Auth provider block near lines 53-162;
  the pre-existing Identity/Jobs append and every unrelated hunk remain
  preserved.
- `pnpm-lock.yaml` was also dirty before this session with unrelated dependency
  and workspace changes. Its pre-Apply worktree hash was
  `1ccfbb05b0a55d1848846831a8aa61d8d64a0a509ceab544d45b04ebc12cc92e`.
  Dependency installation may add only the pinned `auth@1.6.23` graph and the
  resolution changes required by the approved API manifest; unrelated lockfile
  entries remain outside this slice.

No other pre-existing dirty file is required by Slice 1.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1A.1 toolchain/config/artifact | `apps/api/src/common/__tests__/better-auth-schema-config.spec.ts` | Integration | N/A (new) | PASS: initial run failed on range, missing config, and missing CLI | PASS: 3/3 | 3 scenarios: pins, generation, no direct provider access | PASS: assertions remain focused on the boundary |
| 1A.2 provider schema reconciliation | `packages/database/prisma/__tests__/better-auth-schema-reconciliation.spec.ts` | Integration | N/A (new) | PASS: initial run failed on missing generated artifact | PASS: 2/2 | 2 scenarios plus all provider field declarations | PASS: escaped nullable type matching and centralized model parsing |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `pnpm --filter api test -- src/common/__tests__/better-auth-schema-config.spec.ts --runInBand` -> PASS, 1 suite / 3 tests |
| Focused test command | `pnpm --filter database test -- prisma/__tests__/better-auth-schema-reconciliation.spec.ts` -> PASS, 1 file / 2 tests |
| Schema validation | `pnpm --filter database exec prisma validate --schema prisma/schema.prisma` -> PASS |
| Prisma client generation | `pnpm --filter database exec prisma generate --schema prisma/schema.prisma` -> PASS, Prisma `6.19.3` |
| Build | `pnpm --filter api build` -> PASS |
| Runtime/generation harness | Exact approved `pnpm --filter api exec auth generate --cwd . --config scripts/better-auth-schema.config.ts --adapter prisma --dialect postgresql --output ../../openspec/changes/SPEC-0025-identity-platform/evidence/better-auth.generated.prisma --yes` -> PASS; no HTTP runtime boundary exists in Slice 1 |
| Rollback boundary | Revert only `apps/api/package.json`, `apps/api/src/common/auth.ts`, `apps/api/scripts/better-auth-schema.config.ts`, `packages/database/prisma/schema.prisma` provider-block changes, the two Slice 1 tests, the generated evidence artifact, and the corresponding `pnpm-lock.yaml` auth graph. Preserve unrelated dirty hunks and planning artifacts. |

## Current Evidence

- Exact `auth generate` command from the approved design executes successfully.
- Generated output is at
  `evidence/better-auth.generated.prisma` with SHA-256
  `04e5860477590221ac289c45ffd5378e6eb6be59c41addb0e8cae49dac18e058`.
- The provider block now reconciles collision-free `Ba_*` models, `ba_*`
  physical maps, generated field identifiers/types/nullability, invitation
  expiry, and active organization session state.
- Current implementation hashes are recorded for the slice boundary:
  `apps/api/package.json` `29377aa8df564f091d3b2a88c72341fcc401ef9b8388d5b7d14548687aa3ef62`,
  `apps/api/src/common/auth.ts`
  `20a37d7f3f1efba19e11f91ed4bfda4e96f29984a665e69b929cea8afa9a7861`,
  `packages/database/prisma/schema.prisma`
  `71e0597ec7b25a813247d8ab2f75e62a461b379006ed877995b9a9654c0b626c`, and
  `pnpm-lock.yaml` `767ff68bb8b0a9e44fd629ef7365ae8f20a794db6bed25dd7eaafdac4480d32f`.

## Acceptance Checklist

- [x] `better-auth`, `@better-auth/prisma-adapter`, and `auth` are pinned to
  `1.6.23`; Prisma remains lock-resolved at `6.19.3`.
- [x] The exported CLI config loads the organization plugin and the exact
  provider generation command produces the provider-only artifact.
- [x] Generated and canonical provider models use collision-free names and
  unique `ba_*` physical maps.
- [x] Provider field identifiers, types, and nullability are reconciled,
  including `expires_at` and `active_organization_id`.
- [x] Provider access remains behind Better-Auth configuration; the Slice 1
  paths contain no provider Prisma CRUD or raw SQL.
- [x] Prisma schema validation and the focused API/database tests pass.
- [x] Historical review/refinement/ADR hashes and unrelated protected paths
  remain unchanged.

## Working Set Result

- **Planned:** Slice 1 runtime/config paths, provider contract tests, generated
  provider evidence, and required Direct progress artifacts.
- **Actual:** `apps/api/package.json`, `apps/api/src/common/auth.ts`,
  `apps/api/scripts/better-auth-schema.config.ts`,
  `packages/database/prisma/schema.prisma` provider block,
  `pnpm-lock.yaml`, the two focused tests, generated provider evidence,
  `apply-progress.md`, `tasks.md`, and `apply-summary.md`.
- **Accuracy:** 100% of runtime paths stayed within the approved Slice 1
  boundary. The two Direct progress artifacts and `tasks.md` status update are
  required phase bookkeeping, not unplanned runtime dependencies.
- **Review budget:** 398 authored runtime/config/test changed lines (provider
  schema replacement 192, package/config/auth 69, focused tests 137), within
  the `<=400` Slice 1 target. The generated lock graph, provider evidence, and
  Direct bookkeeping artifacts are reported separately.
- **Unexpected files:** None.
- **Unexpected dependencies:** None. `auth@1.6.23` and its transitive CLI graph
  are the approved provider-generation dependency.

## Protected-Path Verification

The pre-Apply status/name/hash manifest was captured before any implementation
edit using `git status --short`, `git diff --name-status`,
`git diff --cached --name-status`, `git ls-files --others --exclude-standard`,
and `git ls-files -m -o --exclude-standard -z | xargs -0 sha256sum`.
Post-Apply hashes match the recorded baseline for the preserved review and
refinement artifacts, including:

- `architecture-review.md`: `89ccbad3a166e62be4068ae3a1d9105f8c1d18869157b2f2c90adb62b0989dcd`
- `architecture-review-direct.md`: `f9b1c738ef84684a441124cc6ebd57d02d7e80f2bedb9bc008c59dc6414a53c1`
- `architecture-review-direct-repeat.md`: `660eb334d2d118a4bb18b622854bc85a2e05dcc1ee8591954013eba108cfa9ea`
- `architecture-review-direct-repeat-2.md`: `05c20afe73dd5593eaea09f2f46d4e5fc2527dcd2a75c67ac3e7a7171a9a73a5`
- `design-refinement.md`: `5df1528b8d3df688fcb9f29fdd489454982d119a6be112ade886a2ebc760a619`
- `design-refinement-repeat.md`: `4d5fcf5750c8580149917185ee7aab86eb5f994174dad8cf4487e6102212a3c3`
- `tasks-review.md`: `6e630ceb4c97ea37f46842fdef17ce5a85d0e99eb1c2a62fd67c3fa7f46073a8`
- `workload-guard.md`: `bc84ee1cdd44a8e734e6c5a36ebfaec25ca31e3b72ada76d3bc834e08fabe9ad`
- `docs/adr/0025-identity-organization-platform.md`: `3cfa49f34eaa03899f279f00e143e29a79b62544b6801525d12973a17379f5cd`

The pre-existing dirty Identity/Jobs schema append remains intact. SPEC-0027,
SPEC-0028, SDD-v3, recovery, dispatcher, and native review paths were not
edited.

## Risks

- `pnpm --filter api exec auth --version` prints the API workspace version
  (`0.0.1`) because the pinned v1.6.23 CLI reads the current project's
  `package.json` for its display version. The exact `auth@1.6.23` package and
  lock resolution are proven by the manifest/lock tests, and the exact
  generation command passes; the API package version was not changed to work
  around this CLI behavior.
- Live physical catalog introspection was not run against the configured
  dirty/uncontrolled database. The focused test reconciles the generated
  provider catalog contract and Prisma validation; disposable-database catalog
  evidence remains a Verify/operational prerequisite.

## Remaining Slice Work

- No remaining implementation work in Slice 1.
- Live physical catalog comparison against a disposable PostgreSQL instance is
  not run against the configured dirty/uncontrolled database; the focused
  reconciliation test covers the generated provider catalog contract and
  Prisma validation. A disposable-catalog run remains a later verification
  responsibility.

## Next Slice

Slice 2 / Phase 1B owns local schema hardening, migration/constraint inventory,
scoped-client operation coverage, Host/guard boundary, and shared Identity
contracts. Those paths are not modified by this slice.
