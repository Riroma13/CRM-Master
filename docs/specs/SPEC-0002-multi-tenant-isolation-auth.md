# Spec 0002 — Aislamiento y autenticación multi-tenant

**Spec ID:** `SPEC-0002`
**Estado:** `proposed`
**Autor:** @ricardo
**Fecha:** 2026-07-01
**Área:** `api` | `auth` | `database`

---

## 1. Contexto / Problema

CRM-Master es multi-tenant por diseño (ADR-0001: row-level con `tenant_id`). Tenemos el Prisma Client Extension que inyecta `tenant_id` automáticamente, pero eso no basta.

Los riesgos concretos:

- Un bug en el middleware de resolución de tenant permitiría a un usuario ver datos de otro tenant.
- Una query mal construida que no pase por Prisma (raw SQL, `$queryRaw`, `$executeRaw`) puede saltarse el scoping automático.
- Sin tests explícitos de fuga, estos bugs llegan a producción.
- Better-Auth necesita integrarse correctamente: la sesión debe tener el `tenantId` vinculado, y las orgs de Better-Auth deben corresponder 1:1 con los tenants de nuestra DB.

El objetivo de esta spec es CERRAR esos riesgos con una capa de defensa múltiple.

## 2. Objetivo

Garantizar que ningún query, endpoint o sesión pueda filtrar datos entre tenants, mediante:

1. Integración de Better-Auth con organizations como tenants.
2. Middleware de resolución de tenant por subdominio (`Host` header).
3. Prisma Client Extension que scopes automáticamente y bloquea raw queries sin tenant_id.
4. Test de fuga obligatorio en el pipeline (debe fallar si una query cruza tenants).

## 3. Alcance

### 3.1 In-scope

- [ ] Integración Better-Auth: organizations = tenants, login por subdominio
- [ ] Middleware `TenantResolveMiddleware` en NestJS: extrae slug del Host → lookup en DB → inyecta `tenantId` en request
- [ ] Sesión: `tenantId` en JWT + verificación en cada request
- [ ] Prisma Client Extension reforzada: bloqueo de `$queryRaw` y `$executeRaw` sin override explícito
- [ ] Guard `TenantScopeGuard` que rechaza requests sin tenantId resuelto
- [ ] Endpoints de sesión: login del admin de tenant, logout, refresh
- [ ] Endpoint `GET /api/v1/me` con datos del usuario + tenant actual
- [ ] Test de fuga entre tenants (CRÍTICO — debe fallar si la query escapa)
- [ ] Test del middleware de resolución de tenant
- [ ] Test de sesión cross-tenant

### 3.2 Out-of-scope

- Registro de usuario público — spec separada (parte de SPEC-0001)
- Roles y permisos dentro del tenant — spec separada
- OAuth con terceros (Google, GitHub) — v2
- Refresh token rotation — implementación estándar de Better-Auth
- Logout de todos los dispositivos — v1.5

## 4. Diseño / Decisión técnica

### Arquitectura de defensa en profundidad

```text
                ┌──────────────────────────┐
                │    Request HTTP           │
                │   Host: {slug}.crmm.com   │
                └──────────┬───────────────┘
                           │
                ┌──────────▼───────────────┐
                │  Capa 1: TenantResolve    │
                │  Middleware (NestJS)      │
                │  Extrae slug del Host     │
                │  → lookup en DB Cache     │
                │  → inyecta tenantId       │
                └──────────┬───────────────┘
                           │
                ┌──────────▼───────────────┐
                │  Capa 2: TenantScopeGuard │
                │  Rechaza si falta tenant  │
                │  o está desactivado       │
                └──────────┬───────────────┘
                           │
                ┌──────────▼───────────────┐
                │  Capa 3: JWT Session      │
                │  tenantId en payload +    │
                │  verificado en cada call  │
                └──────────┬───────────────┘
                           │
                ┌──────────▼───────────────┐
                │  Capa 4: Prisma Client    │
                │  Extension (scoping)      │
                │  + bloqueo raw queries    │
                └──────────┬───────────────┘
                           │
                ┌──────────▼───────────────┐
                │  Capa 5: Tests de fuga    │
                │  (doorbell test)          │
                │  FALLAN si cruza tenant   │
                └──────────────────────────┘
```

### Mejor-Auth + Organizations

Better-Auth soporta organizations como entidades separadas. Cada tenant de CRM-Master se mapea 1:1 a una organización en Better-Auth.

```typescript
// Flujo de login:
// 1. User navega a https://{slug}.crmmaster.com/login
// 2. TenantResolveMiddleware detecta slug → obtiene tenantId
// 3. Login se hace con credentials del user
// 4. Better-Auth autentica contra la org del tenant
// 5. JWT emitido con: { sub, email, tenantId, role, orgId }

// Middleware de resolución:
@Injectable()
export class TenantResolveMiddleware implements NestMiddleware {
  private cache = new Map<string, { tenantId: string; isActive: boolean }>();

  async use(req: Request, res: Response, next: NextFunction) {
    const host = req.headers.host;
    const slug = this.extractSlug(host);

    if (!slug || RESERVED_SLUGS.includes(slug)) {
      // Es request a admin-web (Mission Control) — no requiere tenant
      return next();
    }

    const cached = this.cache.get(slug);
    if (cached && cached.isActive) {
      req.tenantId = cached.tenantId;
      return next();
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Tenant not found');
    }

    this.cache.set(slug, { tenantId: tenant.id, isActive: tenant.isActive });
    req.tenantId = tenant.id;
    next();
  }
}
```

### Prisma Client Extension reforzada

La extensión actual en `packages/database/src/index.ts` scopes automáticamente. Se refuerza para:

1. **Bloquear raw queries** a menos que tengan override explícito.
2. **Loggear advertencias** si detecta queries sin tenantId.

```typescript
export function createPrismaClient(tenantId?: string) {
  const client = new PrismaClient();

  if (!tenantId) {
    return client.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            // Sin tenantId → solo modelos no scoped (Tenant mismo)
            const nonScopedModels = ['Tenant'];
            if (!nonScopedModels.includes(model)) {
              console.warn(
                `[TENANT SCOPE] Query sin scope en ${model}.${operation}`,
              );
            }
            return query(args);
          },
        },
      },
    });
  }

  // ... resto del scoping existente ...
}
```

### Test de fuga (crítico)

Este test es el "doorbell" del sistema. Debe FALLAR si alguna query cruza tenants.

```typescript
describe('Tenant isolation — data leakage test', () => {
  it('MUST fail if a query crosses tenants', async () => {
    // Arrange: dos tenants con datos separados
    const tenantA = await createTestTenant({ slug: 'tenant-a' });
    const tenantB = await createTestTenant({ slug: 'tenant-b' });

    const prismaA = createPrismaClient(tenantA.id);
    const prismaB = createPrismaClient(tenantB.id);

    await prismaA.cliente.create({
      data: { nombre: 'Solo-Tenant-A', tenantId: tenantA.id },
    });

    // Act: desde tenant B, listar clientes
    const clientesB = await prismaB.cliente.findMany();

    // Assert: NO debe ver el cliente de tenant A
    expect(clientesB).toHaveLength(0);
    expect(clientesB.find((c: any) => c.nombre === 'Solo-Tenant-A')).toBeUndefined();
  });

  it('MUST fail if raw SQL bypasses tenant scope', async () => {
    const tenantA = await createTestTenant({ slug: 'tenant-a-raw' });
    const tenantB = await createTestTenant({ slug: 'tenant-b-raw' });

    const prisma = createPrismaClient(tenantA.id);

    // Crear datos en tenant A via scoped client
    await prisma.cliente.create({
      data: { nombre: 'Cliente-A', tenantId: tenantA.id },
    });

    // Intentar raw query SIN tenant_id
    // Esta query DEBE fallar o devolver 0 resultados
    const leaked = await prisma.$queryRawUnsafe(
      'SELECT * FROM clientes WHERE nombre = $1',
      'Cliente-A',
    );

    expect(leaked).toHaveLength(0);
  });

  it('session from tenant A MUST NOT access tenant B data', async () => {
    // Simular: token de tenant A usado contra endpoint de tenant B
    const tokenA = signTestToken({ tenantId: 'tenant-a-id', role: 'admin' });

    const result = await request(app.getHttpServer())
      .get('/api/v1/clientes')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Host', 'tenant-b.crmmaster.com');

    // El tenantResolveMiddleware debe detectar la discrepancia
    // entre el tenantId del token y el tenantId del subdominio
    expect(result.status).toBe(403);
  });
});
```

### Política de sesión

| Configuración | Valor | Razón |
|---|---|---|
| Duración de sesión | 7 días | Balance seguridad/usabilidad |
| Refresh token | 30 días | Renovación automática |
| Cookie | `__Secure-session` | HttpOnly, Secure, SameSite=Lax |
| Sesión atada a | `tenantId + userId` | No reusable entre tenants |
| Logout | Destruye token en server | Revocación inmediata |

## 5. API / Interfaces

### 5.1 Endpoints

#### `POST /api/v1/auth/login`

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@garcia.com",
  "password": "********"
}
```

Nota: el tenant se resuelve del `Host` header. El login verifica que el email pertenece a la org del tenant.

```http
200 OK
{
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "admin" },
  "tenant": { "id": "uuid", "slug": "asesoria-garcia", "name": "Asesoría García" },
  "session": { "token": "jwt...", "expiresAt": "2026-07-08T18:00:00Z" }
}
```

Errores:
- `401` credentials inválidas
- `403` tenant desactivado
- `404` tenant no encontrado (por slug del Host)

#### `POST /api/v1/auth/logout`

```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```
```http
204 No Content
```

#### `GET /api/v1/me`

```http
GET /api/v1/me
Authorization: Bearer <token>
```

```http
200 OK
{
  "id": "uuid",
  "email": "admin@garcia.com",
  "name": "Juan García",
  "role": "admin",
  "tenant": {
    "id": "uuid",
    "slug": "asesoria-garcia",
    "name": "Asesoría García S.L."
  },
  "createdAt": "2026-07-01T18:00:00Z"
}
```

#### `POST /api/v1/auth/refresh`

```http
POST /api/v1/auth/refresh
Authorization: Bearer <refresh_token>
```

```http
200 OK
{
  "token": "new_jwt...",
  "refreshToken": "new_refresh...",
  "expiresAt": "..."
}
```

### 5.2 Tipos / DTOs / Schemas

```ts
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export interface SessionDto {
  token: string;
  refreshToken?: string;
  expiresAt: string;
  user: UserDto;
  tenant: TenantDto;
}

export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface TenantDto {
  id: string;
  slug: string;
  name: string;
}
```

### 5.3 Eventos

```ts
interface TenantLoginEvent {
  tenantId: string;
  userId: string;
  email: string;
  ip: string;
  occurredAt: string;
}
```

Este evento se emite en cada login para:
- Log de actividad en la bitácora del tenant
- Detección de accesos sospechosos (futuro)
- Métricas de uso

## 6. Modelo de datos

Sin cambios en el modelo — las tablas `Tenant` y `User` ya están definidas con `tenant_id`.

Posible mejora futura: añadir columna `lastLoginAt` a `User`.

## 7. Tests requeridos

### 7.1 Unitarios

- [ ] `TenantResolveMiddleware` extrae slug correctamente del Host header
- [ ] `TenantResolveMiddleware` rechaza Host sin slug de tenant (pasa a admin)
- [ ] `TenantResolveMiddleware` usa caché para evitar DB lookups repetidos
- [ ] `LoginSchema` valida email y password correctamente
- [ ] Prisma Client Extension scopes correctamente cada modelo

### 7.2 Integración

- [ ] Login con credenciales válidas → 200 + session + tenant info
- [ ] Login con password incorrecta → 401
- [ ] Login desde tenant desactivado → 403
- [ ] `GET /api/v1/me` con token válido → 200 + datos de usuario
- [ ] `GET /api/v1/me` sin token → 401
- [ ] `GET /api/v1/me` con token expirado → 401
- [ ] Logout → 204 + token invalidado

### 7.3 Seguridad — Tests de fuga (CRÍTICOS)

- [ ] **Test de fuga entre tenants (doorbell):** crear datos en tenant A, listar desde tenant B → 0 resultados
- [ ] **Test de raw SQL sin tenant_id:** query raw contra tabla scopeada → 0 resultados o error
- [ ] **Test de discrepancia Host/token:** token de tenant A usado con Host de tenant B → 403
- [ ] **Test de sesión cross-tenant:** token de tenant A NO puede acceder a endpoints de tenant B
- [ ] **Test de cache poisoning:** slug malicioso no envenena la caché del middleware

## 8. Checklist de implementación

- [ ] Spec aprobada
- [ ] Tests escritos y fallando (red)
- [ ] `TenantResolveMiddleware` con cache + slug extraction
- [ ] `TenantScopeGuard` con validación de tenant activo
- [ ] Prisma Client Extension reforzada con bloqueo de raw queries
- [ ] Integración Better-Auth organizaciones como tenants
- [ ] Endpoints: login, logout, me, refresh
- [ ] JWT con tenantId en payload
- [ ] Tests de fuga (doorbell) — DEBEN fallar sin las capas de defensa
- [ ] Refactor
- [ ] Lint y formato
- [ ] Cobertura ≥ 80%
- [ ] Commit con Conventional Commit
- [ ] Actualizar decisions-log.md

## 9. Notas / Preguntas abiertas

- **Better-Auth organizations API:** verificar si la versión npm instalada (`^1.0.0`) soporta organizations de forma nativa. Si no, implementar mapeo manual (Tenant en DB ↔ org en Better-Auth).
- **Cache de tenant slug:** la caché en memoria del `TenantResolveMiddleware` necesita invalidación si se modifica el tenant (activar/desactivar). Un hook de Prisma o un evento pueden mantenerla sincronizada.
- **Raw queries vs Prisma:** en v1, prohibir raw queries que no pasen por la extensión. Si se necesita una excepción documentada, debe pasar por un método explícito `withUnsafeScope()` que registre un warning.
- **Rate limiting en login:** implementar con BullMQ para evitar brute force.
- **Test doorbell en CI:** este test debe ejecutarse en cada PR como gate obligatorio antes de merge.

## 10. Referencias

- `docs/architecture/adr/0001-multi-tenancy-strategy.md` — resolución de tenant por subdominio
- `packages/database/src/index.ts` — Prisma Client Extension actual
- `apps/api/src/common/guards/tenant.guard.ts` — TenantGuard inicial
- `docs/specs/SPEC-0001-tenant-onboarding.md` — crea los tenants que esta spec protege
- Better-Auth docs: organizations y session management
