# ADR 0001 — Estrategia de Multi-Tenancy y Acceso por Subdominio

## Estado
Aceptado

## Contexto
CRM-Master debe servir a múltiples clientes (tenants) de forma aislada,
segura y escalable, donde cada uno gestiona sus propios documentos, citas
y datos de negocio sin posibilidad de fuga hacia otros tenants. Ricardo
(operador único en v1) necesita además una capa de supervisión transversal
sobre todos los tenants (Mission Control, ver docs/DESIGN.md).

## Decisión

### Aislamiento de datos: Row-level multi-tenancy
Una única base de datos PostgreSQL compartida. Toda tabla que contenga
datos de cliente incluye una columna `tenant_id` (FK a `Tenant`). El acceso
a datos se centraliza mediante un Prisma Client Extension que inyecta
automáticamente el filtro `tenant_id` en cada query, evitando queries
crudas sin scope.

**Alternativas consideradas:**
- *Schema-per-tenant*: un schema PostgreSQL por cliente. Descartado por
 ahora — complica migraciones (N schemas a actualizar), backups y
 pooling de conexiones; solo se justifica con requisitos de compliance
 fuertes por cliente.
- *Database-per-tenant*: aislamiento máximo, pero coste operativo y de
 infraestructura desproporcionado para la fase actual (decenas/cientos
 de tenants, no miles, y sin requisito legal de aislamiento físico).

**Criterio de migración futura**: si un cliente exige aislamiento físico
por contrato/compliance, se evaluará schema-per-tenant para ese cliente
específico (modelo híbrido), no una migración global.

### Resolución de tenant: Subdominio
Cada tenant accede vía `{slug}.crmmaster.com`. La resolución del tenant
activo se realiza por el header `Host` en middleware de NestJS, nunca por
parámetro de URL ni por dato de body sin verificar contra la sesión.

**Alternativas consideradas:**
- *Ruta* (`crmmaster.com/{slug}`): descartado — peor percepción profesional
 de cara al cliente final, mayor riesgo de fuga de sesión entre tenants
 al compartir mismo origin/cookies, dificulta soportar dominios propios
 de cliente en el futuro (CNAME).

**Requisitos de infraestructura:**
- Certificado TLS wildcard `*.crmmaster.com` vía Caddy.
- `slug` de tenant: único, inmutable tras creación, validado contra lista
 de reservados (`www`, `api`, `admin`, `app`, `mail`, etc.).

## Consecuencias
- Toda nueva tabla con datos de cliente debe incluir `tenant_id` desde su
 creación; revisión obligatoria en code review.
- Toda spec que toque datos de tenant debe incluir un test explícito de
 aislamiento (que una query con `tenant_id` A nunca devuelva datos de
 `tenant_id` B).
- El middleware de resolución de tenant por subdominio es un punto único
 de fallo crítico — requiere cobertura de test alta y monitorización.
- Migración a aislamiento más fuerte (schema/DB per tenant) queda abierta
 como evolución por-cliente, no como cambio arquitectónico global.

## Fecha
2026-06-30
