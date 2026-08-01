# ROADMAP — CRM-Master

> Próximos hitos y dirección del producto.

## ✅ Completado

- [x] **Client Platform** — PR1 + PR2 mergeados a `main`
- [x] **Portal cliente activado** — `NEXT_PUBLIC_CLIENT_PORTAL_ENABLED=true`
- [x] **Rate limiter OnModuleDestroy** — fix memory leak
- [x] **Integrity test** — tenant-scope cross-references schema
- [x] **CI workflow** — GitHub Actions con verify + test + lint
- [x] **Documentación** — tenant-scope generator en `docs/`
- [x] **Client self-registration** — signup, login, portal access

## 🔧 Activo

- [ ] **SPEC-0025 — Identity & Organization Platform**
  - Design: APPROVED_WITH_CONDITIONS
  - Architecture Review: APPROVED_WITH_CONDITIONS
  - Próximo: Tasks → Tasks Review → Apply

## Pendientes técnicos

- [ ] Lint pre-existing (API sin ESLint config)
- [ ] Rate limiter service-side double check redundancy

## 🏗️ Próximas features

- OAuth social login
- Password reset email
- Mobile app
