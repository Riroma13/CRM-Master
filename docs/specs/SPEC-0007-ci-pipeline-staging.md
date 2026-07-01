# Spec 0007 — Pipeline de CI + entorno de staging

**Spec ID:** `SPEC-0007`
**Estado:** `proposed`
**Autor:** @ricardo
**Fecha:** 2026-07-01
**Área:** `infra` | `api` | `admin-web` | `tenant-web`

---

## 1. Contexto / Problema

Antes de poner el primer cliente real en producción necesitamos:

1. Tests automáticos en cada PR que validen que el código no rompe nada.
2. Un entorno de staging donde verificar los cambios antes de producción.
3. Smoke tests de aislamiento multi-tenant como gate obligatorio.

Sin esto, cada deploy es un volado. Con esto, cualquier breaking change se detecta antes de llegar a producción.

## 2. Objetivo

Implementar un pipeline CI/CD completo con:

1. Tests automáticos (unit + integration + doorbell test) en cada push/PR.
2. Deploy automático a staging vía Caddy + Docker.
3. Smoke tests de aislamiento multi-tenant como gate de producción.

## 3. Alcance

### 3.1 In-scope

- [ ] GitHub Actions workflow para PR: lint → test → build
- [ ] Test de fuga multi-tenant (doorbell) como gate obligatorio
- [ ] Deploy automático a staging en cada push a `main`
- [ ] Entorno staging: `staging.crmmaster.com` con Caddy + Docker
- [ ] Smoke tests post-deploy en staging
- [ ] Gate de producción: smoke tests multi-tenant deben pasar
- [ ] Scripts de CI reusables localmente (`pnpm ci:check`)

### 3.2 Out-of-scope

- Deploy a producción automatizado (manual con aprobación en v1)
- E2E tests con navegador (Playwright) — spec separada
- Análisis de cobertura en CI (sí en local)
- Slack/email notificaciones
- Rollback automático

## 4. Diseño / Decisión técnica

### GitHub Actions workflow

```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: crm_master_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        run: pnpm --filter @crm-master/database db:generate

      - name: Run Prisma migrations (test DB)
        run: pnpm --filter @crm-master/database db:push
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/crm_master_test

      - name: Lint
        run: pnpm lint

      - name: Unit & Integration tests
        run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/crm_master_test
          REDIS_URL: redis://localhost:6379

      - name: Doorbell test (multi-tenant isolation gate)
        run: pnpm test:doorbell
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/crm_master_test

      - name: Build
        run: pnpm build
```

### Doorbell test gate

El test doorbell se ejecuta como paso separado y explícito en CI para que sea visible si falla:

```bash
# pnpm test:doorbell — script en root package.json
turbo run test:doorbell
```

```typescript
// apps/api/test/doorbell/isolation-gate.spec.ts
describe('🔔 DOORBELL — Multi-tenant isolation gate', () => {
  it('MUST PASS before any production deployment', async () => {
    // Este test crea 2 tenants, inserta datos en uno,
    // y verifica que el otro NO pueda verlos.
    // Si falla → bloquear deploy a producción.
  });

  it('raw SQL without tenant_id MUST return 0 results', async () => {
    // Prisma $queryRaw sin tenant_id scopeado → 0 rows
  });

  it('cross-tenant token MUST be rejected', async () => {
    // Token del tenant A usado en endpoint del tenant B → 403
  });
});
```

### Entorno staging

```yaml
# .github/workflows/deploy-staging.yml

name: Deploy Staging

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      # ... checkout, setup, build ...

      - name: Deploy to staging VPS
        run: |
          ssh -o StrictHostKeyChecking=no deploy@${{ secrets.VPS_HOST }} \
            "cd /opt/crm-master && \
             git pull && \
             docker compose -f docker-compose.staging.yml up -d --build"

      - name: Run smoke tests
        run: |
          # Esperar a que staging esté vivo
          sleep 10
          curl -f https://staging.crmmaster.com/api/v1/health
          # Smoke test de aislamiento
          pnpm test:smoke:staging
```

### Scripts locales

```json
// root package.json
{
  "scripts": {
    "ci:check": "pnpm lint && pnpm test && pnpm test:doorbell && pnpm build",
    "test:doorbell": "turbo run test:doorbell",
    "test:smoke:staging": "ts-node scripts/smoke-test-staging.ts",
    "db:reset:test": "pnpm --filter @crm-master/database db:push --force-reset"
  }
}
```

## 5. Infraestructura

### Docker Compose staging

```yaml
# docker-compose.staging.yml
services:
  postgres:
    image: postgres:16
    volumes: ['pgdata:/var/lib/postgresql/data']
    environment:
      POSTGRES_DB: crm_master_staging
    restart: unless-stopped

  redis:
    image: redis:7
    restart: unless-stopped

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:***@postgres:5432/crm_master_staging
      REDIS_URL: redis://redis:6379
      NODE_ENV: staging
    depends_on: [postgres, redis]
    restart: unless-stopped

  admin-web:
    build:
      context: .
      dockerfile: apps/admin-web/Dockerfile
    depends_on: [api]
    restart: unless-stopped

  tenant-web:
    build:
      context: .
      dockerfile: apps/tenant-web/Dockerfile
    depends_on: [api]
    restart: unless-stopped

  caddy:
    image: caddy:2
    volumes: ['./docker/Caddyfile.staging:/etc/caddy/Caddyfile']
    ports: ['80:80', '443:443']
    depends_on: [api, admin-web, tenant-web]
    restart: unless-stopped

volumes:
  pgdata:
```

### Caddyfile staging

```caddyfile
staging.crmmaster.com {
    reverse_path /api/* api:4000
    reverse_path /* admin-web:3000
}

*.staging.crmmaster.com {
    @api path /api/*
    handle @api {
        reverse_path /* api:4000
    }
    handle {
        reverse_path /* tenant-web:3001
    }
}
```

## 6. Tests requeridos

### 6.1 Pipeline CI

- [ ] PR con lint pasando → CI verde
- [ ] PR con lint fallando → CI rojo
- [ ] PR con tests unitarios pasando → CI verde
- [ ] PR con test doorbell fallando → CI rojo (visible)
- [ ] Build exitoso → CI verde

### 6.2 Smoke tests staging

- [ ] Health check endpoint responde 200
- [ ] Login funciona en staging
- [ ] Doorbell test pasa en staging
- [ ] Admin web carga (200)
- [ ] Tenant web carga por subdominio

## 7. Checklist de implementación

- [ ] Spec aprobada
- [ ] `.github/workflows/ci.yml` — PR checks
- [ ] `.github/workflows/deploy-staging.yml` — deploy automático
- [ ] Scripts: `ci:check`, `test:doorbell`, `test:smoke:staging`
- [ ] `docker-compose.staging.yml` + `Caddyfile.staging`
- [ ] Dockerfiles para api, admin-web, tenant-web
- [ ] Doorbell test movido a su propio archivo y script
- [ ] Variables de entorno en GitHub Secrets
- [ ] Smoke test script
- [ ] PR de prueba → CI verde
- [ ] Deploy a staging → smoke tests pasan

## 8. Referencias

- `docs/specs/SPEC-0002-multi-tenant-isolation-auth.md` — doorbell test
- `docs/architecture/adr/0001-multi-tenancy-strategy.md` — aislamiento multi-tenant
- `docker-compose.yml` — compose actual de desarrollo
