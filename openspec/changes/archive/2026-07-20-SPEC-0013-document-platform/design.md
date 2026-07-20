# Design: SPEC-0013 — Document Management Platform

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Platform Baseline:** sdd-v2.1-baseline
> **Estado:** Draft

---

## 1. Executive Summary

CRM-Master gestiona documentos en múltiples módulos (incidencias, clientes,
comunicaciones) sin un sistema unificado de almacenamiento, versionado,
permisos ni políticas de retención. Actualmente `DocumentosModule` usa
almacenamiento local sin abstracción de proveedor, sin preview pipeline,
sin OCR, sin firmas digitales y sin integración con el motor de búsqueda.

**Document Management Platform** implementa un sistema de gestión documental
completo con abstracción de almacenamiento (`DocumentStorage`), versionado,
modelo de carpetas, tags, retention policies, preview pipeline, permisos,
escaneo de virus, y arquitectura preparada para OCR, AI indexing y firmas
digitales. La integración con SearchModule (SPEC-0010), Communication
Platform (SPEC-0012) y Automation Hub (SPEC-0011) se realiza mediante
eventos y contratos compartidos.

---

## 2. Technical Approach

El sistema se compone de nueve capas:

1. **DocumentStorage abstraction** — interfaz `DocumentStorage` que define
   `store()`, `retrieve()`, `delete()`, `getSignedUrl(operation)`. El
   parámetro `operation` acepta `READ`, `WRITE`, `DELETE`. Cada provider
   genera URLs firmadas específicas según la operación. Implementaciones:
   `LocalStorageProvider` (v1), `S3StorageProvider` (v2). DocumentService
   nunca conoce el proveedor concreto.

2. **Document model** — tabla `documents` con soporte para versionado
   (`documentId` UUID estable que agrupa versiones), metadata extensible
   (JSON), tags, folder hierarchy, soft delete, retention policy, y estado
   del scan de virus. Cada documento usa `versionNumber` incremental por
   `documentId` y `versionId` UUID por versión individual.

3. **Folder model** — tabla `document_folders` con jerarquía padre-hijo,
   scoped por tenant. Los documentos se asignan a carpetas. Profundidad
   máxima recomendada: 5 niveles.

4. **DocumentVersioning** — `documentId` UUID agrupa versiones. Al crear
   un nuevo documento se genera un `documentId`. Cada nueva versión recibe
   un `versionId` UUID y un `versionNumber` incremental
   (`SELECT COALESCE(MAX(version_number), 0) + 1 FROM document_versions WHERE document_id = X`)
   dentro de una transacción. Versiones anteriores son inmutables.

5. **Retention Policies** — configuración por tenant o por carpeta: período
   de retención mínimo, acción al expirar (archive / soft delete / permanent
   delete). Un job programado ejecuta la limpieza.

6. **Preview Pipeline** — pipeline asíncrono que genera previews de
   documentos: thumbnail para imágenes, preview de PDF, preview de
   documentos Office. Los previews se cachean y sirven via signed URLs.

7. **Permission Model** — permisos a nivel de carpeta y documento:
   `owner`, `editor`, `viewer`. Herencia de carpetas. Scoped por tenant.

8. **Virus Scanning abstraction** — interfaz `VirusScanner` con
   implementaciones: `ClamAvScanner` (v1), `MockScanner` (dev/test). El
   scan ocurre después del upload; el documento queda en estado `scanning`
   hasta que el scan finalice.

9. **Integration Layer** — eventos publicados para cada operación:
   `document.uploaded`, `document.deleted`, `document.versioned`.
   SearchModule indexa documentos. CommunicationPlatform adjunta
   documentos. AutomationHub reacciona a eventos documentales.

```
Upload → Virus Scan → Store → Index (SearchModule) → Publish event
  │         │           │              │                    │
  │    [ClamAV]   [S3/Local]    [SPEC-0010]       [ActivityTimeline]
  │                                              [AutomationHub]
  ▼
Preview Pipeline → Cache → Signed URL
```

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Storage abstraction | Interfaz `DocumentStorage`, Proveedor fijo, Almacenamiento externo | **`DocumentStorage` interfaz con `getSignedUrl(operation)`** | LocalStorage dev/test, S3 producción. La operación (READ/WRITE/DELETE) genera URLs específicas. Mismo patrón que SearchEngine en SPEC-0010. |
| Document identity | UUID por documento, ID por versión, Ambos | **`documentId` UUID (estable) + `versionId` UUID (versión)** | `documentId` agrupa versiones. `versionId` identifica cada versión. |
| Versioning | In-place updates, New row per version, Git-like | **New row per version con `versionNumber` incremental** | Versiones anteriores inmutables. `versionNumber = MAX(version_number) + 1` en transacción. Trazabilidad completa. |
| Folder hierarchy | Adjacency list, Nested set, Materialized path | **Adjacency list (parentId)** | Simple, suficiente para profundidad ≤5 niveles. Consultas con CTE si necesario. |
| Soft delete | Flag `is_deleted`, Separate trash table, Hard delete | **Flag `is_deleted` + trash table** | Recuperable hasta que la retention policy ejecute purge. |
| Retention policy | Configurable por tenant, Fija global, Por carpeta | **Por tenant + por carpeta (override)** | Tenant puede definir política global. Carpetas pueden sobrescribir. |
| Preview pipeline | Síncrono, Asíncrono con cola, Bajo demanda | **Asíncrono con cola (BullMQ)** | No bloquea el upload. Previews generados en background. |
| Virus scanning | Síncrono (bloqueante), Asíncrono (post-upload), Opcional | **Asíncrono post-upload** | Upload no bloqueado. Documento en estado `scanning` hasta resultado. |
| Signed URLs | Local signed URL, S3 presigned URL, Proxy | **Provider-specific signed URL** | S3PresignedUrlProvider genera URLs firmadas de S3. LocalSignedUrlProvider genera URLs con token efímero. |
| Permissions | ACL por documento, Herencia de carpetas, RBAC plano | **Herencia de carpetas + override por documento** | Permiso definido en carpeta, heredado por documentos. Override explícito por documento cuando necesario. |
| Office preview | LibreOffice Headless, Google Docs API, Sin soporte | **LibreOffice Headless** | Estándar, sin dependencias externas. Container Docker. Conversión a PDF → pipeline de preview. |
| Preview cache | Mismo storage que original, Storage separado, CDN | **Preview Storage separado** | Misma tecnología que DocumentStorage (S3/Local) pero en ruta/prefix `.previews/`. TTL configurable (default 7 días). |
| Quarantine lifecycle | Eliminar inmediatamente, Retener 30 días, Mover a cuarentena | **Retener 30 días en storage con status `quarantined`** | Para análisis forense. Purge automático después de 30 días via job programado. |
| File validation | Sin validación, Por MIME, Por magic bytes + MIME | **Magic bytes + MIME declarado** | Validación antes de StorageProvider y antes de VirusScanner. MIME permitidos configurables por tenant. |
| Upload limits | Sin límite, Fijo por archivo, Por plan | **Por plan: default 25MB, configurable por tenant** | Validado en Controller antes de cualquier procesamiento. |

---

## 4. Data Flow

```
Upload flow:

Client → POST /api/v1/documents/upload
       │
       ├── [VALIDATION] Check file size (max 25MB por defecto)
       │               Check MIME type (lista permitida por tenant)
       │               Check magic bytes vs declared MIME
       │               If invalid → 400 Bad Request
       │
       ├── [PERMISSION] DocumentPermissionGuard
       │               Check folder write permission
       │               If denied → 403 Forbidden
       │
       ├── Create document record (SCANNING)
       ├── VirusScanner.scan(file)
       │     ├── CLEAN → status = STORED
       │     └── INFECTED → status = QUARANTINED
       │         ├── File retained in storage for 30 days
       │         ├── Notify tenant admin
       │         └── Auto-purge after 30 days via retention job
       │
       ├── DocumentStorage.store(file, tenantId)
       │     ├── LocalStorageProvider → /storage/{tenant}/{docId}/{versionId}
       │     └── S3StorageProvider → s3://crm-master/{tenant}/{docId}/{versionId}
       │
       ├── Create version record
       │     ├── versionId = UUID
       │     ├── versionNumber = MAX(version_number) + 1
       │     └── Hash SHA-256, size, mime, storageKey
       │
       ├── Generate preview (async via BullMQ)
       │     ├── Images → thumbnail (JPEG 800px)
       │     ├── PDF → page preview (PNG first page)
       │     ├── Office → LibreOffice Headless → PDF → Preview Pipeline
       │     └── Cache preview in Preview Storage (TTL 7 días)
       │
       ├── SearchModule.index(document)  [event-driven]
       ├── ActivityTimeline.publish('document.uploaded')
       └── Return documentId + signed URL (READ operation)

Download flow:

Client → GET /api/v1/documents/:documentId/download
       │
       ├── Check permission (folder inheritance)
       ├── Check retention (not expired)
       ├── Generate signed URL (provider-specific)
       ├── Increment download counter
       └── Redirect to signed URL

Delete flow:

Client → DELETE /api/v1/documents/:documentId
       │
       ├── Soft delete (is_deleted = true, deleted_at = now)
       ├── Move to trash (table: document_trash)
       ├── Publish 'document.deleted'
       └── Permanent delete after retention period
```

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add `Document`, `DocumentVersion`, `DocumentFolder`, `DocumentTrash`, `RetentionPolicy` models |
| 2 | `packages/shared/src/document/storage.interface.ts` | Create | `DocumentStorage` interface |
| 3 | `packages/shared/src/document/document.types.ts` | Create | Document types, metadata, permission types |
| 4 | `packages/shared/src/document/event.types.ts` | Create | Document domain events |
| 5 | `packages/shared/src/document/virus-scanner.interface.ts` | Create | `VirusScanner` interface |
| 6 | `packages/shared/src/document/index.ts` | Create | Re-export |
| 7 | `apps/api/src/modules/document-engine/document-engine.module.ts` | Create | NestJS module |
| 8 | `apps/api/src/modules/document-engine/document.service.ts` | Create | Core document service |
| 9 | `apps/api/src/modules/document-engine/document.controller.ts` | Create | REST API |
| 10 | `apps/api/src/modules/document-engine/dto.ts` | Create | Upload, metadata, folder DTOs |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 11 | `apps/api/src/modules/document-engine/storage/local-storage.provider.ts` | Create | Local filesystem storage |
| 12 | `apps/api/src/modules/document-engine/storage/s3-storage.provider.ts` | Create | S3 storage |
| 13 | `apps/api/src/modules/document-engine/preview/preview-pipeline.ts` | Create | Preview generation |
| 14 | `apps/api/src/modules/document-engine/virus-scanning/clamav-scanner.ts` | Create | ClamAV integration |
| 15 | `apps/api/src/modules/document-engine/permissions/document-permissions.ts` | Create | Permission model |
| 16 | `apps/api/src/modules/document-engine/retention/retention-service.ts` | Create | Retention policy enforcement |
| 17 | `apps/api/src/modules/core/core.module.ts` | Modify | Import `DocumentEngineModule` |

### 5.3 Expected NOT to Change

- `SearchModule` — se integra via eventos, sin cambios
- `CommunicationModule` — se integra via contratos compartidos, sin cambios
- `AutomationModule` — consume eventos documentales, sin cambios
- Existing `DocumentosModule` — se depreca progresivamente, no se modifica
- Frontend — SPEC separada
- `app.module.ts` — pasa por CoreModule

---

## 6. Read Order

1. `packages/shared/src/search/search-entry.ts` — patrón de contratos compartidos
2. `packages/database/prisma/schema.prisma` — naming y modelos existentes
3. `packages/shared/src/document/storage.interface.ts` — definir contrato
4. `packages/shared/src/document/document.types.ts` — tipos de documento
5. `apps/api/src/modules/document-engine/document.service.ts` — core
6. `apps/api/src/modules/document-engine/document.controller.ts` — API
7. `apps/api/src/modules/document-engine/storage/local-storage.provider.ts` — ejemplo

---

## 7. Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_document_platform
pnpm --filter database generate
pnpm --filter shared tsc --noEmit
pnpm --filter api test document-engine
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** High

El patrón `DocumentStorage` abstraction es idéntico al patrón `SearchEngine`
(SPEC-0010) y `CommunicationProvider` (SPEC-0012). El equipo conoce el
mecanismo. La preview pipeline y virus scanning son nuevos, pero están
desacoplados mediante interfaces asíncronas.

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 4 | Patrones de storage, preview libraries |
| Files to read | 8 | Schema, existing module patterns, S3 SDK |
| Files to create | 16 | Module, service, controller, DTOs, providers, pipelines |
| Files to modify | 2 | schema.prisma, core.module.ts |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Virus scanning frena el upload | Baja | Medio | Scan asíncrono. Upload completo sin esperar scan. Documento en estado `scanning`. |
| S3 signed URLs expiran en vista previa | Media | Medio | TTL configurable (default 1h). Refresh automático en cliente. |
| Preview pipeline falla para formatos no soportados | Media | Bajo | Preview no bloquea. Documento sin preview se muestra como icono genérico. |
| Retention policy elimina documentos por error | Baja | Alto | Soft delete primero. Trash con recuperación de 30 días. Purge requiere confirmación. |
| Office preview falla para documentos complejos | Media | Bajo | LibreOffice Headless en container. Log de error. Preview no disponible = icono genérico. |
| Archivo infectado en cuarentena sin supervisión | Baja | Medio | Notificar al admin del tenant. Purge automático a los 30 días. |
| Magic byte validation rechaza archivos válidos | Baja | Medio | Lista de MIME configurables por tenant. Validación desactivable si es necesario. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Storage | `store()`, `retrieve()`, `delete()`, `getSignedUrl()` mocked | Jest |
| Unit — Service | CRUD, versioning, soft delete, folder hierarchy | Jest + mocked storage |
| Unit — Permissions | Inheritance, override, tenant isolation | Jest |
| Integration — API | Upload, download, delete, list, folder CRUD | supertest |
| Doorbell — Cross-tenant | Tenant A docs no visibles para Tenant B | E2E |
| Doorbell — Cross-folder | Documentos fuera de la carpeta no accesibles | E2E |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `document-cross-tenant-isolation.spec.ts` | Tenant A no puede ver/descargar documentos de Tenant B |
| `document-cross-folder-isolation.spec.ts` | Usuario sin permiso de carpeta no accede a documentos hijos |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0009 | Documentar la arquitectura de Document Management Platform, el modelo de almacenamiento, versionado y retention policies. | Proposed |

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `DocumentStorage` interface | DocumentEngine | Abstracción de almacenamiento |
| `DocumentService` | DocumentEngine | CRUD, versioning, soft delete |
| `VirusScanner` interface | DocumentEngine | Escaneo de virus |
| `PreviewPipeline` | DocumentEngine | Generación de previews |
| Document events | DocumentEngine | Publican eventos para SearchModule, ActivityTimeline, AutomationHub |
| Document permissions | DocumentEngine | Modelo de permisos con herencia de carpetas |
| `DocumentPermissionGuard` | DocumentEngine | Guard NestJS que protege lectura, descarga, edición, borrado y signed URLs. Verifica herencia de carpetas antes de permitir acceso. |
| `DocumentAttachmentResolver` | DocumentEngine | Resuelve documentIds a contenido (o signed URL) para CommunicationModule. CommunicationModule nunca accede directamente al StorageProvider. |

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| OCR | Pipeline step OCR que extrae texto de imágenes/PDFs | Days |
| AI Indexing | SearchModule indexa contenido OCR | Days |
| Digital signatures | Nuevo storage provider o middleware en pipeline | Weeks |
| Full-text search on content | SearchModule indexa texto extraído via OCR | Days |
| Document templates | Nuevo modelo `document_templates` + renderer | Days |
| Bulk upload | Pipeline acepta array de archivos | Days |
| Client portal documents | Frontend SPEC separada | Weeks |

---

## Architecture Review (MANDATORY)

### A. Scalability

| Factor | 10× (10K docs) | 100× (1M docs) | Mitigation |
|--------|---------------|----------------|------------|
| Storage | 100GB | 10TB | S3 escala infinitamente. LocalStorage no escala >100GB. |
| Metadata queries | <10ms | <50ms | Index on `(tenantId, folderId)`, `(tenantId, is_deleted)` |
| Preview generation | <1s per doc | Queue backlog | BullMQ workers. Parallel preview generation. |
| Virus scanning | <5s per doc | <10s per doc | Scan workers. Cache de resultados para mismos archivos (hash). |

**Decision:** LocalStorageProvider para dev/test. S3StorageProvider para
producción. Preview y virus scanning via BullMQ workers.

### B. Open/Closed Principle (OCP)

**Point of extension:** `DocumentStorage` interface.

**What must change to add S3 storage:** Implementar `DocumentStorage` +
registrar provider. DocumentService no cambia.

**What must change to add new preview type:** Añadir handler al pipeline.
Pipeline descubre handlers por registro.

**Decision:** OCP cumplido. Storage y preview son extensibles sin modificar
el core.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| Documents | DocumentEngine | SearchModule (index), CommunicationModule (attachments) |
| Folders | DocumentEngine | DocumentService (CRUD) |
| Storage files | StorageProvider | DocumentService |
| Previews | DocumentEngine (PreviewPipeline) | Clients (via signed URL) |
| Virus scan status | DocumentEngine (VirusScanner) | DocumentService |

**Decision:** DocumentEngine único propietario de documentos, carpetas,
storage y previews.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| Active documents | Indefinido | No aplica | Soft delete → trash |
| Trash (soft-deleted) | 30 días | No aplica | Purge automático |
| Document versions | Indefinido | No aplica | Solo purge si el documento se purga |
| Storage files | Misma que el documento | No aplica | Eliminar al purgar el registro |

**Decision:** Política de retención configurable por tenant con override
por carpeta.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
|-----------|---------------|------------|----------|
| `upload()` | Media (retry del cliente) | `contentHash` SHA-256 unique por tenant | `ON CONFLICT` detecta duplicado |
| `delete()` | Baja | Idempotente por naturaleza | Segunda ejecución no afecta |
| `createFolder()` | Media | Unique name + parentId + tenantId | Error de duplicado |

**Decision:** Cada documento tiene `contentHash` SHA-256. Unique constraint
sobre `(tenantId, contentHash)` para evitar duplicados exactos.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
|----------|----------|-----------|-----------|
| `DocumentStorage` | `packages/shared/src/document/` | DocumentService | Storage providers |
| `VirusScanner` | `packages/shared/src/document/` | DocumentService | Scanner implementations |
| `DocumentEvent` | `packages/shared/src/document/` | SearchModule, ActivityTimeline | DocumentService |
| `DocumentMetadata` | `packages/shared/src/document/` | Controller, SearchModule | — |

**Decision:** Contratos compartidos en `packages/shared/src/document/`.
Misma estrategia que SPEC-0010, 0011, 0012.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
|-----------|------|----------|
| Tenant | Bajo | `tenant_id` indexado. No requiere partición. |
| Volume | Medio (>1M documentos) | Partición por tenant si es necesario. Storage es externo (S3). |

**Decision:** La tabla `documents` no se particiona en v1. Si supera 10M
de registros, se evalúa partición por tenant. Los archivos en S3 ya están
organizados por tenant.

---

## 16. Interfaces / Contracts

```typescript
// ─── packages/shared/src/document/ ─────────────────────

export type StorageOperation = 'READ' | 'WRITE' | 'DELETE';

export interface DocumentStorage {
  store(tenantId: string, documentId: string, versionId: string, file: Buffer, mimeType: string): Promise<string>;
  retrieve(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
  getSignedUrl(storageKey: string, operation: StorageOperation, expiresIn?: number): Promise<string>;
}

export interface VirusScanner {
  scan(file: Buffer, fileName: string): Promise<ScanResult>;
}

export interface ScanResult {
  clean: boolean;
  virusName?: string;
  scannedAt: string;
}

export interface DocumentMetadata {
  documentId: string;
  versionId: string;
  tenantId: string;
  folderId?: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  hash: string;            // SHA-256
  tags: string[];
  metadata: Record<string, unknown>;
  status: 'scanning' | 'stored' | 'quarantined' | 'deleted';
  createdBy: string;
  createdAt: string;
}

export interface UploadLimits {
  maxFileSizeBytes: number;     // default 25MB
  allowedMimeTypes: string[];   // default: pdf, jpg, png, docx, xlsx
  validateMagicBytes: boolean;  // default true
}

export interface FolderNode {
  id: string;
  tenantId: string;
  parentId?: string;
  name: string;
  path: string;            // computed: /parent/child
  documentCount: number;
}
```

```prisma
model DocumentFolder {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  parentId  String?  @map("parent_id")
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  parent DocumentFolder?  @relation("FolderHierarchy", fields: [parentId], references: [id])
  children DocumentFolder[] @relation("FolderHierarchy")
  documents Document[]

  @@unique([tenantId, parentId, name])
  @@index([tenantId])
  @@map("document_folders")
}

model Document {
  id            String   @id @default(uuid())
  documentId    String   @map("document_id")
  tenantId      String   @map("tenant_id")
  folderId      String?  @map("folder_id")
  name          String
  mimeType      String   @map("mime_type")
  sizeBytes     Int      @map("size_bytes")
  hash          String   // SHA-256 of current version content
  tags          String[]
  metadata      Json     @default("{}")
  status        String   @default("scanning") // scanning | stored | quarantined | deleted
  isDeleted     Boolean  @default(false) @map("is_deleted")
  deletedAt     DateTime? @map("deleted_at")
  createdBy     String   @map("created_by")
  retentionDays Int?     @map("retention_days")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  folder DocumentFolder? @relation(fields: [folderId], references: [id])
  versions DocumentVersion[]

  @@unique([tenantId, hash])            // content dedup per tenant
  @@index([tenantId, folderId])
  @@index([tenantId, isDeleted])
  @@index([tenantId, status])
  @@map("documents")
}

model DocumentVersion {
  id            String   @id @default(uuid())
  documentId    String   @map("document_id")
  versionNumber Int      @map("version_number")
  storageKey    String   @map("storage_key")
  hash          String   // SHA-256 of this version content
  sizeBytes     Int      @map("size_bytes")
  mimeType      String   @map("mime_type")
  metadata      Json?    @default("{}")
  createdBy     String   @map("created_by")
  createdAt     DateTime @default(now()) @map("created_at")

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId])
  @@index([documentId, versionNumber])
  @@map("document_versions")
}

model DocumentTrash {
  id          String   @id @default(uuid())
  documentId  String   @map("document_id")
  tenantId    String   @map("tenant_id")
  name        String
  deletedAt   DateTime @default(now()) @map("deleted_at")
  expiresAt   DateTime @map("expires_at")  // deletedAt + retentionDays
  restoredAt  DateTime? @map("restored_at")

  @@index([tenantId])
  @@index([expiresAt])
  @@map("document_trash")
}
```

---

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Add document tables + migration | Bajo | `prisma migrate down` |
| 2 | Create DocumentEngine module + storage abstraction | Bajo | Revertir commit |
| 3 | Implement LocalStorageProvider | Bajo | Desregistrar del módulo |
| 4 | Implement S3StorageProvider | Medio | Desregistrar. Documentos existentes en LocalStorage no afectados. |
| 5 | Implement PreviewPipeline + VirusScanner | Medio | Preview sin efecto en producción si falla |
| 6 | Wire CoreModule + event handlers | Bajo | Quitar del imports |

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿S3 SDK versión 2 o 3? | Open | Recomendación: v3 (`@aws-sdk/client-s3`), más moderna, tree-shakeable. |
| 2 | ¿ClamAV local o container? | Open | Recomendación: container Docker (`clamav-rest`). API HTTP, sin dependencia de binario. |
| 3 | ¿Preview de Office docs? | **Resolved** | LibreOffice Headless en container Docker. Conversión a PDF → Preview Pipeline → PNG. Abstracción `DocumentPreviewConverter` para sustituir el motor en el futuro. |
| 4 | ¿OCR en v1 o v2? | Open | Recomendación: v2. La arquitectura está preparada (pipeline step), pero OCR añade dependencias pesadas (Tesseract). |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Pendiente de Architecture Review.
