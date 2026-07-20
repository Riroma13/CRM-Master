# Architecture Decisions

## Overview

La Communication Platform centraliza todos los canales de comunicación saliente
bajo una misma abstracción. Las decisiones clave giran en torno a desacoplar
los proveedores del motor de envío, garantizar la seguridad de webhooks y
plantillas, y permitir escalado futuro mediante colas.

## Decisions

### AD-001 — CommunicationProvider Abstraction

**Status:** Accepted

**Context**

Cada proveedor de comunicación (SendGrid, Twilio, SMTP) tiene su propia API,
mecanismo de firma de webhooks y formato de respuesta. El motor de
comunicaciones no debe conocer estas diferencias.

**Decision**

Se creó la interfaz `CommunicationProvider` que todos los proveedores
implementan. Cada proveedor encapsula su propia lógica de envío y verificación
de firmas (`verifyWebhookSignature`). El `ProviderRegistry` descubre
proveedores mediante inyección de dependencias.

**Alternatives Considered**

- Integración directa con cada proveedor desde CommunicationService
- Abstracción única genérica con type discriminator

**Consequences**

Positivas: Añadir un nuevo proveedor requiere solo implementar la interfaz y
registrarla en el módulo. El motor no cambia.

Negativas: Cada proveedor duplica lógica común (timeouts, retries).

**Future Evolution**

Cuando haya más de 10 proveedores, considerar un `CommunicationProviderDecorator`
para concerns transversales (logging, métricas, rate limiting).

### AD-002 — ProviderSelectionStrategy

**Status:** Accepted

**Context**

Un mismo canal (ej. email) puede tener múltiples proveedores configurados
(SendGrid como primary, Resend como fallback). La selección debe ser
configurable por tenant sin cambiar código.

**Decision**

Se creó `ProviderSelectionStrategy` con `ChannelProviderConfigStore`. La
configuración se lee de `tenant.config` con prioridades. Si no hay config,
se usa el primer proveedor registrado para ese canal.

**Alternatives Considered**

- Selección fija (1 canal = 1 proveedor)
- Round-robin entre proveedores del mismo canal

**Consequences**

Positivas: Cada tenant puede tener su propia configuración de proveedores.
Fallback automático si el primary falla.

Negativas: La configuración en `tenant.config` no tiene validación de schema.

**Future Evolution**

Mover la configuración a una tabla dedicada `channel_providers` con validación
Zod y UI de administración.

### AD-003 — SecureTemplateRenderer

**Status:** Accepted

**Context**

Las plantillas de mensajes contienen variables del usuario que deben renderizarse
de forma segura. Handlebars permite acceso a prototipos y objetos globales si no
se configura correctamente.

**Decision**

Se implementó `SecureTemplateRenderer` con lista blanca de propiedades
permitidas y helpers aprobados. El método `validateTemplate()` rechaza patrones
peligrosos (`__proto__`, `constructor`, `globalThis`) antes de cualquier
renderización.

**Alternatives Considered**

- Handlebars sin restricciones
- Sustitución manual de variables sin motor de templates

**Consequences**

Positivas: Sin acceso a prototipos, sin fuga de variables globales.

Negativas: Solo un subconjunto de variables está disponible. Las templates no
pueden usar lógica condicional avanzada.

**Future Evolution**

Añadir un sistema de helpers personalizados registrables por el administrador
del tenant cuando se necesite lógica condicional.

### AD-004 — Rate Limiting por (tenantId, providerId)

**Status:** Accepted

**Context**

Sin rate limiting, un tenant puede agotar la cuota de un proveedor compartido,
afectando a todos los demás tenants (problema del noisy neighbour).

**Decision**

La clave de rate limiting es `rate:{tenantId}:{providerId}`, no global por
proveedor. Sliding window de 1 minuto con límite configurable (default 100).

**Alternatives Considered**

- Rate limiting global por proveedor
- Rate limiting por tenant sin distinguir proveedor

**Consequences**

Positivas: Aislamento completo entre tenants. Justo y predecible.

Negativas: Mayor número de ventanas en memoria (O(tenants × providers)).

**Future Evolution**

Migrar a Redis cuando el número de tenants supere 100 para ventanas
compartidas entre instancias.
