# SDD Platform Infrastructure

> Environment verification, fallback telemetry, platform health, and
> maintenance policy for the SDD workflow platform.

---

## 1. Environment Verification

Executed before **any** SDD workflow phase begins. The orchestrator performs
these checks and reports a structured result.

### Checks

| # | Check | Method | Severity |
|---|-------|--------|----------|
| 1 | OpenCode version | `opencode --version` (expect >= 1.18) | WARNING |
| 2 | Available models | `opencode models` (confirm all SDD models present) | WARNING |
| 3 | Provider connectivity | Prompt cache response | INFO |
| 4 | Agent registry | Check opencode.json for `gentle-orchestrator` + all `sdd-*` agents | ERROR |
| 5 | Template files | Check `~/.config/opencode/prompts/sdd/sdd-{phase}.md` exists for design, apply, verify, archive | ERROR |
| 6 | Project documentation | Check AGENTS.md, PROJECT.md, ADR directory | INFO |
| 7 | Workflow documentation | Check SDD-WORKFLOW.md version >= 2.0 | WARNING |

### Severity Classification

| Severity | Effect | Action |
|----------|--------|--------|
| **ERROR** | Blocks workflow | Must be fixed before proceeding |
| **WARNING** | Does not block | Reported to user, logged |
| **INFO** | Informational | Logged only |

### Result Format

```
## Environment Verification

| Check | Status | Detail |
|-------|--------|--------|
| OpenCode Version | PASS | v1.18.3 |
| Models | PASS | 42 available |
| Provider | INFO | default provider |
| Agent Registry | PASS | 19 agents configured |
| Templates | PASS | 8/8 templates exist |
| Project Docs | INFO | all present |
| Workflow Docs | PASS | v2.0 |

Result: PASS
```

---

## 2. Fallback Policy

### Levels

```
Level 1: Configured model (from opencode.json)
Level 2: opencode-go/deepseek-v4-flash (default coding model)
Level 3: general agent (for sdd-apply phases only)
```

### Telemetry Record

Every fallback produces a structured record:

```
Phase: sdd-<phase>
Configured: <configured_model>
Resolved: <resolved_model_or_agent>
Fallback: true
Reason: <why the configured model could not be loaded>
OpenCode Version: <version>
Provider: <provider_prefix>
Variant: <variant_name or "default">
Timestamp: <ISO-8601>
```

### Propagation

The telemetry record must appear in:

| Location | Format |
|----------|--------|
| Apply return summary | Markdown section (only if fallback occurred) |
| Archive JSON | `environment.fallback_used` + `environment.fallback_reason` |
| Archive Learning | Under "Unexpected Dependencies" when fallback changed the executor |

---

## 3. SDD Doctor

### Command

```
/sdd-doctor
```

Runs a read-only audit of the complete SDD environment and returns a
structured health report.

### Report Sections

| Section | Content |
|---------|---------|
| Environment | OpenCode version, provider, model count, prompt cache |
| Agents | Configured agents, missing agents, invalid models, fallback risks |
| Templates | Presence of all 8 SDD template files |
| Documentation | Project docs, workflow docs, architecture docs |
| Feature Support | Working Set, Read Order, Learning, JSON, etc. |
| Overall Health | Healthy / Healthy with Warnings / Degraded / Broken |

### Health Levels

| Level | Meaning | Action |
|-------|---------|--------|
| **Healthy** | All checks pass | No action needed |
| **Healthy with Warnings** | Non-blocking issues exist | Review warnings at convenience |
| **Degraded** | Non-critical checks failing | Fix before next feature implementation |
| **Broken** | Critical checks failing | Stop all work, fix immediately |

---

## 4. JSON Artifact

The archive JSON artifact now includes an `environment` object:

```json
{
  "working_set_accuracy": 85,
  "design_confidence": "High",
  "verify_iterations": 1,
  "planned_files": [],
  "actual_files": [],
  "unexpected_files": [],
  "unexpected_dependencies": [],
  "future_recommendations": [],
  "environment": {
    "opencode_version": "1.18.3",
    "provider": "opencode-go",
    "prompt_cache": true,
    "fallback_used": false,
    "fallback_reason": "",
    "configured_model": "opencode-go/deepseek-v4-flash",
    "resolved_model": "opencode-go/deepseek-v4-flash"
  }
}
```

The `environment` object is mandatory. `fallback_used` defaults to `false`.
When a fallback occurs during any SDD phase, set it to `true` and populate
`fallback_reason` with the telemetry reason.

---

## 5. Platform Stability Policy

The SDD platform is now considered **feature-complete**.

From this point forward:

1. **New SDD capabilities require evidence.** Proposals for new workflow
   phases or template sections must cite measurable improvements from
   historical metrics (Working Set Accuracy, Verify iterations, etc.).

2. **Process changes require recurring observations.** A single incident
   does not justify a workflow change. Changes must be supported by
   patterns observed across at least 3 implementations.

3. **Prefer Design quality over new phases.** Most exploration waste
   originates from incomplete Working Sets or low Design Confidence.
   Improving prediction quality is cheaper than adding new gates.

4. **Prefer reduction over complexity.** When choosing between adding a
   new workflow check and simplifying an existing one, choose simplicity.

5. **Keep the workflow measurable but minimal.** Every phase and every
   template section must earn its place through demonstrated impact on
   output quality.

---

## 6. Observational Metrics

Two purely observational metrics extend Verify and Archive without modifying
the SDD workflow itself. They exist only to improve historical learning.

### 6.1 Verify Discoveries

**Purpose**: Measure how many meaningful findings Verify contributed beyond Apply.

**Definition**: A discovery is any issue found during Verify that required a code
change, documentation correction, additional verification, or revealed a
production/runtime/architectural issue or unexpected dependency.

**Classification**:

| Severity | Criteria | Examples |
|----------|----------|----------|
| Critical | Production blocker, security issue, data leak | auth bypass, cross-tenant leak, build failure |
| Major | Behavioral gap, spec deviation, missing coverage | untested scenario, API contract mismatch |
| Minor | Documentation fix, non-blocking observation | comment typo, minor refactor suggestion |

**Formula**: Count of issues per severity, summed as total.

**Interpretation**:
- **High total with Critical discoveries** → Design quality is insufficient; Review and Design phases need strengthening.
- **High total but only Minor discoveries** → Design was good; Verify is adding polishing value.
- **Zero discoveries** → Verify added no value, OR the implementation was trivial.
- **Trend increasing over time** → Design quality is degrading.

### 6.2 Prediction Accuracy

**Purpose**: Measure how accurately the Design predicted reality across all
dimensions — files, tests, commands, dependencies.

**Definition**: For each category, compare the Design's prediction against what
actually happened during Apply.

**Formula**:

```
Category Accuracy = min(Predicted, Actual) / max(Predicted, Actual) × 100
Overall Accuracy = average of all category accuracies
```

Use `null` when a category was not predicted (e.g., no commands in Design).

**Interpretation**:
- **100%** → Design was perfectly accurate.
- **70-99%** → Design was good but had minor misses.
- **50-69%** → Design significantly over/under-predicted; Working Set needs improvement.
- **<50%** → Design quality is poor; review the Design phase process.
- **Recurring misses in the same category** → That category needs more attention in future Designs.

### 6.3 Historical Trends

These metrics are observational only. They should be reviewed via `/sdd-metrics`
after approximately 20 implementations to detect trends:

| Signal | Action |
|--------|--------|
| Verify Discoveries increasing | Strengthen Design phase (Working Set, Read Order) |
| Prediction Accuracy declining | Add more detail to Design predictions |
| Consistent Critical discoveries | Review architecture decision process |
| Consistent Minor discoveries | Healthy process — Verify is catching the right things |

## 7. Metrics Collector

### Command

```
/sdd-metrics
```

Reads every archive JSON artifact, aggregates historical metrics, and prints
a consolidated report. Read-only — never modifies files.

### Purpose

The Metrics Collector enables data-driven decisions about SDD workflow quality.
It is **not part of the mandatory SDD workflow** — it is an offline analysis
tool intended for periodic review.

### When to Run

The collector is most useful after approximately **20 completed implementations**
have accumulated enough JSON artifacts to produce statistically meaningful
aggregates. Running it earlier (as in the initial state) will show mostly
`N/A` values because only v2.0+ archives include structured metrics.

### Collected Metrics

| Metric | Source | Type |
|--------|--------|------|
| Working Set Accuracy | JSON artifact | Numeric (%) |
| Working Set Efficiency | JSON artifact | Planned vs Actual files |
| Design Confidence | JSON artifact | Categorical (High/Medium/Low) |
| Verify Iterations | JSON artifact | Numeric |
| Unexpected Files | JSON artifact | Frequency |
| Unexpected Dependencies | JSON artifact | Frequency |
| Fallback Usage | JSON artifact | Boolean |
| Environment Info | JSON artifact | Version, provider |

### Hotspot Detection

The collector automatically identifies:

- Most frequent unexpected files
- Most frequent unexpected dependencies
- Average repository searches
- Average files read
- Highest exploration budgets

### Future Compatibility

The collector is schema-driven: it reads whatever fields exist in the JSON
artifacts. Adding a new field to `sdd-archive.md`'s JSON template
automatically makes it collectable — no changes to the collector itself.

### Known Limitation

Archives created before SDD v2.0 (before the JSON artifact was introduced)
do not contain structured metrics. The collector reports them as `N/A`
or `Not captured`.

---

## 7. SDD v2.1 Feature Freeze

A partir del merge de este commit, la plataforma SDD se declara

**FEATURE FROZEN**

No se añadirán nuevas fases, prompts, agentes, comandos, ni métricas
al workflow SDD salvo que `/sdd-metrics` lo justifique con evidencia
histórica recurrente (mínimo 20 implementaciones).

Preferir mejorar la calidad del Design sobre añadir nuevas fases.
Preferir reducir exploración sobre aumentar complejidad de orquestación.

---

## 8. References

- `docs/SDD-WORKFLOW.md` — full workflow documentation (v2.0+)
- `docs/architecture/module-composition.md` — NestJS module composition standard
- `AGENTS.md` — project conventions and model assignment table
- `.ai/context/PROJECT.md` — project context for agents
- `~/.config/opencode/opencode.json` — agent and model configuration
- `~/.config/opencode/prompts/sdd/` — SDD phase prompt templates
- `~/.config/opencode/commands/sdd-doctor.md` — SDD Doctor command
- `~/.config/opencode/commands/sdd-metrics.md` — SDD Metrics Collector command
