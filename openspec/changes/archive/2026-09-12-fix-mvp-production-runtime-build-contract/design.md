# Design: fix-mvp-production-runtime-build-contract

> **Estado:** Draft

## 1. Executive Summary
The existing MVP runtime candidate needs a production build contract that can be rendered, built, and routed without weakening tenant isolation. This change validates and, only where evidence requires, corrects the Compose, Caddy, API image, and tenant image contract. The result is a reproducible production candidate with explicit disposable-database and runtime evidence.

## 2. Technical Approach
Keep the current Docker and Caddy architecture. Use the monorepo root as the build context, preserve private database and Redis bindings, route tenant API requests through same-origin Caddy, and build API and tenant images sequentially. Validate the contract with a fresh pgvector database and the existing six-test isolation doorbell.

No Prisma schema or application behavior changes are planned. Any required correction must be mechanical, remain in this Working Set, and preserve Host-based tenant resolution and central Prisma scoping.

## 3. Architecture Decisions
| Decision | Options | Chosen | Rationale |
| --- | --- | --- | --- |
| Public ingress | Direct app ports, Caddy, proxy mesh | Caddy | One public TLS boundary and same-origin API routing |
| Database image | PostgreSQL, pgvector, managed DB | pgvector/pgvector:pg16 | Matches the existing Prisma vector contract |
| Build strategy | Per-app context, root context, prebuilt artifacts | Root context with app Dockerfiles | Workspace dependencies resolve consistently |

## 4. Data Flow
```
Browser -- HTTPS/Host --> Caddy -- /api --> API -- scoped Prisma --> pgvector
                      \-- other paths --> tenant-web
```
Requests retain the tenant Host header at the public boundary; failures remain private behind Caddy.

## 5. Working Set
### 5.1 Primary Files
| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | docker-compose.yml | Modify only if required | Production service topology and private ports |
| 2 | docker/Caddyfile | Modify only if required | Public ingress and API routing |
| 3 | apps/api/Dockerfile | Modify only if required | API production image |
| 4 | apps/tenant-web/Dockerfile | Modify only if required | Tenant production image |

### 5.2 Secondary Files
| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | apps/api/test/doorbell/isolation-gate.spec.ts | Read/Modify only if required | Required six-test isolation gate |
| 2 | .dockerignore | Read/Modify only if required | Secret and build-context boundary |

### 5.3 Expected NOT to Change
- apps/api/src — runtime behavior is outside this build-contract change.
- packages/database/prisma/schema.prisma — no schema or migration work is authorized.
- AGENTS.md, docs/SDD-WORKFLOW.md, .opencode/ — governance authority is immutable.
- openspec/changes/SPEC-0028-jobs-background-processing-platform/ — protected user work.

## 6. Read Order
1. AGENTS.md and canonical workflow — authority and lifecycle boundaries.
2. docker-compose.yml and docker/Caddyfile — runtime topology and ingress.
3. The two application Dockerfiles and .dockerignore — build provenance.
4. Doorbell test and database package — isolation evidence.
5. Current build/runtime command output — bounded acceptance evidence.

## 7. Expected Commands
```bash
pnpm sdd:validate
COMPOSE_ENV_FILE=/dev/null docker compose --profile production config
docker run --rm -v "$PWD/docker/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
DATABASE_URL=<ephemeral-pgvector-url> pnpm --filter @crm-master/database db:push --skip-generate --accept-data-loss
DATABASE_URL=<ephemeral-pgvector-url> pnpm --filter api test:e2e -- --runInBand test/doorbell/isolation-gate.spec.ts
git diff --check
```

## 8. Design Confidence
**Confidence:** High

The candidate files and required gates are known; no schema or application behavior is in scope.

## 9. Exploration Budget
| Resource | Budget | Notes |
| --- | --- | --- |
| Repo searches | 8 | Candidate files and bounded validators |
| Files to read | 18 | Authority, runtime, and gates |
| Files to create | 0 product files | Change artifacts are separate |
| Files to modify | 0–4 | Only proven mechanical corrections |

## 10. Risks
| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Missing env file prevents render | Medium | High | Use safe ephemeral empty env input; fail if still required |
| Image build drift | Medium | High | Run API then tenant builds sequentially |
| Tenant leakage | Low | Critical | Fresh pgvector database and exact six-test doorbell |

## 11. Testing Strategy
| Layer | Focus | Approach |
| --- | --- | --- |
| Unit | Existing application behavior | Not changed; bounded regression only |
| Integration | Database schema and runtime wiring | Fresh pgvector schema push |
| Doorbell | Tenant and raw SQL boundaries | Exact `isolation-gate.spec.ts`, six passing tests |

## 12. Doorbell Tests
| Test file | What it proves |
| --- | --- |
| apps/api/test/doorbell/isolation-gate.spec.ts | Cross-tenant reads, writes, updates, deletes, raw SQL, and not-found behavior |

## 13. Required ADRs
| ADR | Reason | Status |
| --- | --- | --- |
| Existing tenant isolation decisions | Runtime must preserve central scoping | Existing |
| None | No schema or architectural behavior change | Resolved |

## 14. Boundaries
| Boundary | Owner | Purpose |
| --- | --- | --- |
| Caddy | docker/Caddyfile | Public TLS and same-origin routing |
| API image | apps/api/Dockerfile | Build and run NestJS API |
| Tenant image | apps/tenant-web/Dockerfile | Build and run tenant UI |
| Data isolation | packages/database | Enforce tenant-scoped Prisma access |

## 15. Extensibility
| Future feature | How it fits | Effort |
| --- | --- | --- |
| Admin web image | Add a sibling service using the same root context | Days |
| Managed PostgreSQL | Replace the private database service while keeping API env contract | Weeks |

## Architecture Review Preparation (MANDATORY)
### A. Scalability
**Decision:** Scale stateless images horizontally and keep database growth operational.
**Rationale:** The contract contains no in-memory tenant state.
**Alternative:** Per-tenant containers, rejected because it multiplies operational coupling.
**Future impact:** Add orchestration and database indexes without changing ingress.

### B. Open/Closed Principle (OCP)
**Decision:** New web runtimes add services and Dockerfiles without changing API scoping.
**Rationale:** Caddy handlers and workspace builds are explicit extension points.
**Alternative:** One image for all apps, rejected because deployment boundaries become coupled.
**Future impact:** Admin runtime can be added independently.

### C. Ownership
**Decision:** Caddy owns ingress, each image owns its process, database owns persistence.
**Rationale:** Clear ownership prevents cross-layer shortcuts.
**Alternative:** Application-level public proxy, rejected because it expands API responsibility.
**Future impact:** Service replacement remains localized.

### D. Data Retention
**Decision:** Runtime volumes retain operational data; disposable gate data is deleted with its container.
**Rationale:** Production persistence belongs to named volumes, not image layers.
**Alternative:** Ephemeral production database, rejected as unsafe.
**Future impact:** Backup policy can target database volumes independently.

### E. Idempotency
**Decision:** Builds, Compose rendering, and schema push are rerunnable; doorbell cleanup is defensive.
**Rationale:** Repeated verification must not contaminate tenant fixtures.
**Alternative:** Shared test database, rejected because it hides leakage and creates order dependence.
**Future impact:** CI can use isolated disposable databases.

### F. Shared Contracts
**Decision:** Environment variables, ports, image commands, and Caddy paths are the shared runtime contract.
**Rationale:** These are directly testable across deployment components.
**Alternative:** Undocumented operator conventions, rejected as non-reproducible.
**Future impact:** Add typed deployment manifests later without changing application APIs.

### G. Partitioning Strategy
**Decision:** No physical partitioning in this build change; tenant isolation remains logical through Prisma scoping.
**Rationale:** No volume evidence requires a migration or partitioning decision here.
**Alternative:** Tenant-per-database, rejected as outside scope and operationally costly.
**Future impact:** Revisit with measured scale evidence and an ADR.

## 16. Interfaces / Contracts
```text
Public:  HTTPS {tenant}.crmmaster.com
API:     Caddy /api/* -> api:3001
Tenant:  Caddy /* -> tenant-web:3000
Data:    DATABASE_URL -> pgvector PostgreSQL 16
```

## 17. Migration Strategy
| Step | Description | Risk | Rollback |
| --- | --- | --- | --- |
| 1 | Validate and build candidate images | Medium | Keep current images |
| 2 | Deploy Compose/Caddy contract after maintainer review | High | Restore prior deployment configuration |

No Prisma migration is part of this change.

## 18. Open Questions
| # | Question | Status | Resolution |
| --- | --- | --- | --- |
| 1 | Should production secrets be supplied by `.env`? | Resolved | Operator supplies `COMPOSE_ENV_FILE`; no secrets enter image context |
| 2 | Is a schema migration required? | Resolved | No; only disposable schema push is used for verification |
