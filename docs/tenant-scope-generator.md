# Tenant Scope Generator

> Genera automáticamente listas de modelos con `tenantId` y `clienteId` desde `schema.prisma`.
> Zero listas hardcodeadas. Zero mantenimiento manual.

## Cómo funciona

```
schema.prisma
     │
     │ read by (regex parser)
     ▼
generator.ts  ──►  generated/ ──┬── tenant-models.ts      (listas tipadas)
                                ├── tenant-metadata.json   (metadata para CI)
                                └── tenant-scope.spec.ts   (tests de consistencia)
     │
     │ importado por
     ▼
src/index.ts  (createPrismaClient)
     │
     │ $extends inyecta tenantId/clienteId en toda query
     ▼
Todas las queries Prisma en la app
```

## Flujo de trabajo

```bash
# Generar (después de cada cambio en schema.prisma)
pnpm --filter @crm-master/database generate:scope

# O como parte del ciclo completo de Prisma
pnpm --filter @crm-master/database generate

# Verificar que los generated files estén frescos (CI)
pnpm --filter @crm-master/database generate:scope:verify

# Correr tests de scope
pnpm --filter @crm-master/database test:scope
```

## ¿Qué genera?

### `tenant-models.ts`
- `TENANT_SCOPED_MODELS` — modelos con campo `tenantId`
- `CLIENTE_SCOPED_MODELS` — modelos con campo `clienteId`
- `ALL_MODELS` — todos los modelos del schema
- Type guards: `isTenantScopedModel()`, `isClienteScopedModel()`

### `tenant-metadata.json`
- Machine-readable, usado por `verifyGeneratedFiles()` para detectar staleness

### `tenant-scope.spec.ts`
- Tests auto-generados que verifican consistencia interna de las lists

## Tests

```bash
# Tests generados + test de integridad
pnpm --filter @crm-master/database test:scope
```

El **test de integridad** (`integrity.spec.ts`) cruza los generated files contra `schema.prisma`:

- Cada modelo con `tenantId` en schema debe estar en `TENANT_SCOPED_MODELS`
- Cada modelo con `clienteId` en schema debe estar en `CLIENTE_SCOPED_MODELS`
- No hay falsos positivos (modelos listados que no tienen el campo)
- Si alguien agrega un campo scoped y no regenera, el test falla

## ¿Qué detecta?

Escenario | Lo detecta
---|---
Agregar `tenantId` a un modelo nuevo | `generate:scope:verify` falla en CI
Agregar `clienteId` a un modelo existente | Test de integridad falla
Renombrar un modelo en schema | `generate:scope` actualiza todo
Olvidar correr generate después de migrate | CI test falla por modelos stale

## CI Pipeline

El workflow de GitHub Actions:

1. **verify** — `generate:scope:verify` chequea que los generated files estén frescos
2. **test-database** — regenera y corre todos los tests del paquete database
3. **lint** — `pnpm lint`

## Notas técnicas

- El generator **no** es un Prisma generator real — es un script standalone que parsea `schema.prisma` con regex
- No depende del DMMF (Data Model Meta Format) de Prisma, por lo que es independiente de la versión de Prisma
- Usa `tsx` para ejecutar TypeScript directamente
- El flag `--verify` solo chequea, no escribe archivos (usado en CI)
