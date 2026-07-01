# DESIGN.md — Mission Control (Panel de Supervisión de CRMs de Clientes)

> Documento de diseño v0.1 — Rol: Arquitectura de software + Dirección de proyecto
> Autor del producto: Ricardo
> Propósito de este documento: servir de base funcional/estructural para generar el diseño visual (Google Stitch) y guiar el desarrollo posterior.

---

## 1. Visión del producto

**Mission Control** es el "segundo cerebro" personal de Ricardo para supervisar, organizar y tomar decisiones sobre **todos los CRMs que gestiona para sus clientes** (instancias de BeeHive, herramientas de terceros, o sistemas a medida).

No es un CRM. No reemplaza a BeeHive. Es la **capa de meta-gestión**: el lugar donde se responde a la pregunta *"¿qué tiene configurado cada cliente, qué le falta, y por qué tomé esa decisión?"* sin tener que entrar sistema por sistema ni rebuscar en chats, notas sueltas o memoria.

### Problema que resuelve
- Hoy el conocimiento sobre "qué está implementado en el CRM del cliente X" vive disperso (memoria, chats, commits, notas).
- No hay visibilidad rápida del estado/salud de cada cliente.
- No hay histórico de decisiones ni de qué se le prometió/configuró a cada uno.
- Difícil escalar a más clientes sin perder control.

### Principio de diseño rector
> **"Fuente de verdad simple antes que integración compleja."**
En v1, Ricardo alimenta el estado manualmente (rápido, sin fricción). Las integraciones automáticas con cada CRM externo se posponen a v2, una vez validado el modelo de datos y el flujo de uso real.

---

## 2. Modelo conceptual elegido

Se evaluaron dos enfoques:

| Opción | Descripción | Decisión |
|---|---|---|
| A) Panel admin multi-tenant de BeeHive | Acoplar este panel a la arquitectura interna de BeeHive | ❌ Descartada — limita el alcance a un solo producto y mezcla responsabilidades |
| B) Proyecto independiente "Cliente → Sistema → Inventario" | App standalone, agnóstica del tipo de CRM | ✅ **Elegida** — reutilizable, extensible, no depende del ciclo de vida de BeeHive |

### Entidad central: el **Cliente**
Cada cliente puede tener **uno o varios Sistemas** (ej: un cliente puede tener BeeHive + un Excel de contabilidad que aún no migró). Cada Sistema tiene un **Inventario** de lo que contiene/implementa, y un **registro de eventos/decisiones**.

```
Cliente
 └── Sistema(s) → tipo de CRM, entorno, acceso, estado
 └── Inventario → módulos activos, integraciones, datos que guarda
 └── Bitácora → decisiones, cambios, incidencias, próximos pasos
```

---

## 3. Modelo de datos (entidades)

### 3.1 `Cliente`
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| nombre | string | Razón social / nombre comercial |
| tipo_negocio | enum/string | Ej: asesoría fiscal, ecommerce, otro |
| contacto_principal | string | Nombre + email/teléfono |
| estado_relacion | enum | Activo / En pausa / Cerrado / Prospecto |
| fecha_inicio | date | |
| salud_general | enum | 🟢 Saludable / 🟡 Atención / 🔴 Crítico |
| notas_generales | text | Markdown libre |
| tags | string[] | Ej: "alta prioridad", "factura mensual", "VPS propio" |

### 3.2 `Sistema` (el "CRM" en sí, asociado a un cliente)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| cliente_id | FK | |
| nombre_sistema | string | Ej: "BeeHive — instancia VPS Asesoría García" |
| tipo | enum | BeeHive propio / CRM de terceros / Híbrido / Otro |
| entorno | string | URL, VPS, subdominio DuckDNS, etc. |
| version | string | Versión/commit desplegado si aplica |
| estado_tecnico | enum | 🟢 Operativo / 🟡 Con incidencias / 🔴 Caído / ⚪ En desarrollo |
| fecha_ultimo_chequeo | date | |
| credenciales_ref | string | Referencia a gestor de secretos (NO guardar credenciales en texto) |

### 3.3 `ItemInventario` (qué guarda/implementa ese sistema)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| sistema_id | FK | |
| categoria | enum | Módulo funcional / Integración / Automatización / Dato sensible que gestiona |
| nombre | string | Ej: "Calendario Fiscal (Modelos 303/130/390)" |
| estado | enum | Implementado / Parcial / Planeado / Obsoleto |
| descripcion | text | |
| fecha_implementacion | date | |
| responsable | string | Normalmente Ricardo, pero soporta colaboradores futuros |

### 3.4 `EventoBitacora` (histórico de decisiones/cambios)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| sistema_id | FK | |
| fecha | datetime | |
| tipo | enum | Decisión / Cambio técnico / Incidencia / Reunión / Aprendizaje |
| titulo | string | |
| descripcion | text | Markdown |
| siguiente_accion | string (opcional) | Para convertir en tarea |

### 3.5 `Tarea` (opcional v1.5 — gestión ligera de pendientes)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| cliente_id | FK | |
| sistema_id | FK (opcional) | |
| titulo | string | |
| estado | enum | Pendiente / En curso / Hecho |
| prioridad | enum | Alta / Media / Baja |
| fecha_limite | date (opcional) | |

---

## 4. Pantallas / módulos principales (para diseño en Stitch)

### 4.1 Dashboard general ("Mapa de Clientes")
- Vista en tarjetas o tabla de **todos los clientes**.
- Indicador visual de salud (🟢🟡🔴) y de estado técnico del/los sistemas asociados.
- Filtros: por tag, por estado de relación, por tipo de sistema.
- Buscador rápido.
- Métrica resumen arriba: nº clientes activos, nº con incidencias abiertas, nº tareas pendientes globales.

### 4.2 Ficha de Cliente (detalle)
- Cabecera: nombre, contacto, estado, salud, tags.
- Pestañas o secciones:
 - **Resumen** — notas generales + últimos eventos de bitácora.
 - **Sistema(s)** — lista de sistemas asociados con su estado técnico.
 - **Inventario** — lo que cada sistema tiene implementado, agrupado por categoría.
 - **Bitácora** — timeline cronológico de decisiones/cambios/incidencias.
 - **Tareas** — pendientes asociados a ese cliente.

### 4.3 Vista de Sistema (detalle técnico)
- Datos del entorno (URL, VPS, versión).
- Inventario completo del sistema (tabla filtrable por categoría/estado).
- Historial de incidencias técnicas.

### 4.4 Vista "Inventario global" (transversal)
- Tabla cruzada: qué módulos/funcionalidades están implementados **en qué clientes**.
- Útil para responder "¿a cuántos clientes les falta el módulo X?" o detectar funcionalidades que se repiten y podrían estandarizarse en BeeHive.

### 4.5 Bitácora global / Timeline
- Feed cronológico de todos los eventos de todos los clientes (tipo "actividad reciente").
- Filtrable por cliente, tipo de evento, fecha.

### 4.6 (v1.5+) Tablero de tareas
- Kanban simple: Pendiente / En curso / Hecho, vinculado a clientes/sistemas.

---

## 5. Flujos de usuario clave

1. **Alta de cliente nuevo** → crear Cliente → crear Sistema asociado → registrar inventario inicial.
2. **Revisión rápida semanal** → entrar al Dashboard → identificar clientes en 🟡/🔴 → entrar a su ficha → añadir evento de bitácora con próxima acción.
3. **Auditoría de un sistema** → entrar a Vista de Sistema → revisar inventario completo → marcar módulos obsoletos/pendientes.
4. **Decisión sobre estandarización** → entrar a Inventario global → ver qué módulo se repite en varios clientes → decidir si se lleva como feature core de BeeHive.

---

## 6. Consideraciones técnicas (alto nivel, no bloqueantes para el diseño visual)

- **Stack sugerido** (coherente con tu stack actual de BeeHive): Next.js + Tailwind para el frontend, PostgreSQL + Prisma para datos, despliegue en el mismo VPS con Docker + Caddy.
- **Autenticación**: uso personal — basta con auth simple (single user) en v1; deja la puerta abierta a multi-usuario si en el futuro delegas tareas.
- **Seguridad de credenciales**: el campo `credenciales_ref` nunca almacena secretos directamente — referencia a un gestor de secretos (Vault, Bitwarden, .env protegido), nunca texto plano en la base de datos.
- **Integraciones futuras (v2)**: conectores API/webhook por tipo de sistema para sincronizar estado técnico automáticamente (ej. ping de salud, lectura de versión desplegada).

---

## 7. Roadmap propuesto

| Fase | Alcance | Objetivo |
|---|---|---|
| **v1 — MVP manual** | Dashboard + Ficha de Cliente + Inventario + Bitácora (CRUD manual) | Validar el modelo de datos y el hábito de uso |
| **v1.5** | Tareas/Kanban + Inventario global transversal | Convertir el panel en herramienta de gestión activa, no solo consulta |
| **v2** | Conectores reales (lectura de estado desde BeeHive y otros sistemas vía API) | Reducir el mantenimiento manual |
| **v2.5** | Alertas automáticas (ej: sistema caído, cliente sin actividad reciente) | Pasar de reactivo a proactivo |

---

## 8. Próximos pasos inmediatos

1. Validar este modelo de datos contigo (ajustes de campos/entidades).
2. Generar el diseño visual de las pantallas de la sección 4 con Stitch, usando este documento como prompt base.
3. Definir nombre definitivo del proyecto (placeholder: "Mission Control").
4. Maquetar el esquema Prisma a partir de la sección 3.
