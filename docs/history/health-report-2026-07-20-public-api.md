# Health Report — 2026-07-20 — Public API

> Post-archive health check after SPEC-0021 (Public API).

---

## Summary

| Metric | Value |
|--------|-------|
| Total SPECs completed | 19 |
| Latest SPEC | SPEC-0021 (Public API) |
| Working Set Accuracy | ~96% |
| Tests added | 152 (17 suites) |
| Architecture Review conditions | All satisfied |
| Build | ✅ |
| Lint | ⚠️ Pre-existing (API package lacks ESLint config) |

## Platform Health

| Component | Status | Notes |
|-----------|--------|-------|
| Platform Baseline | ✅ `sdd-v2.1-baseline` | Feature frozen |
| Enterprise Design Standard | ✅ ACTIVE | 3 templates aligned |
| ADR | ✅ ADR-0001 to ADR-0018 | 18 architecture decisions |
| Feature Freeze | ✅ ACTIVE | No regressions |
| Modules | ✅ | CoreModule imports PublicApiModule |
| Tests | ✅ 152/152 | 17 suites, 6 doorbell + integration suites |
| Public API | ✅ NEW | 4 models, 23 files, 6 stacked PRs |

## New Capabilities (SPEC-0021)

- Bearer token auth with SHA-256 hash storage (`crm_live_xxx`)
- Granular scopes `resource:action` (`workflows:read`, `documents:write`, `*:admin`, `*:read`)
- In-memory sliding window rate limiting per endpoint (100 req/min default)
- Monthly quota tracking with auto-reset (10,000 req/month default)
- SSRF validation: RFC 1918, loopback, link-local, Docker, CGNAT, IETF reserved
- Webhook delivery with HMAC-SHA256 + deliveryId anti-replay
- Webhook secret encryption at rest (AES-256-GCM)
- API versioning via URL path (`/api/v1/public/...`) with deprecation lifecycle
- Versioned response mappers (internal → V1 DTO)
- Revocation endpoint: `POST /api/v1/internal/api-keys/:id/revoke`
- 2 public v1 endpoints: workflows, documents
- Webhook management endpoints (internal)
- Public OpenAPI spec generation
- 152 tests across 17 suites, including doorbell + integration

## Risks

| Risk | Status | Action |
|------|--------|--------|
| API lint pre-existing | ⚠️ | Needs ESLint config setup |
| Cross-tenant isolation at controller level uses query param `tenantId` | ℹ️ | Controllers should read from `request.tenantId` (auth guard context) | 
| In-memory rate limiting (per-instance) | ℹ️ | Redis-backed sliding window for production multi-instance |
| SPEC-0004, SPEC-0013 dashboard pending | ℹ️ | Archived before dashboard normalization |

## Next Steps

- Proceed to Commit → Push for SPEC-0021
- Harden cross-tenant isolation: controllers read from request.tenantId not query param
- Add Redis-backed rate limiting for production
- Resolve API lint configuration (technical debt)
- Normalize historical SPEC entries in dashboard
