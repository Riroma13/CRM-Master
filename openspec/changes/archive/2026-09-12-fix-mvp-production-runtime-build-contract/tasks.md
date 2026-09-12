# Tasks: fix-mvp-production-runtime-build-contract

**Status:** Approved after review

## Working Set
- `docker-compose.yml`
- `docker/Caddyfile`
- `apps/api/Dockerfile`
- `apps/tenant-web/Dockerfile`
- `apps/api/test/doorbell/isolation-gate.spec.ts` only if required
- `.dockerignore` only if required

## Ordered Tasks
1. **Foundation:** preserve and validate image bases, root build context, secret exclusions, ports, volumes, and pgvector service.
2. **Core Engine:** preserve the API and tenant process commands and same-origin Caddy routing; make only proven mechanical corrections.
3. **Feature Implementation:** no application feature code; record the candidate runtime contract as the bounded implementation.
4. **Integration:** render production Compose with safe ephemeral env input and validate stock Caddy configuration.
5. **Testing:** run governance validation, fresh pgvector schema setup, exact six-test doorbell, API image build, tenant image build sequentially, runtime assertions, and `git diff --check`.
6. **Summary:** reconcile all evidence against the Required-Gate Ledger and report exact product files changed.

## Acceptance Criteria
- Production Compose renders with the production profile and no secret file dependency.
- Stock Caddy validation passes with `/api/*` routed to API and other paths to tenant web.
- API and tenant Docker builds each pass in sequence.
- Fresh isolated pgvector database setup passes and `isolation-gate.spec.ts` reports exactly 6 passing tests.
- Runtime assertions confirm image commands, ports, private data bindings, and Caddy routing.
- Governance validation and `git diff --check` pass.
- Tenant isolation remains central and unweakened.

## Forecast
Estimated implementation delta: 0-4 product files; evidence and lifecycle artifacts are change-local. Forecast is informational only.
