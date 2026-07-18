# ADR 0003 — Estrategia de split del TenantModule en agregadores de segundo nivel

- **Número ADR:** ADR-0003
- **Fecha:** 2026-07-18
- **Autor:** Sistema
- **Estado:** Proposed

---

## 1. Contexto

La refactorización de `app.module.ts` consolidó 38 módulos NestJS en 3 agregadores de primer nivel: `InfrastructureModule`, `CoreModule` y `TenantModule`.

`TenantModule` actualmente importa **21 feature modules** (`tenant-*`) en una lista plana. Aunque está dentro del límite aceptable (<25), esta cantidad presenta señales de alerta tempranas:

- **Scoping difuso**: feature modules de dominios diferentes (CRM, scheduling, comunicaciones, automatizaciones) coexisten sin separación explícita.
- **Acoplamiento cruzado**: `TenantClientesModule` (CRM) depende via `forwardRef` de `TenantAutomationsModule` (automatizaciones), y `TenantAutomationsModule` depende de `TenantWebhooksModule`. Sin una segunda capa que agrupe por contexto acotado, estas relaciones son difíciles de auditar.
- **Fricción futura**: si el número de features sigue creciendo (módulos de RRHH, facturación avanzada, BI), la lista plana superará el umbral de carga cognitiva y generará conflictos de merge entre ramas paralelas.
- **Precedente**: `app.module.ts` ya demostró que una lista plana de módulos es el hot file #1. `TenantModule` sigue el mismo patrón.

### Decisiones relacionadas

- ADR-0001: Estrategia multi-tenant (establece el modelo de datos base).
- ADR-0002: Migración a Better-Auth (no afecta este ADR).

## 2. Decisión

> **Decidimos** documentar hoy la estrategia de split de `TenantModule` en 4 agregadores de segundo nivel por contexto acotado, **pero no implementarla** hasta que se cumplan las condiciones de activación definidas en la regla arquitectónica, **porque** adelantar el split sin presión real de cambio introduce complejidad accidental y desincronización con la estructura actual de módulos, **aceptando que** durante el periodo de gracia la lista plana requerirá coordinación en branches paralelas.

### Agrupación propuesta

```
TenantModule (raíz)
├── TenantCRMModule
│   ├── TenantClientesModule      ← clientes del tenant
│   ├── TenantDashboardModule     ← dashboard del tenant
│   ├── TenantHealthModule        ← health checks del tenant
│   ├── TenantModulesModule       ← activación de módulos
│   ├── TenantPagosModule         ← pagos / facturación
│   ├── TenantPlanesModule        ← planes y suscripciones
│   ├── TenantPresupuestosModule  ← presupuestos / cotizaciones
│   ├── TenantProfileModule       ← perfil del tenant
│   └── TenantSistemasModule      ← sistemas / inventario
│
├── TenantSchedulingModule
│   ├── TenantEventosAcademicosModule  ← calendario académico
│   ├── TenantGoogleCalendarModule     ← sincronización Google Calendar
│   ├── TenantIncidenciasModule        ← incidencias / tickets
│   ├── TenantRecursosModule           ← recursos (profesionales, espacios)
│   └── TenantTareasModule             ← tareas / kanban
│
├── TenantCommunicationModule
│   ├── TenantEmailModule          ← email transaccional
│   ├── TenantEncuestasModule      ← encuestas / feedback
│   └── TenantNotificacionesModule ← notificaciones push/in-app
│
└── TenantAutomationModule
    ├── TenantAutomationsModule    ← motor de automatizaciones
    ├── TenantPlantillasModule     ← plantillas de documentos
    ├── TenantPreferenciasModule   ← preferencias del tenant
    └── TenantWebhooksModule       ← webhooks salientes

Total: 21 feature modules, 4 sub-agregadores, 1 raíz
```

### Regla de navegación de dependencias entre sub-agregadores

Los sub-agregadores **no importan entre sí**. La dependencia `TenantClientesModule → TenantAutomationsModule` (via `forwardRef`) se resuelve a través del grafo de `TenantModule`, que importa todos los sub-agregadores. El día del split, `TenantClientesModule` sigue apuntando directamente a `TenantAutomationsModule` por su ruta — NestJS resuelve `forwardRef` a través del árbol completo.

## 3. Consecuencias

### Positivas

- **Aislamiento por dominio**: cada sub-agregador agrupa feature modules cohesivos, facilitando la navegación mental y el onboarding.
- **Merge conflicts reducidos**: dos ramas tocando distintos contextos (ej. CRM + Scheduling) no tocan el mismo archivo.
- **Preparación para micro-fronteras**: si en el futuro un contexto (ej. Scheduling) necesita escalar independientemente, el split ya está diseñado.
- **Consistencia transversal**: el estándar de composición en 2 niveles se aplica a todos los agregadores del proyecto.

### Negativas

- **Complejidad estructural**: un nivel extra de indirección. De 1 archivo (`tenant.module.ts`) pasamos a 5 (raíz + 4 sub-agregadores).
- **Carga de migración**: mover 21 imports a sus nuevos archivos requiere ~15 minutos de edición mecánica y una verificación de build.
- **Riesgo de acoplamiento incorrecto**: si un feature module se asigna al sub-agregador equivocado, generará dependencias no deseadas. La revisión en code review debe verificar la pertenencia al contexto.

## 4. Alternativas consideradas

### Alternativa A: No hacer nada

- **Descripción**: Mantener `TenantModule` como lista plana indefinidamente.
- **Pros**: Cero trabajo de migración. Sin capa extra de indirección.
- **Contras**: La lista plana seguirá creciendo. Cada nuevo feature toca el mismo archivo. Sin separación de dominios, el acoplamiento cruzado es invisible hasta que duele.
- **Por qué se descartó**: Aceptable hoy, pero insostenible en cuanto el proyecto escale a 30+ módulos de tenant.

### Alternativa B: Split inmediato

- **Descripción**: Ejecutar el split hoy, antes de que sea necesario.
- **Pros**: Estructura limpia desde ahora. Sin deuda técnica acumulada.
- **Contras**: Cambio puramente estructural sin beneficio inmediato. Los 21 módulos actuales aún caben en una pantalla. Adelantar el split antes de que los conflictos de merge ocurran es optimización prematura.
- **Por qué se descartó**: Siguiendo el principio de *You Aren't Gonna Need It* (YAGNI), el split debe activarse por demanda real, no por prevención abstracta.

### Alternativa C: Un solo sub-agregador por dominio funcional

- **Descripción**: En lugar de 4 sub-agregadores, crear 2 muy grandes (CRM+Scheduling, Communication+Automation) para reducir la carpeta de archivos.
- **Pros**: Menos archivos nuevos (3 en lugar de 5).
- **Contras**: Los sub-agregadores grandes siguen sin aislar dominios — el merge conflict entre CRM y Scheduling seguiría existiendo. No resuelve el problema real.
- **Por qué se descartó**: No cumple el objetivo de aislar contextos para permitir trabajo paralelo sin fricción.

## 5. Mitigaciones

- [ ] Monitorear el recuento de feature modules en `TenantModule` después de cada merge de feature nueva.
- [ ] Si dos ramas paralelas modifican `TenantModule` en el mismo sprint, evaluar si la causa raíz es que deberían estar en distintos sub-agregadores.

## 6. Impacto

- **Backend**: Solo NestJS module files. Ningún cambio en controladores, servicios, o lógica de negocio.
- **Frontend**: Sin impacto.
- **Base de datos**: Sin impacto.
- **Infraestructura**: Sin impacto.
- **Seguridad**: Sin impacto.
- **Operaciones**: Sin impacto.

## 7. Referencias

- ADR-0001: Estrategia multi-tenant.
- ADR-0002: Migración a Better-Auth.
- `docs/architecture/module-composition.md` — estándar de módulos de composición.
- `apps/api/src/modules/tenant/tenant.module.ts` — módulo objetivo del split.
