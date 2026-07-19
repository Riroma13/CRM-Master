# Engineering Templates — CRM-Master

> **Última actualización:** 2026-07-19
> **SDD Version:** v2.1 (Feature Frozen)
> **Propósito:** Directorio canónico de templates de ingeniería reutilizables.

Este directorio contiene los templates de ingeniería utilizados por el pipeline
SDD v2.1. Son parte de la plataforma de ingeniería del proyecto.

---

## Documentos

### `design-enterprise-template.md`

| Campo | Valor |
|-------|-------|
| **Propósito** | Template canónico para todo Design SDD v2.1. Define la estructura exacta de 18 secciones que debe tener un Design. |
| **Cuándo se usa** | Durante la fase **Design** del pipeline SDD. El sub-agente `sdd-design` produce un documento que sigue esta estructura. |
| **Source of truth** | Sí. Es la fuente única para la estructura de un Design. Ningún Design debe omitir secciones definidas aquí. |
| **Relación con SDD v2.1** | Implementa los requisitos de SDD v2.1: Working Set, Read Order, Exploration Budget, Design Confidence, Architecture Review (mandatory), Testing Strategy, Doorbell Tests, ADR decisions, Boundaries, Extensibilidad. |
| **Relación con Feature Freeze** | Este template no modifica el pipeline SDD. Es un documento de guía. Cambios al template requieren evidencia histórica recurrente, igual que cualquier cambio a la plataforma SDD. |

### `design-master-prompt.md`

| Campo | Valor |
|-------|-------|
| **Propósito** | Prompt canónico para invocar al sub-agente `sdd-design`. Contiene las instrucciones exactas que recibe el agente antes de producir un Design. |
| **Cuándo se usa** | Cada vez que el orquestador delega la fase **Design** al sub-agente `sdd-design`. |
| **Source of truth** | No. El source of truth del *contenido* es `design-enterprise-template.md`. Este prompt es el vehículo de invocación. |
| **Relación con SDD v2.1** | Codifica los requisitos de SDD v2.1 en instrucciones ejecutables para el agente. |
| **Relación con Feature Freeze** | Este prompt es parte de la plataforma de ingeniería. Cambios requieren evidencia. No modifica el pipeline. |
| **Placeholders** | Solo 4 valores cambian entre invocaciones: `<SPEC-ID>`, `<TITLE>`, `<OBJECTIVES>`, `<DOCUMENTS>`. Todo lo demás permanece idéntico. |

---

## Relación entre documentos

```
design-master-prompt.md          ← instrucciones para el agente
        │
        ▼
design-enterprise-template.md    ← estructura que debe producir el agente
        │
        ▼
output: Design (<SPEC-ID>.md)   ← documento final que sigue la template
```

1. El orquestador usa `design-master-prompt.md` para invocar al agente.
2. El agente lee `design-enterprise-template.md` como guía estructural.
3. El agente produce el Design reemplazando los placeholders.

---

## Política de evolución

Estos templates son considerados parte de la **plataforma de ingeniería** del
proyecto, al mismo nivel que los prompts SDD, el SDD Doctor y el Metrics
Collector.

**Deben evolucionar solo cuando:**

1. Se hayan observado patrones recurrentes a través de múltiples
   implementaciones archivadas (mínimo ~20).
2. Exista evidencia histórica de que el cambio mejoraría la calidad del Design.
3. Se haya creado un ADR documentando la propuesta y la evidencia.
4. El ADR haya sido aceptado.

**No deben modificarse por:**

- Preferencias personales.
- Modas arquitectónicas.
- Un solo caso aislado.

---

## Relación con SDD v2.1 Feature Freeze

| Aspecto | Estado |
|---------|--------|
| ¿Modifican el pipeline SDD? | **No.** Son documentos de guía y prompt de invocación. |
| ¿Modifican prompts del pipeline? | **No.** El pipeline usa `sdd-design.md` como prompt del agente. Este documento es independiente. |
| ¿Modifican comandos SDD? | **No.** |
| ¿Modifican el workflow? | **No.** Las fases son las mismas: Design → Tasks → Apply → Verify → Archive. |
| ¿Están sujetos al Feature Freeze? | **Sí.** Cualquier cambio a estos templates sigue la misma política que el pipeline SDD: evidencia histórica recurrente, ADR, aprobación. |

---

## Referencias

- `docs/templates/design-enterprise-template.md` — Template de Design enterprise.
- `docs/templates/design-master-prompt.md` — Master prompt para el agente de Design.
- `docs/SDD-WORKFLOW.md` — Documentación del workflow SDD v2.0.
- `docs/architecture/sdd-infrastructure.md` — Documentación de la plataforma SDD.
- `docs/architecture/adr/0004-sdd-feature-freeze.md` — ADR de Feature Freeze.
- `docs/roadmaps/future-roadmap.md` — Roadmap futuro con triggers de revisión.
