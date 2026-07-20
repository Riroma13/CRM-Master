# Design: SPEC-0022 — Plugin / Extension Platform

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Platform Baseline:** sdd-v2.1-baseline
> **Estado:** Refined (post-Architecture Review)

---

## 1. Executive Summary

CRM-Master es una plataforma cerrada. Todas las capacidades — workflows,
notificaciones, reporting, auditoría, knowledge base, API pública — son
módulos internos desarrollados por el equipo core. Los integradores y
tenants no pueden extender la plataforma sin modificar el código base.
Cada nueva integración requiere un PR en el monorepo.

**Plugin Platform (MVP)** permite a desarrolladores externos crear, publicar e
instalar extensiones que **reaccionan a eventos existentes** del sistema
mediante contratos compartidos. Los plugins son paquetes independientes (npm)
que se registran en tiempo de ejecución, se ejecutan en un Worker thread
aislado con recursos limitados, y se comunican con la plataforma via una API
de extensión estable (Extension API).

El MVP se basa en el **Event Bus existente (BullMQ)** — los plugins se suscriben
a eventos que los módulos ya emiten (`workflow.completed`, `document.created`,
`notification.sent`, etc.). No se modifican módulos existentes para exponer
hooks; el valor inmediato es reaccionar a eventos sin cambiar el core. Los
hooks síncronos (con capacidad de abortar/modificar el flujo principal) se
delegan a SPEC-0023.

El impacto esperado es transformar CRM-Master en una plataforma extensible,
permitir a terceros agregar funcionalidad sin modificar el core, y crear
un ecosistema de plugins con ciclo de vida gestionado (instalar, activar,
desactivar, actualizar, eliminar).

---

## 2. Technical Approach

El Plugin Platform MVP se organiza en cinco capas:

1. **Extension API** — conjunto de interfaces y contratos compartidos que
   los plugins pueden implementar. Define eventos, storage, http, y logging
   disponibles. Versionada (v1, v2) con backward compatibility garantizada.

2. **Plugin Registry** — registro de plugins instalados con metadatos
   (nombre, versión, autor, eventTypes suscritos, dependencias). Almacenado
   en DB con cache en Redis.

3. **Plugin Runtime** — ejecuta plugins en un Worker thread con recursos
   limitados (memoria, CPU, tiempo de ejecución). Cada invocación se asigna
   a un Worker del pool reusable. Sin acceso al sistema de archivos, red
   (excepto Extension API http con domain allowlist), ni procesos.

4. **EventBridge** — suscriptor central que escucha eventos del Event Bus
   (BullMQ), consulta qué plugins están suscritos a cada eventType para el
   tenant correspondiente, y despacha la ejecución al Plugin Runtime. Sin
   hooks síncronos — los plugins son reactivos a eventos asíncronos.

5. **Plugin Manager** — API de administración para instalar, activar,
   desactivar, actualizar y eliminar plugins. Validación de integridad
   (contentHash SHA-256), resolución de dependencias, y migración de datos
   entre versiones.

```
Plugin Package (npm)
       │
       ▼
Plugin Manager
       │
   [Validate] → contentHash, schema, dependencies, size
       │
   [Install] → extract, persist metadata, register eventTypes
       │
       ▼
Plugin Registry (DB + Redis cache)
       │
       ├──→ EventBridge
       │       │  BullMQ event → match plugins by tenantId + eventType
       │       │  → Worker Pool → Worker thread → Extension API
       │       │
       │       ▼
       │   Worker Pool (max 10, LRU eviction)
       │       │  worker.resourceLimits.maxOldGenerationSizeMb = 50
       │       │  timeout: worker.terminate() after 10s
       │       │  crash → only that worker dies, process continues
       │       │
       │       ▼
       │   Extension API (versioned contracts, permission-enforced)
       │       │  storage, http (domain allowlist), logging, emit
       │       │
       │       ▼
       │   Worker terminates → result logged
       │
       └──→ Event Bus (BullMQ) — existing modules emit events
               │  plugins subscribe via manifest eventTypes[]
               │  EventBridge listens and dispatches
               │
               ▼
           Platform Event Bus
```

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Plugin format | npm package, Docker container, WASM, Lua script | **npm package (CommonJS/ESM)** | Los desarrolladores ya conocen npm. Worker thread puede cargar módulos CommonJS. |
| Sandbox | vm.createContext, worker_threads, Docker, isolate | **worker_threads + pool** | vm.createContext tiene CVEs de escape conocidos. Worker thread ofrece aislamiento a nivel de proceso: si crashea, solo ese Worker muere. Pool de Workers reutilizables (max 10, LRU) para rendimiento. |
| Event model | Sync hooks, Async events, Hybrid | **Async events via BullMQ (MVP)** | Los módulos ya emiten eventos BullMQ. Sin necesidad de modificar módulos existentes. Hooks síncronos con abort se delegan a SPEC-0023. |
| Plugin isolation | Process per plugin, Thread per plugin, VM per hook | **Worker thread per invocation** | Cada invocación se asigna a un Worker del pool. Sin estado compartido entre invocaciones. El plugin usa Extension API para estado. |
| Extension API versioning | URL-based, Header-based, Contract-based | **Contract-based (ExtensionAPIV1 interface)** | Los plugins declaran qué versión de API usan en `manifest.json`. El runtime carga la interfaz correspondiente. |
| Dependency resolution | npm install, Bundled, Manual | **Bundled (plugin incluye sus dependencias)** | El plugin se empaqueta con sus dependencias. Sin acceso a npm install en runtime. El manager verifica tamaño máximo (10MB default). |
| Integrity verification | npm PGP, Custom HMAC, SHA-256 + TLS | **SHA-256 contentHash + TLS** | HMAC requiere secreto compartido por tenant — innecesario en MVP. SHA-256 del contenido del paquete verificado durante la instalación. PKI signing para developers verificados post-MVP. |
| Storage per plugin | Shared DB, Plugin schema, Key-value | **Key-value (ExtensionAPI.storage)** | El plugin recibe un store key-value scoped a su tenant+pluginId. Sin acceso directo a la DB de la plataforma. |
| Permission enforcement | None, Declarative, Runtime guard | **Runtime PermissionGuard** | Cada método de Extension API verifica permisos del manifest antes de ejecutar. Permiso denegado → error. |
| Outbound HTTP | Allow all, Block all, Domain allowlist | **Domain allowlist** | `allowedDomains` en configuración del plugin. Default: vacío (sin HTTP outbound). Validación contra SSRF antes de cada request. |

---

## 4. Data Flow

```
Install plugin:

Admin → POST /api/v1/plugins/install
       │
       ├── Receive plugin package (tgz/zip)
       ├── Verify content hash (SHA-256)
       ├── Validate plugin schema (ExtensionAPI version, permissions, eventTypes)
       ├── Extract package to plugin storage
       ├── Register in Plugin Registry (metadata + eventTypes[] per tenant)
       └── Return pluginId + status

Execute plugin via event:

Platform module emits event → BullMQ (e.g. 'workflow.completed')
       │
       ├── EventBridge listens (BullMQ Worker or Event Listener)
       ├── EventBridge queries Plugin Registry:
       │     WHERE tenantId = event.tenantId
       │       AND status = 'active'
       │       AND eventTypes CONTAINS event.name
       ├── For each matching plugin:
       │     ├── Check plugin permissions (all required for invoked API calls)
       │     ├── Acquire Worker from pool (or spawn new, max 10)
       │     ├── postMessage({ type: 'invoke', handler: 'onEvent', event })
       │     ├── Worker loads plugin code, creates ExtensionAPI
       │     │     ├── ExtensionAPI methods check permissions before executing
       │     │     ├── storage.get/set → validated tenant+plugin scope
       │     │     ├── http.get/post → validated against allowedDomains allowlist
       │     │     └── log → namespaced by pluginId
       │     ├── Worker responds via postMessage({ type: 'result', ... })
       │     ├── SUCCESS → log completion
       │     ├── TIMEOUT (10s) → worker.terminate(), log warning
       │     └── ERROR → log error, worker returned to pool (or terminated if corrupted)
       │
       └── Continue — plugins are async, they don't block the event

Plugin event emission:

Plugin → ExtensionAPI.emit('order.synced', { orderId, total })
       │
       ├── Permission check: events:emit
       ├── Validate event payload (max size 10KB)
       ├── Publish to BullMQ (plugin:events queue)
       ├── Other plugins subscribed to order.synced receive event
       └── Platform modules can also subscribe

Plugin storage:

Plugin → ExtensionAPI.storage.get('config')
       │
       ├── Permission check: storage:read
       ├── Lookup key in plugin_store (tenantId + pluginId + key)
       └── Return value (JSON)

Plugin → ExtensionAPI.storage.set('config', { ... })
       ├── Permission check: storage:write
       ├── Validate max storage per plugin (1MB default)
       ├── Upsert value
       └── Return ok

Plugin upgrade:

Admin → POST /api/v1/plugins/{id}/upgrade
       │
       ├── New package received → content hash verification
       ├── Extract manifest → check schemaVersion
       ├── If schemaVersion changed:
       │     ├── Call plugin's onUpgrade(fromVersion, toVersion) in current Worker
       │     ├── Wait for completion (max 30s)
       │     └── Roll back on failure
       ├── Update Plugin Registry with new version
       └── Activate new version
```

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add `Plugin`, `PluginHook`, `PluginStore`, `PluginEvent` models |
| 2 | `packages/shared/src/plugin/extension-api-v1.ts` | Create | Extension API v1 interfaces |
| 3 | `packages/shared/src/plugin/plugin.types.ts` | Create | Plugin manifest, metadata, event types |
| 4 | `packages/shared/src/plugin/index.ts` | Create | Re-export |
| 5 | `apps/api/src/modules/plugin/plugin.module.ts` | Create | NestJS module |
| 6 | `apps/api/src/modules/plugin/plugin-manager.service.ts` | Create | Install, activate, deactivate, upgrade, delete |
| 7 | `apps/api/src/modules/plugin/event-bridge.service.ts` | Create | Subscribe to BullMQ events + dispatch to plugins |
| 8 | `apps/api/src/modules/plugin/worker-pool.ts` | Create | Worker thread pool (max 10, LRU eviction) |
| 9 | `apps/api/src/modules/plugin/plugin-sandbox.ts` | Create | Worker thread sandbox (spawn, communicate, terminate) |
| 10 | `apps/api/src/modules/plugin/plugin-registry.service.ts` | Create | Registry CRUD scoped by tenantId |
| 11 | `apps/api/src/modules/plugin/plugin.controller.ts` | Create | Plugin management API |
| 12 | `apps/api/src/modules/plugin/guards/plugin.guard.ts` | Create | Tenant isolation |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 13 | `apps/api/src/modules/plugin/plugin-validator.service.ts` | Create | Content hash + schema validation |
| 14 | `packages/shared/src/plugin/plugin-manifest.schema.ts` | Create | Zod schema for manifest validation |
| 15 | `apps/api/src/modules/plugin/permission-guard.ts` | Create | Extension API permission enforcement |
| 16 | `apps/api/src/modules/core/core.module.ts` | Modify | Import PluginModule |

### 5.3 Expected NOT to Change

- Módulos de negocio existentes — los plugins reaccionan a eventos que YA emiten
- Frontend — SPEC separada
- Extension API — los plugins no acceden a módulos internos

---

## 6. Read Order

1. `packages/shared/src/plugin/plugin.types.ts` — tipos base
2. `packages/shared/src/plugin/extension-api-v1.ts` — Extension API
3. `packages/shared/src/plugin/plugin-manifest.schema.ts` — manifest schema
4. `packages/database/prisma/schema.prisma` — modelos
5. `apps/api/src/modules/plugin/plugin-sandbox.ts` — sandbox
6. `apps/api/src/modules/plugin/worker-pool.ts` — pool management
7. `apps/api/src/modules/plugin/event-bridge.service.ts` — event dispatch
8. `apps/api/src/modules/plugin/permission-guard.ts` — permission enforcement
9. `apps/api/src/modules/plugin/plugin-manager.service.ts` — ciclo de vida

---

## 7. Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_plugin_platform
pnpm --filter database generate
pnpm --filter api test plugin
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** High

- Worker threads son la alternativa probada a vm.createContext, usados por
  VS Code, Figma, y Deno para aislamiento de extensiones.
- El modelo event-based (BullMQ) está probado en producción — activity-timeline,
  audit, y knowledge ingestion ya lo usan con éxito.
- El permission guard elimina el riesgo de permisos decorativos.
- El domain allowlist para HTTP previene SSRF y fuga de datos.
- La migración de plugins con onUpgrade asegura transiciones controladas.

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 3 | Patrones de eventos BullMQ, Worker pool patterns, Extension API patterns |
| Files to read | 6 | Schema, event bridge, existing BullMQ patterns, webhook dispatcher |
| Files to create | 14 | Module, services, sandbox, pool, event-bridge, validator, types, permission-guard |
| Files to modify | 2 | schema.prisma, core.module.ts |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Worker thread consume recursos del host | Baja | Medio | Pool de Workers (max 10). `worker.resourceLimits.maxOldGenerationSizeMb = 50`. Timeout 10s via `worker.terminate()`. LRU eviction para Workers inactivos. |
| Plugin malicioso accede a datos de otros tenants | Baja | Crítico | Extension API recibe tenantId scoped. Permission guard verifica cada acción. Storage key-value scoped por tenantId + pluginId. Worker no tiene acceso directo a DB. |
| Dependencias del plugin causan conflictos de versión | Media | Medio | El plugin incluye sus dependencias bundled. Sin shared node_modules. Validación de tamaño máximo (10MB default). |
| Plugin consume toda la CPU | Baja | Medio | Worker ejecuta en su propio thread. Si se cuelga, `worker.terminate()` lo mata. El event loop principal continúa. |
| Eventos BullMQ se acumulan si plugins son lentos | Baja | Medio | EventBridge procesa eventos de forma asíncrona. Si un plugin falla consistentemente, se marca como `error` y se notifica al admin. Dead letter queue para eventos no procesados. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Worker Pool | Pool acquisition/release, LRU eviction, max pool size, worker resource limits | Jest |
| Unit — Plugin Sandbox | Worker spawn, postMessage communication, timeout, crash isolation | Jest |
| Unit — EventBridge | BullMQ event subscription, plugin matching (tenantId + eventType), dispatch | Jest |
| Unit — PermissionGuard | Each method enforces correct permission, denied before action | Jest |
| Unit — Validator | Manifest schema, content hash verification, dependency validation | Jest |
| Integration — Plugin lifecycle | Install → activate → event dispatch → deactivate → upgrade → delete | supertest |
| Integration — Event dispatch | Module emits event → EventBridge → Worker → plugin handler executes | supertest |
| Doorbell — Cross-tenant isolation | Tenant A's plugin cannot be invoked by Tenant B's events | E2E |
| Doorbell — Cross-tenant hook isolation | Tenant A's hook execution never invokes Tenant B's plugin handler | E2E |
| Doorbell — Storage isolation | Plugin A's storage key-value isolated from Plugin B | E2E |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `plugin-cross-tenant-isolation.spec.ts` | Plugin installed in Tenant A cannot access Tenant B's hook context or be invoked by Tenant B's events |
| `plugin-cross-tenant-hook-isolation.spec.ts` | Tenant A's hook execution never invokes Tenant B's plugin handler — EventBridge filters by tenantId |
| `plugin-storage-isolation.spec.ts` | Plugin A's storage key-value is isolated from Plugin B |
| `plugin-permission-denied.spec.ts` | Plugin without `http:outbound` cannot make HTTP requests; permission error thrown before action |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0019 | Documentar la arquitectura del Plugin Platform, sandbox con worker_threads, Extension API versionada, permission enforcement, y política de seguridad. | Proposed |

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `Plugin` (registry) | PluginModule | Metadatos de plugins instalados, eventTypes por plugin |
| `PluginStore` (storage) | PluginModule | Key-value storage scoped por plugin+tenant |
| `EventBridge` | PluginModule | Suscripción a eventos BullMQ + dispatch a plugins (filtrado por tenantId + eventTypes) |
| Extension API | PluginModule | Contrato que los plugins implementan (con PermissionGuard) |
| Platform events | Event Bus (BullMQ) | Eventos de la plataforma a los que los plugins se suscriben |
| Hook Engine | PluginModule (deferred to SPEC-0023) | Ejecución de hooks síncronos con capacidad de abort |
| PluginWorker | PluginModule | Worker thread que ejecuta el código del plugin en aislamiento |

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| Hook Engine (SPEC-0023) | Nuevo servicio HookEngine con hooks síncronos. Los módulos existentes añaden `await hookEngine.execute(...)` en puntos específicos. Soporte de abort. | Weeks |
| Extension API v2 | Nueva interfaz `ExtensionAPIV2`. Los plugins declaran versión en manifest. Runtime carga la interfaz correspondiente. | Days |
| Plugin marketplace | UI para descubrir plugins. Nuevo módulo frontend. API de listado ya existe. | Weeks |
| WASM plugins | Nuevo `PluginRuntime` para WASM además de worker_threads. Misma Extension API. | Weeks |
| CLI tool | `crm plugin init/build/publish`. SDK npm externo. | Weeks |
| Plugin metrics dashboard | Consumo de CPU/memoria por plugin, latencia de eventos, errores. | Days |
| Sync hooks + abort | SPEC-0023: plugins pueden modificar/abortar el flujo principal. Requiere HookEngine y contrato de abort controlado. | Weeks |
| PKI signing | Firma de paquetes con PKI para developers verificados. Verificación obligatoria para plugins de pago. | Days |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× (100 plugins, 1K events/s) | 100× (1000 plugins, 10K events/s) | Mitigation |
|--------|---------------------------------|------------------------------------|------------|
| Worker acquisition | <2ms (pool hit) | <5ms | Pool de Workers reutilizables (max 10). LRU eviction. |
| Event dispatch (async) | <10ms por evento | <50ms | EventBridge procesa batches. BullMQ ya escala horizontalmente. |
| Plugin Registry lookup | <10ms | <20ms | Redis cache con TTL 5min. Index on (tenantId, eventTypes). |
| Storage per plugin | <5ms get/set | <10ms | Index on (tenantId, pluginId, key). |
| Worker memory | 50MB por Worker | 50MB por Worker | Pool max 10 → max 500MB commit. resourceLimits enforce. |

**Decision:** El plugin runtime escala horizontalmente. El Worker pool overhead
es aceptable para cientos de eventos/segundo. Para miles, se añaden más instancias
del API (horizontal scaling). BullMQ ya distribuye eventos entre workers.

### B. Open/Closed Principle (OCP)

**Point of extension:** Event types emitidos por módulos del plataforma.

**What must change to add a new event type:** Nada en el Plugin Platform.
El módulo existente ya emite el evento. Los plugins se suscriben declarando
`eventTypes` en su manifest. Nuevos eventos están disponibles automáticamente.

**What must change to add a new Extension API version:** Crear `ExtensionAPIV2`
interface. Los plugins declaran versión en manifest. El runtime carga la interfaz
correspondiente. Cero cambios en PluginManager o EventBridge.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| Plugin metadata | PluginModule | PluginManager, EventBridge |
| Plugin storage | PluginModule | Plugins via ExtensionAPI |
| Event dispatch | PluginModule (EventBridge) | Plugins via BullMQ events |
| Platform events | Business modules | EventBridge, webhooks, automations |
| Extension API | PluginModule | Plugins |
| Permission policy | PluginModule | ExtensionAPI factory |

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| Plugin metadata | Mientras esté instalado | — | Se elimina al desinstalar |
| Plugin storage | Mientras esté instalado | — | Se elimina al desinstalar |
| Plugin events | 30 días | — | Eliminar >30 días |

### E. Idempotency

| Operation | Duplicate risk | Protection |
|-----------|---------------|------------|
| `install()` | Media | `pluginName + version` unique per tenant. Si ya existe, rechazar. |
| `handleEvent()` | Baja | Events are async. BullMQ at-least-once delivery — handler debe ser idempotente. Se provee eventId para dedup. |
| `storage.set()` | Alta | Upsert por (tenantId, pluginId, key). |

### F. Shared Contracts

| Contract | Location | Consumers |
|----------|----------|-----------|
| `ExtensionAPIV1` | `packages/shared/src/plugin/` | Plugins, PluginRuntime |
| `PluginManifest` | `packages/shared/src/plugin/` | Validator, Registry |
| `EventEnvelope` | `packages/shared/src/plugin/` | EventBridge, Plugins |
| `PermissionSet` | `packages/shared/src/plugin/` | PermissionGuard, ExtensionAPI |

### G. Partitioning Strategy

`plugin_store` se particiona por tenant (tenentId + pluginId + key,
naturalmente partitionable). `plugin_events` se particiona por mes.
`plugin_hooks` se particiona por tenantId + hook (para resolución rápida
por tenant en SPEC-0023). La registry de plugins no requiere partición
(volumen bajo).

---

## 16. Interfaces / Contracts

```typescript
// ─── Extension API v1 ──────────────────────────────

export interface ExtensionAPIV1 {
  /** Key-value storage scoped to this plugin + tenant */
  storage: {
    get(key: string): Promise<unknown | null>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    list(prefix?: string): Promise<string[]>;
  };

  /** Emit a custom event to the platform event bus */
  emit(eventType: string, payload: Record<string, unknown>): Promise<void>;

  /** HTTP client (outbound, validated against domain allowlist) */
  http: {
    get(url: string, options?: HttpOptions): Promise<HttpResponse>;
    post(url: string, body: unknown, options?: HttpOptions): Promise<HttpResponse>;
  };

  /** Logger scoped to this plugin */
  log: {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
  };

  /** Access platform data via scoped queries */
  query: {
    workflow(params: WorkflowQuery): Promise<WorkflowResult>;
    document(params: DocumentQuery): Promise<DocumentResult>;
  };
}

// ─── Plugin Manifest ────────────────────────────────

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  extensionApi: string;             // "v1"
  schemaVersion: number;            // for upgrade migration (default 1)
  eventTypes: string[];             // events this plugin subscribes to
  permissions: string[];            // "storage:read", "storage:write", "http:outbound", "events:emit"
  allowedDomains: string[];         // domain allowlist for http outbound (default [])
  dependencies?: Record<string, string>; // bundled deps
}

// ─── Permission Set ─────────────────────────────────

export type Permission =
  | 'storage:read'
  | 'storage:write'
  | 'http:outbound'
  | 'events:emit';

// ─── Event Types (MVP) ──────────────────────────────

export interface EventEnvelope {
  eventId: string;
  eventType: string;                // "workflow.completed", "document.created", etc.
  tenantId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ─── Plugin Event Handler ───────────────────────────

export interface PluginEventHandler {
  /** Called when a subscribed event fires. Async only (MVP). */
  onEvent(event: EventEnvelope, api: ExtensionAPIV1): Promise<void>;
  /** Called when a new version is installed (before activation). Optional. */
  onUpgrade?(fromVersion: string, toVersion: string, api: ExtensionAPIV1): Promise<void>;
}

// ─── Worker Pool Messages ───────────────────────────

export type WorkerRequest =
  | { type: 'invoke'; handler: 'onEvent'; event: EventEnvelope }
  | { type: 'invoke'; handler: 'onUpgrade'; fromVersion: string; toVersion: string }
  | { type: 'storage:get'; key: string }
  | { type: 'storage:set'; key: string; value: unknown }
  | { type: 'http:fetch'; method: 'GET' | 'POST'; url: string; body?: unknown };

export type WorkerResponse =
  | { type: 'result'; data?: unknown }
  | { type: 'error'; message: string };

// ─── Permission Guard Factory ───────────────────────
// Se crea al instanciar ExtensionAPI para un Worker.
// Cada método verifica el permiso correspondiente ANTES de ejecutar.

export class PermissionGuard {
  private readonly permissions: Set<Permission>;

  constructor(manifestPermissions: string[]) {
    this.permissions = new Set(manifestPermissions as Permission[]);
  }

  require(permission: Permission): void {
    if (!this.permissions.has(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

// Created by ExtensionAPIFactory:
//
// ExtensionAPIFactory.create(manifest.permissions, allowedDomains, tenantId, pluginId)
//   → creates PermissionGuard with manifest.permissions
//   → wraps each storage/http/emit method with guard.require(...)
//   → http methods also validate URL against allowedDomains before fetch

// ─── Plugin Metadata ───────────────────────────────

export type PluginStatus = 'active' | 'inactive' | 'error';

export interface PluginMetadata {
  id: string;
  tenantId: string;
  name: string;
  version: string;
  schemaVersion: number;
  manifest: PluginManifest;
  status: PluginStatus;
  createdAt: string;
  updatedAt: string;
}
```

```prisma
// ─── Plugin ────────────────────────────────────────
model Plugin {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  name      String
  version   String
  schemaVersion Int  @default(1) @map("schema_version")
  manifest  Json
  status    String   @default("active") // active | inactive | error
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  hooks PluginHook[]
  store PluginStore[]

  @@unique([tenantId, name])
  @@index([tenantId, status])
  @@map("plugins")
}

// ─── PluginHook (tenant-scoped for SPEC-0023) ──────
model PluginHook {
  id       String @id @default(uuid())
  tenantId String @map("tenant_id")
  pluginId String @map("plugin_id")
  hook     String
  handler  String
  priority Int    @default(0)
  async    Boolean @default(false)

  plugin Plugin @relation(fields: [pluginId], references: [id], onDelete: Cascade)

  @@unique([tenantId, pluginId, hook])
  @@index([tenantId, hook, priority(sort: Desc)])
  @@map("plugin_hooks")
}

// ─── PluginStore ───────────────────────────────────
model PluginStore {
  id       String @id @default(uuid())
  tenantId String @map("tenant_id")
  pluginId String @map("plugin_id")
  key      String
  value    Json

  plugin Plugin @relation(fields: [pluginId], references: [id], onDelete: Cascade)

  @@unique([tenantId, pluginId, key])
  @@index([tenantId, pluginId])
  @@map("plugin_store")
}

// ─── PluginEvent ───────────────────────────────────
model PluginEvent {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  pluginId  String   @map("plugin_id")
  eventType String   @map("event_type")
  payload   Json
  createdAt DateTime @default(now()) @map("created_at")

  @@index([tenantId, eventType, createdAt(sort: Desc)])
  @@index([createdAt])
  @@map("plugin_events")
}
```

---

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Add plugin tables + migration | Bajo | `DROP TABLE` (sin datos aún) |
| 2 | Create Extension API + shared contracts | Bajo | Revertir commit |
| 3 | Implement WorkerPool + PluginSandbox (worker_threads) | Medio | Sin plugins instalados, no hay impacto en producción. Tests de seguridad obligatorios. |
| 4 | Implement EventBridge (BullMQ subscription) | Medio | Sin plugins registrados, EventBridge no hace dispatch. |
| 5 | Implement PermissionGuard | Bajo | Nueva capa — plugins sin permisos no ejecutan acciones. |
| 6 | Implement PluginManager + Registry | Bajo | Sin plugins para instalar, no hay impacto. |
| 7 | Implement Plugin API + Guards | Bajo | Endpoints nuevos, no afectan APIs existentes. |
| 8 | Wire PluginModule en CoreModule | Bajo | Quitar del imports |

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿Máximo de plugins por tenant? | Open | Recomendación: 20 plugins activos por tenant en MVP. Configurable vía plan. |
| 2 | ¿CLI/SDK para desarrollo de plugins en MVP o en v2? | Open | Recomendación: no en MVP. El plugin es un npm package con un manifest.json. La documentación del Extension API es suficiente para desarrolladores. |
| 3 | ¿Qué eventos BullMQ existentes se exponen para plugins en MVP? | Open | Lista inicial: `workflow.completed`, `document.created`, `document.updated`, `notification.sent`, `cliente.creado`, `pago.recibido`, `incidencia.creada`. Se documenta en SPEC-0022 tasks. |
| 4 | ¿Verificación de contenido del plugin antes de activar? | Open | Recomendación: análisis estático básico en instalación (tamaño, estructura, dependencias). Análisis de seguridad profundo fuera de MVP. |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Refined tras Architecture Review.
