# Design Prompt — SDD v2.1

## Objetivo

Crear el documento **design.md** de una nueva SPEC siguiendo el Enterprise Design Standard.

El Design debe definir la arquitectura, no la implementación.

No generar código.

No generar Tasks.

Esperar siempre al Architecture Review antes de continuar.

---

## Debe incluir obligatoriamente

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
15. Extensibility
16. Interfaces / Contracts
17. Migration Strategy
18. Open Questions

---

## Architecture Review Preparation

El Design debe facilitar posteriormente la revisión arquitectónica.

Debe describir claramente:

- abstracciones
- ownership
- dependencias
- integración
- escalabilidad
- evolución futura

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

Esperar Architecture Review.
