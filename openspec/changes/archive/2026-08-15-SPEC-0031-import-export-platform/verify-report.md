# Verify Report: SPEC-0031 — Import / Export Platform

```yaml
schema: crm-master.verify-report/v1
status: PASS
change: SPEC-0031-import-export-platform
phase: Verify
role: HIGH / ARCHITECT
entry: Apply 7.6 PASS
tasks: 9/9 complete
working_set_paths: 16
unexpected_code_paths: []
prior_verify_blocker: VERIFY-003 resolved by HUMAN-authorized bounded recovery
current_verify_loop: fresh Verify after the only authorized VERIFY-003 recovery
canonical_next: Archive
```

## Entry, Provenance, and Chronology

Consumed before inspection: the approved refined Design, PASS Architecture
Review, Tasks authoritative Working Set and Read Order, PASS Tasks Review,
Workload Guard, `apply-recovery.md`, `apply-progress.md`, Apply 7.6 PASS
Summary, the prior second-BLOCKED Verify report, and
`verify-direct-fix-recovery.md`.

Chronology is preserved: Apply 7.6 PASS and 9/9 Tasks complete; the prior
Verify was the second BLOCKED result because VERIFY-003 lacked a runtime forged
tenant-value proof; HUMAN then authorized exactly one bounded VERIFY-003 Direct
Fix; recovery changed only the approved doorbell test and returned to this fresh
HIGH Verify. The recovery artifact is evidence only and did not itself claim a
Verify result.

The Tasks Read Order was consumed before bounded source inspection. The deleted
legacy Admin Tools importer is an approved Working Set deletion. Current Git
status shows the nine expected modified Working Set paths, that deletion, the
six expected created Working Set paths, and the active change artifact
directory; no unexpected source/test path was found. No production, Design,
Tasks, review, Workload Guard, or unrelated artifact was changed by this Verify.

## VERIFY-003 Recovery Evidence

`apps/api/test/doorbell/import-export-tenant-isolation.e2e-spec.ts:106-126`
captures Tenant A and Tenant B client counts, then sends a real multipart HTTP
request to the registered import endpoint using the Tenant B Host and Tenant B
owner session. Its attached CSV actually has seven columns, including
`tenantId` with Tenant A's UUID. The test asserts the precise `400` response
`Invalid clientes-csv-v1 header`, then asserts both counts are unchanged.

This is non-vacuous runtime coverage: `parseClientesCsv` accepts only the exact
six-column header and fails before `JobsClient.enqueue`; the observed 400 proves
the forged uploaded value reached that parser, while the before/after counts
prove it selected and mutated neither tenant. The same real AppModule test also
retains anonymous export `401`, valid Tenant B owner export `200`, and Tenant B
session on Tenant A Host export/import `403` assertions.

## Fresh Gate Evidence

| Gate                         | Exact command                                                                                                                                                                                                                                                                                                 | Exit | Classification      | Result                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---: | ------------------- | -------------------------------------------------------- |
| Doorbell e2e                 | `pnpm --filter api test:e2e -- import-export-tenant-isolation.e2e-spec.ts`                                                                                                                                                                                                                                    |    0 | PASS WITH CONDITION | 1 suite, 1 test passed; forged-file runtime proof passed |
| Focused unit/processor tests | `pnpm --filter api test -- --runInBand import-export clientes-csv-import`                                                                                                                                                                                                                                     |    0 | PASS                | 2 suites, 8 tests passed                                 |
| API build                    | `pnpm --filter api build`                                                                                                                                                                                                                                                                                     |    0 | PASS                | Nest build completed                                     |
| API lint                     | `pnpm --filter api lint`                                                                                                                                                                                                                                                                                      |    0 | PASS                | ESLint completed                                         |
| SDD validator                | `pnpm sdd:validate`                                                                                                                                                                                                                                                                                           |    0 | PASS                | CRM-SDD governance validation passed                     |
| Design validator             | `pnpm sdd:validate:design -- "openspec/changes/SPEC-0031-import-export-platform/design.md"`                                                                                                                                                                                                                   |    0 | PASS                | Canonical Design shape and Working Set structure passed  |
| Applicable Prettier          | `pnpm exec prettier --check "apps/api/test/doorbell/import-export-tenant-isolation.e2e-spec.ts" "openspec/changes/SPEC-0031-import-export-platform/design.md" "openspec/changes/SPEC-0031-import-export-platform/tasks.md" "openspec/changes/SPEC-0031-import-export-platform/verify-direct-fix-recovery.md"` |    0 | PASS                | All matched files formatted                              |
| Whitespace                   | `git diff --check`                                                                                                                                                                                                                                                                                            |    0 | PASS                | No whitespace errors                                     |

## Acceptance Evidence

| Acceptance area                                                                                        | Evidence                                                                                                                      | Status |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------ |
| Exact RFC-4180 header, CSV quoting, and formula neutralization                                         | Focused service suite passed; parser/export implementation inspected                                                          | PASS   |
| Sole target, full validation, reject-only duplicates, serializable atomic batch, and bounded retention | Focused processor suite passed; definition/processor/contracts inspected                                                      | PASS   |
| Jobs trusted context, worker tenant recheck, upload-buffer clearing, and audit-before-delivery         | Focused suite passed; service, processor, Jobs, and Audit implementation inspected                                            | PASS   |
| Guarded Host/session/org/membership/capability authority                                               | Controller and identity guard inspection; real HTTP doorbell assertions passed                                                | PASS   |
| Tenant isolation, including forged uploaded tenant value                                               | Actual seven-column forged Tenant A value sent with Tenant B Host/session; precise 400 and unchanged Tenant A/B counts passed | PASS   |
| Existing assertions                                                                                    | Anonymous 401, valid owner export, cross-tenant export denial, and cross-tenant import denial remain in the passing doorbell  | PASS   |
| Boundaries                                                                                             | Exact 16-path Working Set; legacy importer removed; Reporting, schema/migrations, UI, and composition exclusions preserved    | PASS   |

## Conditions and Baseline Debt

### CONDITION

- The fresh passing doorbell again emitted Jest's post-completion open-handle
  warning. Assertions passed and the command exited 0. This is the recorded
  non-blocking runtime condition, not a Verify failure.

### BASELINE_DEBT

- No fresh broader suite was required for this bounded Verify. The preserved
  Apply/previous-Verify evidence records `pnpm test` exit 1 from unrelated API
  suites lacking `DATABASE_URL` and an unrelated tenant-web
  `calendar-picker.test.tsx` assertion. It is outside the 16-path Working Set,
  reproducibly unrelated, and remains BASELINE_DEBT under the canonical rule.

## Verdict and Canonical Next Action

**PASS.** The approved Design, Tasks, implementation, tenant-isolation proof,
and required fresh evidence agree. Per `docs/SDD-WORKFLOW.md` §102–105, the
canonical next action is **Archive**. Stop after this Verify; Archive and later
phases were not started.
