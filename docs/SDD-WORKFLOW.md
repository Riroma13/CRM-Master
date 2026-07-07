# SDD Workflow — Spec-Driven Development para CRM-Master

> **Versión:** 1.0
> **Fecha:** 2026-07-04
> **Autor:** Einstein (propuesta)
> **Estado:** proposed → esperando aprobación de Ricardo

---

## 🎯 Objetivo

Establecer un flujo de fases claro, repetible y riguroso para el desarrollo de features en CRM-Master. Cada feature pasa por estados definidos, con responsables claros y gates de calidad obligatorios.

---

## 📋 Fases del SDD

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  FASE 1 │ → │  FASE 2 │ → │  FASE 3 │ → │  FASE 4 │ → │  FASE 5 │ → │  FASE 6 │ → │  FASE 7 │ → │  FASE 8 │
│   IDEA  │    │  DRAFT  │    │APROBADA │    │  ADR    │    │   RED   │    │  GREEN  │    │REFACTOR │    │  DONE   │
│         │    │  SPEC   │    │         │    │         │    │  (TDD)  │    │         │    │         │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
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
  - Actualizar `docs/decisions-log.md`
- **Entregable:** ADR (si aplica) + spec actualizada con sección "Diseño técnico" completa.
- **Gate:** ¿Necesita ADR? ¿El diseño es coherente con ADRs existentes?

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
- **Entregable:** Código de producción que hace pasar todos los tests.
- **Gate:** ¿`pnpm test` pasa al 100%? ¿Cobertura ≥ 80%?

---

### **FASE 7: Refactor & Review**
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
- **Entregable:** Código limpio, tests pasando, lint limpio.
- **Gate:**
  - [ ] `pnpm test` ✅
  - [ ] `pnpm lint` ✅
  - [ ] `pnpm format` ✅
  - [ ] Cobertura ≥ 80% ✅
  - [ ] No hay secrets expuestos ✅

---

### **FASE 8: Aceptación & Merge**
> **Estado:** `implemented` → Responsable: Product Owner (validación) + Tech Lead (merge)

- **Trigger:** Refactor completo.
- **Actividad:**
  1. Yo presento el resultado a Ricardo (demo breve o resumen)
  2. Ricardo valida que cumple con la spec aprobada
  3. Si hay desviaciones, documentarlas en la spec (sección "Notas")
  4. Commit con Conventional Commit
  5. Actualizar spec a estado `implemented`
  6. Actualizar `docs/decisions-log.md` si hubo ADR
- **Entregable:**
  - Spec con estado `implemented`
  - Código mergeado en main
  - Tests en CI pasando
- **Gate final:**
  - [ ] Product Owner valida que resuelve el problema original
  - [ ] CI/CD pasa (tests, lint, build)
  - [ ] Spec actualizada con estado `implemented`

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

## 🤔 Preguntas para Ricardo

1. **¿Aprobas este workflow?** ¿Quieres ajustar alguna fase?
2. **¿Quieres que las specs existentes (SPEC-0001 a SPEC-0007) pasen por este flujo?** Es decir, ¿las revisamos juntos y las llevamos a `approved` antes de implementar?
3. **¿Hay alguna feature que quieras saltar a Fase 1 ahora mismo?**

---

*Propuesta generada por Einstein el 2026-07-04. Pendiente de aprobación.*
