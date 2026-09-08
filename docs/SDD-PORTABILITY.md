# SDD Portability Boundary

The portable SDD core is the proven lifecycle and its execution adapter:

`Design → Architecture Review → Tasks → Tasks Review → Workload Guard → Apply → Verify → Archive → Health Report → Repository Ready`

It includes HIGH/MID/LOW/HUMAN ownership, event-first persistence, deterministic
change resolution, Working Set/Read Order, correction budgets, required-gate
Verify semantics, fail-closed transitions, and the maintainer Git boundary.

## Project profile

The existing `.opencode/sdd-model-map.json` is the single SDD profile and role
mapping source. A consuming repository must provide:

```json
{
  "project": "sample-project",
  "project_profile": {
    "name": "Sample Project",
    "memory_key": "sample-project",
    "context_sources": ["AGENTS.md", "docs/PROJECT.md"],
    "invariant_sources": ["AGENTS.md"]
  }
}
```

`context_sources` and `invariant_sources` are relative repository paths. The
profile contains no secrets. Missing or malformed profile data fails closed;
the runtime never asks HUMAN for mechanically discoverable identity or context.
Role/model bindings and same-role routing remain in this same model map.
Do not create a second SDD profile in `openspec/config.yaml`; that file remains
the consuming repository's existing OpenSpec/configuration input and authority
fingerprint, not a competing identity source.

## Adoption sequence

1. Copy the project-local Direct command, agents, runtime, resolver, validators,
   workflow, adapter contract, templates, and runtime tests.
2. Replace the model-map project profile, role bindings, routing, and context
   references with the consuming repository's values.
3. Provide the consuming repository's own `AGENTS.md`, context, product
   invariants, OpenSpec config, and application files.
4. Run `pnpm sdd:validate` and `pnpm test:sdd-runtime`.
5. Start normal work with `/sdd-direct <change-name>`.

Do not copy CRM-Master's `.ai/context`, tenant/security rules, ADRs, roadmap,
product specs, application source, or historical artifacts as portable
requirements. They are project content, not SDD core behavior.

Repository Ready stops at the HUMAN-owned Commit, Push, Merge, release, and tag
boundary. The adapter never performs those Git operations.
