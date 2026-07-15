# Proposal: Client Platform & Role-Based Login Routing

## Intent

The CRM-Master tenant portal has admin-side features (SPEC-0005/0006/0008) but no self-service experience for end customers (`Cliente` entity). End customers cannot log in, view their own appointments/documents, or update their profile. This change adds a client identity layer, role-based login dispatch, and a client-facing portal. Approach: **route groups** in `tenant-web` — `(admin)/` and `(client)/` share the app and domain, with distinct layouts and auth contexts.

## Scope

### In Scope
- `ClientUser` model: `clienteId`, `tenantId`, `email`, `passwordHash` (bcrypt), `isActive` — schema change, ADR required (AGENTS.md rule 8)
- Client auth endpoints: `POST /api/v1/client/auth/login`, `POST /logout`, `GET /me`
- Better-Auth JWT in HttpOnly cookie `__Secure-client-session` (claims: `{ sub, clienteId, tenantId, role: 'client' }`)
- Login dispatch: `User.role === 'admin'` → `/admin`; new `ClientUser` → `/portal`
- Route groups: `(admin)/` (moved) and `(client)/` (new) with separate layouts
- `ClientAuthGuard` for client-scope endpoints
- ClienteId-level Prisma scoping: `createPrismaClient({ tenantId, clienteId })`
- Client pages: portal dashboard, profile, my-appointments, my-documents
- Extract `Button`, `Card`, `Badge`, `Layout` → `packages/ui`
- TDD: tests-first; doorbell isolation extended cross-client

### Out of Scope
- Client self-registration, OAuth social login, password reset email (v2)
- Client messaging, billing portal, mobile app
- Migrating admin-web pages beyond the 4 primitives

## Capabilities

### New Capabilities
- `client-auth`: Client login/logout/session/role-routing — distinct from admin auth
- `client-self-service`: Authenticated client views own appointments, documents, profile
- `client-user-management`: `ClientUser` lifecycle (admin creates, disables, resets password)
- `shared-ui`: Reusable component package

### Modified Capabilities
- None (depends on SPEC-0002 Better-Auth shipping first)

## Approach

**Route groups** in `tenant-web/src/app/`: `(admin)/` and `(client)/` — same Next.js app, same domain `{slug}.crmmaster.com`, distinct layouts and server-side auth checks. `apps/tenant-web/src/middleware.ts` reads cookie type and rewrites route.

**Login flow**: `{slug}.crmmaster.com/login` → `POST /api/v1/client/auth/login` → `ClientAuthService` looks up `ClientUser` by `(tenantId, email)`, bcrypt-verifies, Better-Auth issues JWT → HttpOnly cookie. `GET /client/me` returns `{ clientUser, cliente }`. Frontend router dispatches by role.

**Scoping**: `createPrismaClient` extended with `clienteId`. Client endpoints always pass both; extension injects `where: { clienteId }` on `Cliente`-linked models. `passwordHash` excluded from default select and stripped by serializer.

**Shared UI**: `packages/ui` exports 4 primitives from `apps/admin-web/src/components/`. Workspace `*` dep; tree-shaking keeps bundles small.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/modules/client-auth/` | New | Controller, service, guard, DTOs, bcrypt wrapper |
| `apps/tenant-web/src/app/(admin)/` | New | Route group; moves existing `/app/admin/` |
| `apps/tenant-web/src/app/(client)/` | New | Login, portal dashboard, profile, my-appointments, my-documents |
| `apps/tenant-web/src/middleware.ts` | New | Subdomain→tenant; cookie→role-based rewrite |
| `apps/tenant-web/src/app/login/page.tsx` | New | Unified login dispatching by role |
| `packages/database/prisma/schema.prisma` | Modified | Add `ClientUser` model + relation to `Cliente` (ADR) |
| `packages/database/src/index.ts` | Modified | `createPrismaClient` extended with `clienteId` |
| `packages/shared/src/` | Modified | Add `client-auth` Zod schemas + DTOs |
| `packages/ui/` | New | Button, Card, Badge, Layout primitives |
| `apps/admin-web/src/components/` | Modified | Migrate 4 primitives to `packages/ui`; re-import |
| `apps/api/src/app.module.ts` | Modified | Register `ClientAuthModule` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| **SPEC-0002 (Better-Auth) not yet merged** | High | Hard prerequisite; reuse its `BetterAuthGuard` pattern |
| Same-origin cookie confusion (admin vs client) | Med | Distinct cookie names + separate guards refuse wrong token type |
| ClienteId data leakage | Med | Extension requires `clienteId`; doorbell test extended cross-client |
| `passwordHash` exposure in responses | Low | Explicit `select` excludes it; serializer regression test |
| Cita model dependency | Low | ✅ SPEC-0006 shipped — no blocker |

## Rollback Plan

Reverse-order PR revert: shared UI → routes → `ClientUser` migration → auth. `ClientUser` migration reversible via Prisma down-migration. Deleting `(client)/` is non-breaking (no external links in v1). Cookie has short max-age. Does NOT touch `(admin)/`, `admin-web`, or existing tenant functionality.

## Dependencies

- **SPEC-0002 (Better-Auth integration)**: PREREQUISITE — must ship first
- **SPEC-0006 (Citas)**: ✅ shipped
- **SPEC-0005 (Documentos)**: ✅ shipped
- **ADR for `ClientUser` schema**: required by AGENTS.md rule 8

## Success Criteria

- [ ] `POST /api/v1/client/auth/login` → 200 + `__Secure-client-session` for valid creds
- [ ] Wrong password → 401; missing tenant → 404; deactivated `ClientUser` → 403
- [ ] `GET /api/v1/client/me` → 200 with `{ clientUser, cliente }`
- [ ] Client A's JWT cannot access Client B's data (doorbell test extended)
- [ ] Admin JWT and Client JWT NOT interchangeable (separate cookies, guards)
- [ ] Login dispatch: `User.role === 'admin'` → `/admin`; `ClientUser` → `/portal`
- [ ] Client views own appointments and documents only
- [ ] `ClientUser.passwordHash` never appears in any API response (regression test)
- [ ] `packages/ui` consumed by admin-web, tenant-web (admin + client)
- [ ] TDD: tests written and failing BEFORE implementation per capability
- [ ] Doorbell isolation gate passes; conventional commits; ADR referenced
