# Tasks: SPEC-0005 — Portal del tenant: documentos

> **Forecast de Review**: ~1000 líneas totales divididas en 4 PRs.
> **Estrategia**: 4 PRs secuenciales — PR1 y PR3 son pequeños (~120 y ~130 líneas), PR2 y PR4 son los pesados (~350 y ~400 líneas).
> **Nota**: `@TenantId()` decorator y `TenantScopeGuard` ya existen (creados en SPEC-0008). No se requiere crearlos.

---

## PR 1: Schema migration + StorageService (~120 líneas)

**Propósito**: Base de datos y almacenamiento físico. Sin endpoints ni lógica de negocio.

### 1.1 Agregar modelos `Documento` y `ShareLink` al schema Prisma

- **Descripción**: Añadir los modelos `Documento` y `ShareLink` al schema Prisma según la spec (sección 4). Ambos modelos llevan `tenant_id` y siguen el naming convention del proyecto (`snake_case` para `@map`, `camelCase` para propiedades).
  - `Documento`: id, tenantId, clienteId (opcional), filename, storageKey (único), mimeType, sizeBytes, category (default "general"), description, isDeleted, uploadedBy, createdAt, updatedAt + relation a Tenant y shares.
  - `ShareLink`: id, documentoId, token (único), expiresAt, maxDownloads, downloadCount (default 0), createdBy, createdAt + relation a Documento con `onDelete: Cascade`.
  - Índices: `@@index([tenantId])`, `@@index([category])` en Documento; `@@index([token])` en ShareLink.
- **Archivos**:
  - `packages/database/prisma/schema.prisma` (MODIFICAR — añadir modelos antes o después del modelo Tarea)
- **Criterio de aceptación**:
  - `Documento` tiene `tenantId` con `@map("tenant_id")` y `@relation` a `Tenant`.
  - `ShareLink` tiene `documentoId` con `@map("documento_id")` y `@relation` a `Documento` con `onDelete: Cascade`.
  - Ambos modelos usan `@@map("documentos")` y `@@map("share_links")` respectivamente.
  - `pnpm --filter database prisma validate` pasa sin errores.
- **Dependencias**: Ninguna (schema propio, no toca modelos existentes).
- **Etiqueta**: `database`

### 1.2 Añadir `Documento` y `ShareLink` a la lista de modelos scopeados

- **Descripción**: En `packages/database/src/index.ts`, añadir `'Documento'` y `'ShareLink'` al array `scopedModels` para que la Prisma Client Extension inyecte automáticamente `tenantId` en las queries. Los `ShareLink` NO tienen `tenantId` directo (se relacionan vía `documentoId`), pero al estar anidados bajo Documento, el scope se aplica en la relación. Para `ShareLink` se usará explícito `where: { documento: { tenantId } }` en las queries que lo requieran — **no añadir `ShareLink` a scopedModels**.
- **Archivos**:
  - `packages/database/src/index.ts` (MODIFICAR — añadir `'Documento'` al array `scopedModels`)
- **Criterio de aceptación**:
  - `scopedModels` incluye `'Documento'`.
  - `ShareLink` NO está en `scopedModels` (no tiene columna `tenantId`).
  - Build de `@crm-master/database` pasa (`pnpm --filter database build`).
- **Dependencias**: 1.1 (schema debe incluir Documento).
- **Etiqueta**: `database`

### 1.3 Crear migración Prisma

- **Descripción**: Ejecutar `pnpm --filter database prisma migrate dev --name add_documentos_share_links` para generar la migración SQL y aplicarla a la base de datos local.
- **Archivos**:
  - `packages/database/prisma/migrations/####_add_documentos_share_links/` (CREADO por Prisma)
- **Criterio de aceptación**:
  - Migración生成 correctamente (archivo SQL revisable).
  - `pnpm --filter database prisma migrate deploy` ejecuta sin errores.
  - Tablas `documentos` y `share_links` existen en PostgreSQL con las columnas correctas.
- **Dependencias**: 1.1 (schema).
- **Etiqueta**: `database`

### 1.4 Crear `StorageService` para filesystem local

- **Descripción**: Servicio NestJS `StorageService` que maneja la persistencia de archivos en el filesystem local. Ruta configurable via `STORAGE_PATH` env var (default `./storage/`). Estructura: `{STORAGE_PATH}/tenants/{slug}/documentos/{uuid}/{filename}`.
  - `upload(file: Express.Multer.File, tenantSlug: string, documentoId: string): Promise<string>` — guarda archivo en disco, retorna `storageKey` (ruta relativa: `tenants/{slug}/documentos/{uuid}/{filename}`).
  - `getStream(storageKey: string): Promise<ReadStream>` — retorna un `ReadStream` del archivo para servir descargas. Lanza `NotFoundException` si no existe.
  - `delete(storageKey: string): Promise<void>` — elimina archivo físico.
  - `getFilePath(storageKey: string): string` — ruta absoluta calculada.
  - Sanitiza el `filename` (elimina `..`, barras, caracteres peligrosos) para evitar path traversal.
  - Crea directorios automáticamente con `fs.mkdirSync({ recursive: true })`.
- **Archivos**:
  - `apps/api/src/modules/documentos/storage.service.ts` (CREAR)
  - `apps/api/src/modules/documentos/` (directorio nuevo)
- **Criterio de aceptación**:
  - `upload()` escribe archivo en disco y retorna `storageKey`.
  - `getStream()` retorna `ReadStream` para archivo existente, lanza `NotFoundException` si no existe.
  - `delete()` elimina archivo físico.
  - Path traversal: filename con `../../etc/passwd` es sanitizado (guiones reemplazan caracteres peligrosos).
  - `STORAGE_PATH` env var se respeta (default `./storage/`).
  - Directorio se crea si no existe.
  - Props: `@Injectable()`, inyectable via constructor.
- **Dependencias**: Ninguna (no toca base de datos ni otros servicios).
- **Etiqueta**: `backend`, `infra`

---

## PR 2: DocumentosModule — CRUD + Share API (~350 líneas)

**Propósito**: Módulo NestJS completo con CRUD de documentos y generación de tokens de descarga.

### 2.1 Crear DTOs y schemas de validación

- **Descripción**: Definir schemas Zod y DTOs para documentos y share links según la spec (sección 5.2).
  - `DOCUMENT_CATEGORIES` constante (contrato, factura, informe, modelo, otro).
  - `UploadDocumentSchema` (Zod): `category` enum default 'otro', `description` string max 1000 opcional, `clienteId` uuid opcional.
  - `UpdateDocumentSchema` (Zod): `category` opcional, `description` opcional.
  - `CreateShareLinkSchema` (Zod): `expiresIn` regex `/^\d+[dhms]$/` (7d, 24h, 60m, 30s), `maxDownloads` int positivo max 100 opcional.
  - `DocumentDto`: id, filename, mimeType, sizeBytes, category, description?, createdAt, shareLinks? (opcional, array de `ShareLinkDto`).
  - `ShareLinkDto`: id, token, url, expiresAt?, maxDownloads?, downloadCount, createdAt.
  - `UploadDocumentDto` (clase para Swagger): compatible con el schema Zod.
- **Archivos**:
  - `apps/api/src/modules/documentos/dto.ts` (CREAR)
- **Criterio de aceptación**:
  - Schemas exportados para uso en controller y pipe.
  - `UploadDocumentSchema` rechaza categoría inválida (ej. `'pdf'` debe fallar).
  - `CreateShareLinkSchema` rechaza `expiresIn` mal formado (ej. `'7x'` debe fallar).
  - `expiresIn` acepta `7d`, `24h`, `60m`, `30s`.
  - `maxDownloads` default `undefined` (opcional).
  - Interfaces exportadas con `@ApiProperty()` para documentación Swagger.
- **Dependencias**: Ninguna (tipos puros, sin dependencias de otros módulos).
- **Etiqueta**: `backend`

### 2.2 Crear `DocumentosService` — CRUD completo

- **Descripción**: Servicio con operaciones CRUD sobre `Documento`, scopeado por `tenantId` explícito usando `prisma.admin` (patrón de `TenantDashboardService`).
  - `create(data, file, tenantId, userId, tenantSlug)`: usa `StorageService.upload()` para guardar archivo, luego crea registro en DB vía `prisma.admin.documento.create()`.
  - `findAll(tenantId, query?)`: lista paginada con filtros opcionales (category, search en filename). Documentos con `isDeleted: false`.
  - `findOne(id, tenantId)`: detalle incluyendo `shareLinks` activos (no expirados). Lanza `NotFoundException` si no existe o no pertenece al tenant.
  - `update(id, tenantId, data)`: actualiza solo metadatos (no archivo). Lanza `NotFoundException` si no encuentra.
  - `remove(id, tenantId)`: borrado lógico (`isDeleted = true`). No elimina archivo físico.
  - `getDocumento(id, tenantId)`: helper interno que lanza `NotFoundException`.
- **Archivos**:
  - `apps/api/src/modules/documentos/documentos.service.ts` (CREAR)
- **Criterio de aceptación**:
  - Inyecta `PrismaService` y `StorageService`.
  - `create` guarda archivo via StorageService + crea registro DB en transacción.
  - `findAll` retorna solo documentos del tenant con `isDeleted: false`.
  - `findOne` incluye `shareLinks` activos (expiresAt > now OR null).
  - `remove` hace update de `isDeleted: true`, no delete físico.
  - Siempre usa `prisma.admin` con `where: { tenantId }` explícito — nunca cliente scopeado.
  - Errores: `NotFoundException` con mensaje descriptivo.
- **Dependencias**: 1.4 (StorageService), 2.1 (DTOs).
- **Etiqueta**: `backend`

### 2.3 Crear `DocumentosController` — CRUD endpoints

- **Descripción**: Controller con 5 endpoints protegidos por `TenantScopeGuard`. Usa `@TenantId()` para extraer el tenantId.
  - `POST /api/v1/tenant/documentos` — subir documento (multipart/form-data con `file` + body). Usa `FileInterceptor` de `@nestjs/platform-express`. Límite 50MB configurable via `MulterModule.register()`.
  - `GET /api/v1/tenant/documentos` — listar documentos del tenant (paginado, con query params `page`, `limit`, `category`, `search`).
  - `GET /api/v1/tenant/documentos/:id` — detalle (incluye shareLinks no expirados).
  - `PATCH /api/v1/tenant/documentos/:id` — actualizar metadatos (category, description).
  - `DELETE /api/v1/tenant/documentos/:id` — borrado lógico.
- **Archivos**:
  - `apps/api/src/modules/documentos/documentos.controller.ts` (CREAR)
- **Criterio de aceptación**:
  - Ruta base: `api/v1/tenant/documentos`.
  - Decorado con `@UseGuards(TenantScopeGuard)` + `@ApiBearerAuth()`.
  - `POST` usa `@UseInterceptors(FileInterceptor('file'))` con `MulterModule.register({ limits: { fileSize: 50 * 1024 * 1024 } })`.
  - `POST` valida body con Zod schema vía pipe personalizado o validación inline.
  - `PATCH` valida body con `UpdateDocumentSchema`.
  - Swagger decorators: `@ApiTags('Tenant - Documentos')`, `@ApiOperation()`, `@ApiConsumes('multipart/form-data')` en POST.
  - Sin lógica de negocio en el controller — solo delega a service.
- **Dependencias**: 2.1 (DTOs), 2.2 (DocumentosService).
- **Etiqueta**: `backend`

### 2.4 Crear `ShareService` — generación y validación de tokens

- **Descripción**: Servicio para gestionar `ShareLink`. No tiene controller propio — es consumido por DocumentosController (compartir) y por SharedModule (validar).
  - `createShareLink(documentoId, tenantId, userId, expiresIn, maxDownloads?)`: valida que el documento exista y pertenezca al tenant. Calcula `expiresAt` desde `expiresIn` (parsea `7d`, `24h`, etc.). Genera token con `crypto.randomBytes(32).toString('hex')` prefijado `shr_`. Crea registro en DB. Retorna `ShareLinkDto` con `url` construida desde `TENANT_DOMAIN` o host.
  - `validateToken(token)`: busca token en DB. Verifica: token existe, no expirado, `downloadCount < maxDownloads` (si maxDownloads no es null), documento no borrado. Si válido, incrementa `downloadCount` y retorna `{ documento, shareLink }`. Si inválido, lanza `NotFoundException` (token no existe) o `GoneException` (expirado/sin descargas).
  - `getActiveLinks(documentoId, tenantId)`: retorna shareLinks activos (no expirados) de un documento.
- **Archivos**:
  - `apps/api/src/modules/documentos/share.service.ts` (CREAR)
- **Criterio de aceptación**:
  - `createShareLink` parsea `expiresIn`: `7d` → +7 días, `24h` → +24 horas, `60m` → +60 min, `30s` → +30 seg.
  - Token generado con prefijo `shr_` + 64 caracteres hex.
  - `validateToken` retorna 410 Gone (`GoneException`) si expiró o no quedan descargas.
  - `validateToken` incrementa `downloadCount` atómicamente en la misma query (usando `update` con `increment`).
  - `validateToken` no permite descargar si el documento padre tiene `isDeleted: true`.
- **Dependencias**: 2.1 (DTOs), 2.2 (DocumentosService para validar pertenencia).
- **Etiqueta**: `backend`

### 2.5 Integrar share endpoint en `DocumentosController`

- **Descripción**: Añadir endpoint `POST /api/v1/tenant/documentos/:id/share` al `DocumentosController` existente. Delega a `ShareService.createShareLink()`.
- **Archivos**:
  - `apps/api/src/modules/documentos/documentos.controller.ts` (MODIFICAR — añadir método)
  - `apps/api/src/modules/documentos/documentos.module.ts` (CREAR — ver 2.6)
- **Criterio de aceptación**:
  - Endpoint retorna `201 Created` con `{ token, url, expiresAt, maxDownloads }`.
  - Protegido por `TenantScopeGuard` (el guard del controller).
  - Solo el tenant propietario puede compartir su documento.
- **Dependencias**: 2.3 (controller), 2.4 (ShareService).
- **Etiqueta**: `backend`

### 2.6 Crear `DocumentosModule` y registrar en AppModule

- **Descripción**: Módulo NestJS que agrupa controller y servicios. Registra `MulterModule` con límite de 50MB. Importa en `AppModule`.
  - `DocumentosModule`: `@Module({ controllers: [...], providers: [DocumentosService, ShareService, StorageService, PrismaService], imports: [MulterModule.register({ limits: { fileSize: 50 * 1024 * 1024 } })] })`.
  - Exporta `ShareService` para ser usado por `SharedModule` (PR3).
- **Archivos**:
  - `apps/api/src/modules/documentos/documentos.module.ts` (CREAR)
  - `apps/api/src/app.module.ts` (MODIFICAR — importar `DocumentosModule`)
- **Criterio de aceptación**:
  - `DocumentosModule` importa `MulterModule` con límite 50MB.
  - `ShareService` está en `exports` del módulo.
  - `AppModule.imports` incluye `DocumentosModule`.
  - Build y lint pasan.
- **Dependencias**: 2.2, 2.3, 2.5 (controller + servicios + share endpoint).
- **Etiqueta**: `backend`

### 2.7 Tests de integración — Documentos CRUD + Share

- **Descripción**: Suite de tests Jest mockeando `PrismaService` y `StorageService`. Sigue el patrón de `tenant-dashboard.service.spec.ts`.
  - **Test 1 — Happy path subida**: Mock de `StorageService.upload()` + `prisma.admin.documento.create()` → retorna `DocumentDto` con datos correctos.
  - **Test 2 — Listar documentos del tenant**: Mock de `findMany` + `count` → retorna lista paginada con solo documentos del tenant.
  - **Test 3 — Subir sin auth**: El guard (`TenantScopeGuard`) rechaza si no hay `tenantId`.
  - **Test 4 — Aislamiento multi-tenant**: Crear doc en tenant A, `findAll(tenantB)` no lo incluye.
  - **Test 5 — Borrado lógico**: `remove()` → `isDeleted: true`; `findAll()` ya no lo retorna.
  - **Test 6 — Generar share link**: `createShareLink()` → retorna token con prefijo `shr_`, `expiresAt` calculado.
  - **Test 7 — Validar token válido**: `validateToken()` retorna documento + shareLink, incrementa `downloadCount`.
  - **Test 8 — Token expirado**: `validateToken()` lanza `GoneException`.
  - **Test 9 — Token sin descargas restantes**: `validateToken()` lanza `GoneException`.
  - **Test 10 — Descargar de documento borrado**: `validateToken()` lanza `NotFoundException`.
  - **Test 11 — Path traversal en filename**: `StorageService` sanitiza `../../malo` → filename seguro.
- **Archivos**:
  - `apps/api/src/modules/documentos/documentos.service.spec.ts` (CREAR)
  - `apps/api/src/modules/documentos/share.service.spec.ts` (CREAR)
  - `apps/api/src/modules/documentos/storage.service.spec.ts` (CREAR)
- **Criterio de aceptación**:
  - `documentos.service.spec.ts`: 5 tests cubriendo create, findAll, isolation, logical delete, update metadata.
  - `share.service.spec.ts`: 4 tests cubriendo create token, validate valid, validate expired, validate exhausted.
  - `storage.service.spec.ts`: 2 tests cubriendo upload, path traversal sanitize.
  - Tests con `@nestjs/testing` `Test.createTestingModule`.
  - Mocks de `PrismaService` con Jest.
  - `StorageService` mockea `fs` con `jest.mock('fs')` o similar.
- **Dependencias**: 2.2, 2.4, 1.4 (servicios a testear).
- **Etiqueta**: `backend`, `tests`

---

## PR 3: SharedModule — Descarga pública con token (~130 líneas)

**Propósito**: Endpoint público (sin auth) para que clientes finales descarguen documentos mediante token expirable.

### 3.1 Crear `SharedController` — descarga pública

- **Descripción**: Endpoint público `GET /api/v1/shared/:token`. Sin guard de tenant (es público por diseño). Usa `ShareService.validateToken()` para verificar el token, luego sirve el archivo via `StorageService.getStream()` con `@Res()` de NestJS para streaming.
  - `GET /api/v1/shared/:token`: valida token, obtiene `ReadStream`, responde con `Content-Type` del mimeType, `Content-Disposition: attachment; filename="..."`.
  - Errores: `404` token no encontrado, `410 Gone` expirado/sin descargas.
  - **Importante**: No expone información del tenant en la respuesta (headers, URL, body).
- **Archivos**:
  - `apps/api/src/modules/shared/shared.controller.ts` (CREAR)
  - `apps/api/src/modules/shared/` (directorio nuevo)
- **Criterio de aceptación**:
  - Ruta: `api/v1/shared/:token` — SIN prefijo `tenant`.
  - Sin `@UseGuards(TenantScopeGuard)` — es público.
  - Usa `@Res({ passthrough: false })` de `@nestjs/common` para enviar el stream.
  - Headers: `Content-Type` desde `documento.mimeType`, `Content-Disposition: attachment; filename="<original_filename>"`.
  - `Cache-Control: no-store` (tokens expirables — no cachear).
  - `404` si token no existe o documento borrado.
  - `410 Gone` si expiró o `downloadCount >= maxDownloads`.
  - No loggea el token ni información del tenant.
- **Dependencias**: 2.4 (ShareService), 1.4 (StorageService).
- **Etiqueta**: `backend`

### 3.2 Crear `SharedModule` y registrar en AppModule

- **Descripción**: Módulo que registra `SharedController` e importa `DocumentosModule` (para acceder a `ShareService` exportado). Registra en `AppModule`.
- **Archivos**:
  - `apps/api/src/modules/shared/shared.module.ts` (CREAR)
  - `apps/api/src/app.module.ts` (MODIFICAR — importar `SharedModule`)
- **Criterio de aceptación**:
  - `SharedModule` importa `DocumentosModule` (para `ShareService`) y provee `SharedController`.
  - `AppModule.imports` incluye `SharedModule` DESPUÉS de `DocumentosModule`.
  - Build y lint pasan.
- **Dependencias**: 3.1 (controller).
- **Etiqueta**: `backend`

### 3.3 Tests de integración — Shared download

- **Descripción**: Tests para el endpoint público de descarga.
  - **Test 1 — Descarga exitosa**: Token válido → 200 + Content-Type correcto + archivo en body.
  - **Test 2 — Token expirado**: `ShareService.validateToken()` lanza `GoneException` → response 410.
  - **Test 3 — Token sin descargas**: `downloadCount >= maxDownloads` → 410.
  - **Test 4 — Token de tenant A para doc de tenant B**: Simular token válido de doc en tenant B → si el share link existe y el token es válido, NO debe filtrar datos de otro tenant en headers/response. El token debe ser válido en sí mismo (el share link puede cruzarse de tenant). Verificar que no se filtra información del tenant en ninguna respuesta.
  - **Test 5 — Token no encontrado**: Token que no existe en DB → 404.
- **Archivos**:
  - `apps/api/src/modules/shared/shared.controller.spec.ts` (CREAR)
- **Criterio de aceptación**:
  - 5 tests usando `@nestjs/testing` con mocks de `ShareService` y `StorageService`.
  - Cubre 200, 404, 410 (expirado), 410 (sin descargas).
  - Test de aislamiento: no filtra datos de tenant.
  - Mock de `Response` de Express para verificar `Content-Type` y `Content-Disposition`.
- **Dependencias**: 3.1, 3.2.
- **Etiqueta**: `backend`, `tests`

---

## PR 4: Frontend UI — Documentos en tenant-web (~400 líneas)

**Propósito**: Páginas y componentes en el portal del tenant para gestionar documentos.

### 4.1 Crear tipos del API client para documentos

- **Descripción**: Definir interfaces TypeScript alineadas con los DTOs del backend en un archivo de tipos compartido.
  - `DocumentResponse`: id, filename, mimeType, sizeBytes, category, description?, createdAt, shareLinks?.
  - `ShareLinkResponse`: id, token, url, expiresAt?, maxDownloads?, downloadCount, createdAt.
  - `CreateShareLinkRequest`: expiresIn, maxDownloads?.
  - `DocumentListResponse`: data (DocumentResponse[]), total, page, limit.
  - `DOCUMENT_CATEGORIES` constante: `['contrato', 'factura', 'informe', 'modelo', 'otro']`.
- **Archivos**:
  - `apps/tenant-web/src/lib/api-types.ts` (CREAR)
- **Criterio de aceptación**:
  - Interfaces reflejan exactamente los DTOs del backend.
  - `DocumentResponse.shareLinks` incluye solo links activos (backend los filtra).
  - Exportadas para uso en hooks y componentes.
- **Dependencias**: Ninguna (tipos puros, aunque conceptualmente derivan de 2.1).
- **Etiqueta**: `frontend`

### 4.2 Crear funciones fetch para documentos

- **Descripción**: Funciones `fetch` para cada endpoint de documentos. Siguen el patrón de `fetchDashboard()` en SPEC-0008.
  - `fetchDocumentos(baseUrl?, params?)`: `GET /api/v1/tenant/documentos?page=&limit=&category=&search=`. Retorna `DocumentListResponse`.
  - `fetchDocumento(id, baseUrl?)`: `GET /api/v1/tenant/documentos/:id`. Retorna `DocumentResponse`.
  - `uploadDocumento(file, data, baseUrl?)`: `POST /api/v1/tenant/documentos` con `FormData` (multipart). Retorna `DocumentResponse`.
  - `updateDocumento(id, data, baseUrl?)`: `PATCH /api/v1/tenant/documentos/:id`. Retorna `DocumentResponse`.
  - `deleteDocumento(id, baseUrl?)`: `DELETE /api/v1/tenant/documentos/:id`.
  - `createShareLink(id, data, baseUrl?)`: `POST /api/v1/tenant/documentos/:id/share`. Retorna `ShareLinkResponse`.
- **Archivos**:
  - `apps/tenant-web/src/lib/api.ts` (CREAR)
- **Criterio de aceptación**:
  - Funciones tipadas con interfaces de `api-types.ts`.
  - `uploadDocumento` usa `FormData` (no JSON) con `Content-Type: multipart/form-data`.
  - `baseUrl` se determina automáticamente desde `window.location.origin` en cliente; acepta override para tests.
  - Incluye credenciales según patrón de auth existente.
  - Errores HTTP lanzan `Error` con mensaje.
- **Dependencias**: 4.1 (types).
- **Etiqueta**: `frontend`

### 4.3 Crear hook `useDocumentos`

- **Descripción**: Hook React para gestionar el estado de documentos (lista, carga, subida, etc.).
  - `useDocumentos()`: retorna `{ documentos, isLoading, error, refetch, upload, remove }`.
  - `useDocumento(id)`: retorna `{ documento, isLoading, error }`.
  - `useCreateShareLink()`: retorna `{ createShareLink, isLoading, link, error }`.
  - Estados: loading, error, success, empty.
  - `refetch` para recargar lista.
- **Archivos**:
  - `apps/tenant-web/src/hooks/use-documentos.ts` (CREAR)
  - `apps/tenant-web/src/hooks/use-documento.ts` (CREAR)
  - `apps/tenant-web/src/hooks/use-create-share-link.ts` (CREAR)
- **Criterio de aceptación**:
  - `useDocumentos` carga al montar, expone `refetch`.
  - `useDocumento` carga por ID al montar.
  - `useCreateShareLink` retorna el link generado para mostrarlo en el diálogo.
  - Manejo de estados loading/error.
  - Sin dependencias externas (solo React + fetch functions).
- **Dependencias**: 4.2 (api).
- **Etiqueta**: `frontend`

### 4.4 Crear `DocumentList` componente

- **Descripción**: Tabla de documentos (desktop) con filas mostrando: nombre, tipo MIME, tamaño, categoría, fecha, acciones (compartir, descargar, eliminar). Versión mobile con cards.
  - Desktop: tabla con `<Table>` de shadcn/ui.
  - Mobile: `<DocumentCard>` (ver 4.7).
  - Cada fila: icono según tipo MIME (PDF → `FileText`, imagen → `Image`, etc.).
  - Tamaño formateado (bytes → KB/MB).
  - Columna acciones: botones "Compartir" (icono `Share2`), "Descargar" (`Download`), "Eliminar" (`Trash2`).
  - Estado vacío: icono + "No hay documentos. Sube tu primer documento."
  - Paginación (botones Anterior/Siguiente).
- **Archivos**:
  - `apps/tenant-web/src/app/documentos/components/DocumentList.tsx` (CREAR)
  - `apps/tenant-web/src/app/documentos/components/` (directorio nuevo)
- **Criterio de aceptación**:
  - Componente `'use client'`.
  - Recibe `documentos: DocumentResponse[]`, `onShare`, `onDownload`, `onDelete` como props.
  - Formato de tamaño: `245760` → `240 KB`.
  - Botón eliminar con confirmación (`confirm()` o diálogo).
  - Estado vacío renderizado cuando array vacío.
  - Responsive: tabla en desktop, cards en mobile (breakpoint `md`).
- **Dependencias**: 4.1 (types).
- **Etiqueta**: `frontend`

### 4.5 Crear `UploadDialog` componente

- **Descripción**: Modal (shadcn `Dialog`) para subir documentos con drag & drop.
  - Área de drop (shadcn `Card` con borde punteado, cambia de color al arrastrar).
  - Selector de archivo nativo como fallback.
  - Selector de categoría (`Select` con las 5 opciones).
  - Campo de descripción opcional (textarea).
  - Selector de cliente opcional (si existe data de clientes).
  - Barra de progreso durante subida.
  - Validación: tipo MIME permitido (PDF, DOCX, XLSX, imágenes, etc.), tamaño máximo 50MB.
  - Botón "Subir" deshabilitado mientras carga.
- **Archivos**:
  - `apps/tenant-web/src/app/documentos/components/UploadDialog.tsx` (CREAR)
- **Criterio de aceptación**:
  - Drag & drop funciona (eventos `onDragOver`, `onDrop`).
  - Validación de tipo: alerta si archivo no es de tipo permitido.
  - Validación de tamaño: alerta si > 50MB.
  - Categoría default `'otro'`.
  - Al subir exitosamente, cierra el diálogo y llama `onUpload` prop.
  - Loading state con spinner/progress mientras sube.
- **Dependencias**: 4.1, 4.2 (api fetch upload).
- **Etiqueta**: `frontend`

### 4.6 Crear `ShareDialog` componente

- **Descripción**: Modal para generar link de descarga compartible.
  - Selector de expiración: `1h`, `24h`, `7d` (default), `30d`.
  - Input opcional de `maxDownloads` (placeholder "Ilimitado" si vacío).
  - Botón "Generar link".
  - Resultado: input de solo lectura con la URL completa, botón "Copiar" (usa `navigator.clipboard.writeText`).
  - Indicador visual de copiado ("✓ Copiado!").
- **Archivos**:
  - `apps/tenant-web/src/app/documentos/components/ShareDialog.tsx` (CREAR)
- **Criterio de aceptación**:
  - Campos con valores default sensibles (`expiresIn: '7d'`, `maxDownloads` vacío = ilimitado).
  - Al generar, muestra URL en input readonly + botón copiar.
  - Feedback visual al copiar (tooltip o texto "Copiado").
  - Cierra con botón "Cerrar" o click fuera.
  - `expiresIn` se envía como string (el backend lo parsea).
- **Dependencias**: 4.1, 4.2 (api fetch share).
- **Etiqueta**: `frontend`

### 4.7 Crear `DocumentCard` componente (mobile)

- **Descripción**: Card para vista móvil con misma info que la tabla pero en vertical.
  - Icono de tipo de archivo (según mimeType).
  - Nombre truncado (`text-ellipsis`).
  - Categoría como badge (`Badge` de shadcn).
  - Tamaño formateado + fecha.
  - Botones de acción en fila (Compartir, Descargar, Eliminar).
- **Archivos**:
  - `apps/tenant-web/src/app/documentos/components/DocumentCard.tsx` (CREAR)
- **Criterio de aceptación**:
  - Renderiza en mobile (< md breakpoint).
  - Nombre truncado con `text-ellipsis overflow-hidden whitespace-nowrap`.
  - Badge de categoría con color según categoría (ej. contrato=blue, factura=green).
  - Acciones inline con iconos.
- **Dependencias**: 4.1 (types).
- **Etiqueta**: `frontend`

### 4.8 Crear página `/documentos`

- **Descripción**: Página principal del módulo documentos. Renderiza `DocumentList`, `UploadDialog`, `ShareDialog`. Maneja estado global de la página (loading, error, empty).
  - Botón "Subir documento" → abre `UploadDialog`.
  - Integración: `useDocumentos()` para datos, dialogs controlados por estado local.
  - Layout: sidebar ya existe (spec lo confirma), la página se renderiza en el área principal.
- **Archivos**:
  - `apps/tenant-web/src/app/documentos/page.tsx` (CREAR)
  - `apps/tenant-web/src/app/documentos/` (directorio nuevo)
- **Criterio de aceptación**:
  - Componente `'use client'`.
  - State local para diálogos: `isUploadOpen`, `isShareOpen`, `shareDocumentId`.
  - Loading state: skeleton de tabla (5 filas animadas).
  - Error state: "Error al cargar documentos" + botón "Reintentar".
  - Empty state: ilustración/icono + "No hay documentos" + botón "Subir primer documento".
  - Al subir un documento exitosamente, cierra diálogo y refresca lista.
  - Al compartir, abre `ShareDialog` para el documento seleccionado.
- **Dependencias**: 4.3 (hooks), 4.4 (DocumentList), 4.5 (UploadDialog), 4.6 (ShareDialog), 4.7 (DocumentCard).
- **Etiqueta**: `frontend`

### 4.9 Tests de componentes frontend

- ** Descripción**: Suite de tests Vitest para componentes y página.
  - **Test 1 — DocumentList render**: Mock con 3 documentos → tabla visible con 3 filas.
  - **Test 2 — DocumentList empty**: Mock con array vacío → mensaje "No hay documentos".
  - **Test 3 — UploadDialog abre/cierra**: Dialog cerrado por defecto → abrir al hacer click → cerrar al cancelar.
  - **Test 4 — UploadDialog valida tipo**: Archivo.exe → muestra error de tipo.
  - **Test 5 — ShareDialog genera link**: Mock de `createShareLink` → URL visible + botón copiar.
  - **Test 6 — Página loading**: Mock de hook con `isLoading: true` → skeleton visible.
  - **Test 7 — Página error**: Mock con `error` → mensaje + botón reintentar.
  - **Test 8 — Página empty**: Mock con `documentos: []` → estado vacío + botón subir.
- **Archivos**:
  - `apps/tenant-web/src/app/documentos/page.test.tsx` (CREAR)
  - `apps/tenant-web/src/app/documentos/components/DocumentList.test.tsx` (CREAR)
  - `apps/tenant-web/src/app/documentos/components/UploadDialog.test.tsx` (CREAR)
  - `apps/tenant-web/src/app/documentos/components/ShareDialog.test.tsx` (CREAR)
- **Criterio de aceptación**:
  - 8 tests total distribuidos entre los 4 archivos.
  - Usa `vitest`, `@testing-library/react`, `@testing-library/jest-dom`.
  - Mock de hooks con `vi.mock('@/hooks/use-documentos')`.
  - Mock de `navigator.clipboard.writeText` para ShareDialog.
- **Dependencias**: 4.4, 4.5, 4.6, 4.8.
- **Etiqueta**: `frontend`, `tests`

---

## Resumen de dependencias entre tareas

```
PR1:
1.1 (schema) ── 1.2 (scoped models)
    └── 1.3 (migration)
1.4 (StorageService)

PR2:
2.1 (DTOs) ── 2.2 (DocumentosService) ── 2.3 (Controller)
    │              │                         └── 2.5 (share endpoint)
    │              └── 2.4 (ShareService) ────┘
    │                                         └── 2.6 (Module + AppModule)
    └── 2.7 (tests) ←── 2.2, 2.4, 1.4

PR3:
2.4 (ShareService) ── 3.1 (SharedController) ── 3.2 (SharedModule + AppModule)
                          └── 3.3 (tests)

PR4:
4.1 (types) ── 4.2 (api fetch) ── 4.3 (hooks) ── 4.8 (page) ── 4.9 (tests)
                              │        │
                              ├── 4.4 (DocumentList) ────┘
                              ├── 4.5 (UploadDialog) ─────┘
                              ├── 4.6 (ShareDialog) ──────┘
                              └── 4.7 (DocumentCard) ─────┘
```

**Orden de PRs**: `PR1 → PR2 → PR3 → PR4`. PR1 y PR2 pueden implementarse secuencialmente en el mismo ciclo si el dev lo prefiere (ambos son backend). PR3 requiere PR2 (especialmente 2.4 ShareService). PR4 requiere PR2 (endpoints funcionando).

---

## Forecast de review workload por PR

| PR | Componente | Archivos | Líneas (est.) | Review complexity |
|----|-----------|----------|--------------|-------------------|
| **PR1** | Schema + scoped models | 2 modified | ~30 | 🟢 Baja — schema conocido, sin lógica |
| | StorageService | 1 new | ~50 | 🟢 Baja — I/O local, testeable |
| | Migration | 1 auto | ~40 | 🟢 Baja — generada por Prisma |
| | **Total PR1** | **3 new + 2 modified** | **~120** | **🟢 Baja** |
| **PR2** | DTOs + schemas | 1 new | ~60 | 🟡 Media — validación Zod |
| | DocumentosService | 1 new | ~90 | 🟡 Media — CRUD estándar |
| | ShareService | 1 new | ~70 | 🟡 Media — tokens expirables + crypto |
| | DocumentosController | 1 new | ~80 | 🟡 Media — multipart + FileInterceptor |
| | Module + AppModule | 1 new + 1 modified | ~15 + 2 | 🟢 Baja |
| | Tests (3 suites) | 3 new | ~120 | 🟡 Media — lógica de tokens requiere casos borde |
| | **Total PR2** | **7 new + 1 modified** | **~350** | **🟡 Media** |
| **PR3** | SharedController | 1 new | ~60 | 🟡 Media — streaming con @Res |
| | SharedModule + AppModule | 1 new + 1 modified | ~10 + 1 | 🟢 Baja |
| | Tests | 1 new | ~60 | 🟡 Media — 410 Gone, 404, streaming |
| | **Total PR3** | **2 new + 1 modified** | **~130** | **🟡 Media** |
| **PR4** | Types + API fetch | 2 new | ~80 | 🟢 Baja |
| | Hooks (3) | 3 new | ~90 | 🟡 Media — estados loading/error |
| | DocumentList + DocumentCard | 2 new | ~80 | 🟡 Media — responsive table/cards |
| | UploadDialog | 1 new | ~70 | 🔴 Alta — drag & drop, validación |
| | ShareDialog | 1 new | ~50 | 🟡 Media — clipboard API |
| | Page /documentos | 1 new | ~60 | 🟡 Media — integración de todos los componentes |
| | Tests (4 suites) | 4 new | ~100 | 🟡 Media — mocks de hooks + fetch |
| | **Total PR4** | **13 new** | **~400** | **🔴 Alta (por cantidad de archivos y coordinación)** |

### Recomendaciones para reviewer

- **PR1**: Revisar que `storageKey` sea único (índice `@unique` en schema) y que `STORAGE_PATH` sea configurable. El resto es boilerplate de Prisma.
- **PR2**: Atención a la sanitización de path traversal y al cálculo de `expiresAt`. El test de fuga multi-tenant (Test 4) es crítico.
- **PR3**: Atención al streaming con `@Res()` — error común es no cerrar el stream o no manejar `NotFoundException` correctamente. Confirmar que no se cachea la respuesta.
- **PR4**: Atención al drag & drop (accesibilidad), validación de tipos MIME en frontend (debe coincidir con backend), y al manejo de errores en la subida (timeout, archivo muy grande).
