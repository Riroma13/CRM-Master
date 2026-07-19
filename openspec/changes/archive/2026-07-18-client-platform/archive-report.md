# Archive Report: client-platform

Archived: 2026-07-18

## Test Results (tenant-web)

| Metric | Value |
|--------|-------|
| Test files passed | 31 of 33 |
| Tests passed | 168 of 174 |
| Pre-existing failures | 6 (all calendario — unrelated) |
| Middleware tests | ✅ Passing (jose resolves in Edge Runtime) |

**Verdict after fix**: middleware.ts now uses `jose` instead of `jsonwebtoken` for Edge Runtime compatibility. Build and middleware tests pass.

## Task Completion

| Metric | Value |
|--------|-------|
| Total tasks | 31 |
| Complete | 31 |
| Incomplete | 0 |
| Completion rate | 100% |

## Learning

### Working Set Accuracy
- Primary Files predicted: ~20 files from design (modules, services, controllers, middleware, pages, schema)
- Actual: same files + packages/ui
- Accuracy: ~100% (design correctly predicted all implementation files)

### Verify Iterations
2 iterations: first pass found middleware `jsonwebtoken` issue; second pass after `jose` fix passes

### Lessons Learned
1. The `middleware.ts` `jsonwebtoken` issue was a real production blocker — verify caught it
2. Using `jose` instead of `jsonwebtoken` for Edge Runtime JWTs is a best practice for Next.js middleware
3. Pre-existing test failures (calendario) can mask the true health of a change — need to distinguish pre-existing vs. introduced failures at verify time

## JSON Artifact

```json
{
  "working_set_accuracy": 95,
  "design_confidence": "Medium",
  "verify_iterations": 2,
  "planned_files": [
    "client-auth module",
    "client-user-management module",
    "prisma schema + index",
    "shared-ui",
    "middleware",
    "route groups",
    "login page",
    "portal pages",
    "ADR"
  ],
  "actual_files": [
    "client-auth module",
    "client-user-management module",
    "prisma schema + index",
    "shared-ui",
    "middleware",
    "route groups",
    "login page",
    "portal pages",
    "ADR"
  ],
  "unexpected_files": [],
  "unexpected_dependencies": [
    "jose — Edge-compatible JWT library (jsonwebtoken is Node-only)"
  ],
  "future_recommendations": [
    "Always use jose for JWT operations in Edge Runtime context (middleware.ts)",
    "Include Edge Runtime compatibility check in Design phase for any middleware changes"
  ],
  "environment": {
    "opencode_version": "1.18.3",
    "provider": "opencode-go",
    "prompt_cache": true,
    "fallback_used": true,
    "fallback_reason": "sdd-apply and sdd-archive had model resolution fallbacks",
    "configured_model": "opencode-go/deepseek-v4-flash",
    "resolved_model": "general"
  }
}
```
