# Archive Report: SPEC-0026 — OAuth Social Login

```yaml
schema: gentle-ai.archive-result/v1
status: success
change: SPEC-0026-oauth-social-login
artifact_store: hybrid
archive_destination: openspec/changes/archive/2026-08-09-SPEC-0026-oauth-social-login/
model: openai/gpt-5.6-luna
```

## Archive Decision

Archive is intentional-with-warnings. The accepted Terra 5.6 final bounded Verify adjudication is `PASS_WITH_BASELINE_DEBT`, with `status: VERIFIED_WITH_CONDITION`, `decision: VERIFIED`, `blockers: 0`, `critical_findings: 0`, and `security_gates: 6/6`. The only condition is explicitly classified, non-blocking baseline repository debt outside SPEC-0026. No substantive verification evidence or hashes were changed.

The active change has no `proposal.md` and no `specs/` delta directory. The user explicitly authorized this compatibility-artifact-incomplete archive. This is recorded as an intentional partial/compatibility condition; it is non-blocking because Design, Tasks, Tasks Review, Architecture Review, Apply, and Verify evidence are present. No unrelated main specs were modified; spec sync is therefore `none`.

## Gates

- Review/verification gate: PASS — accepted bounded adjudication; no CRITICAL findings.
- Task completion gate: PASS — persisted `tasks.md` is 16/16 checked; no unchecked implementation tasks.
- Action context: PASS — `archive`; no workspace-planning operation.
- Git lifecycle: not performed.

## Engram Traceability

| Artifact | Observation ID | Topic |
|---|---:|---|
| Design | #940 | `sdd/SPEC-0026-oauth-social-login/design` |
| Tasks | #946 | `sdd/SPEC-0026-oauth-social-login/tasks` |
| Tasks Review | #948 | `sdd/SPEC-0026-oauth-social-login/tasks-review` |
| Architecture Review | #942 | `sdd/SPEC-0026-oauth-social-login/architecture-review` |
| Apply Progress | #957 | `sdd/SPEC-0026-oauth-social-login/apply-progress` |
| Verify Report | #990 | `sdd/SPEC-0026-oauth-social-login/verify-report` |
| Archive Report | #1015 | `sdd/SPEC-0026-oauth-social-login/archive-report` |

## Artifact Inventory Before Move

- `design.md` ✅
- `tasks.md` ✅ — 16/16 checked
- `tasks-review.md` ✅
- `architecture-review.md` ✅
- `apply-summary.md` ✅
- `verify-report.md` ✅ — accepted baseline-debt adjudication
- `proposal.md` ⚠️ intentionally absent
- `specs/` delta directory ⚠️ intentionally absent
- `archive-report.md` ✅ canonical report written before move

## Sync and Archive Result

- Main spec sync: no-op; no delta specs exist and unrelated main specs remain untouched.
- Folder move: authorized and executed after this report was persisted.
- Required post-move checks: active change directory absent; archive contains all six pre-existing artifacts plus this archive report.

## Baseline Debt Preservation

The exact `PASS_WITH_BASELINE_DEBT` classification is preserved: 12 API failure groups / 69 failed tests and one unrelated tenant-web CalendarPicker failure remain outside SPEC-0026. Existing hashes remain unchanged, including evidence revision `sha256:8fdcf9351aa75367f184e6dccd9605c5c4e5820206c4434e816a6b8bea5a406b` and the exact command-output hashes in `verify-report.md`.

## Next

`Health Report` is next, followed by `Repository Ready`, as explicitly authorized by the user.
