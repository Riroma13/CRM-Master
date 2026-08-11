---
classification: PROJECT CONTEXT
semantic_authority: false
scope: product roadmap only
---

# ROADMAP — CRM-Master

This file records product SPEC state only. It does not route SDD phases, assign
logical roles, or select models.

## Completed

- [x] Client Platform — PR1 and PR2 merged to `main`
- [x] Client portal activated — `NEXT_PUBLIC_CLIENT_PORTAL_ENABLED=true`
- [x] Rate limiter `OnModuleDestroy` — memory leak fix
- [x] Integrity test — tenant-scope cross-references schema
- [x] CI workflow — GitHub Actions with verify, test, and lint
- [x] Tenant-scope generator documentation
- [x] Client self-registration — signup, login, and portal access
- [x] SPEC-0025 Identity & Organization Platform — completed, archived, and
  merged to `main` through PR #18
- [x] SPEC-0025 final CI — database tests, lint, and generated scope checks pass
- [x] API ESLint configuration debt resolved

## Technical Debt

- [ ] Rate limiter service-side double-check redundancy

## Upcoming Product Features

- [ ] OAuth social login — next candidate; no new SPEC yet
- [ ] Password reset email
- [ ] Mobile app
