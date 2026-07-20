# Tasks Refinement Prompt — SDD v2.1

## Objetivo

Refinar el plan de implementación tras el Tasks Review.

No modificar el Design.

No modificar la arquitectura.

No introducir nuevas funcionalidades.

Aplicar únicamente las recomendaciones del Tasks Review.

---

## Reglas

- Mantener el número de fases salvo que el Review recomiende explícitamente cambiarlo.
- Mantener el Working Set salvo donde el Review indique añadir, eliminar o mover archivos.
- No cambiar el orden de implementación salvo recomendación explícita.
- No modificar abstracciones ni interfaces.
- No alterar la arquitectura aprobada.

---

## Para cada recomendación

Incorporar exactamente la mejora indicada por el Tasks Review.

Ejemplos:

- añadir una task
- mover una task
- ampliar casos de prueba
- documentar una dependencia
- actualizar notas de implementación
- ajustar Working Set

No realizar cambios adicionales.

---

## Finalización

Generar únicamente:

tasks.md refinado

Mostrar un resumen con:

- mejoras incorporadas
- cambios realizados
- confirmación de que el Design permanece inalterado

Esperar Apply Phase 1.
