# Delta Architecture Review: SPEC-0026 — OAuth Social Login

## Result
- **Status:** complete
- **Verdict:** APPROVED_WITH_CONDITIONS
- **Effective owner/model:** `sdd-architecture-review` / `openai/gpt-5.6-terra`
- **Scope:** Better Auth callback-boundary refinement only. All prior non-delta Design and Tasks decisions remain unchanged.

## Executive Summary
The refined design is valid: Better Auth owns the atomic OAuth callback and CRM must use only supported pre-callback, lifecycle, and post-redirect boundaries. The checked-in recovery work still contains obsolete callback-state/manual-linking code; it is an Apply correction, not a reason to reopen the Design or Tasks.

## Authoritative Evidence Statement
Engram observation **#996**, “Better Auth 1.6.23 extension points for SPEC-0026 mounted handler,” is authoritative. In 1.6.23 `/callback/:id` is atomic: `parseState` → authorization-code exchange → provider user info → account/user handling → session/cookie → redirect. `hooks.before` runs before `parseState`; `databaseHooks` run only for their own writes. No supported hook receives parsed state at the post-parse/pre-exchange point. Wrapper, override, fork, or reimplementation is rejected.

## Delta Verification
| Boundary | Verdict | Mandatory guarantee / evidence |
|---|---|---|
| Pre-callback | Pass with condition | `hooks.before` gates only `/callback/:id` against an exact configured origin allowlist. Missing, malformed, wildcard, and foreign origins reject before Better Auth; it MUST NOT read, decode, persist, or validate parsed state. |
| Lifecycle | Pass with condition | `databaseHooks.account.create.before` and `session.create.before` may fail closed by returning `false` for their own writes using exposed lifecycle data/context only. They MUST NOT establish a callback transaction, select a tenant, or perform nested/manual account writes. |
| Post-callback | Pass | Before any tenant data, canonical opaque Better Auth cookie/session resolves, then immutable Host → tenant → `betterAuthOrganizationId` → active membership is verified. Any absent, invalid, inactive, or mismatched value denies access. |
| Mount/config ownership | Pass | `apps/api/src/main.ts` has exactly one unchanged `app.use('/api/auth', toNodeHandler(auth));`. `apps/api/src/common/auth.ts` owns configuration and supported hooks only. |
| Helper disposition | Apply correction | `validateOAuthCallback` has no valid callback-state input and `linkOAuthAccount` manually writes Better Auth records. Remove both from callback/lifecycle wiring; retain only a genuinely application-owned pure helper outside that path, otherwise delete as dead code. |
| Scope | Pass | No production implementation, tests, Tasks, schema/migration, Caddy, or unrelated Design decision is changed by this review. Existing Tasks callback-state/manual-linking wiring is obsolete and must be corrected during Apply, not edited here. |

## Conditions for Apply
1. Preserve explicit Google linking only: no implicit signup, no implicit linking, no different-email linking, and require local-email verification; reject lifecycle writes fail closed.
2. Replace callback-state/manual-linking behavior with supported origin/lifecycle boundaries only. No state input may be invented after `hooks.before`.
3. Remove the runtime `oauthCallbackContext` / `resolveCallbackTenantContext` bridge so Host remains the only tenant authority.
4. Demonstrate RED then GREEN evidence for origin rejection, lifecycle rejection without admitted writes, unchanged single mount, opaque-session rejection, and cross-tenant Host denial before tenant data.

## Concrete Risks
- Assigning state validation to a hook that cannot observe parsed state creates a false security guarantee.
- Calling `linkOAuthAccount` from an account hook can recurse or duplicate Better Auth writes.
- Permitting callback-derived tenant context bypasses Host-derived tenant authority.

## Exact Scoped Apply Correction for Luna
**Allowed files/symbols:**
- `apps/api/src/common/auth.ts`: `createAuth`; supported `hooks.before` and `databaseHooks`; delete or isolate `validateOAuthCallback`, `OAuthCallbackInput`, `linkOAuthAccount`, and `OAuthLinkInput` from all callback/lifecycle runtime paths.
- `apps/api/src/common/auth.spec.ts`: replace obsolete helper/manual-write coverage with focused RED boundary tests.
- `apps/api/src/modules/identity/identity-organization.guard.ts`: remove `oauthCallbackContext` and `resolveCallbackTenantContext` bridge.
- `apps/api/src/modules/identity/identity.contracts.ts`: remove callback-state tenant-context types/resolver made dead by that bridge.
- Focused existing identity/auth/doorbell tests only where needed to prove Host → tenant → organization → membership before tenant data.

**Forbidden files/symbols:** `apps/api/src/main.ts`; Prisma schema/migrations; Caddy; Proposal, Spec, Design, Tasks, Apply, Verify, and unrelated review artifacts; any callback wrapper/override/fork; callback-state tenant selection; `validateOAuthCallback` or `linkOAuthAccount` as callback/database-hook wiring; recursion, nested/manual account writes, or compensating cleanup.

## Stop Condition
Stop when the allowed correction and focused RED/GREEN proof meet every Apply condition. If completion requires parsed OAuth state after `hooks.before`, callback replacement, schema change, or any forbidden file/symbol, stop and report **BLOCKED**; do not broaden scope.
