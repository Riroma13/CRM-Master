# Tasks Review Prompt — SDD v2.1

## Objetivo

Validar que el plan de implementación respeta completamente el Design.

No revisar el código.

No implementar tareas.

Analizar únicamente tasks.md.

---

## Revisar obligatoriamente

### 1. Phase Ordering

¿Las fases tienen sentido?

¿Hay dependencias invertidas?

---

### 2. Working Set

¿Todos los archivos importantes aparecen?

¿Hay archivos secundarios?

¿Falta alguno?

---

### 3. Dependency Graph

¿Existen dependencias ocultas?

¿Hay ciclos?

¿Puede reducirse el acoplamiento?

---

### 4. Testing Distribution

¿Las pruebas están en la fase adecuada?

¿Faltan Doorbell Tests?

¿Faltan Integration Tests?

---

### 5. Build Checkpoints

¿Cada fase tiene checkpoints suficientes?

---

### 6. Risk Analysis

Evaluar riesgo por fase.

---

### 7. Implementation Effort

¿Las fases están equilibradas?

¿Hay fases demasiado grandes?

---

## Para cada hallazgo

Indicar:

- Severidad

🔴 Blocking

🟡 High

🟢 Minor

- Recomendación

---

## Finalizar siempre con

Summary of Issues

Blocking Issues

Architecture Drift Risk

Final Verdict

Estados permitidos:

- APPROVED
- APPROVED WITH MINOR ADJUSTMENTS
- APPROVED WITH CONDITIONS
- REJECTED

---

No modificar el Design.

Esperar refinamiento de Tasks antes de comenzar Apply.
