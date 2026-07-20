# Prompt Templates

Estos prompts forman parte del estándar SDD v2.1.

No deben modificarse durante el desarrollo de una SPEC.

## Flujo oficial

1. **Design**
2. **Architecture Review**
3. **Design Refinement**

4. **Tasks**
5. **Tasks Review**
6. **Tasks Refinement**

7. **Apply**

   Consiste en 5 fases secuenciales:

   - Phase 1 — Foundation (schema, shared contracts, ADR)
   - Phase 2 — Core Engine (service, storage, module)
   - Phase 3 — Pipeline (preview, virus scan, retention)
   - Phase 4 — Integration (folders, permissions, events)
   - Phase 5 — Testing (unit, integration, doorbell)

   Al finalizar Phase 5 se genera el **Apply Summary** usando
   `apply-summary-template.md`, que consolida las métricas de
   todas las fases sin sustituir los resúmenes individuales.

8. **Verify**
9. **Archive**

El objetivo es mantener consistencia entre SPEC independientemente del modelo utilizado.
