# Design: <SPEC-ID> — <TITLE>

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Estado:** Draft
> **Documento de trabajo.** No modifica el pipeline SDD.

---

## 1. Executive Summary

<!--
Propósito: Explicar en 3–5 frases qué se va a hacer, por qué y cómo.

Debe responder:
- ¿Qué problema resuelve?
- ¿Cuál es la solución en una línea?
- ¿Cuál es el impacto esperado?

Ejemplo (no reutilizar):
"El CRM no dispone de un timeline unificado de actividad. Se crea un bounded
context ActivityTimeline con una tabla append-only y un contrato compartido en
packages/shared/. El impacto esperado es eliminar la dispersión actual de
registros de actividad en múltiples tablas y módulos."
-->

<EXECUTIVE_SUMMARY>

## 2. Technical Approach

<!--
Propósito: Describir la estrategia técnica general.

Debe incluir:
- Visión general de la solución
- Mapa de cómo encaja en la arquitectura actual
- Principios de diseño que guían la implementación

Formato: 2–4 párrafos. Sin código.
-->

<TECHNICAL_APPROACH>

## 3. Architecture Decisions

<!--
Propósito: Documentar las decisiones arquitectónicas clave.

Formato: Tabla con opciones, decisión y rationale.

Toda decisión debe incluir:
- **Opción**: ¿Qué alternativas se consideraron?
- **Decisión**: ¿Qué se eligió?
- **Rationale**: ¿Por qué esta opción sobre las otras?

Common mistakes:
- Decidir sin mostrar alternativas descartadas.
- Rationale basado en preferencia personal sin datos.
-->

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| <TOPIC> | <A, B, C> | <CHOSEN> | <WHY> |
| <TOPIC> | <A, B, C> | <CHOSEN> | <WHY> |

## 4. Data Flow

<!--
Propósito: Mostrar visualmente cómo se mueven los datos entre componentes.

Formato: Diagrama ASCII + explicación.

Debe cubrir:
- Flujo feliz (happy path)
- Flujo de error si aplica

Common mistakes:
- Diagramas demasiado complejos o detallados.
- Omitir la fuente del trigger (usuario, sistema, cron).
-->

```
<COMPONENT_A> ──<INPUT>──> <COMPONENT_B> ──<OUTPUT>──> <COMPONENT_C>
     │                            │
     └──── <STORE / QUEUE> ───────┘
```

<DATA_FLOW_EXPLANATION>

## 5. Working Set

<!--
Propósito: Definir el alcance exacto de la implementación para guiar a Apply.

Precisión sobre completitud: es mejor un Working Set pequeño y correcto que
uno grande con suposiciones incorrectas.
-->

### 5.1 Primary Files

<!-- Archivos que casi con certeza requerirán modificaciones. -->

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `<PATH>` | Create / Modify | <WHY> |
| 2 | `<PATH>` | Create / Modify | <WHY> |

### 5.2 Secondary Files

<!-- Archivos que pueden requerir modificaciones. Incluir tests. -->

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `<PATH>` | Create / Modify | <WHY> |

### 5.3 Expected NOT to Change

<!--
Archivos que explícitamente NO deben modificarse.

Esto previene regresiones y protege módulos fuera del alcance.
Ejemplo: app.module.ts si pasa por agregadores, frontend si es solo backend.
-->

- `<PATH>` — <WHY>
- `<PATH>` — <WHY>

## 6. Read Order

<!--
Propósito: Secuencia óptima de lectura de archivos para minimizar exploración
durante Apply.

Cada entrada debe incluir:
- El archivo
- Por qué debe leerse en esa posición

Common mistakes:
- Orden alfabético en lugar de orden de dependencia.
- Incluir archivos que no se van a leer realmente.
-->

1. `<FILE>` — <REASON>
2. `<FILE>` — <REASON>
3. `<FILE>` — <REASON>

## 7. Expected Commands

<!--
Propósito: Listar los comandos que Apply ejecutará. No ejecutar nada aquí,
solo predecir.

Incluir:
- build
- test (por filtro)
- lint
- migrate
- generate

Common mistakes:
- Listar `pnpm test` sin filtro (lento, mejor por módulo).
- Olvidar migraciones o generación de Prisma.
-->

```bash
pnpm --filter <package> <command>    # <purpose>
pnpm --filter <package> <command>    # <purpose>
```

## 8. Design Confidence

<!--
Propósito: Auto-evaluación de cuán completo y correcto es este diseño.

Valores permitidos:
- High: El Working Set cubre >95% de los archivos reales.
- Medium: Hay áreas de incertidumbre acotadas.
- Low: El diseño es exploratorio; varias suposiciones pueden fallar.

Si la confianza no es High, explicar qué información falta y por qué.

Common mistakes:
- Marcar High cuando hay preguntas abiertas sin resolver.
- Marcar Low sin plan de mitigación.
-->

**Confidence:** <High | Medium | Low>

<JUSTIFICATION_IF_NOT_HIGH>

## 9. Exploration Budget

<!--
Propósito: Definir el máximo de exploración esperado para que Verify pueda
detectar desviaciones.

| Recurso | Budget | Notas |
|---------|--------|-------|
| Repo searches (grep/find) | N | ... |
| Files to read | N | ... |
| Files to create | N | ... |
| Files to modify | N | ... |

Common mistakes:
- Subestimar búsquedas (siempre hacer 2-3 más de las esperadas).
- Poner cero en reads cuando hay secondary files.
-->

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | <N> | <CONTEXT> |
| Files to read | <N> | <CONTEXT> |
| Files to create | <N> | <CONTEXT> |
| Files to modify | <N> | <CONTEXT> |

## 10. Risks

<!--
Propósito: Identificar riesgos técnicos y su mitigación.

Formato: Tabla.

Common mistakes:
- Riesgos genéricos ("puede haber bugs") sin mitigación concreta.
- Ignorar riesgos de integración con módulos existentes.
-->

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| <RISK> | High/Med/Low | High/Med/Low | <MITIGATION> |
| <RISK> | High/Med/Low | High/Med/Low | <MITIGATION> |

## 11. Testing Strategy

<!--
Propósito: Definir qué se testea, en qué capa y con qué enfoque.

Formato: Tabla.

Cubrir:
- Unit (servicios, lógica pura)
- Integration (endpoints, base de datos)
- E2E (flujos completos)
- Doorbell (aislamiento multi-tenant)
- Regression (eventos conocidos, contratos)

Common mistakes:
- Tests unitarios sin mocks adecuados.
- Falta de tests de integración para endpoints nuevos.
- No considerar tests de frontera entre tenants.
-->

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit | <WHAT> | <HOW> |
| Integration | <WHAT> | <HOW> |
| Doorbell | <WHAT> | <HOW> |

## 12. Doorbell Tests

<!--
Propósito: Tests de aislamiento multi-tenant obligatorios.

Cada doorbell test prueba una frontera de aislamiento:
- Tenant A no ve datos de Tenant B
- Cliente A no ve datos de Cliente B
- Usuario admin no accede a rutas de client (si aplica)

Formato: Lista con nombre del test y qué prueba.

Common mistakes:
- Omitir doorbell tests en features que tocan datos de tenant.
- Tests que no escriben datos reales en DB antes de leer.
-->

| Test file | What it proves |
|-----------|----------------|
| `<PATH>` | <WHAT> |
| `<PATH>` | <WHAT> |

## 13. Required ADRs

<!--
Propósito: Listar los ADRs que deben crearse o consultarse.

Se requiere ADR cuando:
- Cambio de schema Prisma (AGENTS.md rule 8)
- Decisión arquitectónica significativa
- Cambio en política de datos (retención, privacidad)
- Nuevo bounded context

Formato: Tabla.
-->

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-NNNN | <WHY> | Proposed / Existing |
| ADR-NNNN | <WHY> | Proposed / Existing |

## 14. Boundaries

<!--
Propósito: Definir los límites de cada componente y sus responsabilidades.

Formato: Tabla con componente, responsabilidad, y qué NO hace.

Common mistakes:
- Boundaries ambiguos que permiten acoplamiento.
- No definir qué módulos consumen vs. qué módulos son propietarios.
-->

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `<COMPONENT>` | `<MODULE>` | <WHAT> |
| `<COMPONENT>` | `<MODULE>` | <WHAT> |

## 15. Extensibilidad

<!--
Propósito: Documentar cómo se añadirán capacidades futuras sin rediseño.

Formato: Tabla con feature futura, cómo encaja, esfuerzo estimado.

Common mistakes:
- Prometer extensibilidad sin demostrar el punto de extensión.
- No considerar features futuras conocidas del roadmap.
-->

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| <FEATURE> | <HOW> | Days/Weeks |
| <FEATURE> | <HOW> | Days/Weeks |

---

## Architecture Review (MANDATORY)

<!--
Cada Design DEBE evaluar explícitamente los 7 temas siguientes.

No se acepta un Design que omita esta sección.

Para cada tema, documentar:
- Decisión
- Rationale
- Impacto futuro
- Posibles alternativas
-->

### A. Scalability

**Question:** ¿Cómo escala esta feature con 10× y 100× los datos actuales?

| Factor | 10× | 100× | Mitigation |
|--------|-----|------|------------|
| Storage | <IMPACT> | <IMPACT> | <STRATEGY> |
| Query latency | <IMPACT> | <IMPACT> | <STRATEGY> |
| Write throughput | <IMPACT> | <IMPACT> | <STRATEGY> |
| Memory | <IMPACT> | <IMPACT> | <STRATEGY> |

**Decision:** <SCALABILITY_DECISION>

**Common mistake:** Asumir que "no va a escalar a 100×" sin datos. Si no se puede
probar, documentar la suposición y el plan de monitoreo.

### B. Open/Closed Principle (OCP)

**Question:** ¿La solución permite añadir nuevas capacidades sin modificar el
código existente?

**Point of extension:** <DÓNDE_SE_AÑADE_ALGO_NUEVO>

**What must change to add one more:** <LO_QUE_HAY_QUE_TOCAR>

**Decision:** <OCP_DECISION>

**Common mistake:** Diseñar para OCP abstracto ("es extensible") sin mostrar el
punto de extensión concreto. Demostrar con un ejemplo real.

### C. Ownership

**Question:** ¿Qué bounded context es propietario de cada dato? ¿Qué módulos
solo consumen información?

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| <DATA> | <MODULE> | <MODULES> |
| <DATA> | <MODULE> | <MODULES> |

**Decision:** <OWNERSHIP_DECISION>

**Common mistake:** Ownership implícito (asumir que todos entienden quién es
propietario sin documentarlo explícitamente).

### D. Data Retention

**Question:** ¿Qué datos genera esta feature? ¿Cuánto tiempo viven? ¿Cómo se
archivan o eliminan?

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| <DATA> | <TIME> | <METHOD> | <METHOD> |

**Decision:** <RETENTION_DECISION>

**Common mistake:** No considerar retención hasta que la tabla crece lo
suficiente como para degradar rendimiento. Decidirlo al diseñar.

### E. Idempotency

**Question:** ¿Qué ocurre si la operación se ejecuta dos veces? ¿Existe
protección contra duplicados?

| Operation | Duplicate risk | Protection | Fallback |
|-----------|---------------|------------|----------|
| <OPERATION> | Sí / No | <MECHANISM> | <BEHAVIOR> |

**Decision:** <IDEMPOTENCY_DECISION>

**Common mistake:** Asumir que el cliente o el llamante nunca va a reintentar.
Siempre diseñar para al menos un reintento.

### F. Shared Contracts

**Question:** ¿Existe un contrato compartido entre frontend y backend, o entre
módulos? ¿Debe estar tipado?

| Contract | Location | Consumers | Producers |
|----------|----------|-----------|-----------|
| <TYPE/INTERFACE> | `<PATH>` | `<MODULES>` | `<MODULES>` |

**Decision:** <SHARED_CONTRACT_DECISION>

**Common mistake:** Definir el mismo tipo en frontend y backend por separado
(grietas de sincronización garantizadas).

### G. Partitioning Strategy

**Question:** ¿Será necesario particionar por tenant, por fechas o por volumen?
¿Hay una decisión temprana que facilite el crecimiento sin migration destructiva?

| Dimension | Risk | Strategy |
|-----------|------|----------|
| Tenant | <RISK> | <STRATEGY> |
| Time | <RISK> | <STRATEGY> |
| Volume | <RISK> | <STRATEGY> |

**Decision:** <PARTITIONING_DECISION>

**Common mistake:** Posponer el particionado hasta que es necesario (migration
dolorosa). Decidir la estrategia al diseñar, aunque se implemente después.

---

## 16. Interfaces / Contracts

<!--
Propósito: Definir las interfaces, tipos, DTOs y contratos entre componentes.

Debe incluir:
- TypeScript types o interfaces
- Zod schemas si aplica
- Prisma model si hay cambios de schema
- API contracts (method, path, request/response)

Usar bloques de código. Ser preciso.

Common mistakes:
- Tipos incompletos que cambian durante implementación.
- No incluir el schema de base de datos si hay cambios.
- Contratos de API sin definir códigos de error.
-->

```typescript
// ─── <CONTRACT_NAME> ─────────────────────────────
export interface <NAME> {
  <FIELD>: <TYPE>;
  <FIELD>?: <TYPE>;
}
```

```prisma
// ─── <MODEL_NAME> ────────────────────────────────
model <NAME> {
  <FIELD> <TYPE> @<ATTRIBUTES>
}
```

## 17. Migration Strategy

<!--
Propósito: Definir cómo se despliega el cambio sin downtime.

Debe cubrir:
- Orden de despliegue (schema → backend → frontend)
- Backward compatibility
- Rollback plan
- Feature flags si aplica

Common mistakes:
- Asumir que el despliegue es atómico.
- No considerar que el schema nuevo debe ser compatible con código viejo.
- Rollback plan genérico ("revertir el commit").
-->

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | <STEP> | <RISK> | <ROLLBACK> |
| 2 | <STEP> | <RISK> | <ROLLBACK> |

## 18. Open Questions

<!--
Propósito: Listar preguntas que deben resolverse antes de Apply.

Si una pregunta es bloqueante, marcarla como BLOCKING.
Si está resuelta, moverla a la sección correspondiente y anotar la resolución.

Common mistakes:
- Ocultar preguntas abiertas para que el Design parezca completo.
- Preguntas que quedan abiertas hasta Apply (deberían resolverse en Design).
-->

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | <QUESTION> | Open / Resolved | <RESOLUTION> |
| 2 | <QUESTION> | Open / Resolved | <RESOLUTION> |

---

> **Fin del documento.**
> Este template sigue SDD v2.1. No modifica el pipeline, los prompts ni el workflow.
> Para cambios al template, crear ADR. No modificar directamente.
