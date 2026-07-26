# Platform Roadmap — CRM-Master

> **Última actualización:** 2026-07-25
> **SDD Version:** v3.0 Stable
> **Platform Baseline:** `sdd-v3.0-baseline` (Stable; Feature Freeze ACTIVE)
> **Enterprise Design Standard:** ACTIVE
> **Roadmap numbering:** SPEC IDs and established titles are immutable; undefined and future slots are not assignments.

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ **Archived** | Implemented, tested, archived, committed |
| 🔧 **In Progress** | Active development |
| 📝 **Proposed / Omitted** | Proposed artifact exists, but it is not accepted, implemented, or archived |
| ⚠️ **Recovered / Uncommitted** | Worktree evidence exists, but no committed archive is claimed |
| 📋 **Designed** | Design + Architecture Review complete |
| ⬜ **Planned** | Not started |
| — **Undefined / Unassigned** | No repository artifact or canonical title exists |
| 🔭 **Reserved** | Future roadmap slot only; no artifact or implementation is claimed |
| ❌ **Cancelled** | Deprecated or replaced |

---

## Core Platform

| SPEC | Title | Status | PRs | Tests | Description |
|------|-------|--------|-----|-------|-------------|
| SPEC-0001 | — | ✅ Archived | — | — | Initial setup |
| SPEC-0002 | — | ✅ Archived | — | — | — |
| SPEC-0003 | — | ✅ Archived | — | — | — |
| SPEC-0004 | — | ⬜ Planned | — | — | — |
| SPEC-0005 | — | ✅ Archived | — | — | — |
| SPEC-0006 | — | ✅ Archived | — | — | — |
| SPEC-0007 | Pipeline de CI + entorno de staging | 📝 Proposed / Omitted | — | — | Proposed artifact exists at `docs/specs/SPEC-0007-ci-pipeline-staging.md`; it is intentionally omitted from the accepted/current implementation sequence and is not implemented or archived. |
| SPEC-0008 | — | ✅ Archived | — | — | — |
| SPEC-0009 | — | ✅ Archived | — | — | — |
| SPEC-0010 | Universal Search 2.0 | ✅ Archived | — | 20 | Búsqueda global unificada |
| SPEC-0025 | Identity & Organization Platform | 🔧 In Progress | Not committed | — | Partially implemented and uncommitted; no archive claim. |
| SPEC-0026 | — | — **Undefined / Unassigned** | — | — | No repository artifact or canonical title exists. This slot is not Identity; Identity remains SPEC-0025. |

## Automation & AI

| SPEC | Title | Status | PRs | Tests | Description |
|------|-------|--------|-----|-------|-------------|
| SPEC-0011 | AI Automation Hub | ✅ Archived | — | 14 | Automatizaciones lineales con AI |
| SPEC-0020 | AI Knowledge Base (RAG) | ✅ Archived | 6 | 103 | RAG con pgvector + @xenova/transformers |

## Communication & Notifications

| SPEC | Title | Status | PRs | Tests | Description |
|------|-------|--------|-----|-------|-------------|
| SPEC-0012 | Communication Platform | ✅ Archived | — | 32 | Mensajería multicanal |
| SPEC-0016 | Notification Center | ✅ Archived | 5 | 35 | Preferencias, routing, batching, digest |

## Document Management

| SPEC | Title | Status | PRs | Tests | Description |
|------|-------|--------|-----|-------|-------------|
| SPEC-0013 | Document Platform | ✅ Archived | — | 13 | Gestión documental |

## Integration & Workflow

| SPEC | Title | Status | PRs | Tests | Description |
|------|-------|--------|-----|-------|-------------|
| SPEC-0014 | Integration Platform | ✅ Archived | — | 7 | Integraciones externas |
| SPEC-0015 | Workflow / BPM Engine | ✅ Archived | 5 | 33 | Workflows con nodos, compensación, timers |
| SPEC-0022 | Plugin / Extension Platform | ✅ Archived | 4 | 90 | Plugins event-based con worker_threads sandbox |
| SPEC-0028 | Jobs & Background Processing | ⚠️ Recovered / Uncommitted | Not committed | 53 | Phase 1 only: shared BullMQ infra, JobService, DlqProcessor, 3 Prisma models, and Prometheus metrics. Phases 2–5 are deferred; no archive claim. |

## Activity, Audit & Compliance

| SPEC | Title | Status | PRs | Tests | Description |
|------|-------|--------|-----|-------|-------------|
| SPEC-0017 | Activity Timeline | ✅ Archived | 5 | 24 | Historial de eventos de negocio |
| SPEC-0018 | Audit & Compliance | ✅ Archived | 5 | 83 | Append-only con hash chain SHA-256 |
| SPEC-0024 | Monitoring & Observability | ✅ Archived | 4 | 58 | Prometheus + Grafana + pino + AlertManager |

## Reporting & Analytics

| SPEC | Title | Status | PRs | Tests | Description |
|------|-------|--------|-----|-------|-------------|
| SPEC-0019 | Reporting & Analytics | ✅ Archived | 5 | 142 | KPIs, dashboards, OLAP aggregations, exports |

## API & Access

| SPEC | Title | Status | PRs | Tests | Description |
|------|-------|--------|-----|-------|-------------|
| SPEC-0021 | Public API | ✅ Archived | 6 | 152 | API keys, rate limiting, webhooks HMAC, versioning |

## Billing

| SPEC | Title | Status | PRs | Tests | Description |
|------|-------|--------|-----|-------|-------------|
| SPEC-0023 | Billing & Subscription | ✅ Archived | 7 | 234 | Planes, suscripciones, Stripe, metering, facturación |
| SPEC-0027 | Feature Flags & Licensing Platform | ⚠️ Recovered / Uncommitted | Not committed | 26 | Recovered implementation and tests for feature enforcement via Plan.features + @PlanFeature guard; no archive claim. |

---

## Future Roadmap (No Implementation Claimed)

The following IDs are reserved for future planning only. No repository artifacts,
canonical titles, designs, implementations, or archives exist for
SPEC-0029–SPEC-0034.

| SPEC | Title | Status | Repository reality |
|------|-------|--------|--------------------|
| SPEC-0029 | — | 🔭 Reserved | Unassigned; no repository artifact |
| SPEC-0030 | — | 🔭 Reserved | Unassigned; no repository artifact |
| SPEC-0031 | — | 🔭 Reserved | Unassigned; no repository artifact |
| SPEC-0032 | — | 🔭 Reserved | Unassigned; no repository artifact |
| SPEC-0033 | — | 🔭 Reserved | Unassigned; no repository artifact |
| SPEC-0034 | — | 🔭 Reserved | Unassigned; no repository artifact |

---

## Architecture Decisions (ADRs)

| ADR | Title | Status | SPEC |
|-----|-------|--------|------|
| ADR-0001 | Initial architecture decisions | ✅ Accepted | — |
| ADR-0002 | Multi-tenant data isolation | ✅ Accepted | — |
| ADR-0003 | Tenant module split strategy | ✅ Accepted | — |
| ADR-0004 | Feature freeze policy | ✅ Accepted | — |
| ADR-0005 | Universal Search architecture | ✅ Accepted | SPEC-0010 |
| ADR-0006 | AI Automation Hub | ✅ Accepted | SPEC-0011 |
| ADR-0007 | Communication Platform | ✅ Accepted | SPEC-0012 |
| ADR-0008 | Document Platform | ✅ Accepted | SPEC-0013 |
| ADR-0009 | Integration Platform | ✅ Accepted | SPEC-0014 |
| ADR-0010 | Workflow / BPM Engine | ✅ Accepted | SPEC-0015 |
| ADR-0011 | Activity Timeline | ✅ Accepted | SPEC-0017 |
| ADR-0012 | Notification Center | ✅ Accepted | SPEC-0016 |
| ADR-0013 | Audit & Compliance | ✅ Accepted | SPEC-0018 |
| ADR-0014 | Reporting & Analytics | ✅ Accepted | SPEC-0019 |
| ADR-0015 | AI Knowledge Base (RAG) | ✅ Accepted | SPEC-0020 |
| ADR-0016 | Public API | ✅ Accepted | SPEC-0021 |
| ADR-0017 | pgvector infrastructure | ✅ Accepted | SPEC-0020 |
| ADR-0018 | Plugin / Extension Platform | ✅ Accepted | SPEC-0022 |
| ADR-0019 | Billing & Subscription | ✅ Accepted | SPEC-0023 |
| ADR-0020 | Monitoring & Observability | ✅ Accepted | SPEC-0024 |

---

## Platform Metrics

| Metric | Value |
|--------|-------|
| Numbered roadmap slots | 34 (SPEC-0001–SPEC-0034; includes proposed, undefined, and reserved IDs) |
| Archived SPECs | 22 (committed archive evidence; excludes uncommitted recovery work) |
| In Progress | 1 (SPEC-0025; partial and uncommitted) |
| Recovered / Uncommitted | 2 (SPEC-0027 and SPEC-0028; neither archived) |
| Proposed / Omitted | 1 (SPEC-0007) |
| Planned | 1 (SPEC-0004) |
| Undefined / Unassigned | 1 (SPEC-0026) |
| Future reserved | 6 (SPEC-0029–SPEC-0034) |
| Reported tests in archived rows | 1,040 (sum of numeric row values; scoped counts, not a fresh suite total) |
| Reported recovered tests | 79 (SPEC-0027: 26; SPEC-0028: 53; uncommitted and excluded from archived count) |
| Architecture Reviews Passed | 14/14 (historical reported metric; not recalculated here) |
| Average Working Set Accuracy | ~96% (historical reported metric; not recalculated here) |
| Total Commits (SDD era) | 30+ (historical reported metric; not recalculated here) |
| Committed Architecture Decisions | 20 ADRs (roadmap inventory; recovery ADRs excluded) |

> **Metric methodology:** The numbered-slot count measures roadmap coverage, not
> implementation. A SPEC is counted as archived only when committed archive
> evidence exists; tests or an archive-named directory do not change that rule.
> Test values are report-scoped and were not regenerated by this documentation
> edit. Historical quality metrics are retained as reported values, not presented
> as a new verification run.

---

## SDD-Direct Workflow

```
Explore (if required) → Propose → Spec → Design → Architecture Review
→ Tasks → Apply → Verify → Archive → Repository Ready
```

SDD-Direct stops at Repository Ready. Commit, Push, Merge, Release, and Tag are
manual maintainer gates.

**Rules:**
- Architecture Review is executed **exactly once** per SPEC
- Complexity Score: ≤3 = Size Exception, ≥4 = Chained PRs
- Default chain strategy: stacked-to-main

---

> **Immediate next work item:** SPEC-0025 — Identity & Organization Platform.
> It must pass SDD-Direct through Repository Ready before any later SPEC is
> started. Uncommitted recovery work must not be treated as archived.
