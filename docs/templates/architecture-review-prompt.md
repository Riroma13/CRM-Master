# Architecture Review Prompt — SDD v2.1

## Objetivo

Intentar romper la arquitectura antes de comenzar Tasks.

No validar automáticamente el diseño.

Buscar debilidades arquitectónicas.

---

## Revisar obligatoriamente

1. Abstracciones
2. Dependencias
3. Ownership
4. Pipeline de datos
5. Escalabilidad
6. Multi-tenant
7. Event-driven
8. Shared Contracts
9. Evolución futura
10. Compatibilidad con SPEC anteriores

---

## Revalidar siempre

### A. Scalability

### B. Open/Closed Principle

### C. Ownership

### D. Data Retention

### E. Idempotency

### F. Shared Contracts

### G. Partitioning Strategy

---

## Para cada hallazgo

Indicar:

- Severidad

🔴 Blocking

🟡 High

🟢 Nice to have

- Esfuerzo aproximado

- Recomendación concreta

---

## Finalizar siempre con

Architecture Verdict

Estados permitidos:

- APPROVED
- APPROVED WITH CONDITIONS
- REJECTED

---

No generar Tasks.

Esperar refinamiento del Design.
