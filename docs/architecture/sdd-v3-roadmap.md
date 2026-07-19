# SDD v3.0 — Candidate Improvements (Future Roadmap)

> **Estado:** Proposed (Not Scheduled)
> **Versión SDD actual:** v2.1 (Feature Frozen)
> **Documento:** Vision-only. No modifica ningún comportamiento del pipeline.

---

## Introducción

SDD v2.1 permanece **Feature Frozen** según ADR-0004 y la política de estabilidad
de la plataforma. Este documento no modifica prompts, comandos, agentes, workflow
ni comportamiento actual.

Su único propósito es recoger posibles mejoras para una futura versión mayor
(SDD v3.0) que podrán evaluarse cuando exista evidencia histórica suficiente
(≈40–50 implementaciones archivadas).

Nada en este documento está aprobado ni planificado. Solo documentado.

---

## Candidate Improvement #1 — Architectural Design Checklist

### Motivación

Durante múltiples diseños arquitectónicos se observó que los mejores Designs
responden explícitamente a preguntas arquitectónicas que mejoran la escalabilidad
y reducen refactors posteriores. La Design Review de SPEC-0009 (Activity Timeline)
identificó 7 preguntas que el diseño inicial no cubría:

- Particionado de tabla
- Política de retención
- Idempotencia
- Open/Closed Principle
- Contrato compartido entre productores y consumidores
- Quién publica y quién no
- Estrategia de índices

La propuesta consiste en incorporar estas preguntas como una sección obligatoria
del Design en SDD v3.0.

### Checklist propuesta

#### 1. Escalabilidad

- ¿Cómo escala esta feature con 10× y 100× datos?
- ¿Existe riesgo de cuellos de botella en lectura, escritura o almacenamiento?
- ¿Qué métrica concreta mediría la degradación?

#### 2. Open/Closed Principle (OCP)

- ¿La solución permite añadir nuevas capacidades sin modificar código existente?
- ¿Dónde está el punto de extensión?
- ¿Qué debe cambiar para añadir un nuevo caso?

#### 3. Retención y ciclo de vida

- ¿Qué datos genera esta feature?
- ¿Cuánto tiempo viven?
- ¿Cómo se archivan o eliminan cuando ya no son necesarios?
- ¿Existe una política de retención explícita?

#### 4. Idempotencia

- ¿Qué ocurre si la operación se ejecuta dos veces?
- ¿Existe riesgo de duplicados?
- ¿Debe existir protección (eventId, unique constraint, upsert)?
- Si el productor reintenta, ¿el consumidor debe ignorar el duplicado?

#### 5. Ownership

- ¿Qué bounded context es propietario de cada dato?
- ¿Qué módulos solo consumen información sin ser propietarios?
- ¿Existe dependencia cíclica entre bounded contexts?

#### 6. Shared Contracts

- ¿Existe un contrato compartido entre frontend y backend?
- ¿Debe crearse un DTO, interfaz o esquema Zod reutilizable en `packages/shared/`?
- ¿Consumidores y productores usan la misma definición de tipos?

#### 7. Particionado

- ¿Será necesario particionar por tenant, por fechas o por volumen?
- ¿Existe alguna decisión temprana que facilite el crecimiento sin migration
  destructiva?
- ¿El esquema de índices soporta los patrones de consulta esperados?

---

## Why this is NOT part of SDD v2.1

1. **Ruptura de comparabilidad histórica.** Insertar una checklist arquitectónica
   en el Design cambiaría la estructura del artefacto. Las métricas de Working Set
   Accuracy, Prediction Accuracy y Design Confidence perderían consistencia entre
   implementaciones pre y post-checklist.

2. **Imposibilidad de medir impacto real.** Sin la checklist como baseline, no se
   puede medir si su introducción reduce refactors o mejora la calidad del diseño.
   El grupo de control son las implementaciones v2.1.

3. **Invalidación parcial de métricas acumuladas.** Las ~10 implementaciones
   existentes bajo v2.1 no pueden compararse directamente con implementaciones
   que usen una estructura de Design diferente.

4. **Violación del Feature Freeze.** ADR-0004 establece que cambios al workflow
   requieren evidencia histórica. No existe evidencia suficiente (≈40–50
   implementaciones) para justificar este cambio.

Por todo ello, la propuesta queda aplazada para SDD v3.0.

---

## Activation Criteria

Esta mejora solo podrá evaluarse cuando se cumplan **todos** los requisitos
siguientes:

| Criterio | Umbral |
|----------|--------|
| Implementaciones archivadas | ≥40–50 |
| Métricas históricas suficientes | Working Set Accuracy, Verify Discoveries, Prediction Accuracy con tendencia estable |
| Patrones repetidos observados | ≥20% de recurrencia de problemas arquitectónicos no detectados en Design |
| Evidencia de impacto positivo | Demostración de que la checklist reduce cambios posteriores (medible vía Verify Discoveries) |

El trigger de revisión sigue el mismo procedimiento definido en
`docs/roadmaps/future-roadmap.md`:

1. Ejecutar `/sdd-metrics`
2. Revisar métricas históricas
3. Identificar patrones recurrentes (≥20%)
4. Si procede: crear ADR, nunca modificar el workflow directamente

---

## Expected Benefits

| Área | Mejora esperada |
|------|-----------------|
| Designs | Más completos desde la primera iteración |
| Escalabilidad | Decisiones de particionado y retención tomadas al diseñar, no tras producir | 
| Bounded Contexts | Ownership explícito evita dependencias cíclicas |
| Refactors | Menos correcciones tardías por decisiones no documentadas |
| Deuda técnica | Menor acumulación por omisión de preguntas arquitectónicas clave |
| Consistencia | Misma estructura de Design en todas las implementaciones |

---

## Out of Scope

Este documento:

- **NO** modifica prompts SDD.
- **NO** modifica AGENTS.md.
- **NO** modifica PROJECT.md.
- **NO** modifica SDD-WORKFLOW.md.
- **NO** modifica ningún comando SDD (`/sdd-*`).
- **NO** modifica agentes, modelos o configuraciones.
- **NO** modifica el JSON artifact ni sus métricas.

Es únicamente una visión futura documentada.

---

## Referencias

- ADR-0004: SDD Feature Freeze
- ADR-0005: Global Activity Timeline (Publisher / Event Bus)
- `docs/architecture/sdd-infrastructure.md` — SDD platform documentation
- `docs/roadmaps/future-roadmap.md` — review triggers and procedure
- `docs/roadmaps/future-prompts.md` — future prompt proposals
- `docs/architecture/CHANGELOG.md` — architecture changelog
