# ADR-0010 — Integration Platform

- **Número ADR:** ADR-0010
- **Fecha:** 2026-07-20
- **Autor:** Sistema
- **Estado:** Proposed

---

## 1. Contexto

CRM-Master carece de un sistema unificado para integrarse con servicios externos.
Cada conexión se implementa ad-hoc sin patrón común de autenticación, reintentos
ni monitorización.

## 2. Decisión

> **Decidimos** implementar una plataforma de integraciones con abstracción
> `Connector`, autenticación OAuth + API Key, webhooks entrantes/salientes,
> motor de reintentos con DLQ y scheduler BullMQ.

## 3. Consecuencias

- Connector abstraction permite añadir nuevas integraciones sin modificar el motor.
- OAuth con state parameter anti-CSRF.
- Retry engine + DLQ con replay.
- Scheduler con formato cron y timezone.
- Credenciales en SecretStore (SPEC-0011).

## 4. Referencias

- `openspec/changes/SPEC-0014-integration-platform/design.md`
- ADR-0004: SDD Feature Freeze
- SPEC-0011: SecretStore, RetryEngine
- SPEC-0012: RateLimiter, CommunicationProvider
