> ⚠️ **OBLIGATORIO**: toda decisión arquitectónica significativa debe documentarse como ADR basada en esta plantilla.

# ADR-NNNN: [Título corto de la decisión]

- **Número ADR:** ADR-NNNN
- **Fecha:** YYYY-MM-DD
- **Autor:** @autor
- **Estado:** `draft` | `proposed` | `accepted` | `deprecated` | `superseded`

---

## 1. Contexto

Describe la situación que obligó a tomar una decisión. Incluye:

- El problema o la oportunidad.
- Restricciones técnicas, de negocio o de equipo.
- Stakeholders involucrados.
- Decisiones anteriores relacionadas.

## 2. Decisión

Declara la decisión de forma clara y sin ambigüedades. Usa el formato:

> **Decidimos** [qué se decide] **porque** [razón principal], **aceptando que** [consecuencia negativa clave].

## 3. Consecuencias

### Positivas

- Beneficio 1.
- Beneficio 2.
- Beneficio 3.

### Negativas

- Costo o riesgo 1.
- Costo o riesgo 2.
- Costo o riesgo 3.

## 4. Alternativas consideradas

Para cada alternativa descartada:

- Descripción breve.
- Pros y contras.
- Razón por la que no se eligió.

### Alternativa A: [Nombre]

- **Descripción:** ...
- **Pros:** ...
- **Contras:** ...
- **Por qué se descartó:** ...

### Alternativa B: [Nombre]

- **Descripción:** ...
- **Pros:** ...
- **Contras:** ...
- **Por qué se descartó:** ...

## 5. Mitigaciones (si aplica)

Acciones concretas para reducir las consecuencias negativas:

- [ ] Mitigación 1.
- [ ] Mitigación 2.

## 6. Impacto

Indica qué partes del sistema afecta la decisión:

- Backend.
- Frontend.
- Base de datos.
- Infraestructura.
- Seguridad.
- Operaciones.

## 7. Referencias

- Specs relacionadas.
- Documentación externa.
- Issues o discusiones.
- ADRs previas o posteriores que la reemplazan (si está `superseded`).
