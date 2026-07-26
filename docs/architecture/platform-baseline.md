# Platform Baseline

---
status: active
role: platform baseline reference
---

# Platform Baseline

> **Documento fundacional.** Marca el punto oficial desde el que comienza el
> desarrollo de producto de CRM-Master.

---

## Historical v2.1 Baseline

| Campo             | Valor                                      |
| ----------------- | ------------------------------------------ |
| **Baseline Name** | `sdd-v2.1-baseline`                        |
| **Version**       | SDD v2.1                                   |
| **Date**          | 2026-07-19                                 |
| **Git Commit**    | `7eafdab4277568766f454bd61799d29ae529dbe8` |
| **Repository**    | `git@github.com:Riroma13/CRM-Master.git`   |

---

## Candidate v3.0 Baseline

<!-- HISTORICAL EVIDENCE: this candidate snapshot is preserved unchanged. -->

| Field                       | Value                                                                         |
| --------------------------- | ----------------------------------------------------------------------------- |
| **Release ID**              | `sdd-v3.0-stable`                                                             |
| **Version**                 | SDD v3.0 (candidate)                                                          |
| **Implementation Baseline** | `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`                                    |
| **Planned Tag**             | `sdd-v3.0-baseline` (not published)                                           |
| **Release State**           | candidate                                                                     |
| **Stable Declaration**      | maintainer-only-after-repository-ready                                        |
| **Freeze After Final Gate** | PENDING                                                                       |
| **Approval Record**         | `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/architecture-review.md` |

The v2.1 baseline remains historical evidence. This candidate record does not
declare Stable, publish the planned tag, or reactivate the feature freeze.

---

## Stable v3.0 Baseline

| Field                       | Value                                      |
| --------------------------- | ------------------------------------------ |
| **Release ID**              | `sdd-v3.0-stable`                           |
| **Version**                 | SDD v3.0 (stable)                          |
| **Implementation Baseline** | `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce` |
| **Verified Candidate**       | `03ecd9d18a329986f71214bb3ecd16b1b62ff264` |
| **Finalization Commit**      | `dad0024e25bfc9a44af2f4d61ea6b8d2d899e2a1` |
| **Published Tag**            | `sdd-v3.0-baseline`                         |
| **Tag Target**               | `dad0024e25bfc9a44af2f4d61ea6b8d2d899e2a1` |
| **Published Release**        | `SDD v3.0 Stable`                           |
| **Release State**            | stable                                     |
| **Stable Declaration**       | EXECUTED                                   |
| **Feature Freeze**           | ACTIVE                                     |

The existing candidate section above is pre-finalization historical evidence;
this section is the current platform baseline.

---

## Platform Status

| Componente                 | Estado                                                         |
| -------------------------- | -------------------------------------------------------------- |
| Architecture Status        | **Stable**                                                     |
| SDD Version                | **v3.0 (stable)**                                              |
| Feature Freeze             | **ACTIVE** (ADR-0004 history retained)                         |
| Enterprise Design Standard | **STABLE** (18-section/A-G shape preserved)                    |
| OpenSpec Workflow          | **ACTIVE**                                                     |

---

## Architecture Components

### Infrastructure

| Component                   | Status         | Documentation                                  |
| --------------------------- | -------------- | ---------------------------------------------- |
| Module Composition Standard | ✅ Implemented | `docs/architecture/module-composition.md`      |
| ADR System                  | ✅ Active      | `docs/architecture/adr/`                       |
| Navigation Registry         | ✅ Implemented | `apps/tenant-web/src/config/navigation/`       |
| Enterprise Design Template  | ✅ Active      | `docs/templates/design-enterprise-template.md` |
| Design Standard             | ✅ Active      | `docs/templates/design-enterprise-template.md` |
| Canonical SDD Workflow      | ✅ Active      | `docs/SDD-WORKFLOW.md`                         |
| Working Set                 | ✅ Mandatory   | SDD Design phase                               |
| Read Order                  | ✅ Mandatory   | SDD Design phase                               |
| Design Confidence           | ✅ Mandatory   | SDD Design phase                               |
| Exploration Budget          | ✅ Mandatory   | SDD Design phase                               |
| Architecture Review         | ✅ Mandatory   | SDD Design phase (7 topics)                    |
| Verify Discoveries          | ✅ Measured    | SDD Verify phase                               |
| Working Set Validation      | ✅ Measured    | SDD Verify phase                               |
| Archive JSON Artifact       | ✅ Generated   | SDD Archive phase                              |
| Learning Section            | ✅ Generated   | SDD Archive phase                              |
| Metrics Collector           | ✅ Operative   | `/sdd-metrics`                                 |
| SDD Doctor                  | ✅ Operative   | `/sdd-doctor`                                  |
| Environment Verification    | ✅ Active      | Pre-workflow gate                              |
| Fallback Telemetry          | ✅ Active      | Model fallback recording                       |
| Platform Stability Policy   | ✅ Enacted     | `docs/architecture/sdd-infrastructure.md` §5   |

### Backend

| Component               | Status          | Location                                             |
| ----------------------- | --------------- | ---------------------------------------------------- |
| Aggregation Modules (3) | ✅ Implemented  | `apps/api/src/modules/{core,infrastructure,tenant}/` |
| Tenant Architecture     | ✅ Scoped       | Prisma extension `forTenant()` + `forCliente()`      |
| Activity Timeline       | ✅ Designed     | SPEC-0009 (ActivityTimeline bounded context)         |
| NestJS Composition      | ✅ Standardized | `docs/architecture/module-composition.md`            |

### Frontend

| Component                 | Status         | Location                                                |
| ------------------------- | -------------- | ------------------------------------------------------- |
| Navigation Registry       | ✅ Implemented | `apps/tenant-web/src/config/navigation/`                |
| Sidebar Pure Renderer     | ✅ Implemented | `apps/tenant-web/src/components/layout/sidebar.tsx`     |
| AuthGuard Extraction      | ✅ Implemented | `apps/tenant-web/src/components/layout/auth-guard.tsx`  |
| Breadcrumbs from Registry | ✅ Implemented | `apps/tenant-web/src/components/layout/breadcrumbs.tsx` |

### Documentation

| Document                               | Status        |
| -------------------------------------- | ------------- |
| ADR-0001 — Multi-tenancy Strategy      | ✅ Accepted   |
| ADR-0002 — Better-Auth Migration       | ✅ Accepted   |
| ADR-0003 — TenantModule Split Strategy | ✅ Accepted   |
| ADR-0004 — SDD Feature Freeze          | ✅ Accepted   |
| ADR-0005 — Global Activity Timeline    | ✅ Accepted   |
| Architecture Changelog                 | ✅ Created    |
| SDD Workflow                           | ✅ Active     |
| SDD Infrastructure                     | ✅ Active     |
| Module Composition Standard            | ✅ Active     |
| Enterprise Design Template             | ✅ Active     |
| Future Roadmap                         | ✅ Documented |
| Future Prompts                         | ✅ Documented |

---

## Current Principles

1. **Infrastructure is feature-frozen.** The SDD platform, its workflow, prompts,
   agents, commands, and metrics will not be modified without historical evidence.

2. **Product development becomes the primary focus.** From this baseline forward,
   engineering effort prioritizes product functionality over platform improvements.

3. **Infrastructure changes require historical evidence.** Any modification to the
   SDD platform must be justified by:
   - ≥20 archived implementations showing a recurring pattern, or
   - A formal ADR documenting the evidence and expected improvement.

4. **Enterprise Design Standard is mandatory.** Every new SPEC MUST follow the
   canonical templates at `docs/templates/`.

5. **All implementations follow the current canonical SDD workflow in
   `docs/SDD-WORKFLOW.md`.** Its mandatory artifacts and gates are authoritative.

6. **Architecture Review is non-negotiable.** Every Design must evaluate:
   - Scalability (10×, 100×)
   - Open/Closed Principle
   - Ownership
   - Data Retention
   - Idempotency
   - Shared Contracts
   - Partitioning Strategy

---

## What is NOT expected anymore

A partir de este baseline, **no se esperan nuevas mejoras** sobre los siguientes
componentes salvo que exista evidencia histórica suficiente:

| Component                   | Exception                        |
| --------------------------- | -------------------------------- |
| SDD Workflow phases         | ≥20 implementations showing need |
| SDD prompts (sdd-*.md)      | ≥20 implementations or ADR       |
| SDD metrics                 | ≥20 implementations or ADR       |
| Design templates            | ≥20 implementations or ADR       |
| SDD Doctor                  | Bug fix only                     |
| Environment Verification    | Bug fix only                     |
| Fallback Telemetry          | Bug fix only                     |
| Module Composition Standard | ≥20 implementations or ADR       |
| Navigation Registry         | Product feature requirement      |
| Aggregation Modules         | Product feature requirement      |

---

## Product Roadmap

Desde este baseline, el roadmap del proyecto se centra exclusivamente en
**funcionalidades de producto**:

1. **Daily operation features** — herramientas que el usuario abre continuamente
   durante el día (activity feed, alertas, tablero rápido).
2. **CRM core** — gestión de clientes, sistemas, inventario, incidencias.
3. **Scheduling** — calendario, reservas, recursos.
4. **Communications** — notificaciones, email, encuestas.
5. **Automation** — reglas de automatización, webhooks, plantillas.
6. **Client portal** — experiencia de autoservicio para clientes finales.

Cada una de estas áreas seguirá el workflow canónico de `docs/SDD-WORKFLOW.md`
con el Enterprise Design Standard obligatorio.

---

## References

- Tag: `sdd-v2.1-baseline` (`7eafdab`)
- Tag: `sdd-v3.0-baseline` (`dad0024`)
- Release: `SDD v3.0 Stable`
- ADR-0004: SDD Feature Freeze
- `docs/architecture/CHANGELOG.md`
- `docs/architecture/sdd-infrastructure.md`
- `docs/architecture/module-composition.md`
- `docs/templates/design-enterprise-template.md`
- `docs/templates/design-enterprise-template.md`
- `docs/SDD-WORKFLOW.md`
- `docs/sdd-workflow-guard.md`
- `docs/roadmaps/future-roadmap.md`
- `AGENTS.md`
- `.ai/context/PROJECT.md`
