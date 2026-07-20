# SPEC-0013 — Document Management Platform

## Summary

Implementa una plataforma de gestión documental multi-tenant con abstracción
de almacenamiento, versionado, preview pipeline, virus scanning, retention
policies y modelo de carpetas con herencia de permisos.

## Features

- DocumentStorage abstraction (LocalStorage v1, S3 v2)
- Document versioning with incremental versionNumber
- Preview pipeline (images, PDF, Office via LibreOffice)
- Virus scanning (ClamAV) with 30-day quarantine
- Retention policies with automatic trash purge
- Folder hierarchy (max 5 levels) with permission inheritance
- DocumentPermissionGuard for centralized authorization
- DocumentAttachmentResolver for CommunicationModule integration
- Event-driven integration (SearchModule, ActivityTimeline, AutomationHub)
- ADR-0009

## Architecture

- Storage: LocalStorageProvider (dev), S3StorageProvider (prod)
- Preview: async BullMQ pipeline with separate cache storage
- Virus: ClamAV via REST API, async post-upload scanning
- Retention: soft delete → 30-day trash → permanent purge
- Permissions: folder inheritance + document override
- Integration: event-driven via EventEmitter2

## Implementation

- Phase 1 — Foundation (ADR-0009, schema, 5 shared contracts)
- Phase 2 — Core Engine (storage, service, upload validation, permission guard)
- Phase 3 — Pipeline (preview, virus scan, quarantine, retention)
- Phase 4 — Integration (folders, permissions, events, attachment resolver)
- Phase 5 — Testing (13 tests, 4 suites)

## Verification

| Metric | Value |
|--------|-------|
| Working Set Accuracy | ~90% |
| Prediction Accuracy | ~95% |
| Critical Discoveries | 0 |
| Major Discoveries | 0 |
| Minor Discoveries | 1 |
| Build | ✅ |
| Tests | 13/13 |
| Architecture Verdict | APPROVED |

## Documentation

- design.md
- tasks.md
- verify-summary.md
- archive-report.md
- architecture-decisions.md

## Status

✅ Ready for merge

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

← [archive-report.md](archive-report.md) | [architecture-decisions.md](architecture-decisions.md) →
