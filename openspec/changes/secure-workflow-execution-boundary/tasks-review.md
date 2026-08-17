# Tasks Review: Secure Workflow Execution Boundary

> **Normalized result:** BLOCKED
> **Executor:** MID / BUILDER — `sdd-direct-tasks-review`
> **Model binding:** `openai/gpt-5.6-luna` (`.opencode/sdd-model-map.json`)
> **Persistence:** hybrid; this file is the exact Tasks Review artifact.

## Scope and evidence boundary

Reviewed the approved `design.md`, newly created `tasks.md`, canonical
`docs/SDD-WORKFLOW.md`, project-local Direct adapter, model map, and the
previous PASS Architecture Review. No production source, Design, tasks, or Git
state was modified. Review remained bounded to the approved workflow security
change and its declared Working Set/Read Order.

## Findings

| ID | Status | Finding | Evidence | Required action |
|---|---|---|---|---|
| TR-01 | BLOCKED | The task artifact does not preserve the Design's exact Read Order. It compresses eight ordered file entries into category labels (`permissions map/guard`, `controller/app`, etc.), losing the concrete paths and the explicit `index.ts`/executor and named test boundaries required for recovery. | `design.md:81-90`; `tasks.md:47-51`; `docs/SDD-WORKFLOW.md:160-171` | Restore the exact eight ordered entries and concrete paths. Keep the Working Set path set identical to `design.md` and retain its exclusions. |
| TR-02 | BLOCKED | RED-first is not actionable for all security paths. Task 1.4 combines “replace allow-all guards” (implementation) with test claims, and does not enumerate failing RED tests for every parse-before-side-effect operation. | `design.md:128-136,263-304`; `tasks.md:27-32` | Split 1.4 into explicit failing tests first, covering create, version, publish, start, and resume; production replacement must follow those RED tasks. |
| TR-03 | BLOCKED | The required full-route anonymous `403` contract is only named for create/publish/start. The tasks do not explicitly prove `403` before resource lookup/mutation for the complete route set, notably resume and the declared read/control paths. | `design.md:41,130-135,142-144,301-304`; `tasks.md:29,43-44` | Name every in-scope workflow endpoint and require global-first anonymous `403` with untouched resource/mutation spies, including resume, read, and control where applicable. |

## Satisfied checks

- Dependency direction is otherwise coherent: RED → bounded implementation →
  integration/evidence, with schema/context foundations before consumers.
- Owner and exact Identity `admin` same-tenant success, unauthorized-role
  denial, Host/org mismatch, forged `tenantId`, and A/B cross-tenant denial are
  represented; coverage must be made endpoint-complete under TR-03.
- Strict schema, legacy/expression rejection, bounded references, literal
  predicates, own-field lookup, and removal of dynamic execution are explicit.
- Acceptance checkpoints include no bypass/reorder, validation before effects,
  same-tenant lifecycle, and tenant-isolation evidence.
- Out-of-scope boundaries are preserved: plugins, systemic auth redesign,
  public API tenant binding, dependencies, infrastructure/Docker, Git-history
  cleanup, and credentials.

## Workload Guard consequence

The forecast remains **650–900 changed lines** and is not reduced or expanded.
It is High risk and correctly recommends chained delivery with
`stacked-to-main`. Because Tasks Review is BLOCKED, the Workload Guard does not
run yet. After a PASS Tasks Review, the canonical Workload Guard must record a
bounded above-400-line decision, and a HUMAN / MAINTAINER decision is required
before Apply; Apply cannot start while that decision is absent.

## Validator evidence

| Command | Exact result | Status |
|---|---|---|
| `pnpm sdd:validate` | `CRM-SDD governance validation: PASS` | PASS |
| `pnpm sdd:validate:design -- "openspec/changes/secure-workflow-execution-boundary/design.md"` | `Enterprise Design validation: PASS (openspec/changes/secure-workflow-execution-boundary/design.md)` | PASS |

These validators cover repository governance and Design shape; they do not
close the Tasks Review findings above.

## Canonical next action

**Tasks Refinement only**, owned by MID / BUILDER, followed by one fresh Tasks
Review. This is the single correction permitted by the canonical
`BLOCKED -> Tasks Refinement -> Tasks Review` edge. Do not start Apply or the
Workload Guard until the fresh Tasks Review is PASS.

---

## Fresh Tasks Review — after the single Tasks Refinement

> **Normalized result:** PASS
> **Executor:** MID / BUILDER — `sdd-direct-tasks-review`
> **Model binding:** `openai/gpt-5.6-luna` (`.opencode/sdd-model-map.json:13-16,33-36,55-57`)
> **Persistence:** hybrid; this file is the exact Tasks Review artifact.
> **Correction-loop state:** Initial Tasks Review BLOCKED → one Tasks Refinement → fresh Tasks Review PASS. The single Tasks Review correction budget is consumed; the PASS edge to Workload Guard is legal.

### Scope and evidence boundary

The refined `tasks.md` was reviewed against the approved `design.md`, the
fresh PASS Architecture Review, `docs/SDD-WORKFLOW.md`, the project-local Direct
adapter, and `.opencode/sdd-model-map.json`. The exact Design Working Set and
Read Order were consumed before this bounded review. No Design, Tasks,
production source, Apply state, unrelated change, or Git state was modified.

### Gate verdict

**PASS.** The refined Tasks artifact closes TR-01, TR-02, and TR-03. Its
dependencies are ordered RED → GREEN → integration/evidence, and all material
review criteria are explicit and traceable to the approved Design.

### Findings

No material findings remain.

### Satisfied checks

- **Working Set and Read Order:** `tasks.md:32-35` preserves the exact 19-file
  Design Working Set, its actions/exclusions, and all eight concrete ordered
  Read Order entries from `design.md:43-90`.
- **RED-first and dependency order:** `tasks.md:15-30` separates failing
  permission, context, schema, service/controller, and anonymous route tests
  from the later GREEN implementation phase.
- **Parse-before-side-effect:** `tasks.md:19,26,37-38` explicitly covers
  create, `version`/`createVersion`, publish, start, and resume before writes,
  status, audit, resource, or execution effects.
- **Anonymous full-route denial:** `tasks.md:20,29,38` names create, publish,
  start, resume, read, and control; each must be global-first `403` with
  untouched resource/mutation spies.
- **Authorized chain and tenant isolation:** `tasks.md:23-30,37-38` preserves
  canonical global permission → Host-derived tenant → Identity
  session/organization/membership → workflow context/resource authorization;
  it requires same-tenant owner/admin success and denial for unauthorized
  roles, forged `tenantId`, Host/org/session mismatch, and cross-tenant A/B
  access.
- **Runtime node safety:** `tasks.md:18,26,38` requires strict rejection of
  unknown, malformed, legacy, expression-bearing, invalid-reference, and
  over-bound definitions, plus own-field literal interpretation with no
  stored-JavaScript evaluation.
- **Out-of-scope boundaries:** `tasks.md:33` preserves the Design exclusions:
  schema/app module/middleware/global guard, frontends, plugins, infrastructure,
  dependencies, credentials, and Git; the implementation tasks explicitly
  preserve global guard order and do not authorize an auth redesign.

### Workload forecast and gate consequence

The refined forecast remains **650–900 changed lines** with **High** 400-line
risk. `tasks.md:3-7` records `Decision needed before apply: Yes`,
`Chained PRs recommended: Yes`, and `Chain strategy: feature-branch-chain`.
Because the forecast is above 400 lines, the next canonical action is the
Workload Guard. A **HUMAN / MAINTAINER decision is required after this PASS and
before Apply**; Apply must not start while that decision is absent. This review
does not start Workload Guard or Apply.

### Validator evidence

| Command | Exact result | Status |
|---|---|---|
| `pnpm sdd:validate` | `CRM-SDD governance validation: PASS` | PASS |
| `pnpm sdd:validate:design -- "openspec/changes/secure-workflow-execution-boundary/design.md"` | `Enterprise Design validation: PASS (openspec/changes/secure-workflow-execution-boundary/design.md)` | PASS |

These validators pass; they validate repository governance and Design shape,
while this artifact records the bounded semantic Tasks Review evidence.

### Canonical next action

**Workload Guard** — owned by the canonical workflow after this PASS. Record
the bounded above-400-line analysis and obtain the required HUMAN / MAINTAINER
chain decision before any Apply 7.1 work. Do not implement, modify Design or
Tasks, or perform Git lifecycle operations.
