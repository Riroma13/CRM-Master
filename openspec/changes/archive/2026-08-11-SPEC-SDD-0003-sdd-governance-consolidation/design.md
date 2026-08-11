# Design: SPEC-SDD-0003 — SDD Governance Consolidation

> **Status:** Draft — recovered maintenance Design.
> **Working document.** This records and verifies recovered governance edits; it does not alter the CRM-SDD pipeline.
> Lifecycle semantics remain exclusively in `docs/SDD-WORKFLOW.md`.

## 1. Executive Summary

This one-time maintenance change supplies the missing canonical Design for the recovered CRM-Master governance consolidation. The recovered edits already establish project-local Direct wiring, a sole semantic workflow authority, hybrid persistence, and deterministic validators. This Design verifies that evidence only; it proposes no product behavior, runtime change, or replacement lifecycle.

## 2. Technical Approach

Use the recovered 54-file governance migration as the fixed evidence boundary. Validate the existing local contracts and record their owners, repeat-run behavior, and exclusions. No Apply work is authorized by this Design.

The canonical repository artifact remains the exact record; Engram may retain a bounded status summary only. `AGENTS.md` governs entry and safety, while `docs/SDD-WORKFLOW.md` alone governs transitions and gate meaning.

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
| --- | --- | --- | --- |
| Evidence scope | Rebuild; document recovered edits | Document and validate recovered edits | Recovery prohibits broad rediscovery and product changes. |
| Lifecycle authority | Adapter/map/template; workflow | `docs/SDD-WORKFLOW.md` only | The validator enforces one semantic authority. |
| Persistence | OpenSpec only; Engram only; hybrid | Hybrid | Exact artifacts stay in the change directory; Engram is bounded context. |
| Protected work | Inspect/reconcile; exclude | Exclude SPEC-0028 | It is user-owned protected work with a recorded SHA-256 invariant. |

## 4. Data Flow

```text
Recovered governance files -> local validators -> design evidence -> Architecture Review
       |                         |                     |
       +-- excluded product/SPEC-0028/global paths ------+
```

Happy path: validators read only the approved governance files and return PASS. Failure path: a missing contract, authority conflict, or protected-path request stops at the current gate; it does not trigger product inspection or lifecycle redefinition.

## 5. Working Set

**Working Set total: 54.** This is a reconciled evidence boundary, not a request to modify the listed files: **33 tracked governance modifications + 21 untracked project-local governance files**. Maintenance evidence files, including this Design, are excluded from the 54.

### 5.1 Primary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `.ai/context/PROJECT.md` | Verify existing | Recovery/context boundary. |
| 2 | `.ai/context/SESSION.md` | Verify existing | Recovery/context boundary. |
| 3 | `.ai/context/DECISIONS.md` | Verify existing | Recovery/context boundary. |
| 4 | `.ai/context/KNOWN_ISSUES.md` | Verify existing | Recovery/context boundary. |
| 5 | `.ai/context/ROADMAP.md` | Verify existing | Recovery/context boundary. |
| 6 | `AGENTS.md` | Verify existing | Startup/safety authority. |
| 7 | `docs/SDD-WORKFLOW.md` | Verify existing | Sole lifecycle semantics. |
| 8 | `docs/sdd-workflow-guard.md` | Verify existing | Compatibility boundary. |
| 9 | `docs/SDD-MODEL-ASSIGNMENTS.md` | Verify existing | Historical boundary. |
| 10 | `docs/architecture/sdd-direct.md` | Verify existing | Execution adapter. |
| 11 | `docs/architecture/sdd-infrastructure.md` | Verify existing | Execution adapter. |
| 12 | `docs/architecture/platform-baseline.md` | Verify existing | Project context. |
| 13 | `docs/architecture/CHANGELOG.md` | Verify existing | Historical boundary. |
| 14 | `docs/architecture/archive/adr-0021-sdd-v3-stable-release.md` | Verify existing | Historical classification. |
| 15 | `docs/architecture/archive/sdd-v3-roadmap.md` | Verify existing | Historical classification. |
| 16 | `docs/architecture/archive/sdd-v3.0-release-notes.md` | Verify existing | Historical classification. |
| 17 | `docs/templates/README.md` | Verify existing | Template boundary. |
| 18 | `docs/templates/apply-summary-template.md` | Verify existing | Template boundary. |
| 19 | `docs/templates/architecture-review-prompt.md` | Verify existing | Historical prompt boundary. |
| 20 | `docs/templates/design-enterprise-template.md` | Verify existing | Canonical Design shape. |
| 21 | `docs/templates/design-refinement-prompt.md` | Verify existing | Historical prompt boundary. |
| 22 | `docs/templates/tasks-prompt.md` | Verify existing | Historical prompt boundary. |
| 23 | `docs/templates/tasks-refinement-prompt.md` | Verify existing | Historical prompt boundary. |
| 24 | `docs/templates/tasks-review-prompt.md` | Verify existing | Historical prompt boundary. |
| 25 | `docs/templates/terminal-gates-template.md` | Verify existing | Template boundary. |
| 26 | `openspec/config.yaml` | Verify existing | Local map pointer only. |
| 27 | `package.json` | Verify existing | Validator entry points. |
| 28 | `scripts/validate-sdd-direct.mjs` | Verify existing | Governance contract validator. |
| 29 | `scripts/validate-enterprise-design.mjs` | Verify existing | Design pre-gate validator. |
| 30 | `.opencode/agents/sdd-direct-architecture-review.md` | Verify existing | Recovered Direct adapter. |
| 31 | `.opencode/agents/sdd-direct-design.md` | Verify existing | Recovered Direct adapter. |
| 32 | `.opencode/agents/sdd-direct-orchestrator.md` | Verify existing | Recovered Direct adapter. |
| 33 | `.opencode/agents/sdd-direct-verify.md` | Verify existing | Recovered Direct adapter. |

**Primary count: 33.** Braced paths are expanded only by their stated cardinality.

### 5.2 Secondary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `.opencode/sdd-model-map.json` | Verify existing | Sole concrete role and agent mapping. |
| 2 | `opencode.json` | Verify existing | Project-local global-agent isolation. |
| 3 | `.opencode/agents/sdd-direct-apply.md` | Verify existing | Recovered Direct adapter. |
| 4 | `.opencode/agents/sdd-direct-archive.md` | Verify existing | Recovered Direct adapter. |
| 5 | `.opencode/agents/sdd-direct-health-report.md` | Verify existing | Recovered Direct adapter. |
| 6 | `.opencode/agents/sdd-direct-repository-ready.md` | Verify existing | Recovered Direct adapter. |
| 7 | `.opencode/agents/sdd-direct-tasks.md` | Verify existing | Recovered Direct adapter. |
| 8 | `.opencode/agents/sdd-direct-tasks-review.md` | Verify existing | Recovered Direct adapter. |
| 9 | `.opencode/commands/sdd-direct.md` | Verify existing | Sole local lifecycle entry point. |
| 10 | `.opencode/commands/sdd-apply.md` | Verify existing | STOP-only compatibility stub. |
| 11 | `.opencode/commands/sdd-archive.md` | Verify existing | STOP-only compatibility stub. |
| 12 | `.opencode/commands/sdd-continue.md` | Verify existing | STOP-only compatibility stub. |
| 13 | `.opencode/commands/sdd-doctor.md` | Verify existing | STOP-only compatibility stub. |
| 14 | `.opencode/commands/sdd-explore.md` | Verify existing | STOP-only compatibility stub. |
| 15 | `.opencode/commands/sdd-ff.md` | Verify existing | STOP-only compatibility stub. |
| 16 | `.opencode/commands/sdd-init.md` | Verify existing | STOP-only compatibility stub. |
| 17 | `.opencode/commands/sdd-metrics.md` | Verify existing | STOP-only compatibility stub. |
| 18 | `.opencode/commands/sdd-new.md` | Verify existing | STOP-only compatibility stub. |
| 19 | `.opencode/commands/sdd-onboard.md` | Verify existing | STOP-only compatibility stub. |
| 20 | `.opencode/commands/sdd-status.md` | Verify existing | STOP-only compatibility stub. |
| 21 | `.opencode/commands/sdd-verify.md` | Verify existing | STOP-only compatibility stub. |

**Secondary count: 21.** The 21-file untracked set is accepted by the Architecture Review scope adjudication; it is reconciled by role and cardinality without using Git state or treating maintenance evidence as implementation.

### 5.3 Expected NOT to Change

- `openspec/changes/SPEC-0028-jobs-background-processing-platform/` — protected user work; do not read, modify, or hash during this action.
- `apps/`, `packages/`, Prisma/schema, and product tests — product scope is excluded.
- `~/.config/opencode/**` and Git state — external/maintainer-controlled.
- `openspec/changes/SPEC-SDD-0003-sdd-governance-consolidation/{recovery,architecture-review,health-report,repository-ready}.md` — maintenance evidence is not migration implementation.

## 6. Read Order

1. `AGENTS.md` and project context — authority, recovery, and protected boundaries.
2. `recovery.md` — approved checkpoint and initial bounded read order.
3. `architecture-review.md` — missing-Design blocker and 54-file adjudication.
4. `docs/SDD-WORKFLOW.md` — legal next transition and hybrid contract.
5. `docs/templates/design-enterprise-template.md` — required artifact shape.
6. Validator scripts, `package.json`, model map, and Direct adapter — only facts required for contracts and pre-gate.

## 7. Expected Commands

```bash
pnpm sdd:validate:design -- openspec/changes/SPEC-SDD-0003-sdd-governance-consolidation/design.md  # Design pre-gate
pnpm sdd:validate  # later governance contract evidence; not a lifecycle transition
```

## 8. Design Confidence

**Confidence:** High

The recovered boundary, Architecture Review adjudication, local contracts, and Design validator are direct evidence. The known prior file-count-table contradiction is explicitly contained: this Design uses the approved 33 + 21 = 54 reconciliation and does not normalize prior maintenance evidence.

## 9. Exploration Budget

| Resource | Budget | Notes |
| --- | --- | --- |
| Repo searches | 0 | No broad discovery. |
| Files to read | 16 | Recovery, review, authorities, contracts, and validators only. |
| Files to create | 1 | This canonical Design only. |
| Files to modify | 0 | Recovered governance edits remain untouched. |

## 10. Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Scope creep into product or SPEC-0028 | Low | High | Explicit exclusions; validator rejects SPEC-0028 Design input. |
| Competing workflow meaning | Low | High | Enforce sole semantic authority with `sdd:validate`. |
| Miscounting evidence as migration | Med | Med | Maintain 33 + 21 reconciliation; exclude maintenance evidence. |
| Validator drift | Low | Med | Run deterministic pre-gate before review. |

## 11. Testing Strategy

| Layer | Focus | Approach |
| --- | --- | --- |
| Unit | Design shape | `sdd:validate:design` checks 18 sections, A–G, decisions, and Working Set numbering. |
| Integration | Governance contracts | `sdd:validate` checks authority, roles, local wiring, hybrid persistence, and Git gates. |
| Regression | Protection boundary | Confirm the Design names SPEC-0028 as excluded; do not inspect it. |
| E2E | Product behavior | N/A — product scope is excluded. |

## 12. Doorbell Tests

| Test file | What it proves |
| --- | --- |
| N/A | No tenant data path, schema, endpoint, or product test changes exist. |

## 13. Required ADRs

| ADR | Reason | Status |
| --- | --- | --- |
| None | This records an authorized governance migration; it changes no schema, data policy, or product architecture. | Not required |

## 14. Boundaries

| Boundary | Owner | Purpose |
| --- | --- | --- |
| Lifecycle semantics | `docs/SDD-WORKFLOW.md` | Defines phases, gates, and transitions only. |
| Startup/safety | `AGENTS.md` | Governs recovery, scope, roles, and maintainer Git boundary. |
| Local execution | Direct adapter, command, and model map | Wires local executors without semantic authority. |
| Exact evidence | OpenSpec change directory | Canonical phase artifacts. |
| Durable context | Engram | Bounded context; cannot override repository artifacts. |

## 15. Extensibility

| Future feature | How it fits | Effort |
| --- | --- | --- |
| New product SPEC | Starts at canonical Design using this unchanged workflow | Per SPEC |
| New local executor | Add only through the model-map/validator contract and a separately approved governance change | Separate change |

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× | 100× | Mitigation |
| --- | --- | --- | --- |
| Governance files | Linear reads | Linear reads | Validators read a bounded fixed set. |
| Product data | N/A | N/A | Excluded. |

**Decision:** Keep validation bounded to fixed governance files.

**Rationale:** No runtime traffic or tenant data is processed.

**Alternative:** Repository-wide scans; rejected as recovery scope creep.

**Future impact:** Add a file only through an approved governance change.

### B. Open/Closed Principle (OCP)

**Point of extension:** `.opencode/sdd-model-map.json` plus validator expectations.

**What must change to add one more:** An approved governance change updates the map, local adapter, and validator together.

**Decision:** Use explicit local mapping, not implicit global routing.

**Rationale:** It makes additions reviewable and deterministic.

**Alternative:** Global agent inheritance; rejected by isolation boundary.

**Future impact:** Extensions cannot silently redefine lifecycle semantics.

### C. Ownership

| Data / Capability | Owner | Consumers |
| --- | --- | --- |
| Lifecycle semantics | `SDD-WORKFLOW.md` | Direct wiring and all phase executors |
| Exact Design evidence | OpenSpec change directory | Architecture Review |
| Role bindings | local model map | Direct command/agents and validator |

**Decision:** Keep authority, wiring, and evidence separate.

**Rationale:** The validator can detect competing ownership.

**Alternative:** A consolidated adapter authority; rejected as semantic duplication.

**Future impact:** Reviewers can locate each contract without inference.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
| --- | --- | --- | --- |
| Maintenance evidence | Repository lifecycle | Canonical Archive phase | Maintainer-controlled only |
| Engram status context | Durable bounded context | N/A | Per memory lifecycle policy |

**Decision:** Retain exact evidence in OpenSpec; keep only bounded context in Engram.

**Rationale:** Hybrid persistence separates artifact truth from recall.

**Alternative:** A second Design store; rejected.

**Future impact:** Archive remains the canonical retention transition.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
| --- | --- | --- | --- |
| Design pre-gate | No state mutation | Deterministic read/check | FAIL with exact finding |
| Governance validator | No state mutation | Deterministic fixed assertions | FAIL; stop at gate |

**Decision:** Validators are repeatable read-only checks.

**Rationale:** Re-running evidence must not change governance or Git state.

**Alternative:** Auto-repair validator; rejected.

**Future impact:** Failures remain auditable without side effects.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
| --- | --- | --- | --- |
| Lifecycle/roles | workflow + model map | Direct agents/validator | Governance maintainers |
| Design shape | Enterprise template | Design validator/review | Template maintainer |
| Hybrid evidence | workflow | OpenSpec/Engram users | Workflow authority |

**Decision:** Use repository-local, explicit contracts.

**Rationale:** No frontend/backend or product API contract exists here.

**Alternative:** Global prompt contracts; rejected as external and non-authoritative.

**Future impact:** Contract changes require their own governed evidence.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
| --- | --- | --- |
| Tenant | N/A | No tenant data is read or written. |
| Time | Low | Maintenance evidence follows canonical archive. |
| Volume | Low | Fixed bounded validator input set. |

**Decision:** No tenant or data partitioning applies.

**Rationale:** Product/runtime, schema, and tests are excluded.

**Alternative:** Treat governance files as tenant data; rejected as category error.

**Future impact:** Any product data work must design partitioning in its own SPEC.

## 16. Interfaces / Contracts

```text
Workflow contract: docs/SDD-WORKFLOW.md is the sole semantic authority.
Execution contract: /sdd-direct <change-name> resolves only local Direct agents through .opencode/sdd-model-map.json.
Persistence contract: exact artifacts -> openspec/changes/<change-name>/; bounded context -> Engram; neither store defines transitions.
Validation contract: pnpm sdd:validate:design -- <repo-relative-design-path> returns PASS only for the canonical 18-section/A–G shape; SPEC-0028 input is rejected without read.
Isolation contract: protected SPEC-0028, product/runtime, global configuration, and Git operations are outside this change.
```

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
| --- | --- | --- | --- |
| 1 | Preserve recovered governance edits; create this evidence-only Design. | Misclassification | Stop and escalate; do not rewrite recovered files. |
| 2 | Run the Design pre-gate. | Shape failure | Correct this Design within the one Design correction budget. |
| 3 | Fresh Architecture Review after PASS. | Material finding | Follow the canonical Design Refinement edge only if BLOCKED. |

No deployment, schema migration, feature flag, or product rollout is required.

## 18. Open Questions

| # | Question | Status | Resolution |
| --- | --- | --- | --- |
| 1 | Is a Design now present for fresh review? | Resolved | This artifact is the canonical Design. |
| 2 | Does this redefine CRM-SDD semantics? | Resolved | No; the workflow remains sole semantic authority. |
| 3 | Is the prior Repository Ready arithmetic corrected here? | Resolved | No; it remains maintenance-evidence ownership and is excluded from migration implementation. |

---

> **End of document.** It does not modify the pipeline, prompts, or workflow.
