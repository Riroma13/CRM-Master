# Design: SPEC-0026 — OAuth Social Login
> **Status:** Draft · **Verdict:** READY_FOR_ARCHITECTURE_REVIEW  
> **Scope:** Google OAuth for existing admins; no client/connector OAuth, schema, migration, Caddy, or `app.module.ts`.

## 1. Executive Summary
Google OAuth uses Better Auth 1.6.23 without CRM provisioning. Host membership is tenant authority.

## 2. Technical Approach
Mount Better Auth at `api.crmmaster.com/api/auth/*` unchanged. Better Auth 1.6.23 owns its atomic `/callback/:id` transaction (state parse, code exchange, account/user/session, cookie, redirect); CRM uses only the supported pre-callback hook, database lifecycle admission, and post-redirect boundaries. Claims and callback state never select tenant.

## 3. Architecture Decisions
| Decision | Options | Chosen | Rationale |
|---|---|---|---|
| Provider | Google/all | Google | Verified email, least surface. |
| Link | implicit/explicit | Explicit, no signup | Prevent takeover. |
| Authority | claims/Host+membership | Host+membership | Fail closed. |
| Session | token/BA | Better Auth | Reuse `ba_sessions`. |
| Callback integration | wrapper/fork/supported hooks + redirect boundary | Supported boundaries only | State is unavailable to supported hooks; a wrapper would duplicate or race BA's atomic handler. |
| Lifecycle admission | callback transaction/database hooks | `databaseHooks` reject their own writes only | Hooks receive lifecycle data/context and can return `false`, but cannot recreate a post-state/pre-exchange transaction. |

## 4. Data Flow
`/login → BA social sign-in → Google → hooks.before origin gate → BA /callback/:id → databaseHooks admission → opaque BA session/cookie → canonical tenant origin → Host → organization → membership → protected access`.

`hooks.before` admits `/callback/:id` only from the exact configured origin allowlist and fails closed; it runs before `parseState` and cannot read parsed OAuth state. `databaseHooks.account.create.before` and `session.create.before` use only their exposed lifecycle `data` and context (configuration/base URL/headers) to admit or reject their respective writes by returning `false`; they neither receive parsed state nor form a replacement transaction. After redirect, the first protected request resolves the canonical opaque Better Auth cookie/session, then `Host → tenant → betterAuthOrganizationId → membership`; any missing, inactive, mismatched, invalid, or unauthorized value denies access before tenant data. No callback state is re-read after BA handles it.

## 5. Working Set
### 5.1 Primary Files
| Files | Action |
|---|---|
| `apps/api/src/common/auth.ts`, `.env.example` | Modify |
| `apps/tenant-web/src/app/login/login-form.tsx`, `src/lib/auth.ts`, `src/middleware.ts`, `package.json` | Modify |
### 5.2 Secondary Files
| Files | Action |
|---|---|
| `apps/api/src/common/auth-client.provider.ts`, `common/guards/better-auth.guard.ts`, `modules/identity/identity-organization.guard.ts` | Modify |
| `apps/api/src/common/auth.spec.ts` | Modify |
| `apps/api/src/modules/identity/__tests__/identity-integration.spec.ts`, `apps/api/test/doorbell/isolation-http.spec.ts`, `apps/tenant-web/e2e/login.spec.ts` | Modify |
### 5.3 Expected NOT to Change
Schema/migrations, integration/client-auth/portal modules: existing BA tables suffice.

## 6. Read Order
1. Auth/main/env/Caddy. 2. Adapter/guards/tests. 3. Login/middleware/E2E.

## 7. Expected Commands
Auth/identity/doorbell tests; tenant E2E; lint/build.

## 8. Design Confidence
**High:** Better Auth 1.6.23 extension boundaries are evidenced; cookie and protected-request proof remains an execution gate.

## 9. Exploration Budget
| Resource | Budget | Notes |
|---|---:|---|
| Searches/reads | 8 / 22 | Working Set. |
| Create/modify | 1 / 13 | Section 5. |

## 10. Risks
| Risk | Mitigation |
|---|---|
| Cookie divergence | Disabled until E2E. |
| Callback-state misuse | Keep it inside BA; hooks never claim state access. |
| Cross-tenant | Host→org→membership doorbell. |

## 11. Testing Strategy
| Layer | RED coverage |
|---|---|
| Unit | Exact `/callback/:id` origin gate; account/session lifecycle rejection returns `false` using only exposed data/context; policy retains explicit Google linking, no implicit signup/linking, no different-email linking, and local-email verification. |
| Integration | BA callback remains mounted unchanged; lifecycle rejection leaves no admitted write; invalid opaque cookie denies. |
| E2E | Redirect then protected tenant access; no state re-read, callback wrapper, or cleanup. |
| Doorbell | OAuth A denied on B Host. |
| Regression | Admin-password bearer, client login, OAuth session, legacy/BA cookie compatibility. |

## 12. Doorbell Tests
`isolation-http.spec.ts`: A cannot access B. `identity-integration.spec.ts`: absent Host/org denies.

## 13. Required ADRs
Consult existing Better Auth identity/session ADR; new ADR only for schema/policy change.

## 14. Boundaries
| Owner | Purpose |
|---|---|
| Better Auth | Protocol/accounts/sessions; never tenant. |
| `apps/api/src/common/auth.ts` | Better Auth config, `hooks.before`, and `databaseHooks` only; no callback override/wrapper. |
| `apps/api/src/main.ts` | Keeps `app.use('/api/auth', toNodeHandler(auth));` unchanged and exactly once. |
| Login UI | Initiate; no secrets/codes. |
| Host + identity guard | Tenant/org/membership authorization. |

## 15. Extensibility
GitHub/Microsoft needs reviewed tests; client social login needs a SPEC.

## Architecture Review Preparation (MANDATORY)
### A. Scalability
10×/100× linear indexed rows. **Decision:** reuse; **why:** no tenant store; **alternative:** custom; **future:** monitor.
### B. Open/Closed Principle
Extension: `socialProviders`. **Decision:** config; **why:** no forks; **alternative:** controllers.
### C. Ownership
BA owns accounts/sessions; Identity memberships. **Decision:** no claims; **alternative:** mapping.
### D. Data Retention
Existing lifetime/cascade; no token logs. **Decision:** no copy; **alternative:** audit copy.
### E. Idempotency
State/PKCE/uniqueness reject replay. **Decision:** BA; **alternative:** custom.
### F. Shared Contracts
API owns returns/outcomes. **Decision:** no duplicate secrets; **alternative:** registry.
### G. Partitioning Strategy
Global identities, scoped access. **Decision:** no partition; **alternative:** tenant accounts.

## 16. Interfaces / Contracts
Google only. `hooks.before` guarantees only exact-origin admission for `/callback/:id`; malformed, absent, wildcard, or foreign origins fail closed, and parsed state is unavailable. `databaseHooks.account.create.before` and `session.create.before` use only their exposed `data` and context (configuration/base URL/headers) and return `false` to reject their respective write. They preserve explicit Google linking only: no implicit signup/linking, no different-email linking, local-email verification, `disableImplicitLinking: true`, and Google `disableImplicitSignUp: true`; neither can validate BA's parsed state or create a callback transaction.

`validateOAuthCallback` is removed from required callback wiring: it has no valid production callback-state input under this integration. It may be retained only as a pure application-owned helper for already-verified non-callback context. `linkOAuthAccount` is likewise removed from callback/lifecycle wiring and may be retained only if repurposed as a pure application-owned helper outside that path; manual Better Auth account mutation is never a fallback. Neither helper may receive or infer callback state, issue nested/manual account writes, recurse, or compensate with cleanup. No cross-tenant linking or account takeover is permitted. Post-redirect authorization uses canonical opaque cookie/session semantics and `IdentityOrganizationGuard` (`Host → tenant → organization → membership`) before tenant data.

## 17. Migration Strategy
No migration. `apps/api/src/main.ts` preserves `app.use('/api/auth', toNodeHandler(auth));` before JSON/controllers, without endpoint override, wrapper, handler fork, recursive helper call, or compensating cleanup. Production uses opaque `__Secure-better-auth.session_token`; the adapter/guards validate cookie or bearer. Deploy disabled; enable only after origin and protected-access proof; rollback disables social.

## 18. Open Questions
| Condition | Resolution |
|---|---|
| 1.6.23 supported-boundary proof | **Resolved design:** hooks/lifecycle/post-redirect only; RED proof required before enablement. |
| Production/preview origins | Maintainer supplies explicit allowlist; no wildcard return. |

## Threat Matrix
| Boundary | Applicability | Response / RED |
|---|---|---|
| Documentation paths | N/A — no executable classification | None |
| Git selection | N/A — no VCS integration | None |
| Commit/push/PR | N/A — no automation | None |

## Immediate Delta Architecture Review Checks
1. Confirm `hooks.before` is an exact, fail-closed `/callback/:id` origin gate and makes no parsed-state claim.
2. Confirm lifecycle hooks only abort supported writes while preserving the full account-linking policy.
3. Confirm `main.ts` mounts canonical `toNodeHandler(auth)` unchanged; no helper is callback-wired.
4. Confirm opaque-session post-redirect `Host → tenant → organization → membership` denies before tenant access.

**Acceptance:** Disabled by default; password/client unchanged; no implicit link/provision; no callback override/state re-read; tenant checks fail closed; RED passes.
