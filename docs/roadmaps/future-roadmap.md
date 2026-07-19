# SDD Platform — Future Roadmap

> **Document type:** Informational
> **Status:** Pending review trigger
> **Last updated:** 2026-07-18

---

## Platform Status

| Field | Value |
|-------|-------|
| SDD Version | v2.1 |
| Status | **FEATURE FROZEN** |
| Baseline | Stable |
| Baseline Tag | `sdd-v2.1-baseline` |
| ADR | ADR-0004 |
| Automatic workflow modifications | **FORBIDDEN** |

Nothing in this document authorizes automatic modifications to the SDD platform.

---

## Review Trigger

A platform review is allowed only when **one** of the following conditions is met:

| Condition | Threshold |
|-----------|-----------|
| Archived implementations | ≥40 |
| Merged PRs executed using SDD v2.1 | ≥40 |

The trigger **opens a review only**. It must never modify prompts, agents, commands,
or workflow phases automatically. All changes require human approval via ADR.

---

## Review Procedure

### Step 1 — Collect Metrics

```bash
/sdd-metrics
```

### Step 2 — Review Historical Data

Analyze the aggregated report for:

- Working Set Accuracy trends
- Verify Discoveries frequency and severity
- Prediction Accuracy across all categories
- Recurring unexpected dependencies
- Exploration Budget compliance rate

### Step 3 — Identify Patterns

Only patterns occurring **repeatedly** (approximately ≥20% recurrence across
all implementations) may justify a platform proposal. A single incident or
outlier does not qualify.

### Step 4 — Propose (if warranted)

If a recurring pattern meets the threshold:

1. Create a new ADR documenting the proposed change, the evidence, and the
   expected improvement.
2. The ADR must reference specific metrics from `/sdd-metrics`.
3. Never modify the workflow, prompts, agents, or commands directly.
4. Changes are applied only after the ADR is accepted.

---

## Candidate Improvements

The following ideas are recorded for future reference. They are **not approved**
and **not scheduled**. Each requires historical evidence from the review trigger
before any implementation can be considered.

### Dependency Prediction Accuracy

| Field | Value |
|-------|-------|
| Status | **PENDING_REVIEW** |
| Trigger | Historical evidence required (≥20% recurrence) |
| Implementation | None |

### Hot File Forecast

| Field | Value |
|-------|-------|
| Status | **PENDING_REVIEW** |
| Trigger | Historical evidence required (≥20% recurrence) |
| Implementation | None |

### Read Order Quality Score

| Field | Value |
|-------|-------|
| Status | **PENDING_REVIEW** |
| Trigger | Historical evidence required (≥20% recurrence) |
| Implementation | None |

### Review Time Prediction

| Field | Value |
|-------|-------|
| Status | **PENDING_REVIEW** |
| Trigger | Historical evidence required (≥20% recurrence) |
| Implementation | None |

### Test Selection Accuracy

| Field | Value |
|-------|-------|
| Status | **PENDING_REVIEW** |
| Trigger | Historical evidence required (≥20% recurrence) |
| Implementation | None |

### False Positive Verify Rate

| Field | Value |
|-------|-------|
| Status | **PENDING_REVIEW** |
| Trigger | Historical evidence required (≥20% recurrence) |
| Implementation | None |

### Design Drift Detection

| Field | Value |
|-------|-------|
| Status | **PENDING_REVIEW** |
| Trigger | Historical evidence required (≥20% recurrence) |
| Implementation | None |

---

## Important Notice

**The roadmap is informational only.**

Nothing in this document authorizes automatic modifications to the SDD platform.
All changes require:

1. Review trigger activation (≥40 implementations or PRs)
2. Historical metrics collection via `/sdd-metrics`
3. Pattern identification (≥20% recurrence)
4. ADR proposal and acceptance
5. Human-approved implementation

---

## References

- ADR-0004: SDD Feature Freeze
- `docs/architecture/sdd-infrastructure.md` §5 — Platform Stability Policy
- `docs/architecture/sdd-infrastructure.md` §7 — SDD v2.1 Feature Freeze
- `docs/architecture/CHANGELOG.md`
- Tag `sdd-v2.1-baseline`
