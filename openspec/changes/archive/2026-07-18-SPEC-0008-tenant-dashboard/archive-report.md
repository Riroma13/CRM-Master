# Archive Report: SPEC-0008 — Tenant Dashboard

Archived at: 2026-07-18T17:04:00Z

## Learning

### Working Set Accuracy
- Planned: 3 primary + 4 secondary = 7 files
- Actual: 3 modified + 4 created = 7 files
- Accuracy: 100%
- Design Confidence: High

### Unexpected Dependencies: None

### Verify Iterations: 2 (first pass found doorbell+error gaps, second pass PASS)

### Lessons Learned
1. Verify caught a Prisma field name mismatch (nombre vs nombreSistema) in the doorbell test — this is exactly the kind of gap doorbell tests are designed to catch.
2. The backward-compat decision (keeping eventosRecientes alongside ultimosEventos) was necessary because page.tsx was Expected NOT to Change.
3. Working Set prediction was 100% accurate — no file outside the Working Set was needed.

## JSON Artifact

```json
{
  "working_set_accuracy": 100,
  "design_confidence": "High",
  "verify_iterations": 2,
  "planned_files": [
    "tenant-dashboard.service.ts",
    "dto.ts",
    "use-dashboard.ts",
    "tenant-dashboard.service.spec.ts",
    "use-dashboard.test.ts",
    "admin/page.test.tsx",
    "tenant-dashboard-isolation.spec.ts"
  ],
  "actual_files": [
    "tenant-dashboard.service.ts",
    "dto.ts",
    "use-dashboard.ts",
    "tenant-dashboard.service.spec.ts",
    "use-dashboard.test.ts",
    "admin/page.test.tsx",
    "tenant-dashboard-isolation.spec.ts"
  ],
  "unexpected_files": [],
  "unexpected_dependencies": [],
  "future_recommendations": [
    "Include Prisma field names in test fixtures explicitly to avoid nombreSistema mismatches",
    "Verify backward-compat aliases in Expected NOT to Change files before adding new fields"
  ],
  "environment": {
    "opencode_version": "1.18.3",
    "provider": "opencode-go",
    "prompt_cache": true,
    "fallback_used": true,
    "fallback_reason": "sdd-apply subagent built-in model resolution failed; fell back to general agent",
    "configured_model": "opencode-go/deepseek-v4-flash",
    "resolved_model": "general"
  }
}
```
