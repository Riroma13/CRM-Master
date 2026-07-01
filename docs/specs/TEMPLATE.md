> ⚠️ **OBLIGATORIO**: toda feature debe tener una spec basada en esta plantilla antes de implementarse.

# [Título de la feature]

**Spec ID:** `SPEC-NNNN` (ej. `SPEC-0001`)
**Estado:** `draft` | `proposed` | `approved` | `implemented` | `deprecated`
**Autor:** @autor
**Fecha:** YYYY-MM-DD
**Área:** `api` | `admin-web` | `tenant-web` | `shared` | `database` | `auth` | `mission-control`

---

## 1. Contexto / Problema

Describe el contexto de negocio y el problema que resuelve esta feature. Incluye:

- Quién la solicita o la necesita.
- Situación actual y por qué es insuficiente.
- Impacto esperado si no se implementa.

## 2. Objetivo

Una o dos frases que resuman qué se quiere lograr. Debe ser medible y delimitado.

> Ejemplo: Permitir a los usuarios con rol `manager` o superior subir documentos asociados a su tenant, con validación de tipo y tamaño.

## 3. Alcance

### 3.1 In-scope (dentro del alcance)

Lista explícita de lo que se implementará:

- [ ] Funcionalidad A.
- [ ] Funcionalidad B.
- [ ] Integración con C.

### 3.2 Out-of-scope (fuera del alcance)

Lista explícita de lo que NO se implementará en esta spec:

- Funcionalidad X (se deja para otra spec).
- Optimización Y.
- Integración Z.

## 4. Diseño / Decisión técnica

Explica cómo se va a implementar. Incluye:

- Flujo general (puede ser texto o diagrama).
- Capas involucradas (API, web, base de datos, colas).
- Consideraciones de seguridad (especialmente multi-tenancy).
- Decisión sobre usar librerías existentes vs nuevas.

```text
[Usuario autenticado] → [Tenant Web]
                            ↓
                     [API: controller]
                            ↓
                     [Service de dominio]
                            ↓
                     [Repository con tenant_id]
                            ↓
                     [PostgreSQL + RLS]
```

## 5. API / Interfaces

### 5.1 Endpoints o funciones expuestas

Para cada endpoint o función pública:

- Método / nombre.
- Ruta o signature.
- Parámetros de entrada (con tipos y validaciones).
- Respuestas exitosas y de error.
- Permisos requeridos.

Ejemplo:

```http
POST /api/v1/tenants/:tenantId/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- title: string (max 500)
- description: string (opcional)
- category: enum document_category
- file: File (max 10MB)
```

```http
201 Created
{
  "id": "uuid",
  "tenant_id": "uuid",
  "title": "...",
  "file_url": "...",
  "status": "draft",
  "created_at": "..."
}
```

### 5.2 Tipos / DTOs / Schemas

Incluye los Zod schemas o DTOs relevantes.

```ts
const CreateDocumentSchema = z.object({
  title: z.string().max(500),
  description: z.string().optional(),
  category: z.enum(['contract', 'invoice', 'report', 'other']),
  file: z.instanceof(File).refine((f) => f.size <= 10 * 1024 * 1024),
});
```

### 5.3 Eventos (si aplica)

Lista eventos de dominio o de cola que se emiten o consumen.

```ts
interface DocumentCreatedEvent {
  tenantId: string;
  documentId: string;
  createdBy: string;
  occurredAt: string;
}
```

## 6. Modelo de datos (cambios)

Enumera las tablas, columnas, índices, relaciones o enums nuevos o modificados. Si no hay cambios, indicar "Sin cambios en el modelo de datos".

> No modificar directamente `docs/DESIGN.md`; usa esta sección para proponer cambios. El merge al documento de diseño se hace en una revisión aparte.

```text
Tabla: documents
- N/A (usa tabla existente)

Nuevo índice:
- documents(tenant_id, status, created_at)
```

## 7. Tests requeridos

### 7.1 Unitarios

- [ ] Test de validación de input con Zod.
- [ ] Test de lógica de dominio pura.
- [ ] Test de mapping/serialización.

### 7.2 Integración

- [ ] Test de endpoint con usuario autenticado.
- [ ] Test de endpoint sin autenticación (debe fallar con 401).
- [ ] Test de filtrado por `tenant_id` (usuario de tenant A no ve datos de tenant B).
- [ ] Test de permisos (usuario sin rol adecuado recibe 403).
- [ ] Test de persistencia en base de datos.

### 7.3 e2e (si aplica)

- [ ] Flujo completo en UI.
- [ ] Caso de error visible para el usuario.

### 7.4 Seguridad

- [ ] Test de RLS si aplica nuevo modelo.
- [ ] Test de inyección / validación de input malicioso.

## 8. Checklist de implementación

- [ ] Spec aprobada.
- [ ] Tests escritos y fallando (red).
- [ ] Implementación mínima (green).
- [ ] Refactor.
- [ ] Lint y formato aplicados.
- [ ] Cobertura ≥ 80%.
- [ ] Commit con Conventional Commit.
- [ ] Actualizar `docs/decisions-log.md` si se requiere ADR.

## 9. Notas / Preguntas abiertas

Espacio para dudas, riesgos o decisiones pendientes.

- ¿Se requiere notificación por email?
- ¿Integración con terceros?
- ¿Límite de uso según plan del tenant?

## 10. Referencias

- `docs/DESIGN.md` — modelo de datos.
- ADRs relacionados.
- Mocks, diseños, o documentos externos.
