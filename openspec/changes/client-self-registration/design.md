# Design: Client Self-Registration

## Technical Approach

New public `POST /api/v1/client/auth/register` under `client-auth`. `tenantId`
resolved by `TenantResolveMiddleware` from `Host` (unchanged). Reuses login
rate-limit pool. Atomic `Cliente` + `ClientUser` via `prisma.admin.$transaction`.
Auto-activates (`isActive=true`); no token issued; client redirects to
`/login?registered=true`.

## Architecture Decisions

| Decision | Choice | Alternative | Why |
|---|---|---|---|
| Prisma client | `prisma.admin` (unscoped) for both writes, with explicit `tenantId` | `forTenant(tenantId).$transaction` | `ClientUser` is in `TENANT_SCOPED_MODELS` and `CLIENTE_SCOPED_MODELS` (per `tenant-models.ts`); an unscoped client forces explicit `tenantId`, matching the existing `login()` pattern. |
| Transaction API | `prisma.admin.$transaction([createCliente, createClientUser])` (array form) | Interactive transaction with rollback | Array form is sufficient (2 simple writes, no conditional logic), cheaper, and atomic. |
| Password hashing | `bcrypt.hash(password, 12)` | argon2, scrypt | Matches `login()` and admin user creation; reuse cost. |
| Rate limit | Reuse `rateLimitMap` + `getCurrentAttempt` + `getProgressiveDelay` | Separate pool | Spec requires shared pool; one limiter, one source of truth. |
| Auto-activation | `isActive = true` | `isActive = false` + email verify | Spec: zero friction for MVP. Admin can disable later. |
| `businessName` fallback | `Cliente.nombre = businessName ?? nombre` | Always `nombre` | Preserves user intent when they supply a business name. |
| Frontend param | `?registered=true` | `?registered=<email>` | Spec scenario uses boolean; login-form already keys off presence. |
| Schema fields | `nombre` + `telefono` on `ClientUser`, both `String?` | New `Persona` table | Additive, nullable, no migration risk. `telefono` reserved for future use; not exposed in MVP UI. |

## Data Flow

```
Client /registro
  POST /api/v1/client/auth/register { nombre, email, password, businessName? }
    │
    ▼  TenantResolveMiddleware → req.tenantId
ClientAuthController.register()
    │  rateLimit.check(ip, email)        → 429 if blocked
    │  DTO validate                       → 400 if invalid
    ▼
ClientAuthService.register()
    │  bcrypt.hash(password, 12)
    │  prisma.admin.$transaction([
    │    cliente.create({ tenantId, nombre: businessName ?? nombre }),
    │    clientUser.create({ tenantId, clienteId, email, nombre, passwordHash, isActive: true }),
    │  ])
    ▼
201 { clientUser: { id, nombre, email } }   (no passwordHash, no token)
    ▼
Client → router.push('/login?registered=true')
```

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/database/prisma/schema.prisma` | Modify | Add `nombre String?` + `telefono String?` to `ClientUser` (lines ~213-228). |
| `packages/database/prisma/generators/tenant-scope/generated/*` | Regenerate | `pnpm --filter database generate:scope` — re-derives lists. Integrity stays intact (no new scoped fields). |
| `apps/api/src/modules/client-auth/dto/client-auth.dto.ts` | Modify | Add `RegisterDto` (`nombre`, `email`, `password`, `businessName?`) with `@IsEmail`, `@IsString`, `@MinLength(8)`, `@IsOptional()`. |
| `apps/api/src/modules/client-auth/client-auth.service.ts` | Modify | Add `register(dto, tenantId, ip)` method: rate-limit check → bcrypt hash → `$transaction([cliente.create, clientUser.create])` → strip `passwordHash`. |
| `apps/api/src/modules/client-auth/client-auth.controller.ts` | Modify | Add `@Public() @Post('auth/register')` handler; resolve `tenantId` from `req.tenantId` (throw `ForbiddenException` if missing); `@HttpCode(201)`. |
| `apps/api/src/modules/client-auth/client-auth.service.spec.ts` | Modify | Add RED tests for `register()`: success, duplicate-email (same tenant → 409, cross-tenant → 409), validation 400, rate-limit 429, cross-tenant isolation, password hashing, login-after-register. |
| `apps/tenant-web/src/app/registro/page.tsx` | Modify | URL → `/api/v1/client/auth/register`; body key `name` → `nombre`; redirect to `/login?registered=true`. |

## Interfaces / Contracts

```ts
// dto/client-auth.dto.ts
export class RegisterDto {
  @IsString() @MinLength(1) @MaxLength(120) nombre!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
  @IsOptional() @IsString() @MaxLength(200) businessName?: string;
}

// service response (controller wraps in 201)
interface RegisterResult { clientUser: { id: string; nombre: string; email: string } }
```

Error mapping: `BadRequestException` (400, validation), `ConflictException` (409,
unique violation `P2002`), `HttpException(429)` (rate limit — matches existing
`login()` text), `ForbiddenException` (no `tenantId` on request).

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Service unit | `register()` success; password hashed; `passwordHash` absent; duplicate-email (same + cross tenant) → 409; weak password → 400; `businessName` fallback; auto-activation | Extend `client-auth.service.spec.ts`; existing `prisma.admin` setup. |
| Service unit | 6th attempt in 60s → 429 | Reuse `TEST_IP`; assert `HttpException` 429. |
| E2E | `register` then `login` → 200 + cookie | New `apps/api/test/e2e/register-login.e2e-spec.ts`; supertest + clean DB. |
| E2E | Registration vs unknown tenant → 403 | Same e2e suite, different `Host`. |
| Integrity | Generator consistent after schema edit | `pnpm --filter database generate:scope:verify` in CI. |

No doorbell test needed: new `Cliente`/`ClientUser` are created inside the
same `tenantId` transaction; no cross-tenant boundary is crossed by the new path.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file
classification, or process-integration boundary is added or modified. The
change is an HTTP endpoint over the existing NestJS stack.

## Migration / Rollout

Additive schema only (nullable). Deploy order: (1) `prisma migrate dev
--name add_client_user_nombre_telefono`, (2) `pnpm --filter database
generate:scope`, (3) deploy `apps/api`, (4) deploy `apps/tenant-web`. No
feature flag — rollback = revert both deploys and the migration.

## Open Questions

- None blocking. Future enhancement: email verification + CAPTCHA + admin
  approval gate (deferred per proposal "Out of scope").
