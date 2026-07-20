# Architecture Review — SPEC-0022: Plugin / Extension Platform

**Verdict: REJECTED**

## Blocking Issues

| # | Finding | Effort |
|---|---------|--------|
| 🔴 #1 | **vm.createContext inseguro para multi-tenant** — CVEs conocidos. worker_threads es el mínimo. | Alta |
| 🔴 #2 | **Hook engine sin tenant scoping** — `PluginHook` no tiene tenantId. Cross-tenant data leak. | Media |
| 🔴 #3 | **Permisos auto-declarados sin enforcement** — `permissions: string[]` es decorativo. Cero verificación. | Alta |

## High Severity

| # | Finding |
|---|---------|
| 🟡 #4 | **Zero hook points en esta SPEC** — Infraestructura sin caso de uso real. Nadie adopta hooks. |
| 🟡 #5 | **Hook abort sin control** — Un plugin buggy puede abortar todos los workflows. |

## Conditions for re-submission

1. Reemplazar `vm.createContext` con `worker_threads` (process-level isolation)
2. Añadir `tenantId` a `PluginHook` + enforce tenant-scoped hook resolution
3. Implementar permission enforcement layer — cada método de Extension API verifica permisos
4. Incluir al menos un módulo adoptante de hooks, o scopear SPEC a plugins basados en eventos BullMQ
5. Añadir abort budget + domain allowlist para http
