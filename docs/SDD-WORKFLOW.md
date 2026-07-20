# SDD Workflow — Spec-Driven Development para CRM-Master

> **Versión:** 2.0
> **Fecha:** 2026-07-18
> **Autor:** Sistema
> **Estado:** active

---

## 🎯 Objetivo

Establecer un flujo de fases claro, repetible y riguroso para el desarrollo de features en CRM-Master. Cada feature pasa por estados definidos, con responsables claros y gates de calidad obligatorios.

---

## 📋 Fases del SDD

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌───────────┐
│  FASE 1  │ → │  FASE 2  │ → │  FASE 3  │ → │  FASE 4   │ → │  FASE 5  │ → │  FASE 6  │ → │  FASE 7  │ → │  FASE 8   │
│   IDEA   │   │  DRAFT   │   │ APROBADA │   │  DESIGN   │   │   RED    │   │  GREEN   │   │ REFACTOR │   │  ARCHIVE  │
│          │   │  SPEC    │   │          │   │ +Working  │   │  (TDD)   │   │          │   │          │   │ +Learning │
│          │   │          │   │          │   │   Set     │   │          │   │          │   │          │   │ +JSON     │
│          │   │          │   │          │   │           │   │          │   │          │   │          │   │ +PR Desc  │
└──────────┘   └──────────┘   └──────────┘   └───────────┘   └──────────┘   └──────────┘   └──────────┘   └───────────┘
```

---

## 🎭 Roles

| Rol | Quién | Responsabilidad |
|-----|-------|----------------|
| **Product Owner** | Ricardo | Decide qué se construye, aprueba specs, valida entregables |
| **Tech Lead** | Einstein (yo) | Propone specs, diseña arquitectura, escribe tests, implementa, refactoriza |
| **Quality Gate** | CI + Tests automáticos | Bloquea merge si tests fallan, cobertura < 80%, o lint no pasa |

---

## 🏗️ Fases detalladas

### **FASE 1: Idea / Contexto**
> **Estado:** `idea` → Responsable: Product Owner

- **Trigger:** Necesidad de negocio, bug, mejora, o decisión estratégica.
- **Actividad:** Ricardo describe el problema o la necesidad en términos de negocio.
- **Entregable:** Descripción breve (1-3 frases) del problema que se quiere resolver.
- **Gate:** ¿Es una feature nueva o una modificación? Si es nueva → pasa a Fase 2. Si es fix → puede saltar a Fase 5 (con spec mínima).

**Ejemplo:**
> "Necesito poder crear un nuevo cliente/tenant desde Mission Control y que reciba un email de invitación para acceder a su portal."

---

### **FASE 2: Spec Draft**
> **Estado:** `draft` → Responsable: Tech Lead

- **Trigger:** Idea aprobada por Product Owner.
- **Actividad:** Yo redacto la spec usando `docs/specs/TEMPLATE.md`.
- **Contenido mínimo:**
  1. Contexto / Problema (Fase 1)
  2. Objetivo medible
  3. Alcance (in-scope / out-of-scope)
  4. API / interfaces (endpoints, DTOs, Zod schemas)
  5. Tests requeridos (unitarios, integración, seguridad)
  6. Modelo de datos (cambios en schema Prisma)
  7. Checklist de implementación
- **Entregable:** Archivo `docs/specs/SPEC-NNNN-nombre.md` con estado `draft`.
- **Gate:** ¿La spec es completa y comprensible? ¿Tiene tests definidos?

---

### **FASE 3: Revisión & Aprobación**
> **Estado:** `proposed` → `approved` → Responsable: Product Owner

- **Trigger:** Spec draft lista para revisión.
- **Actividad:** Ricardo revisa la spec. Puede:
  - ✅ **Aprobar** → estado `approved` → pasa a Fase 4
  - 📝 **Solicitar cambios** → estado sigue `draft` → yo ajusto
  - ❌ **Rechazar** → estado `deprecated` → se descarta con nota
- **Gate de aprobación:**
  - [ ] El Product Owner confirma que entiende y acepta el alcance
  - [ ] Los tests definidos cubren los casos de borde importantes
  - [ ] No hay ambigüedades en los criterios de aceptación

> **🚨 Regla no negociable:** Sin aprobación explícita de Ricardo, NO se pasa a implementación.

---

### **FASE 4: Diseño Técnico / ADR (si aplica)**
> **Estado:** `approved` → `design-complete` → Responsable: Tech Lead

- **Trigger:** Spec aprobada.
- **Actividad:**
  - Si la spec introduce cambios arquitectónicos significativos → crear ADR (`docs/architecture/adr/`)
  - Definir detalles técnicos: flujo de datos, integraciones, decisiones de librerías
  - **Generar Working Set**: predecir los archivos primarios, secundarios, tests, configuración y archivos que NO cambiarán.
  - **Generar Read Order**: secuencia óptima de lectura para minimizar exploración durante Apply.
  - **Estimar Design Confidence**: High/Medium/Low. Si no es High, explicar la brecha.
  - **Definir Exploration Budget**: máximo de búsquedas (grep/find), lecturas y modificaciones esperadas.
  - Actualizar `docs/decisions-log.md`
- **Entregable:** ADR (si aplica) + spec actualizada con sección "Diseño técnico" completa + Working Set + Read Order + Exploration Budget.
- **Gate:** ¿Necesita ADR? ¿El diseño es coherente con ADRs existentes? ¿El Working Set y Read Order están completos?

---

### **FASE 5: Tests Primero (Red Phase)**
> **Estado:** `red` → Responsable: Tech Lead

- **Trigger:** Spec aprobada y diseño completo.
- **Actividad:** Yo escribo TODOS los tests antes de tocar código de producción.
- **Tests obligatorios:**
  - [ ] Unitarios para lógica pura
  - [ ] Integración para endpoints
  - [ ] **Test de fuga entre tenants** (si toca datos de tenant)
  - [ ] Tests de permisos (401, 403)
  - [ ] Tests de validación de input (Zod)
- **Entregable:** Tests escritos, ejecutados, y **FALLANDO** (red).
- **Gate:** ¿Todos los tests de la spec están escritos? ¿Fallan como se espera?

> **🚨 Regla no negociable:** Si los tests no fallan, no están bien escritos.

---

### **FASE 6: Implementación (Green Phase)**
> **Estado:** `green` → Responsable: Tech Lead

- **Trigger:** Tests en red listos.
- **Actividad:** Yo escribo la implementación MÍNIMA necesaria para que los tests pasen.
- **Principios:**
  - No anticipar abstracciones
  - No optimizar prematuramente
  - Hacer pasar los tests, nada más
  - **Consumir el Working Set y Read Order** del diseño antes de explorar el repositorio
  - No realizar búsquedas repo-wide (grep, find) a menos que el Working Set sea insuficiente
  - Si se necesitan archivos fuera del Working Set, documentar por qué y qué asunción del diseño fue incorrecta
- **Entregable:** Código de producción que hace pasar todos los tests + Working Set Accuracy report.
- **Gate:** ¿`pnpm test` pasa al 100%? ¿Cobertura ≥ 80%? ¿La exploración se mantuvo dentro del presupuesto?

---

### **FASE 7: Refactor & Verification**
> **Estado:** `refactor` → Responsable: Tech Lead

- **Trigger:** Tests en green.
- **Actividad:**
  - Refactorizar código sin cambiar comportamiento
  - Eliminar duplicación
  - Mejorar nombres y legibilidad
  - Asegurar lint limpio (`pnpm lint`)
  - Verificar formato (`pnpm format`)
  - Revisar que no hay credenciales hardcodeadas
  - Revisar que todo query a tenant tiene `tenant_id`
  - **Validar Working Set**: comparar Planned Files vs Actual Files. Identificar Unexpected Files.
  - **Evaluar Exploration**: revisar si Apply realizó búsquedas o lecturas innecesarias.
- **Entregable:** Código limpio, tests pasando, lint limpio + Working Set Validation + Exploration Review.
- **Gate:**
  - [ ] `pnpm test` ✅
  - [ ] `pnpm lint` ✅
  - [ ] `pnpm format` ✅
  - [ ] Cobertura ≥ 80% ✅
  - [ ] No hay secrets expuestos ✅
  - [ ] Working Set Validation completada ✅

---

### **FASE 8: Archive & Learning**
> **Estado:** `implemented` → Responsable: Tech Lead

- **Trigger:** Verification completa.
- **Actividad:**
  1. Sync delta specs a main specs
  2. Mover change folder a archive
  3. **Generar Learning section**
  4. **Generar JSON artifact** con métricas estructuradas
  5. **Generar PR description** (`pr-description.md`) lista para copiar en GitHub
  6. Commit con Conventional Commit
  6. Actualizar `docs/decisions-log.md` si hubo ADR
- **Entregable:**
  - Spec con estado `implemented`
  - Archive report con Learning metrics:
    - Working Set Accuracy (%)
    - Design Confidence (High/Medium/Low)
    - Verify iterations
    - Unexpected dependencies
    - JSON artifact
  - Código mergeado en main
- **Gate final:**
  - [ ] Working Set Accuracy measured and recorded
  - [ ] JSON artifact generated
  - [ ] CI/CD pasa (tests, lint, build)
  - [ ] Spec actualizada con estado `implemented`

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

### Metrics tracked over time

| Metric | Source | Purpose |
|--------|--------|---------|
| Working Set Accuracy | Archive | How well Design predicts the actual changes |
| Design Confidence | Design | Self-assessment of completeness |
| Exploration Budget vs Actual | Verify | Whether Apply explored more than expected |
| Verify Iterations | Archive | How many fix cycles were needed |
| Unexpected Dependencies | Archive | Recurring blind spots in Design |

---

## 🗂️ Estados de una Spec

| Estado | Significado | Quién lo cambia |
|--------|-------------|-----------------|
| `idea` | Idea de negocio, aún no documentada | Product Owner |
| `draft` | Spec en redacción, no lista para revisión | Tech Lead |
| `proposed` | Spec lista, pendiente de aprobación | Tech Lead |
| `approved` | Spec aprobada por Product Owner, lista para implementar | Product Owner |
| `design-complete` | Diseño técnico y ADR (si aplica) completados | Tech Lead |
| `red` | Tests escritos, fallando | Tech Lead |
| `green` | Implementación mínima, tests pasando | Tech Lead |
| `refactor` | Código refactorizado, listo para review | Tech Lead |
| `implemented` | Feature entregada y mergeada | Tech Lead (post-aprobació) |
| `deprecated` | Spec descartada, ya no aplica | Product Owner o Tech Lead |
| `superseded` | Reemplazada por otra spec | Tech Lead |

---

## 📁 Estructura de archivos SDD

```
docs/
├── SDD-WORKFLOW.md           ← Este documento (proceso)
├── DESIGN.md                 ← Modelo de datos maestro
├── decisions-log.md          ← Índice de ADRs
├── architecture/
│   └── adr/
│       ├── TEMPLATE.md
│       ├── 0001-multi-tenancy-strategy.md
│       └── NNNN-nueva-adr.md
└── specs/
    ├── TEMPLATE.md
    ├── SPEC-0001-tenant-onboarding.md
    ├── SPEC-0002-multi-tenant-isolation-auth.md
    └── NNNN-nueva-spec.md
```

---

## 🔄 Flujo de trabajo típico (ejemplo)

### Caso: "Quiero poder crear tenants desde Mission Control"

**Fase 1 — Idea:**
> Ricardo: "Necesito crear un nuevo cliente/tenant desde Mission Control y que reciba invitación."

**Fase 2 — Draft:**
> Yo redacto `docs/specs/SPEC-0001-tenant-onboarding.md` con alcance, API, tests, etc.

**Fase 3 — Aprobación:**
> Yo: "Propongo SPEC-0001 para aprobación. Alcance: CRUD de tenants + invitación + onboarding."
> Ricardo: "✅ Aprobado. Adelante."
> → Estado: `approved`

**Fase 4 — Diseño:**
> Yo: "No requiere ADR nuevo, coherente con ADR-0001. Listo para tests."
> → Estado: `design-complete`

**Fase 5 — Red:**
> Yo escribo tests de integración: crear tenant, validar slug, test de fuga, etc. Todos fallan.
> → Estado: `red`

**Fase 6 — Green:**
> Yo implemento endpoints, servicios, validación. Tests pasan.
> → Estado: `green`

**Fase 7 — Refactor:**
> Yo limpio código, elimino duplicación, verifico lint y cobertura.
> → Estado: `refactor`

**Fase 8 — Done:**
> Yo: "SPEC-0001 implementada. Resumen: 3 endpoints nuevos, 12 tests, cobertura 87%."
> Ricardo: "✅ Lo veo bien. Mergea."
> → Commit: `feat(api): tenant onboarding — SPEC-0001`
> → Estado: `implemented`

---

## ⚡ Escenarios especiales

### Hotfix / Bug crítico
Si hay un bug en producción que impide operar:
1. Se crea spec mínima (`SPEC-XXXX-hotfix-descripcion.md`) con:
   - Contexto del bug
   - Test que reproduce el bug (debe fallar)
   - Fix mínimo
2. Ricardo aprueba verbalmente (puede ser en chat)
3. Se implementa con TDD (red → green → refactor)
4. Se mergea con PR prioritario

### Spike / Investigación
Si no sabemos si algo es técnicamente viable:
1. Se crea spec de tipo `spike`
2. Timebox (ej: 2 horas)
3. Resultado: informe de viabilidad + spec real si es viable
4. No requiere tests de producción

### Cambio de alcance mid-implementation
Si durante la Fase 6 descubrimos que la spec necesita ajuste:
1. **PAUSA** la implementación
2. Actualizo la spec con la desviación (sección "Notas")
3. Pido aprobación de Ricardo para la desviación
4. Si aprueba → continúo. Si no → revierto y ajusto.

> **🚨 Regla:** Nunca seguir implementando una desviación sin aprobación.

---

## ✅ Checklist de iniciación de SDD

Para que el SDD funcione, necesitamos:

- [x] Plantilla de specs (`docs/specs/TEMPLATE.md`)
- [x] Plantilla de ADRs (`docs/architecture/adr/TEMPLATE.md`)
- [x] Estructura de carpetas
- [x] Specs existentes (proposed)
- [ ] **Este workflow aprobado por Ricardo** ← Ahora mismo
- [ ] Configurar CI para ejecutar tests en cada PR
- [ ] Configurar CI para bloquear merge si cobertura < 80%
- [ ] Script de doorbell test (test de fuga) en CI

---

---

## 🏥 SDD Platform Infrastructure

La plataforma SDD incluye componentes de infraestructura que garantizan su
correcto funcionamiento:

| Componente | Propósito | Documentación |
|------------|-----------|---------------|
| Environment Verification | Checks pre-workflow antes de cada fase | `docs/architecture/sdd-infrastructure.md` §1 |
| Fallback Policy | 3 niveles de respaldo de modelos | `docs/architecture/sdd-infrastructure.md` §2 |
| SDD Doctor | Auditoría completa del entorno (`/sdd-doctor`) | `docs/architecture/sdd-infrastructure.md` §3 |
| JSON Artifact | Métricas estructuradas con environment info | `docs/architecture/sdd-infrastructure.md` §4 |
| Stability Policy | Régimen de mantenimiento post-feature-complete | `docs/architecture/sdd-infrastructure.md` §5 |

---

*Documento mantenido por el equipo de plataforma. Versión 2.0.*
