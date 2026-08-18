# Design: secure-plugin-execution-boundary — Secure Plugin Execution Boundary

> **Status:** Draft
> **Execution policy:** Plugin code execution is intentionally disabled in this remediation.

## 1. Executive Summary

The plugin surface currently accepts caller-owned tenant identifiers and evaluates plugin-controlled data in a Node worker, which is not a security boundary. This change makes every plugin management request derive tenant authority from the authenticated session, verified membership, and immutable Host tenant context. It retains authenticated same-tenant metadata management, but rejects executable payloads and disables activation and event dispatch until a separately designed, trustworthy runtime exists. The result removes reachable arbitrary source execution and stops cross-tenant mutation before any persistence or execution effect.

## 2. Technical Approach

Reuse the proven workflow authorization sequence: global guards remain in their existing order; route guards require `IdentityOrganizationGuard` and a plugin-specific trusted-context guard. Controllers read only `request.pluginContext.tenantId`; query/body `tenantId` is ignored and never copied to request authority.

Install accepts a deliberately narrow archive: one validated `manifest.json`, no executable/source entries, and an explicit capability allow-list. Validation and archive structural checks complete before registry or filesystem effects. Metadata is registered inactive; raw uploaded packages are not stored. Existing stored packages are never loaded.

Worker-thread pooling is removed as an execution mechanism. The event bridge performs no plugin dispatch or delivery logging, and any direct worker-pool invocation fails closed with a stable disabled error. This is a containment design, not a sandbox claim.

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
| --- | --- | --- | --- |
| Tenant authority | body/query tenantId; Host only; Host + authenticated membership | Host + session + membership | Matches the existing identity boundary and prevents caller-directed authority. |
| Runtime | retain worker threads; add an unproven VM; disable execution | Disable execution | `worker_threads` and resource limits do not remove Node process privileges; no real isolation is in scope. |
| Upload persistence | retain archive; persist source as trusted; manifest-only metadata | Validate manifest-only archive; persist metadata/hash, not source | Removes an executable artifact and preserves safe inventory semantics. |
| Activation | set active; allow-list active plugins; reject | Reject with disabled contract | No active state may imply executable trust while runtime is absent. |

## 4. Data Flow

```
Tenant Host + session -> global guards -> IdentityOrganizationGuard -> PluginTenantContextGuard
                                                   |                         |
                                                   v                         v
                                            membership verified      trusted tenantId
                                                                        |
upload -> archive/manifest/capability validation -> inactive registry metadata
event -> EventBridge -> PLUGIN_EXECUTION_DISABLED (no worker, no source, no effect)
```

Anonymous requests are not public: existing global behavior runs first and the identity guard returns `401 IDENTITY_SESSION_REQUIRED` when reached. Missing/invalid Host context or membership returns the existing identity `403` contract. Cross-tenant resource lookup is scoped by the trusted tenant before update/delete; it returns `404 Plugin not found` without mutation.

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `apps/api/src/modules/plugin/plugin.controller.ts` | Modify | Remove caller tenant authority; use trusted request context and stable HTTP errors. |
| 2 | `apps/api/src/modules/plugin/guards/plugin.guard.ts` | Modify | Build `PluginTenantContext` only from authenticated identity and Host tenant. |
| 3 | `apps/api/src/modules/plugin/plugin.module.ts` | Modify | Import IdentityModule and wire the trusted guard; remove worker execution wiring. |
| 4 | `apps/api/src/modules/plugin/plugin-manager.service.ts` | Modify | Validate before effects, register inactive metadata, and never retain source. |
| 5 | `apps/api/src/modules/plugin/plugin-validator.service.ts` | Modify | Enforce archive shape, manifest limits, and explicit capability allow-list. |
| 6 | `apps/api/src/modules/plugin/registry/plugin-registry.service.ts` | Modify | Keep every read/mutation tenant-scoped and prevent executable activation state. |
| 7 | `apps/api/src/modules/plugin/event-bridge/event-bridge.service.ts` | Modify | Fail closed before dispatch/logging; never invoke plugins. |
| 8 | `apps/api/src/modules/plugin/sandbox/worker-pool.service.ts` | Modify | Remove Worker creation/message execution; expose only disabled failure. |
| 9 | `apps/api/src/modules/plugin/sandbox/plugin.worker.ts` | Delete | Eliminate reachable `new Function` and plugin-controlled evaluation. |
| 10 | `packages/shared/src/plugin/plugin-manifest.schema.ts` | Modify | Make permitted capabilities and manifest-only contract explicit. |
| 11 | `packages/shared/src/plugin/plugin.types.ts` | Modify | Define trusted context, disabled status/error, and non-executable metadata contracts. |

### 5.2 Secondary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `apps/api/src/modules/plugin/__tests__/plugin.controller.spec.ts` | Modify | RED route authorization, forged tenant, same-tenant management, and errors. |
| 2 | `apps/api/src/modules/plugin/__tests__/plugin-manager.service.spec.ts` | Modify | RED validation-before-effects, inactive install, and no package persistence. |
| 3 | `apps/api/src/modules/plugin/__tests__/plugin-validator.service.spec.ts` | Modify | RED malformed/archive/source/capability rejection. |
| 4 | `apps/api/src/modules/plugin/__tests__/plugin-cross-tenant-isolation.spec.ts` | Modify | RED trusted-tenant scoped read/mutate assertions. |
| 5 | `apps/api/src/modules/plugin/sandbox/__tests__/worker-pool.service.spec.ts` | Modify | RED direct execution disablement and absence of Worker creation. |
| 6 | `apps/api/src/modules/plugin/__tests__/event-bridge.service.spec.ts` | Modify | RED no dispatch/no delivery side effect. |
| 7 | `apps/api/src/modules/plugin/__tests__/plugin-registry.service.spec.ts` | Modify | RED registration assertion persists `status: 'inactive'` and `enabled: false`; it must override Prisma defaults (`status: 'active'`, `enabled: true`) so no executable/enabled state is persisted. |
| 8 | `apps/api/test/doorbell/plugin-tenant-isolation.doorbell.spec.ts` | Create | Real HTTP Tenant A/B evidence against the assembled API and database. |

### 5.3 Expected NOT to Change

- `packages/database/prisma/schema.prisma` — no schema migration; existing records are made non-executable at runtime.
- `apps/api/src/common/guards/*` and `apps/api/src/common/middleware/tenant-resolve.middleware.ts` — consume, do not redesign, established global/Host authority.
- `apps/api/src/modules/core/core.module.ts` — PluginModule remains composed there.
- Workflow, public API, marketplace, Docker, and SDD governance files — excluded by scope.

## 6. Read Order

1. `plugin.controller.ts` — identify every HTTP management surface and caller tenant input.
2. `identity-organization.guard.ts` and `workflow-tenant-context.guard.ts` — reuse established authority sequence.
3. `plugin.guard.ts` and `plugin.module.ts` — replace local trust and wire dependencies.
4. `plugin-manager.service.ts`, `plugin-validator.service.ts`, and manifest contracts — enforce validation-before-effects.
5. `plugin-registry.service.ts` and Prisma Plugin models — verify scoped reads/mutations and no migration need.
6. `event-bridge.service.ts`, worker pool, and worker — remove all execution reachability.
7. Listed focused tests and doorbell fixture — write RED tests before implementation.

## 7. Expected Commands

```bash
pnpm --filter api test -- plugin.controller.spec.ts plugin-manager.service.spec.ts plugin-validator.service.spec.ts
pnpm --filter api test -- worker-pool.service.spec.ts event-bridge.service.spec.ts plugin-cross-tenant-isolation.spec.ts
DATABASE_TEST_URL=<disposable-url> pnpm --filter api test:e2e -- plugin-tenant-isolation.doorbell.spec.ts
pnpm --filter api lint
pnpm --filter api build
pnpm sdd:validate:design -- openspec/changes/secure-plugin-execution-boundary/design.md
pnpm sdd:validate
```

## 8. Design Confidence

**Confidence:** High

The concrete vulnerable controller, guard, manager, registry, event bridge, worker pool, worker, contracts, and focused tests are present. A real isolation runtime is intentionally not assumed; enabling one is deferred to a new Design and HUMAN architecture decision.

## 9. Exploration Budget

| Resource | Budget | Notes |
| --- | --- | --- |
| Repo searches | 8 | Only plugin callers, identity pattern, module wiring, tests, and validator references. |
| Files to read | 28 | Working Set plus authority and test fixtures. |
| Files to create | 1 | HTTP Tenant A/B doorbell only. |
| Files to modify | 17 | Eleven production/contracts and six focused tests. |

## 10. Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Existing customers expect hooks to run | High | High | Explicit `PLUGIN_EXECUTION_DISABLED` activation/dispatch contract, release note, and rollback only to a patched non-executing deployment. |
| Legacy active records/packages remain | High | High | Runtime never loads source; bridge and pool fail before dispatch; optionally remove legacy bytes on uninstall. |
| Identity/global guard test fixture diverges | Med | High | Doorbell boots real middleware/global guard sequence and proves status/effects. |
| Archive parser ambiguity or decompression abuse | Med | High | Size, entry-count, path, compression, duplicate-manifest, and manifest-only validation before any effect. |

## 11. Testing Strategy

| Layer | Focus | Approach |
| --- | --- | --- |
| Unit | Trusted context and errors | RED guard cases: no session/Host/membership, non-owner/admin, and forged tenant fields never alter context. |
| Unit | Archive and manifest | RED invalid format, oversized/compressed abuse, duplicate/missing manifest, any source entry, unknown capability, and valid manifest-only archive. |
| Unit | Effects | RED no registry/fs effect on validation/authority failure; install is inactive; activate and pool execute reject disabled. |
| Integration | Plugin routes | Use production guard ordering; prove authenticated same-tenant list/read/deactivate/uninstall and activation `409`. |
| Regression | Dynamic execution | Static focused assertion that plugin module contains no `new Function`, `eval`, Worker creation, or source loader. |

## 12. Doorbell Tests

| Test file | What it proves |
| --- | --- |
| `apps/api/test/doorbell/plugin-tenant-isolation.doorbell.spec.ts` | Real HTTP Host Tenant A/B with persistent fixtures: anonymous install/list is fail-closed; A with forged B tenantId cannot install/read/activate/deactivate/delete B; each denial occurs before DB/filesystem/event effects; A retains allowed same-tenant metadata management. |
| `apps/api/test/doorbell/plugin-tenant-isolation.doorbell.spec.ts` | Tenant A valid manifest-only install creates inactive A metadata; A activation returns `409 PLUGIN_EXECUTION_DISABLED`; a Tenant A event produces no Worker invocation or plugin delivery record. |

## 13. Required ADRs

| ADR | Reason | Status |
| --- | --- | --- |
| None | This is bounded P0 containment, no Prisma/schema or new runtime architecture. A future executable runtime requires a new ADR and Design proving OS/process/WASM isolation. | Not required |

## 14. Boundaries

| Boundary | Owner | Purpose |
| --- | --- | --- |
| Host/session/membership authority | IdentityModule + PluginGuard | Derive immutable plugin tenant/actor; never trust request tenant fields. |
| Plugin management | PluginController/Manager/Registry | Scoped metadata lifecycle only; no execution authority. |
| Package admission | PluginValidator | Validate archive and manifest before persistence; allow only declared safe metadata. |
| Execution boundary | EventBridge/WorkerPool | Explicitly disabled; neither is a sandbox or source loader. |

## 15. Extensibility

| Future feature | How it fits | Effort |
| --- | --- | --- |
| Trusted executable plugins | New runtime Design/ADR with independently enforced process/WASM boundary, capability broker, signatures, and separate review. | Weeks |
| Capability expansion | Add one enum value plus validator and broker enforcement only after an executable boundary exists. | Days |
| Legacy package cleanup | Administrative migration/job may remove quarantined legacy bytes without changing the execution-disabled invariant. | Days |

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× | 100× | Mitigation |
| --- | --- | --- | --- |
| Storage | metadata grows | metadata grows | no source archives; existing tenant/status indexes remain. |
| Query latency | bounded list/read | bounded list/read | trusted tenant predicate first. |
| Write throughput | validation CPU | validation CPU | strict size/entry limits before DB/filesystem. |
| Memory | bounded archive parse | bounded archive parse | reject limits; no workers. |

**Decision:** Keep metadata-only management and disable execution.

**Rationale:** It removes the high-risk runtime rather than scaling an invalid boundary.

**Alternative:** Scale the worker pool; rejected because it preserves process privilege exposure.

**Future impact:** A future runtime must independently capacity-plan its isolation broker.

### B. Open/Closed Principle (OCP)

**Point of extension:** The explicit manifest capability enum and a future runtime adapter.

**What must change to add one more:** A reviewed capability contract and enforcement at the real broker, not plugin source.

**Decision:** Keep admission extensible but execution closed.

**Rationale:** New manifest capabilities cannot accidentally grant process access.

**Alternative:** Let plugins declare arbitrary permissions; rejected as authority expansion.

**Future impact:** Runtime enabling remains a separately reviewed extension.

### C. Ownership

| Data / Capability | Owner | Consumers |
| --- | --- | --- |
| Trusted plugin context | Plugin guard | Controller, manager, registry |
| Plugin metadata/hash | PluginModule | Authenticated same-tenant management |
| Runtime disablement | PluginModule | Event bridge, worker-pool callers |

**Decision:** PluginModule owns its scoped metadata and execution-disable policy.

**Rationale:** Identity owns authentication/membership; PluginModule must not duplicate it.

**Alternative:** Put plugin authority in global auth; excluded systemic redesign.

**Future impact:** A runtime can consume only the trusted context/capability contract.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
| --- | --- | --- | --- |
| Valid metadata/hash | Until uninstall | None | Registry uninstall cascade. |
| New uploaded source | Never persisted | N/A | Discard after validation. |
| Legacy package bytes | Temporary pre-existing | No new archive | Remove on uninstall; never execute. |

**Decision:** Retain no new executable payload.

**Rationale:** Upload does not establish trust.

**Alternative:** Quarantine source indefinitely; rejected as unnecessary attack surface.

**Future impact:** A future signed artifact policy needs its own retention decision.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
| --- | --- | --- | --- |
| Install | repeated upload | tenant/name uniqueness after validation | conflict, no source write. |
| Activate | retry | always disabled | deterministic 409, no mutation. |
| Event dispatch | duplicate event | no dispatch | no execution/delivery record. |

**Decision:** Make unsafe operations deterministic no-ops/errors.

**Rationale:** Retries cannot revive execution or duplicate effects.

**Alternative:** Preserve active transitions; rejected because active implies unsafe execution.

**Future impact:** A future runtime needs explicit idempotency keys per effect.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
| --- | --- | --- | --- |
| Manifest/capability allow-list | `packages/shared/src/plugin/` | API validator | Shared package |
| Disabled error code | `packages/shared/src/plugin/` | API/tests/future UI | PluginModule |
| Trusted context | plugin guard module | Controller/services | Plugin guard |

**Decision:** Put serializable manifest/error contracts in shared; keep request context server-only.

**Rationale:** Clients can understand disabled behavior without receiving authority fields.

**Alternative:** Duplicate DTOs; rejected due to drift.

**Future impact:** A future UI can render disabled state from one contract.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
| --- | --- | --- |
| Tenant | cross-tenant access | Host-derived context plus tenant predicates on every registry operation. |
| Time | legacy artifact accumulation | no new payload storage; cleanup on uninstall. |
| Volume | package abuse | admission size/entry/decompression limits. |

**Decision:** Preserve tenant-scoped metadata tables; no partition migration.

**Rationale:** The remediation reduces stored data and does not add volume.

**Alternative:** New quarantine table; rejected as unnecessary schema expansion.

**Future impact:** High-volume metadata can be partitioned later without re-enabling execution.

## 16. Interfaces / Contracts

```typescript
export interface TrustedPluginContext {
  tenantId: string;
  actorId: string;
  role: 'owner' | 'admin';
}

export const PLUGIN_EXECUTION_DISABLED = 'PLUGIN_EXECUTION_DISABLED' as const;
// POST /api/v1/plugins/:id/activate -> 409 { code: PLUGIN_EXECUTION_DISABLED }
// WorkerPool.execute(...) -> rejects PluginExecutionDisabledException before Worker/message/effect.
// tenantId in query/body is ignored; it is neither echoed nor used as authority.
```

```typescript
export const PluginManifestSchema = z.object({
  name: z.string().min(1).max(128),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1).max(1024),
  author: z.string().min(1).max(256),
  extensionApi: z.literal('v1'),
  eventTypes: z.array(z.string().min(1)).min(1),
  permissions: z.array(PermissionSchema).default([]), // explicit allow-list only
  allowedDomains: z.array(z.string().url()).max(0).default([]),
  schemaVersion: z.literal(1).default(1),
}).strict();
// Archive contract: exactly one manifest.json; no path traversal, links, duplicate names,
// executable/source entries, unsupported compression, or data beyond bounded limits.
```

| HTTP surface | Authorized contract | Failure contract |
| --- | --- | --- |
| Install/list/get/deactivate/uninstall | Host/session/membership tenant only | `401 IDENTITY_SESSION_REQUIRED`; `403` identity context/membership; foreign ID `404`; validation `400`. |
| Activate | Same authority check first | `409 PLUGIN_EXECUTION_DISABLED`, no status/event change. |
| Event dispatch/direct execute | N/A | disabled before lookup, Worker creation, source load, or delivery log. |

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
| --- | --- | --- | --- |
| 1 | Deploy code that deletes the worker evaluator and disables pool/bridge before accepting new installs. | Hook behavior stops. | Do not roll back to executable code; retain patched disablement. |
| 2 | Deploy authenticated Host/membership management and manifest-only admission. | Clients sending tenantId observe it ignored. | Roll back only route compatibility within the non-executing boundary. |
| 3 | Verify Tenant A/B doorbell and audit existing active records/package directories. | Legacy expectations. | Uninstall metadata/legacy bytes; no schema migration or data backfill. |

No database migration, feature flag, or source reprocessing is permitted. The release contract is execution-disabled until a HUMAN-approved Design/ADR establishes a real isolation boundary.

## 18. Open Questions

| # | Question | Status | Resolution |
| --- | --- | --- | --- |
| 1 | Can worker threads be called a sandbox? | Resolved | No. They share process privilege; execution is disabled. |
| 2 | Should a new runtime be built in this P0 change? | Resolved | No. It requires a material architecture/HUMAN decision and a separate Design/ADR. |
| 3 | What happens to existing active plugins? | Resolved | They remain readable/manageable metadata but are non-executable; activation and dispatch fail closed. |

---

> **End of document.** This artifact does not modify the SDD pipeline or workflow.
