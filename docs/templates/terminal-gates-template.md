---
classification: TEMPLATE
semantic_authority: false
---

# Direct Terminal Gates Template

> Reusable template for `health-report.md` and `repository-ready.md`.
> Do not create separate Direct terminal-gate templates.

## Gate Record

- **Change:** `<change-name>`
- **Artifact:** `health-report.md` or `repository-ready.md`
- **Status:** `PASS` / `PASS_WITH_WARNINGS` / `BLOCKED`
- **Canonical evidence path:** `openspec/changes/<change-name>/`
- **Generated at:** `<ISO-8601>`

## Evidence

| Check | Result | Evidence |
|---|---|---|
| Required prior artifacts exist | PASS / FAIL | `<path or command>` |
| Canonical path is respected | PASS / FAIL | `<path>` |
| Direct agent routing is valid | PASS / FAIL | `<path or result>` |
| Verification is complete | PASS / FAIL | `<verify-report.md>` |
| No unresolved blockers remain | PASS / FAIL | `<review artifact>` |
| Working tree findings | `<result>` | `<details>` |

## Maintainer-Controlled Gates

These gates are intentionally manual and are not executed by SDD-Direct:

| Gate | Status | Maintainer evidence |
|---|---|---|
| Commit | NOT EXECUTED | `<manual action or pending>` |
| Push | NOT EXECUTED | `<manual action or pending>` |
| Merge | NOT EXECUTED | `<manual action or pending>` |
| Release | NOT EXECUTED | `<manual action or pending>` |
| Tag | NOT EXECUTED | `<manual action or pending>` |

## Decision

`<health or repository-readiness decision>`

## Structured Result

```yaml
status: PASS
change: <change-name>
artifact: health-report.md
blocking_findings: []
manual_gates:
  - Commit
  - Push
  - Merge
  - Release
  - Tag
next: STOP at Repository Ready
```
