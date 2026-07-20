# Architecture Decisions

## Overview

Integration Platform centraliza las conexiones con servicios externos mediante
una abstracción `Connector`, autenticación OAuth + API Key, webhooks entrantes
y salientes, motor de reintentos con DLQ y scheduler BullMQ.

## Decisions

### AD-001 — Connector Abstraction

**Status:** Accepted

**Context:** Cada API externa tiene su propio mecanismo de autenticación y
formato de llamada. IntegrationService no debe conocer estas diferencias.

**Decision:** Interfaz `Connector` con `execute()`, `getAuthStatus()`,
`refreshAuth()`, `verifyWebhookSignature?()`. AuthStatus se verifica
proactivamente antes de cada `execute()`.

### AD-002 — OAuth State Anti-CSRF

**Status:** Accepted

**Context:** El flujo OAuth es vulnerable a CSRF sin validación de state.

**Decision:** `getAuthUrl()` genera un state parameter único.
`validateState()` compara con timingSafeEqual. El callback
`GET /auth/:providerId/callback` valida state antes de exchange.

### AD-003 — Retry Engine + DLQ

**Status:** Accepted

**Context:** Las integraciones externas fallan por razones transitorias.

**Decision:** Exponential backoff (3 intentos). DLQ tras agotar reintentos.
Replay via `POST /executions/:id/replay` resetea execution.

---

## Related Artifacts

- [design.md](design.md)
- [tasks.md](tasks.md)
- [verify-summary.md](verify-summary.md)
- [archive-report.md](archive-report.md)
- [architecture-decisions.md](architecture-decisions.md)
- [pr-description.md](pr-description.md)
