# Repeat Architecture Review 2: SPEC-0025 - Identity & Organization Platform

status: APPROVED
verdict: APPROVED
change: SPEC-0025-identity-platform
phase: Architecture Review (repeat 2)
artifact: `openspec/changes/SPEC-0025-identity-platform/architecture-review-direct-repeat-2.md`
review_kind: independent SDD-Direct repeat review
skill_resolution: paths-injected
decision: continue
next: Tasks
review_date: 2026-07-25

## Verdict

**APPROVED.** The second refinement closes the three blockers from
`architecture-review-direct-repeat.md` at the planning/design level. The
remaining items are implementation conditions with explicit owners, paths,
tests, and evidence gates. No runtime Apply is authorized by this artifact;
the next workflow phase is Tasks Review.

## Review Basis

The review compared the current `spec.md`, `design.md`, `tasks.md`,
`design-refinement-repeat.md`, and ADR-0025 with the repository's current
Better-Auth, Prisma, tenant-scope, Host middleware, guard, module, and package
configuration. It also checked the exact provider CLI boundary and the
preserved review/refinement hashes.

Current repository facts remain explicit pre-Apply conditions:

- `better-auth` and its Prisma adapter resolve to `1.6.23`; Prisma resolves to
  `6.19.3`.
- The separate `auth@1.6.23` CLI is not installed yet, and the current
  `pnpm --filter api exec auth --version` command is expected to fail until the
  Phase 1 package change is applied.
- `apps/api/src/common/auth.ts` currently exports only `createAuth(prisma)`;
  the dedicated CLI config is assigned to the Phase 1 Working Set.
- The current scoped client, Host fallback, legacy guard, module graph, and
  provider Prisma models still contain the implementation gaps assigned to
  Apply. This review does not treat planned changes as completed runtime proof.

## Blocker Disposition

| Finding | State | Evidence-based disposition |
|---|---|---|
| AR-012 provider schema generation | CLOSED | `design.md`, `tasks.md`, and `design-refinement-repeat.md` now pin `auth@1.6.23`, declare `apps/api/scripts/better-auth-schema.config.ts`, provide the exact `cwd/config/output` command, assign the config/reconciliation tests, define the `Ba_*`/`ba_*` collision policy, and require provider/catalog/migration reconciliation before Apply. |
| AR-013 provider-user legacy mapping | CLOSED | `AuthProviderPort` now includes typed user, organization, member, and approved migration-worker validation; the manifest schema, role/email/organization checks, redacted reports, quarantine boundary, failure matrix, and non-zero exit behavior are assigned to Phases 2 and 5. |
| AR-014 ADR authorization | CLOSED | `docs/adr/0025-identity-organization-platform.md` exists, is in the Working Set, records the schema/provider/tenant/migration/audit decisions, and is an explicit prerequisite for schema Apply. |

Closed findings are not reopened. They still require the implementation evidence
listed in the phase acceptance criteria.

## Conditions

| Finding | Classification | Owner | Required evidence |
|---|---|---|---|
| AR-015 guard/module order | CONDITION | Phase 5 | Core/App graph, Host middleware source, `IdentitySessionGuard -> IdentityPermissionGuard` integration order, and legacy metadata isolation test. |
| AR-016 scoped operation/raw coverage | CONDITION | Phase 1 | Full Prisma read/write/bulk/transaction matrix, all raw-method rejection, invalid scope tests, and provider/platform/admin model rejection. |
| AR-017 provider/local roles | CONDITION | Phases 2-3 | Exact local/provider role mapping, missing actor/organization rejection, and no-provider-call tests. |
| AR-018 Prisma/SQL drift | CONDITION | Phase 1 | Named constraint/index/FK/check allowlist, normalized migration diff, and applied PostgreSQL catalog parity. |
| AR-019 migration artifacts | CONDITION | Phase 5 | Fixed mapping/quarantine/report/audit/hash/scope-manifest paths, schema/redaction tests, rerun/no-op tests, and exit-code tests. |
| AR-020 audit retry identity | CONDITION | Phases 2 and 5 | Stable event/correlation/job/retry IDs, ordering, queue rejection, and retry-without-replay tests. |
| AR-021 scope manifest | CONDITION | Phase 5 | `sdd-direct/scope-manifest/v1` validation, protected SHA-256 comparison, generated-output source hashes, and post-Verify path comparison. |
| AR-022 version/Host trust | CONDITION | Phase 1 | Exact package/Prisma version provenance, `CRM_BASE_DOMAIN`, trusted-proxy, Host grammar, reserved-host, and missing-provider-organization tests. |

These conditions do not require another Design Refinement. Any new blocker
discovered during Tasks Review or Apply must follow the Direct workflow guard.

## Preservation

The prior artifacts remain byte-for-byte unchanged. Their current SHA-256
values are:

| Artifact | SHA-256 |
|---|---|
| `architecture-review.md` | `89ccbad3a166e62be4068ae3a1d9105f8c1d18869157b2f2c90adb62b0989dcd` |
| `architecture-review-direct.md` | `f9b1c738ef84684a441124cc6ebd57d02d7e80f2bedb9bc008c59dc6414a53c1` |
| `architecture-review-direct-repeat.md` | `660eb334d2d118a4bb18b622854bc85a2e05dcc1ee8591954013eba108cfa9ea` |
| `design-refinement.md` | `5df1528b8d3df688fcb9f29fdd489454982d119a6be112ade886a2ebc760a619` |

No runtime source, migration, package manifest, lockfile, dispatcher state, or
native review state was changed by this review. The planning changes are limited
to the declared SPEC-0025 artifacts and ADR-0025.

## Structured Result

```yaml
status: APPROVED
change: SPEC-0025-identity-platform
artifact: openspec/changes/SPEC-0025-identity-platform/architecture-review-direct-repeat-2.md
findings:
  - id: AR-012
    classification: BLOCKER
    state: CLOSED
    decision: continue
  - id: AR-013
    classification: BLOCKER
    state: CLOSED
    decision: continue
  - id: AR-014
    classification: BLOCKER
    state: CLOSED
    decision: continue
  - id: AR-015..AR-022
    classification: CONDITION
    state: OPEN
    decision: continue
next: Tasks
```
