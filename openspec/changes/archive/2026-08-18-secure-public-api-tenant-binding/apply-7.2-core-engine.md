# Apply 7.2 Core Engine Evidence

> Nested Apply: 7.2 Core Engine
> Status: PASS — trusted request contract consumed by route handlers
> Executor: MID / BUILDER — project-local Direct wiring

## Boundary and evidence

The approved core contract is the guard-written `request.tenantId` and
`request.apiTokenTenantId`. No new persistence or shared type was required.
The persisted `ApiKey.tenantId` remains the sole authority; scoped services are
called with that value.

| Stage | Evidence | Result |
|---|---|---|
| RED | Controller tests without caller selectors received `undefined` tenant; document null reached mapper with 500 | PASS |
| GREEN | Both controllers consume trusted request tenant; document null becomes `NotFoundException` before mapping | PASS |
| TRIANGULATE | Workflow/document list and get routes cover non-empty success and resource-miss paths | PASS |
| REFACTOR | Removed duplicate query authority while retaining filters and guard order | PASS |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `pnpm --filter api test -- v1-workflows.controller v1-documents.controller` — 2 suites / 14 tests passed |
| Runtime harness | N/A for controller unit boundary; integration and doorbell evidence is downstream |
| Rollback boundary | Revert only the two v1 controllers and their named suites |

## Tenant isolation

An A token with a B selector is denied before controller/service; an A token
with a foreign resource ID reaches A-scoped lookup and returns 404. The mapper
never receives a null document.

## Files / deviations

Changed only the two controllers and their named tests. No secondary files,
dependencies, schema, document service, or mapper changes.

## Canonical next action

Apply 7.3 Feature Implementation only.
