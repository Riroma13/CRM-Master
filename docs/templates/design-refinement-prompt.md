# Design Refinement Prompt — SDD v2.1

## Objetivo

Refinar el Design tras el Architecture Review.

No rediseñar la arquitectura.

No generar Tasks.

Aplicar únicamente las condiciones y recomendaciones del Architecture Review.

---

## Reglas

- Mantener la arquitectura aprobada.
- No modificar el alcance de la SPEC.
- No introducir funcionalidades nuevas salvo que sean consecuencia directa del Review.
- No alterar el Working Set.
- No cambiar el orden de implementación previsto.
- Mantener las abstracciones y contratos existentes salvo recomendación explícita.

---

## Para cada recomendación

Incorporar exactamente la mejora indicada por el Architecture Review.

Ejemplos:

- completar una abstracción
- añadir una interfaz
- documentar una estrategia
- resolver una Open Question
- definir un ciclo de vida
- documentar ownership
- documentar integración
- documentar políticas de seguridad
- documentar límites funcionales

No realizar cambios adicionales.

---

## Validaciones

Comprobar que tras el refinamiento:

- No existen condiciones bloqueantes pendientes.
- La arquitectura sigue respetando el Enterprise Design Standard.
- El Design continúa siendo coherente con las SPEC anteriores.

---

## Finalización

Generar únicamente:

design.md refinado

Mostrar un resumen con:

- mejoras incorporadas
- decisiones añadidas
- confirmación de que la arquitectura permanece inalterada

Esperar Tasks.
