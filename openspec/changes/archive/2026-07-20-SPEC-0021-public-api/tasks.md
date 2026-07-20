# Tasks: SPEC-0021 — Public API

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1500–2500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Schema models + shared types | PR 1 | `pnpm --filter database prisma generate` | `pnpm --filter api test public-api/schema` | Revert schema + types commit |
| 2 | Auth + SSRF + Revocation | PR 2 | `pnpm --filter api test public-api/auth` | `curl -H "Authorization: Bearer crm_live_x" /api/v1/public/workflows` | Revert auth module + SSRF |
| 3 | Rate limiting + quotas | PR 3 | `pnpm --filter api test public-api/rate-limit` | `for i in $(seq 1 20); do curl ...; done` | Revert rate-limit module |
| 4 | Webhooks (dispatcher + subscription) | PR 4 | `pnpm --filter api test public-api/webhook` | `POST /api/v1/internal/webhook-subscriptions` | Revert webhook module |
| 5 | Controllers + mappers + versioning | PR 5 | `pnpm --filter api test public-api/v1` | `GET /api/v1/public/workflows` | Revert v1/ + mappers/ + middleware |
| 6 | Wiring + doorbell + integration | PR 6 | `pnpm --filter api test doorbell/public-api` | Full `pnpm --filter api test` | Revert core.module.ts change |

## Phase 1: Schema + Shared Contracts

- [ ] 1.1 Add `ApiKey`, `WebhookSubscription`, `WebhookDelivery`, `ApiQuota` models to `packages/database/prisma/schema.prisma`
- [ ] 1.2 Run migration: `pnpm --filter database prisma migrate dev --name add_public_api`
- [ ] 1.3 Create `packages/shared/src/public-api/` types (ApiKeyTokenPayload, WebhookEvent, V1*Response, RateLimitResult, QuotaResult, PublicApiResponse)
- [ ] 1.4 Create `packages/shared/src/public-api/index.ts` barrel export

## Phase 2: Auth (sdd-apply-pro)

- [x] 2.1 RED test: `__tests__/revocation.spec.ts` + `__tests__/token.service.spec.ts` — create, validate, revoke, expiry, inactive
- [x] 2.2 Create `auth/token.service.ts` — token generate/hash/store, in-memory cache TTL 5min, revoke with cache clear
- [x] 2.3 RED test: `__tests__/token-auth.guard.spec.ts` — valid token passes, invalid 401, expired 401
- [x] 2.4 Create `auth/token-auth.guard.ts` — Bearer extraction, hash→lookup, active+expiry check, tenant resolution
- [x] 2.5 RED test: `__tests__/scope.guard.spec.ts` — exact match, wildcard, missing scope 403
- [x] 2.6 Create `guards/scope.guard.ts` + `@RequireScope` decorator — resource:action matching with `*:read`/`*:admin` wildcard support
- [x] 2.7 Create `auth/revoke.controller.ts` — `POST /api/v1/internal/api-keys/:id/revoke`

## Phase 3: Rate Limiting + Quotas

- [ ] 3.1 RED test: excess requests return 429 with `Retry-After` header
- [ ] 3.2 RED test: rate limiter falls back to in-memory when Redis unreachable
- [ ] 3.3 Create `rate-limit.service.ts` — Redis sliding window per `{apiKeyId}:{method}:{route}`, in-memory fallback
- [ ] 3.4 Create `quota.service.ts` — monthly usage tracking, reset logic

## Phase 4: SSRF + Webhooks (SSRF parts sdd-apply-pro)

- [ ] 4.1 RED test: `public-api-ssrf-blocking.spec.ts` — webhook URL to RFC 1918/loopback/link-local/Docker blocked
- [ ] 4.2 Create `ssrf-validator.service.ts` — resolve DNS, block private IPs, cache resolution (TTL 5min)
- [ ] 4.3 Create `webhook-subscription.service.ts` — CRUD with SSRF validation on create/update, encrypted secret at rest
- [ ] 4.4 RED test: duplicate `deliveryId` rejected (replay protection)
- [ ] 4.5 Create `webhook-dispatcher.service.ts` — HMAC-SHA256 signing, deliveryId, 5× retry with backoff, dead letter

## Phase 5: Controllers + Response Mapping

- [ ] 5.1 Create `api-version.middleware.ts` — Warning/Sunset/Link deprecation headers, 410 Gone for expired
- [ ] 5.2 Create `workflow-response.mapper.ts` — internal → V1WorkflowResponse mapping
- [ ] 5.3 Create `document-response.mapper.ts` — internal → V1DocumentResponse mapping
- [ ] 5.4 Create `v1-workflows.controller.ts` — `GET /api/v1/public/workflows`
- [ ] 5.5 Create `v1-documents.controller.ts` — `GET /api/v1/public/documents`
- [ ] 5.6 Create `public-openapi.ts` — public OpenAPI spec (filtered, public endpoints only)

## Phase 6: Wiring + Integration + Doorbell

- [ ] 6.1 Create `public-api.module.ts` — composition module importing all services, controllers, guards
- [ ] 6.2 Wire `PublicApiModule` into `apps/api/src/modules/core/core.module.ts`
- [ ] 6.3 RED test: `public-api-cross-tenant-isolation.spec.ts` — Tenant A key cannot access Tenant B data
- [ ] 6.4 Integration test: full flow auth → rate limit → scope → mapper → response via supertest
