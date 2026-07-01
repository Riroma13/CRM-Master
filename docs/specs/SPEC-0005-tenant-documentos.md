# Spec 0005 — Portal del tenant: documentos

**Spec ID:** `SPEC-0005`
**Estado:** `proposed`
**Autor:** @ricardo
**Fecha:** 2026-07-01
**Área:** `api` | `tenant-web` | `database`

---

## 1. Contexto / Problema

Cada tenant necesita compartir documentos con sus clientes finales: contratos, facturas, informes, modelos fiscales. Hoy esto se maneja por email o compartiendo archivos sueltos. No hay un repositorio centralizado, versionado y con control de acceso por tenant.

El portal del tenant (tenant-web) es la cara visible de CRM-Master para el cliente final. La primera funcionalidad real es la gestión de documentos: subida, listado, descarga segura con tokens expirables (patrón ya validado en BeeHive).

## 2. Objetivo

Permitir que el admin de cada tenant gestione documentos en su portal y que los usuarios finales puedan descargarlos mediante links seguros con expiración controlada.

## 3. Alcance

### 3.1 In-scope

- [ ] Modelo `Documento` en Prisma con tenant_id
- [ ] Endpoint `POST /api/v1/tenant/documentos` — subir documento
- [ ] Endpoint `GET /api/v1/tenant/documentos` — listar documentos del tenant
- [ ] Endpoint `GET /api/v1/tenant/documentos/:id` — detalle de documento
- [ ] Endpoint `PATCH /api/v1/tenant/documentos/:id` — actualizar metadatos
- [ ] Endpoint `DELETE /api/v1/tenant/documentos/:id` — borrado lógico
- [ ] Endpoint `POST /api/v1/tenant/documentos/:id/share` — generar token de descarga expirable
- [ ] Endpoint `GET /api/v1/shared/:token` — descarga pública con token (sin auth)
- [ ] Almacenamiento: local filesystem en `./storage/tenants/{slug}/documentos/`
- [ ] UI en tenant-web: listado de documentos + subida + compartir
- [ ] Validación de tipos y tamaño (por config del tenant)
- [ ] Tests de integración

### 3.2 Out-of-scope

- Almacenamiento en S3/cloud — v2 (local filesystem OK para MVP)
- Versiones de documentos (v2)
- Firma digital / validación de integridad (v2)
- Categorización jerárquica / carpetas (v1.5)
- OCR / búsqueda full-text (v2)
- Notificaciones por email al compartir (v1.5)

## 4. Diseño / Decisión técnica

### Modelo de datos

```prisma
model Documento {
  id           String   @id @default(uuid())
  tenantId     String   @map("tenant_id")
  clienteId    String?  @map("cliente_id")
  filename     String   // Nombre original del archivo
  storageKey   String   @unique @map("storage_key") // Ruta en filesystem
  mimeType     String   @map("mime_type")
  sizeBytes    Int      @map("size_bytes")
  category     String   @default("general") // contrato | factura | informe | modelo | otro
  description  String?
  isDeleted    Boolean  @default(false) @map("is_deleted")
  uploadedBy   String   @map("uploaded_by") // userId
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id])
  shares ShareLink[]

  @@index([tenantId])
  @@index([category])
  @@map("documentos")
}

model ShareLink {
  id           String   @id @default(uuid())
  documentoId  String   @map("documento_id")
  token        String   @unique // hash único para la URL de descarga
  expiresAt    DateTime @map("expires_at") // null = no expira
  maxDownloads Int?     @map("max_downloads") // null = ilimitado
  downloadCount Int     @default(0) @map("download_count")
  createdBy    String   @map("created_by")
  createdAt    DateTime @default(now()) @map("created_at")

  documento Documento @relation(fields: [documentoId], references: [id], onDelete: Cascade)

  @@index([token])
  @@map("share_links")
}
```

### Flujo de descarga con token expirable

```text
[Admin del tenant]                                 [Cliente final]
       │                                                │
       │ POST /documentos/:id/share                      │
       │ { expiresIn: "7d", maxDownloads: 5 }            │
       │                                                │
       │ ← { token: "shr_a1b2c3...", url: "..." }      │
       │                                                │
       │ [Envía link al cliente] ───────────────────────→│
       │                                                │
       │                                   GET /shared/shr_a1b2c3...
       │                                                │
       │                                  ← ¿Token válido?
       │                                     - No expirado
       │                                     - maxDownloads no alcanzado
       │                                     - Documento no borrado
       │                                                │
       │                                  ← 200 + archivo
       │                                     o 410 Gone si expiró
```

### Almacenamiento

```
./storage/tenants/{slug}/documentos/{uuid}/{filename}
```

Configurable via `STORAGE_PATH` env var. En desarrollo, `./storage/`. En producción, volumen Docker montado.

### Consideraciones de seguridad

- Los tokens se generan con `crypto.randomBytes(32).toString('hex')` prefijados con `shr_`
- El link de descarga NO requiere autenticación (es el propósito: compartir con terceros)
- El token se invalida al alcanzar `maxDownloads` o al expirar la fecha
- El delete es lógico: el archivo físico se conserva hasta purge manual
- Los `storageKey` no contienen información del tenant para evitar path traversal
- Validación de tipo MIME y tamaño máximo por tenant (config en `Tenant.config`)

### API endpoints

#### `POST /api/v1/tenant/documentos`

```http
POST /api/v1/tenant/documentos
Authorization: Bearer <tenant_admin_token>
Content-Type: multipart/form-data

Body:
- file: File (max 50MB)
- category: "contrato" | "factura" | "informe" | "modelo" | "otro"
- description: string (opcional)
- clienteId: uuid (opcional)
```

```http
201 Created
{
  "id": "uuid",
  "filename": "modelo-303.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 245760,
  "category": "modelo",
  "createdAt": "2026-07-01T18:00:00Z"
}
```

#### `POST /api/v1/tenant/documentos/:id/share`

```http
POST /api/v1/tenant/documentos/uuid/share
Authorization: Bearer <tenant_admin_token>
Content-Type: application/json

{
  "expiresIn": "7d",
  "maxDownloads": 5
}
```

```http
201 Created
{
  "token": "shr_a1b2c3d4e5f6...",
  "url": "https://asesoria-garcia.crmmaster.com/api/v1/shared/shr_a1b2c3d4e5f6...",
  "expiresAt": "2026-07-08T18:00:00Z",
  "maxDownloads": 5
}
```

#### `GET /api/v1/shared/:token`

```http
GET /api/v1/shared/shr_a1b2c3d4e5f6...
```

```http
200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="modelo-303.pdf"

(binary)
```

Errores:
- `404` token no encontrado
- `410 Gone` token expirado o maxDownloads alcanzado

### UI en tenant-web

```text
app/documentos/
├── page.tsx                 → Listado de documentos
├── components/
│   ├── DocumentList.tsx     → Tabla con fila por documento
│   ├── UploadDialog.tsx     → Modal de subida (drag & drop)
│   ├── ShareDialog.tsx      → Modal para generar link compartible
│   └── DocumentCard.tsx     → Vista móvil en tarjeta
```

## 5. API / Interfaces

### 5.1 Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/v1/tenant/documentos` | Tenant admin | Subir documento |
| `GET` | `/api/v1/tenant/documentos` | Tenant admin | Listar documentos |
| `GET` | `/api/v1/tenant/documentos/:id` | Tenant admin | Detalle |
| `PATCH` | `/api/v1/tenant/documentos/:id` | Tenant admin | Actualizar metadatos |
| `DELETE` | `/api/v1/tenant/documentos/:id` | Tenant admin | Borrado lógico |
| `POST` | `/api/v1/tenant/documentos/:id/share` | Tenant admin | Generar link de descarga |
| `GET` | `/api/v1/shared/:token` | Público | Descargar con token |

### 5.2 Tipos / DTOs

```ts
export const DOCUMENT_CATEGORIES = [
  'contrato', 'factura', 'informe', 'modelo', 'otro',
] as const;

export const UploadDocumentSchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES).default('otro'),
  description: z.string().max(1000).optional(),
  clienteId: z.string().uuid().optional(),
});

export const CreateShareLinkSchema = z.object({
  expiresIn: z.string().regex(/^\d+[dhms]$/, 'Formato: 7d, 24h, 60m, 30s'),
  maxDownloads: z.number().int().positive().max(100).optional(),
});

export interface DocumentDto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  description?: string;
  createdAt: string;
  shareLinks?: ShareLinkDto[];
}

export interface ShareLinkDto {
  id: string;
  token: string;
  url: string;
  expiresAt?: string;
  maxDownloads?: number;
  downloadCount: number;
  createdAt: string;
}
```

## 6. Modelo de datos

Tablas nuevas: `documentos` y `share_links` (ver esquema Prisma en sección 4).

## 7. Tests requeridos

### 7.1 Unitarios

- [ ] `UploadDocumentSchema` valida categoría
- [ ] `CreateShareLinkSchema` parsea `expiresIn` correctamente
- [ ] Generación de token único (no colisiones)
- [ ] Cálculo de expiración desde `expiresIn`

### 7.2 Integración

- [ ] Subir documento → 201 + archivo en filesystem
- [ ] Listar documentos → lista paginada del tenant
- [ ] Subir sin auth → 401
- [ ] Subir desde otro tenant → solo ve sus documentos (test de fuga)
- [ ] Generar share link → 201 + token válido
- [ ] Descargar con token válido → 200 + archivo
- [ ] Descargar con token expirado → 410
- [ ] Descargar con token sin descargas restantes → 410
- [ ] Descargar de documento borrado → 404
- [ ] Borrado lógico → ya no aparece en listado

### 7.3 Seguridad

- [ ] Token de tenant A no permite descargar docs de tenant B
- [ ] Path traversal en filename → sanitizado
- [ ] Tipo MIME validado contra lista permitida
- [ ] Tamaño máximo validado

## 8. Checklist de implementación

- [ ] Spec aprobada
- [ ] Tests escritos y fallando (red)
- [ ] Migración Prisma: tablas `documentos` + `share_links`
- [ ] Servicio de almacenamiento (filesystem local)
- [ ] Servicio de generación de tokens expirables
- [ ] DocumentosController + ShareController
- [ ] UI tenant-web: listado, subida, compartir
- [ ] Tests de fuga multi-tenant en documentos
- [ ] Refactor
- [ ] Cobertura ≥ 80%
- [ ] Commit

## 9. Notas / Preguntas abiertas

- **Límite de tamaño por tenant:** almacenar en `Tenant.config` un `maxStorageMB`. Validar antes de cada subida. Si se excede, rechazar con 413.
- **Purge de documentos borrados:** un script programado (cron en BullMQ) que elimine archivos físicos de documentos en `isDeleted` por más de 30 días.
- **CDN para descargas:** si los archivos son grandes (>10MB), considerar servir las descargas directamente desde el filesystem con streaming para no bloquear el event loop de Node.

## 10. Referencias

- `docs/DESIGN.md` — sección 3 (modelo de datos)
- `docs/specs/SPEC-0002-multi-tenant-isolation-auth.md` — aislamiento multi-tenant
- BeeHive — patrón de tokens expirables ya validado
- `packages/database/prisma/schema.prisma` — modelos existentes
