# SPEC-0014 — Integration Platform

## Summary

Implementa una plataforma de integraciones externas con abstracción `Connector`,
autenticación OAuth + API Key, webhooks entrantes y salientes, motor de
reintentos con DLQ y scheduler BullMQ.

## Features

- Connector abstraction (execute, getAuthStatus, refreshAuth, verifyWebhookSignature)
- OAuth authorization code flow con state anti-CSRF
- API Key authentication con timingSafeEqual
- Webhook consumer con rate limiting
- Retry engine con exponential backoff + DLQ + replay
- Scheduler con formato cron + timezone
- Proactive auth check antes de cada execute()
- ADR-0010

## Implementation

- Phase 1 — Foundation (ADR-0010, schema, 4 shared contracts)
- Phase 2 — Core Engine (ConnectorRegistry, IntegrationService, Controller)
- Phase 3 — Auth + Webhooks (OAuth, API Key, WebhookConsumer)
- Phase 4 — Scheduler + Retry (RetryEngine, SchedulerService, CoreModule)
- Phase 5 — Testing (7 tests, 2 suites)

## Verification

| Metric | Value |
|--------|-------|
| Working Set Accuracy | 100% |
| Prediction Accuracy | ~95% |
| Critical Discoveries | 0 |
| Tests | 7/7 |
| Build | ✅ |
| Architecture Verdict | APPROVED |

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
