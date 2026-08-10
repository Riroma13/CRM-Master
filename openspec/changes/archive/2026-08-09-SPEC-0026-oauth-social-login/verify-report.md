```yaml
schema: gentle-ai.verify-result/v1
status: VERIFIED_WITH_CONDITION
decision: VERIFIED
evidence_revision: sha256:8fdcf9351aa75367f184e6dccd9605c5c4e5820206c4434e816a6b8bea5a406b
verdict: pass_with_baseline_debt
blockers: 0
critical_findings: 0
requirements: 0/0
scenarios: 0/0
security_gates: 6/6
test_command: pnpm test
test_exit_code: 1
test_output_hash: sha256:88a824bb3f94b839c9288f797e9063797e2b47d25679c7e2a13c5f91b25a6ae6
build_command: pnpm turbo build
build_exit_code: 0
build_output_hash: sha256:ff67ab5ef2b7fe891680317cf05eff24ab58444412d991c088cd8a04f6487c95
next_recommended: sdd-archive
```

# Verification Report

**Change**: SPEC-0026-oauth-social-login  
**Mode**: Strict TDD  
**Model**: openai/gpt-5.6-terra

## Final Bounded Adjudication

The maintainer's explicit no-regression baseline rule applies. `pnpm test` is red, but the complete failure classification identifies 12 API failure groups / 69 failed tests and one tenant-web CalendarPicker failure outside SPEC-0026; focused security, identity, and doorbell evidence is green. No SPEC-0026 causal regression or missing SPEC-specific evidence remains.

## Completeness

| Metric | Value |
|---|---:|
| Tasks total | 16 |
| Tasks complete | 16 |
| Tasks incomplete | 0 |
| Delta spec requirements | 0/0 — no delta spec artifact exists |
| Delta spec scenarios | 0/0 — no delta spec artifact exists |
| Security acceptance gates | 6/6 compliant |

## Verification Evidence Preimage

```text
change=SPEC-0026-oauth-social-login
mode=strict-tdd
test_command=pnpm test
test_exit_code=1
test_output_hash=sha256:88a824bb3f94b839c9288f797e9063797e2b47d25679c7e2a13c5f91b25a6ae6
build_command=pnpm turbo build
build_exit_code=0
build_output_hash=sha256:ff67ab5ef2b7fe891680317cf05eff24ab58444412d991c088cd8a04f6487c95
lint_command=pnpm lint
lint_exit_code=0
lint_output_hash=sha256:d4a406bcc3523a94d326e86993b9b3632715a501f6e37c069cfba4037e734dc0
focused_auth_identity_command=pnpm --filter api test -- auth.spec.ts identity-integration.spec.ts
focused_auth_identity_exit_code=0
focused_auth_identity_output_hash=sha256:2987c08ba2e0256112eae53898f03375d3b9a0a9c0cce3a23959e5d5c6a2fd29
doorbell_command=pnpm --filter api test:e2e -- isolation-http.spec.ts
doorbell_exit_code=0
doorbell_output_hash=sha256:8cce2e03c3fe2ce107b0ed4d3c0bee7f3082c1d53de622978c35897869e8bba9
```

The SHA-256 of the exact text above is `8fdcf9351aa75367f184e6dccd9605c5c4e5820206c4434e816a6b8bea5a406b`.

## Current Command Evidence

| Command | Exit | Result | Exact output SHA-256 |
|---|---:|---|---|
| `pnpm test` | 1 | Baseline debt only: API 12 failed suites / 69 failed tests; tenant-web 184/185 with CalendarPicker click failure. | `88a824bb3f94b839c9288f797e9063797e2b47d25679c7e2a13c5f91b25a6ae6` |
| `pnpm --filter api test -- auth.spec.ts identity-integration.spec.ts` | 0 | 2 suites, 37/37 passed. | `2987c08ba2e0256112eae53898f03375d3b9a0a9c0cce3a23959e5d5c6a2fd29` |
| `pnpm --filter api test:e2e -- isolation-http.spec.ts` | 0 | 1 suite, 4/4 passed. | `8cce2e03c3fe2ce107b0ed4d3c0bee7f3082c1d53de622978c35897869e8bba9` |
| `pnpm turbo build` | 0 | 3/3 build tasks passed. | `ff67ab5ef2b7fe891680317cf05eff24ab58444412d991c088cd8a04f6487c95` |
| `pnpm lint` | 0 | 5/5 lint tasks passed. | `d4a406bcc3523a94d326e86993b9b3632715a501f6e37c069cfba4037e734dc0` |
| `git diff --check` | 0 | Passed. | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

## Security Compliance Matrix

| Requirement | Runtime/static evidence | Result |
|---|---|---|
| Exact fail-closed origin gate; no parsed-state access | `/callback/:id` hook admits only exact configured origins and rejects missing, wildcard, and foreign origins; focused tests pass. | ✅ COMPLIANT |
| Supported lifecycle rejection only | `databaseHooks` reject unsupported account/session writes without transaction, manual write, recursion, or cleanup. | ✅ COMPLIANT |
| Opaque session then Host → tenant → organization → membership | Guard resolves the opaque session before `hostTenantId` or tenant data; identity tests and doorbell pass. | ✅ COMPLIANT |
| No callback/lifecycle helper wiring | Production scan finds no runtime `validateOAuthCallback`, `linkOAuthAccount`, or callback-context resolver. | ✅ COMPLIANT |
| One unchanged canonical Better Auth mount | `main.ts` has exactly one `app.use('/api/auth', toNodeHandler(auth));`. | ✅ COMPLIANT |
| Explicit Google linking policy | `allowDifferentEmails:false`, `requireLocalEmailVerified:true`, `disableImplicitLinking:true`, Google `disableImplicitSignUp:true`, and Google `disableImplicitLinking:true` are configured and covered. | ✅ COMPLIANT |

## Design Coherence

| Decision | Followed? | Evidence |
|---|---|---|
| Supported Better Auth boundaries only | ✅ Yes | Pre-callback origin hook, lifecycle hooks, and post-redirect guard only. |
| Host is sole tenant authority | ✅ Yes | Callback context is not consumed; guard rejects alternate context before tenant data. |
| Canonical mount remains unwrapped | ✅ Yes | Source inspection and structural test. |
| Explicit Google linking policy | ✅ Yes | All required linking controls are configured and focused-tested. |

### TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD evidence reported | ✅ | Apply receipt #957 contains six behavior rows. |
| All correction behaviors have tests | ✅ | 6/6 rows map to the three scoped test files. |
| RED confirmed | ✅ | 6/6 rows contain literal `✅ Written RED`; the test files exist. |
| GREEN confirmed | ✅ | Focused auth/identity is 37/37; doorbell is 4/4. |
| Triangulation adequate | ✅ | Distinct origin, lifecycle, opaque-session, and Host-isolation cases. |
| Safety net documentation | ⚠️ | Receipt has no per-file Safety Net column; non-blocking documentation gap. |

**TDD Compliance**: 5/6 checks passed; no TDD evidence gap blocks this bounded adjudication.

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|---|---:|---:|---|
| Unit/configuration | 14 | 1 | Jest |
| Integration/guard | 23 | 1 | Jest |
| HTTP doorbell | 4 | 1 | Jest + Supertest |
| **Total** | **41** | **3** | |

### Changed File Coverage

Coverage analysis skipped — no current coverage command was provided; informational only.

### Assertion Quality

**Assertion quality**: ✅ All scoped assertions verify real behavior; no tautology, ghost loop, unexercised production path, smoke-only test, or mock-heavy violation found.

## Baseline Debt — Complete Canonical Failure Classification

| Exact failing suite/group | Classification | Reproducible cause |
|---|---|---|
| `documentos.service.spec.ts` | Pre-existing/infrastructure | `ActivityTimelineService` DI dependency absent from the test module. |
| `citas.service.spec.ts` | Pre-existing/infrastructure | `ActivityTimelineService` DI/database test setup failure. |
| `citas/local-calendar-provider.spec.ts` | Pre-existing/infrastructure | Missing `DATABASE_URL` during Prisma initialization. |
| Reporting: `replay`, `export`, `report-engine`, `kpi-engine`, `dashboard-engine`, `reconciliation`, `dashboard-hydrator`, `snapshot` | Pre-existing/infrastructure | Incomplete Prisma test mock: `this.prisma.forReporting is not a function`. |
| `tenant-email.module.spec.ts` | Pre-existing/infrastructure | Missing `REDIS_URL` for Activity Timeline BullMQ bootstrap. |
| tenant-web `calendar-picker.test.tsx` click day 15 | Unrelated/date-sensitive | `CalendarPicker > calls onSelect when a day is clicked`: expected one call, received zero; calendar-only behavior, outside changed files and security contract. |

**Classification result**: 12/12 API failure groups / 69 failed API tests and the single CalendarPicker failure are reproducibly outside SPEC-0026. They neither touch the approved security contract nor show a causal regression from the change.

## Adjudication Decisions

1. **May SPEC-0026 pass with red `pnpm test`?** **Yes.** Under the maintainer's no-regression baseline rule, the complete classification proves the non-zero aggregate is baseline debt and focused SPEC evidence is green.
2. **Are all remaining failures baseline debt?** **Yes.** The exact classifications above preserve all remaining canonical failures; none is attributable to SPEC-0026.
3. **Is SPEC-0026-specific evidence missing?** **No.** The six security gates, 37/37 auth/identity tests, 4/4 doorbell tests, build, lint, diff check, source boundaries, and strict-TDD receipt are sufficient.

## Findings

**SPEC findings**: None.  
**Baseline debt**: The classified aggregate test failures above remain repository debt and are excluded from this change's acceptance decision.  
**Warning**: Per-file Safety Net evidence is documentation-incomplete but non-blocking.

## Final Verdict

**PASS_WITH_BASELINE_DEBT** — SPEC-0026 is accepted. Archive → Health Report → Repository Ready is authorized. `next_recommended: sdd-archive`.
