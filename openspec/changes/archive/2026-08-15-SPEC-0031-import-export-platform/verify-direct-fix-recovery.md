# Verify Direct Fix Recovery: SPEC-0031 — VERIFY-003

```yaml
schema: crm-master.verify-direct-fix-recovery/v1
status: PASS
change: SPEC-0031-import-export-platform
phase: Verify recovery evidence
authorization: HUMAN-authorized exactly one bounded Direct Fix
scope: VERIFY-003 only
working_set_paths: 1
unexpected_code_paths: []
production_defect: none
canonical_next: fresh HIGH Verify
```

## Authorization and boundary

HUMAN authorized one bounded Direct Fix recovery after the second BLOCKED Verify
result, limited to the missing VERIFY-003 real-HTTP doorbell proof. The approved
Design, Tasks, prior Verify report, and existing Apply 7.6 evidence remain
unchanged. No production path, unrelated active change, Git state, Design, Tasks,
review, or workload artifact was modified.

## Implemented proof

Changed only:

- `apps/api/test/doorbell/import-export-tenant-isolation.e2e-spec.ts`

The existing AppModule, Host, session, organization, membership, and capability
harness is retained. The test now sends this actual client-supplied file value:

```csv
nombre,tipo_negocio,estado_relacion,salud,tags,creado,tenantId
Forged,Retail,Activo,🟢,,,00000000-0000-0000-0000-000000000131
```

The forged `tenantId` targets Tenant A while the authoritative request uses
Tenant B Host and the Tenant B owner session. The real HTTP endpoint rejects the
file with `400` and `Invalid clientes-csv-v1 header`; counts for both Tenant A
and Tenant B are captured before and after and remain equal. Existing assertions
remain for anonymous `401`, valid owner export, Tenant-B-session-on-Tenant-A-Host
export denial, and cross-tenant import denial.

## Production finding

No production defect was exposed. The current implementation already rejects the
forged file field before enqueue or mutation: `parseClientesCsv` requires the
exact six-column header and therefore fails closed before `JobsClient.enqueue`.
The processor and controller were not changed.

## RED → GREEN → REFACTOR evidence

1. **RED:** Added the real forged `tenantId` CSV column while retaining the old
   success-oriented assertion. The focused doorbell failed because the endpoint
   returned `400`, proving the payload exercised the implementation rather than
   being a label-only scenario.
2. **GREEN:** Changed the assertion to the precise `400` contract, asserted the
   exact validation message, and asserted no client-count change in either
   tenant. The focused doorbell passed.
3. **REFACTOR:** Extracted the forged CSV into a named payload constant, renamed
   the scenario to identify the proof, and formatted the approved test file.
   The focused doorbell and formatting check passed again.

## Gate evidence

| Gate                   | Command                                                                                          | Result                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Focused doorbell       | `pnpm --filter api test:e2e -- import-export-tenant-isolation.e2e-spec.ts`                       | PASS — 1 suite, 1 test; existing Jest open-handle warning after completion |
| Focused unit/processor | `pnpm --filter api test -- --runInBand import-export clientes-csv-import`                        | PASS — 2 suites, 8 tests                                                   |
| API build              | `pnpm --filter api build`                                                                        | PASS                                                                       |
| API lint               | `pnpm --filter api lint`                                                                         | PASS                                                                       |
| SDD validator          | `pnpm sdd:validate`                                                                              | PASS                                                                       |
| Prettier               | `pnpm exec prettier --check "apps/api/test/doorbell/import-export-tenant-isolation.e2e-spec.ts"` | PASS                                                                       |
| Whitespace             | `git diff --check`                                                                               | PASS                                                                       |

The open-handle warning is a non-blocking pre-existing runtime condition also
recorded by the prior Verify evidence; assertions and process exit were
successful. No additional failure was classified as BASELINE_DEBT in this
bounded recovery.

## Handoff

This artifact records recovery evidence only. It does not claim Verify PASS.
Return to the canonical checkpoint for **one fresh HIGH / ARCHITECT Verify** of
VERIFY-003 and the complete change. Do not start Archive or any later phase from
this recovery artifact alone.
