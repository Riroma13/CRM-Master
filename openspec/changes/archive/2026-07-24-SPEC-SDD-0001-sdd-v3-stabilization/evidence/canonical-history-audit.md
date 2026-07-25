# Canonical Historical Audit

Change: `SPEC-SDD-0001-sdd-v3-stabilization`
Audit date: 2026-07-23
Audit command: `node openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/audit-canonical-history.mjs`

## Status

**PASS_WITH_LEGACY_BASELINE.** The canonical archive membership is reproducible and all included reports are pre-v3.0 under the approved Legacy Baseline Exception. R-01 and R-12 are therefore `PASS_WITH_LEGACY_BASELINE`; this does not fabricate source commits or aggregate results.

## Canonical Source Of Truth

The approved Design §8 and the SDD v3 specification identify immutable `archive-report.md` files under `openspec/changes/archive/` as the historical source of truth. Dashboard, roadmap, and generated summary data are derived views and are not authoritative. The audit script enumerates archive directories and reads only each canonical `archive-report.md` plus the approved v2.1 manifest for a claim cross-check. The governing exception is `canonical-audit-governance-resolution.md`.

## Legacy Baseline Exception

Pre-v3.0 classification requires an existing archive directory, readable
canonical report, approved canonical identity/path, and documented
inclusion/exclusion rules. Missing `source_commit` is a known historical
limitation for these archives. A report is v3.0+ only with an explicit
`schema_version: 3.0`, `source_version: v3.0`, or `SDD v3.0` marker.

## Population Recomputation

The filesystem contains 27 archive directories and 25 readable `archive-report.md` artifacts:

- Included: 22 reports whose directory identity is one of the approved SPEC IDs.
- Excluded: 5 archive entries: 3 non-SPEC reports, 1 incomplete SPEC-named directory, and 1 partial historical duplicate directory.
- Duplicate SPEC IDs among included reports: 0.
- Superseded records in the included archive reports: 0 identified. `SPEC-0006` mentions an older partial archive, but that reference is not a second canonical report in the enumerated archive directory and is not counted.

The 22 included identities, grouped only for counting, are:

| Group | SPEC IDs | Count |
| --- | --- | ---: |
| tenant | SPEC-0002, SPEC-0005, SPEC-0006, SPEC-0008 | 4 |
| mission-control | SPEC-0003, SPEC-0009 | 2 |
| platform | SPEC-0010 through SPEC-0017, SPEC-0020 through SPEC-0024, SPEC-0028 | 14 |
| audit-analytics | SPEC-0018, SPEC-0019 | 2 |
| **Total** |  | **22** |

The recomputed 22 identities and paths agree with the approved Design §8 membership list and the fixture membership claim. This agreement alone does not establish source provenance or aggregate validity.

## Included Artifacts

1. `openspec/changes/archive/2026-07-04-SPEC-0002-multi-tenant-isolation-auth/archive-report.md`
2. `openspec/changes/archive/2026-07-19-SPEC-0003-dashboard-mission-control/archive-report.md`
3. `openspec/changes/archive/2026-07-19-SPEC-0005-tenant-auth/archive-report.md`
4. `openspec/changes/archive/2026-07-19-SPEC-0006-tenant-citas/archive-report.md`
5. `openspec/changes/archive/2026-07-18-SPEC-0008-tenant-dashboard/archive-report.md`
6. `openspec/changes/archive/2026-07-19-SPEC-0009-global-activity-feed/archive-report.md`
7. `openspec/changes/archive/2026-07-19-SPEC-0010-universal-search/archive-report.md`
8. `openspec/changes/archive/2026-07-20-SPEC-0011-ai-automation-hub/archive-report.md`
9. `openspec/changes/archive/2026-07-20-SPEC-0012-communication-platform/archive-report.md`
10. `openspec/changes/archive/2026-07-20-SPEC-0013-document-platform/archive-report.md`
11. `openspec/changes/archive/2026-07-20-SPEC-0014-integration-platform/archive-report.md`
12. `openspec/changes/archive/2026-07-20-SPEC-0015-workflow-engine/archive-report.md`
13. `openspec/changes/archive/2026-07-20-SPEC-0016-notification-center/archive-report.md`
14. `openspec/changes/archive/2026-07-20-SPEC-0017-activity-timeline/archive-report.md`
15. `openspec/changes/archive/2026-07-20-SPEC-0018-audit-platform/archive-report.md`
16. `openspec/changes/archive/2026-07-20-SPEC-0019-reporting-analytics/archive-report.md`
17. `openspec/changes/archive/2026-07-20-SPEC-0020-ai-knowledge-base/archive-report.md`
18. `openspec/changes/archive/2026-07-20-SPEC-0021-public-api/archive-report.md`
19. `openspec/changes/archive/2026-07-20-SPEC-0022-plugin-platform/archive-report.md`
20. `openspec/changes/archive/2026-07-20-SPEC-0023-billing-platform/archive-report.md`
21. `openspec/changes/archive/2026-07-20-SPEC-0024-monitoring/archive-report.md`
22. `openspec/changes/archive/2026-07-21-SPEC-0028-jobs-platform/archive-report.md`

## Excluded Artifacts

1. `openspec/changes/archive/2026-07-18-add-portalurl-to-findone/archive-report.md` — non-SPEC dashboard/recovery row; no approved SPEC identity.
2. `openspec/changes/archive/2026-07-18-client-platform/archive-report.md` — non-SPEC dashboard row; no approved SPEC identity.
3. `openspec/changes/archive/2026-07-19-client-self-registration/archive-report.md` — non-SPEC dashboard row; no approved SPEC identity.
4. `openspec/changes/archive/2026-07-21-SPEC-0027-feature-flags/archive-report.md` — excluded because the directory exists without a canonical `archive-report.md`; no historical artifact can be audited.
5. `openspec/changes/archive/SPEC-0006-tenant-citas-2026-07-08/archive-report.md` — excluded as the partial historical duplicate referenced by the canonical SPEC-0006 report; it has no canonical `archive-report.md`.

Also excluded from the historical population, without treating them as archive records: dashboard rows, roadmap totals, generated health reports, the current change's fixtures/evidence, and Engram/session summaries. They are derived or process records, not canonical archived SPEC artifacts. SPEC-SDD-0002 and all Stable/release/freeze/tag records are out of scope.

## R-01 Reconciliation

**PASS_WITH_LEGACY_BASELINE.**

- Membership: 22/22 archive reports physically present and identity/path membership agrees with the approved Design list.
- Exclusions: 3 non-SPEC archive rows identified and excluded for stated reasons.
- Source commits: **0/22 canonical archive reports contain an explicit 40-character source commit**. This is the known pre-v3.0 historical limitation. The v2.1 fixture claims six non-zero commits (`SPEC-0013`, `SPEC-0015`, `SPEC-0016`, `SPEC-0017`, `SPEC-0018`, `SPEC-0019`) and supplies sixteen all-zero placeholders. Those fixture values are not source evidence, and the sixteen placeholders cannot satisfy the source-commit requirement.
- Authority conflict: the approved improvement inventory contains a non-zero commit claim for `SPEC-0014`, while the v2.1 manifest uses the all-zero placeholder and the canonical report contains no commit. Reconciliation must fail closed rather than choose one.

Future v3.0+ archives cannot use this exception: each must publish an explicit source commit.

## R-12 Reconciliation

**PASS_WITH_LEGACY_BASELINE.**

No historical aggregate result is claimed. The approved v3.0+ definition is `canonical-v3-aggregate/v1`: `qualifying_included / included_v3_records`, with explicit inputs, inclusion, exclusions, and approval as defined in the governance resolution. It is required for v3.0+ readiness and is not retroactively applied to this pre-v3.0 population.

## Approved Contract Check

- Design §8: canonical archive paths, exclusions, source commits, and exact membership were checked.
- Design §11/§16/§17: historical comparison requires canonical audit first; source values and aggregate definitions must remain separate.
- Specification Requirement “Readiness gates”: R-01/R-12 may use `PASS_WITH_LEGACY_BASELINE` for qualifying pre-v3.0 records; v3.0+ requires source commits and the approved aggregate definition.
- Architecture review input: `Verdict: APPROVED` remains valid for R-07 only and does not authorize readiness or lifecycle advancement.
- Scope: documentation/evidence only; no product/runtime behavior, SPEC-SDD-0002 work, release, Stable, freeze restoration, tag, Verify, or Archive action was started.

## Reproduction Result

Running the audit script recomputes `27 archive directories`, `25 readable reports`, `22 included`, `5 excluded`, and `0/22 explicit canonical source commits`. It identifies 22 pre-v3.0 records and returns `PASS_WITH_LEGACY_BASELINE`; no historical aggregate value is emitted.
