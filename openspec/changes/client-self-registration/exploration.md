## Exploration: Client Self-Registration

### Current State

**What exists today:**
- **ClientUser model**: `{ id, clienteId, tenantId, email, passwordHash, isActive, createdAt, updatedAt }` — globally unique email, linked to Cliente via `clienteId`. No `name` field.
- **Cliente model**: `{ id, tenantId, nombre, tipoNegocio, contactoPrincipal, estadoRelacion, ... }` — the business entity. No `telefono` field directly (only `contactoPrincipal`).
- **ClientUserManagementService** (admin-only): `POST /api/v1/admin/client-users` requires `clienteId`, `email`, `password` — only accessible by tenant admin, NOT public.
- **ClientAuthService**: login only — no registration endpoint.
- **Login page**: Already links to `/registro` ("Crear cuenta") and handles `?registered=` query param for post-registration success.
- **Registro page**: `/registro/page.tsx` EXISTS, calls `POST /api/v1/auth/register` with `{ email, password, name, businessName }` — but that endpoint creates a **TENANT** (admin signup), not a client user.
- **Openspec specs**: `client-auth`, `client-user-management`, `client-self-service` — none cover registration.
- **Tenant resolution**: Via `Host` header subdomain → `req.tenantId` on every request via middleware. Registration endpoint would inherit this automatically.

**Key gap**: The frontend `/registro` page exists and is wired, but it calls the wrong backend endpoint. The admin endpoint for creating ClientUsers is not public and requires a `clienteId` that a self-registering user wouldn't have.

### Affected Areas

| Area | Impact | Why |
|------|--------|-----|
| `apps/api/src/modules/client-auth/client-auth.controller.ts` | **Modify** | Add `POST register` endpoint |
| `apps/api/src/modules/client-auth/client-auth.service.ts` | **Modify** | Add `register()` method — create Cliente + ClientUser |
| `apps/api/src/modules/client-auth/dto/client-auth.dto.ts` | **Modify** | Add `RegisterDto` with name, email, password |
| `apps/tenant-web/src/app/registro/page.tsx` | **Modify** | Change API call from `/api/v1/auth/register` to `/api/v1/client/auth/register` |
| `packages/database/prisma/schema.prisma` | **Maybe** | Add `name`, `telefono` to Cliente? Or add `name` to ClientUser? |
| `openspec/specs/client-auth/spec.md` | **Modify** | Add registration requirement & scenarios |
| `openspec/specs/client-self-service/spec.md` | **Maybe** | If profile page now shows data entered at registration |

### Schema & Data Flow Analysis

**The `Cliente` vs `ClientUser` question:**
- `ClientUser` = login credentials (email + password), links to a Cliente
- `Cliente` = business entity profile (name, phone, type, etc.)
- Self-registration MUST create BOTH — a Cliente (the "who") and a ClientUser (the "how to log in")
- `ClientUser` has NO `name` or `telefono` fields — those live on `Cliente`
- `ClientUser.email` is globally unique (schema constraint); `(tenantId, email)` also unique
- Registration form already collects: `name` (string), `email`, `password`, `businessName` (optional)

**Tenant association**: The registering user lands on `{slug}.crmmaster.com/registro`. The TenantResolveMiddleware already sets `req.tenantId`. No user choice needed — the tenant IS the subdomain they're on.

**Activation**: ClientUser has `isActive` (default `true`). No email verification or admin approval exists today. The login flow already checks `isActive`.

### Approaches

1. **Minimal — Extend client-auth with register; always create both Cliente + ClientUser**
   - Add `POST /api/v1/client/auth/register` to ClientAuthController
   - Method creates a new `Cliente` (with `nombre` from form) and `ClientUser` linked to it
   - Reuse existing rate limiting from login (IP-based)
   - Frontend `/registro` changes API URL + removes `businessName`
   - No email verification, auto-activate (`isActive = true`)
   - Pros: Fastest path, reuses existing infrastructure, minimal schema change
   - Cons: No verification — anyone can register; no admin approval; `ClientUser` has no name field
   - Effort: **Small**

2. **With email verification**
   - Same as #1 + generate verification token, send email, set `isActive = false` until verified
   - Add `verification`-like model or use existing `ba_verifications` table
   - Need email sending service (check `TenantEmailModule`)
   - Pros: More secure, validates email ownership
   - Cons: Requires email service integration, increases complexity significantly
   - Effort: **Medium-Large**

3. **With admin approval gate**
   - Registration creates Cliente + ClientUser with `isActive = false`
   - Admin (Ricardo/tenant admin) must approve via admin panel
   - No email verification for MVP
   - Pros: Full control for tenant admin
   - Cons: Admin overhead, delays client access; needs admin UI for approval
   - Effort: **Medium**

### Recommendation

**Approach #1 (Minimal) — but add `nombre` to Cliente via the registration form.**

Rationale:
- The frontend `/registro` page is already built and wired — we just need the backend
- The user said "end customers can sign up on their own" — auto-activate is the simplest path
- No email verification means we ship fast; tenant admins can always disable users via the existing admin panel
- The `ClientUser` model doesn't have a `name` field, but `Cliente.nombre` does — use it
- Rate limiting already exists in `ClientAuthService` and can be reused/applied to registration too
- The `businessName` field in the existing frontend is the business name → maps to `Cliente.nombre`
- The `name` field is the person's name → could go to `Cliente.contactoPrincipal` or we could add a `nombre` to `ClientUser`

**Schema suggestion**: Add an optional `nombre` (name) field to the `ClientUser` model so the registered user has their own display name separate from the business entity name. The `Cliente.nombre` stores the business/company name.

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Spam/fake registrations** | Medium | Rate limit per IP (reuse existing `RATE_LIMIT_MAX`); email global uniqueness prevents same-email spam |
| **No email verification → invalid emails** | Medium | Accept for MVP; tenant admin can disable; add verification later as enhancement |
| **Cross-tenant registration via curl** | Low | `tenantId` comes from Host header middleware, not from body — attacker would need valid subdomain |
| **`businessName` vs `name` confusion** | Low | Frontend already has both fields; map `name` → `ClientUser.nombre` (new field), `businessName` → `Cliente.nombre` |
| **Existing `/registro` calls wrong endpoint** | Low (dev only) | Frontend currently broken on registration — but it's a feature that was never finished, so no regression |

### Schema Changes Needed

```prisma
model ClientUser {
  id           String   @id @default(cuid())
  clienteId    String
  tenantId     String
  nombre       String?  // NEW — display name for the client user
  email        String   @unique
  passwordHash String
  telefono     String?  // NEW — optional phone number
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  // ...
}
```

### Open Questions

1. **Auto-activate or require email verification?** — The minimal approach auto-activates. But should we require email verification before first login?
2. **What about the `businessName` field?** — The existing registro form has it optional. Should we keep it (maps to `Cliente.nombre`) or remove it (assume individual registrations)?
3. **Rate limiting**: Same limits as login (5/min)? Or more generous for registration (e.g., 3/hour per IP)?
4. **Password policy**: Login allows min 6 chars; client-user-management requires min 8. Which standard for registration?

### Ready for Proposal

**Yes** — the scope is clear, the approaches are well-understood, and the codebase context is complete. Recommend proceeding with proposal using **Approach #1** (minimal, auto-activate, create both Cliente + ClientUser). The open questions above should be answered in the proposal phase.
