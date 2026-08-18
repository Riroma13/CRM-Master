# Apply 7.3 Feature Implementation Evidence

> Nested Apply: 7.3 Feature Implementation
> Status: PASS — public-v1 tenant binding behavior implemented
> Executor: MID / BUILDER — project-local Direct wiring

## Evidence

The feature correction is limited to public workflow/document v1 behavior:
trusted token authority, conflicting selector/Host denial, A-scoped resource
lookup, and document null-to-404 translation. Existing scope, quota, rate-limit,
revocation, and default-deny contracts were preserved.

| Stage | Command / result |
|---|---|
| RED | Cross-tenant regression changed from historical 200 to expected 403 and failed before guard implementation |
| GREEN | Focused public API matrix: 6 suites / 47 tests passed |
| REFACTOR | Re-ran focused matrix after removing caller authority; 6 suites / 47 tests passed |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `pnpm --filter api test -- public-api-cross-tenant-isolation token-auth.guard v1-workflows.controller v1-documents.controller public-api-full-flow public-api-scope-enforcement` — 6 suites / 47 tests passed |
| Runtime harness | Deferred to 7.5; unit/integration HTTP harness passes all named non-doorbell suites |
| Rollback boundary | Revert the four controller/regression test files plus the guard files from 7.1 |

## Files / deviations

Only approved primary files changed. No conditional secondary file or
dependency was required. No selector alias was discovered.

## Canonical next action

Apply 7.4 Integration only.
