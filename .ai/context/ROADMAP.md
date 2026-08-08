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
- [x] **SPEC-0025 — Identity & Organization Platform** — COMPLETED; archivado y mergeado a `main` mediante PR #18
- [x] **SPEC-0025 final CI** — Database tests PASS, Lint PASS, generated scope verification PASS
- [x] **API ESLint configuration** — deuda de configuración resuelta

## Pendientes técnicos

- [ ] Rate limiter service-side double check redundancy

## 🏗️ Próximas features

- [ ] **OAuth social login** — siguiente candidato; no crear un SPEC todavía
- Password reset email
- Mobile app
