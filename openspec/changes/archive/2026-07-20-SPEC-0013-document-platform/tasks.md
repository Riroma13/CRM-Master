# Tasks: SPEC-0013 — Document Management Platform

> **Basado en:** Design APPROVED WITH CONDITIONS (8 improvements incorporated)
> **SDD v2.1 — Enterprise Design Standard**
> **Platform Baseline:** sdd-v2.1-baseline
> **Fecha:** 2026-07-20

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1500–2000 |
| 400-line budget risk | **High** |
| Chained PRs recommended | **Yes** |
| Suggested split | PR1 Foundation → PR2 Storage → PR3 Pipeline → PR4 Integration → PR5 Testing |
| Delivery strategy | `stacked-to-main` |
| Chain strategy | `stacked-to-main` |

---

## Phase 1: Foundation — Schema, Shared Contracts, ADR

**Objetivo:** Crear la base de datos, los contratos compartidos de Document
Management y el ADR-0009.

**Dependencias:** Ninguna.

**Riesgo:** Bajo. Cambios aditivos. No afectan módulos existentes.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 1.1 | ADR-0009: Document Management Platform Architecture | `docs/architecture/adr/0009-document-platform.md` | ADR creado documentando la arquitectura de almacenamiento, versionado, preview pipeline, retention y virus scanning | Documental |
| 1.2 | Add document tables to Prisma schema | `packages/database/prisma/schema.prisma` | Modelos `DocumentFolder`, `Document`, `DocumentVersion`, `DocumentTrash`. Unique constraints. Indexes en `(tenantId, folderId)`, `(tenantId, isDeleted)`, `(documentId, versionNumber)`. | Schema |
| 1.3 | Create DocumentStorage interface | `packages/shared/src/document/storage.interface.ts` | `DocumentStorage` con `store()`, `retrieve()`, `delete()`, `getSignedUrl(operation)`. `StorageOperation` type: READ, WRITE, DELETE. | Shared |
| 1.4 | Create document types | `packages/shared/src/document/document.types.ts` | `DocumentMetadata`, `FolderNode`, `UploadLimits`, `DocumentEvent`, `DocumentStatus` (scanning, stored, quarantined, deleted). | Shared |
| 1.5 | Create VirusScanner interface | `packages/shared/src/document/virus-scanner.interface.ts` | `VirusScanner` con `scan(file, fileName)`, `ScanResult` (clean, virusName, scannedAt). | Shared |
| 1.6 | Create DocumentPreviewConverter interface | `packages/shared/src/document/preview-converter.interface.ts` | `DocumentPreviewConverter` con `convert(file, mimeType)`, `PreviewResult` (pages, format, storageKey). | Shared |
| 1.7 | Create re-export | `packages/shared/src/document/index.ts`, `packages/shared/src/index.ts` | Export all document modules. `tsc --noEmit` passes. | Shared |

**Expected Commands:**
```bash
pnpm --filter database prisma validate
pnpm --filter shared tsc --noEmit
```

**Acceptance Criteria:**
- [ ] `prisma validate` pasa con los 4 nuevos modelos
- [ ] `tsc --noEmit` en `packages/shared` sin errores
- [ ] ADR-0009 creado
- [ ] `DocumentStorage` interfaz con `getSignedUrl(operation: StorageOperation)`
- [ ] `StorageOperation` type con READ, WRITE, DELETE

---

## Phase 2: Core Engine — Storage, Service, Module

**Objetivo:** Implementar el motor central de Document Management: `DocumentService`,
`DocumentStorage` abstraction, `LocalStorageProvider`, `S3StorageProvider`, y
el módulo NestJS.

**Dependencias:** Phase 1 (shared contracts)

**Riesgo:** Medio. LocalStorageProvider debe ser funcional en desarrollo.
S3StorageProvider requiere credenciales AWS.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 2.1 | Implement LocalStorageProvider | `apps/api/src/modules/document-engine/storage/local-storage.provider.ts` | Implementa `DocumentStorage`. Archivos almacenados en `/storage/{tenant}/{documentId}/{versionId}`. `getSignedUrl(READ)` genera URL con token efímero. `getSignedUrl(WRITE)` genera URL de upload. `getSignedUrl(DELETE)` requiere permiso admin. | Storage |
| 2.2 | Implement S3StorageProvider | `apps/api/src/modules/document-engine/storage/s3-storage.provider.ts` | Implementa `DocumentStorage`. Archivos en `s3://crm-master/{tenant}/{documentId}/{versionId}`. `getSignedUrl()` usa `@aws-sdk/s3-request-presigner`. | Storage |
| 2.3 | Implement DocumentService | `apps/api/src/modules/document-engine/document.service.ts` | `upload()`: valida tamaño, MIME, magic bytes. Crea documento (SCANNING). Llama a VirusScanner. Si clean → STORED. Crea version con `versionNumber = MAX+1`. `download()`: verifica permiso, genera signed URL. `delete()`: soft delete + trash. `list()`: filter by folder, tags, status. | Service |
| 2.4 | Implement upload validation | `apps/api/src/modules/document-engine/upload-validator.ts` | `validate(file, tenantId)`: verifica `maxFileSizeBytes`, `allowedMimeTypes`, magic bytes vs declared MIME. Lanza error si no pasa. | Service |
| 2.5 | Implement DocumentController | `apps/api/src/modules/document-engine/document.controller.ts` | `POST /api/v1/documents/upload`, `GET /api/v1/documents/:id/download`, `DELETE /api/v1/documents/:id`, `GET /api/v1/documents`, `POST /api/v1/documents/:id/versions`, `GET /api/v1/documents/:id/versions`. | Controller |
| 2.6 | Implement DocumentPermissionGuard | `apps/api/src/modules/document-engine/guards/document-permission.guard.ts` | NestJS guard. Protege lectura, descarga, edición, borrado. Verifica herencia de carpetas. Dependencia: inyecta `FolderService` para resolver permisos heredados (solo lectura). La autorización continúa centralizada en el guard. Scoped por tenant. | Security |
| 2.7 | Implement DTOs | `apps/api/src/modules/document-engine/dto.ts` | `UploadSchema`, `DocumentQuery`, `VersionListQuery`. Validación Zod. | DTO |
| 2.8 | Implement DocumentEngineModule | `apps/api/src/modules/document-engine/document-engine.module.ts` | Wire service, controller, storage providers, guards, pipeline. | Wiring |

**Expected Commands:**
```bash
pnpm --filter api lint
pnpm turbo build --filter=api
```

**Acceptance Criteria:**
- [ ] LocalStorageProvider store/retrieve/delete/getSignedUrl funcional
- [ ] S3StorageProvider implementado (puede requerir credenciales)
- [ ] DocumentService.upload() valida tamaño, MIME, magic bytes
- [ ] DocumentService.upload() crea versión con `versionNumber = MAX+1`
- [ ] DocumentController endpoints funcionales
- [ ] DocumentPermissionGuard protege todos los endpoints
- [ ] Build pasa

---

## Phase 3: Pipeline — Preview, Virus Scan, Retention

**Objetivo:** Implementar la preview pipeline, virus scanning, retention policies
y el job de limpieza de cuarentena.

**Dependencias:** Phase 2 (DocumentService, storage)

**Riesgo:** Medio. Preview pipeline requiere LibreOffice container para Office docs.
Virus scanning requiere ClamAV container.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 3.1 | Implement PreviewPipeline | `apps/api/src/modules/document-engine/preview/preview-pipeline.ts` | Pipeline asíncrono via BullMQ. Worker recibe documentId + versionId. Para imágenes: thumbnail JPEG 800px. Para PDF: preview de primera página PNG. Para Office: LibreOffice Headless → PDF → Preview Pipeline. Resultados en Preview Storage (`.previews/`). TTL configurable (default 7 días). | Preview |
| 3.2 | Implement PreviewStorage | `apps/api/src/modules/document-engine/preview/preview-storage.ts` | Misma tecnología que DocumentStorage pero en prefix `.previews/`. Cache TTL configurable. Purge job diario. | Preview |
| 3.3 | Implement ClamAvScanner | `apps/api/src/modules/document-engine/virus-scanning/clamav-scanner.ts` | Implementa `VirusScanner`. Conexión a `clamav-rest` container. Scan asíncrono post-upload. Documento en estado `scanning` hasta resultado. | Security |
| 3.4 | Implement MockScanner | `apps/api/src/modules/document-engine/virus-scanning/mock-scanner.ts` | Implementa `VirusScanner` para dev/test. Siempre retorna clean. | Security |
| 3.5 | Implement quarantine lifecycle | `apps/api/src/modules/document-engine/virus-scanning/quarantine-service.ts` | Documentos infectados: status `quarantined`, archivo retenido 30 días. Purge automático via BullMQ job diario. | Security |
| 3.5b | Implement quarantine notifier | `apps/api/src/modules/document-engine/virus-scanning/quarantine-notifier.ts` | Publica evento `document.quarantined` cuando un documento entra en cuarentena. ActivityTimeline consume el evento. Preparado para futuras notificaciones al usuario (email, in-app). Integración puramente event-driven. | Security |
| 3.6 | Implement RetentionService | `apps/api/src/modules/document-engine/retention/retention-service.ts` | Job diario que purga documentos en trash con `expiresAt < NOW()`. Elimina storage files. Opcional: retention policy por tenant. | Retention |

**Expected Commands:**
```bash
pnpm --filter api test document-engine
pnpm turbo build --filter=api
```

**Acceptance Criteria:**
- [ ] PreviewPipeline genera preview de imágenes, PDFs y Office docs
- [ ] PreviewStorage cachea con TTL configurable
- [ ] ClamAvScanner detecta archivos infectados (o mock)
- [ ] QuarantineService retiene infectados 30 días + purge
- [ ] RetentionService purga trash expirado
- [ ] Todos los pipelines son asíncronos (BullMQ)

---

## Phase 4: Integration — Folders, Permissions, Event Handlers, Wiring

**Objetivo:** Implementar el modelo de carpetas, permisos con herencia, event
handlers para SearchModule y ActivityTimeline, y la integración con
CommunicationModule via DocumentAttachmentResolver.

**Dependencias:** Phase 2 (service, controller, guard)

**Riesgo:** Bajo. Los patrones de eventos y contratos compartidos están
establecidos en SPEC-0010, 0011 y 0012.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 4.1 | Implement FolderService | `apps/api/src/modules/document-engine/folder.service.ts` | CRUD de carpetas con jerarquía padre-hijo. Validación de profundidad máxima (5 niveles). `getPath(folderId)`: ruta completa computada con CTE. | Folders |
| 4.2 | Implement FolderController | `apps/api/src/modules/document-engine/folder.controller.ts` | `POST/GET/PATCH/DELETE /api/v1/documents/folders`. `GET /api/v1/documents/folders/tree`: árbol completo del tenant. | Controller |
| 4.3 | Implement permission inheritance | `apps/api/src/modules/document-engine/permissions/permission-inheritance.ts` | Herencia de carpetas: permiso definido en carpeta, propagado a hijos. Override explícito por documento. Roles: owner, editor, viewer. | Permissions |
| 4.4 | Implement event handlers | `apps/api/src/modules/document-engine/document.event-handlers.ts` | `@OnEvent('document.uploaded')`: envía a SearchModule.index(). `@OnEvent('document.deleted')`: SearchModule.remove(). `@OnEvent('document.versioned')`: actualiza SearchModule. | Events |
| 4.5 | Implement DocumentAttachmentResolver | `apps/api/src/modules/document-engine/document-attachment-resolver.ts` | Resuelve documentId → contenido (o signed URL) para CommunicationModule. CommunicationModule nunca accede directamente al StorageProvider. | Integration |
| 4.6 | Wire CoreModule | `apps/api/src/modules/core/core.module.ts` | Import `DocumentEngineModule` | Wiring |

**Expected Commands:**
```bash
pnpm --filter api lint
pnpm turbo build --filter=api
```

**Acceptance Criteria:**
- [ ] FolderService CRUD + tree + depth validation
- [ ] Permission inheritance: folder parent → child → document
- [ ] Event handlers: document.uploaded/deleted/versioned → SearchModule
- [ ] DocumentAttachmentResolver: documentId → signed URL
- [ ] CoreModule imports DocumentEngineModule

---

## Phase 5: Testing — Unit, Integration, Doorbell

**Objetivo:** Completar la cobertura de tests.

**Dependencias:** Phases 1–4

**Riesgo:** Medio. Doorbell tests requieren base de datos real.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 5.1 | StorageProvider tests | `apps/api/src/modules/document-engine/storage/__tests__/*.spec.ts` | `store()`, `retrieve()`, `delete()`. `getSignedUrl(READ)` autorizado y denegado. `getSignedUrl(WRITE)` autorizado y denegado. `getSignedUrl(DELETE)` autorizado y denegado. Expiración de URLs. Permisos según operación. Ambos providers. | Testing |
| 5.2 | DocumentService tests | `apps/api/src/modules/document-engine/document.service.spec.ts` | `upload()` con validación. VersionNumber incremental. Soft delete. Trash lifecycle. | Testing |
| 5.3 | UploadValidator tests | `apps/api/src/modules/document-engine/upload-validator.spec.ts` | File size exceeded. MIME not allowed. Magic byte mismatch. Valid file passes. | Testing |
| 5.4 | DocumentPermissionGuard tests | `apps/api/src/modules/document-engine/guards/__tests__/document-permission-guard.spec.ts` | Folder inheritance. Override por documento. Cross-tenant denial. | Testing |
| 5.5 | FolderService tests | `apps/api/src/modules/document-engine/folder.service.spec.ts` | CRUD. Tree. Max depth. Parent validation. | Testing |
| 5.6 | QuarantineService tests | `apps/api/src/modules/document-engine/virus-scanning/__tests__/quarantine-service.spec.ts` | Infectado → quarantined. Purge after 30 days. Restore before purge. | Testing |
| 5.7 | RetentionService tests | `apps/api/src/modules/document-engine/retention/__tests__/retention-service.spec.ts` | Purge expired trash. Keep active documents. | Testing |
| 5.8 | DocumentAttachmentResolver tests | `apps/api/src/modules/document-engine/document-attachment-resolver.spec.ts` | Resolve documentId → signed URL. Invalid documentId → null. | Testing |
| 5.9 | Controller integration tests | `apps/api/test/integration/document-platform.spec.ts` | Upload + download. Folder CRUD. Soft delete + restore. Version list + create. | Testing |
| 5.10 | Doorbell — cross-tenant isolation | `apps/api/test/doorbell/document-cross-tenant-isolation.spec.ts` | Tenant A docs no visibles para Tenant B | Testing |
| 5.11 | Doorbell — cross-folder isolation | `apps/api/test/doorbell/document-cross-folder-isolation.spec.ts` | Usuario sin permiso de carpeta no accede a documentos hijos | Testing |
| 5.12 | Full suite verification | Todas las suites | `pnpm test`, `pnpm lint`, `pnpm turbo build` | Verification |

**Expected Commands:**
```bash
pnpm --filter api test document-engine
pnpm --filter api lint
pnpm turbo build --filter=api
```

**Acceptance Criteria:**
- [ ] Storage tests: ambos providers, 3 operaciones signed URL
- [ ] DocumentService tests: upload, versionNumber, soft delete
- [ ] UploadValidator: tamaño, MIME, magic bytes
- [ ] Permission guard: herencia, override, cross-tenant
- [ ] Folder tests: CRUD, tree, max depth
- [ ] Quarantine: lifecycle completo
- [ ] Retention: purge expired trash
- [ ] AttachmentResolver: resolve + null
- [ ] Integration: endpoints funcionales
- [ ] Doorbell: cross-tenant + cross-folder

---

## Verify Readiness

### What Verify will check

| Area | Check |
|------|-------|
| **Working Set Accuracy** | ¿Todos los archivos del Working Set se crearon/modificaron? |
| **Architecture Compliance** | `DocumentService` depende de `DocumentStorage`. `getSignedUrl` tiene parámetro `operation`. |
| **Upload Validation** | File size, MIME, magic bytes validados antes de storage |
| **Versioning** | `versionNumber = MAX+1` en transacción |
| **Permission Guard** | Todos los endpoints protegidos |
| **Quarantine** | Infectados retenidos 30 días + purge |
| **Event-Driven** | document.uploaded/deleted/versioned publicados |

### Doorbell Tests Expected

| Test | File |
|------|------|
| Cross-tenant isolation | `document-cross-tenant-isolation.spec.ts` |
| Cross-folder isolation | `document-cross-folder-isolation.spec.ts` |

### Metrics for Archive

| Metric | Source |
|--------|--------|
| Working Set Accuracy | Design → Apply comparison |
| Verify Iterations | Number of Verify/Fix cycles |
| Verify Discoveries | Issues found during Verify |
| Prediction Accuracy | Files, tests, commands, dependencies |

---

## Resumen

| Métrica | Valor |
|---------|-------|
| **Fases** | 5 |
| **Tareas totales** | 42 |
| **Distribución** | Shared: 7 / Core Engine: 8 / Pipeline: 6 / Integration: 6 / Testing: 12 |
| **Riesgo principal** | Preview pipeline requiere LibreOffice container (dependencia externa) |
| **Riesgo secundario** | ClamAV container requerido para virus scanning en producción |
| **Design respetado** | ✅ Íntegramente. Las 8 mejoras arquitectónicas incluidas. |
