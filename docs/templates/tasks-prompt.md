# Tasks Prompt — SDD v2.1

## Objetivo

Generar el plan completo de implementación de una SPEC.

No implementar código.

No modificar el Design.

El Tasks debe respetar íntegramente el Design aprobado.

---

## Debe incluir

1. Phase Ordering
2. Working Set por fase
3. Read Order
4. Build Checkpoints
5. Testing Strategy
6. Doorbell Tests
7. Riesgos por fase
8. Dependencias
9. Expected Commands
10. Acceptance Criteria por fase

---

## Reglas

Las fases deben ser independientes siempre que sea posible.

Las dependencias deben ser explícitas.

Cada fase debe poder verificarse mediante Build + Tests.

El Working Set debe ser lo más preciso posible.

No generar código.

---

## Finalización

Generar únicamente:

tasks.md

Esperar Tasks Review antes de comenzar Apply.
