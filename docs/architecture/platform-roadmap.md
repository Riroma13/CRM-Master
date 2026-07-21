# Platform Roadmap — CRM-Master

> **Última actualización:** 2026-07-20
> **SDD Version:** v2.1
> **Platform Baseline:** sdd-v2.1-baseline (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ **Archived** | Implemented, tested, archived, committed |
| 🔧 **In Progress** | Active development |
| 📋 **Designed** | Design + Architecture Review complete |
| ⬜ **Planned** | Not started |
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
| SPEC-0008 | — | ✅ Archived | — | — | — |
| SPEC-0009 | — | ✅ Archived | — | — | — |
| SPEC-0010 | Universal Search 2.0 | ✅ Archived | — | 20 | Búsqueda global unificada |

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
| Total SPECs | 24 (+1 planned) |
| Archived SPECs | 22 |
| In Progress | 0 |
| Planned | 1 (SPEC-0004) |
| Total Tests | ~1,400+ |
| Architecture Reviews Passed | 14/14 |
| Average Working Set Accuracy | ~96% |
| Total Commits (SDD era) | 30+ |
| Architecture Decisions | 20 ADRs |

---

## SDD Workflow

```
Design → Architecture Review → Design Refinement (if required)
→ Tasks → Tasks Review → Tasks Refinement (if required)
→ Apply → Verify → Archive → Health Report
→ Repository Ready → Commit → Push
```

**Rules:**
- Architecture Review is executed **exactly once** per SPEC
- Complexity Score: ≤3 = Size Exception, ≥4 = Chained PRs
- Default chain strategy: stacked-to-main

---

> **Próximo paso:** Pendiente de definir SPEC-0025.
