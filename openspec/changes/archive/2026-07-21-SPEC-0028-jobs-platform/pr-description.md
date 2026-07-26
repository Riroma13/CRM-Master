# SPEC-0028: Jobs & Background Processing Platform

## Summary
Unified background job platform: shared BullMQ infra, Prisma job models, JobService, DlqProcessor, and metrics.

## Changes (3 PRs)
- **PR-1**: ADR-0028 + Prisma models (JobDefinition, JobRun, JobSchedule) + shared types + seed data + migration
- **PR-2**: Global JobsInfraModule (forRoot extraction from activity-timeline) + module wiring + 17-queue init test
- **PR-3**: JobService (enqueue/status/cancel/retry/list) + DlqProcessor (exponential backoff) + Prometheus metrics + all tests

**Task completion:** 21/21 Phase 1 tasks complete.

## Breaking Changes
None — Phase 1 is additive and backward compatible. Existing @Processor modules continue working.

## Testing
- 53 new tests (9 shared types + 13 service + 16 dlq + 3 isolation + 4 backward compat + 3 module init + 4 existing compat)
- All existing API tests pass (1325 tests)
- Cross-tenant isolation verified

## Notes
Phase 1 complete only. Phases 2-5 remain deferred: scheduling API, admin dashboard, module migration, and job orchestration.
