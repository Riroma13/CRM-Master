# ADR 0002 — Migración de SessionService a Better-Auth

- **Número ADR:** ADR-0002
- **Fecha:** 2026-07-06
- **Autor:** Sistema
- **Estado:** Aceptado

---

## 1. Contexto

CRM-Master usaba un `SessionService` con token efímero en memoria para
gestionar sesiones de administración. Este enfoque presentaba varias
limitaciones:

- Las sesiones no persisten entre reinicios del servidor.
- No hay mecanismo de expiración/revocación de tokens más allá del TTL en
  memoria.
- No hay soporte nativo para autenticación por email/contraseña con password
  hashing.
- Escalar horizontalmente requiere una sesión compartida (Redis/DB), que
  no estaba implementada.
- `AdminAuthGuard` validaba tokens mediante lógica ad-hoc, sin un estándar
  de autenticación externo.
- Los tests creaban sesiones mock directamente sin validar el pipeline de
  autenticación real.

Better-Auth es una librería de autenticación que provee sesiones persistentes
en PostgreSQL, password hashing con bcrypt, soporte multi-tenant mediante
organizaciones, y un plugin bearer para APIs REST.

## 2. Decisión

> **Decidimos** reemplazar `SessionService` + `AdminAuthGuard` por
> `better-auth` con `prismaAdapter` y un nuevo `BetterAuthGuard`
> **porque** necesitamos sesiones persistentes, password hashing real,
> y un pipeline de autenticación estándar y testeable,
> **aceptando que** la integración con Better-Auth v1 requiere bypassar
> `auth.api.getSession()` debido a un conflicto de nombres de modelo
> (`User` de Prisma vs `ba_users` de Better-Auth), usando raw SQL sobre
> `ba_sessions` como mecanismo de validación en el guard.

## 3. Consecuencias

### Positivas

- Sesiones persistentes en `ba_sessions` (sobreviven reinicios del servidor).
- Password hashing real mediante plugin `emailAndPassword` de Better-Auth.
- Base para migrar a autenticación multi-tenant con organizaciones (org plugin).
- Eliminación de código ad-hoc de manejo de sesiones.
- Tests pueden usar sesiones reales contra `ba_sessions` en lugar de mocks.
- La validación de sesión ahora cruza la tabla `ba_sessions` + `ba_users`,
  verificando expiración y existencia en una sola query.

### Negativas

- El guard usa raw SQL en lugar de `auth.api.getSession()` — si Better-Auth
  cambia el formato de tokens o el schema de `ba_sessions`, el guard requerirá
  actualización manual.
- Complejidad adicional en el seed de tests (hay que poblar
  `ba_users`/`ba_sessions`/`ba_members`/`ba_organizations` además de las
  tablas legacy).
- Dependencia externa: `better-auth` v1.6.x con sus propias actualizaciones
  y posibles breaking changes.

## 4. Alternativas consideradas

### Alternativa A: Redis + sesiones propias

- **Descripción:** Mantener `SessionService` pero respaldarlo con Redis para
  persistencia y escalabilidad horizontal.
- **Pros:** Control total sobre el formato de sesión y expiración.
- **Contras:** Implementar password hashing, rate limiting, y rotación de
  tokens desde cero. Más código a mantener y testear.
- **Por qué se descartó:** Duplicaría funcionalidad que Better-Auth ya
  provee, sin ventajas claras.

### Alternativa B: Auth0 / Clerk (SaaS externo)

- **Descripción:** Delegar toda la autenticación a un servicio externo.
- **Pros:** Zero código de auth, features avanzadas (MFA, SSO) sin esfuerzo.
- **Contras:** Dependencia externa, costo recurrente, latencia de red para
  validar sesiones, complejidad en multi-tenant con subdominios.
- **Por qué se descartó:** CRM-Master debe poder operar on-premise/VPS sin
  depender de servicios externos. Better-Auth es auto-hosteable.

### Alternativa C: Usar `auth.api.getSession()` directamente

- **Descripción:** En lugar de raw SQL, usar el método `getSession()` que
  Better-Auth provee.
- **Pros:** API oficial, compatible con futuras versiones de Better-Auth.
- **Contras:** Better-Auth v1.6.x requiere HMAC-signed session tokens (vía
  bearer plugin) y cookies para `getSession()`. Adicionalmente, el
  `prismaAdapter` choca con el modelo `User` de Prisma (nuestro modelo legacy
  se llama igual que el de Better-Auth), impidiendo que Better-Auth consulte
  correctamente `ba_users`. Esto fuerza el bypass.
- **Por qué se descartó:** Problemas de compatibilidad reales en v1.6.x.

## 5. Mitigaciones

- [x] Monitorear releases de Better-Auth para identificar cuándo se resuelva
  el conflicto de naming de modelos.
- [x] Documentar el bypass con raw SQL en el código del guard (comentario
  explícito con la razón técnica).
- [x] Los tests de doorbell verifican que la query raw a `ba_sessions`
  funciona correctamente (seed verification step).

## 6. Impacto

- Backend: Reemplazo de `SessionService` + `AdminAuthGuard` por
  `BetterAuthGuard` + `AuthClientProvider`.
- Base de datos: Nuevas tablas `ba_*` (Better-Auth) más campos de linking
  (`better_auth_user_id` en `users`, `better_auth_org_id` en `tenants`).
- Seguridad: Password hashing real (bcrypt), sesiones persistentes con
  expiración en DB.
- Tests: Doorbell tests migrados a sesiones reales en `ba_sessions`.
  Seed de tests incluye datos de Better-Auth.

## 7. Referencias

- Spec: `docs/specs/0005-better-auth-migration.md`
- Design: `openspec/changes/SPEC-0005-tenant-auth/design.md`
- Better-Auth docs: https://www.better-auth.com/
- ADR-0001: Estrategia de Multi-Tenancy y Acceso por Subdominio
