# Proposal: SPEC-0005 — Better-Auth Migration

## Intent

Replace the in-memory `SessionService` (created as a security hotfix in
SPEC-0002) with **Better-Auth** — a proper auth solution with database-backed
sessions, organizations, and role-based access. This is the foundation for all
future tenant-facing features (documentos, citas, etc.).

Without this, tenant-web cannot exist: there's no way for a tenant admin to
authenticate, and the current `SessionService` doesn't persist sessions.

## Scope

### In Scope
- Better-Auth integration: adapter Prisma, organizations, email+password auth
- New `BetterAuthGuard` replaces `AdminAuthGuard` (same `request.user` contract)
- Prisma migration: Better-Auth tables (users, sessions, accounts, organizations, members)
- Backfill: create organization per existing Tenant, migrate existing users with memberships
- Remove `SessionService` and `AdminAuthGuard` (after guard is green)
- Update all doorbell tests to use Better-Auth real sessions
- Role model: superadmin (cross-tenant) + tenant-admin (scoped to org)

### Out of Scope
- OAuth providers (Google, GitHub) — v1.5
- MFA / 2FA — v2
- Password reset flow — v1.5
- Email verification — v1.5
- Tenant-web UI (separate spec) — SPEC-0006+

## Approach

1. Investigate Better-Auth v1.x adapter for Prisma — check breaking changes
2. Create migration for Better-Auth tables alongside existing schema
3. Implement `BetterAuthGuard` with same `request.user` shape as `AdminAuthGuard`
4. Backfill organizations from existing tenants
5. Update doorbell tests to use real Better-Auth login
6. Remove old SessionService + AdminAuthGuard only after all green

## Risks

| Risk | Mitigation |
|------|------------|
| Better-Auth v1 breaking changes | Investigate in isolated branch first |
| SessionService users in test DB | Backfill script handles existing data |
| Doorbell test regression | Run full suite before/after swap |
| Superadmin role in org model | Design guard to support both superadmin (org-less) and tenant-admin (org-scoped) |

## Success Criteria

- [ ] All doorbell tests pass using Better-Auth real sessions (same assertions)
- [ ] Superadmin → 200 on `/admin/*`, tenant-admin → 403 on `/admin/*`
- [ ] SessionService + AdminAuthGuard removed
- [ ] `BetterAuthGuard` extends to future roles without rewrite
- [ ] `pnpm test` + `pnpm test:e2e` 0 regressions
