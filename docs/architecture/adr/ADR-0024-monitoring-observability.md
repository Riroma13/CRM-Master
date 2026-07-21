# ADR-0024: Monitoring & Observability Stack

- **Número ADR:** ADR-0024
- **Fecha:** 2026-07-20
- **Autor:** @gentle-ai
- **Estado:** `accepted`

---

## 1. Contexto

CRM-Master carece de observabilidad centralizada. No hay dashboards de salud del sistema, métricas de rendimiento por módulo, logs estructurados consultables, ni alertas sobre fallos. Cada módulo maneja errores y logs de forma independiente.

**SLOs objetivo (MVP):**
- API latency P99 < 500ms
- Error rate < 1% de requests totales
- Uptime > 99.9%

Se necesita un stack de observabilidad que proporcione métricas en tiempo real, tracing de requests, logs estructurados, dashboards de rendimiento y alertas configurables.

**Servicios de infraestructura requeridos (no existen actualmente en docker-compose):**

| Servicio | Función | Excepción al feature freeze |
|----------|---------|----------------------------|
| Prometheus | Almacenamiento y consulta de métricas | ADR-0024 granted — infra exception per Platform Baseline |
| Grafana | Dashboards de observabilidad | ADR-0024 granted — infra exception per Platform Baseline |
| AlertManager | Gestión de alertas | ADR-0024 granted — infra exception per Platform Baseline |

**Decisiones anteriores relacionadas:**
- ADR-0004: SDD Feature Freeze Policy
- ADR-0013: Activity Timeline Evolution

**Cambios de schema (AGENTS.md rule #8):** Este ADR cubre los modelos `AlertRule`, `AlertEvent`, `HealthCheckLog`.

---

## 2. Decisiones

### 2.1 Prometheus para métricas

> **Decidimos** usar Prometheus como backend de métricas exponiendo un endpoint `GET /metrics` con `@Public()` en formato Prometheus text, **porque** es el estándar de la industria, tiene soporte nativo en Node.js vía `prom-client`, y se integra directamente con Grafana, **aceptando que** añade un nuevo contenedor en docker-compose y requiere gestión de retención de datos.

### 2.2 Pino para logging estructurado

> **Decidimos** usar `pino` como logger estructurado emitiendo JSON a stdout, **porque** es el logger más rápido de Node.js (~2× más rápido que Winston) y JSON permite parseo estructurado sin esquema fijo, **aceptando que** todos los módulos existentes deben migrarse gradualmente (P0: ObservabilityModule, P1: CoreModule bootstrap, P2: módulos de negocio).

### 2.3 @nestjs/terminus para health checks extendidos

> **Decidimos** usar `@nestjs/terminus` para extender el `HealthModule` existente con indicadores adicionales vía un `HealthService`, **porque** ya está disponible para NestJS y evita crear un nuevo controller o ruta, **aceptando que** el endpoint existente `GET /api/v1/health` debe mantener backward compatibility.

### 2.4 AlertManager para alertas (sin engine custom)

> **Decidimos** usar Prometheus AlertManager nativo para alertas, con reglas definidas en archivos `.rule` de Prometheus (no en base de datos), **porque** AlertManager es el estándar del ecosistema Prometheus y elimina la complejidad de un engine custom, **aceptando que** las reglas de alerta no son configurables por el usuario y requieren deploy de archivos.

### 2.5 Route normalization para cardinalidad controlada

> **Decidimos** implementar un middleware de normalización de rutas que reemplaza UUIDs y números por `:param` antes de registrar labels de métricas, **porque** previene cardinalidad infinita en las series temporales de Prometheus, **aceptando que** requiere cobertura de tests para todos los patrones de ruta conocidos.

---

## 3. Consecuencias

### Positivas

- **Visibilidad centralizada:** Dashboards de salud del sistema, rendimiento por módulo, actividad por tenant, colas BullMQ, errores y latencia.
- **Detección temprana:** Alertas sobre umbrales de error, latencia y capacidad reducen el tiempo de detección de incidencias.
- **Base para SLA/SLOs:** SLIs definidos (latencia P99, error rate, uptime) conducen la recolección de métricas desde el inicio.
- **Stack estándar de la industria:** Prometheus + Grafana + AlertManager + pino es el stack más usado en Node.js.

### Negativas

- **Nuevos contenedores:** Prometheus, Grafana y AlertManager añaden 3 nuevos servicios a docker-compose.
- **Migración de logs:** Todos los módulos existentes deben migrarse gradualmente de `console.log` a pino.
- **Cardinalidad de métricas:** Sin route normalization, las rutas con UUIDs/números generarían series temporales ilimitadas.
- **Almacenamiento adicional:** Prometheus TSDB requiere disco, alert_events y health_check_logs requieren PostgreSQL.

---

## 4. Alternativas Consideradas

### Alternativa A: StatsD + Graphite

- **Descripción:** Usar StatsD para recolectar métricas y Graphite para almacenamiento.
- **Pros:** Más liviano que Prometheus, sin pull model.
- **Contras:** Menos soporte en Node.js, ecosistema más pequeño, sin AlertManager nativo.
- **Por qué se descartó:** Prometheus es el estándar de la industria con mejor soporte en Node.js.

### Alternativa B: Winston (logging)

- **Descripción:** Usar Winston en lugar de pino.
- **Pros:** Más popular, mayor ecosistema de transportes.
- **Contras:** ~2× más lento que pino, mayor consumo de CPU.
- **Por qué se descartó:** Pino es significativamente más rápido y el formato JSON es idéntico.

### Alternativa C: OpenTelemetry desde MVP

- **Descripción:** Implementar OpenTelemetry completo desde el inicio.
- **Pros:** Trazas distribuidas, vendor-neutral.
- **Contras:** Instrumentación compleja, requiere cambios en cada módulo, overhead de rendimiento.
- **Por qué se descartó:** Deferred a v2. MVP se enfoca en métricas y logs.

---

## 5. Mitigaciones

- [x] Route normalization middleware implementado para prevenir cardinalidad de labels.
- [ ] Timeout configurable por health check para evitar falsos positivos.
- [ ] AlertManager grouping y throttling configurados para evitar alertas ruidosas.
- [ ] Monitoreo de tamaño de Prometheus TSDB y rotación configurada.

---

## 6. Impacto

- **Backend:** Nuevo `ObservabilityModule` con metrics controller, interceptor, logging middleware, health service.
- **Base de datos:** 3 nuevas tablas: `alert_rules`, `alert_events`, `health_check_logs`.
- **Infraestructura:** Prometheus + Grafana + AlertManager como nuevos servicios Docker.
- **Dependencias npm:** `prom-client`, `pino`, `@nestjs/terminus`, `pino-pretty`.
- **Seguridad:** `/metrics` es público (`@Public()`). No expone datos de tenant, solo métricas agregadas.
- **Operaciones:** Gestión de reglas de alerta en archivos `.rule`, dashboards provisionados como código.

---

## 7. Referencias

- SPEC-0024: Monitoring & Observability (openspec)
- ADR-0004: SDD Feature Freeze Policy
- Platform Baseline: `docs/architecture/platform-baseline.md`
- Diseño completo: `openspec/changes/SPEC-0024-monitoring/design.md`
