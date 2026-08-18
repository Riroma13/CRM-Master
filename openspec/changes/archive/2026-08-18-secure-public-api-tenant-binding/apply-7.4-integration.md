# Apply 7.4 Integration Evidence

> Nested Apply: 7.4 Integration
> Status: PASS WITH BASELINE_DEBT — integration suites and compatibility checks complete
> Executor: MID / BUILDER — project-local Direct wiring

## Evidence

The named full-flow and scope suites passed after guard/controller integration.
The existing default-deny doorbell was not modified; its missing-token contract
remains represented by the approved existing test and the unit/integration
focused suites.

| Check | Exact result |
|---|---|
| Full-flow / scope | Included in 6-suite focused run: 47/47 passed |
| API lint | `pnpm --filter api lint` — PASS |
| API build | `pnpm --filter api build` — PASS |
| Design validator | `pnpm sdd:validate:design -- openspec/changes/secure-public-api-tenant-binding/design.md` — PASS |
| SDD validator | `pnpm sdd:validate` — PASS |
| Diff hygiene | `git diff --check` — PASS |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | 6 named suites / 47 tests passed |
| Runtime harness | Required doorbells are 7.5; unavailable due environment Redis authentication/startup timeout |
| Rollback boundary | Revert only approved public API tests and controller/guard changes |

## Baseline debt / deviation

The exact Tasks doorbell command cannot discover `apps/api/test/doorbell` under
the API unit Jest config (`roots: ["src"]`), so the bounded e2e config was used
for evidence. AppModule doorbell startup then timed out while BullMQ emitted
`NOAUTH Authentication required` from Redis. This is an external pre-existing
harness dependency failure, not a product-path failure; it blocks claiming the
doorbell acceptance gate.

No files outside the approved Working Set and canonical Apply artifacts were
changed. No dependency was added and no conditional secondary file was needed.

## Canonical next action

Apply 7.5 Testing; do not claim complete acceptance until the real HTTP doorbells run.
