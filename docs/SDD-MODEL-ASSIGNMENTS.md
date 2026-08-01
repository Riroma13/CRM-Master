# SDD Model Assignments — CRM-Master

> Status: Active operating brief
> Updated: 2026-07-28

This brief records the current concrete assignments for the provider-independent
roles defined in `AGENTS.md` and `docs/architecture/sdd-direct.md`.

## Current Assignments

| Logical role | Current configured model | Agents |
|---|---|---|
| orchestration/implementation | `openai/gpt-5.6-luna` | `sdd-orchestrator`, `sdd-tasks`, `sdd-tasks-review`, `sdd-apply`, `sdd-archive`, `sdd-health`, `sdd-repository-ready` |
| high-reasoning | `openai/gpt-5.6-terra` | `sdd-design`, `sdd-architecture-review`, `sdd-verify` |
| economical evidence/mechanical | LongCat intended for bounded support | No current agent binding |

LongCat is the intended bounded-support mapping, but no LongCat-specific agent
binding is currently present in `~/.config/opencode/opencode.json`. It must never
become the default Apply route.

## Default Apply Route

```text
continue with Apply -> sdd-apply -> openai/gpt-5.6-luna
```

## Configuration Source

Concrete assignments are sourced from `~/.config/opencode/opencode.json`.
Restart OpenCode after changing that file so agent mappings are reloaded.
