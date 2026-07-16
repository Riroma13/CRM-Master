# Proposal: Client Self-Registration

## Intent

Enable end customers to register themselves on their tenant's portal without requiring admin intervention. Currently, new clients can only be created by the tenant admin (Ricardo). With self-registration, a customer visits `{slug}.crmmaster.com/registro`, fills in their details, and gets immediate access to the client portal.

## Scope

### In scope
- New `POST /api/v1/client/auth/register` public endpoint in `ClientAuthController`
- New `register()` method in `ClientAuthService` that creates both `Cliente` + `ClientUser` atomically
- Schema: add `nombre` (optional) and `telefono` (optional) to `ClientUser`
- Registration DTO: `{ nombre, email, password, businessName? }`
- Rate limiting (reuse existing IP-based limiter from login)
- Modify existing `/registro` page to call the new endpoint
- Redirect to login with `?registered=true` on success (already supported)
- Spec update for client-auth
- Tests

### Out of scope (MVP)
- Email verification (post-MVP enhancement)
- Admin approval gate (post-MVP enhancement)
- CAPTCHA (post-MVP enhancement)
- Social/OAuth registration
- Password strength meter in UI (can add later)

## Approach

### Flow

```
User → /registro → POST /api/v1/client/auth/register
                        │
                        ├── Rate limit check (5/min per IP)
                        ├── Validate input (email, password, nombre)
                        ├── Hash password (bcrypt)
                        ├── Create Cliente { nombre: businessName || nombre, tenantId }
                        ├── Create ClientUser { nombre, email, passwordHash, tenantId, clienteId }
                        ├── Return 201 { clientUser }
                        │
User ← redirect to /login?registered=true
```

### Schema changes

```prisma
model ClientUser {
  // ... existing fields
  nombre     String?   // display name for the client user
  telefono   String?   // optional phone number
}
```

### Endpoint

```
POST /api/v1/client/auth/register
Public (no auth required)
Body: { nombre: string, email: string, password: string, businessName?: string }
Response: 201 { clientUser: { id, nombre, email } }
Errors: 409 (email exists), 429 (rate limit), 400 (validation)
```

### Frontend changes

- `apps/tenant-web/src/app/registro/page.tsx`: Change fetch URL from `/api/v1/auth/register` → `/api/v1/client/auth/register`
- Map fields: `name` → `nombre`, `businessName` → (sent as-is for Cliente.nombre)
- Keep existing UI/UX (form already works, just wrong endpoint)

### Rate limiting

Reuse the existing `ClientAuthService` rate limit infrastructure (IP-based, `RATE_LIMIT_MAX=5`, 60s window, progressive delay). Registration shares the same rate limit pool as login — 5 attempts/min per IP+email.

## Technical decisions

| Decision | Choice | Rationale |
|---|---|---|
| Activation | Auto-activate (`isActive=true`) | Fastest MVP, admin can disable via existing panel |
| Schema | `nombre` + `telefono` on `ClientUser` | Person's name separate from business name on `Cliente` |
| Endpoint | Under `client-auth` | Registration is auth lifecycle; reuses guards, rate limiter |
| Cliente creation | Always new | Each registration is a new client relationship |
| Password policy | Min 8 chars | Match admin client-user standard |
| Rate limit | 5/min per IP+email | Reuse existing limits; same abuse profile as login |

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Spam registrations | Medium | Rate limiting + global unique email prevents mass same-email spam |
| No email verification | Medium | Accept for MVP; admin can disable fake users; verification is add-on |
| Cross-tenant registration | Low | `tenantId` from Host header, not body; requires valid subdomain |
| `businessName` confusion | Low | Map clearly: `name` → `ClientUser.nombre`, `businessName` → `Cliente.nombre` |

## Workload Forecast

- Backend: ~80 lines (DTO + service + controller)
- Schema: ~5 lines (2 new fields)
- Frontend: ~10 lines (change URL + field mapping)
- Tests: ~100 lines (service + controller + e2e)
- **Total: ~195 lines** — fits in 1 PR, within 400-line budget

## PR Plan

Single PR since < 400 lines. Stacked-to-main.

## Next

Proceed to **spec** phase.
