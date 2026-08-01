---
status: active
role: canonical workflow lifecycle
guard_authority: docs/sdd-workflow-guard.md
---

# SDD Workflow — Spec-Driven Development para CRM-Master

> **Estado:** active
> **Transition authority:** `docs/sdd-workflow-guard.md` (read before every phase transition)

---

## 🎯 Objetivo

Establecer un flujo de fases claro, repetible y riguroso para el desarrollo de features en CRM-Master. Cada feature pasa por estados definidos, con responsables claros y gates de calidad obligatorios.

---

## 📋 Workflow Canónico (15 fases)

```
┌────────┐    ┌────────────────┐    ┌───────────────────┐    ┌─────────┐    ┌─────────────┐    ┌──────────┐
│   1    │ →  │       2        │ →  │         3         │ →  │    4    │ →  │      5      │ →  │    6     │
│ DESIGN │    │   ARCHITECTURE │    │  DESIGN REFINEMENT│    │  TASKS  │    │   TASKS     │    │  TASKS   │
│        │    │    REVIEW      │    │   (solo BLOCKED)  │    │         │    │   REVIEW    │    │REFINEMENT│
└────────┘    └────────────────┘    └───────────────────┘    └─────────┘    └─────────────┘    └──────────┘
                                                                                                  │ (solo
                                                                                                  │ BLOCKED)
                                                                                                  ↓
┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐    ┌───────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐
│  13    │ ←  │  12    │ ←  │  11    │ ←  │  10    │ ←  │     9     │ ←  │    8    │ ←  │    7     │ ←  │    7.6   │
│ COMMIT │    │ PUSH   │    │ MERGE  │    │REPO    │    │  HEALTH   │    │ ARCHIVE │    │ VERIFY   │    │  APPLY   │
│        │    │        │    │        │    │READY   │    │  REPORT   │    │         │    │          │    │  SUMMARY │
└────────┘    └────────┘    └────────┘    └────────┘    └───────────┘    └─────────┘    └──────────┘    └──────────┘
      ↑
      │    ┌────────────────────────────────────────────────────────────────────────────────────────────┐
      └────┤  APPLY FASES: 7.1 Foundation → 7.2 Core Engine → 7.3 Feature → 7.4 Integration → 7.5 Tests │
           └────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎭 Roles

| Rol lógico | Responsabilidad |
|-----|-------|
| **High-reasoning judgment role** | Design, final Architecture Review, critical architectural decisions, and Verify |
| **Orchestration and implementation role** | Tasks, Apply Phases 1–5, Apply Summary, Archive, Health Report, Repository Ready, and workflow progression |
| **Economical evidence role** | Bounded evidence gathering, inventories, type/dependency checks, reconciliation, and path mapping |
| **Quality Gate** | CI and automated tests block merge when required checks fail |

### Closed Evidence Handoff

When the economical evidence role returns a bounded evidence packet with
`UNAMBIGUOUS_MINIMAL_FIX`, `APPROVED_CORRECTION`, or an equivalent closed factual
conclusion with an exact Working Set and exact next action, the orchestration and
implementation role performs only the minimal contradiction check, verifies the
named files and exact current failure, executes the supplied RED/GREEN sequence,
modifies only the approved Working Set, and returns to the current lifecycle
checkpoint.

It must not repeat broad repository recovery or evidence inventory, inspect
unrelated history, archived SPECs, consumers, or dependencies, reopen rejected
alternatives, rebuild the module/dependency graph, expand the Working Set,
escalate to the high-reasoning judgment role, redesign the approved correction,
or replace execution with another evidence report. Investigation reopens only
when direct evidence contradicts a material handoff fact; then the affected task
stops, the exact contradiction is classified using the canonical taxonomy, and
one bounded evidence update is requested.

The economical evidence role gathers and closes facts. The orchestration and
implementation role validates minimally and executes. The high-reasoning
judgment role decides only when multiple materially valid architectural options
remain after evidence gathering. A closed handoff is an execution contract, not
an invitation to repeat analysis.

Execution-time findings are governed by the canonical **Execution-Time Discovery
Rule** in `docs/sdd-workflow-guard.md`, Rule 7. That rule applies the closed
handoff sequence: minimal contradiction check → execute → reopen evidence only
upon direct material contradiction.

---

## 🏗️ Fases detalladas (visibles para el usuario)

### **FASE 1: Design**
> **Estado:** `design` → Responsable: Tech Lead

- **Trigger:** Idea de negocio, bug, mejora, o decisión estratégica.
- **Actividad:** Diseño técnico usando el Enterprise Design Standard (`docs/templates/design-enterprise-template.md`). Generar Working Set, Read Order, Exploration Budget.
- **Entregable:** `openspec/changes/<change-name>/design.md` completo con las 18 secciones canónicas.
- **Gate:** Diseño completo con arquitectura, flujo de datos, contratos, riesgos, estrategia de testing.

---

### **FASE 2: Architecture Review**
> **Estado:** `architecture-review` → Responsable: Revisor de alta razonamiento

- **Trigger:** Design completo.
- **Actividad:** Validación del Design contra los 7 temas canónicos (A–G). Clasificación de hallazgos como `BLOCKER`, `CONDITION`, o `NON-BLOCKING`.
- **Entregable:** Veredicto (`APPROVED`, `APPROVED_WITH_CONDITIONS`, `BLOCKED`, o `NEEDS_EVIDENCE`).
- **Gate:** Solo el veredicto `BLOCKED` requiere Design Refinement. Las
  condiciones no bloqueantes aprobadas en `APPROVED_WITH_CONDITIONS` se registran
  y permiten continuar.

---

### **FASE 3: Design Refinement (solo si BLOCKED)**
> **Estado:** `design-refinement` → Responsable: Tech Lead

- **Trigger:** Architecture Review con veredicto `BLOCKED`.
- **Actividad:** Parche mínimo del Design para resolver únicamente los blockers identificados. No se expande scope.
- **Gate:** Vuelve a Architecture Review después del refinamiento.

---

### **FASE 4: Tasks**
> **Estado:** `tasks` → Responsable: Tech Lead / Orquestador

- **Trigger:** Architecture Review `APPROVED` o `APPROVED_WITH_CONDITIONS`.
- **Actividad:** Derivar plan de implementación del Design aprobado. Secuencia RED-first. Definir archivos, dependencias, fases, checkpoints.
- **Entregable:** `openspec/changes/<change-name>/tasks.md`.
- **Gate:** Plan completo con todos los RED tests antes de implementación.

---

### **FASE 5: Tasks Review**
> **Estado:** `tasks-review` → Responsable: Revisor de alta razonamiento

- **Trigger:** Tasks completos.
- **Actividad:** Validar completitud, dependencias, tests, riesgo de workload.
- **Entregable:** Veredicto con condiciones si existen.
- **Gate:** Si el veredicto es `BLOCKED` por condiciones materiales/bloqueantes →
  Tasks Refinement. Si está limpio o es `APPROVED_WITH_CONDITIONS` con
  condiciones no bloqueantes → Workload Guard; las condiciones aprobadas se
  registran sin bloquear el avance.

---

### **FASE 6: Tasks Refinement (solo si BLOCKED)**
> **Estado:** `tasks-refinement` → Responsable: Tech Lead

- **Trigger:** Tasks Review con veredicto `BLOCKED`.
- **Actividad:** Ajuste mínimo de tasks para resolver condiciones. No se expande scope.
- **Gate:** Vuelve a Tasks Review.

---

### **FASE 7: Apply (5 fases + Summary)**

#### Fase 7.1: Foundation
> **Estado:** `apply-foundation` → Responsable: Tech Lead

- Infraestructura, tipos, migraciones, configuración base.
- Gate: Tests de infraestructura pasan.

#### Fase 7.2: Core Engine
> **Estado:** `apply-core-engine` → Responsable: Tech Lead

- Lógica de negocio central, contratos, estado.
- Gate: Tests unitarios de lógica pasan.

#### Fase 7.3: Feature Implementation
> **Estado:** `apply-feature` → Responsable: Tech Lead

- Funcionalidad específica del SPEC.
- Gate: Tests de feature pasan.

#### Fase 7.4: Integration
> **Estado:** `apply-integration` → Responsable: Tech Lead

- Wiring de componentes, rutas, UI.
- Gate: Tests de integración pasan.

#### Fase 7.5: Testing
> **Estado:** `apply-testing` → Responsable: Tech Lead

- Pruebas unitarias, integración, doorbell, regresión.
- Gate: Todos los tests pasan, lint limpio, puertas de ejecución (execution gates) verificadas.

#### Fase 7.6: Apply Summary
> **Estado:** `apply-summary` → Responsable: Tech Lead

- Consolidación usando `docs/templates/apply-summary-template.md`.
- Documenta Working Set accuracy, métricas, lecciones aprendidas.

---

### **FASE 8: Verify**
> **Estado:** `verify` → Responsable: Revisor de alta razonamiento

- **Trigger:** Apply completo.
- **Actividad:** Validación final contra Design, Tasks, implementación, tests, evidencia.
- **Entregable:** Veredicto (`VERIFIED` o `BLOCKED`).
- **Gate:** `VERIFIED` permite Archive. `BLOCKED` activa Direct Fix.

---

### **FASE 9: Archive**
> **Estado:** `archive` → Responsable: Orquestador

- **Trigger:** Verify `VERIFIED`.
- **Actividad:** Sincronizar delta specs, mover a archive, generar Learning + JSON artifact + PR description.
- **Entregable:** Archive report con métricas.

---

### **FASE 10: Health Report**
> **Estado:** `health-report` → Responsable: Orquestador

- **Trigger:** Archive completo.
- **Actividad:** Auditoría del entorno SDD completo.
- **Entregable:** Reporte de salud del proyecto.

---

### **FASE 11: Repository Ready**
> **Estado:** `repository-ready` → Responsable: Orquestador

- **Trigger:** Health Report completo.
- **Actividad:** Confirmar que implementación y repositorio satisfacen requisitos de verificación y handoff.
- **Gate:** Handoff listo para Commit.

---

### **FASE 12: Commit**
> **Estado:** `commit` → Responsable: **Maintainer (manual)**

- **Gate destructivo.** Solo el maintainer ejecuta commit con Conventional Commit.

---

### **FASE 13: Push**
> **Estado:** `push` → Responsable: **Maintainer (manual)**

- **Gate destructivo.** Solo el maintainer ejecuta push.

---

### **FASE 14: Merge**
> **Estado:** `merge` → Responsable: **Maintainer (manual)**

- **Gate destructivo.** Solo el maintainer ejecuta merge a main.

---

## 📁 Estructura de archivos SDD

```
openspec/
├── changes/
│   └── <change-name>/
│       ├── proposal.md        ← compatibilidad (no fase visible)
│       ├── design.md          ← autoritativo (contrato de razonamiento e implementación)
│       ├── tasks.md           ← plan de implementación derivado del Design
│       └── specs/             ← opcional, generado automáticamente si se necesita
└── archive/
    └── <change-name>/         ← artifacts archivados
```

---

## 📐 Exploration Optimization

### Objective

Reduce repository exploration during Apply by making Design produce an explicit execution plan and by making Verify/Archive measure its accuracy.

### Workflow

```
Design
  → Working Set (Primary + Secondary + Tests + Config + NOT-to-change)
  → Read Order (optimal file reading sequence)
  → Expected Commands (build, test, lint, etc.)
  → Design Confidence (High/Medium/Low)
  → Exploration Budget (max searches, reads, modifications)
     ↓
Apply
  → Consume Working Set + Read Order
  → Follow Read Order strictly
  → No repo-wide searches unless Working Set is insufficient
  → Document every excess read/search + which Design assumption was incomplete
     ↓
Verify
  → Working Set Validation (Planned vs Actual vs Unexpected)
  → Exploration Review (unnecessary reads/searches, budget compliance)
     ↓
Archive
  → Learning
     → Working Set Accuracy (%)
     → Unexpected Dependencies
     → Verify Iterations
     → Lessons Learned
     → Future Recommendations
  → JSON artifact (machine-readable metrics)
  → PR Description (GitHub-ready markdown)
  → Architecture Decisions (historical record)
```

---

## 🗂️ Estados de una Spec

| Estado | Significado | Quién lo cambia |
|--------|-------------|-----------------|
| `design` | Design en creación | Tech Lead |
| `architecture-review` | Design bajo revisión | Architecture Reviewer |
| `approved` | Design aprobado, listo para Tasks | Architecture Reviewer |
| `tasks` | Tasks en creación | Orquestador |
| `tasks-review` | Tasks bajo revisión | Tasks Reviewer |
| `apply-*` | Apply en progreso (fases 1–5) | Tech Lead |
| `apply-summary` | Consolidación Apply | Tech Lead |
| `verify` | Verificación final | Verify Reviewer |
| `archive` | Archivando | Orquestador |
| `health-report` | Reporte de salud | Orquestador |
| `repository-ready` | Listo para handoff | Orquestador |
| `committed` | Commiteado (manual) | Maintainer |
| `merged` | Mergeado (manual) | Maintainer |
| `deprecated` | Spec descartada | Product Owner o Tech Lead |
| `superseded` | Reemplazada por otra spec | Tech Lead |

---

## ⚡ Escenarios especiales

### Hotfix / Bug crítico
Si hay un bug en producción que impide operar:
1. Se crea Design mínimo con contexto del bug, test que reproduce, y fix mínimo.
2. Ricardo aprueba verbalmente.
3. Se implementa con TDD.
4. Se mergea con PR prioritario.

### Spike / Investigación
Si no sabemos si algo es técnicamente viable:
1. Se crea Design de tipo `spike`.
2. Timebox (ej: 2 horas).
3. Resultado: informe de viabilidad + Design real si es viable.

---

## ✅ Checklist de iniciación de SDD

Para que el SDD funcione, necesitamos:

- [x] Enterprise Design Standard (`docs/templates/design-enterprise-template.md`)
- [x] Estructura de carpetas (`openspec/changes/`, `openspec/archive/`)
- [x] Workflow canónico activo
- [x] Workflow Guard (`docs/sdd-workflow-guard.md`)
- [x] Plantillas de tasks, verify, archive
- [ ] **Este workflow aprobado por Ricardo** ← Ahora mismo
- [ ] Configurar CI para ejecutar tests en cada PR
- [ ] Script de doorbell test (test de fuga) en CI

---

## 📜 Histórico

El modelo anterior de 8 fases (Idea → Draft → Aprobada → Design → Red → Green → Refactor → Archive) ha sido reemplazado por el workflow canónico de 15 fases documentado arriba. El modelo anterior se mantiene como evidencia histórica en el git history de este archivo.
