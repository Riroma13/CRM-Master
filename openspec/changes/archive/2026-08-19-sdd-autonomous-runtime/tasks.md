# Tasks: sdd-autonomous-runtime

## Review Workload Forecast
Estimated changed lines: 900–1,300; 400-line budget risk: High. Chained PRs recommended: Yes. Delivery: force-chained, stacked-to-main. Standing policy authorizes this cohesive chain; true exceptions remain HUMAN.

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

| Unit | Autonomous scope; base → finish | Focused RED/GREEN command | Harness | Independent rollback |
|---|---|---|---|---|
| PR1 | Runtime contract, identity, blocker policy, trace/state, routing; `main` → unit contracts pass | `node --test scripts/sdd-runtime.test.mjs` | N/A: pure Node tests; inline/temporary fixtures only | Remove runtime and unit changes |
| PR2 | Direct/Resume wiring, agents, map, validator, package script; PR1 → wiring/validator pass | `pnpm sdd:validate && pnpm test:sdd-resume` | N/A: subprocess spy; no external service | Revert wiring/map/validator changes; retain PR1 |
| PR3 | E2E, docs, regression and generated execution evidence; PR2 → full gates pass | `node --test scripts/sdd-runtime.integration.test.mjs scripts/sdd-runtime.e2e.test.mjs` | Conditional only for an approved existing API suite; otherwise N/A, with reason recorded | Disable autonomous loop; preserve artifacts and cold manual recovery |

## Exact Working Set and Read Order
Working Set: `scripts/sdd-runtime.mjs`, `scripts/sdd-runtime.test.mjs`, `scripts/sdd-runtime.integration.test.mjs`, `scripts/sdd-runtime.e2e.test.mjs`, `.opencode/agents/sdd-direct-orchestrator.md`, `.opencode/sdd-model-map.json`, `scripts/sdd-resume.mjs`, `scripts/sdd-resume.test.mjs`, `scripts/validate-sdd-direct.mjs`, `.opencode/commands/sdd-direct.md`, `.opencode/commands/sdd-resume.md`, `.opencode/agents/sdd-direct-{design,architecture-review,tasks,tasks-review,apply,verify,archive,health-report,repository-ready}.md`, `docs/architecture/sdd-infrastructure.md`, `package.json`, and generated execution output `openspec/changes/sdd-autonomous-runtime/.sdd-runtime/state.json`, `openspec/changes/sdd-autonomous-runtime/.sdd-runtime/trace/<sequence>-<eventHash>.json`. Fixtures stay inline/temporary in approved tests; no fixture path is approved.

Read Order: workflow; Resume script/tests; Direct/Resume commands; orchestrator then phase agents; model map and `opencode.json`; Direct and Design validators plus infrastructure doc; config, package, compose and cited harness evidence.

## RED → GREEN → REFACTOR
1. **RED (depends: approved Design and PASS Architecture Review):** Name failing tests `canonical-root-and-relative-escape`, `staged-and-empty-index`, `commit-request`, `push-and-ref-variants`, `merge-rebase-release-deploy-tag-direct-main`, and `composed-and-explicit-pr-forms`; every Git/PR case rejects before subprocess. Also name blocker-class-total, human-required-mismatch, unknown/missing, malformed, fatal, trace corruption/gap/duplicate/state-ahead, context counters, branch/Working Set/ambiguity, fallback/exhaustion, and workload policy/exception tests. Checkpoint: all applicable threats are RED.
2. **GREEN (depends: 1):** Implement runtime contracts, fail-closed identity/blocker/trace reconciliation, deterministic transitions, counters, same-role capability/cost fallback, migration recovery, Git barrier, and autonomous dispatch. Wire every Working Set adapter and produce AC-01–AC-15 evidence: lifecycle/recovery, no rebootstrap, pure selection, four AC-06 classes, recoverable blocker, routing, workload, Git handoff, scope, unsafe state, and validators.
3. **REFACTOR (depends: 2):** Remove duplicated inference, centralize redacted diagnostics, preserve idempotency and exact trace evidence; run runtime tests, `pnpm test:sdd-resume`, `pnpm sdd:validate`, and `pnpm sdd:validate:design -- openspec/changes/sdd-autonomous-runtime/design.md`. Checkpoint: no Git mutation, no tenant/product path (tenant isolation N/A; prove Working Set contains none), and disposable harness is never skipped when required.

## Canonical Next Action
Submit only this artifact to **Tasks Review**. Do not start Workload Guard or Apply until fresh Tasks Review PASS.
