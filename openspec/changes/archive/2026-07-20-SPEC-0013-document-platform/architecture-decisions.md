# Architecture Decisions

## Overview

Document Management Platform centraliza el almacenamiento, versionado y
procesamiento de documentos bajo una única abstracción `DocumentStorage`,
con preview pipeline, virus scanning y retention policies.

## Decisions

### AD-001 — DocumentStorage Abstraction

**Status:** Accepted

**Context:** Cada proveedor de almacenamiento (local filesystem, S3) tiene
una API diferente. DocumentService no debe conocer estas diferencias.

**Decision:** Interfaz `DocumentStorage` con `store()`, `retrieve()`,
`delete()`, `getSignedUrl(operation)`. StorageOperation soporta READ,
WRITE, DELETE. Implementaciones: LocalStorageProvider (v1),
S3StorageProvider (v2).

**Alternatives Considered:** Proveedor fijo, sin abstracción

**Consequences:** Positivas: StorageProvider intercambiable. Negativas:
Signed URLs requieren lógica específica por proveedor.

### AD-002 — Document Versioning

**Status:** Accepted

**Context:** Los documentos necesitan trazabilidad de cambios.

**Decision:** New row per version con `versionNumber` incremental
(`MAX(version_number) + 1` en transacción). `documentId` agrupa
versiones. `versionId` UUID por versión individual.

**Alternatives Considered:** In-place updates, Git-like versioning

**Consequences:** Positivas: Versiones anteriores inmutables, trazabilidad
completa. Negativas: Almacenamiento crece con cada versión.

### AD-003 — Preview Pipeline

**Status:** Accepted

**Context:** Los documentos necesitan previews sin bloquear el upload.

**Decision:** Pipeline asíncrono via BullMQ. Imágenes → thumbnail JPEG
800px. PDF → preview PNG primera página. Office → LibreOffice Headless
→ PDF → Preview Pipeline. Preview cache separado con TTL 7 días.

**Alternatives Considered:** Preview síncrono, bajo demanda

**Consequences:** Positivas: Upload no bloqueado. Negativas: Requiere
LibreOffice container para Office docs.

### AD-004 — Quarantine Lifecycle

**Status:** Accepted

**Context:** Documentos infectados deben aislarse sin perder el archivo
original para análisis forense.

**Decision:** Status `quarantined`, archivo retenido 30 días en storage.
Evento `document.quarantined` notifica al sistema. Purge automático
después de 30 días via job programado.

**Alternatives Considered:** Eliminación inmediata, solo notificación

**Consequences:** Positivas: Forense posible dentro de la ventana de 30
días. Negativas: Ocupa storage durante el período de retención.

---

## Related Artifacts

- [design.md](design.md)
- [tasks.md](tasks.md)
- [verify-summary.md](verify-summary.md)
- [archive-report.md](archive-report.md)
- [architecture-decisions.md](architecture-decisions.md)
- [pr-description.md](pr-description.md)

---

## Navigation

← [pr-description.md](pr-description.md) | — →
