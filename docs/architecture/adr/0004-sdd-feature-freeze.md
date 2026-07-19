# ADR-0004 — SDD Feature Freeze

- **Número ADR:** ADR-0004
- **Fecha:** 2026-07-18
- **Autor:** Sistema
- **Estado:** Accepted

---

## 1. Contexto

La plataforma SDD ha alcanzado un baseline estable tras implementar:

- Working Set
- Read Order
- Design Confidence
- Exploration Budget
- Archive JSON
- Environment Verification
- SDD Doctor
- Metrics Collector
- Observational Metrics (Verify Discoveries, Prediction Accuracy)

El workflow ha sido validado a través de múltiples implementaciones incluyendo
cambios pequeños (1 línea), medianos (380 líneas) y grandes (~2500 líneas).

## 2. Decisión

> **Decidimos** declarar el workflow SDD como feature-complete a partir de
> ADR-0004, **porque** la plataforma ha demostrado ser estable, medible y
> escalable a través de implementaciones de distinto tamaño, **aceptando que**
> futuras mejoras requerirán evidencia histórica en lugar de cambios
> proactivos.

Nuevas capacidades en el workflow SDD NO serán introducidas a menos que:

- estén respaldadas por métricas históricas de `/sdd-metrics`,
- hayan sido observadas como necesidad recurrente en múltiples implementaciones,
- estén justificadas por un beneficio ingenieril medible.

El trabajo futuro deberá priorizar:

- mejorar la calidad del Design sobre añadir nuevas fases,
- reducir la exploración sobre aumentar la complejidad de orquestación,
- mejorar la arquitectura del producto,
- construir funcionalidad de producto.

## 3. Consecuencias

### Positivas

- SDD evoluciona guiado por evidencia, no por intuición.
- La estabilidad del workflow se convierte en un objetivo del proyecto.
- El desarrollo de producto pasa a ser el foco principal.
- El equipo no invierte tiempo en mejorar herramientas que ya funcionan.

### Negativas

- Cambios justificables pueden retrasarse hasta acumular suficiente evidencia.
- Métricas incompletas (menos de 20 implementaciones) no habilitan decisiones.
- El `/sdd-doctor` puede reportar falsos negativos si los prompts se actualizan
  sin actualizar los detectores del doctor.

## 4. Alternativas consideradas

### Alternativa A: No declarar freeze

- **Descripción**: Seguir mejorando el workflow SDD de forma continua.
- **Pros**: Mejora continua sin barreras.
- **Contras**: Distrae del desarrollo de producto. Sin métricas, las mejoras
  son subjetivas.
- **Por qué se descartó**: El workflow es estable y funcional. Seguir añadiendo
  sin evidencia es optimización prematura.

### Alternativa B: Freeze total sin excepciones

- **Descripción**: No permitir ningún cambio futuro al SDD.
- **Pros**: Máxima estabilidad.
- **Contras**: No permite correcciones necesarias si la plataforma evoluciona.
- **Por qué se descartó**: El freeze debe permitir cambios justificados por
  datos, no bloquear toda evolución.

## 5. Mitigaciones

- El `/sdd-metrics` debe ejecutarse periódicamente para acumular evidencia.
- Si un bug crítico aparece en el workflow SDD, se corrige sin pasar por la
  política de freeze (hotfix).
- Los prompts y comandos SDD en `~/.config/opencode/` pueden recibir
  correcciones de bugs sin violar el freeze.

## 6. Impacto

- **Backend**: Sin impacto directo.
- **Frontend**: Sin impacto directo.
- **SDD Platform**: Congelada. Solo cambios con evidencia.
- **Documentación**: Este ADR es la referencia de la política de freeze.

## 7. Referencias

- ADR-0003: TenantModule split strategy.
- `docs/architecture/sdd-infrastructure.md` §5 — Platform Stability Policy.
- `docs/architecture/sdd-infrastructure.md` §7 — SDD v2.1 Feature Freeze.
- `docs/architecture/CHANGELOG.md` — Architecture changelog.
- Tag `sdd-v2.1-baseline`.
