# ADR-0009 — Document Management Platform

- **Número ADR:** ADR-0009
- **Fecha:** 2026-07-20
- **Autor:** Sistema
- **Estado:** Proposed

---

## 1. Contexto

CRM-Master gestiona documentos sin un sistema unificado de almacenamiento,
versionado, permisos ni políticas de retención. Cada módulo implementa su
propia lógica de almacenamiento.

## 2. Decisión

> **Decidimos** implementar una plataforma documental con abstracción de
> almacenamiento (`DocumentStorage`), versionado por filas inmutables,
> modelo de carpetas con herencia de permisos, retention policies, preview
> pipeline y virus scanning asíncrono.

## 3. Consecuencias

- StorageProvider abstraído (LocalStorage v1, S3 v2).
- Versiones inmutables con `versionNumber` incremental.
- DocumentPermissionGuard centraliza la autorización.
- Preview pipeline asíncrono via BullMQ.
- Virus scanning post-upload con cuarentena de 30 días.

## 4. Referencias

- `openspec/changes/SPEC-0013-document-platform/design.md`
- ADR-0004: SDD Feature Freeze
