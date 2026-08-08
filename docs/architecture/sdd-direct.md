# SDD-Direct Architecture

> Project-local, opt-in execution mode for CRM-Master.

## Authority

SDD-Direct has one canonical active artifact store:
`openspec/changes/<change-name>/`. Design, reviews, tasks, Apply evidence,
Verify, Archive, Health Report, and Repository Ready artifacts are read and
written there. The archive convention remains under `openspec/changes/`.
SDD-Direct never creates a second store such as `docs/sdd-direct/changes/`.

Direct does not invoke or consult Gentle-AI, its dispatcher, the native review
lifecycle, or native workflow state. Those states are irrelevant to Direct.
The existing legacy/Gentle-AI behavior and global configuration remain
untouched. Direct is selected only through the project-local command and
project-local Direct agents.

## Direct Preflight

Direct preflight is the first Direct step, owned by
`sdd-direct-orchestrator`, before Design or any phase execution. It is a
repository-owned prerequisite check and is not authoritative over workflow
transitions; the Workflow Guard remains the sole transition authority. It
verifies only:

- canonical workflow files exist;
- the retained four-agent set exists;
- Direct command routing is valid;
- the validator is available;
- the active SPEC path is valid under `openspec/changes/<change-name>/`.

The required sequencing is:

```text
Direct preflight -> Design
```

Preflight does not depend on Gentle-AI, legacy agents, provider or model state,
or historical lifecycle metadata.

## Decision Model

The approved Design is the primary reasoning and specification authority. It
must preserve the existing 18-section Enterprise Design Standard without
changing or duplicating its templates. Architecture Review and Tasks Review
classify findings as `BLOCKER`, `CONDITION`, or `NON-BLOCKING`:

- `BLOCKER` is the only classification that permits the matching refinement
  and repeat review.
- `CONDITION` -> continue after recording the condition and owner.
- `NON-BLOCKING` -> continue without refinement.
- Resolved findings are closed; they are not reopened without new evidence.

## Automatic Flow

```text
Design → Architecture Review → Design Refinement only on BLOCKER → Tasks → Tasks Review → Tasks Refinement only on BLOCKER → Workload Guard → Apply 1–5 → Apply Summary → Verify → Archive → Health Report → Repository Ready → STOP.
```

After an approved Tasks Review, Workload Guard and the remaining non-destructive
phases execute automatically. Direct stops at Repository Ready. Commit, Push,
Merge, Release, and Tag are manual maintainer-controlled destructive gates and
are never performed by Direct agents.

The normal `Verify → Archive` transition requires a `VERIFIED` Verify result.
When Verify is blocked, the legal recovery loop is:

```text
Verify BLOCKED -> orchestrator-owned Direct Fix -> Verify
```

Direct Fix is an orchestrator-owned repair mode, not an agent or phase agent.
It changes only what is necessary to resolve the concrete Verify blocker. The
approved Design and Tasks remain unchanged unless the blocker proves a real
contract inconsistency. Control returns to Verify after repair; Archive, Health
Report, and Repository Ready are forbidden while Verify is `BLOCKED`.

## Agent Routing

| Direct agent | Logical role | Phase ownership |
|---|---|---|
| `sdd-direct-orchestrator` | orchestration/implementation | Direct preflight, phase determination, Tasks generation, Tasks Review logic, Tasks Refinement (patch-only on BLOCKER), orchestrator-owned Direct Fix repair mode, Workload Guard, automatic progression, Apply coordination/dispatch and ownership, Apply Summary, Archive, Health Report, Repository Ready |
| `sdd-direct-design` | high-reasoning | repository exploration, architecture, contracts, security, migrations, Working Set, Read Order, acceptance criteria, Design Refinement (patch-only on BLOCKER) |
| `sdd-direct-architecture-review` | high-reasoning | validates approved Design for real blockers; does not redesign |
| `sdd-direct-verify` | high-reasoning | final validation against Design, Tasks, implementation, tests, evidence |

Role contract: the Direct orchestrator owns orchestration/implementation and
Apply routing; Design, Architecture Review, and Verify use high-reasoning. The
economical evidence/mechanical role is bounded support and does not own Apply.
Concrete model mappings live only in `docs/SDD-MODEL-ASSIGNMENTS.md` and the
OpenCode configuration (`~/.config/opencode/opencode.json`).
All Direct agents operate only on the canonical change directory and paths
declared by the current Working Set. Each returns a structured result in
English and records evidence in the canonical artifact store.

## Compatibility, Migration, and Rollback

Direct mode is additive. It does not reinterpret legacy state, alter existing
OpenSpec/Gentle-AI artifacts, or loosen product SDD/TDD rules. No migration is
required because the artifact location is the existing `openspec/changes/`
tree. To roll back Direct, remove its project-local agents, command,
documentation, and validator; leave all existing change and archive artifacts
untouched. SPEC-SDD-0002 is only a future Direct-mode pilot reference and is
not created, started, or modified by this implementation.
