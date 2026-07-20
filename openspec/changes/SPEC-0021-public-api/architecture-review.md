# Architecture Review — SPEC-0021: Public API

**Verdict: APPROVED WITH CONDITIONS**

## Blocking Issues

| # | Finding |
|---|---------|
| 🔴 #1 | **Auth scheme ambiguity** — `sk_xxx` secret is generated, shown once, never verified. Security theater. Drop `sk_xxx` and use single bearer token `crm_live_xxx`. |
| 🔴 #2 | **SSRF — Webhook URL** — No validation of user-provided URLs. Tenants can target internal services (169.254.169.254, Docker hosts). |
| 🔴 #3 | **Revoked key still works** — `active` flag exists but auth guard never checks it. No immediate revocation. |

## High Severity

| # | Finding |
|---|---------|
| 🟡 #4 | Scope model too coarse (`read`/`write`/`admin`) — no resource-level granularity |
| 🟡 #5 | No response mapping layer — internal API changes break public contract silently |
| 🟡 #6 | Rate limit global per key — one busy endpoint starves others |
| 🟡 #7 | Version deprecation without graceful drain — no Warning header, no transition window |
| 🟡 #8 | Webhook secret in plain text — violates AGENTS.md rule #5 |
| 🟡 #9 | Webhook payload replayable — no nonce/deliveryId in signed payload |
| 🟡 #10 | Caddy routing ambiguity — same process or separate? |

## Conditions

1. Define single auth mechanism: drop `sk_xxx`, use bearer token `crm_live_xxx`
2. Add SSRF protection: block private IPs, validate webhook URLs
3. Add `active` check to auth guard + immediate revocation endpoint + Redis cache invalidation
4. Adopt resource:action scope format (`workflows:read`, `documents:write`)
5. Add response DTOs + mapper layer per version
6. Encrypt webhook secrets at rest
7. Include `deliveryId` in signed HMAC payload
