# SPEC-0021 — Public API

## Summary

Public API provides a controlled exposure layer for external integrations
on CRM-Master. Wraps internal NestJS controllers with bearer token auth
(`crm_live_xxx`), granular scopes (resource:action), rate limiting per
endpoint (in-memory sliding window), monthly quotas, webhook delivery
with HMAC-SHA256 + deliveryId replay protection, SSRF validation, and
API versioning via URL path with deprecation lifecycle.

**23 source files | 152 tests (17 suites) | 35 tareas | 6 PRs stacked-to-main**

## Features

- **Bearer Token Auth**: Tokens `crm_live_xxx` with SHA-256 hashed storage.
  Shown only once on creation. Active flag for immediate revocation.
  In-memory cache (TTL 5min) for fast validation.
- **Granular Scopes**: `resource:action` format — `workflows:read`,
  `documents:write`, `*:admin`, `*:read`. Decorator `@RequireScope('workflows:read')`.
- **Rate Limiting**: In-memory sliding window per `{apiKeyId}:{method}:{route}`.
  100 req/min default per endpoint. Each endpoint has its own pool.
- **Monthly Quotas**: Configurable per tenant (default 10,000 req/month).
  Auto-reset at month boundary.
- **SSRF Validation**: Blocks RFC 1918, loopback, link-local, Docker, CGNAT,
  IETF reserved IPs. DNS resolution with TTL cache (5min).
- **Webhook Delivery**: HTTP POST with HMAC-SHA256 signature. UUID deliveryId
  for replay protection. 5× retry with exponential backoff, dead letter.
  Secrets encrypted at rest (AES-256-GCM).
- **API Versioning**: URL path `/api/v1/public/...`. Warning header (6 months),
  Sunset header, 410 Gone + Link successor-version. Max 2 active versions.
- **Response Mappers**: Explicit internal → V1 DTO mapping. V1WorkflowResponse,
  V1DocumentResponse. Aísla cambios internos del contrato público.

## Architecture

- **4 new Prisma models**: ApiKey, WebhookSubscription, WebhookDelivery, ApiQuota
- **Shared contracts**: ApiKeyScope, ApiKeyPayload, WebhookEvent, RateLimitResult,
  QuotaResult, PublicApiResponse, V1WorkflowResponse, V1DocumentResponse
- **In-memory rate limiting** (no Redis dependency — per-instance windows)
- **AES-256-GCM encryption** for webhook secrets (env key)
- **Module**: PublicApiModule in apps/api/src/modules/public-api/

### Implementation (6 stacked PRs)

- PR-1 — Schema migration + 4 Prisma models + shared types
- PR-2 — Auth: TokenService (generate/hash/validate/revoke), guards, revocation
- PR-3 — Rate limiting (sliding window) + monthly quotas
- PR-4 — SSRF validator + webhook subscription + dispatcher
- PR-5 — v1 controllers + response mappers + versioning middleware + OpenAPI
- PR-6 — Doorbell tests + integration tests + verify + archive

## Verification

| Metric | Value |
|--------|-------|
| Working Set Accuracy | ~82% |
| Verify Iterations | 1 (3 test route path fixes) |
| Critical Discoveries | 0 |
| Major Discoveries | 0 |
| Minor Discoveries | 1 (controller tenantId from query param not auth context) |
| Build | ✅ |
| Tests | 152/152 (17 suites) |

## Documentation

- design.md
- tasks.md
- verify-report.md
- archive-report.md
- pr-description.md

## Status

✅ Ready for merge — PR-6 (final)

---

## Related Artifacts

- [design.md](../../../../openspec/changes/SPEC-0021-public-api/design.md)
- [tasks.md](../../../../openspec/changes/SPEC-0021-public-api/tasks.md)
- [verify-report.md](../../../../openspec/changes/SPEC-0021-public-api/verify-report.md)
- [archive-report.md](archive-report.md)
- [pr-description.md](pr-description.md)

---

## Navigation

← [archive-report.md](archive-report.md)
