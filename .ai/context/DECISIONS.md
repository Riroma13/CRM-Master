# DECISIONS — Architecture Decision Records

> Formato: Problema → Contexto → Decisión → Consecuencias

---

## ADR-001: Login retorna siempre 401

**Problema**: El login de cliente devolvía 404 (email no existe) vs 401 (contraseña incorrecta), filtrando existencia de usuarios.

**Decisión**: Todos los fallos de autenticación devuelven `401 Unauthorized` con mensaje idéntico `"Credenciales inválidas"`. Además:
- Comparación en tiempo constante (dummy hash si usuario no existe)
- Rate limiting: 5 intentos/minuto por IP+email
- Retraso progresivo: 0→200→500→1000→2000ms
- Logging interno con email hasheado (sin PII)

**Consecuencias**: + seguridad contra enumeración de usuarios. El rate limiting puede requerir ajuste según patrón de uso real.

**Archivo**: `apps/api/src/modules/client-auth/client-auth.service.ts`
**Tags**: `auth`, `security`, `breaking`

---

## ADR-002: Tenant scope generado desde schema.prisma

**Problema**: Las listas de modelos con `tenantId`/`clienteId` estaban hardcodeadas en `createPrismaClient()`. La de `clienteId` solo tenía 2 de 9 modelos reales.

**Decisión**: Crear un generador que lee `schema.prisma` y produce:
- `tenant-models.ts` — listas tipadas de modelos
- `tenant-metadata.json` — metadata para CI
- `tenant-scope.spec.ts` — tests automáticos

Si alguien agrega `tenantId` o `clienteId` a un modelo, el sistema se actualiza solo en el próximo `pnpm generate`. CI verifica que los generated files no estén stale.

**Consecuencias**: Zero mantenimiento manual. Detección temprana de errores. El generador debe ejecutarse después de cada `prisma generate`.

**Archivo**: `packages/database/prisma/generators/tenant-scope/generator.ts`
**Tags**: `architecture`, `schema`, `generation`, `scalability`

---

## ADR-003: Email de ClientUser globalmente único

**Problema**: El modelo `ClientUser` tenía `email @unique` (global) y `@@unique([tenantId, email])` (compuesto). El ADR original documentaba solo el compuesto.

**Decisión**: Mantener AMBOS. El `@unique` global es más seguro (previene colisión de emails entre tenants). El compuesto se conserva como índice adicional y safety net. El ADR se actualizó para reflejar la implementación real.

**Consecuencias**: No se puede tener el mismo email en dos tenants distintos. Si en el futuro se necesita, hay que sacar el `@unique` global (migration).

**Archivo**: `packages/database/prisma/schema.prisma:217,226`
**Tags**: `schema`, `auth`, `data-model`

---

## ADR-004: Portal de cliente con route groups

**Problema**: Necesitábamos separar rutas de admin vs cliente en el mismo dominio `{slug}.crmmaster.com` sin cambiar URLs existentes.

**Decisión**: Route groups de Next.js: `(admin)/` y `(client)/` en la misma app `tenant-web`. Middleware Edge lee la cookie y redirige según el role. URLs de admin no cambian.

**Consecuencias**: Sin CORS, sin dos apps, sin subdominio separado. El middleware debe verificar firma JWT (no confiar en decode).

**Archivo**: `apps/tenant-web/src/middleware.ts`
**Tags**: `frontend`, `routing`, `auth`

---

## ADR-005: Shared UI package

**Problema**: Button, Card, Badge, Layout estaban duplicados en admin-web y tenant-web.

**Decisión**: Extraer a `packages/ui` como workspace package ESM (`@crm-master/ui`). Admin-web migrado completamente. Tenant-web migrado en PR2.

**Consecuencias**: Unica fuente de verdad para componentes base. Tree-shakeable. Las apps que no usen un componente no lo incluyen en el bundle.

**Archivo**: `packages/ui/`
**Tags**: `frontend`, `components`, `reusability`

---

## ADR-006: Feature-branch-chain para PRs grandes

**Problema**: Cambios >400 líneas son difíciles de revisar.

**Decisión**: Feature-branch-chain: cada PR apunta al anterior, solo el tracker mergea a main. PRs pequeños y revisables (~400 líneas cada uno).

**Consecuencias**: Revisión más fácil. Rollback controlado. Requiere disciplina: nunca un branch sin commits.

**Tags**: `workflow`, `review`, `scalability`
