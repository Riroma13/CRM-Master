# Design Prompt — SDD v2.1

## Objetivo

Crear el documento **design.md** de una nueva SPEC siguiendo el Enterprise Design Standard.

El Design debe definir la arquitectura, no la implementación.

No generar código.

No generar Tasks.

Tras generar design.md, DETENERSE. Esperar la fase Architecture Review
antes de continuar a Tasks.

---

## Workflow oficial

```
Design
→ Architecture Review  (fase separada, no parte del documento)
→ Design Refinement    (solo si el review lo requiere)
→ Tasks
→ Tasks Review
→ Tasks Refinement
→ Apply
→ Verify
→ Archive
```

---

## Debe incluir obligatoriamente (18 secciones)

1. Executive Summary
2. Technical Approach
3. Architecture Decisions
4. Data Flow
5. Working Set
6. Read Order
7. Expected Commands
8. Design Confidence
9. Exploration Budget
10. Risks
11. Testing Strategy
12. Doorbell Tests
13. Required ADRs
14. Boundaries
15. Extensibilidad
16. Interfaces / Contracts
17. Migration Strategy
18. Open Questions

---

## Architecture Review Preparation (MANDATORY)

Entre las secciones 15 (Extensibilidad) y 16 (Interfaces / Contracts) se
incluye una sección Architecture Review Preparation que cubre los 7 temas
A–G:

A. Scalability — 10× y 100×: storage, query latency, write throughput
B. Open/Closed Principle — punto de extensión concreto
C. Ownership — bounded context propietario de cada dato
D. Data Retention — lifetime, archive, deletion por entidad
E. Idempotency — protección contra duplicados por operación
F. Shared Contracts — tipos compartidos, ubicación, consumidores
G. Partitioning Strategy — tenant, tiempo o volumen; decisión temprana

**IMPORTANTE:** Esta sección PREPARA el Design para la revisión
arquitectónica. No es la fase Architecture Review en sí misma.

Un Design sin Architecture Review Preparation está INCOMPLETO. Rechazar.

---

## Enterprise Design Standard

Aplicar siempre:

- Multi-tenant first
- Event-driven integration
- Open/Closed Principle
- Dependency Injection
- Shared Contracts
- Ownership único
- Evolución sin breaking changes

---

## Finalización

Generar únicamente:

design.md

El Design completo incluye **Architecture Review Preparation** (A–G)
como sección dentro del documento. Esta preparación es para la fase
**Architecture Review**, que es un paso separado del workflow.

Detenerse aquí.
No continuar a Tasks.
No generar código.

Esperar la fase Architecture Review. Puede requerir Design Refinement.
